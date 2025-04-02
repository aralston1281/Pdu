import React, { useState } from 'react';

function JobConfigPage({ onStart }) {
  const [jobName, setJobName] = useState('');
  const [rawPrefixInput, setRawPrefixInput] = useState('A');
  const [lineupsPerPrefix, setLineupsPerPrefix] = useState(2);
  const [pduPerLineup, setPduPerLineup] = useState(2);

  const [lineupTripSetting, setLineupTripSetting] = useState(1200);
  const [pduMainBreakerTrip, setPduMainBreakerTrip] = useState(996);
  const [pduMainVoltage, setPduMainVoltage] = useState(480);
  const [subfeedBreakerTrip, setSubfeedBreakerTrip] = useState(600);
  const [subfeedVoltage, setSubfeedVoltage] = useState(415);

  const parsedPrefixes = rawPrefixInput
    .toUpperCase()
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x);

  const lineupNames = parsedPrefixes.flatMap((prefix) =>
    Array.from({ length: lineupsPerPrefix }, (_, i) =>
      `${prefix}${String(i + 1).padStart(2, '0')}`
    )
  );

  const pduConfigs = lineupNames.map((lineup) =>
    Array.from({ length: pduPerLineup }, (_, i) => `PDU-${lineup}-${i + 1}`)
  );

  const handleStart = () => {
    onStart({
      jobName,
      lineupNames,
      pduConfigs,
      lineupTripSetting,
      pduMainBreakerTrip,
      pduMainVoltage,
      subfeedBreakerTrip,
      subfeedVoltage
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Job Configuration</h2>
      <label>Job Name:</label>
      <input
        type="text"
        value={jobName}
        onChange={(e) => setJobName(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      <label>Lineup Prefixes (comma separated):</label>
      <textarea
        rows={2}
        value={rawPrefixInput}
        onChange={(e) => setRawPrefixInput(e.target.value)}
        style={{ display: 'block', marginBottom: '0.5rem', width: '100%' }}
      />

      <label>Lineups Per Prefix:</label>
      <input
        type="number"
        min={1}
        value={lineupsPerPrefix}
        onChange={(e) => setLineupsPerPrefix(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '0.25rem', width: '100%' }}
      />
      <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
        Preview Lineups: {lineupNames.join(', ')}
      </div>

      <label>PDUs per lineup:</label>
      <input
        type="number"
        min={1}
        value={pduPerLineup}
        onChange={(e) => setPduPerLineup(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />
      <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
        Preview PDUs: {pduConfigs.flat().join(', ')}
      </div>

      <h3>Breaker & Voltage Settings</h3>

      <label>Lineup Upstream Trip Setting (A):</label>
      <input
        type="number"
        value={lineupTripSetting}
        onChange={(e) => setLineupTripSetting(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      <label>PDU Main Breaker Trip Setting (A):</label>
      <input
        type="number"
        value={pduMainBreakerTrip}
        onChange={(e) => setPduMainBreakerTrip(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      <label>PDU Main Voltage (V):</label>
      <input
        type="number"
        value={pduMainVoltage}
        onChange={(e) => setPduMainVoltage(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      <label>Subfeed Breaker Trip Setting (A):</label>
      <input
        type="number"
        value={subfeedBreakerTrip}
        onChange={(e) => setSubfeedBreakerTrip(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      <label>Subfeed Voltage (V):</label>
      <input
        type="number"
        value={subfeedVoltage}
        onChange={(e) => setSubfeedVoltage(Number(e.target.value))}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />

      <button onClick={handleStart}>Start Planner</button>
    </div>
  );
}

export default JobConfigPage;
