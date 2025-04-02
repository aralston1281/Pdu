import React from 'react';
import PDUCard from './PDUCard';

function LineupSection({
  lineup,
  pduList,
  lineupIndex,
  pduUsage,
  selectedLineups,
  customDistribution,
  pduMaxKW,
  breakerSelection,
  toggleSubfeed,
  handleCustomChange,
  subfeedsPerPDU,
  maxSubfeedKW,
  lineupWarnings,
  formatPower,
}) {
  return (
    <div
      style={{
        borderTop: '1px solid #ccc',
        paddingTop: '1rem',
        marginTop: '1rem',
      }}
    >
      <h3>
        Lineup {lineup}{' '}
        {lineupWarnings[lineup] && (
          <span style={{ color: 'red' }}>⚠️ Max capacity reached</span>
        )}
      </h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: pduList.length === 1 ? 'center' : 'flex-start',
        }}
      >
        {pduList.map((pdu, pj) => {
          const index =
            selectedLineups
              .slice(0, lineupIndex)
              .reduce((acc, l) => acc + (pduUsage[l]?.length || 0), 0) + pj;
          const pduKey = `PDU-${lineup}-${pdu + 1}`;
          const load = customDistribution[index] || 0;

          return (
            <PDUCard
              key={pduKey}
              lineup={lineup}
              pduIndex={pdu}
              pduKey={pduKey}
              load={load}
              maxKW={pduMaxKW}
              index={index}
              onChangeLoad={handleCustomChange}
              breakerSelection={breakerSelection}
              toggleSubfeed={toggleSubfeed}
              subfeedsPerPDU={subfeedsPerPDU}
              maxSubfeedKW={maxSubfeedKW}
              formatPower={formatPower}
              pduListLength={pduList.length}
            />
          );
        })}
      </div>
    </div>
  );
}

export default LineupSection;
