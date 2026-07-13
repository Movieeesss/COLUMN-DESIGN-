import React, { useState } from 'react';

// Reference Tables from IS 456 & SP-16
const XU_MAX_TABLE: Record<number, number> = { 250: 0.53, 415: 0.48, 500: 0.46 };
const MU_LIMIT_TABLE: Record<number, Record<number, number>> = {
  15: { 250: 2.24, 415: 2.07, 500: 2.00 },
  20: { 250: 2.98, 415: 2.76, 500: 2.66 },
  25: { 250: 3.73, 415: 3.45, 500: 3.33 },
  30: { 250: 4.47, 415: 4.14, 500: 3.99 },
};
// Pt max% logic from SP-16 Table E for Ast 1
const PT_MAX_TABLE: Record<number, Record<number, number>> = {
  15: { 250: 1.32, 415: 0.72, 500: 0.57 },
  20: { 250: 1.76, 415: 0.96, 500: 0.76 },
  25: { 250: 2.20, 415: 1.19, 500: 0.94 },
  30: { 250: 2.64, 415: 1.43, 500: 1.13 },
};

export default function DoublyReinforcedTool() {
  const [inputs, setInputs] = useState({
    mu: '65', b: '230', D: '425', fck: 20, fy: 500, cover: '25', dia: '16'
  });

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const updateInput = (key: string, value: string) => setInputs(prev => ({ ...prev, [key]: value }));

  const n = {
    mu: parseFloat(inputs.mu) || 0,
    b: parseFloat(inputs.b) || 0,
    D: parseFloat(inputs.D) || 0,
    cover: parseFloat(inputs.cover) || 0,
    dia: parseFloat(inputs.dia) || 0
  };

  // --- EXACT EXCEL CALCULATIONS ---
  const d = n.D - n.cover - (n.dia / 2);
  const dPrime = n.cover + (n.dia / 2);
  const xuMaxActual = XU_MAX_TABLE[inputs.fy] * d;
  const muLimit = MU_LIMIT_TABLE[inputs.fck][inputs.fy] * n.b * d * d;
  const muActualNmm = n.mu * 1000000;
  const muMinusMuLimit = muActualNmm - muLimit;
  const fsc = 0.0035 * ((xuMaxActual - dPrime) / xuMaxActual) * 200000;
  const asc = muMinusMuLimit / (fsc * (d - dPrime));
  
  // Ast Logic for 499.44
  const ptMax = PT_MAX_TABLE[inputs.fck][inputs.fy];
  const ast1 = (ptMax * n.b * d) / 100;
  const ast2 = (asc * fsc) / (0.87 * inputs.fy);
  const totalAst = ast1 + ast2;

  const Cell = ({ label, value, unit, color }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: color || '#fff', fontSize: '12px' }}>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{value} <small style={{fontSize: '9px'}}>{unit}</small></span>
    </div>
  );

  return (
    <div id="printable-area" style={{ maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '100vh', border: '1px solid #ddd' }}>
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          body { margin: 0; padding: 0; overflow: hidden; height: 100vh; }
          #printable-area { border: none !important; width: 100% !important; max-width: 100% !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; overflow: hidden; }
          .no-print { display: none !important; }
          header, .blue-box, .yellow-row, .green-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input, select { border: none !important; background: transparent !important; pointer-events: none; }
        }
      `}</style>

      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '16px', borderBottom: '2px solid #76b041' }}>
        DOUBLY REINFORCED BEAM TOOL
      </header>

      <div style={{ padding: '12px' }}>
        <div className="blue-box" style={{ border: '3px solid #0070c0', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', backgroundColor: '#00b0f0' }}>
          <div style={{ backgroundColor: '#0070c0', color: 'white', padding: '5px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>EDITABLE DATA</div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Mu (Moment) kNm</label>
              <input type="text" onFocus={handleFocus} value={inputs.mu} onChange={e => updateInput('mu', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: '900', fontSize: '16px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Breadth (b) mm</label>
              <input type="text" onFocus={handleFocus} value={inputs.b} onChange={e => updateInput('b', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Depth (D) mm</label>
              <input type="text" onFocus={handleFocus} value={inputs.D} onChange={e => updateInput('D', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select value={inputs.fck} onChange={e => setInputs({...inputs, fck: +e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[15, 20, 25, 30].map(v => <option key={v} value={v}>M{v}</option>)}
              </select>
              <select value={inputs.fy} onChange={e => setInputs({...inputs, fy: +e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[250, 415, 500].map(v => <option key={v} value={v}>Fe{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="yellow-row"><Cell label="EFFECTIVE DEPTH (d)" value={d.toFixed(0)} unit="mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Mu Limit" value={muLimit.toFixed(0)} unit="N.mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="(Mu - Mu Limit)" value={muMinusMuLimit.toFixed(0)} unit="N.mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Fsc (Stress)" value={fsc.toFixed(2)} unit="N/mm²" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Asc" value={asc.toFixed(2)} unit="mm²" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Ast 1" value={ast1.toFixed(3)} unit="mm²" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Ast 2" value={ast2.toFixed(3)} unit="mm²" color="#ffff00" /></div>
          
          <div className="green-bar" style={{ backgroundColor: '#92d050', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #76b041' }}>
            <span style={{ fontSize: '14px', fontWeight: '900' }}>TOTAL Ast</span>
            <span style={{ fontSize: '18px', fontWeight: '900' }}>{totalAst.toFixed(2)} mm²</span>
          </div>
        </div>

        <button className="no-print" onClick={() => window.print()} style={{ width: '100%', marginTop: '12px', padding: '14px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          PRINT TO PDF / SAVE REPORT
        </button>
      </div>
    </div>
  );
}
