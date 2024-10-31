import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

type BackgroundData = {
  lastUpdate: number;
  counter: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  etrProjections: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pickSixSlates: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  etrLastUpdated: any;
};

// const ETR_REQUIRED_FORMAT = [
//   {
//     Player: 'Luka Doncic',
//     Position: 'PG',
//     Team: 'DAL',
//     Opponent: 'MIN',
//     Minutes: 37,
//     Points: 27.1,
//     Assists: 8.2,
//     Rebounds: 8.5,
//     ThreePt: 2.95,
//     Turnovers: 3.5,
//     Steals: 1.3,
//     Blocks: 0.42,
//   },
// ];

const storage = createStorage<BackgroundData>(
  'background-storage-key',
  { lastUpdate: Date.now(), counter: 0, etrProjections: [], etrLastUpdated: 'N/A', pickSixSlates: {} },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const backgroundStorage: BaseStorage<BackgroundData> = {
  ...storage,
};
