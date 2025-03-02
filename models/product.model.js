// models/product.model.js

import { Schema } from "mongoose";

const ProductSchema = new Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    },
    serialNumber: { type: Number, required: true },
    productName: { type: String, required: true },
    inputImageUrls: { type: [String], required: true },
    outputImageUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default ProductSchema;
