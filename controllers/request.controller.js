// // controllers/request.controller.js

import fs from "fs";
import path from "path";
import csv from "fast-csv";
import axios from "axios";
import mime from "mime-types";
import sharp from "sharp";
import cloudinary from "../utils/cloudinaryConfig.js";
import Request from "../models/request.model.js"; // Import the Request model
import { isValidObjectId } from "mongoose";

export async function createRequest(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded" });
  }

  try {
    // Create a new request entry in the database
    const request = await Request.create({ status: "pending" });

    const csvFilePath = req.file.path;
    const outputDir = "downloads";

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const results = [];
    const downloadedFiles = [];
    const rows = await new Promise((resolve, reject) => {
      const data = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv.parse({ headers: true }))
        .on("data", (row) => data.push(row))
        .on("end", () => resolve(data))
        .on("error", reject);
    });

    // Update request status to "processing"
    await Request.findByIdAndUpdate(request._id, { status: "processing" });

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

            // Compress the image
            const compressedImage = await sharp(response.data)
              .resize({ width: Math.round(0.5 * 1000) })
              .jpeg({ quality: 50 })
              .toBuffer();

            fs.writeFileSync(filePath, compressedImage);
            downloadedFiles.push(filePath); // Track downloaded files

            // Upload to Cloudinary
            const uploadResponse = await cloudinary.uploader.upload(filePath, {
              folder: "compressed_images",
              resource_type: "image",
            });

            cloudinaryUrls.push(uploadResponse.secure_url);
          } catch (error) {
            console.error(`Error processing ${imageUrl}:`, error.message);
          }
        }

        row["Output Image Urls"] = cloudinaryUrls.join(", ");
        results.push(row);
      })
    );

    // Generate output CSV file
    const tempCsvFilePath = csvFilePath.replace(".csv", `_${Date.now()}.csv`);

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(tempCsvFilePath);
      csv
        .write(results, { headers: true })
        .pipe(ws)
        .on("finish", resolve)
        .on("error", reject);
    });

    // Upload final CSV to Cloudinary
    const cloudinaryCsv = await cloudinary.uploader.upload(tempCsvFilePath, {
      folder: "csv_outputs",
      resource_type: "raw",
    });

    // Update request status to "completed" and store CSV URL
    await Request.findByIdAndUpdate(request._id, {
      status: "completed",
      outputCsvUrl: cloudinaryCsv.secure_url,
    });

    // Cleanup local files
    fs.unlink(tempCsvFilePath, (err) => {
      if (err)
        console.error(`Error deleting CSV file: ${tempCsvFilePath}`, err);
    });

    downloadedFiles.forEach((file) => {
      fs.unlink(file, (err) => {
        if (err) console.error(`Error deleting image file: ${file}`, err);
      });
    });

    res.json({
      request_id: request._id,
      message: "CSV processing completed. Download available.",
      outputCsvUrl: cloudinaryCsv.secure_url,
    });
  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).json({ message: "Internal server error" });

    // Update request status to "failed"
    await Request.findByIdAndUpdate(request._id, { status: "failed" });
  }
}

export const getRequestStatus = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Request ID is required" });
  }

  if (!isValidObjectId(id)) {
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
