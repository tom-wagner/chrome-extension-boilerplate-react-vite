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
  pickGroupIdToTarget: string;
};

export const BASE_DATA: BackgroundData = {
  lastUpdate: Date.now(),
  counter: 0,
  etrProjections: [],
  etrLastUpdated: 'N/A',
  pickSixSlates: {},
  pickGroupIdToTarget: '',
};

const storage = createStorage<BackgroundData>('PICK6_STORAGE', BASE_DATA, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

type BackgroundStorage = BaseStorage<BackgroundData> & {
  clear: () => Promise<void>;
};

export const backgroundStorage: BackgroundStorage = {
  ...storage,
  clear: async () => {
    await storage.set(BASE_DATA);
  },
};
