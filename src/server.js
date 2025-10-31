// Import required packages
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import createTables from "./config/init.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and create tables if they don't exist
await createTables();

// Middleware setup
// Helmet: Adds security headers to protect against common vulnerabilities
app.use(helmet());

// CORS: Enable Cross-Origin Resource Sharing for frontend communication
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Rate limiting: Prevent abuse by limiting requests per IP
// Allows 100 requests per 15 minutes per IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 100, // Maximum 100 requests per windowMs
});
app.use(limiter);

// Routes
// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "API is running!" });
});

// User management routes (register, login, profile, etc.)
app.use("/api/users", userRoutes);

// Post management routes (create, read, update, delete posts)
app.use("/api/posts", postRoutes);

// Start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
