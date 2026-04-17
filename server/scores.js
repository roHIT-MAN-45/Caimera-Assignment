import { incrementScore, getTopScores } from "./db.js";

// record a win for the given username
export function saveWin(username) {
  incrementScore(username);
}

// return the current top 10 leaderboard
export function getLeaderboard() {
  return getTopScores();
}
