import React from 'react';

function PDUCard({
  lineup,
  pduIndex,
  pduKey,
  load,
  maxKW,
  index,
  onChangeLoad,
  breakerSelection,
  toggleSubfeed,
  subfeedsPerPDU,
  maxSubfeedKW,
  formatPower,
  pduListLength = 2,
}) {
  const selectedFeeds = Array.from({ length: subfeedsPerPDU }).filter(
    (_, i) => breakerSelection[`${pduKey}-S${i}`]
  );

  return (
    <div
      style={{
        flex: pduListLength === 1 ? '0 1 100%' : '0 1 calc(50% - 0.5rem)',
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd',
      }}
    >
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>{pduKey}</strong> — Load:
        <input
          type="number"
          value={load}
          onChange={(e) => onChangeLoad(index, e.target.value)}
          style={{ marginLeft: '0.5rem', width: '100px' }}
        />
        <span
          style={{
            color: load > maxKW ? 'red' : 'green',
            marginLeft: '1rem',
          }}
        >
          {load > maxKW
            ? `Overloaded (>${formatPower(maxKW)})`
            : `OK (<${formatPower(maxKW)})`}
        </span>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <label style={{ fontWeight: 'bold' }}>Subfeeds:</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {Array.from({ length: subfeedsPerPDU }).map((_, i) => {
            const key = `${pduKey}-S${i}`;
            const isSelected = !!breakerSelection[key];
            const feedLoad =
              isSelected && selectedFeeds.length > 0
                ? load / selectedFeeds.length
                : 0;
            const overLimit = feedLoad > maxSubfeedKW;

            return (
              <label
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '60px',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSubfeed(pduKey, i)}
                />
                S{i + 1}
                <span
                  style={{
                    fontSize: '10px',
                    color: overLimit ? 'red' : '#666',
                  }}
                >
                  {isSelected ? `${feedLoad.toFixed(2)} kW` : ''}
                  {isSelected ? ` / ${formatPower(maxSubfeedKW)}` : ''}
                  {overLimit ? ' ⚠️' : ''}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PDUCard;
