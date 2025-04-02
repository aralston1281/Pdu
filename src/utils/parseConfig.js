export function parseConfig(config) {
  const lineups =
    config.lineupNames && config.lineupNames.length > 0
      ? config.lineupNames
      : ['A01', 'A02', 'B01', 'B02', 'C01'];

  const pduUsage = {};
  lineups.forEach((lineup, index) => {
    pduUsage[lineup] =
      config.pduConfigs && config.pduConfigs[index]
        ? config.pduConfigs[index].map((_, idx) => idx)
        : [0, 1];
  });

  return { lineups, pduUsage };
}
