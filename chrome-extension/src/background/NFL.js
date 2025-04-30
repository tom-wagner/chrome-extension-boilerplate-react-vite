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
  const url = `https://sportsbook-nash.draftkings.com/api/sportscontent/dkusor/v1/leagues/88808/categories/${id}/subcategories/${subId}`;

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
  ['PASS', 1000, 9524],
  ['COMPLETIONS', 1000, 9522],
  ['ATTEMPTS', 1000, 9517],
  ['TDs', 1000, 9525],
  ['RUSH_YARDS', 1001, 9514],
  ['RUSH_REC_YARDS', 1001, 9523],
  ['REC_YARDS', 1342, 14114],
  ['RECEPTION', 1342, 14115],
  ['KICKING', 1002, 9520],
  ['TACKLES_ASSISTS', 1002, 9521],
  ['SOLO_TACKLES', 1002, 9530],
  ['INTERECEPTIONS', 1000, 15937],
];

async function scrapeAllCategoriesNFL() {
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
export { scrapeAllCategoriesNFL };
