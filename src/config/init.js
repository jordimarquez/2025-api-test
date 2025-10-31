// Import MySQL2 with promise support for async/await
import mysql from "mysql2/promise";
// Import bcrypt for password hashing
import bcrypt from "bcrypt";
import dotenv from "dotenv";
// Import mock data for initial database population
import { mockUsers, mockPosts } from "./mockData.js";

// Load environment variables from .env file
dotenv.config();

/**
 * Creates database, tables, and populates with initial mock data if empty
 * This function runs on server startup to ensure database schema exists
 */
const createTables = async () => {
  // Create a connection without specifying a database
  // This allows us to create the database if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Create database if it doesn't exist
    // Uses backticks to safely handle database names with special characters
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
    );
    console.log("✓ Database ready");

    // Switch to the newly created or existing database
    await connection.query(`USE \`${process.env.DB_NAME}\``);

    // Create users table with fields for authentication and user info
    await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Users table ready");

    // Create posts table with foreign key relationship to users
    // ON DELETE CASCADE: When a user is deleted, all their posts are also deleted
    await connection.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    console.log("✓ Posts table ready");

    // Check if users table is empty to avoid duplicating mock data
    const [userRows] = await connection.query(
      "SELECT COUNT(*) as count FROM users"
    );
    if (userRows[0].count === 0) {
      console.log("📝 Populating users with mock data...");
      // Insert each mock user with hashed password for security
      for (const user of mockUsers) {
        // Hash password with bcrypt (10 rounds of salting)
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await connection.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [user.username, user.email, hashedPassword]
        );
      }
      console.log("✓ Mock users created");
    }

    // Check if posts table is empty to avoid duplicating mock data
    const [postRows] = await connection.query(
      "SELECT COUNT(*) as count FROM posts"
    );
    if (postRows[0].count === 0) {
      console.log("📝 Populating posts with mock data...");
      // Insert each mock post with reference to user_id
      for (const post of mockPosts) {
        await connection.query(
          "INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)",
          [post.title, post.content, post.user_id]
        );
      }
      console.log("✓ Mock posts created");
    }

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Error initializing database:", error.message);
    throw error;
  } finally {
    // Close the connection to free up resources
    // The main app will use the connection pool from database.js
    await connection.end();
  }
};

export default createTables;
