// Set headers
const headers = {
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9,la;q=0.8',
  priority: 'u=1, i',
  'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

async function scrapeCategory(category, id, subId) {
  const url = `https://sportsbook-nash.draftkings.com/api/sportscontent/dkusor/v1/leagues/42648/categories/${id}/subcategories/${subId}`;

  try {
    const response = await fetch(url, {
      headers: headers,
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const output = {};
    const selections = data['selections'] || [];

    for (const item of selections) {
      const seoIdentifier = item.participants[0].seoIdentifier;
      const marketId = item.marketId;
      const eventId = data.markets.find(market => market.id === marketId)?.eventId;
      const eventName = data.events.find(event => event.id === eventId)?.name || null;

      // Initialize the team and player objects in output
      output[eventName] = output[eventName] || {};
      const playerData = output[eventName][seoIdentifier] || (output[eventName][seoIdentifier] = {});

      // Initialize the category object if it doesn't exist
      playerData[category] = playerData[category] || {};

      playerData[category].line = item.points;
      if (item.displayOdds) {
        if (item.label === 'Over') {
          playerData[category].overOdds = item.displayOdds.american;
        } else if (item.label === 'Under') {
          playerData[category].underOdds = item.displayOdds.american;
        }
      }
    }

    return output;
  } catch (error) {
    console.error('Error fetching the data:', error.message || error);
    return null;
  }
}

const categories = [
  ['PTS', 1215, 12488],
  ['REB', 1216, 12492],
  ['AST', 1217, 12495],
  ['3PM', 1218, 12497],
  ['PTS_REB_AST', 583, 5001],
  ['PTS_REB', 583, 9976],
  ['PTS_AST', 583, 9973],
  ['STEALS', 1293, 13508],
  ['BLOCKS', 1293, 13780],
  ['TURNOVERS', 1293, 13782],
  ['STEALS_BLOCKS', 1293, 13781],
];

async function scrapeAllCategoriesNBA() {
  const finalOutput = {};

  for (const [categoryName, id, subId] of categories) {
    const categoryData = await scrapeCategory(categoryName, id, subId);

    for (const team in categoryData) {
      if (!finalOutput[team]) {
        finalOutput[team] = {};
      }

      for (const player in categoryData[team]) {
        if (!finalOutput[team][player]) {
          finalOutput[team][player] = {};
        }

        finalOutput[team][player] = {
          ...finalOutput[team][player],
          ...categoryData[team][player],
        };
      }
    }
  }

  console.log(JSON.stringify(finalOutput, null, 2));
  return finalOutput;
}
export { scrapeAllCategoriesNBA };
