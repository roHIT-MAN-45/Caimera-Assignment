const socket = io();

// app state values
let username = "";
let isJoined = false;
let isRoundActive = true;
let isSubmitting = false;
let countdown = null;

// get all dom elements
const joinScreen = document.getElementById("join-screen");
const gameScreen = document.getElementById("game-screen");
const usernameInput = document.getElementById("username-input");
const joinButton = document.getElementById("join-btn");
const joinError = document.getElementById("join-error");
const questionDifficulty = document.getElementById("question-difficulty");
const questionDisplay = document.getElementById("question-display");
const answerInput = document.getElementById("answer-input");
const submitButton = document.getElementById("submit-btn");
const resultMessage = document.getElementById("result-msg");
const countdownTimer = document.getElementById("countdown");
const leaderboardList = document.getElementById("board-list");
const connectedCount = document.getElementById("count-label");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// stop scroll from changing number input
answerInput.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

// switch between join and game screen
function showScreen(screen) {
  joinScreen.hidden = screen !== "join";
  gameScreen.hidden = screen !== "game";
}

// show question on screen
function renderQuestion(data) {
  const label = data.tier
    ? data.tier.charAt(0).toUpperCase() + data.tier.slice(1)
    : "";

  questionDifficulty.textContent = label;
  questionDifficulty.className = data.tier ?? "";
  questionDisplay.textContent = data.text;

  questionDisplay.classList.add("question-enter");
  setTimeout(() => questionDisplay.classList.remove("question-enter"), 400);

  answerInput.value = "";
  resultMessage.textContent = "";
  resultMessage.className = "";
  answerInput.focus();
}

// show leaderboard list
function renderLeaderboard(scores) {
  leaderboardList.innerHTML = "";

  // show empty message if no scores
  if (scores.length === 0) {
    const empty = document.createElement("p");
    empty.className = "board-empty";
    empty.textContent = "No scores yet — be the first to win!";
    leaderboardList.appendChild(empty);
    return;
  }

  // render each player entry
  for (const [index, entry] of scores.entries()) {
    const item = document.createElement("li");
    const rank = index + 1;
    const wins = entry.wins === 1 ? "1 win" : `${entry.wins} wins`;

    // highlight current user
    if (entry.username === username) item.classList.add("me");

    item.innerHTML = `
      <span class="rank">#${rank}</span>
      <span class="player-name">${entry.username}</span>
      <span class="wins-pill">${wins}</span>
    `;

    leaderboardList.appendChild(item);
    requestAnimationFrame(() => item.classList.add("animate-in"));
  }
}

// start countdown for next round
function startCountdown(seconds) {
  clearInterval(countdown);

  let remaining = seconds;
  countdownTimer.textContent = `Next question in ${remaining}s`;

  countdown = setInterval(() => {
    remaining--;

    if (remaining <= 0) {
      clearInterval(countdown);
      countdownTimer.textContent = "";
      return;
    }

    countdownTimer.textContent = `Next question in ${remaining}s`;
  }, 1000);
}

// send join request
function join() {
  const name = usernameInput.value.trim();
  if (!name) return;

  username = name;
  joinError.textContent = "";
  socket.emit("join", { username });
}

// send answer to server
function submit() {
  if (!isRoundActive || isSubmitting) return;

  const value = answerInput.value.trim();
  if (!value) return;

  isSubmitting = true;
  submitButton.disabled = true;

  socket.emit("submit-answer", { answer: value });
  answerInput.value = "";
}

// reflect latency ping immediately for RTT measurement
socket.on("latency-ping", (sentAt) => {
  socket.emit("latency-pong", sentAt);
});

// receive current question on join
socket.on("current-question", (data) => {
  if (!isJoined) {
    isJoined = true;
    showScreen("game");
  }

  renderQuestion(data);
});

// receive leaderboard data
socket.on("leaderboard", (scores) => {
  renderLeaderboard(scores);
});

// receive new question after round ends
socket.on("new-question", (data) => {
  clearInterval(countdown);
  countdownTimer.textContent = "";

  isRoundActive = true;
  isSubmitting = false;

  answerInput.disabled = false;
  submitButton.disabled = false;

  resultMessage.textContent = "";
  resultMessage.className = "";

  renderQuestion(data);
});

// handle round winner
socket.on("round-won", ({ winner, answer, leaderboard }) => {
  isSubmitting = false;
  isRoundActive = false;

  answerInput.disabled = true;
  submitButton.disabled = true;

  const isWinner = winner === username;

  resultMessage.textContent = isWinner
    ? `You got it! The answer was ${answer}.`
    : `${winner} answered first. The answer was ${answer}.`;

  resultMessage.className = isWinner ? "win" : "loss";

  renderLeaderboard(leaderboard);
  startCountdown(5);
});

// handle wrong answer
socket.on("wrong-answer", () => {
  isSubmitting = false;
  submitButton.disabled = false;

  resultMessage.textContent = "Wrong answer, try again!";
  resultMessage.className = "wrong";

  setTimeout(() => {
    resultMessage.textContent = "";
    resultMessage.className = "";
  }, 2000);
});

// update connected players count
socket.on("connected-count", (count) => {
  connectedCount.textContent = `${count} player${count === 1 ? "" : "s"} connected`;
});

// update status on connect
socket.on("connect", () => {
  statusDot.className = "status-dot connected";
  statusText.textContent = "Connected";

  // rejoin automatically if already joined
  if (isJoined) socket.emit("join", { username });
});

// show join error message
socket.on("join-error", ({ message }) => {
  joinError.textContent = message;
});

// update status on disconnect
socket.on("disconnect", () => {
  statusDot.className = "status-dot disconnected";
  statusText.textContent = "Disconnected";
});

// button click events
joinButton.addEventListener("click", join);
submitButton.addEventListener("click", submit);

// enter key to join
usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") join();
});

// enter key to submit answer
answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submit();
});
