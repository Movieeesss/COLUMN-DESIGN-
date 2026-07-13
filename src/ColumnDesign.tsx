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
    const shareText = `Column Design Report:\nLoad (Pu): ${inputs.Pu} kN\nMoment (Mu): ${inputs.Mu} kNm\nSize: ${inputs.b}x${inputs.D}mm\nChart Value (pt/fck): ${inputs.ptFck}\nPu/(fck b D): ${calc.axialRatio}\nMu/(fck b D²): ${calc.momentRatio}\nAst Req: ${calc.astRequired.toFixed(2)} sqmm\nAst Prov: ${calc.astProvided.toFixed(2)} sqmm\nStatus: ${calc.isSafe ? 'OK' : 'Revise'}`;
    
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

    // Non-Dimensional Parameters (Rounded to 2 decimals)
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
  }, [inputs, bars]);

  // UI Component for Rows
  const Cell = ({ label, value, unit, color, isHighlight }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: color || '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      <span style={{ 
        fontFamily: 'monospace', 
        fontWeight: '900', 
        fontSize: isHighlight ? '15px' : 'inherit',
        color: isHighlight ? '#cc0000' : 'inherit', // Red text for highlight
        backgroundColor: isHighlight ? '#ffffff' : 'transparent', // White background pill
        padding: isHighlight ? '2px 8px' : '0',
        borderRadius: isHighlight ? '12px' : '0',
        border: isHighlight ? '1px solid #cc0000' : 'none',
        boxShadow: isHighlight ? '0px 2px 4px rgba(0,0,0,0.1)' : 'none'
      }}>
        {value} <small style={{fontSize: '9px', color: '#000'}}>{unit}</small>
      </span>
    </div>
  );

  const barOptions = [0, 2, 4, 6, 8, 10, 12, 14, 16];

  return (
    <div id="printable-area" style={{ width: '100%', maxWidth: '420px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh', boxSizing: 'border-box', padding: '10px' }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select { font-size: 16px !important; } /* Prevents iOS Safari Auto-Zoom */
        @media print {
          @page { size: auto; margin: 0; }
          body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
          #printable-area { border: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          header, .blue-box, .yellow-row, .green-bar, .status-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input, select { border: none !important; background: transparent !important; pointer-events: none; -webkit-appearance: none; appearance: none;}
        }
      `}</style>

      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '16px', borderBottom: '2px solid #76b041', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px 8px 0 0' }}>
        <span>COLUMN DESIGN</span>
        <button className="no-print" onClick={handleReset} style={{ background: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: '#cc0000', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>RESET</button>
      </header>

      <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #ddd', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
        {/* INPUT SECTION */}
        <div className="blue-box" style={{ border: '3px solid #0070c0', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', backgroundColor: '#00b0f0' }}>
          <div style={{ backgroundColor: '#0070c0', color: 'white', padding: '6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', letterSpacing: '1px' }}>EDITABLE DATA</div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.4)', padding: '8px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366', display: 'block', marginBottom: '4px' }}>Load (Pu) kN</label>
                <input type="number" onFocus={handleFocus} value={inputs.Pu} onChange={e => updateInput('Pu', e.target.value)} style={{ width: '100%', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.4)', padding: '8px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#003366', display: 'block', marginBottom: '4px' }}>Moment (Mu) kNm</label>
                <input type="number" onFocus={handleFocus} value={inputs.Mu} onChange={e => updateInput('Mu', e.target.value)} style={{ width: '100%', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)', padding: '8px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#003366' }}>Width (b) mm</label>
              <input type="number" onFocus={handleFocus} value={inputs.b} onChange={e => updateInput('b', e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)', padding: '8px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#003366' }}>Depth (D) mm</label>
              <input type="number" onFocus={handleFocus} value={inputs.D} onChange={e => updateInput('D', e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)', padding: '8px 10px', borderRadius: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#003366' }}>Length (L) m</label>
              <input type="number" onFocus={handleFocus} value={inputs.L} onChange={e => updateInput('L', e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '6px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select value={inputs.fck} onChange={e => updateInput('fck', e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[20, 25, 30, 35, 40].map(v => <option key={v} value={v}>M{v}</option>)}
              </select>
              <select value={inputs.fy} onChange={e => updateInput('fy', e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #0070c0', fontWeight: 'bold' }}>
                {[415, 500, 550].map(v => <option key={v} value={v}>Fe{v}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffe699', padding: '10px', borderRadius: '6px', marginTop: '4px', border: '2px dashed #d6a100' }}>
              <label style={{ fontSize: '12px', fontWeight: '900', color: '#b38600' }}>Chart Value (pt/fck)</label>
              <input type="number" step="0.01" onFocus={handleFocus} value={inputs.ptFck} onChange={e => updateInput('ptFck', e.target.value)} style={{ width: '100px', textAlign: 'right', padding: '8px', border: '2px solid #b38600', borderRadius: '4px', fontWeight: '900', fontSize: '16px', color: '#000' }} />
            </div>
          </div>
        </div>

        {/* OUTPUT RATIOS SECTION (With Highlights) */}
        <div style={{ border: '2px solid #e6e600', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="yellow-row"><Cell label="Min Eccentricity (ex)" value={calc.ex.toFixed(2)} unit="mm" color="#ffff00" /></div>
          <div className="yellow-row"><Cell label="Min Eccentricity (ey)" value={calc.ey.toFixed(2)} unit="mm" color="#ffff00" /></div>
          
          {/* Highlighted Rows Below */}
          <div className="yellow-row"><Cell label="Pu / (fck b D)" value={calc.axialRatio} unit="" color="#ffff00" isHighlight={true} /></div>
          <div className="yellow-row"><Cell label="Mu / (fck b D²)" value={calc.momentRatio} unit="" color="#ffff00" isHighlight={true} /></div>
          
          <div className="yellow-row"><Cell label="Steel Percentage (pt)" value={calc.pt.toFixed(2)} unit="%" color="#ffff00" /></div>
          
          <div className="green-bar" style={{ backgroundColor: '#92d050', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #76b041' }}>
            <span style={{ fontSize: '15px', fontWeight: '900' }}>REQ. Ast</span>
            <span style={{ fontSize: '20px', fontWeight: '900', textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>{calc.astRequired.toFixed(2)} mm²</span>
          </div>
        </div>

        {/* REINFORCEMENT PROVIDED SECTION */}
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{ backgroundColor: '#e2efda', padding: '10px', fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #ccc', textAlign: 'center', letterSpacing: '0.5px' }}>
            NUMBER OF BARS PROVIDED
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', backgroundColor: '#ccc' }}>
            {['8', '10', '12', '16', '20', '25', '32'].map(dia => (
              <div key={dia} style={{ backgroundColor: '#fff', padding: '10px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#cc0000', marginBottom: '6px' }}>{dia} mm</span>
                <select 
                  value={bars[dia]} 
                  onChange={(e) => updateBar(dia, e.target.value)}
                  style={{ padding: '6px 2px', border: '1px solid #aaa', borderRadius: '4px', fontSize: '14px', width: '90%', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {barOptions.map(num => (
                    <option key={num} value={num}>{num === 0 ? '-' : num}</option>
                  ))}
                </select>
              </div>
            ))}
            <div style={{ backgroundColor: '#fff' }}></div>
          </div>
          
          <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f4f4f4', borderTop: '1px solid #ccc' }}>
             <span style={{ fontSize: '14px', fontWeight: '900' }}>PROV. Ast</span>
             <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: '900', color: '#003366' }}>{calc.astProvided.toFixed(2)} mm²</span>
          </div>

          <div className="status-bar" style={{ backgroundColor: calc.isSafe ? '#92d050' : '#ff4c4c', color: calc.isSafe ? '#000' : '#fff', padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '16px', borderTop: '2px solid rgba(0,0,0,0.1)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {calc.isSafe ? "✅ Steel provided OK" : "⚠️ Provide more steel"}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
          <button onClick={() => window.print()} style={{ flex: 1, padding: '15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            PRINT TO PDF
          </button>
          <button onClick={handleShare} style={{ flex: 1, padding: '15px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            SHARE REPORT
          </button>
        </div>

      </div>
    </div>
  );
}
