function fetchData() {
  const table = document.getElementById('footable_743261');

  const players = {};

  Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
    const cells = row.querySelectorAll('td');

    const playerName = cells[0].textContent.trim(); // Player name
    // const position = cells[1].textContent.trim();          // Position
    const team = cells[2].textContent.trim(); // Team
    const oop = cells[3].textContent.trim(); // Opponent
    const minutes = parseFloat(cells[4].textContent); // Minutes
    // const points = parseFloat(cells[5].textContent);       // Points
    // const assists = parseFloat(cells[6].textContent);      // Assists
    // const rebounds = parseFloat(cells[7].textContent);     // Rebounds
    // const threePt = parseFloat(cells[8].textContent);      // ThreePt
    // const turnovers = parseFloat(cells[9].textContent);    // Turnovers
    // const steals = parseFloat(cells[10].textContent);      // Steals
    // const blocks = parseFloat(cells[11].textContent);      // Blocks

    players[playerName] = {
      team,
      oop,
      minutes,
    };
  });

  console.log(players);
}
fetchData();
