import { generateQuestion, checkAnswer } from "./game.js";
import { saveWin, getLeaderboard } from "./scores.js";

const ROUND_PAUSE_MS = 5000;
const ROUND_PAUSE_SECONDS = 5;

// shared round state — single game instance, no horizontal scaling
let question = generateQuestion();
let isLocked = false;
let playerCount = 0;

// maps username → socket.id to handle reconnections without double-counting
const players = new Map();

// wire all socket events to the io instance
export function registerHandlers(io) {
  io.on("connection", (socket) => {
    // register the joining player and send them the current game state
    socket.on("join", ({ username }) => {
      const name = typeof username === "string" ? username.trim() : "";

      if (!name) {
        socket.emit("join-error", { message: "Username cannot be empty." });
        return;
      }

      // reject usernames that exceed the max length enforced on the client
      if (name.length > 20) {
        socket.emit("join-error", { message: "Username must be 20 characters or fewer." });
        return;
      }

      // reject usernames with characters outside letters, numbers, spaces, hyphens, underscores
      if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
        socket.emit("join-error", { message: "Username may only contain letters, numbers, spaces, hyphens, and underscores." });
        return;
      }

      socket.username = name;

      // reconnection: refresh state without incrementing the player count
      if (players.has(name)) {
        players.set(name, socket.id);
        socket.emit("current-question", question);
        socket.emit("leaderboard", getLeaderboard());
        return;
      }

      players.set(name, socket.id);
      playerCount++;
      socket.emit("current-question", question);
      socket.emit("leaderboard", getLeaderboard());
      io.emit("connected-count", playerCount);
    });

    // process an answer submission using a lock to prevent race conditions
    socket.on("submit-answer", ({ answer }) => {
      // reject submissions from sockets that never completed the join flow
      if (!socket.username) {
        socket.emit("server-error", { message: "You must join before submitting." });
        return;
      }

      // reject non-string payloads to prevent trim() throws in checkAnswer
      if (typeof answer !== "string") {
        socket.emit("server-error", { message: "Invalid answer format." });
        return;
      }

      // rate-limit to one submission per second to prevent wrong-answer spam
      const now = Date.now();
      if (socket.lastSubmitTime && now - socket.lastSubmitTime < 1000) return;
      socket.lastSubmitTime = now;

      if (isLocked) return;

      // acquire lock immediately before any async work
      isLocked = true;

      const isCorrect = checkAnswer(answer, question.answer);

      if (isCorrect) {
        try {
          saveWin(socket.username);
          io.emit("round-won", {
            winner: socket.username,
            answer,
            leaderboard: getLeaderboard(),
          });
          io.emit("round-pause", { duration: ROUND_PAUSE_SECONDS });

          // advance to the next question after the pause
          setTimeout(() => {
            question = generateQuestion();
            isLocked = false;
            io.emit("new-question", question);
          }, ROUND_PAUSE_MS);
        } catch (error) {
          isLocked = false;
          socket.emit("server-error", { message: "Something went wrong. Please try again." });
          console.error("submit-answer error:", error);
        }

        return;
      }

      // wrong answer — release lock so others can still submit
      isLocked = false;
      socket.emit("wrong-answer");
    });

    // remove the player when they disconnect, only if this socket owns the entry
    socket.on("disconnect", () => {
      if (!socket.username) return;
      if (players.get(socket.username) !== socket.id) return;

      players.delete(socket.username);
      playerCount = Math.max(0, playerCount - 1);
      io.emit("connected-count", playerCount);
    });
  });
}
