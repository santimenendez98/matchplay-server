import express from "express";
import dotenv from "dotenv";
import pool from "./db/connection";
import router from "./routes";
import {
  checkScheduleCronJob,
  startScheduleCronJob,
} from "./cronjobs/scheduleGenerator";
import handleExpiredPreReserves from "./cronjobs/preReserveCronJob";
import { createServer } from "http";
import { Server } from "socket.io";
import { webSocketHandler } from "./services/webSocket";

// Initialize Express app and Socket.IO server
const port = Number(process.env.PORT) || 3000;
const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
});

dotenv.config();

app.use(express.json());

app.use("/api", router);

// Connect to the database and start the server
server.listen(port, () => {
  pool
    .connect()
    .then(() => console.log("Connected to the database successfully"));
  console.log(`Server is running on ${port}`);
  startScheduleCronJob();
  handleExpiredPreReserves();
  checkScheduleCronJob();
});

// Set up WebSocket connection
io.on("connection", webSocketHandler);
