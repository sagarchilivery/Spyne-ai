// index.js

import express from "express";
import mongoose from "mongoose";
import myRouter from "./routes/index.js";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "*",
  })
);
app.use(helmet());

app.get("/health", (req, res) => {
  res.send("OK");
});
app.use("/", myRouter);

console.log("process.env.MONGO_URI: ", process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME,
  })
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Error connecting to database", err);
    process.exit(1);
  });
