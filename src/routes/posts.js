// Import Express router for defining routes
import express from "express";
// Import database connection pool
import db from "../config/database.js";
// Import authentication middleware to protect routes
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/posts
 * Get all posts from the database
 * Public route - no authentication required
 * Returns posts ordered by creation date (newest first)
 */
router.get("/", async (req, res) => {
  try {
    const [posts] = await db.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/posts/:id
 * Get a single post by ID
 * Public route - no authentication required
 * Returns 404 if post doesn't exist
 */
router.get("/:id", async (req, res) => {
  try {
    const [posts] = await db.query("SELECT * FROM posts WHERE id = ?", [
      req.params.id,
    ]);
    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(posts[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/posts
 * Create a new post
 * Protected route - requires valid JWT token
 * Automatically associates post with authenticated user
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    // Insert post with user_id from authenticated user (req.user.id)
    const [result] = await db.query(
      "INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)",
      [title, content, req.user.id]
    );
    res.status(201).json({ message: "Post created", postId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/posts/:id
 * Update an existing post
 * Protected route - requires valid JWT token
 * Users can only update their own posts (checked via user_id)
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    // Update only if post exists AND belongs to the authenticated user
    const [result] = await db.query(
      "UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?",
      [title, content, req.params.id, req.user.id]
    );

    // If no rows affected, either post doesn't exist or user doesn't own it
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    res.json({ message: "Post updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/posts/:id
 * Delete a post
 * Protected route - requires valid JWT token
 * Users can only delete their own posts (checked via user_id)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Delete only if post exists AND belongs to the authenticated user
    const [result] = await db.query(
      "DELETE FROM posts WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    // If no rows affected, either post doesn't exist or user doesn't own it
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
