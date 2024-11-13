We are going to be scraping NBA.com stats:

1. https://www.nba.com/stats/teams/opponent?PerMode=Per100Possessions
```
```

2. https://www.nba.com/stats/players/advanced?dir=A&sort=MIN&PerMode=Per100Possessions
```
```

3. https://www.nba.com/stats/teams/advanced
```
```

4. https://www.nba.com/stats/players/usage?dir=A&sort=MIN
```
```

All of these should be fetch requests triggered by a button at the top of the NewTab page labeled "Scrape NBA.com". You will likely need to post a a message to the nba.com website and add a listener for that message in the background script. There are some examples of that in the background script already.

Key the team stats by team name and the player stats by player name. Merge the stats from the different api calls into a single object for each stat type, one object for the team stats and one object for the player stats.

You can trigger the request by going to these URLs, or by changing the dropdowns on the NBA.com website.
