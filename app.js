const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,

      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);

    process.exit(1);
  }
};

initializeDBAndServer();

const allPlayerSnakeCaseToCamel = (each) => {
  return {
    playerId: each.player_id,
    playerName: each.player_name,
  };
};

///1.GET all players
app.get("/players/", async (request, response) => {
  const allPlayersQuery = `
    SELECT 
    * 
    FROM 
    player_details;`;

  const playersAll = await db.all(allPlayersQuery);
  response.send(
    playersAll.map((eachPlayer) => allPlayerSnakeCaseToCamel(eachPlayer))
  );
});

///2.GET player based on player Id
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerQuery = `
    SELECT * 
    FROM player_details 
    WHERE 
    player_id = '${playerId}';`;
  const playerDetails = await db.get(playerQuery);
  response.send(allPlayerSnakeCaseToCamel(playerDetails));
});

///3.PUT details of player based on player Id
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;

  const updatePlayerQuery = `
  UPDATE 
    player_details
  SET 
    player_name = '${playerName}'
  WHERE 
    player_id = '${playerId}';`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

const matchDetailsSnakeCaseToCamelCase = (each) => {
  return {
    matchId: each.match_id,
    match: each.match,
    year: each.year,
  };
};

///4.GET match details based on match Id
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchDetailsQuery = `
    SELECT 
    *
    FROM
    match_details
    WHERE
    match_id = '${matchId}';`;
  const matchDetails = await db.get(matchDetailsQuery);
  response.send(matchDetailsSnakeCaseToCamelCase(matchDetails));
});

///5.GET all matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const playerMatchesQuery = `
    SELECT 
      match_details.match_id,
      match_details.match,
      match_details.year 
    FROM 
      match_details JOIN player_match_score 
    ON 
      match_details.match_id = player_match_score.match_id
    WHERE 
      player_id = '${playerId}'`;
  const allMatchesOfPlayer = await db.all(playerMatchesQuery);
  const result = allMatchesOfPlayer.map((each) =>
    matchDetailsSnakeCaseToCamelCase(each)
  );
  response.send(result);
});

///6.GET all players of a match based on match Id
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const allPlayersOnMatchIdQuery = `
    SELECT 
      player_details.player_id,
      player_details.player_name
    FROM
      player_details JOIN player_match_score 
    ON
      player_details.player_id = player_match_score.player_id
    WHERE
      match_id = '${matchId}';`;
  const allPlayersList = await db.all(allPlayersOnMatchIdQuery);
  const result = allPlayersList.map((each) => allPlayerSnakeCaseToCamel(each));
  response.send(result);
});

const statsSnakeToCamelCase = (each) => {
  return {
    playerId: each.player_id,
    playerName: each.player_name,
    totalScore: each.total_score,
    totalFours: each.total_fours,
    totalSixes: each.total_sixes,
  };
};
///7.GET stats based on player Id
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const statsQuery = `
    SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(player_match_score.fours) AS totalFours,
      SUM(player_match_score.sixes) AS totalSixes
    FROM 
      player_details 
    JOIN 
      player_match_score
    ON
      player_details.player_id = player_match_score.player_id
    WHERE 
      player_details.player_id = '${playerId}';`;
  const stats = await db.get(statsQuery);
  response.send(stats);
  //response.send(statsSnakeToCamelCase(stats));
});

module.exports = app;
