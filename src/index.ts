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
import { socketAuthMiddleware, webSocketHandler } from "./services/webSocket";
import logger, { httpLogger } from "./services/logger";
import cors from "cors";

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const app = express();
const server = createServer(app);

// Configurar orígenes permitidos
const origin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || [];

// ⚡ IMPORTANTE: usar CORS ANTES de las rutas
app.use(
  cors({
    origin: origin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(httpLogger);

// Rutas
app.use("/api", router);

// Socket.IO
export const io = new Server(server, {
  cors: {
    origin: origin,
    methods: ["GET", "POST"],
  },
});

io.use(socketAuthMiddleware);
io.on("connection", webSocketHandler);

// Conexión a DB y cron jobs
server.listen(port, () => {
  pool
    .connect()
    .then(() => logger.info("Connected to the database successfully"))
    .catch((err) => logger.error({ err }, "Database connection failed"));
  logger.info({ port }, "Server is running");

  // node-cron does not run on serverless platforms (Vercel) — see
  // /api/cron endpoints invoked by Vercel Cron.
  if (process.env.DISABLE_CRON !== "true") {
    startScheduleCronJob();
    handleExpiredPreReserves();
    checkScheduleCronJob();
  }
});
