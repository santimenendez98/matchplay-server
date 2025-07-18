import express from "express";
import dotenv from "dotenv";
import pool from "./db/connection";
import router from "./routes";
import { startScheduleCronJob } from "./cronjobs/scheduleGenerator";

const app = express();
dotenv.config();

app.use(express.json());

app.use("/api", router);

app.listen(Number(process.env.PORT), () => {
  pool
    .connect()
    .then(() => console.log("Connected to the database successfully"));
  console.log(`Server is running on ${process.env.API_URL}${process.env.PORT}`);
  startScheduleCronJob();
});
