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
  const maxLineupKW = (Math.sqrt(3) * pduVoltage * pduMainBreakerAmps * powerFactor * 0.8);

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
      let cap = activeFeeds * maxSubfeedKW;
      if (cap === 0) cap = subfeedsPerPDU * maxSubfeedKW;
      if (!lineupCapacityMap[lineup]) lineupCapacityMap[lineup] = 0;
      lineupCapacityMap[lineup] += cap;
      return cap;
    });

    const lineupUsedKW = {};
    while (remainingLoad > 0) {
      let anyAllocated = false;
      for (let i = 0; i < distributed.length; i++) {
        const [lineup] = pduList[i].split("-");
        const cap = pduCapacities[i];
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

  return null;
}
