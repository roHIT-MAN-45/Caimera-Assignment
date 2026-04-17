import Database from "better-sqlite3";

const db = new Database("quiz.db");

// create scores table if it does not exist
db.prepare(
  `CREATE TABLE IF NOT EXISTS scores (
    username TEXT PRIMARY KEY,
    wins     INTEGER DEFAULT 0
  )`,
).run();

// prepare statements once at startup for reuse and performance
const stmtInsert = db.prepare(
  `INSERT OR IGNORE INTO scores (username, wins) VALUES (?, 0)`,
);

const stmtIncrement = db.prepare(
  `UPDATE scores SET wins = wins + 1 WHERE username = ?`,
);

const stmtTopScores = db.prepare(
  `SELECT username, wins FROM scores ORDER BY wins DESC LIMIT 10`,
);

// insert user if new, then increment their win count
export function incrementScore(username) {
  stmtInsert.run(username);
  stmtIncrement.run(username);
}

// fetch the top 10 players ordered by wins descending
export function getTopScores() {
  return stmtTopScores.all();
}
