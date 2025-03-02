//  middlewares/validateCSV.js

import csv from "csv-parser";
import fs from "fs";
import path from "path";

const validateCSV = (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path; // Store file path for deletion if needed
  const requiredHeaders = ["S. No.", "Product Name", "Input Image Urls"];
  const errors = [];
  let isValid = true;

  const handleError = (message) => {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting CSV:", err);
    });
    return res.status(400).json({ error: message, details: errors });
  };

  fs.createReadStream(filePath)
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
        return handleError("Invalid CSV format");
      }
      next();
    })
    .on("error", (err) => {
      console.error("Error processing CSV:", err.message);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting CSV:", unlinkErr);
      });
      res
        .status(500)
        .json({ error: "Error processing CSV", details: err.message });
    });
};

export default validateCSV;
