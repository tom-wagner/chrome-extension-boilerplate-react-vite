const fetchData = () => {
  const statsObject = {};

  const extractPlayerStats = (eventBoxes, statType) => {
    eventBoxes.forEach(eventBox => {
      const playerName = eventBox.querySelector('.eventheading div')?.innerText.split(' - ')[0].trim();

      if (playerName) {
        if (!statsObject[playerName]) {
          statsObject[playerName] = {};
        }

        const statRows = eventBox.querySelectorAll('.eventrow .row');
        let foundStat = false;

        statRows.forEach(row => {
          const marketDiv = row.querySelector('.market');

          if (marketDiv) {
            let [statValue, odds] = marketDiv.innerText.split('\n').map(item => item.trim());
            let statName = '';

            if (statValue.includes('O')) statName = 'OVER';
            if (statValue.includes('U')) statName = 'UNDER';

            const OU = statValue.replace('O', '').replace('U', '');

            if (!statsObject[playerName][statType]) {
              statsObject[playerName][statType] = {};
            }

            statsObject[playerName][statType] = {
              ...statsObject[playerName][statType],
              [statName]: odds.replace('(', '').replace(')', ''),
              '0U': OU,
            };

            foundStat = true;
          }
        });

        if (!foundStat) {
          statsObject[playerName][statType] = {
            'O/U': 'N/A',
            OVER: 'N/A',
            UNDER: 'N/A',
          };
        }
      }
    });
  };

  const pointEventBoxes = document.querySelector('.panel-body').querySelectorAll('.eventbox');
  const reboundEventBoxes = document.querySelectorAll('.panel-body')[2].querySelectorAll('.eventbox');

  extractPlayerStats(pointEventBoxes, 'Points');
  extractPlayerStats(reboundEventBoxes, 'Rebounds');

  return statsObject;
};

const stats = fetchData();
console.log(stats);
