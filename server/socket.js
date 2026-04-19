import { generateQuestion, checkAnswer } from "./game.js";
import { saveWin, getLeaderboard } from "./scores.js";

const ROUND_PAUSE_MS = 5000;
const ROUND_PAUSE_SECONDS = 5;
// TODO: remove before deploy — change back to 150 for production
const ANSWER_WINDOW_MS = 3000;

// current game state for one active game
let question = generateQuestion();
let isLocked = false;
let playerCount = 0;
let candidates = [];
let roundWindow = null;

// map username to socket id to manage reconnects correctly
const players = new Map();

// register all socket events
export function registerHandlers(io) {
  io.on("connection", (socket) => {
    // measure round-trip time immediately on connection
    socket.emit("latency-ping", Date.now());
    socket.on("latency-pong", (sentAt) => {
      socket.rtt = Date.now() - sentAt;

      // TODO: remove before deploy — debug log
      console.log(`RTT for socket ${socket.id}: ${socket.rtt}ms`);
    });

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

      // TODO: remove before deploy — simulates 500ms latency for "John" to test RTT compensation
      if (name === "John") {
        const originalEmit = socket.emit.bind(socket);
        socket.emit = (...args) => setTimeout(() => originalEmit(...args), 500);

        // re-measure RTT now that delay is applied
        socket.emit("latency-ping", Date.now());
      }

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

    // handle answer submission with RTT-compensated acceptance window
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

      // block only after window has closed, allow submissions during collection
      if (isLocked && !roundWindow) return;

      const isCorrect = checkAnswer(answer, question.answer);

      if (!isCorrect) {
        socket.emit("wrong-answer");
        return;
      }

      // estimate when the player actually submitted by subtracting one-way latency
      const adjustedTime = now - Math.floor((socket.rtt ?? 0) / 2);
      candidates.push({
        username: socket.username,
        answer,
        adjustedTime,
        arrivedAt: now,
      });

      // open acceptance window on the first correct answer
      if (!roundWindow) {
        isLocked = true;

        roundWindow = setTimeout(() => {
          // pick the candidate with the earliest estimated submission time
          candidates.sort((a, b) => a.adjustedTime - b.adjustedTime);
          const winner = candidates[0];

          // TODO: remove before deploy — debug logs for RTT compensation testing
          const earliest = candidates[0].arrivedAt;

          const divider = "─────────────────────────────────────";

          console.log(`\n${divider}`);
          console.log("Round resolved");
          console.log(divider);

          candidates.forEach((c) => {
            const arrival = c.arrivedAt - earliest;
            const rtt = Math.floor((c.arrivedAt - c.adjustedTime) * 2);
            const isWinner = c.username === winner.username;

            const adjusted = isWinner
              ? `${arrival - Math.floor(rtt / 2)}ms`
              : `+${c.adjustedTime - winner.adjustedTime}ms`;

            console.log(
              `${isWinner ? "🏆" : "  "} ${c.username.padEnd(14)} ` +
                `| arrived: +${arrival}ms ` +
                `| rtt: ~${rtt}ms ` +
                `| adjusted: ${adjusted}`,
            );
          });

          console.log(divider);
          console.log(`Winner: ${winner.username}`);
          console.log(`${divider}\n`);

          try {
            saveWin(winner.username);

            io.emit("round-won", {
              winner: winner.username,
              answer: winner.answer,
              leaderboard: getLeaderboard(),
            });

            // pause game before next round
            io.emit("round-pause", { duration: ROUND_PAUSE_SECONDS });

            // reset window state and create new question after pause
            setTimeout(() => {
              candidates = [];
              roundWindow = null;
              question = generateQuestion();
              isLocked = false;
              io.emit("new-question", question);
            }, ROUND_PAUSE_MS);
          } catch (error) {
            // reset all state if error happens
            candidates = [];
            roundWindow = null;
            isLocked = false;
            socket.emit("server-error", {
              message: "Something went wrong. Please try again.",
            });
            console.error("submit-answer error:", error);
          }
        }, ANSWER_WINDOW_MS);
      }
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
