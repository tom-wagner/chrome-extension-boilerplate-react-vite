// API configuration
const API_CONFIG = {
  baseUrl: 'https://tank01-fantasy-stats.p.rapidapi.com',
  headers: {
    'x-rapidapi-key': '08ea6792fdmsh10efd0678cc8f0fp14ba07jsn38fcd714d22a',
    'x-rapidapi-host': 'tank01-fantasy-stats.p.rapidapi.com',
  },
};

// Get today's date in YYYYMMDD format
function getTodayDate() {
  const today = new Date();
  return today.toISOString().slice(0, 10).replace(/-/g, '');
}

// Fetch games for current day
async function fetchTodaysGames() {
  const DATE_OVERRIDE = '20241108';
  const url = `${API_CONFIG.baseUrl}/getNBAScoresOnly?gameDate=${DATE_OVERRIDE || getTodayDate()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: API_CONFIG.headers,
    });
    const data = await response.json();
    return Object.values(data.body);
  } catch (error) {
    console.error("Error fetching today's games:", error);
    return [];
  }
}

// Fetch box score for a specific game
async function fetchGameBoxScore(gameId) {
  const url = `${API_CONFIG.baseUrl}/getNBABoxScore?gameID=${gameId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: API_CONFIG.headers,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching box score for game ${gameId}:`, error);
    return null;
  }
}

// Main function to orchestrate the data gathering
async function gatherPlayerStats() {
  // Get today's games
  const games = await fetchTodaysGames();

  // Create object to store box scores
  const boxScores = {};

  // Fetch box scores for completed games
  for (const game of games) {
    if (game.gameStatus === 'Completed') {
      const boxScore = await fetchGameBoxScore(game.gameID);
      if (boxScore) {
        boxScores[game.gameID] = boxScore;
      }
    }
  }

  // Process player stats
  const playerStats = getPlayerStatsByName(games, boxScores);
  return playerStats;
}

function getPlayerStatsByName(gamesList, boxScores) {
  const playerStats = {};

  gamesList.forEach(game => {
    const gameID = game.gameID;
    const boxScore = boxScores[gameID];

    if (boxScore && boxScore.body && boxScore.body.playerStats) {
      Object.values(boxScore.body.playerStats).forEach(player => {
        const stats = {
          AST: parseInt(player.ast) || 0,
          REB: parseInt(player.reb) || 0,
          PTS: parseInt(player.pts) || 0,
          BLK: parseInt(player.blk) || 0,
          STL: parseInt(player.stl) || 0,
          TOV: parseInt(player.TOV) || 0,
          NAME: player.longName,
        };

        playerStats[player.longName] = stats;
      });
    }
  });

  return playerStats;
}

// Initialize
gatherPlayerStats()
  .then(stats => {
    console.log('Player Stats:', stats);
  })
  .catch(error => {
    console.error('Error gathering stats:', error);
  });
