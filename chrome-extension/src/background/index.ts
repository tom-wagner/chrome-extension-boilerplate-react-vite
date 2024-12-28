/* eslint-disable no-inner-declarations */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable @typescript-eslint/ban-ts-comment */
import browser from 'webextension-polyfill';
import { backgroundStorage } from '@extension/storage';
import { scrapeAllCategoriesNBA } from './NBA';
import { scrapeAllCategoriesNFL } from './NFL';
import {
  pickableIdToPickableMapNba as pickableIdToPickableMap,
  mockUnabatedNflResult,
  pickableIdToPickableMapNfl,
} from './MOCK_DATA';

function determineResult(targetValue, abbreviation, boxScore) {
  const OVER = 'OVER';
  const UNDER = 'UNDER';
  const STAT_CATEGORIES = {
    'PTS+AST': (targetValue, abbreviation, boxScore) => {
      const total = boxScore.PTS + boxScore.AST;
      return total > targetValue ? OVER : UNDER;
    },
    'PTS+REB': (targetValue, abbreviation, boxScore) => {
      const total = boxScore.PTS + boxScore.REB;
      return total > targetValue ? OVER : UNDER;
    },
    PTS: (targetValue, abbreviation, boxScore) => {
      return boxScore.PTS > targetValue ? OVER : UNDER;
    },
    'P+A+R': (targetValue, abbreviation, boxScore) => {
      const total = boxScore.PTS + boxScore.AST + boxScore.REB;
      return total > targetValue ? OVER : UNDER;
    },
    'AST+REB': (targetValue, abbreviation, boxScore) => {
      const total = boxScore.AST + boxScore.REB;
      return total > targetValue ? OVER : UNDER;
    },
    'STL+BLK': (targetValue, abbreviation, boxScore) => {
      const total = boxScore.STL + boxScore.BLK;
      return total > targetValue ? OVER : UNDER;
    },
    // "3PM": (targetValue, abbreviation, boxScore) => {
    //   return boxScore['3PM'] > targetValue ? OVER : UNDER;
    // },
    REB: (targetValue, abbreviation, boxScore) => {
      return boxScore.REB > targetValue ? OVER : UNDER;
    },
    TO: (targetValue, abbreviation, boxScore) => {
      return boxScore.TOV > targetValue ? OVER : UNDER;
    },
    AST: (targetValue, abbreviation, boxScore) => {
      return boxScore.AST > targetValue ? OVER : UNDER;
    },
    BLK: (targetValue, abbreviation, boxScore) => {
      return boxScore.BLK > targetValue ? OVER : UNDER;
    },
    STL: (targetValue, abbreviation, boxScore) => {
      return boxScore.STL > targetValue ? OVER : UNDER;
    },
  };

  console.log({ targetValue, abbreviation, boxScore });

  return STAT_CATEGORIES[abbreviation](targetValue, abbreviation, boxScore);
}

function convertPickableMap(pickableIdToPickableMap) {
  const playerObjects = Object.entries(pickableIdToPickableMap).reduce((acc, [key, value]) => {
    if (!value.activeMarket.isPaused) {
      acc[key] = mapPlayerObj(value);
    } else {
      // do nothing; can't pick paused players
    }
    return acc;
  }, {});

  const playerObjectsArray = Object.values(playerObjects);

  const playerObj = playerObjectsArray.reduce((acc, cv) => {
    if (cv.displayName in acc) {
      acc[cv.displayName].push(cv);
    } else {
      acc[cv.displayName] = [cv];
    }
    return acc;
  }, {});

  return playerObj;
}

function editDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array to store the distances
  const distances = [];
  for (let i = 0; i <= len1; i++) {
    distances[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    distances[0][j] = j;
  }

  // Compute distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1, // deletion
        distances[i][j - 1] + 1, // insertion
        distances[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  // Return the final distance
  return distances[len1][len2];
}

function getEtrName(otherName) {
  const editDistances = ETR_PLAYERS.map(n => [editDistance(otherName, n), n]);
  const sortedEditDistances = editDistances.sort((a, b) => a[0] - b[0]);
  console.log({
    edZero: sortedEditDistances[0][0],
    name: sortedEditDistances[0][1],
    otherName,
  });
  return sortedEditDistances[0][1];
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const POSITION_TO_UNABATED_POSITION_MAP = {
  PG: 'G',
  'PG/SG': 'G',
  'SG/PG': 'G',
  SG: 'G',
  'SG/SF': 'G',
  'SF/SG': 'G',
  SF: 'GF',
  'SF/PF': 'GF',
  'PF/SF': 'GF',
  PF: 'FC',
  'PF/C': 'FC',
  'C/PF': 'FC',
  C: 'FC',
};

const mapPlayerObj = playerObj => {
  const playerEntity = playerObj.pickable.pickableEntities[0];
  const competition = playerEntity.pickableCompetitions[0];
  const teamAbbreviation = competition.team.abbreviation;
  const competitionSummary = competition.competitionSummary;
  const market = playerObj.pickable.marketCategory.marketAbbreviation;
  const position = playerObj.pickable.pickableEntities[0].pickableCompetitions[0].positionName;
  const moreDraftableId = playerObj.activeMarket.pickableMarketSelections[0].pickableMarketSelectionId;
  const lessDraftableId = playerObj.activeMarket.pickableMarketSelections[1].pickableMarketSelectionId;
  const opponentAbbreviation =
    competitionSummary.homeTeam.abbreviation === teamAbbreviation
      ? competitionSummary.awayTeam.abbreviation
      : competitionSummary.homeTeam.abbreviation;

  return {
    displayName: playerEntity.displayName,
    targetValue: playerObj.activeMarket.targetValue,
    team: teamAbbreviation,
    opponent: opponentAbbreviation,
    statCategory: { abbreviation: market, name: playerObj.pickable.marketCategory.marketName },
    position,
    moreDraftableId,
    lessDraftableId,
  };
};

// Function to update storage with error handling
async function updateBackgroundStorage() {
  try {
    const currentData = await backgroundStorage.get();

    await backgroundStorage.set({
      ...currentData,
      lastUpdate: Date.now(),
      counter: currentData.counter + 1,
    });

    console.log('Background script still running');
  } catch (error) {
    console.error('Error updating background storage:', error);
  }
}

async function updateEtrProjections() {
  console.log('Checking for ETR updates...');
  try {
    const tabs = await browser.tabs.query({
      // TODO:
      url: '*establishTheRunFullProjectionDetail.html',
    });

    for (const tab of tabs) {
      if (tab.id) {
        await browser.tabs.reload(etrTabId);

        // Wait a moment for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        const result = await browser.scripting.executeScript({
          target: { tabId: etrTabId },
          func: async () => {
            interface PlayerData {
              name: string;
              team: string;
              position: string;
              opponent: string;
              salary: number;
              fdPoints: number;
              fdValue: number;
              fdOwnership: number;
              slate: string;
            }

            function parseTable(tableElement: HTMLTableElement): PlayerData[] {
              console.log('Parsing table');
              const players: PlayerData[] = [];

              // Get all rows from tbody
              const rows = tableElement.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr');
              console.log({ rows });
              if (!rows) return players;

              // @ts-expect-error
              for (const row of rows) {
                const cells = row.getElementsByTagName('td');
                if (cells.length !== 12) continue; // Skip invalid rows - we expect 12 columns now

                // Extract data from cells based on the new table structure
                const player: PlayerData = {
                  name: cells[0].textContent?.trim() || '',
                  position: cells[1].textContent?.trim() || '',
                  team: cells[2].textContent?.trim() || '',
                  opponent: cells[3].textContent?.trim() || '',
                  minutes: parseFloat(cells[4].textContent?.trim() || '0'),
                  points: parseFloat(cells[5].textContent?.trim() || '0'),
                  assists: parseFloat(cells[6].textContent?.trim() || '0'),
                  rebounds: parseFloat(cells[7].textContent?.trim() || '0'),
                  threePt: parseFloat(cells[8].textContent?.trim() || '0'),
                  turnovers: parseFloat(cells[9].textContent?.trim() || '0'),
                  steals: parseFloat(cells[10].textContent?.trim() || '0'),
                  blocks: parseFloat(cells[11].textContent?.trim() || '0'),
                };

                players.push(player);
              }

              console.log({ players });

              return players;
            }

            const lastUpdatedTable = document.querySelector(
              'table[aria-label="Last Updated - NBA Projections Detail"]',
            );
            if (lastUpdatedTable === null) {
              return;
            }

            const lastUpdated = lastUpdatedTable?.querySelectorAll('td')[1].innerHTML;
            console.log('Last updated: ', lastUpdated);

            const currentData = await backgroundStorage.get();
            console.log({ currentData });

            if (lastUpdated === currentData.etrLastUpdated) {
              console.log('ETR still fresh!');
              return;
            }

            const table = document.querySelectorAll('table')[1];
            if (!table) {
              console.error('No table found on page');
              return null;
            }

            const tableData = parseTable(table);
            console.log({ tableData, lastUpdated });
            return [tableData, lastUpdated];
          },
        });

        console.log('result!!');
        console.log({ result });

        if (!result?.[0]?.result) {
          console.error('No table found on page');
          return;
        }

        const [tableData, lastUpdated] = result[0].result;
        console.log({ tableData, lastUpdated });

        // Store the scraped data
        const currentData = await backgroundStorage.get();
        await backgroundStorage.set({
          ...currentData,
          etrLastUpdated: lastUpdated,
          etrProjections: tableData,
        });
      }
    }
  } catch (error) {
    console.error('Error scraping table:', error);
  }
}

async function refreshPick6Slates() {
  console.log('Refreshing Pick6 slates...');
  try {
    const tabs = await browser.tabs.query({
      url: '*://pick6.draftkings.com/*',
    });

    const { pickSixSlates } = await backgroundStorage.get();
    const slateIds = Object.keys(pickSixSlates || {});

    for (const tab of tabs) {
      if (tab.id) {
        const result = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          args: [slateIds],
          func: async (slateIds) => {
            const updatedSlates = {};

            for (const slateId of slateIds) {
              try {
                const response = await fetch(`https://pick6.draftkings.com/?sport=NFL&pickGroup=${slateId}&_data=routes%2F_index`, {
                  "credentials": "include",
                  "headers": {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "newrelic": "eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkJyb3dzZXIiLCJhYyI6IjU0NjgyNSIsImFwIjoiNjAxNDMxMzM3IiwiaWQiOiI4ZTk2NmZlZjc3N2U4ZmI4IiwidHIiOiI1MWFjYzQ0NzMyZTRkMDIwN2Y0NTY3NjUxNDg0YTIyZiIsInRpIjoxNzM0NjQ2ODMzNzQ1fX0=",
                    "traceparent": "00-51acc44732e4d0207f4567651484a22f-8e966fef777e8fb8-01",
                    "tracestate": "546825@nr=0-1-546825-601431337-8e966fef777e8fb8----1734646833745",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Priority": "u=0"
                  },
                  "method": "GET"
                });

                const data = await response.json();
                updatedSlates[slateId] = data;
              } catch (error) {
                console.error(`Error fetching slate ${slateId}:`, error);
              }
            }

            return updatedSlates;
          }
        });

        console.log({ result });

        if (result[0]?.result) {
          const currentState = await backgroundStorage.get();
          // TODO: CONSIDER UPDATING THIS
          await backgroundStorage.set({
            ...currentState,
            pickSixSlates: result[0].result
          });

          simulateUnabatedNba();
        }
      }
    }
  } catch (error) {
    console.error('Error scraping Pick6 slates:', error);
  }
}

async function registerPick6Listener() {
  console.log('Adding Pick6 request listener...');
  const alreadyProcessed = new Set<string>();

  try {
    // Set up web request listener for DraftKings Pick6 requests
    browser.webRequest.onCompleted.addListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (details: any) => {
        console.log('Details...');
        console.log({ details });
        if (
          details.url.includes('pick6.draftkings.com') &&
          details.url.includes('_data=routes') &&
          (details.url.includes('NBA') || details.url.includes('NFL'))
        ) {
          try {
            if (!alreadyProcessed.has(details.url)) {
              // Fetch the response data
              const response = await fetch(details.url);
              const data = await response.json();
              alreadyProcessed.add(details.url);

              const playerObj = Object.entries(data.pickableIdToPickableMap).reduce((acc, [key, value]) => {
                if (!value.isUnpickable) {
                  acc[key] = mapPlayerObj(value);
                } else {
                  // do nothing; can't pick paused players
                }
                return acc;
              }, {});

              const currentData = await backgroundStorage.get();
              const pickSixSlates = {
                ...(currentData.pickSixSlates || {}),
                // TODO: NEED TO DECIDE ON THIS FORMAT
                [data.pickGroupId]: {
                  fullData: data,
                  playerObj,
                  lastUpdated: Date.now(),
                },
              };
              await backgroundStorage.set({
                ...currentData,
                pickSixSlates,
              });
            }
          } catch (error) {
            console.error('Error fetching Pick6 data... ', error);
          }
        }
      },
      {
        urls: ['*://*.draftkings.com/*'],
        types: ['xmlhttprequest'],
      },
    );
  } catch (error) {
    console.error('Error setting up Pick6 request listener:', error);
  }
}

async function scrapeEtrNfl(url: string) {
  try {
    const tabs = await browser.tabs.query({
      url,
    });

    for (const tab of tabs) {
      if (tab.id) {
        // await browser.tabs.reload(tab.id);

        // Wait a moment for the page to load
        // await new Promise(resolve => setTimeout(resolve, 3000));

        const result = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            console.log('Executing script on ETR NFL...');
            function parseTable(tableElement: HTMLTableElement) {
              console.log('Parsing table...');
              const players = [];

              // Get all rows from tbody
              const rows = tableElement.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr');
              if (!rows) return players;

              for (const row of rows) {
                const cells = row.getElementsByTagName('td');
                if (cells.length < 15) continue; // Skip invalid rows

                // Extract data from cells based on the table structure
                const player = {
                  "Player": cells[0].textContent?.trim() || '',
                  "Position": cells[1].textContent?.trim() || '',
                  "Team": cells[2].textContent?.trim() || '',
                  "Opponent": cells[3].textContent?.trim() || '',
                  "Completions": parseFloat(cells[4].textContent?.trim() || '0'),
                  "Attempts": parseFloat(cells[5].textContent?.trim() || '0'),
                  "Pass Yards": parseFloat(cells[6].textContent?.trim() || '0'),
                  "Pass TDs": parseFloat(cells[7].textContent?.trim() || '0'),
                  "Pass INTs": parseFloat(cells[8].textContent?.trim() || '0'),
                  "Carries": parseFloat(cells[9].textContent?.trim() || '0'),
                  "Rush Yards": parseFloat(cells[10].textContent?.trim() || '0'),
                  "Rush TDs": parseFloat(cells[11].textContent?.trim() || '0'),
                  "Receptions": parseFloat(cells[12].textContent?.trim() || '0'),
                  "Receiving Yards": parseFloat(cells[13].textContent?.trim() || '0'),
                  "Receiving TDs": parseFloat(cells[14].textContent?.trim() || '0')
                };

                players.push(player);
              }

              return players;
            }

            // const lastUpdatedTable = document.querySelector(
            //   'table[aria-label="Last Updated - NFL Projections"]'
            // );
            // if (!lastUpdatedTable) {
            //   return;
            // }

            // TODO: THIS IS BUSTED!!! NEED TO FIX!!
            // const lastUpdated = lastUpdatedTable?.querySelectorAll('td')[1].textContent;
            // const currentData = await backgroundStorage.get();
            // if (lastUpdated === currentData.etrThursdayLastUpdated) {
            //   console.log('ETR Thursday still fresh!');
            //   return;
            // }

            const table = document.querySelector('table[aria-label*="Projections Detail"]');
            console.log({ table });

            if (!table) {
              console.error('No projections table found on page');
              return null;
            }

            const tableData = parseTable(table);
            return [tableData, 'TODO: UPDATE LAST UPDATED LOGIC LATER'];
          },
        });

        console.log({ result });

        if (!result?.[0]?.result) {
          console.error('No table data found on page');
          return;
        }

        const [tableData, lastUpdated] = result[0].result;

        // Store the scraped data
        const currentData = await backgroundStorage.get();
        console.log({ currentData });
        await backgroundStorage.set({
          ...currentData,
          etrLastUpdated: lastUpdated,
          etrProjections: tableData,
        });
      }
    }
  } catch (error) {
    console.error('Error scraping ETR Thursday:', error);
  }
}

async function comparator() {
  console.log('Running comparator...');
  const currentData = await backgroundStorage.get();

  const playerObj = convertPickableMap(pickableIdToPickableMap);

  console.log({ playerObj });

  const partitionedLiveStats = Object.entries(currentData?.liveStats || {}).reduce(
    (acc, [key, value]) => {
      if (value.STATUS === 'Completed') {
        acc.completed[key] = value;
      } else {
        acc.inProgress[key] = value;
      }
      return acc;
    },
    { completed: {}, inProgress: {} },
  );

  const without3PM = Object.values(playerObj)
    .flat()
    .filter(obj => obj.statCategory.abbreviation !== '3PM');

  const merged = without3PM.map(cv => {
    const playerName = cv.displayName;
    const stats = Object.entries(partitionedLiveStats.completed).reduce((closest, [key, value]) => {
      const distance = editDistance(key.toLowerCase(), playerName.toLowerCase());
      // console.log({ distance, key: key.toLowerCase(), pn: playerName.toLowerCase() });
      if (!closest || distance < closest.distance) {
        return { distance, stats: value };
      }
      return closest;
    }, null)?.stats;

    return {
      ...cv,
      stats,
      result: determineResult(cv.targetValue, cv.statCategory.abbreviation, stats),
    };
  });

  console.log({ without3PM });

  // TODO: THIS IS BUSTED!!!!
  const mergedAdjusted = Object.entries(partitionedLiveStats.completed).map(([key, value]) => {
    const match = without3PM.reduce((closest, curr) => {
      const distance = editDistance(key.toLowerCase(), curr.displayName.toLowerCase());
      if (!closest || distance < closest.distance) {
        return { distance, stats: value };
      }
      return closest;
    }, null);
    return {
      ...value,
      ...match,
      // TODO: determine result
    };
  });

  console.log({ mergedAdjusted });

  const partitionedByResult = merged.reduce(
    (acc, curr) => {
      if (curr.result === 'OVER') {
        acc.OVER = [...acc.OVER, curr];
      } else if (curr.result === 'UNDER') {
        acc.UNDER = [...acc.UNDER, curr];
      }
      return acc;
    },
    { OVER: [], UNDER: [] },
  );

  console.log({ pickableIdToPickableMap, currentData, playerObj, partitionedLiveStats, merged, partitionedByResult });
}

// async function getPlayableAmountBySlateAndPickLevel() {
//   console.log('Getting playable amount by slate and pick level...');
//   const currentData = await backgroundStorage.get();
//   console.log({ currentData });
// }

const fetchNBAStats = async url => {
  try {
    // Find an NBA.com tab to execute in
    const tabs = await browser.tabs.query({
      url: '*://*.nba.com/*'
    });

    if (tabs.length === 0) {
      throw new Error('No NBA.com tab found. Please open NBA.com first.');
    }

    // Execute the fetch in the NBA.com tab context
    const result = await browser.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const headers = data['resultSets'][0]['headers'];
        const rowSet = data['resultSets'][0]['rowSet'];
        const jsonData = {};

        for (const teamData of rowSet) {
          const teamName = teamData[1];
          jsonData[teamName] = Object.fromEntries(headers.map((key, index) => [key, teamData[index]]));
        }
        return jsonData;
      },
      args: [url]
    });

    return result[0].result;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

async function openNbaCom() {
  const tabs = await browser.tabs.query({
    url: '*://*.nba.com/*'
  });
  for (const tab of tabs) {
    if (tab.id) {
      await browser.tabs.update(tab.id, { active: true });
    }
  }
}

// Tab needs to be open:
// https://www.nba.com/stats/players/traditional?PerMode=Totals&sort=PTS&dir=-1
async function scraperNBA() {
  // STATUS: MATCHES
  console.log('Scraping NBA stats...');
  const opponentStatsByTeam = await fetchNBAStats(
    `https://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Opponent&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Per100Possessions&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2024-25&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`,
  );
  console.log({ opponentStatsByTeam });

  const playerAdvancedStats = await fetchNBAStats(
    `https://stats.nba.com/stats/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Per100Possessions&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2024-25&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`,
  );
  console.log({ playerAdvancedStats });


  const advancedByTeam = await fetchNBAStats(
    `https://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2024-25&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`,
  );
  console.log({ advancedByTeam });

  const scoringDistribution = await fetchNBAStats(
    `https://stats.nba.com/stats/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Usage&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2024-25&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`,
  );
  console.log({ scoringDistribution });

  const playerTraditionalPer100 = await fetchNBAStats(
    `https://stats.nba.com/stats/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Per100Possessions&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2024-25&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=`
  );
  console.log({ playerTraditionalPer100 });

  const nbaStatsObj = {
    opponentStatsByTeam,
    playerAdvancedStats,
    advancedByTeam,
    scoringDistribution,
    playerTraditional: playerTraditionalPer100,
  }

  const existingStorage = await browser.storage.local.get();
  await browser.storage.local.set({
    ...existingStorage,
    nbaStats: nbaStatsObj
  });
}

async function getLiveStats() {
  scrapeAllCategoriesNBA();
  scrapeAllCategoriesNFL();
  const tabs = await browser.tabs.query({
    url: '*://*.rapidapi.com/*',
  });

  for (const tab of tabs) {
    if (tab.id) {
      const result = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          console.log('Getting live stats...');
          // API configuration
          const API_CONFIG = {
            baseUrl: 'https://tank01-fantasy-stats.p.rapidapi.com',
            headers: {
              'x-rapidapi-key': '323b1d6b8bmsh009cfa91f6a8ef7p169a15jsnfe847dff1e63',
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
            const DATE_OVERRIDE = '20241110';
            const url = `${API_CONFIG.baseUrl}/getNBAScoresOnly?gameDate=${DATE_OVERRIDE || getTodayDate()}&topPerformers=true&lineups=true`;

            try {
              const response = await fetch(url, {
                method: 'GET',
                headers: API_CONFIG.headers,
              });
              const data = await response.json();
              console.log({ data });
              return Object.values(data.body);
            } catch (error) {
              console.error("Error fetching today's games:", error);
              return [];
            }
          }

          // Fetch box score for a specific game
          async function fetchGameBoxScore(gameId) {
            const url = `${API_CONFIG.baseUrl}/getNBABoxScore?gameID=${gameId}&fantasyPoints=true&pts=1&stl=3&blk=3&reb=1.25&ast=1.5&TOV=-1&mins=0&doubleDouble=0&tripleDouble=0&quadDouble=0`;

            try {
              const response = await fetch(url, {
                method: 'GET',
                headers: API_CONFIG.headers,
              });
              const data = await response.json();
              console.log({ data });
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

            console.log({ games });

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
                    STATUS: boxScore.body.gameStatus,
                  };

                  playerStats[player.longName] = stats;
                });
              }
            });

            console.log({ playerStats });

            return playerStats;
          }

          return await gatherPlayerStats();
        },
      });

      console.log({ PlayerStatsResult: result });

      if (result?.[0]?.result) {
        const stats = result[0].result;
        const currentData = await backgroundStorage.get();
        await backgroundStorage.set({
          ...currentData,
          liveStats: stats,
        });
        console.log('Player stats saved:', stats);
      }
    }
  }
}

async function getSportbookAG() {
  const tabs = await browser.tabs.query({
    url: 'file:///C:/chrome-extension-boilerplate-react-vite/chrome-extension/src/HTML/SportsbookAgResponse.html',
  });
  for (const tab of tabs) {
    if (tab.id) {
      const result = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          setInterval(() => {
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
            localStorage.setItem(data, statsObject);
            return statsObject;
          }, 60000);
        },
      });

      console.log(result);
    }
  }
}

async function getFullDFS() {
  const tabs = await browser.tabs.query({
    url: 'file:///C:/chrome-extension-boilerplate-react-vite/chrome-extension/src/HTML/establishTheRunDfsProjections.html',
  });
  for (const tab of tabs) {
    if (tab.id) {
      const result = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const table = document.getElementById('table_1');

          const players = {};

          Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
            const cells = row.querySelectorAll('td');

            const playerName = cells[0].textContent.trim();
            const fdName = cells[1].textContent.trim();
            const team = cells[2].textContent.trim();
            const opponent = cells[3].textContent.trim();
            const minutes = parseFloat(cells[4].textContent);
            const position = cells[5].textContent.trim();
            const salary = parseInt(cells[6].textContent.replace(/,/g, ''));
            const points = parseFloat(cells[7].textContent);
            const value = parseFloat(cells[8].textContent);
            const ceiling = parseFloat(cells[9].textContent);
            const ownership = parseFloat(cells[10].textContent);
            const slate = cells[11].textContent.trim();

            players[playerName] = {
              fdName,
              team,
              opponent,
              minutes,
              position,
              salary,
              points,
              value,
              ceiling,
              ownership,
              slate,
            };
          });

          console.log(players);
          return players;
        },
      });

      console.log(result);
    }
  }
}

async function getFullDetail() {
  console.log("Getting full detail...")
  const tabs = await browser.tabs.query({
    url: [
      'file:///*establishTheRunFullProjectionDetail.html',
      '*://*/*establishTheRunFullProjectionDetail.html'
    ]
  });

  for (const tab of tabs) {
    if (tab.id) {
      const result = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const table = document.getElementById('footable_743261');

          const players = {};

          Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
            const cells = row.querySelectorAll('td');

            const playerName = cells[0].textContent.trim(); // Player name
            // const position = cells[1].textContent.trim();          // Position
            const team = cells[2].textContent.trim(); // Team
            const opp = cells[3].textContent.trim(); // Opponent
            const minutes = parseFloat(cells[4].textContent); // Minutes
            // const points = parseFloat(cells[5].textContent);       // Points
            // const assists = parseFloat(cells[6].textContent);      // Assists
            // const rebounds = parseFloat(cells[7].textContent);     // Rebounds
            // const threePt = parseFloat(cells[8].textContent);      // ThreePt
            // const turnovers = parseFloat(cells[9].textContent);    // Turnovers
            // const steals = parseFloat(cells[10].textContent);      // Steals
            // const blocks = parseFloat(cells[11].textContent);      // Blocks

            players[playerName] = {
              team,
              opp,
              minutes,
            };
          });

          console.log(players);
          return players;
        },
      });

      return result;
    }
  }
}

async function simulateUnabatedNfl() {
  const { etrProjections } = await backgroundStorage.get();

  try {
    // Query for any tabs on unabated.com
    const tabs = await browser.tabs.query({
      url: '*://*.unabated.com/*',
    });

    // If an unabated tab exists, inject and execute the script
    for (const tab of tabs) {
      if (tab.id) {
        const result = await browser.scripting.executeScript({
          args: [etrProjections],
          target: { tabId: tab.id },
          func: async (etrProjections) => {
            const ETR_COPY_PASTE = etrProjections;

            async function callUnabatedApi(player, rbReceivingYardsOverride = false) {
              const baseUrl = 'https://api.unabated.com/api/props/nfl';
              let url;

              switch (player.Position) {
                case 'QB':
                  url = `${baseUrl}/quarterback/passingyards/${player.Completions}/${player['Pass Yards']}/0`;
                  break;
                case 'RB':
                  if (rbReceivingYardsOverride) {
                    url = `${baseUrl}/runningback/receivingyards/${player.Receptions}/${player['Receiving Yards']}/0`;
                  } else {
                    url = `${baseUrl}/runningback/rushingyards/${player.Carries}/${player['Rush Yards']}/0`;
                  }
                  break;
                case 'WR':
                  url = `${baseUrl}/widereceiver/receivingyards/${player.Receptions}/${player['Receiving Yards']}/0`;
                  break;
                case 'TE':
                  url = `${baseUrl}/tightend/receivingyards/${player.Receptions}/${player['Receiving Yards']}/0`;
                  break;
                default:
                  throw new Error(`Invalid position: ${player.Position}`);
              }

              // TODO: There seems to be a problem with how I am formatting the requests

              const response = await fetch(url, {
                headers: {
                  "accept": "application/json, text/plain, */*",
                  "accept-language": "en-US,en;q=0.9",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-site"
                },
                referrer: "https://unabated.com/",
                referrerPolicy: "strict-origin-when-cross-origin",
                method: "GET",
                mode: "cors",
                credentials: "include"
              });

              return await response.json();
            }
            function filterTinyProjections(etrProjection) {
              // Filter out players with tiny projections that would be noise
              if (etrProjection.Position === "QB" && etrProjection.Completions < 10) {
                return false;
              }
              if (etrProjection.Position === "WR" && etrProjection.Receptions < 0.5) {
                return false;
              }
              if (etrProjection.Position === "RB" && etrProjection.Carries < 2) {
                return false;
              }
              return true;
            };

            async function makeUnabatedRequests() {
              const results = [];
              const batchSize = 15;

              for (let i = 0; i < ETR_COPY_PASTE.length; i += batchSize) {
                const batch = ETR_COPY_PASTE.slice(i, i + batchSize);
                console.log(`Processing batch ${i / batchSize + 1}...`);

                const batchPromises = batch.filter(filterTinyProjections).map(async player => {
                  try {
                    console.log(`Calling Unabated API for ${player.Player}...`);
                    const response = await callUnabatedApi(player, false);

                    // TODO: Consider adding back nulls
                    // if (response.status !== 200) {
                    //     console.error(`Non-200 status code (${response.status}) for ${player.Player}`);
                    //     console.error(player);
                    //     return null;
                    // }

                    return {
                      player,
                      unabatedResponse: response
                    };
                  } catch (error) {
                    console.error(`Error processing ${player.Player}:`, error);
                    return null;
                  }
                });

                const batchResults = await Promise.all(batchPromises);
                console.log({ batchResults });
                results.push(batchResults);

                // TODO: THIS RB REC YARDS STUFF ISN'T WORKING

                // Make a second API call for RBs with override = true
                // const rbBatchPromises = batch
                //     .filter(player => player.Position === "RB" && filterTinyProjections(player))
                //     .map(async player => {
                //         try {
                //             console.log(`Making second Unabated API call for RB ${player.Player} with override...`);
                //             const response = await callUnabatedApi(player, true); // Pass override=true
                //             return {
                //                 player,
                //                 unabatedResponse: response
                //             };
                //         } catch (error) {
                //             console.error(`Error processing override call for ${player.Player}:`, error);
                //             return null;
                //         }
                //     });

                // const rbBatchResults = await Promise.all(rbBatchPromises);
                // results.push(rbBatchResults);

                // Add delay between batches
                if (i + batchSize < ETR_COPY_PASTE.length) {
                  await new Promise(resolve => setTimeout(resolve, (Math.random() * 500) + 500));
                }
              }

              console.log('All API calls completed');
              console.log(results);

              return results;
            }

            return makeUnabatedRequests();
          },
        });

        function parseRemixContext() {
          const mapPlayerObj = (playerObj) => {
            const playerEntity = playerObj.pickable.pickableEntities[0];
            const competition = playerEntity.pickableCompetitions[0];
            const teamAbbreviation = competition.team.abbreviation;
            const competitionSummary = competition.competitionSummary;
            const market = playerObj.pickable.marketCategory.marketAbbreviation;
            const position = playerObj.pickable.pickableEntities[0].pickableCompetitions[0].positionName;
            const moreDraftableId = playerObj.activeMarket.pickableMarketSelections[0].pickableMarketSelectionId;
            const lessDraftableId = playerObj.activeMarket.pickableMarketSelections[1].pickableMarketSelectionId;;
            const opponentAbbreviation =
              competitionSummary.homeTeam.abbreviation === teamAbbreviation
                ? competitionSummary.awayTeam.abbreviation
                : competitionSummary.homeTeam.abbreviation;


            return {
              displayName: playerEntity.displayName,
              targetValue: playerObj.activeMarket.targetValue,
              team: teamAbbreviation,
              opponent: opponentAbbreviation,
              statCategory: { abbreviation: market, name: playerObj.pickable.marketCategory.marketName },
              position,
              moreDraftableId,
              lessDraftableId,
            }
          };

          // window.__remixContextNewVersion.state.loaderData['routes/_index'].pickableIdToPickableMap
          const playerObjects = Object.entries(pickableIdToPickableMap).reduce((acc, [key, value]) => {
            if (!value.activeMarket.isPaused) {
              acc[key] = mapPlayerObj(value);
            } else {
              // do nothing; can't pick paused players
            }
            return acc;
          }, {});

          const playerObjectsArray = Object.values(playerObjects);
          return playerObjectsArray;
        }

        function editDistance(str1, str2) {
          const len1 = str1.length;
          const len2 = str2.length;

          // Create a 2D array to store the distances
          const distances = [];
          for (let i = 0; i <= len1; i++) {
            distances[i] = [i];
          }
          for (let j = 0; j <= len2; j++) {
            distances[0][j] = j;
          }

          // Compute distances
          for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
              const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
              distances[i][j] = Math.min(distances[i - 1][j] + 1, // deletion
                distances[i][j - 1] + 1, // insertion
                distances[i - 1][j - 1] + cost // substitution
              );
            }
          }

          // Return the final distance
          return distances[len1][len2];
        }

        function getDkName(otherName) {
          const editDistances = window.DK_PLAYERS.map(n => [editDistance(otherName, n), n]);
          const sortedEditDistances = editDistances.sort((a, b) => (a[0] - b[0]));
          return sortedEditDistances[0][1];
        }

        function getEtrName(otherName) {
          const editDistances = window.ETR_PLAYERS.map(n => [editDistance(otherName, n), n]);
          const sortedEditDistances = editDistances.sort((a, b) => (a[0] - b[0]));
          return sortedEditDistances[0][1];
        }

        function mergePickableLinesWithUnabatedData(pickableLines, unabatedResponses) {
          window.playerObj = pickableLines.reduce((acc, cv) => {
            if (cv.displayName in acc) {
              acc[cv.displayName].push(cv);
            } else {
              acc[cv.displayName] = [cv];
            }
            return acc;
          }, {});

          window.DK_PLAYERS = Object.keys(window.playerObj);
          window.ETR_RAW = ETR_COPY_PASTE.reduce((acc, cv) => ({
            [cv.Player]: cv,
            ...acc
          }), {});
          window.ETR_PLAYERS = Object.keys(window.ETR_RAW);
          window.etrByPlayer = window.DK_PLAYERS.reduce((acc, cv) => {
            const etrName = getEtrName(cv);
            acc[cv] = window.ETR_RAW[etrName];
            return acc;
          }, {});
          window.dkToEtrNameMap = window.DK_PLAYERS.reduce((acc, cv) => {
            acc[cv] = getEtrName(cv);
            return acc;
          }, {});

          const analyzedPicks = pickableLines.map(line => {
            const { targetValue, displayName, moreDraftableId, lessDraftableId, statCategory } = line;

            const etrData = window.etrByPlayer?.[window.dkToEtrNameMap?.[displayName] ?? ''] ?? {};

            const baseObj = {
              targetValue, displayName, moreDraftableId, lessDraftableId, stat: statCategory.name, overProbability: 0.5, ...etrData
            }
            if (!unabatedResponses[statCategory.name]) {
              console.log(`${statCategory.name} not currently supported by unabated...`);
              return baseObj
            }

            const etrName = window.dkToEtrNameMap[displayName];
            const unabatedProbabilities = unabatedResponses[statCategory.name][etrName];
            if (!unabatedProbabilities) {
              console.log(`Invalid player/stat combination: ${displayName} and ${statCategory.name}`);
              return baseObj;
            }

            if (!unabatedProbabilities[targetValue]) {
              console.log(`No matching value for ${displayName} ${statCategory.name} ${targetValue}`);
              console.log({ line });
              return baseObj;
            }

            return {
              targetValue,
              moreDraftableId,
              lessDraftableId,
              displayName,
              stat: statCategory.name,
              overProbability: unabatedProbabilities[targetValue],
              ...etrData,
            }
          }).filter(v => v !== null);

          console.log({ analyzedPicks });

          debugger;
        }

        const CATEGORY_MAP = {
          'Passing Yards': {},
          'Completions': {},
          // 'Attempts': {}, not currently supported by unabated
          'Rushing Yards': {},
          'Receiving Yards': {},
          'Receptions': {},
        };

        function parseCountProbabilities(countsObject, key) {
          if (!countsObject) {
            // 12/21/24 NOTE: THIS COULD BE CAUSING AN ISSUE IF COUNTS OBJECT IS BLANK
            return {};
          }
          return countsObject.reduce((acc, obj) => {
            const total = obj[key];
            if (total && total.toString().endsWith('.5')) {
              acc[total] = obj.probabilityOver;
            }
            return acc;
          }, {});
        }

        function parseUnabatedResponses(unabatedReponses) {
          const flattenedResponses = unabatedReponses.flat().filter(v => v !== null)
          return flattenedResponses.reduce((acc, { player, unabatedResponse }) => {
            console.log({ player, unabatedResponse });
            const position = player.Position;
            switch (position) {
              case 'QB':
                acc['Passing Yards'][player.Player] = parseCountProbabilities(unabatedResponse.yardsProbabilities, 'totalYards');
                acc['Completions'][player.Player] = parseCountProbabilities(unabatedResponse.countProbabilities, 'total');
                break;
              case 'RB':
                acc['Rushing Yards'][player.Player] = parseCountProbabilities(unabatedResponse.yardsProbabilities, 'totalYards');;
                // TODO: NEED TO ADD RECEIVING YARDS TO SCRIPT
                // acc['Receiving Yards'][player.Player] = unabatedResponse;
                // acc['Receptions'][player.Player] = unabatedResponse;
                break;
              case 'WR':
              case 'TE':
                acc['Receiving Yards'][player.Player] = parseCountProbabilities(unabatedResponse.yardsProbabilities, 'totalYards');
                acc['Receptions'][player.Player] = parseCountProbabilities(unabatedResponse.countProbabilities, 'total');
                break;
            }
            return acc;
          }, CATEGORY_MAP);
        }

        const unabatedResponses = result[0].result;
        const unabatedByPlayer = parseUnabatedResponses(unabatedResponses);
        console.log({ unabatedByPlayer });

        // TODO: THIS IS IN GOOD SHAPE; NEED TO ADD BACK IN THE PICKABLE LINES

        // const pickableLines = parseRemixContext();
        // const merged = mergePickableLinesWithUnabatedData(pickableLines, unabatedByPlayer);
      }
    }
  } catch (error) {
    console.error('Error simulating Unabated NFL:', error);
  }
}

async function simulateUnabatedNba() {
  try {
    // Query for any tabs on unabated.com
    const tabs = await browser.tabs.query({
      url: '*://*.unabated.com/*',
    });

    // If an unabated tab exists, inject and execute the script
    for (const tab of tabs) {
      if (tab.id) {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            // TODO: NEED TO REPOINT AT THE RESPONSES TO API CALLS ON PICK
            // TODO: NEED TO CONSIDER REWORKING UNABATED SIM LOGIC; STORE THE RESPONSES

            console.log('Simulating in unabated context...');

            console.log('getting etr data...');
            const ETR_DATA = await browser.runtime.sendMessage({ type: 'GET_BACKGROUND_STORAGE' });

            console.log({ ETR_DATA });

            // TODO: Can I get rid of this? I think it is working but is definitely funky
            const ETR = ETR_DATA.map(obj => ({ ...obj, '3-Pointers Made': obj.ThreePt }));

            const fetchData = async (points, rebounds, assists, blocks, steals, turnovers, threePt, player) => {
              // Note: can't send 0's
              const url = `https://api.unabated.com/api/props/3/all/${player}?points=${points}&rebounds=${rebounds}&assists=${assists}&blocks=${blocks}&steals=${steals}&turnovers=${turnovers}&threePointersMade=${threePt || 0.01}`;

              const response = await fetch(url, {
                headers: {
                  accept: 'application/json, text/plain, */*',
                  'accept-language': 'en-US,en;q=0.9,la;q=0.8',
                  'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                  'sec-ch-ua-mobile': '?0',
                  'sec-ch-ua-platform': '"macOS"',
                  'sec-fetch-dest': 'empty',
                  'sec-fetch-mode': 'cors',
                  'sec-fetch-site': 'same-site',
                  'x-amz-cf-v-id': 'dNSob7rQOiJFE_59NDSm7tuZ6ed5MA_8w8CHVqr8tGSFYpgzEUqBuQ==',
                },
                referrer: 'https://unabated.com/',
                referrerPolicy: 'strict-origin-when-cross-origin',
                body: null,
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
              });
              const data = await response.json();
              return data;
            };

            async function f() {
              const playerObjects = Object.entries(
                window.__remixContextNewVersion.state.loaderData['routes/_index'].pickableIdToPickableMap,
              ).reduce((acc, [key, value]) => {
                if (!value.activeMarket.isPaused) {
                  acc[key] = mapPlayerObj(value);
                } else {
                  // do nothing; can't pick paused players
                }
                return acc;
              }, {});

              const playerObjectsArray = Object.values(playerObjects);

              window.playerObj = playerObjectsArray.reduce((acc, cv) => {
                if (cv.displayName in acc) {
                  acc[cv.displayName].push(cv);
                } else {
                  acc[cv.displayName] = [cv];
                }
                return acc;
              }, {});

              window.DK_PLAYERS = Object.keys(playerObj);
              window.ETR_RAW = ETR.reduce(
                (acc, cv) => ({
                  [cv.Player]: cv,
                  ...acc,
                }),
                {},
              );
              window.ETR_PLAYERS = Object.keys(ETR_RAW);
              window.etrByPlayer = DK_PLAYERS.reduce((acc, cv) => {
                const etrName = getEtrName(cv);
                acc[cv] = ETR_RAW[etrName];
                return acc;
              }, {});

              // NOTE: THIS IS READY TO COMPARE TO ETR, DK
              console.log({
                playerObj,
                etrByPlayer,
              });

              window.merged = {};
              const players = Object.keys(playerObj);
              const batchSize = 30;

              for (let i = 0; i < players.length; i += batchSize) {
                const batch = players.slice(i, i + batchSize);

                await Promise.all(
                  batch.map(async cv => {
                    try {
                      console.log(`Processing player: ${cv}`);
                      const dkLines = playerObj[cv];
                      const etrProjections = etrByPlayer[cv];

                      if (!etrProjections) {
                        console.warn(`No ETR projections found for player: ${cv}`);
                        return;
                      }

                      console.log(`ETR projections for ${cv}:`, etrProjections);

                      const position = POSITION_TO_UNABATED_POSITION_MAP[etrProjections['Position']];
                      if (!position) {
                        console.warn(`No position mapping found for: ${etrProjections['Position']}`);
                        return;
                      }

                      console.log(`Attempting to fetch data for ${cv}`);
                      const unabatedRaw = await fetchData(
                        etrProjections['Points'],
                        etrProjections['Rebounds'],
                        etrProjections['Assists'],
                        etrProjections['Blocks'],
                        etrProjections['Steals'],
                        etrProjections['Turnovers'],
                        etrProjections['3-Pointers Made'],
                        position,
                      );
                      console.log(`Received data for ${cv}:`, unabatedRaw);

                      const unabatedResponse = Object.keys(unabatedRaw).reduce((acc, cv) => {
                        if (unabatedRaw[cv] !== null) {
                          acc[cv] = Object.values(unabatedRaw[cv]['simulationDetails']).reduce((acc, cv) => {
                            acc[cv.total] = cv;
                            return acc;
                          }, {});
                        }
                        return acc;
                      }, {});
                      window.merged[cv] = {
                        dkLines,
                        etrProjections,
                        unabatedResponse,
                        unabatedRaw,
                      };
                    } catch (error) {
                      console.error(`Error processing player ${cv}:`, error);
                    }
                  }),
                );

                // Pause between batches
                if (i + batchSize < players.length) {
                  const jitter = Math.random() * 1000; // Random jitter between 0-1000ms
                  await sleep(3000 + jitter);
                }
              }

              console.log({ wm: window.merged });

              const STAT_TO_UNABATED_NAME_MAP = {
                Points: 'points',
                Assists: 'assists',
                Rebounds: 'rebounds',
                Blocks: 'blocks',
                Steals: 'steals',
                '3-Pointers Made': 'threePointersMade',
                'Points + Assists + Rebounds': 'pointsReboundsAssists',
                'Points + Assists': 'pointsAssists',
                'Points + Rebounds': 'pointsRebounds',
                'Assists + Rebounds': 'reboundsAssists',
                Turnovers: 'turnovers',
              };

              Object.keys(merged).forEach(player => {
                merged[player]['dkLines'].forEach(statObj => {
                  const stat = statObj.statCategory.name;
                  const { moreDraftableId, lessDraftableId, targetValue: dkLine } = statObj;
                  merged[player]['dkLines'][stat] = {
                    dkLine,
                    moreDraftableId,
                    lessDraftableId,
                  };
                  try {
                    const unabatedSimForStat = merged[player]['unabatedResponse'][STAT_TO_UNABATED_NAME_MAP[stat]];
                    if (unabatedSimForStat) {
                      ['probabilityOver', 'probabilityUnder'].forEach(overUnder => {
                        merged[player]['dkLines'][stat][overUnder] = unabatedSimForStat[dkLine][overUnder];
                      });
                    }
                  } catch (error) {
                    console.log(error);
                  }
                });
              });

              const FUNCTION_BY_STAT_TYPE_MAP = {
                'Fantasy Points': etrProjections => {
                  // TODO: Consider adding DDBL + TDBL bonuses --> could use unabated response
                  return (
                    etrProjections['Points'] * 1 +
                    etrProjections['Rebounds'] * 1.25 +
                    etrProjections['Assists'] * 1.5 +
                    etrProjections['Steals'] * 2 +
                    etrProjections['Blocks'] * 2 +
                    etrProjections['3-Pointers Made'] * 0.5 +
                    etrProjections['Turnovers'] * -0.5
                  );
                },
                'Points + Assists + Rebounds': etrProjections => {
                  return etrProjections['Points'] + etrProjections['Rebounds'] + etrProjections['Assists'];
                },
                'Points + Assists': etrProjections => {
                  return etrProjections['Points'] + etrProjections['Assists'];
                },
                'Points + Rebounds': etrProjections => {
                  return etrProjections['Points'] + etrProjections['Rebounds'];
                },
                'Assists + Rebounds': etrProjections => {
                  return etrProjections['Rebounds'] + etrProjections['Assists'];
                },
              };

              window.analyzedPicks = Object.keys(merged).reduce((acc, cv) => {
                const { dkLines, etrProjections } = merged[cv];
                const dkLinesPostedForPlayer = Object.keys(dkLines).reduce((acc, statCategory) => {
                  try {
                    if (statCategory === 'position' || !isNaN(parseInt(statCategory))) {
                      // continue
                      return acc;
                    }

                    // TODO: Add logic here statCategory === 'Blocks' || statCategory === 'Steals'
                    if (
                      statCategory === 'Fantasy Points' ||
                      statCategory === 'Steals + Blocks' ||
                      statCategory === 'Double Double'
                    ) {
                      console.log(`${statCategory} not yet supported`);
                      return acc;
                    }

                    console.log({
                      cv,
                      statCategory,
                      value: dkLines[statCategory],
                    });
                    let etrLine;
                    const { dkLine, probabilityOver, probabilityUnder, moreDraftableId, lessDraftableId } =
                      dkLines[statCategory];
                    if (statCategory in FUNCTION_BY_STAT_TYPE_MAP) {
                      etrLine = FUNCTION_BY_STAT_TYPE_MAP[statCategory](etrProjections);
                    } else {
                      etrLine = etrProjections[statCategory];
                    }

                    const maxProb =
                      probabilityOver && probabilityUnder ? Math.max(probabilityOver, probabilityUnder) : undefined;
                    acc.push({
                      player: cv,
                      statCategory,
                      dkLine,
                      probabilityOver: probabilityOver.toFixed(3),
                      probabilityUnder: probabilityUnder.toFixed(3),
                      moreDraftableId,
                      lessDraftableId,
                      summaryMore: `${moreDraftableId}: ${cv} / OVER ${dkLine} ${statCategory} / ${(probabilityOver * 100).toFixed(1)}%`,
                      summaryLess: `${lessDraftableId}: ${cv} / UNDER ${dkLine} ${statCategory} / ${(probabilityUnder * 100).toFixed(1)}%`,
                      maxProb,
                      etrLine,
                      diff: etrLine - dkLine,
                      percentageDiff: (etrLine - dkLine) / dkLine,
                      // etr stuff
                      etrPoints: etrProjections['Points'],
                      etrAssists: etrProjections['Assists'],
                      etrRebounds: etrProjections['Rebounds'],
                      etrThreePtMade: etrProjections['3-Pointers Made'],
                      etrTurnovers: etrProjections['Turnovers'],
                      etrSteals: etrProjections['Steals'],
                      etrBlocks: etrProjections['Blocks'],
                      etrMinutes: etrProjections['Minutes'],
                      etrPosition: etrProjections['Position'],
                      etrTeam: etrProjections['Team'],
                      etrOpponent: etrProjections['Opponent'],
                    });
                  } catch (error) {
                    console.log({ error });
                  }

                  return acc;
                }, []);
                return [...dkLinesPostedForPlayer, ...acc];
              }, []);

              console.log({
                analyzedPicks,
              });
            }

            f();
          },
        });
      }
    }
  } catch (error) {
    console.error('Error executing script on unabated:', error);
  }
}

async function scrapeEtrNba() {
  try {
    const tabs = await browser.tabs.query({
      url: 'https://establishtherun.com/draftkings-nba-projections/',
    });

    for (const tab of tabs) {
      if (tab.id) {
        // await browser.tabs.reload(tab.id);

        // Wait a moment for the page to load
        // await new Promise(resolve => setTimeout(resolve, 3000));

        const result = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            console.log('Executing script on ETR NBA...');

            const table = document.querySelector('table.dataTable');
            console.log({ table });

            if (!table) {
              console.error('No projections table found on page');
              return null;
            }

            function parseTable(tableElement) {
              console.log('Parsing table...');
              const players = [];

              // Get all rows from tbody
              const rows = tableElement.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr');
              if (!rows) return players;

              for (const row of rows) {
                const cells = row.getElementsByTagName('td');
                if (cells.length < 3) continue; // Skip invalid rows

                // Extract data from cells based on the table structure
                const player = {
                  "Player": cells[0].textContent?.trim() || '',
                  "Team": cells[1].textContent?.trim() || '',
                  "Opponent": cells[2].textContent?.trim() || '',
                  "Minutes": parseFloat(cells[3].textContent?.trim() || '0'),
                  "Position": cells[4].textContent?.trim() || '',
                };

                players.push(player);
              }

              return players;
            }

            const players = parseTable(table);
            console.log({ players });
            return players;
          },
        })

        console.log({ result });
      }
    }
  } catch (error) {
    console.error('Error executing script on ETR NBA:', error);
  }
}

//void updateBackgroundStorage();

// void updateEtrProjections();

void registerPick6Listener();

// void simulateOnUnabated();

// void getLiveStats();

// void scraperNBA();

// void comparator();

// void getFullDetail();

// void getFullDFS();

// void getSportbookAG();

// const intervalId = setInterval(() => {
//   void updateBackgroundStorage();
// }, 1000 * 20);

// const etrIntervalId = setInterval(() => {
//   void updateEtrProjections();
// }, 1000 * 60);

const dkIntervalId = setInterval(refreshPick6Slates, 1000 * 60);

// const unabatedIntervalId = setInterval(() => {
//   void simulateOnUnabated();
// }, 1000 * 60);

// const liveStatsIntervalId = setInterval(
//   () => {
//     void getLiveStats();
//     // TODO: REDUCE THIS
//   },
//   1000 * 60 * 60,
// );

void backgroundStorage.set({
  unabatedNflSimulationResults: mockUnabatedNflResult
});


browser.runtime.onSuspend?.addListener(() => {
  // clearInterval(intervalId);
  clearInterval(dkIntervalId);
  // clearInterval(liveStatsIntervalId);
  // clearInterval(etrIntervalId);
  // clearInterval(unabatedIntervalId);
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'GET_BACKGROUND_STORAGE') {
    // Make sure we have a valid sender tab ID
    if (!sender.tab?.id) {
      console.error('No sender tab ID found');
      return;
    }

    // Get storage data and send message back to tab
    backgroundStorage.get()
      .then(storage => {
        console.log('Sending storage data:', storage);
        browser.tabs.sendMessage(sender.tab.id, {
          type: 'BACKGROUND_STORAGE_RESPONSE',
          success: true,
          data: storage
        });
      })
      .catch(error => {
        console.error('Error getting storage:', error);
        browser.tabs.sendMessage(sender.tab.id, {
          type: 'BACKGROUND_STORAGE_RESPONSE',
          success: false,
          error: error.message
        });
      });
  }
});

browser.runtime.onMessage.addListener(async (message: { type: string; url?: string }) => {
  console.log({ messageType: message.type });
  switch (message.type) {
    case 'RUN_COMPARATOR':
      void comparator();
      break;

    case 'GET_LIVE_STATS':
      void getLiveStats();
      break;

    case 'GET_FULL_DETAIL':
      // eslint-disable-next-line no-case-declarations
      const minutesProjections = await getFullDetail();
      // eslint-disable-next-line no-case-declarations
      const currentData = await backgroundStorage.get();
      await backgroundStorage.set({
        ...currentData,
        minutesProjections
      });
      console.log({ minutesProjections });
      break;

    case 'GET_FULL_DFS':
      void getFullDFS();
      break;

    case 'GET_SPORTSBOOKAG':
      void getSportbookAG();
      break;

    case 'SCRAPER_NBA_COM':
      console.log("Running nba scraper");
      void scraperNBA();
      break;

    case 'SCRAPE_ETR_NBA':
      console.log("Scraping ETR NBA...");
      void scrapeEtrNba();
      break;

    case 'OPEN_TAB':
      if (message.url) {
        await browser.tabs.create({
          url: message.url,
          active: false
        });
      }
      break;
    case 'SCRAPE_ETR_THURSDAY':
      console.log("Scraping ETR Thursday projections...");
      void scrapeEtrNfl('*://*.establishtherun.com/*ravens-at-texans*');
      break;

    case 'SCRAPE_ETR_SUNDAY':
      console.log("Scraping ETR Sunday projections...");
      void scrapeEtrNfl('*://*.establishtherun.com/*full-projections-detail*');
      break;

    case 'SCRAPE_ETR_MONDAY':
      console.log("Scraping ETR Monday projections...");
      void scrapeETRMonday();
      break;

    case 'SIMULATE_UNABATED_NFL':
      void simulateUnabatedNfl();
      break;
  }
});




// TODO: ADD BUTTONS TO SITE
// 1. Open NBA.com
// 2. Scrape NBA.com
// 3. Open ETR
// 4. Scrape ETR

// TODO: CONTINUE WITH THE SCRAPING OF NBA.COM
// TODO: NEED TO PULL IN OVER/UNDER FROM SOMEWHERE
// --> MAYBE NBA.COM

console.log('background loaded');
