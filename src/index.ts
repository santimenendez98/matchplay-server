import express from "express";
import dotenv from "dotenv";

const app = express();
dotenv.config();

app.use(express.json());

app.get("/", (req, res) => {
  console.log("Welcome to the Matchplay Server!");
});

app.listen(() => {
  console.log(`Server is running on ${process.env.API_URL}${process.env.PORT}`);
});
