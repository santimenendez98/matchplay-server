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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  express.json({
    verify: (req: any, res, buffer) => {
      req.rawBody = buffer.toString();
    },
  })
);

// Rutas
app.use("/api", router);

// Socket.IO
export const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", webSocketHandler);

// Conexión a DB y cron jobs
server.listen(port, () => {
  pool
    .connect()
    .then(() => console.log("Connected to the database successfully"));
  console.log(`Server is running on ${port}`);
  startScheduleCronJob();
  handleExpiredPreReserves();
  checkScheduleCronJob();
});

export default app;
