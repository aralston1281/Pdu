import { useState } from "react";
import jsPDF from "jspdf";

export default function LoadDistributionPlanner() {
  const [targetLoadMW, setTargetLoadMW] = useState(5);
  const [activeLineups, setActiveLineups] = useState(5);
  const [customDistribution, setCustomDistribution] = useState([]);

  const pduPerLineup = 2;
  const subfeedsPerPDU = 8;
  const subfeedBreakerAmps = 800;
  const subfeedVoltage = 415;
  const powerFactor = 1.0;
  const maxSubfeedKW = (Math.sqrt(3) * subfeedVoltage * subfeedBreakerAmps * powerFactor) / 1000;
  const pduMainBreakerAmps = 1000;
  const pduVoltage = 480;
  const pduMaxKW = (Math.sqrt(3) * pduVoltage * pduMainBreakerAmps * powerFactor * 0.8) / 1000;

  const totalPDUs = activeLineups * pduPerLineup;
  const evenLoadPerPDU = (targetLoadMW * 1000) / totalPDUs;

  const handleCustomChange = (index, value) => {
    const updated = [...customDistribution];
    updated[index] = Number(value);
    setCustomDistribution(updated);
  };

  const autoDistribute = () => {
    const distributed = Array(totalPDUs).fill(0);
    let remainingLoad = targetLoadMW * 1000;
    for (let i = 0; i < distributed.length; i++) {
      const alloc = Math.min(pduMaxKW, remainingLoad);
      distributed[i] = alloc;
      remainingLoad -= alloc;
      if (remainingLoad <= 0) break;
    }
    setCustomDistribution(distributed);
  };

  const exportCSV = () => {
    const header = ["PDU #", "Load (kW)", "Status"];
    const rows = customDistribution.map((load, i) => {
      const status = load > pduMaxKW ? "Overloaded" : "OK";
      return [i + 1, load.toFixed(2), status];
    });
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdu_distribution.csv";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("PDU Load Distribution", 10, 10);
    customDistribution.forEach((load, i) => {
      const status = load > pduMaxKW ? "Overloaded" : "OK";
      doc.text(`PDU ${i + 1}: ${load.toFixed(2)} kW - ${status}`, 10, 20 + i * 7);
    });
    doc.save("pdu_distribution.pdf");
  };

  const totalCustomKW = customDistribution.reduce((sum, val) => sum + val, 0);
  const overCapacityFlags = customDistribution.map((val) => val > pduMaxKW);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "1rem" }}>
        Load Distribution Planner
      </h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label>Target Load (MW)</label>
          <input
            type="number"
            value={targetLoadMW}
            onChange={(e) => setTargetLoadMW(Number(e.target.value))}
          />
        </div>
        <div>
          <label># of Lineups to Use</label>
          <input
            type="number"
            min={1}
            max={10}
            value={activeLineups}
            onChange={(e) => {
              const n = Number(e.target.value);
              setActiveLineups(n);
              setCustomDistribution(Array(n * pduPerLineup).fill(0));
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <p>Total PDUs in use: <strong>{totalPDUs}</strong></p>
        <p>Required Even Load per PDU: <strong>{evenLoadPerPDU.toFixed(2)} kW</strong></p>
        <p>PDU Max Capacity (80% rule): <strong>{pduMaxKW.toFixed(2)} kW</strong></p>
        <p>Total Available System Capacity: <strong>{(pduMaxKW * totalPDUs / 1000).toFixed(2)} MW</strong></p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={autoDistribute}>Auto Distribute</button>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportPDF}>Export PDF</button>
      </div>

      {Array.from({ length: activeLineups }).map((_, lineupIndex) => (
        <div key={lineupIndex} style={{ borderTop: "1px solid #ccc", paddingTop: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: "bold" }}>Lineup {lineupIndex + 1}</h3>
          {Array.from({ length: pduPerLineup }).map((_, j) => {
            const index = lineupIndex * pduPerLineup + j;
            return (
              <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ width: "150px" }}>PDU {index + 1} Load (kW)</label>
                <input
                  type="number"
                  value={customDistribution[index] || 0}
                  onChange={(e) => handleCustomChange(index, e.target.value)}
                />
                <span style={{ color: overCapacityFlags[index] ? "red" : "green" }}>
                  {overCapacityFlags[index] ? "Overloaded" : "OK"}
                </span>
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
