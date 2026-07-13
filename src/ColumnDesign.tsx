import React, { useState } from 'react';

export default function RectangularColumnTool() {
  const [inputs, setInputs] = useState({
    Pu: '2750', 
    Mu: '120', 
    b: '230', 
    D: '750', 
    L: '3.0',
    fck: 25, 
    fy: 500, 
    ptFck: '0.05' // Chart value from SP 16
  });

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const updateInput = (key: string, value: string) => setInputs(prev => ({ ...prev, [key]: value }));

  const n = {
    Pu: parseFloat(inputs.Pu) || 0,
    Mu: parseFloat(inputs.Mu) || 0,
    b: parseFloat(inputs.b) || 0,
    D: parseFloat(inputs.D) || 0,
    L: parseFloat(inputs.L) || 0,
    ptFck: parseFloat(inputs.ptFck) || 0
  };

  // --- COLUMN CALCULATIONS (Based on IS 456 & SP 16) ---
  const pu_N = n.Pu * 1000;
  const mu_Nmm = n.Mu * 1000000;
  const L_mm = n.L * 1000;

  // Minimum Eccentricity
  const ex = Math.max((L_mm / 500) + (n.D / 30), 20);
  const ey = Math.max((L_mm / 500) + (n.b / 30), 20);

  // Non-Dimensional Parameters for Chart
  const axialRatio = (n.b > 0 && n.D > 0) ? pu_N / (inputs.fck * n.b * n.D) : 0;
  const momentRatio = (n.b > 0 && n.D > 0) ? mu_Nmm / (inputs.fck * n.b * (n.D * n.D)) : 0;

  // Steel Percentage & Area Calculation
  const pt = n.ptFck * inputs.fck;
  const astRequired = (pt / 100) * n.b * n.D;

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
        RECTANGULAR COLUMN DESIGN (SP 16)
      </header>

      <div style={{ padding: '12px' }}>
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
              <select value={inputs.fck} onChange={e => setInputs({...inputs, fck: +e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[20, 25, 30, 35, 40].map(v => <option key={v} value={v}>M{v}</option>)}
              </select>
              <select value={inputs.fy} onChange={e => setInputs({...inputs, fy: +e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[415, 500, 550].map(v => <option key={v} value={v}>Fe{v}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366' }}>Chart Value (pt/fck)</label>
              <input type="text" onFocus={handleFocus} value={inputs.ptFck} onChange={e => updateInput('ptFck', e.target.value)} style={{ width: '95px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: '900', fontSize: '14px' }} />
            </div>

          </div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="yellow-row"><Cell label="Min Eccentricity (ex)" value={ex.toFixed(2)} unit="mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Min Eccentricity (ey)" value={ey.toFixed(2)} unit="mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Pu / (fck b D)" value={axialRatio.toFixed(3)} unit="" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Mu / (fck b D²)" value={momentRatio.toFixed(3)} unit="" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Steel Percentage (pt)" value={pt.toFixed(2)} unit="%" color="#ffff00" /></div>
          
          <div className="green-bar" style={{ backgroundColor: '#92d050', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #76b041' }}>
            <span style={{ fontSize: '14px', fontWeight: '900' }}>REQ. Ast</span>
            <span style={{ fontSize: '18px', fontWeight: '900' }}>{astRequired.toFixed(2)} mm²</span>
          </div>
        </div>

        <button className="no-print" onClick={() => window.print()} style={{ width: '100%', marginTop: '12px', padding: '14px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          PRINT TO PDF / SAVE REPORT
        </button>
      </div>
    </div>
  );
}
