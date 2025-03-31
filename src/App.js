import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  // Override PDU max capacity using main breaker (1000A) at 480V, 80% rule
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
    <div className="max-w-5xl mx-auto grid gap-6 p-6">
      <h1 className="text-2xl font-bold">Load Distribution Planner</h1>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4">
          <div>
            <label className="font-semibold">Target Load (MW)</label>
            <Input
              type="number"
              value={targetLoadMW}
              onChange={(e) => setTargetLoadMW(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="font-semibold"># of Lineups to Use</label>
            <Input
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2 p-4">
          <p>Total PDUs in use: <strong>{totalPDUs}</strong></p>
          <p>Required Even Load per PDU: <strong>{evenLoadPerPDU.toFixed(2)} kW</strong></p>
          <p>PDU Max Capacity (80% rule): <strong>{pduMaxKW.toFixed(2)} kW</strong></p>
          <p>Total Available System Capacity: <strong>{(pduMaxKW * totalPDUs / 1000).toFixed(2)} MW</strong></p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Custom Distribution</h2>
            <div className="flex gap-4">
              <Button onClick={autoDistribute} variant="outline">Auto Distribute</Button>
              <Button onClick={exportCSV} variant="outline">Export CSV</Button>
              <Button onClick={exportPDF} variant="outline">Export PDF</Button>
            </div>
          </div>

          {Array.from({ length: activeLineups }).map((_, lineupIndex) => (
            <div key={lineupIndex} className="border-t pt-2">
              <h3 className="font-semibold mb-2">Lineup {lineupIndex + 1}</h3>
              {Array.from({ length: pduPerLineup }).map((_, j) => {
                const index = lineupIndex * pduPerLineup + j;
                return (
                  <div key={index} className="flex gap-4 items-center mb-2">
                    <label className="w-32 font-medium">PDU {index + 1} Load (kW)</label>
                    <Input
                      type="number"
                      value={customDistribution[index] || 0}
                      onChange={(e) => handleCustomChange(index, e.target.value)}
                    />
                    <span className={overCapacityFlags[index] ? "text-red-600" : "text-green-600"}>
                      {overCapacityFlags[index] ? "Overloaded" : "OK"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          <p className="mt-4">Total Custom Load: <strong>{totalCustomKW.toFixed(2)} kW</strong></p>
          <p className={totalCustomKW > targetLoadMW * 1000 ? "text-red-600" : "text-green-600"}>
            {totalCustomKW > targetLoadMW * 1000 ? "Exceeds Target Load" : "Within Target Load"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
