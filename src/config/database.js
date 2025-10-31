// Import MySQL2 library for database connectivity
import mysql from "mysql2";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Create a connection pool for efficient database connections
// Connection pools manage multiple connections and reuse them for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST, // Database server hostname/IP
  user: process.env.DB_USER, // Database username
  password: process.env.DB_PASSWORD, // Database password
  database: process.env.DB_NAME, // Database name to connect to
  waitForConnections: true, // Queue requests when all connections are in use
  connectionLimit: 10, // Maximum number of connections in the pool
});

// Export the pool with promise support for async/await syntax
export default pool.promise();
