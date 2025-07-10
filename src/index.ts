import express from "express";
import dotenv from "dotenv";
import pool from "./db";

const app = express();
dotenv.config();

app.use(express.json());

app.listen(Number(process.env.PORT), () => {
  pool
    .connect()
    .then(() => console.log("Connected to the database successfully"));
  console.log(`Server is running on ${process.env.API_URL}${process.env.PORT}`);
});
