// Import JWT library for token verification
import jwt from "jsonwebtoken";

/**
 * Authentication middleware to protect routes
 * Verifies JWT token from Authorization header and adds user info to request
 * Usage: Add this middleware to routes that require authentication
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    // Optional chaining (?.) safely handles missing header
    const token = req.headers.authorization?.split(" ")[1];

    // If no token is provided, return 401 Unauthorized
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token signature and expiration using secret key
    // Throws error if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user information to request object
    // This makes user data available in subsequent route handlers
    req.user = decoded;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Catch any JWT verification errors (invalid signature, expired, malformed, etc.)
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default authMiddleware;
