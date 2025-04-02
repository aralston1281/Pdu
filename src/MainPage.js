import React from 'react';

const MainPage = ({ config }) => {
  return (
    <div>
      <h1>Main Dashboard</h1>
      <p>Breaker Parameters: {config.breakerParams}</p>
      <p>Lineup Configuration: {config.lineupConfig}</p>
      <p>Number of PDUs: {config.numPDU}</p>
      <p>Number of Subfeed Breakers: {config.numSubfeed}</p>
      {/* Insert your calculations and additional UI elements here */}
    </div>
  );
};

export default MainPage;
