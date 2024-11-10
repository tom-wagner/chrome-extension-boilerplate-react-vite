import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { backgroundStorage, exampleThemeStorage } from '@extension/storage';
import type { ComponentPropsWithoutRef } from 'react';

// const notificationOptions = {
//   type: 'basic',
//   iconUrl: chrome.runtime.getURL('icon-34.png'),
//   title: 'Injecting content script error',
//   message: 'You cannot inject script here!',
// } as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  // const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

  // const injectContentScript = async () => {
  //   const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

  //   if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
  //     chrome.notifications.create('inject-error', notificationOptions);
  //   }

  //   await chrome.scripting
  //     .executeScript({
  //       target: { tabId: tab.id! },
  //       files: ['/content-runtime/index.iife.js'],
  //     })
  //     .catch(err => {
  //       // Handling errors related to other paths
  //       if (err.message.includes('Cannot access a chrome:// URL')) {
  //         chrome.notifications.create('inject-error', notificationOptions);
  //       }
  //     });
  // };

  const { pickSixSlates, pickGroupIdToTarget } = useStorage(backgroundStorage);

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        {/* <button
          className={
            'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
            (isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white')
          }
          onClick={injectContentScript}>
          Click to inject Content Script
        </button> */}
        <div>
          <p>Slates loaded:</p>
          <p>{JSON.stringify(pickSixSlates)}</p>
        </div>
        <div>
          <button style={{ marginTop: '10px', border: '1px solid red' }} onClick={() => backgroundStorage.clear()}>
            Clear local storage
          </button>
        </div>
        <button style={{ marginTop: '10px', border: '1px solid red' }}>
          Refresh window.__remixContext (not currently wired up)
        </button>
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="slateTarget" className="text-black">
            Slate to Target:
          </label>
          <input
            id="slateTarget"
            type="text"
            className="rounded border px-2 py-1 text-black"
            value={pickGroupIdToTarget ?? ''}
            onChange={async e => {
              await backgroundStorage.set(prev => ({
                ...prev,
                pickGroupIdToTarget: e.target.value,
              }));
            }}
          />
        </div>
        <button
          style={{
            marginTop: '10px',
            border: '1px solid blue',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
          onClick={() => {
            chrome.runtime.sendMessage({ type: 'RUN_COMPARATOR' });
          }}>
          Run Comparator
        </button>
        <ToggleButton>Toggle theme</ToggleButton>
      </header>
    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const theme = useStorage(exampleThemeStorage);
  return (
    <button
      className={
        props.className +
        ' ' +
        'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
        (theme === 'light' ? 'bg-white text-black shadow-black' : 'bg-black text-white')
      }
      onClick={exampleThemeStorage.toggle}>
      {props.children}
    </button>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
