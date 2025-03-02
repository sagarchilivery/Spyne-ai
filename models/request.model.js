// models/request.model.js

import { model, Schema } from "mongoose";

const RequestSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    outputCsvUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default model("Request", RequestSchema);
