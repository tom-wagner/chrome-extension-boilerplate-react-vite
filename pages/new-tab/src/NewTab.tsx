'use client';

import React, { useState, createContext, useContext } from 'react';

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
  console.log('GameConfig props:', { draftGroupId, game, config });
  const { state } = useAppContext();

  const renderConfigSection = (type: 'singleGame' | 'mixIn') => (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{type === 'singleGame' ? 'Single Game' : 'Mix In'}</h2>
      {Object.entries(config[type]).map(([slipSize, slipConfig]) => {
        console.log(`Rendering ConfigRow for ${type}, size ${slipSize}`);
        return (
          <ConfigRow
            key={`${type}-${slipSize}`}
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
  console.log('ConfigRow props:', { draftGroupId, game, type, slipSize, config });
  const { state, setState } = useAppContext();
  console.log('Context in ConfigRow:', state);

  const stateKey = `${draftGroupId}-${game}-${type}-${slipSize}`;
  console.log('stateKey:', stateKey);
  const rowState = state[stateKey] || { ...config };
  console.log('rowState:', rowState);

  const handleInputChange = (field: string, value: number) => {
    console.log(draftGroupId, game, type, field, value);
    setState(prevState => ({
      ...prevState,
      [stateKey]: { ...(prevState[stateKey] || config), [field]: value },
    }));
  };

  return (
    <div className="flex items-center space-x-4 mb-4">
      {console.log('Rendering ConfigRow, rowState:', rowState)}
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

export default function Component() {
  console.log('Initial SLATES:', SLATES);
  const [state, setState] = useState<{ [key: string]: any }>(() => {
    // Initialize state with default values from SLATES
    const initialState: { [key: string]: any } = {};

    SLATES.forEach(slate => {
      slate.games.forEach(game => {
        // Handle singleGame config
        Object.entries(slate.config.singleGame).forEach(([slipSize, slipConfig]) => {
          const key = `${slate.draftGroupId}-${game.teams}-singleGame-${slipSize}`;
          initialState[key] = { ...slipConfig };
        });

        // Handle mixIn config
        Object.entries(slate.config.mixIn).forEach(([slipSize, slipConfig]) => {
          const key = `${slate.draftGroupId}-${game.teams}-mixIn-${slipSize}`;
          initialState[key] = { ...slipConfig };
        });
      });
    });

    console.log('Initialized state:', initialState);
    return initialState;
  });
  console.log('Initial state:', state);
  const [selectedDraftGroup, setSelectedDraftGroup] = useState<number>(SLATES[0].draftGroupId);
  const [selectedGame, setSelectedGame] = useState<string>(SLATES[0].games[0].teams);

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
      [`${draftGroupId}-${game}-${type}-${slipSize}`]: {
        ...prevState[`${draftGroupId}-${game}-${type}-${slipSize}`],
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
    const config = state[`${draftGroupId}-${game}-${type}-${slipSize}`];
    console.log(draftGroupId, game, type, config.overSlips, config.underSlips, config.amount, action);
  };

  return (
    <AppContext.Provider value={{ state, setState }}>
      <div className="container mx-auto p-4">
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
      </div>
    </AppContext.Provider>
  );
}
