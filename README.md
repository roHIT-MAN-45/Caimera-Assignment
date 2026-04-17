# Mathly

> Real-time multiplayer math quiz. First correct answer wins the round.

---

## What It Is

Mathly is a competitive multiplayer math game where players race to submit the correct answer before everyone else. Questions are generated in real time across three difficulty tiers. The first to answer correctly wins the round and climbs the leaderboard. Scores persist across sessions.

---

## Features

- Real-time multiplayer via WebSockets — no page refresh needed
- Three difficulty tiers with procedurally generated questions
- Persistent leaderboard with top 10 players and win counts
- Live player count display
- Round locking to prevent race condition wins
- Per-socket rate limiting (one submission per second)
- Reconnection handling — rejoin mid-session without losing your spot
- Responsive layout — desktop, tablet, and mobile

---

## Difficulty Tiers

| Tier   | Question Type                                   | Example           |
| ------ | ----------------------------------------------- | ----------------- |
| Easy   | Addition and subtraction (1–20)                 | `14 + 7 = ?`      |
| Medium | Multiplication and whole-number division (2–12) | `8 × 9 = ?`       |
| Hard   | Order of operations with parentheses            | `(3 + 5) × 4 = ?` |

---

## Tech Stack

**Backend**

- [Node.js](https://nodejs.org) — runtime
- [Express 5](https://expressjs.com) — HTTP server
- [Socket.IO 4](https://socket.io) — real-time bidirectional events
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — synchronous SQLite for the leaderboard
- [dotenv](https://github.com/motdotla/dotenv) — environment configuration

**Frontend**

- Vanilla HTML5, CSS3, and JavaScript (ES modules)
- Socket.IO client

---

## Project Structure

```
caimera/
├── server.js              # app entry point
├── server/
│   ├── socket.js          # socket event handling
│   ├── game.js            # questions and answers
│   ├── db.js              # data access layer
│   └── scores.js          # leaderboard queries
└── public/
    ├── index.html          # markup
    ├── client.js           # client logic
    └── style.css           # styling
```

---

## Getting Started

**Prerequisites:** Node.js v16 or later.

```bash
# install dependencies
npm install

# copy the example env and configure
cp .env.example .env

# start the development server (auto-reloads on changes)
npm run dev

# or run in production mode
npm start
```

The server listens on `http://localhost:3000` by default.

---

## Configuration

Create a `.env` file in the project root:

```env
PORT=3000
```

| Variable | Default | Description             |
| -------- | ------- | ----------------------- |
| `PORT`   | `3000`  | Port the server runs on |

The SQLite database (`quiz.db`) is created automatically on first run. It is excluded from version control.

---

## Testing Multiplayer Locally

1. Start the server with `npm run dev`
2. Open `http://localhost:3000` in two or more browser tabs
3. Enter a different username in each tab
4. All tabs receive the same question simultaneously — race to answer
