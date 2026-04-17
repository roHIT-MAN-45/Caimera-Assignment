import "dotenv/config";
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHandlers } from "./server/socket.js";

// get current directory path
const dir = dirname(fileURLToPath(import.meta.url));

// create express app and http server
const app = express();
const server = http.createServer(app);

// setup socket io with open cors for development and deployment
const io = new Server(server, { cors: { origin: "*" } });

// serve static frontend files from public folder
app.use(express.static(join(dir, "public")));

// register all socket event handlers
registerHandlers(io);

// start server on given port or default
const port = process.env.PORT ?? 3000;

server.listen(port, () => {
  console.log(`server running on port ${port}`);
});
