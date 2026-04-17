import "dotenv/config";
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHandlers } from "./server/socket.js";

const dir = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// allow all origins so local dev and deployed environments both work
const io = new Server(server, { cors: { origin: "*" } });

// serve the frontend from the public folder
app.use(express.static(join(dir, "public")));

registerHandlers(io);

const port = process.env.PORT ?? 3000;
server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
