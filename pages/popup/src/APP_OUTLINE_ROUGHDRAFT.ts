// GITHUB LINK: PENDING
// VIDEO OVERVIEW LINK: PENDING
// SKETCH LINK: PENDING
// TAILWIND CSS LINK: PENDING --> USE THIS

// Overall notes:
// 1. Educated guesses on what to do are fine: trust your instincts; code is not permanent and I (or you) can edit as needed
// 2. IMPORTANT: Stack up your questions and send them all at once vs sending one at a time
// --> I am hiring you because I am busy; not because I can't do this myself. I can do all of this myself but don't have enough time.
// --> So instead of asking me every question as you think of them, keep moving and complete as much of this task as you can -->
// --> --> THEN: Send me all of your questions at once, and push your code to github (V1.1 branch) when you send your questions
// ***** REFER TO THIS DOCUMENT, THE SKETCH, AND THE VIDEO WHEN YOU ARE UNSURE WHAT TO DO *****
// 3. Install and use Tailwind CSS for your component library

// On that note: don't commit to main: `git checkout -b V1.1` and work on that

// General design notes:
// 1. Dropdown for changing draftGroupId at the top of page
// 2a. Secondary dropdown directly next to primary dropdown to change the game
// 2b. One of the options in the dropdown should be full slate

const SLATES = [
  {
    draftGroupId: 12345,
    maxAmountBySlipSize: {
      2: 100,
      3: 100,
      4: 100,
      5: 100,
      6: 100,
    },
    games: [{ teams: 'DET/MIN' }, { teams: 'LAL/NYK' }, { teams: 'FULL_SLATE' }],
    // no need to do anything with overList as of now
    overList: [
      {
        player: 'Lebron James',
        statCategory: 'Rebounds',
        dkLine: 6.5,
        probabilityOver: 0.55,
      },
    ],
    // no need to do anything with underList as of now
    underList: [
      {
        player: 'Lebron James',
        statCategory: 'Points',
        dkLine: 22.5,
        probabilityUnder: 0.55,
      },
    ],
    config: {
      singleGame: {
        4: {
          // these values all need to be in form fields with onChange listeners
          // 1. store these values in a React.createcontext state at the top level component on the page
          // 2. initialize overSlips = 10; underSlips = 30; amount = 5; for all form fields (every draftGroupId, every game)
          // --> for now in the listener, do the following:
          // 1. console.log the following: draftGroupId, game, 'singleGame' OR 'mixIn', overSlips, underSlips, amount
          // 2. update the form value in the React.createContext() state at the top level
          maxExposure: 0.35,
          overSlips: 5,
          underSlips: 25,
          amount: 5,

          // for now we will just display the length of each of these arrays
          potentialSlips: {
            O: [],
            U: [],
          },

          // display total as:
          // potentialSlips.O.reduce((acc, cv) => acc + cv.amount, 0) + potentialSlips.U.reduce((acc, cv) => acc + cv.amount, 0)

          // each of these config objects will become a row on the page
          // 1. add a button at the end of the row that says "Refresh Simulation"
          // 2. and at the end of the row there should be a "Place bets" button;

          // also wire both those buttons up with an onChange listener that console.log's the same items as above
          // draftGroupId, game, 'singleGame' OR 'mixIn', overSlips, underSlips, amount
        },
        5: {
          maxExposure: 0.35,
          overSlips: 5,
          underSlips: 25,
          amount: 5,
          potentialSlips: {
            O: [],
            U: [],
          },
        },
        6: {
          maxExposure: 0.35,
          overSlips: 5,
          underSlips: 25,
          amount: 5,
          potentialSlips: {
            O: [],
            U: [],
          },
        },
      },
      mixIn: {
        3: {
          maxExposure: 0.35,
          overSlips: 5,
          underSlips: 25,
          amount: 5,
          potentialSlips: {
            O: [],
            U: [],
          },
        },
        4: {
          maxExposure: 0.35,
          overSlips: 5,
          underSlips: 25,
          amount: 5,
          potentialSlips: {
            O: [],
            U: [],
          },
        },
        5: {
          maxExposure: 0.35,
          overSlips: 5,
          underSlips: 25,
          amount: 5,
          potentialSlips: {
            O: [],
            U: [],
          },
        },
      },
    },
  },
];
