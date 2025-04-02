import React, { useState } from 'react';
import JobConfigPage from './JobConfigPage';
import LoadDistributionPlanner from './LoadDistributionPlanner';

function App() {
  const [jobConfig, setJobConfig] = useState(null);

  return jobConfig ? (
    <LoadDistributionPlanner config={jobConfig} />
  ) : (
    <JobConfigPage onStart={setJobConfig} />
  );
}

export default App;
