import { generateQuestion, checkAnswer } from "./game.js";
import { saveWin, getLeaderboard } from "./scores.js";

const ROUND_PAUSE_MS = 5000;
const ROUND_PAUSE_SECONDS = 5;

// current game state for one active game
let question = generateQuestion();
let isLocked = false;
let playerCount = 0;

// map username to socket id to manage reconnects correctly
const players = new Map();

// register all socket events
export function registerHandlers(io) {
  io.on("connection", (socket) => {
    // handle player joining and send current game data
    socket.on("join", ({ username }) => {
      const name = typeof username === "string" ? username.trim() : "";

      // username must not be empty
      if (!name) {
        socket.emit("join-error", { message: "Username cannot be empty." });
        return;
      }

      // limit username length
      if (name.length > 20) {
        socket.emit("join-error", {
          message: "Username must be 20 characters or fewer.",
        });
        return;
      }

      // allow only simple characters in username
      if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
        socket.emit("join-error", {
          message:
            "Username may only contain letters, numbers, spaces, hyphens, and underscores.",
        });
        return;
      }

      socket.username = name;

      // if player reconnects update socket id without increasing count
      if (players.has(name)) {
        players.set(name, socket.id);
        socket.emit("current-question", question);
        socket.emit("leaderboard", getLeaderboard());
        return;
      }

      // new player joins the game
      players.set(name, socket.id);
      playerCount++;

      socket.emit("current-question", question);
      socket.emit("leaderboard", getLeaderboard());
      io.emit("connected-count", playerCount);
    });

    // handle answer submission and prevent race conditions
    socket.on("submit-answer", ({ answer }) => {
      // player must join before submitting
      if (!socket.username) {
        socket.emit("server-error", {
          message: "You must join before submitting.",
        });
        return;
      }

      // answer must be a string
      if (typeof answer !== "string") {
        socket.emit("server-error", { message: "Invalid answer format." });
        return;
      }

      // limit to one submission per second
      const now = Date.now();
      if (socket.lastSubmitTime && now - socket.lastSubmitTime < 1000) return;
      socket.lastSubmitTime = now;

      // block if another answer is being processed
      if (isLocked) return;

      // lock before checking answer
      isLocked = true;

      const isCorrect = checkAnswer(answer, question.answer);

      if (isCorrect) {
        try {
          // save win and notify all players
          saveWin(socket.username);

          io.emit("round-won", {
            winner: socket.username,
            answer,
            leaderboard: getLeaderboard(),
          });

          // pause game before next round
          io.emit("round-pause", { duration: ROUND_PAUSE_SECONDS });

          // create new question after pause
          setTimeout(() => {
            question = generateQuestion();
            isLocked = false;
            io.emit("new-question", question);
          }, ROUND_PAUSE_MS);
        } catch (error) {
          // unlock if error happens
          isLocked = false;
          socket.emit("server-error", {
            message: "Something went wrong. Please try again.",
          });
          console.error("submit-answer error:", error);
        }

        return;
      }

      // wrong answer unlock so others can try
      isLocked = false;
      socket.emit("wrong-answer");
    });

    // handle player disconnect and update count
    socket.on("disconnect", () => {
      if (!socket.username) return;

      // only remove if this socket owns the username
      if (players.get(socket.username) !== socket.id) return;

      players.delete(socket.username);
      playerCount = Math.max(0, playerCount - 1);

      io.emit("connected-count", playerCount);
    });
  });
}
