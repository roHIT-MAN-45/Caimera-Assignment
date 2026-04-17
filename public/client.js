const socket = io();

// app state
let username = "";
let isJoined = false;
let isRoundActive = true;
let isSubmitting = false;
let countdown = null;

// dom references
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

// prevent scroll from changing the number input value
answerInput.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

function showScreen(screen) {
  joinScreen.hidden = screen !== "join";
  gameScreen.hidden = screen !== "game";
}

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

function renderLeaderboard(scores) {
  leaderboardList.innerHTML = "";

  if (scores.length === 0) {
    const empty = document.createElement("p");
    empty.className = "board-empty";
    empty.textContent = "No scores yet — be the first to win!";
    leaderboardList.appendChild(empty);
    return;
  }

  for (const [index, entry] of scores.entries()) {
    const item = document.createElement("li");
    const rank = index + 1;
    const wins = entry.wins === 1 ? "1 win" : `${entry.wins} wins`;

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

function join() {
  const name = usernameInput.value.trim();
  if (!name) return;
  username = name;
  joinError.textContent = "";
  socket.emit("join", { username });
}

function submit() {
  if (!isRoundActive || isSubmitting) return;
  const value = answerInput.value.trim();
  if (!value) return;
  isSubmitting = true;
  submitButton.disabled = true;
  socket.emit("submit-answer", { answer: value });
  answerInput.value = "";
}

socket.on("current-question", (data) => {
  if (!isJoined) {
    isJoined = true;
    showScreen("game");
  }
  renderQuestion(data);
});

socket.on("leaderboard", (scores) => {
  renderLeaderboard(scores);
});

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

socket.on("connected-count", (count) => {
  connectedCount.textContent = `${count} player${count === 1 ? "" : "s"} connected`;
});

socket.on("connect", () => {
  statusDot.className = "status-dot connected";
  statusText.textContent = "Connected";
  if (isJoined) socket.emit("join", { username });
});

socket.on("join-error", ({ message }) => {
  joinError.textContent = message;
});

socket.on("disconnect", () => {
  statusDot.className = "status-dot disconnected";
  statusText.textContent = "Disconnected";
});

// button click handlers
joinButton.addEventListener("click", join);
submitButton.addEventListener("click", submit);

// keyboard shortcuts — enter to join or submit
usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") join();
});

answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submit();
});
