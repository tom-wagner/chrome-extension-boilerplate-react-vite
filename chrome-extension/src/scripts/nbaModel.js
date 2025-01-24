import {
    ETR_MINUTES_PROJECTIONS,
    GAMES_AND_TOTALS,
    advancedByTeam,
    scoringDistribution,
    opponentStatsByTeam,
    playerAdvancedStats,
    playerTraditional
} from './MOCK_DATA.js';

// TODO: REPLACE ALL THESE WITH API CALLS
// --> WRITE IN LOGIC TO TURN STUBBING ON AND OFF AS NEEDED; MOVE TO DIFFERENT FILE

const TEAM_MAPPER = {
    'ATL': 'Atlanta Hawks',
    'BOS': 'Boston Celtics',
    'BKN': 'Brooklyn Nets',
    'CHA': 'Charlotte Hornets',
    'CHI': 'Chicago Bulls',
    'CLE': 'Cleveland Cavaliers',
    'DAL': 'Dallas Mavericks',
    'DEN': 'Denver Nuggets',
    'DET': 'Detroit Pistons',
    'GSW': 'Golden State Warriors',
    'HOU': 'Houston Rockets',
    'IND': 'Indiana Pacers',
    'LAC': 'Los Angeles Clippers',
    'LAL': 'Los Angeles Lakers',
    'MEM': 'Memphis Grizzlies',
    'MIA': 'Miami Heat',
    'MIL': 'Milwaukee Bucks',
    'MIN': 'Minnesota Timberwolves',
    'NOP': 'New Orleans Pelicans',
    'NYK': 'New York Knicks',
    'OKC': 'Oklahoma City Thunder',
    'ORL': 'Orlando Magic',
    'PHI': 'Philadelphia 76ers',
    'PHX': 'Phoenix Suns',
    'POR': 'Portland Trail Blazers',
    'SAC': 'Sacramento Kings',
    'SAS': 'San Antonio Spurs',
    'TOR': 'Toronto Raptors',
    'UTA': 'Utah Jazz',
    'WAS': 'Washington Wizards'
};

const CONFIG_OBJECT = {
    SHOULD_IMPORT_MOCK_DATA: true,
    PLAYER_SHOT_DISTRIBUTION_WEIGHT_VS_OPPONENT_DEFENSE_DISTRIBUTION: 0.75,
    PLAYER_MAKE_PERCENTAGE_WEIGHT_VS_OPPONENT_DEFENSE_PERCENTAGES: 0.8,
};

function getMinutesProjectionsByTeam(etrProjections) {
    const minutesByTeam = {};

    for (const player in etrProjections) {
        const { team, minutes } = etrProjections[player];

        if (!minutesByTeam[team]) {
            minutesByTeam[team] = {};
        }

        minutesByTeam[team][player] = minutes;
    }

    return minutesByTeam;
}

function assignPossessions(totalPossessions, minutesForTeam, scoringDistribution) {
    const possessionsByPlayer = {};
    const MINUTES_PER_GAME = 48;

    // Calculate possessions for each player based on their usage rate and minutes
    for (const playerName in minutesForTeam) {
        const projectedMinutes = minutesForTeam[playerName];
        const playerData = scoringDistribution[playerName];

        if (!playerData) {
            console.warn(`No stats found for player: ${playerName}`);
            continue;
        }

        // Calculate player's share of possessions:
        // (Usage rate * Total possessions * Minutes played / Total team minutes)
        const possessions = totalPossessions *
            (playerData.USG_PCT) *
            (projectedMinutes / MINUTES_PER_GAME);

        possessionsByPlayer[playerName] = possessions;
    }

    return possessionsByPlayer;
}

function normalizePossessions(rawPossessions, totalPossessions) {
    // Calculate current sum of possessions
    const currentTotal = Object.values(rawPossessions).reduce((sum, poss) => sum + poss, 0);

    // Calculate scaling factor
    const scalingFactor = totalPossessions / currentTotal;

    // Create new object with scaled possessions
    const normalizedPossessions = {};
    for (const [player, possessions] of Object.entries(rawPossessions)) {
        normalizedPossessions[player] = possessions * scalingFactor;
    }

    // Handle any remaining difference due to rounding
    const newTotal = Object.values(normalizedPossessions).reduce((sum, poss) => sum + poss, 0);
    const difference = totalPossessions - newTotal;

    if (difference !== 0) {
        // Find player with most possessions to adjust for rounding difference
        const playerWithMost = Object.entries(normalizedPossessions)
            .sort(([, a], [, b]) => b - a)[0][0];
        normalizedPossessions[playerWithMost] += difference;
    }

    return normalizedPossessions;
}

function getPossessionProjectionsByTeam(game, minutesByTeam) {
    const { home, away, total } = game;
    const [homeTeamPace, awayTeamPace] = [home, away].map(t => advancedByTeam[TEAM_MAPPER[t]].PACE)
    const possessions = (homeTeamPace + awayTeamPace) / 2;
    const [homePossessionsRaw, awayPossessionsRaw] = [home, away].map(t => assignPossessions(possessions, minutesByTeam[t], scoringDistribution));
    return [homePossessionsRaw, awayPossessionsRaw].map(p => normalizePossessions(p, possessions));

    // TO CHECK THE TOTAL
    // return [homePossesions, awayPossessions].map(team => Object.values(team).reduce((sum, poss) => sum + poss, 0));
}

function getDefensiveRatios(opponentStats) {
    const totalPossessions = opponentStats.OPP_FGA + opponentStats.OPP_TOV + (opponentStats.OPP_FTA * 0.44);
    const opp2PA = opponentStats.OPP_FGA - opponentStats.OPP_FG3A;

    return {
        TWO_PT_RATE: opp2PA / totalPossessions,
        THREE_PT_RATE: opponentStats.OPP_FG3A / totalPossessions,
        FT_RATE: (opponentStats.OPP_FTA * 0.44) / totalPossessions, // Using 0.44 as FT possession multiplier
        TO_RATE: opponentStats.OPP_TOV / totalPossessions
    };
}

function getRatiosForPlayer(player, playerAdvancedStats, playerTraditionalStats, scoringDistribution) {
    const possessionsForPlayer = (playerTraditionalStats.FTA * .44) + playerTraditionalStats.FGA + playerTraditionalStats.TOV;  // Using 0.44 as FT possession multiplier
    const TOV = playerTraditionalStats.TOV / possessionsForPlayer;
    const POSS_END_SHOOTING_FT = (playerTraditionalStats.FTA * .44) / possessionsForPlayer;  // Using 0.44 as FT possession multiplier
    const FGA = possessionsForPlayer - playerTraditionalStats.TOV - (playerTraditionalStats.FTA * .44);
    const [twoPointFgaRatio, threePointFgaRatio] = [
        (playerTraditionalStats.FGA - playerTraditionalStats.FG3A) / playerTraditionalStats.FGA,
        playerTraditionalStats.FG3A / playerTraditionalStats.FGA
    ];

    return {
        TWO_PT_RATE: (twoPointFgaRatio * FGA) / possessionsForPlayer,
        THREE_PT_RATE: (threePointFgaRatio * FGA) / possessionsForPlayer,
        FT_RATE: POSS_END_SHOOTING_FT,
        TO_RATE: TOV,
    };
}

function distributePossessions(possessionsByPlayer, opponent) {
    const opponentStats = opponentStatsByTeam[TEAM_MAPPER[opponent]];
    const defensiveRatios = getDefensiveRatios(opponentStats);
    const ratiosByPlayer = Object.entries(possessionsByPlayer).reduce((acc, [player, possessions]) => {
        const playerRatios = getRatiosForPlayer(player, playerAdvancedStats[player], playerTraditional[player], scoringDistribution[player]);
        return {
            ...acc,
            [player]: playerRatios,
        };
    }, {});

    const weightedRatiosByPlayer = Object.entries(ratiosByPlayer).reduce((acc, [player, ratios]) => {
        const weightedRatios = Object.entries(ratios).reduce((acc, [ratioType, ratio]) => {
            return {
                ...acc,
                [ratioType]: (ratio * CONFIG_OBJECT.PLAYER_SHOT_DISTRIBUTION_WEIGHT_VS_OPPONENT_DEFENSE_DISTRIBUTION) + (defensiveRatios[ratioType] * (1 - CONFIG_OBJECT.PLAYER_SHOT_DISTRIBUTION_WEIGHT_VS_OPPONENT_DEFENSE_DISTRIBUTION))
            };
        }, {});
        return {
            ...acc,
            [player]: weightedRatios,
        };
    }, {});

    const distributionByPlayer = Object.entries(possessionsByPlayer).reduce((acc, [player, possessions]) => {
        const { TWO_PT_RATE, THREE_PT_RATE, FT_RATE, TO_RATE } = weightedRatiosByPlayer[player];
        return {
            ...acc,
            [player]: {
                TWO_PT_ATT: TWO_PT_RATE * possessions,
                THREE_PT_ATT: THREE_PT_RATE * possessions,
                FT_ATT: FT_RATE * possessions * 2, // ASSUMING TWO FTs PER TRIP TO LINE
                TOV: TO_RATE * possessions,
            },
        }
    }, {})

    return distributionByPlayer;
}

function getMakesAndMisses(shotDistributionByPlayer, opponent) {
    const opponentStats = opponentStatsByTeam[TEAM_MAPPER[opponent]];
    const makesAndMissesByPlayer = {};

    for (const [player, attempts] of Object.entries(shotDistributionByPlayer)) {
        const playerStats = playerTraditional[player];

        if (!playerStats) {
            console.warn(`No traditional stats found for player: ${player}`);
            continue;
        }

        const playerTwoPointPercentage = (playerStats.FGM - playerStats.FG3M) / (playerStats.FGA - playerStats.FG3A);
        const opponentTwoPtFgPct = (opponentStats.OPP_FGM - opponentStats.OPP_FG3M) / (opponentStats.OPP_FGA - opponentStats.OPP_FG3A);

        let weightedTwoPointPct = (playerTwoPointPercentage * CONFIG_OBJECT.PLAYER_MAKE_PERCENTAGE_WEIGHT_VS_OPPONENT_DEFENSE_PERCENTAGES) +
            (opponentTwoPtFgPct * (1 - CONFIG_OBJECT.PLAYER_MAKE_PERCENTAGE_WEIGHT_VS_OPPONENT_DEFENSE_PERCENTAGES));

        let weightedThreePointPct = (playerStats.FG3_PCT * CONFIG_OBJECT.PLAYER_MAKE_PERCENTAGE_WEIGHT_VS_OPPONENT_DEFENSE_PERCENTAGES) +
            (opponentStats.OPP_FG3_PCT * (1 - CONFIG_OBJECT.PLAYER_MAKE_PERCENTAGE_WEIGHT_VS_OPPONENT_DEFENSE_PERCENTAGES));

        if (isNaN(weightedTwoPointPct) || isNaN(weightedThreePointPct)) {
            console.warn(`NaN issue for player: ${player}`);
            weightedTwoPointPct = .5;
            weightedThreePointPct = .35;
        }

        makesAndMissesByPlayer[player] = {
            TWO_PT_MAKES: attempts.TWO_PT_ATT * weightedTwoPointPct,
            TWO_PT_MISSES: attempts.TWO_PT_ATT * (1 - weightedTwoPointPct),
            THREE_PT_MAKES: attempts.THREE_PT_ATT * weightedThreePointPct,
            THREE_PT_MISSES: attempts.THREE_PT_ATT * (1 - weightedThreePointPct),
            FT_MAKES: attempts.FT_ATT * playerStats.FT_PCT,
            FT_MISSES: attempts.FT_ATT * (1 - playerStats.FT_PCT),
            TOV: attempts.TOV
        };
    }

    return makesAndMissesByPlayer;
}

function getPointsForPlayer(makesAndMisses) {
    const twoPointPoints = makesAndMisses.TWO_PT_MAKES * 2;
    const threePointPoints = makesAndMisses.THREE_PT_MAKES * 3;
    const freeThrowPoints = makesAndMisses.FT_MAKES;
    return twoPointPoints + threePointPoints + freeThrowPoints;
}

// TODO: USE THIS FOR REBOUNDS
function getMisses(makesAndMisses) {
    // TODO: REASSESS THE .44 HERE
    return makesAndMisses.TWO_PT_MISSES + makesAndMisses.THREE_PT_MISSES + (makesAndMisses.FT_MISSES * .44);
}

function getTeamTotals(total, spread) {
    const homeAdj = -spread / 2;
    const awayAdj = spread / 2;
    return [(total / 2) + homeAdj, (total / 2) + awayAdj];
}

function adjustPointsProjections(args) {
    const { homePoints, awayPoints, homePointsByPlayer, awayPointsByPlayer, projectedHomePoints, projectedAwayPoints } = args;

    // Calculate adjustment ratios for each team
    const homeAdjustmentRatio = projectedHomePoints / homePoints;
    const awayAdjustmentRatio = projectedAwayPoints / awayPoints;

    // Adjust individual player points by team ratios using map/reduce
    const adjustedHomePointsByPlayer = Object.fromEntries(
        Object.entries(homePointsByPlayer)
            .map(([player, points]) => [player, points * homeAdjustmentRatio])
    );

    const adjustedAwayPointsByPlayer = Object.fromEntries(
        Object.entries(awayPointsByPlayer)
            .map(([player, points]) => [player, points * awayAdjustmentRatio])
    );

    return [adjustedHomePointsByPlayer, adjustedAwayPointsByPlayer];
}

function simulateSingleGame(game, minutesByTeam) {
    const { home, away, total, spread } = game;
    const [homePossessionsByPlayer, awayPossessionsByPlayer] = getPossessionProjectionsByTeam(game, minutesByTeam);

    const [homeShotDistributionByPlayer, awayShotDistributionByPlayer] = [
        [homePossessionsByPlayer, away],
        [awayPossessionsByPlayer, home]
    ].map(([possessions, opponent]) => distributePossessions(possessions, opponent));

    const [homeMakesAndMisses, awayMakesAndMisses] = [
        [homeShotDistributionByPlayer, away],
        [awayShotDistributionByPlayer, home]
    ].map(([shotDistributionByPlayer, opponent]) => getMakesAndMisses(shotDistributionByPlayer, opponent));

    const [homePointsByPlayer, awayPointsByPlayer] = [homeMakesAndMisses, awayMakesAndMisses].map(
        makesAndMisses => Object.entries(makesAndMisses).reduce((acc, [key, value]) => {
            acc[key] = getPointsForPlayer(value);
            return acc;
        }, {})
    );

    const homePoints = Object.values(homeMakesAndMisses).reduce((sum, makesAndMisses) => sum + getPointsForPlayer(makesAndMisses), 0);
    const awayPoints = Object.values(awayMakesAndMisses).reduce((sum, makesAndMisses) => sum + getPointsForPlayer(makesAndMisses), 0);

    const [projectedHomePoints, projectedAwayPoints] = getTeamTotals(total, spread);
    const [adjustedHomePointsByPlayer, adjustedAwayPointsByPlayer] = adjustPointsProjections({
        homePoints, awayPoints, homePointsByPlayer, awayPointsByPlayer, projectedHomePoints, projectedAwayPoints
    });

    // TODO: CONTINUE HERE WITH REBOUNDS AND ASSISTS AND MORE

    /*
    Rebounds:
    1. Get missed shots from above by team
    2. Get Off Rebound Rate and Def Rebound Rate by player from playerAdvancedStats in MOCK_DATA.js
    3. Blend OREB_PCT (80% weight) for each player with opponent DREB_PCT (20% weight) (advancedByTeam in mock data)
    4. Blend DREB_PCT (80% weight) for each player with opponent OREB_PCT (20% weight) (advancedByTeam in mock data)
    5. Calculate # of rebounds for each player by multiplying:
     >> (total missed shots by opponent * (minutes played / 48)) by blended DREB_RATE
     >> (total missed shots by team * (minutes played / 48)) * blended OREB_RATE
    6. Write a place holder function called normalizeRebounds; we need to adjust our makes/misses similar to how I adjusted points using the game total (see adjustPointsProjections function)
    */

    /*
    Assists:
    1. Get FG makes from above homeMakesAndMisses + awayMakesAndMisses
    2. Calculate league average opponent assist ratio:
    >> calculate opponent assist ratio as OPP_AST / OPP_FGM from opponentStatsByTeam
    >> average these values
    3. Calculate an adjustment factor for the opponent as: (OPP_AST / OPP_FGM) / average league oppoonent assist ratio
    4. Calculate each players adjusted AST_RATIO as: playerAdvancedStats.AST_RATIO * adjustment factor
    5. Determine # of FGM each player will be on the floor for as: teamMakesAndMisses.FGM * (player projected minutes / 48)
    6. Multiply #5 * player adjusted assist ratio from #4
    7. Write a place holder function called normalizeAssists; we need to adjust our makes/misses similar to how I adjusted points using the game total (see adjustPointsProjections function)
    */

    /* 3PM ---> YOU CAN TAKE FIRST STAB AT THIS ONE! */

    /* TURNOVERS ---> YOU CAN TAKE FIRST STAB AT THIS ONE! */

    /* Points + Rebounds -> obvious */
    /* Points + Assists -> obvious */
    /* Points + Rebounds + Assists -> obvious */
    /* Assists + Rebounds -> obvious */

    // Write some javascript to add all player projections NewTab.tsx
    // >> Add a button to NewTab.tsx called "NBA Model" (similar to PICK 6 TOOLS button)
    // >> iterate over projections and put on the page as a table

    return {
        home: homePoints,
        away: awayPoints,
        total: homePoints + awayPoints
    };
}

function simulateAllGames(gamesAndTotals, minutesByTeam) {
    return gamesAndTotals.map(game => simulateSingleGame(game, minutesByTeam));
}

const minutesByTeam = getMinutesProjectionsByTeam(ETR_MINUTES_PROJECTIONS);

const simulationResults = simulateAllGames(GAMES_AND_TOTALS, minutesByTeam);

console.log(simulationResults);