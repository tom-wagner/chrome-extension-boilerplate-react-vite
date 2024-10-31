import browser from 'webextension-polyfill';

// Create a simple storage interface using the browser's storage API
export const backgroundStorage = {
  async get() {
    const data = await browser.storage.local.get();

    return {
      counter: data.counter || 0,
      lastUpdate: data.lastUpdate || Date.now(),
      etrProjections: data.etrProjections || [],
      etrLastUpdated: data.etrLastUpdated || 'N/A',
      pickSixSlates: data.pickSixSlates || {},
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(data: {
    counter: number;
    lastUpdate: number;
    etrProjections: Record<string, any>;
    pickSixSlates: Record<string, any>;
    etrLastUpdated: string;
  }) {
    return browser.storage.local.set(data);
  },
};
