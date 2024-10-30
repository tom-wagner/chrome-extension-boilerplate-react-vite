// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable @typescript-eslint/ban-ts-comment */
import browser from 'webextension-polyfill';
import { backgroundStorage } from '@extension/storage';

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
  console.log('updating etr projections!!');
  try {
    // Get the first tab in the first window
    // Query for any tab in the window, regardless of focus state
    const tabs = await browser.tabs.query({});

    if (tabs.length === 0) {
      return;
    }

    // @ts-expect-error
    const etrTabId = tabs.find(tab => tab.url?.includes('establishtherun'))?.id;
    console.log('ETR tab ID! ', etrTabId);

    await browser.tabs.reload(etrTabId);
    console.log('reloading ETR page');

    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await browser.scripting.executeScript({
      target: { tabId: etrTabId },
      func: () => {
        // return;

        console.log('parsing ETR...');

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
          console.log('parsing table');
          const players: PlayerData[] = [];

          // Get all rows from tbody
          const rows = tableElement.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr');
          if (!rows) return players;

          // @ts-expect-error
          for (const row of rows) {
            const cells = row.getElementsByTagName('td');
            if (cells.length !== 9) continue; // Skip invalid rows

            // Extract data from cells
            const player: PlayerData = {
              name: cells[0].textContent?.trim() || '',
              team: cells[1].textContent?.trim() || '',
              position: cells[2].textContent?.trim() || '',
              opponent: cells[3].textContent?.trim() || '',
              salary: parseInt(cells[4].textContent?.trim() || '0'),
              fdPoints: parseFloat(cells[5].textContent?.trim() || '0'),
              fdValue: parseFloat(cells[6].textContent?.trim() || '0'),
              fdOwnership: parseFloat(cells[7].textContent?.trim().replace('%', '') || '0'),
              slate: cells[8].textContent?.trim() || '',
            };

            players.push(player);
          }

          return players;
        }

        const table = document.querySelectorAll('table')[1];
        console.log('Table! ', table);
        if (!table) {
          console.error('No table found on page');
          return null;
        }

        const tableData = parseTable(table);
        console.log({ tableData });

        const data = [];
        const rows = table.querySelectorAll('tr');

        // @ts-expect-error
        for (const row of rows) {
          const rowData = [];
          const cells = row.querySelectorAll('td, th');
          for (const cell of cells) {
            rowData.push(cell.textContent.trim());
          }
          data.push(rowData);
        }

        return data;
      },
    });

    if (!result?.[0]?.result) {
      console.error('No table found on page');
      return;
    }

    const tableData = result[0].result;

    // Store the scraped data
    const currentData = await backgroundStorage.get();
    await backgroundStorage.set({
      ...currentData,
      etrProjections: tableData,
    });
  } catch (error) {
    console.error('Error scraping table:', error);
  }
}

// TODO: WIRE THIS UP TO SCRAPE THE PICK6 SLATES ON AN INTERVAL
async function scrapePick6Slates() {
  console.log('Adding Pick6 request listener...');
  const alreadyProcessed = new Set<string>();

  try {
    // Set up web request listener for DraftKings Pick6 requests
    browser.webRequest.onCompleted.addListener(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (details: any) => {
        if (details.url.includes('pick6.draftkings.com') && details.url.includes('_data=routes')) {
          try {
            if (!alreadyProcessed.has(details.url)) {
              // Fetch the response data
              const response = await fetch(details.url);
              const data = await response.json();
              alreadyProcessed.add(details.url);
              console.log('Pick6 response data:', data);

              // Store the Pick6 slate data in storage
              const currentData = await backgroundStorage.get();
              const pickSixSlates = {
                ...(currentData.pickSixSlates || {}),
                [data.pickGroupId]: data,
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

async function getPlayableAmountBySlateAndPickLevel() {}

async function simulateOnUnabated() {
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

void updateBackgroundStorage();

// void updateEtrProjections();

void scrapePick6Slates();

void simulateOnUnabated();

const intervalId = setInterval(() => {
  void updateBackgroundStorage();
}, 1000 * 20);

// const etrIntervalId = setInterval(() => {
//   void updateEtrProjections();
// }, 1000 * 60);

const dkIntervalId = setInterval(() => {
  console.log('TODO: NEED TO ADD PICK6 SCRAPING HERE');

  // OR CONSIDER ADDING A BUTTON TO SCRAPE ALL IDENTIFIED SLATES, SIMULATE TO UNABATED, THEN PLACE ENTRIES

  // TODO: CONSIDER PLACING ENTRIES IN DIFFERENT WAVES TO AVOID STALE LINES...
}, 1000 * 30);

const unabatedIntervalId = setInterval(() => {
  void simulateOnUnabated();
}, 1000 * 60);

browser.runtime.onSuspend?.addListener(() => {
  clearInterval(intervalId);
  //clearInterval(etrIntervalId);
  clearInterval(dkIntervalId);
  clearInterval(unabatedIntervalId);
});

browser.runtime.onMessage.addListener(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  async (message: { type: string }, sender: { tab?: { id: number } }): Promise<any> => {
    try {
      if (message.type === 'GET_BACKGROUND_STORAGE') {
        return await backgroundStorage.get();
      }
      return undefined;
    } catch (error) {
      console.error('Error handling message:', error);
      throw error;
    }
  },
);

console.log('background loaded');
