# MERN API Documentation

## Overview
This API allows users to upload a CSV file containing product details and image URLs, process the data asynchronously using a queue, and retrieve the processing status.

## Features
- Upload CSV files containing product details.
- Process images asynchronously using a queue system.
- Retrieve the status of processed requests.
- Scalable with Redis-based queue processing.
- Stores processed images on Cloudinary.
- Supports Docker Compose for easy deployment.

## Technologies Used
- Node.js
- Express.js
- MongoDB with Mongoose
- Redis with BullMQ
- Cloudinary for image storage
- Sharp for image processing
- Multer for file uploads
- CSV-Parser for CSV parsing
- Docker & Docker Compose

## Installation

### Prerequisites
- Node.js and npm installed
- MongoDB instance running
- Redis instance running
- Docker installed (for Docker Compose deployment)

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo-name.git
   cd your-repo-name
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure environment variables in a `.env` file:
   ```sh
   PORT=8080
   MONGO_URI=<MongoDB Connection String>
   DB_NAME=<MongoDB Database Name>
   CLOUDINARY_CLOUD_NAME=<Cloudinary Cloud Name>
   CLOUDINARY_API_KEY=<Cloudinary API Key>
   CLOUDINARY_API_SECRET=<Cloudinary API Secret>
   REDIS_HOST=<Redis Host>
   REDIS_PORT=<Redis Port>
   ```
4. Start the server:
   ```sh
   npm start
   ```

### Using Docker Compose
To run the application using Docker Compose:
1. Ensure Docker and Docker Compose are installed.
2. Run the following command:
   ```sh
   docker-compose up -d
   ```
This will start MongoDB, Redis, and the application in containers.

## API Endpoints

### Health Check
**Endpoint:** `GET /health`

**Description:** Checks if the server is running.

**Response:**
```json
"OK"
```

### Upload CSV File
**Endpoint:** `POST /upload-csv`

**Description:** Uploads a CSV file and starts processing it asynchronously.

**Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
- `csvFile` (file, required) - A CSV file containing the required fields:
  - `S. No.`
  - `Product Name`
  - `Input Image Urls`

**Response:**
```json
{
  "request_id": "65fb2bc9f6e4a7b123456789",
  "message": "CSV processing started."
}
```

**Error Responses:**
- `400 Bad Request` if no file is uploaded.
- `400 Bad Request` if CSV headers are missing or incorrect.
- `500 Internal Server Error` if there is a server error.

### Get Request Status
**Endpoint:** `GET /status/:id`

**Description:** Gets the status of a CSV processing request.

**Path Parameters:**
- `id` (string, required) - The request ID returned from `/upload-csv`

**Response:**
```json
{
  "request_id": "65fb2bc9f6e4a7b123456789",
  "status": "processing",
  "outputCsvUrl": null
}
```

**Status Values:**
- `pending` - The request is in queue.
- `processing` - The request is being processed.
- `completed` - The request is completed successfully.
- `failed` - The request failed.

**Error Responses:**
- `400 Bad Request` if the request ID is invalid.
- `404 Not Found` if the request ID is not found.
- `500 Internal Server Error` if there is a server error.

## Important Note
If you are using the deployed URL, please upload only small CSV files. The EC2 machine is a free-tier instance and cannot handle large CSV files, which may cause it to crash due to limited computational resources.


## License
This project is licensed under the MIT License.

