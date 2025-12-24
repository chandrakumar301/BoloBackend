import express from "express";
import cors from "cors";
import connectDB from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

// connect DB
connectDB();

app.get("/", (req, res) => {
  res.send("BoloForms backend running!");
});

export default app;
