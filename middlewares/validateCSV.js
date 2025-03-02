// middlewares/validateCSV.js

import csv from "csv-parser";
import fs from "fs";

const validateCSV = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const requiredHeaders = ["S. No.", "Product Name", "Input Image Urls"];
  const errors = [];
  let isValid = true;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("headers", (headers) => {
      const missingHeaders = requiredHeaders.filter(
        (header) => !headers.includes(header)
      );
      if (missingHeaders.length > 0) {
        isValid = false;
        errors.push(`Missing headers: ${missingHeaders.join(", ")}`);
      }
    })
    .on("data", (row) => {
      if (
        !row["S. No."] ||
        isNaN(Number(row["S. No."])) ||
        row["S. No."].trim() === ""
      ) {
        isValid = false;
        errors.push(`Invalid or missing S. No. in row: ${JSON.stringify(row)}`);
      }
      if (!row["Product Name"] || row["Product Name"].trim() === "") {
        isValid = false;
        errors.push(
          `Invalid or missing Product Name in row: ${JSON.stringify(row)}`
        );
      }
      if (!row["Input Image Urls"] || row["Input Image Urls"].trim() === "") {
        isValid = false;
        errors.push(
          `Invalid or missing Input Image Urls in row: ${JSON.stringify(row)}`
        );
      }
    })
    .on("end", () => {
      if (!isValid) {
        return res
          .status(400)
          .json({ error: "Invalid CSV format", details: errors });
      }
      next();
    })
    .on("error", (err) => {
      res
        .status(500)
        .json({ error: "Error processing CSV", details: err.message });
    });
};

export default validateCSV;
