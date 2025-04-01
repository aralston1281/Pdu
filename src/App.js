// Full updated LoadDistributionPlanner component with enhancements
import { useState } from "react";
import jsPDF from "jspdf";

export default function LoadDistributionPlanner() {
  const [targetLoadMW, setTargetLoadMW] = useState(5);
  const [selectedLineups, setSelectedLineups] = useState(["A01", "A02", "B01", "B02", "C01"]);
  const [customDistribution, setCustomDistribution] = useState([]);
  const [breakerSelection, setBreakerSelection] = useState({});
  const [pduUsage, setPduUsage] = useState({});
  const [lineupWarnings, setLineupWarnings] = useState({});

  const lineupNames = ["A01", "A02", "B01", "B02", "C01", "C02", "D01", "D02", "E01", "E02"];
  const pduPerLineup = 2;
  const subfeedsPerPDU = 8;
  const subfeedBreakerAmps = 800;
  const subfeedVoltage = 415;
  const powerFactor = 1.0;
  const maxSubfeedKW = (Math.sqrt(3) * subfeedVoltage * subfeedBreakerAmps * powerFactor) / 1000;
  const pduMainBreakerAmps = 1000;
  const pduVoltage = 480;
  const pduMaxKW = (Math.sqrt(3) * pduVoltage * pduMainBreakerAmps * powerFactor * 0.8) / 1000;
  const maxLineupKW = Math.sqrt(3) * pduVoltage * pduMainBreakerAmps * powerFactor * 0.8;

  const totalPDUs = selectedLineups.reduce((acc, lineup) => acc + (pduUsage[lineup]?.length || 2), 0);
  const evenLoadPerPDU = (targetLoadMW * 1000) / totalPDUs;

  const handleCustomChange = (index, value) => {
    const updated = [...customDistribution];
    updated[index] = Number(value);
    setCustomDistribution(updated);
  };

  const toggleSubfeed = (pduKey, feedIndex) => {
    setBreakerSelection(prev => {
      const key = `${pduKey}-S${feedIndex}`;
      const updated = { ...prev };
      if (updated[key]) delete updated[key];
      else updated[key] = true;
      return updated;
    });
  };

  const toggleLineup = (lineup) => {
    setSelectedLineups(prev => prev.includes(lineup) ? prev.filter(l => l !== lineup) : [...prev, lineup]);
  };

  const togglePdu = (lineup, pduIndex) => {
    setPduUsage(prev => {
      const current = prev[lineup] || [0, 1];
      const updated = current.includes(pduIndex)
        ? current.filter(p => p !== pduIndex)
        : [...current, pduIndex].sort();
      return { ...prev, [lineup]: updated };
    });
  };

  const autoDistribute = () => {
    const pduList = selectedLineups.flatMap(lineup => (pduUsage[lineup] || [0, 1]).map(pdu => `${lineup}-${pdu + 1}`));
    const distributed = Array(pduList.length).fill(0);
    let remainingLoad = targetLoadMW * 1000;

    const lineupUsedKW = {};
    const pduCapacities = pduList.map((pduKey) => {
      let activeFeeds = 0;
      for (let j = 0; j < subfeedsPerPDU; j++) {
        if (breakerSelection[`${pduKey}-S${j}`]) activeFeeds++;
      }
      const cap = activeFeeds * maxSubfeedKW;
      const lineup = pduKey.split("-")[0];
      if (!lineupUsedKW[lineup]) lineupUsedKW[lineup] = 0;
      return cap;
    });

    while (remainingLoad > 0) {
      let anyAllocated = false;
      for (let i = 0; i < distributed.length; i++) {
        const pduKey = pduList[i];
        const cap = pduCapacities[i];
        if (cap === 0) continue;
        const lineup = pduKey.split("-")[0];
        const currentUsage = lineupUsedKW[lineup] || 0;
        if (currentUsage >= maxLineupKW) continue;
        const available = Math.min(cap - distributed[i], maxLineupKW - currentUsage);
        if (available <= 0) continue;
        const toAssign = Math.min(available, remainingLoad, 10);
        distributed[i] += toAssign;
        lineupUsedKW[lineup] = currentUsage + toAssign;
        remainingLoad -= toAssign;
        anyAllocated = true;
        if (remainingLoad <= 0) break;
      }
      if (!anyAllocated) break;
    }

    setCustomDistribution(distributed);
    const warnings = {};
    Object.keys(lineupUsedKW).forEach(lineup => {
      if (lineupUsedKW[lineup] >= maxLineupKW) warnings[lineup] = true;
    });
    setLineupWarnings(warnings);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Load Distribution Summary", 10, 10);
    selectedLineups.forEach((lineup, i) => {
      doc.text(`${lineup}:`, 10, 20 + i * 10);
      (pduUsage[lineup] || [0, 1]).forEach(pdu => {
        const pduKey = `${lineup}-${pdu + 1}`;
        const index = selectedLineups.slice(0, i).reduce((acc, l) => acc + (pduUsage[l]?.length || 2), 0) + pdu;
        doc.text(`  ${pduKey}: ${customDistribution[index] || 0} kW`, 10, 25 + i * 10);
      });
    });
    doc.save("load_distribution.pdf");
  };

  const totalCustomKW = customDistribution.reduce((sum, val) => sum + val, 0);
  const overCapacityFlags = customDistribution.map((val) => val > pduMaxKW);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "1rem" }}>Load Distribution Planner</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label>Target Load (MW)</label>
          <input type="number" value={targetLoadMW} onChange={(e) => setTargetLoadMW(Number(e.target.value))} />
        </div>
        <button onClick={autoDistribute} disabled={totalPDUs === 0}>Auto Distribute</button>
        <button onClick={exportPDF}>Export to PDF</button>
        <button onClick={() => {
          setCustomDistribution([]);
          setBreakerSelection({});
          setPduUsage({});
          setSelectedLineups([]);
        }}>Clear All</button>
      </div>

      <div>
        <label>Lineups to Use</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {lineupNames.map(lineup => (
            <div key={lineup} style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "8px", minWidth: "140px" }}>
              <label style={{ fontWeight: "bold" }}>
                <input type="checkbox" checked={selectedLineups.includes(lineup)} onChange={() => toggleLineup(lineup)} />
                {lineup} {lineupWarnings[lineup] && <span style={{ color: 'red' }}>⚠️</span>}
              </label>
              {selectedLineups.includes(lineup) && (
                <div style={{ fontSize: "12px", marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {[0, 1].map(i => (
                    <label key={`${lineup}-${i}`}>
                      <input type="checkbox" checked={(pduUsage[lineup] || [0, 1]).includes(i)} onChange={() => togglePdu(lineup, i)} />
                      {lineup}-{i + 1}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <p>Total PDUs in use: <strong>{totalPDUs}</strong></p>
        <p>Required Even Load per PDU: <strong>{evenLoadPerPDU.toFixed(2)} kW</strong></p>
        <p>Max Capacity per Selected PDU: <strong>{pduMaxKW.toFixed(2)} kW</strong></p>
        <p>Total Available System Capacity: <strong>{(pduMaxKW * totalPDUs / 1000).toFixed(2)} MW</strong></p>
      </div>

      {selectedLineups.map((lineup, li) => (
        <div key={lineup} style={{ borderTop: "1px solid #ccc", paddingTop: "1rem", marginTop: "1rem" }}>
          <h3>Lineup {lineup}</h3>
          {(pduUsage[lineup] || [0, 1]).map((pdu, pj) => {
            const index = selectedLineups.slice(0, li).reduce((acc, l) => acc + (pduUsage[l]?.length || 2), 0) + pj;
            const pduKey = `${lineup}-${pdu + 1}`;
            return (
              <div key={pduKey}>
                <label>{pduKey} Load (kW)</label>
                <input type="number" value={customDistribution[index] || 0} onChange={(e) => handleCustomChange(index, e.target.value)} />
                <span style={{ color: overCapacityFlags[index] ? "red" : "green" }}>
                  {overCapacityFlags[index] ? "Overloaded" : "OK"}
                </span>
                <div>
                  <label>Subfeeds:</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {Array.from({ length: subfeedsPerPDU }).map((_, i) => (
                      <label key={`${pduKey}-S${i}`}>
                        <input type="checkbox" checked={!!breakerSelection[`${pduKey}-S${i}`]} onChange={() => toggleSubfeed(pduKey, i)} /> S{i + 1}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <p>Total Custom Load: <strong>{totalCustomKW.toFixed(2)} kW</strong></p>
      <p style={{ color: totalCustomKW > targetLoadMW * 1000 ? "red" : "green" }}>
        {totalCustomKW > targetLoadMW * 1000 ? "Exceeds Target Load" : "Within Target Load"}
      </p>
    </div>
  );
}
