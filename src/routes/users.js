// Import Express router for defining routes
import express from "express";
// Import bcrypt for password hashing and comparison
import bcrypt from "bcrypt";
// Import JWT for creating authentication tokens
import jwt from "jsonwebtoken";
// Import database connection pool
import db from "../config/database.js";
// Import authentication middleware to protect routes
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/users/register
 * Register a new user account
 * Public route - no authentication required
 * Hashes password before storing in database
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Hash password with bcrypt using 10 salt rounds
    // Salt rounds determine computational cost (higher = more secure but slower)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database with hashed password
    const [result] = await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: "User created", userId: result.insertId });
  } catch (error) {
    // May fail due to duplicate username/email (UNIQUE constraint)
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users/login
 * Authenticate user and return JWT token
 * Public route - no authentication required
 * Verifies credentials and returns token for future authenticated requests
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      // Return generic error message to prevent email enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // Compare provided password with hashed password in database
    // bcrypt.compare handles the hashing and comparison securely
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      // Return generic error message (don't reveal if email or password is wrong)
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create JWT token with user data
    // Token contains user id and email, signed with secret key
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" } // Token expires after 24 hours
    );

    // Return token and user info (excluding password)
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/profile
 * Get the authenticated user's profile information
 * Protected route - requires valid JWT token
 * Returns user data without password
 */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    // Get user data based on authenticated user's ID (from JWT token)
    // SELECT only safe fields (exclude password)
    const [users] = await db.query(
      "SELECT id, username, email FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
