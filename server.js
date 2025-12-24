import mongoose from "mongoose";
import app from "./index.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("DB error:", err));

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
