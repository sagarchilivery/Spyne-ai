// // controllers/request.controller.js
import fs from "fs";
import path from "path";
import csv from "fast-csv";
import axios from "axios";
import mime from "mime-types";
import sharp from "sharp";
import { Queue, Worker } from "bullmq";
import cloudinary from "../utils/cloudinaryConfig.js";
import Request from "../models/request.model.js";
import { isValidObjectId } from "mongoose";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
};

const requestQueue = new Queue("requestQueue", { connection });

export async function createRequest(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded" });
  }

  try {
    const request = await Request.create({ status: "pending" });

    await requestQueue.add("processRequest", {
      requestId: request._id,
      filePath: req.file.path,
    });

    res.json({ request_id: request._id, message: "CSV processing started." });
  } catch (error) {
    console.error("Error adding job to queue:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getRequestStatus = async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid request ID" });
  }

  try {
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      request_id: request._id,
      status: request.status,
      outputCsvUrl: request.outputCsvUrl,
    });
  } catch (error) {
    console.error("Error fetching request status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const worker = new Worker(
  "requestQueue",
  async (job) => {
    const { requestId, filePath } = job.data;
    const outputDir = "downloads";

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    await Request.findByIdAndUpdate(requestId, { status: "processing" });
    const results = [];
    const downloadedFiles = [];

    try {
      const rows = await new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(filePath)
          .pipe(csv.parse({ headers: true }))
          .on("data", (row) => data.push(row))
          .on("end", () => resolve(data))
          .on("error", reject);
      });

      await Promise.all(
        rows.map(async (row) => {
          const imageUrls = row["Input Image Urls"];
          if (!imageUrls) return;

          const urls = imageUrls.split(",").map((url) => url.trim());
          let cloudinaryUrls = [];

          for (const imageUrl of urls) {
            if (!imageUrl) continue;
            try {
              const response = await axios.get(imageUrl, {
                responseType: "arraybuffer",
              });
              const mimeType = response.headers["content-type"];
              const fileExtension = mime.extension(mimeType) || "jpg";
              const fileName = `${Date.now()}-${
                path.basename(imageUrl).split("?")[0]
              }.${fileExtension}`;
              const filePath = path.join(outputDir, fileName);

              const compressedImage = await sharp(response.data)
                .resize({ width: 500 })
                .jpeg({ quality: 50 })
                .toBuffer();

              fs.writeFileSync(filePath, compressedImage);
              downloadedFiles.push(filePath);

              const uploadResponse = await cloudinary.uploader.upload(
                filePath,
                {
                  folder: "compressed_images",
                  resource_type: "image",
                }
              );

              cloudinaryUrls.push(uploadResponse.secure_url);
            } catch (error) {
              console.error(`Error processing ${imageUrl}:`, error.message);
            }
          }

          row["Output Image Urls"] = cloudinaryUrls.join(", ");
          results.push(row);
        })
      );

      const tempCsvFilePath = filePath;

      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(tempCsvFilePath);
        csv
          .write(results, { headers: true })
          .pipe(ws)
          .on("finish", resolve)
          .on("error", reject);
      });

      const cloudinaryCsv = await cloudinary.uploader.upload(tempCsvFilePath, {
        folder: "csv_outputs",
        resource_type: "raw",
      });

      await Request.findByIdAndUpdate(requestId, {
        status: "completed",
        outputCsvUrl: cloudinaryCsv.secure_url,
      });

      fs.unlink(
        tempCsvFilePath,
        (err) => err && console.error("Error deleting CSV:", err)
      );
      downloadedFiles.forEach((file) =>
        fs.unlink(
          file,
          (err) => err && console.error("Error deleting image:", err)
        )
      );
    } catch (error) {
      console.error("Worker error:", error);
      await Request.findByIdAndUpdate(requestId, { status: "failed" });
    }
  },
  { connection }
);

worker.on("failed", (job, err) => console.error(`Job failed: ${job.id}`, err));
