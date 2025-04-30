function fetchData() {
  const table = document.getElementById('table_1');

  const players = {};

  Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
    const cells = row.querySelectorAll('td');

    const playerName = cells[0].textContent.trim();
    const fdName = cells[1].textContent.trim();
    const team = cells[2].textContent.trim();
    const opponent = cells[3].textContent.trim();
    const minutes = parseFloat(cells[4].textContent);
    const position = cells[5].textContent.trim();
    const salary = parseInt(cells[6].textContent.replace(/,/g, ''));
    const points = parseFloat(cells[7].textContent);
    const value = parseFloat(cells[8].textContent);
    const ceiling = parseFloat(cells[9].textContent);
    const ownership = parseFloat(cells[10].textContent);
    const slate = cells[11].textContent.trim();

    players[playerName] = {
      fdName,
      team,
      opponent,
      minutes,
      position,
      salary,
      points,
      value,
      ceiling,
      ownership,
      slate,
    };
  });

  console.log(players);
}
fetchData();
