import { incrementScore, getTopScores } from "./db.js";

// increase score for a player after a win
export function saveWin(username) {
  incrementScore(username);
}

// return current top players leaderboard
export function getLeaderboard() {
  return getTopScores();
}
