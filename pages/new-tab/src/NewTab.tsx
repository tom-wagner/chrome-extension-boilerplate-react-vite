/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, createContext, useContext, useEffect } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { backgroundStorage, exampleThemeStorage } from '@extension/storage';

// Define types
type Game = { teams: string };
type PotentialSlips = { O: any[]; U: any[] };
type Config = {
  maxExposure: number;
  overSlips: number;
  underSlips: number;
  amount: number;
  potentialSlips: PotentialSlips;
};
type SlateConfig = {
  singleGame: { [key: number]: Config };
  mixIn: { [key: number]: Config };
};
type Slate = {
  draftGroupId: number;
  maxAmountBySlipSize: { [key: number]: number };
  games: Game[];
  config: SlateConfig;
};

// Add new type and component after existing types
type ToolType = 'PICK6' | 'NBA' | 'NFL';

// Mock data
const SLATES: Slate[] = [
  {
    draftGroupId: 12345,
    maxAmountBySlipSize: { 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    games: [{ teams: 'DET/MIN' }, { teams: 'LAL/NYK' }, { teams: 'FULL_SLATE' }],
    config: {
      singleGame: {
        4: { maxExposure: 0.35, overSlips: 10, underSlips: 30, amount: 5, potentialSlips: { O: [], U: [] } },
        5: { maxExposure: 0.35, overSlips: 10, underSlips: 30, amount: 5, potentialSlips: { O: [], U: [] } },
        6: { maxExposure: 0.35, overSlips: 10, underSlips: 30, amount: 5, potentialSlips: { O: [], U: [] } },
      },
      mixIn: {
        3: { maxExposure: 0.35, overSlips: 10, underSlips: 30, amount: 5, potentialSlips: { O: [], U: [] } },
        4: { maxExposure: 0.35, overSlips: 10, underSlips: 30, amount: 5, potentialSlips: { O: [], U: [] } },
        5: { maxExposure: 0.35, overSlips: 10, underSlips: 30, amount: 5, potentialSlips: { O: [], U: [] } },
      },
    },
  },
  {
    draftGroupId: 67890,
    maxAmountBySlipSize: { 2: 150, 3: 150, 4: 150, 5: 150, 6: 150 },
    games: [{ teams: 'BOS/MIA' }, { teams: 'GSW/PHX' }, { teams: 'FULL_SLATE' }],
    config: {
      singleGame: {
        4: { maxExposure: 0.4, overSlips: 15, underSlips: 35, amount: 7, potentialSlips: { O: [], U: [] } },
        5: { maxExposure: 0.4, overSlips: 15, underSlips: 35, amount: 7, potentialSlips: { O: [], U: [] } },
        6: { maxExposure: 0.4, overSlips: 15, underSlips: 35, amount: 7, potentialSlips: { O: [], U: [] } },
      },
      mixIn: {
        3: { maxExposure: 0.4, overSlips: 15, underSlips: 35, amount: 7, potentialSlips: { O: [], U: [] } },
        4: { maxExposure: 0.4, overSlips: 15, underSlips: 35, amount: 7, potentialSlips: { O: [], U: [] } },
        5: { maxExposure: 0.4, overSlips: 15, underSlips: 35, amount: 7, potentialSlips: { O: [], U: [] } },
      },
    },
  },
];

const STACK_BUILDER_COLUMNS = [
  'Stack 1',
  'Stack 2',
  'Stack 3',
  'Stack 4',
  'Stack 5',
];

const STAT_HEADERS = [
  "displayName",
  "stat",
  "targetValue",
  // "moreDraftableId",
  // "lessDraftableId",
  "overProbability",
  // "Player",
  "Position",
  "Team",
  "Opponent",
  "Completions",
  "Attempts",
  "Pass Yards",
  "Pass TDs",
  "Pass INTs",
  "Carries",
  "Rush Yards",
  "Rush TDs",
  "Receptions",
  "Receiving Yards",
  "Receiving TDs"
];

const HEADERS = [...STACK_BUILDER_COLUMNS, ...STAT_HEADERS];

const NbaTools: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">NBA Tools</h1>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => {
            void chrome.runtime.sendMessage({
              type: 'OPEN_TAB',
              url: 'https://www.nba.com/stats/players/traditional'
            });
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Open NBA.com
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({
              type: 'OPEN_TAB',
              url: 'https://establishtherun.com/draftkings-nba-projections/',
            });
          }}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Open ETR
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({ type: 'SCRAPER_NBA_COM' });
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Scrape NBA.com
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({ type: 'SCRAPE_ETR' });
          }}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Scrape ETR
        </button>
      </div>
    </div>
  );
};

const NflTools: React.FC = () => {
  const [simulationResults, setUnabatedNflSimulationResults] = useState<any[]>([]);
  const [stackSizes, setStackSizes] = useState<{ [key: string]: string }>({});
  const [stackConfigurations, setStackConfigurations] = useState<Set<string>>(new Set());
  const { unabatedNflSimulationResults } = useStorage(backgroundStorage);
  const simToUse = simulationResults.length > 0 ? simulationResults : unabatedNflSimulationResults;

  // console.log({ simToUse, stackSizes, stackConfigurations });
  console.log(stackConfigurations);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">NFL Tools</h1>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => {
            window.open('https://unabated.com/dashboard', '_blank');
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Open Unabated
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({
              type: 'OPEN_TAB',
              url: 'https://establishtherun.com/thursday-night-football-projections-detail/',
            });
          }}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Open ETR Thursday
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({
              type: 'OPEN_TAB',
              url: 'https://establishtherun.com/in-season-package/full-projections-detail/',
            });
          }}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Open ETR Sunday
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({
              type: 'OPEN_TAB',
              url: 'https://establishtherun.com/monday-night-football-projections-detail/',
            });
          }}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Open ETR Monday
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({ type: 'SCRAPE_ETR_THURSDAY' });
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Scrape ETR Thursday
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({ type: 'SCRAPE_ETR_SUNDAY' });
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Scrape ETR Sunday
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({ type: 'SCRAPE_ETR_MONDAY' });
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Scrape ETR Monday
        </button>

        <button
          onClick={() => {
            void chrome.runtime.sendMessage({ type: 'SIMULATE_UNABATED_NFL' });
          }}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Simulate Unabated NFL
        </button>

        {/* Unabated NFL Simulation Results Table */}
        {simulationResults.length === 0 ? '🚨🚨🚨🚨 NO SIM RESULTS; USING MOCK DATA 🚨🚨🚨🚨' : 'Sim loaded...'}

        TODO: CONTINUE BY FOCUSING ON FEEDING ETR PROJECTIONS TO UNABATED, THEN STORING IN BACKGROUND STORAGE

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Unabated NFL Simulation Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  {HEADERS.map((header) => (
                    <th
                      key={header}
                      className={`border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-200`}
                      onClick={() => {
                        const sortedResults = [...simToUse].sort((a, b) => {
                          if (a[header] === b[header]) return 0;
                          if (typeof a[header] === 'number') {
                            return a[header] > b[header] ? 1 : -1;
                          }
                          return String(a[header]).localeCompare(String(b[header]));
                        });
                        setUnabatedNflSimulationResults(
                          JSON.stringify(sortedResults) === JSON.stringify(simToUse)
                            ? sortedResults.reverse()
                            : sortedResults
                        );
                      }}
                    >
                      {header.startsWith('Stack') ? (
                        <div>
                          {header}
                          <select
                            className="block w-full mt-1 text-sm"
                            onChange={(e) => {
                              setStackSizes(prev => ({
                                ...prev,
                                [header]: e.target.value
                              }))
                            }}
                          >
                            <option value="">Select size</option>
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="25">25</option>
                            <option value="30">30</option>
                            <option value="35">35</option>
                            <option value="40">40</option>
                            <option value="45">45</option>
                            <option value="50">50</option>
                          </select>
                        </div>
                      ) : header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simToUse.map((row: any, index: number) => {
                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {HEADERS.map((header, cellIndex) => {
                        if (!header.startsWith('Stack')) {
                          return (
                            <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                              {typeof row[header] === 'number' ? Number(row[header].toFixed(3)) : row[header]}
                            </td>
                          );
                        }

                        // Handle Stack columns
                        const configKeyOver = `${header}/${row.displayName}/${row.stat}/OVER`;
                        const configKeyUnder = `${header}/${row.displayName}/${row.stat}/UNDER`;

                        return (
                          <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                            <div>
                              <div className="flex gap-2 mt-1">
                                <div className="flex flex-col gap-2">
                                  {row.Position !== 'QB' && (
                                    <>
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          className="mr-1"
                                          checked={stackConfigurations.has(configKeyOver)}
                                          disabled={stackConfigurations.has(configKeyUnder)}
                                          onChange={(e) => {
                                            setStackConfigurations(prev => {
                                              const newSet = new Set(prev);
                                              if (e.target.checked) {
                                                newSet.add(configKeyOver);
                                              } else {
                                                newSet.delete(configKeyOver);
                                              }
                                              return newSet;
                                            });
                                          }}
                                        />
                                        OVER
                                      </label>
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          className="mr-1"
                                          checked={stackConfigurations.has(configKeyUnder)}
                                          disabled={stackConfigurations.has(configKeyOver)}
                                          onChange={(e) => {
                                            setStackConfigurations(prev => {
                                              const newSet = new Set(prev);
                                              if (e.target.checked) {
                                                newSet.add(configKeyUnder);
                                              } else {
                                                newSet.delete(configKeyUnder);
                                              }
                                              return newSet;
                                            });
                                          }}
                                        />
                                        UNDER
                                      </label>
                                    </>
                                  )}
                                </div>
                                {row.Position === 'QB' && (
                                  <div className="flex flex-col justify-center ml-2 gap-[2px]">
                                    <label className="flex items-center text-[8px]">
                                      <input
                                        type="checkbox"
                                        className="mr-1 w-3 h-3"
                                        checked={stackConfigurations.has(`${configKeyOver}~1_WR_STACK`)}
                                        onChange={(e) => {
                                          setStackConfigurations(prev => {
                                            const newSet = new Set(prev);
                                            if (e.target.checked) {
                                              newSet.add(`${configKeyOver}~1_WR_STACK`);
                                            } else {
                                              newSet.delete(`${configKeyOver}~1_WR_STACK`);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      />
                                      OVER 1_WR
                                    </label>
                                    <label className="flex items-center text-[8px]">
                                      <input
                                        type="checkbox"
                                        className="mr-1 w-3 h-3"
                                        checked={stackConfigurations.has(`${configKeyOver}~2_WR_STACK`)}
                                        onChange={(e) => {
                                          setStackConfigurations(prev => {
                                            const newSet = new Set(prev);
                                            if (e.target.checked) {
                                              newSet.add(`${configKeyOver}~2_WR_STACK`);
                                            } else {
                                              newSet.delete(`${configKeyOver}~2_WR_STACK`);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      />
                                      OVER 2_WR
                                    </label>
                                    {/* TODO: CONSIDER BRINGING BACK RB_OPP LOGIC; TOO COMPLEX FOR NOW */}
                                    {/* <label className="flex items-center text-[8px]">
                                      <input
                                        type="checkbox"
                                        className="mr-1 w-3 h-3"
                                        checked={stackConfigurations.has(`${configKeyOver}~RB_OPPOSITE_STACK`)}
                                        onChange={(e) => {
                                          setStackConfigurations(prev => {
                                            const newSet = new Set(prev);
                                            if (e.target.checked) {
                                              newSet.add(`${configKeyOver}~RB_OPPOSITE_STACK`);
                                            } else {
                                              newSet.delete(`${configKeyOver}~RB_OPPOSITE_STACK`);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      />
                                      RB_OPP
                                    </label> */}
                                    <label className="flex items-center text-[8px]">
                                      <input
                                        type="checkbox"
                                        className="mr-1 w-3 h-3"
                                        checked={stackConfigurations.has(`${configKeyUnder}~1_WR_STACK`)}
                                        onChange={(e) => {
                                          setStackConfigurations(prev => {
                                            const newSet = new Set(prev);
                                            if (e.target.checked) {
                                              newSet.add(`${configKeyUnder}~1_WR_STACK`);
                                            } else {
                                              newSet.delete(`${configKeyUnder}~1_WR_STACK`);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      />
                                      UNDER 1_WR
                                    </label>
                                    <label className="flex items-center text-[8px]">
                                      <input
                                        type="checkbox"
                                        className="mr-1 w-3 h-3"
                                        checked={stackConfigurations.has(`${configKeyUnder}~2_WR_STACK`)}
                                        onChange={(e) => {
                                          setStackConfigurations(prev => {
                                            const newSet = new Set(prev);
                                            if (e.target.checked) {
                                              newSet.add(`${configKeyUnder}~2_WR_STACK`);
                                            } else {
                                              newSet.delete(`${configKeyUnder}~2_WR_STACK`);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      />
                                      UNDER 2_WR
                                    </label>
                                    {/* TODO: CONSIDER BRINGING BACK RB_OPP LOGIC; TOO COMPLEX FOR NOW */}
                                    {/* <label className="flex items-center text-[8px]">
                                      <input
                                        type="checkbox"
                                        className="mr-1 w-3 h-3"
                                        checked={stackConfigurations.has(`${configKeyUnder}~RB_OPPOSITE_STACK`)}
                                        onChange={(e) => {
                                          setStackConfigurations(prev => {
                                            const newSet = new Set(prev);
                                            if (e.target.checked) {
                                              newSet.add(`${configKeyUnder}~RB_OPPOSITE_STACK`);
                                            } else {
                                              newSet.delete(`${configKeyUnder}~RB_OPPOSITE_STACK`);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      />
                                      RB_OPP
                                    </label> */}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create context
const AppContext = createContext<{
  state: { [key: string]: any };
  setState: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>;
}>(null!);

// Add a custom hook to ensure type safety and better error handling
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

const GameConfig: React.FC<{ draftGroupId: number; game: string; config: SlateConfig }> = ({
  draftGroupId,
  game,
  config,
}) => {
  const { state } = useAppContext();

  const renderConfigSection = (type: 'singleGame' | 'mixIn') => (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{type === 'singleGame' ? 'Single Game' : 'Mix In'}</h2>
      {Object.entries(config[type]).map(([slipSize, slipConfig]) => {
        return (
          <ConfigRow
            key={`${type}- ${slipSize}`}
            draftGroupId={draftGroupId}
            game={game}
            type={type}
            slipSize={Number(slipSize)}
            config={slipConfig}
          />
        );
      })}
    </div>
  );

  return (
    <div>
      {renderConfigSection('singleGame')}
      {renderConfigSection('mixIn')}
    </div>
  );
};

const ConfigRow: React.FC<{
  draftGroupId: number;
  game: string;
  type: 'singleGame' | 'mixIn';
  slipSize: number;
  config: Config;
}> = ({ draftGroupId, game, type, slipSize, config }) => {
  const { state, setState } = useAppContext();

  const stateKey = `${draftGroupId} - ${game} - ${type} - ${slipSize}`;
  const rowState = state[stateKey] || { ...config };

  const handleInputChange = (field: string, value: number) => {
    console.log(draftGroupId, game, type, field, value);
    setState(prevState => ({
      ...prevState,
      [stateKey]: { ...(prevState[stateKey] || config), [field]: value },
    }));
  };

  return (
    <div className="flex items-center space-x-4 mb-4">
      <span className="w-20">Size {slipSize}</span>

      <input
        type="number"
        value={rowState.overSlips}
        onChange={e => handleInputChange('overSlips', Number(e.target.value))}
        className="w-24"
      />

      <input
        type="number"
        value={rowState.underSlips}
        onChange={e => handleInputChange('underSlips', Number(e.target.value))}
        className="w-24"
      />

      <input
        type="number"
        value={rowState.amount}
        onChange={e => handleInputChange('amount', Number(e.target.value))}
        className="w-24"
      />

      <span className="w-24">
        Total: {(rowState.potentialSlips.O.length + rowState.potentialSlips.U.length) * rowState.amount}
      </span>

      <button
        onClick={() =>
          console.log(draftGroupId, game, type, rowState.overSlips, rowState.underSlips, rowState.amount, 'refresh')
        }
        className="px-4 py-2 bg-blue-500 text-white rounded">
        Refresh Simulation
      </button>

      <button
        onClick={() =>
          console.log(draftGroupId, game, type, rowState.overSlips, rowState.underSlips, rowState.amount, 'place')
        }
        className="px-4 py-2 bg-green-500 text-white rounded">
        Place Bets
      </button>
    </div>
  );
};

function Component() {
  const [state, setState] = useState<{ [key: string]: any }>(() => {
    // Initialize state with default values from SLATES
    const initialState: { [key: string]: any } = {};

    SLATES.forEach(slate => {
      slate.games.forEach(game => {
        // Handle singleGame config
        Object.entries(slate.config.singleGame).forEach(([slipSize, slipConfig]) => {
          const key = `${slate.draftGroupId} - ${game.teams} - singleGame - ${slipSize}`;
          initialState[key] = { ...slipConfig };
        });

        // Handle mixIn config
        Object.entries(slate.config.mixIn).forEach(([slipSize, slipConfig]) => {
          const key = `${slate.draftGroupId} - ${game.teams} - mixIn - ${slipSize}`;
          initialState[key] = { ...slipConfig };
        });
      });
    });

    return initialState;
  });
  const [selectedDraftGroup, setSelectedDraftGroup] = useState<number>(SLATES[0].draftGroupId);
  const [selectedGame, setSelectedGame] = useState<string>(SLATES[0].games[0].teams);
  const [selectedTool, setSelectedTool] = useState<ToolType>('NFL');

  const handleInputChange = (
    draftGroupId: number,
    game: string,
    type: 'singleGame' | 'mixIn',
    slipSize: number,
    field: string,
    value: number,
  ) => {
    console.log(draftGroupId, game, type, field, value);
    setState(prevState => ({
      ...prevState,
      [`${draftGroupId} - ${game} - ${type} - ${slipSize}`]: {
        ...prevState[`${draftGroupId} - ${game} - ${type} - ${slipSize}`],
        [field]: value,
      },
    }));
  };

  const handleButtonClick = (
    draftGroupId: number,
    game: string,
    type: 'singleGame' | 'mixIn',
    slipSize: number,
    action: 'refresh' | 'place',
  ) => {
    const config = state[`${draftGroupId} - ${game} - ${type} - ${slipSize}`];
    console.log(draftGroupId, game, type, config.overSlips, config.underSlips, config.amount, action);
  };

  return (
    <AppContext.Provider value={{ state, setState }}>
      <div className="container mx-auto p-4">
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setSelectedTool('PICK6')}
              className={`px - 4 py - 2 text - sm font - medium border rounded - l - lg ${selectedTool === 'PICK6'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'
                }`}>
              PICK 6 TOOLS
            </button>
            <button
              type="button"
              onClick={() => setSelectedTool('NBA')}
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${selectedTool === 'NBA'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'
                }`}>
              NBA TOOLS
            </button>
            <button
              type="button"
              onClick={() => setSelectedTool('NFL')}
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg ${selectedTool === 'NFL'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'
                }`}>
              PICK 6 NFL
            </button>
          </div>
        </div>


        {selectedTool === 'PICK6' ? (
          <>
            <div className="flex space-x-4 mb-4">
              <select
                className="w-[180px] p-2 border rounded"
                onChange={e => setSelectedDraftGroup(Number(e.target.value))}
                value={selectedDraftGroup || ''}>
                <option value="" disabled>
                  Select Draft Group
                </option>
                {SLATES.map(slate => (
                  <option key={slate.draftGroupId} value={slate.draftGroupId}>
                    Draft Group {slate.draftGroupId}
                  </option>
                ))}
              </select>

              <select
                className="w-[180px] p-2 border rounded"
                onChange={e => setSelectedGame(e.target.value)}
                value={selectedGame || ''}>
                <option value="" disabled>
                  Select Game
                </option>
                {SLATES.find(slate => slate.draftGroupId === selectedDraftGroup)?.games.map(game => (
                  <option key={game.teams} value={game.teams}>
                    {game.teams}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex">
              <div className="w-1/5 pr-4">
                <div className="bg-gray-100 p-4 rounded">
                  <h2 className="text-lg font-bold mb-2">Left Column</h2>
                  <p>Additional information or controls can go here.</p>
                </div>
              </div>

              <div className="w-4/5">
                <GameConfig
                  draftGroupId={selectedDraftGroup}
                  game={selectedGame}
                  config={SLATES.find(slate => slate.draftGroupId === selectedDraftGroup)?.config || SLATES[0].config}
                />
              </div>
            </div>
          </>
        ) : selectedTool === 'NBA' ? (
          <NbaTools />
        ) : selectedTool === 'NFL' ? (
          <NflTools />
        ) : null}
      </div>
    </AppContext.Provider>
  );
}

export default withErrorBoundary(withSuspense(Component, <div> Loading ... </div>), <div> Error Occur </div>);