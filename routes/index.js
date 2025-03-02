// routes/index.js

import { Router } from "express";
import upload from "../middlewares/multerConfig.js";
import validateCSV from "../middlewares/validateCSV.js";
import {
  createRequest,
  getRequestStatus,
} from "../controllers/request.controller.js";

const myRouter = Router();

myRouter.post(
  "/upload-csv",
  upload.single("csvFile"),
  validateCSV,
  createRequest
);

myRouter.get("/status/:id", getRequestStatus);

export default myRouter;
