import { useState } from "react";
import jsPDF from "jspdf";

export default function LoadDistributionPlanner() {
  const [targetLoadMW, setTargetLoadMW] = useState(5);
  const [selectedLineups, setSelectedLineups] = useState(["A01", "A02", "B01", "B02", "C01"]);
  const [customDistribution, setCustomDistribution] = useState([]);
  const [breakerSelection, setBreakerSelection] = useState({});
  const [pduUsage, setPduUsage] = useState({});

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
  const enabledSubfeedsCount = Object.values(breakerSelection).filter(Boolean).length || totalPDUs * subfeedsPerPDU;
  const totalEnabledSubfeedKW = enabledSubfeedsCount * maxSubfeedKW;
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

  const renderPduCheckbox = (lineup, pduIndex) => {
    const pduName = `${lineup}-${pduIndex + 1}`;
    return (
      <label key={pduName} className="text-sm font-medium flex items-center gap-1">
        <input
          type="checkbox"
          checked={(pduUsage[lineup] || [0, 1]).includes(pduIndex)}
          onChange={() => togglePdu(lineup, pduIndex)}
          className="accent-blue-600"
        />
        {pduName}
      </label>
    );
  };

  const renderSubfeedSelector = (pduIndex) => (
    <div className="ml-36 mt-1 text-xs">
      <label className="block mb-1">Subfeeds:</label>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: subfeedsPerPDU }).map((_, i) => {
          const key = `${pduIndex}-${i}`;
          return (
            <label key={key} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={!!breakerSelection[key]}
                onChange={() => toggleSubfeed(pduIndex, i)}
                className="accent-blue-600"
              />
              S{i + 1}
            </label>
          );
        })}
      </div>
    </div>
  );

  const autoDistribute = () => { /* unchanged */ };
  const exportCSV = () => { /* unchanged */ };
  const exportPDF = () => { /* unchanged */ };

  const totalCustomKW = customDistribution.reduce((sum, val) => sum + val, 0);
  const overCapacityFlags = customDistribution.map((val) => val > pduMaxKW);

  return (
    <div className="max-w-5xl mx-auto p-4 text-sm">
      <h1 className="text-2xl font-bold mb-4">Load Distribution Planner</h1>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block font-medium mb-1">Target Load (MW)</label>
          <input
            type="number"
            value={targetLoadMW}
            onChange={(e) => setTargetLoadMW(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
          />
        </div>
        <div className="flex-1">
          <label className="block font-medium mb-1">Lineups to Use</label>
          <div className="flex flex-wrap gap-4">
            {lineupNames.map(lineup => (
              <div key={lineup} className="border rounded p-3 w-40 shadow-sm">
                <label className="font-semibold block mb-2">
                  <input
                    type="checkbox"
                    checked={selectedLineups.includes(lineup)}
                    onChange={() => toggleLineup(lineup)}
                    className="mr-1 accent-blue-600"
                  />
                  {lineup}
                </label>
                {selectedLineups.includes(lineup) && (
                  <div className="flex gap-2 flex-wrap">
                    {[0, 1].map(i => renderPduCheckbox(lineup, i))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-1">
        <p>Total PDUs in use: <strong>{totalPDUs}</strong></p>
        <p>Required Even Load per PDU: <strong>{evenLoadPerPDU.toFixed(2)} kW</strong></p>
        <p>Max Capacity per Selected PDU (Main Breaker 80%): <strong>{pduMaxKW.toFixed(2)} kW</strong></p>
        <p>Total Available System Capacity (based on selected PDUs): <strong>{(pduMaxKW * totalPDUs / 1000).toFixed(2)} MW</strong></p>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={autoDistribute} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">Auto Distribute</button>
        <button onClick={exportCSV} className="border border-gray-400 px-4 py-1 rounded hover:bg-gray-100">Export CSV</button>
        <button onClick={exportPDF} className="border border-gray-400 px-4 py-1 rounded hover:bg-gray-100">Export PDF</button>
      </div>

      {selectedLineups.map((lineup, lineupIndex) => (
        <div key={lineup} className="border-t pt-4 mb-6">
          <h3 className="font-bold mb-2 text-base">Lineup {lineup}</h3>
          {(pduUsage[lineup] || [0, 1]).map((pdu, j) => {
            const index = selectedLineups
              .slice(0, lineupIndex)
              .reduce((acc, l) => acc + (pduUsage[l]?.length || 2), 0) + j;
            const pduLabel = `${lineup}-${pdu + 1}`;
            return (
              <div key={pduLabel} className="flex flex-col mb-4">
                <div className="flex items-center gap-4">
                  <label className="w-36 font-medium">{pduLabel} Load (kW)</label>
                  <input
                    type="number"
                    value={customDistribution[index] || 0}
                    onChange={(e) => handleCustomChange(index, e.target.value)}
                    className="border rounded px-2 py-1 w-24"
                  />
                  <span className={overCapacityFlags[index] ? "text-red-600" : "text-green-600"}>
                    {overCapacityFlags[index] ? "Overloaded" : "OK"}
                  </span>
                </div>
                {renderSubfeedSelector(index)}
              </div>
            );
          })}
        </div>
      ))}

      <p className="mt-4 text-base">Total Custom Load: <strong>{totalCustomKW.toFixed(2)} kW</strong></p>
      <p className={totalCustomKW > targetLoadMW * 1000 ? "text-red-600" : "text-green-600"}>
        {totalCustomKW > targetLoadMW * 1000 ? "Exceeds Target Load" : "Within Target Load"}
      </p>
    </div>
  );
}
