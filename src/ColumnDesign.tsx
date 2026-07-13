import React, { useState, useEffect, useMemo } from 'react';

// Default values to use for initial state and reset
const DEFAULT_INPUTS = {
  Pu: '2750', 
  Mu: '120', 
  b: '230', 
  D: '750', 
  L: '3.0',
  fck: 25, 
  fy: 500, 
  ptFck: '0.05'
};

// Default bars state
const DEFAULT_BARS: Record<string, number> = {
  '8': 0, '10': 0, '12': 0, '16': 0, '20': 0, '25': 0, '32': 0
};

export default function RectangularColumnTool() {
  // LocalStorage initialization
  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('col_inputs');
    return saved ? JSON.parse(saved) : DEFAULT_INPUTS;
  });

  const [bars, setBars] = useState(() => {
    const saved = localStorage.getItem('col_bars');
    return saved ? JSON.parse(saved) : DEFAULT_BARS;
  });

  // Save to LocalStorage whenever inputs or bars change
  useEffect(() => {
    localStorage.setItem('col_inputs', JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    localStorage.setItem('col_bars', JSON.stringify(bars));
  }, [bars]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const updateInput = (key: string, value: string) => setInputs((prev: any) => ({ ...prev, [key]: value }));
  const updateBar = (dia: string, val: string) => setBars((prev: any) => ({ ...prev, [dia]: parseInt(val) }));

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset all data?")) {
      setInputs(DEFAULT_INPUTS);
      setBars(DEFAULT_BARS);
      localStorage.removeItem('col_inputs');
      localStorage.removeItem('col_bars');
    }
  };

  const handleShare = async () => {
    const shareText = `Column Design Report:\nLoad (Pu): ${inputs.Pu} kN\nMoment (Mu): ${inputs.Mu} kNm\nSize: ${inputs.b}x${inputs.D}mm\nAst Req: ${calc.astRequired.toFixed(2)} sqmm\nAst Prov: ${calc.astProvided.toFixed(2)} sqmm\nStatus: ${calc.isSafe ? 'OK' : 'Revise'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Uniq Designs - Column Report',
          text: shareText,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      alert("Sharing is not supported on this browser. You can print/save as PDF instead.");
    }
  };

  // --- USEMEMO FOR LAG-FREE CALCULATIONS ---
  const calc = useMemo(() => {
    const n = {
      Pu: parseFloat(inputs.Pu) || 0,
      Mu: parseFloat(inputs.Mu) || 0,
      b: parseFloat(inputs.b) || 0,
      D: parseFloat(inputs.D) || 0,
      L: parseFloat(inputs.L) || 0,
      ptFck: parseFloat(inputs.ptFck) || 0,
      fck: inputs.fck,
      fy: inputs.fy
    };

    const pu_N = n.Pu * 1000;
    const mu_Nmm = n.Mu * 1000000;
    const L_mm = n.L * 1000;

    // Eccentricity
    const ex = Math.max((L_mm / 500) + (n.D / 30), 20);
    const ey = Math.max((L_mm / 500) + (n.b / 30), 20);

    // Non-Dimensional Parameters (Rounded to 2 decimals as requested)
    const axialRatioRaw = (n.b > 0 && n.D > 0 && n.fck > 0) ? pu_N / (n.fck * n.b * n.D) : 0;
    const momentRatioRaw = (n.b > 0 && n.D > 0 && n.fck > 0) ? mu_Nmm / (n.fck * n.b * (n.D * n.D)) : 0;
    
    const axialRatio = axialRatioRaw.toFixed(2);
    const momentRatio = momentRatioRaw.toFixed(2);

    // Required Steel
    const pt = n.ptFck * n.fck;
    const astRequired = (pt / 100) * n.b * n.D;

    // Provided Steel
    let astProvided = 0;
    Object.keys(bars).forEach(diaStr => {
      const dia = parseInt(diaStr);
      const nos = bars[diaStr];
      const area = (Math.PI / 4) * (dia * dia);
      astProvided += (area * nos);
    });

    const isSafe = astProvided >= astRequired;

    return { ex, ey, axialRatio, momentRatio, pt, astRequired, astProvided, isSafe };
  }, [inputs, bars]); // Recalculate only when inputs or bars change

  // UI Components
  const Cell = ({ label, value, unit, color }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: color || '#fff', fontSize: '12px' }}>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{value} <small style={{fontSize: '9px'}}>{unit}</small></span>
    </div>
  );

  // Array for dropdown options (0, 2, 4, 6... 16)
  const barOptions = [0, 2, 4, 6, 8, 10, 12, 14, 16];

  return (
    <div id="printable-area" style={{ maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '100vh', border: '1px solid #ddd' }}>
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          body { margin: 0; padding: 0; overflow: hidden; height: 100vh; }
          #printable-area { border: none !important; width: 100% !important; max-width: 100% !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; overflow: hidden; }
          .no-print { display: none !important; }
          header, .blue-box, .yellow-row, .green-bar, .status-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input, select { border: none !important; background: transparent !important; pointer-events: none; -webkit-appearance: none; appearance: none;}
        }
      `}</style>

      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '16px', borderBottom: '2px solid #76b041', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>RECTANGULAR COLUMN DESIGN</span>
        <button className="no-print" onClick={handleReset} style={{ background: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', color: '#cc0000' }}>RESET</button>
      </header>

      <div style={{ padding: '12px' }}>
        {/* INPUT SECTION */}
        <div className="blue-box" style={{ border: '3px solid #0070c0', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', backgroundColor: '#00b0f0' }}>
          <div style={{ backgroundColor: '#0070c0', color: 'white', padding: '5px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>EDITABLE DATA</div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.3)', padding: '6px', borderRadius: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#003366', display: 'block' }}>Load (Pu) kN</label>
                <input type="text" onFocus={handleFocus} value={inputs.Pu} onChange={e => updateInput('Pu', e.target.value)} style={{ width: '100%', textAlign: 'right', padding: '4px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.3)', padding: '6px', borderRadius: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#003366', display: 'block' }}>Moment (Mu) kNm</label>
                <input type="text" onFocus={handleFocus} value={inputs.Mu} onChange={e => updateInput('Mu', e.target.value)} style={{ width: '100%', textAlign: 'right', padding: '4px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Width (b) mm</label>
              <input type="text" onFocus={handleFocus} value={inputs.b} onChange={e => updateInput('b', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Depth (D) mm</label>
              <input type="text" onFocus={handleFocus} value={inputs.D} onChange={e => updateInput('D', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Length (L) m</label>
              <input type="text" onFocus={handleFocus} value={inputs.L} onChange={e => updateInput('L', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select value={inputs.fck} onChange={e => updateInput('fck', e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[20, 25, 30, 35, 40].map(v => <option key={v} value={v}>M{v}</option>)}
              </select>
              <select value={inputs.fy} onChange={e => updateInput('fy', e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[415, 500, 550].map(v => <option key={v} value={v}>Fe{v}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Chart Value (pt/fck)</label>
              <input type="text" onFocus={handleFocus} value={inputs.ptFck} onChange={e => updateInput('ptFck', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: '900', fontSize: '14px' }} />
            </div>
          </div>
        </div>

        {/* OUTPUT RATIOS SECTION */}
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
          <div className="yellow-row"><Cell label="Min Eccentricity (ex)" value={calc.ex.toFixed(2)} unit="mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Min Eccentricity (ey)" value={calc.ey.toFixed(2)} unit="mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Pu / (fck b D)" value={calc.axialRatio} unit="" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Mu / (fck b D²)" value={calc.momentRatio} unit="" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Steel Percentage (pt)" value={calc.pt.toFixed(2)} unit="%" color="#ffff00" /></div>
          
          <div className="green-bar" style={{ backgroundColor: '#92d050', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #76b041' }}>
            <span style={{ fontSize: '14px', fontWeight: '900' }}>REQ. Ast</span>
            <span style={{ fontSize: '18px', fontWeight: '900' }}>{calc.astRequired.toFixed(2)} mm²</span>
          </div>
        </div>

        {/* REINFORCEMENT PROVIDED SECTION */}
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{ backgroundColor: '#e2efda', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid #ccc', textAlign: 'center' }}>
            NUMBER OF BARS PROVIDED
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', backgroundColor: '#ccc' }}>
            {['8', '10', '12', '16', '20', '25', '32'].map(dia => (
              <div key={dia} style={{ backgroundColor: '#fff', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'red', marginBottom: '4px' }}>{dia} mm</span>
                <select 
                  value={bars[dia]} 
                  onChange={(e) => updateBar(dia, e.target.value)}
                  style={{ padding: '2px', border: '1px solid #999', borderRadius: '3px', fontSize: '12px', width: '100%', textAlign: 'center' }}
                >
                  {barOptions.map(num => (
                    <option key={num} value={num}>{num === 0 ? '-' : num}</option>
                  ))}
                </select>
              </div>
            ))}
            {/* Empty block to fill 4-column grid cleanly */}
            <div style={{ backgroundColor: '#fff' }}></div>
          </div>
          
          <div style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderTop: '1px solid #ccc' }}>
             <span style={{ fontSize: '12px', fontWeight: 'bold' }}>PROV. Ast</span>
             <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 'bold', color: 'blue' }}>{calc.astProvided.toFixed(2)} mm²</span>
          </div>

          <div className="status-bar" style={{ backgroundColor: calc.isSafe ? '#92d050' : '#ff4c4c', color: calc.isSafe ? '#000' : '#fff', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid rgba(0,0,0,0.1)' }}>
            {calc.isSafe ? "Steel provided OK" : "Provide more steel"}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: '14px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            PRINT TO PDF
          </button>
          <button onClick={handleShare} style={{ flex: 1, padding: '14px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            SHARE REPORT
          </button>
        </div>

      </div>
    </div>
  );
}
