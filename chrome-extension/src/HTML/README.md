Write code to scrape these two websites:
1. establishTheRunFullProjectionDetail.html
2. establishTheRunDfsProjections.html
2. SportsbookAgResponse.html

On Establish The Run, the stats are in a table with the first row being the headings.
On SportsbookAg, the structure is a little less clean. There are headings that say the stat category and then the actual lines are in divs/rows below that.

Instructions:
1. The output of both should be an object keyed by player name with all the various stats:
2. For this code create a new file with three functions in it, one function per site, and also add three buttons to the extension popup, one per site. For now we will just be scraping from the HTML file in the repo but eventually we will substitute in the actual website
3. You can open the HTML files in your browser using the absolute path. And don't use any libraries, just vanilla Javascript. I think document.querySelectorAll() with some mapping will work well

Establish The Run Full ProjectionDetail example (real example from the html file):
```
{
    "Jayson Tatum": {
        "Minutes": 35.0,
        "Points": 27.2,
        etc...
    },
}
```

Establish The Run Full DFS Projections example (real example from the html file):

*Note* For this one, I only need the Team, Opp and Minutes columns.
```
{
    "Devin Booker": {
        "Minutes": 37,
        "Team": "PHX",
        "Opp": "UTA"
    },'
    ... etc, etc
}
```

SportsbookAg examples (real example from the html file):
```
{ 
    "Anthony Edwards": {
        "Points": { "O/U": 27.5, "OVER": 100, "UNDER": -130 },
        "Rebounds": { (same structureas above) },
    },
    "Jaden McDaniels": {
        "Points": { "O/U": 9.5, "OVER": -122, "UNDER": -106 },
        "Rebounds": { },
    },
    ... etc, etc
}
```

