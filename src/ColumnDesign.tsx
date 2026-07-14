// ============================================================================
// IS 456:2000 Annex E — Strain Compatibility Solver for Rectangular Columns
// Reinforcement idealized on two opposite faces (matches SP16 Chart 27-38
// convention), uniaxial bending. Bypasses SP16 charts entirely.
// ============================================================================
//
// METHOD
// 1. Concrete: parabolic-rectangular stress block (IS456 Fig 21), max strain
//    0.0035 at the highly compressed extreme fibre when xu <= D.
//    When xu > D (whole section in compression), strain profile follows
//    Annex E.2: max edge strain reduces below 0.0035, and strain = 0.002 is
//    held fixed at 3D/7 from the highly compressed edge.
// 2. Steel: IS456 Fig 23 design curve. Linear elastic up to 0.8*(0.87 fy),
//    then table-interpolated inelastic branch up to 0.87 fy (perfectly
//    plastic beyond). Fe250 is linear elastic-plastic (no strain hardening
//    table — mild steel has a sharp defined yield).
// 3. Section is discretized into thin strips (fibre model) and integrated
//    numerically — this converges to the closed-form result as strip count
//    increases, and is easy to verify/debug against your Excel sheet.
// 4. Double bisection solve:
//      outer loop  -> trial Ast, split into two layers (compression + tension face)
//      inner loop  -> trial xu, solved so computed Pu matches applied Pu
//    then Mu_capacity at that (Ast, xu) is compared to applied Mu, and Ast is
//    adjusted until both Pu and Mu are simultaneously satisfied.
//
// VALIDATE BEFORE PRODUCTION USE: cross-check 2-3 outputs against known SP16
// chart readings (or your Excel xu/D sweep) before wiring this into live
// project calculations. Strain-compatibility and SP16 charts should agree
// within a few percent — if they don't, check bar layer / cover assumptions
// first (this module assumes ALL steel lumped into two layers at d' and D-d',
// same as the SP16 two-face charts; if your section has bars on all 4 faces,
// this will NOT match Charts 27-38 and needs the layer geometry changed).
// ============================================================================

export interface ColumnSolverInputs {
  Pu: number;     // kN, factored axial load
  Mu: number;     // kNm, factored uniaxial moment
  fck: number;    // N/mm2 (20, 25, 30, 35, 40...)
  fy: number;     // N/mm2 (250 | 415 | 500)
  b: number;      // mm, width
  D: number;      // mm, overall depth (in the plane of bending)
  cover: number;  // mm, effective cover d' to bar centroid
}

export interface ColumnSolverResult {
  xu: number;              // mm, converged neutral axis depth
  AstCalculated: number;   // mm2, from equilibrium (before min-steel check)
  ptCalculated: number;    // %, 100*Ast/(b*D)
  AstProvided: number;     // mm2, max(AstCalculated, 0.8% b D)
  ptProvided: number;      // %
  AstMin: number;          // mm2, 0.8% b D per IS456 26.5.3.1
  governedByMinSteel: boolean;
  Pu_capacity: number;     // kN, capacity check at converged state
  Mu_capacity: number;     // kNm
  converged: boolean;
  outerIterations: number;
  innerIterations: number;
}

// ---------------------------------------------------------------------------
// Steel design stress-strain curve (IS456 Fig 23)
// Table fractions are of the DESIGN yield stress 0.87*fy (i.e. fy/gamma_m,
// gamma_m = 1.15), not of fy directly. First table point lands exactly on
// the elastic line (stress = Es * strain), which is the internal consistency
// check that confirms this table is being applied correctly.
// ---------------------------------------------------------------------------

const Es = 200000; // N/mm2, modulus of elasticity of steel

// fraction of (0.87*fy), strain
const INELASTIC_TABLE: { frac: number; strain: number }[] = [
  { frac: 0.80,  strain: 0.00174 }, // placeholder overwritten per-grade below
];

const STEEL_TABLES: Record<number, { frac: number; strain: number }[]> = {
  415: [
    { frac: 0.80,  strain: 0.00144 },
    { frac: 0.85,  strain: 0.00163 },
    { frac: 0.90,  strain: 0.00192 },
    { frac: 0.95,  strain: 0.00241 },
    { frac: 0.975, strain: 0.00276 },
    { frac: 1.00,  strain: 0.00380 },
  ],
  500: [
    { frac: 0.80,  strain: 0.00174 },
    { frac: 0.85,  strain: 0.00195 },
    { frac: 0.90,  strain: 0.00226 },
    { frac: 0.95,  strain: 0.00277 },
    { frac: 0.975, strain: 0.00312 },
    { frac: 1.00,  strain: 0.00417 },
  ],
};

/**
 * Steel stress (N/mm2) for a given SIGNED strain (+ compression, - tension).
 * IS456 treats the design curve as symmetric for tension/compression.
 */
function steelStress(strainSigned: number, fy: number): number {
  const strain = Math.abs(strainSigned);
  const sign = strainSigned >= 0 ? 1 : -1;

  if (strain === 0) return 0;

  if (fy === 250) {
    // Mild steel: sharp defined yield, linear elastic then perfectly plastic
    const fyDesign = 0.87 * fy;
    const yieldStrain = fyDesign / Es;
    if (strain <= yieldStrain) return sign * Es * strain;
    return sign * fyDesign;
  }

  const table = STEEL_TABLES[fy];
  if (!table) {
    throw new Error(`No stress-strain table for fy=${fy}. Supported: 250, 415, 500.`);
  }

  const fyDesign = 0.87 * fy;
  const firstPoint = table[0];
  const lastPoint = table[table.length - 1];

  // Elastic zone (below first table point): stress = Es * strain
  if (strain <= firstPoint.strain) {
    return sign * Es * strain;
  }

  // Beyond last table point: perfectly plastic at design yield
  if (strain >= lastPoint.strain) {
    return sign * fyDesign;
  }

  // Interpolate within the inelastic table
  for (let i = 0; i < table.length - 1; i++) {
    const p0 = table[i];
    const p1 = table[i + 1];
    if (strain >= p0.strain && strain <= p1.strain) {
      const t = (strain - p0.strain) / (p1.strain - p0.strain);
      const frac = p0.frac + t * (p1.frac - p0.frac);
      return sign * frac * fyDesign;
    }
  }

  return sign * fyDesign; // fallback, shouldn't reach here
}

// ---------------------------------------------------------------------------
// Concrete stress block (IS456 Fig 21) — parabolic-rectangular
// ---------------------------------------------------------------------------

function concreteStress(strain: number, fck: number): number {
  if (strain <= 0) return 0; // no tension capacity assumed
  if (strain <= 0.002) {
    const r = strain / 0.002;
    return 0.446 * fck * (2 * r - r * r);
  }
  // 0.002 < strain <= 0.0035 (and capped there — strain shouldn't exceed
  // 0.0035 anywhere in the section under this profile model)
  return 0.446 * fck;
}

// ---------------------------------------------------------------------------
// Strain profile across the section depth
// y = distance from the highly compressed extreme fibre, 0 <= y <= D
// ---------------------------------------------------------------------------

function strainAt(y: number, xu: number, D: number): number {
  if (xu <= D) {
    // Neutral axis within (or at edge of) the section — standard linear
    // profile, zero at the neutral axis, 0.0035 at the compressed edge.
    return 0.0035 * (xu - y) / xu;
  }

  // xu > D: whole section in compression, Annex E.2.
  // Max edge strain reduces as D/xu decreases; strain is anchored at 0.002
  // at 3D/7 from the highly compressed edge, and varies linearly.
  const ecMax = 0.0035 * (0.25 + 0.75 * (D / xu));
  const yRef = (3 * D) / 7;
  return ecMax - (ecMax - 0.002) * (y / yRef);
}

// ---------------------------------------------------------------------------
// Section force/moment via strip (fibre) integration
// Returns Pu (kN, +compression) and Mu (kNm) about the section mid-depth.
// ---------------------------------------------------------------------------

const STRIP_COUNT = 300; // increase for more precision, at some perf cost

function computeSectionForces(
  xu: number,
  Ast: number,
  inputs: Pick<ColumnSolverInputs, 'b' | 'D' | 'cover' | 'fck' | 'fy'>
): { Pu: number; Mu: number } {
  const { b, D, cover, fck, fy } = inputs;
  const dy = D / STRIP_COUNT;

  let forceSum = 0;   // N
  let momentSum = 0;  // N.mm, about mid-depth

  // --- Concrete strips ---
  for (let i = 0; i < STRIP_COUNT; i++) {
    const y = (i + 0.5) * dy; // strip centroid from highly compressed edge
    const strain = strainAt(y, xu, D);
    const stress = concreteStress(strain, fck);
    if (stress === 0) continue;
    const force = stress * b * dy;
    const arm = D / 2 - y; // + above mid-depth (toward compressed edge)
    forceSum += force;
    momentSum += force * arm;
  }

  // --- Steel layers: two-face idealization (matches SP16 Chart 27-38) ---
  const AstLayer = Ast / 2;
  const layerPositions = [cover, D - cover]; // near-edge layer, far-edge layer

  for (const y of layerPositions) {
    const strain = strainAt(y, xu, D);
    let stress = steelStress(strain, fy);

    // If this layer sits in the concrete compression zone, the concrete
    // "displaced" by the bar is double-counted in the strip integration
    // above — net it out (standard correction).
    if (strain > 0) {
      stress -= concreteStress(strain, fck);
    }

    const force = stress * AstLayer;
    const arm = D / 2 - y;
    forceSum += force;
    momentSum += force * arm;
  }

  return {
    Pu: forceSum / 1000,      // N -> kN
    Mu: momentSum / 1_000_000 // N.mm -> kNm
  };
}

// ---------------------------------------------------------------------------
// Inner solve: for a fixed Ast, find xu such that Pu_capacity == Pu_applied
// ---------------------------------------------------------------------------

function solveNeutralAxis(
  Ast: number,
  Pu_applied: number,
  section: Pick<ColumnSolverInputs, 'b' | 'D' | 'cover' | 'fck' | 'fy'>,
  maxIter = 60,
  tolKN = 0.05
): { xu: number; iterations: number; converged: boolean; Pu: number; Mu: number } {
  const { D } = section;

  let lo = 0.001 * D;   // near-zero neutral axis (almost pure tension face yield)
  let hi = 20 * D;      // effectively "whole section deep in compression"

  let fLo = computeSectionForces(lo, Ast, section).Pu - Pu_applied;
  let fHi = computeSectionForces(hi, Ast, section).Pu - Pu_applied;

  // Pu_capacity is monotonically increasing with xu. If applied Pu is out of
  // the achievable range for this Ast, clamp to the nearest bound.
  if (fLo >= 0) {
    const r = computeSectionForces(lo, Ast, section);
    return { xu: lo, iterations: 0, converged: false, Pu: r.Pu, Mu: r.Mu };
  }
  if (fHi <= 0) {
    const r = computeSectionForces(hi, Ast, section);
    return { xu: hi, iterations: 0, converged: false, Pu: r.Pu, Mu: r.Mu };
  }

  let mid = (lo + hi) / 2;
  let result = computeSectionForces(mid, Ast, section);
  let i = 0;
  for (; i < maxIter; i++) {
    mid = (lo + hi) / 2;
    result = computeSectionForces(mid, Ast, section);
    const diff = result.Pu - Pu_applied;

    if (Math.abs(diff) < tolKN) {
      return { xu: mid, iterations: i + 1, converged: true, Pu: result.Pu, Mu: result.Mu };
    }
    if (diff < 0) lo = mid; else hi = mid;
  }

  return { xu: mid, iterations: i, converged: false, Pu: result.Pu, Mu: result.Mu };
}

// ---------------------------------------------------------------------------
// Outer solve: find Ast such that, at the xu solved above, Mu_capacity
// matches Mu_applied.
// ---------------------------------------------------------------------------

export function solveColumnSteelIS456(
  inputs: ColumnSolverInputs,
  options?: { maxOuterIter?: number; tolKNm?: number }
): ColumnSolverResult {
  const { Pu, Mu, b, D, cover, fck, fy } = inputs;
  const maxOuterIter = options?.maxOuterIter ?? 60;
  const tolKNm = options?.tolKNm ?? 0.1;

  const AstMin = 0.008 * b * D; // 0.8% per IS456 26.5.3.1
  const AstMax = 0.06 * b * D;  // 6% practical upper bound for the search

  const section = { b, D, cover, fck, fy };

  let lo = AstMin;
  let hi = AstMax;

  const evalAt = (Ast: number) => {
    const inner = solveNeutralAxis(Ast, Pu, section);
    return { ...inner, Mu_diff: inner.Mu - Mu };
  };

  let loEval = evalAt(lo);
  let hiEval = evalAt(hi);

  let outerIter = 0;
  let converged = false;
  let best = loEval;
  let bestAst = lo;

  if (loEval.Mu_diff >= 0) {
    // Even minimum steel gives enough moment capacity at this Pu
    best = loEval;
    bestAst = lo;
    converged = true;
  } else if (hiEval.Mu_diff <= 0) {
    // Section is undersized even at 6% steel — return the 6% result flagged
    // as not converged so the caller knows to increase section size.
    best = hiEval;
    bestAst = hi;
    converged = false;
  } else {
    let mid = (lo + hi) / 2;
    let midEval = evalAt(mid);
    for (; outerIter < maxOuterIter; outerIter++) {
      mid = (lo + hi) / 2;
      midEval = evalAt(mid);

      if (Math.abs(midEval.Mu_diff) < tolKNm) {
        best = midEval;
        bestAst = mid;
        converged = true;
        break;
      }
      if (midEval.Mu_diff < 0) lo = mid; else hi = mid;
    }
    if (!converged) {
      best = midEval;
      bestAst = mid;
    }
  }

  const AstCalculated = bestAst;
  const AstProvided = Math.max(AstCalculated, AstMin);
  const governedByMinSteel = AstProvided === AstMin && AstCalculated < AstMin;

  return {
    xu: best.xu,
    AstCalculated,
    ptCalculated: (100 * AstCalculated) / (b * D),
    AstProvided,
    ptProvided: (100 * AstProvided) / (b * D),
    AstMin,
    governedByMinSteel,
    Pu_capacity: best.Pu,
    Mu_capacity: best.Mu,
    converged,
    outerIterations: outerIter,
    innerIterations: best.iterations,
  };
}

// ---------------------------------------------------------------------------
// Bonus: full interaction curve generator (for a chart-style visual), given
// a chosen pt/fck ratio. Sweeps xu and returns non-dimensional points, same
// shape of data as one curve on an SP16-style chart.
// ---------------------------------------------------------------------------

export interface InteractionPoint {
  xuByD: number;
  puByFckbD: number;
  muByFckbD2: number;
}

export function generateInteractionCurve(
  ptFck: number,
  section: Pick<ColumnSolverInputs, 'b' | 'D' | 'cover' | 'fck' | 'fy'>,
  steps = 194 // matches your Excel sweep resolution
): InteractionPoint[] {
  const { b, D, fck } = section;
  const Ast = (ptFck * fck / 100) * b * D;
  const points: InteractionPoint[] = [];

  const xuByDMin = 0.05;
  const xuByDMax = 3.0; // covers well into the "whole section in compression" zone

  for (let i = 0; i <= steps; i++) {
    const xuByD = xuByDMin + ((xuByDMax - xuByDMin) * i) / steps;
    const xu = xuByD * D;
    const { Pu, Mu } = computeSectionForces(xu, Ast, section);
    points.push({
      xuByD,
      puByFckbD: (Pu * 1000) / (fck * b * D),
      muByFckbD2: (Mu * 1_000_000) / (fck * b * D * D),
    });
  }

  return points;
}
