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

  const totalPDUs = selectedLineups.reduce((acc, lineup) => acc + (pduUsage[lineup]?.length || 2), 0);
  const evenLoadPerPDU = (targetLoadMW * 1000) / totalPDUs;

  const handleCustomChange = (index, value) => {
    const updated = [...customDistribution];
    updated[index] = Number(value);
    setCustomDistribution(updated);
  };

  const toggleSubfeed = (pduIndex, feedIndex) => {
    setBreakerSelection(prev => {
      const key = `${pduIndex}-${feedIndex}`;
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = true;
      }
      return updated;
    });
  };

  const toggleLineup = (lineup) => {
    setSelectedLineups(prev => {
      const newList = prev.includes(lineup) ? prev.filter(l => l !== lineup) : [...prev, lineup];
      return newList;
    });
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

    const lineupCapacityMap = {};
    const pduCapacities = pduList.map((pduName, i) => {
      const [lineup] = pduName.split("-");
      let activeFeeds = 0;
      for (let j = 0; j < subfeedsPerPDU; j++) {
        if (breakerSelection[`${i}-${j}`]) activeFeeds++;
      }
      const cap = activeFeeds * maxSubfeedKW;
      if (!lineupCapacityMap[lineup]) lineupCapacityMap[lineup] = 0;
      lineupCapacityMap[lineup] += cap;
      return cap;
    });

    const maxLineupKW = (Math.sqrt(3) * pduVoltage * pduMainBreakerAmps * powerFactor * 0.8);
    const lineupUsedKW = {};
    while (remainingLoad > 0) {
      let anyAllocated = false;
      for (let i = 0; i < distributed.length; i++) {
        const [lineup] = pduList[i].split("-");
        const cap = pduCapacities[i];
        if (cap === 0) continue;
        const lineupCap = maxLineupKW;
        const currentLineupUsage = lineupUsedKW[lineup] || 0;
        if (currentLineupUsage >= lineupCap) continue;
        const available = Math.min(cap - distributed[i], lineupCap - currentLineupUsage);
        if (available <= 0) continue;
        const toAssign = Math.min(available, remainingLoad, 10);
        distributed[i] += toAssign;
        lineupUsedKW[lineup] = currentLineupUsage + toAssign;
        remainingLoad -= toAssign;
        anyAllocated = true;
        if (remainingLoad <= 0) break;
      }
      if (!anyAllocated) break;
    }

    setCustomDistribution(distributed);

    const warnings = {};
    Object.keys(lineupUsedKW).forEach(lineup => {
      if (lineupUsedKW[lineup] >= maxLineupKW) {
        warnings[lineup] = true;
        console.warn(`⚠️ Lineup ${lineup} is at or over its 1000A limit.`);
      }
    });
    setLineupWarnings(warnings);
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
        <div>
          <label>Lineups to Use</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {lineupNames.map(lineup => (
              <div key={lineup} style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "8px", minWidth: "140px" }}>
                <label style={{ fontWeight: "bold" }}>
                  <input type="checkbox" checked={selectedLineups.includes(lineup)} onChange={() => toggleLineup(lineup)} style={{ marginRight: "6px" }} />
                  {lineup} {lineupWarnings[lineup] && <span style={{ color: 'red' }}>⚠️</span>}
                </label>
                {selectedLineups.includes(lineup) && (
                  <div style={{ fontSize: "12px", marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {[0, 1].map(i => {
                      const pduName = `${lineup}-${i + 1}`;
                      return (
                        <label key={pduName} style={{ marginRight: "1rem" }}>
                          <input
                            type="checkbox"
                            checked={(pduUsage[lineup] || [0, 1]).includes(i)}
                            onChange={() => togglePdu(lineup, i)}
                          /> {pduName}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <p>Total PDUs in use: <strong>{totalPDUs}</strong></p>
        <p>Required Even Load per PDU: <strong>{evenLoadPerPDU.toFixed(2)} kW</strong></p>
        <p>Max Capacity per Selected PDU (Main Breaker 80%): <strong>{pduMaxKW.toFixed(2)} kW</strong></p>
        <p>Total Available System Capacity (based on selected PDUs): <strong>{(pduMaxKW * totalPDUs / 1000).toFixed(2)} MW</strong></p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={autoDistribute}>Auto Distribute</button>
      </div>

      {selectedLineups.map((lineup, lineupIndex) => (
        <div key={lineup} style={{ borderTop: "1px solid #ccc", paddingTop: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: "bold" }}>Lineup {lineup}</h3>
          {(pduUsage[lineup] || [0, 1]).map((pdu, j) => {
            const index = selectedLineups.slice(0, lineupIndex).reduce((acc, l) => acc + (pduUsage[l]?.length || 2), 0) + j;
            const pduLabel = `${lineup}-${pdu + 1}`;
            return (
              <div key={pduLabel} style={{ display: "flex", flexDirection: "column", marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <label style={{ width: "150px" }}>{pduLabel} Load (kW)</label>
                  <input type="number" value={customDistribution[index] || 0} onChange={(e) => handleCustomChange(index, e.target.value)} />
                  <span style={{ color: overCapacityFlags[index] ? "red" : "green" }}>
                    {overCapacityFlags[index] ? "Overloaded" : "OK"}
                  </span>
                </div>
                <div style={{ marginLeft: "150px", marginTop: "4px" }}>
                  <label style={{ fontSize: "12px" }}>Subfeeds:</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "12px" }}>
                    {Array.from({ length: subfeedsPerPDU }).map((_, i) => {
                      const key = `${index}-${i}`;
                      return (
                        <label key={key}>
                          <input type="checkbox" checked={!!breakerSelection[key]} onChange={() => toggleSubfeed(index, i)} /> S{i + 1}
                        </label>
                      );
                    })}
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
