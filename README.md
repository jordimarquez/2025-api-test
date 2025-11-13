# Express Node Server + MySQL Setup Guide

## Prerequisite: Homebrew, nvm & Node.js (macOS)

If you're on macOS and don't have Homebrew or nvm installed, follow these steps first.

Install Homebrew (if needed):

```bash
# Install Homebrew (official installer)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Follow the installer output: you may need to add Homebrew to your PATH.
# On Apple Silicon (M1/M2) you typically add:
#   echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
#   eval "$(/opt/homebrew/bin/brew shellenv)"
```

Install `nvm` (Node Version Manager) and the latest Node LTS:

```bash
# Install nvm (replace v0.39.6 with a newer release if available)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash

# Load nvm into current shell session (or restart your terminal)
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \ . "$NVM_DIR/nvm.sh"

# Install the latest LTS Node and make it the default
nvm install --lts
nvm alias default 'lts/*'

# Verify
node -v
npm -v
```

After Homebrew and Node are installed, continue with the MySQL installation below.

## Prerequisite: Install MySQL (macOS / Homebrew)

If you're on macOS and use Homebrew, install and start MySQL before proceeding:

```bash
# Update Homebrew
brew update

# Install MySQL
brew install mysql

# Start MySQL as a background service
brew services start mysql

# Verify status
brew services list

# (Optional) Secure MySQL and set the root password
mysql_secure_installation
```

After installation ensure MySQL is running and update your `.env` values (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) accordingly.

## Step 1: Initialize Project

```bash
mkdir express-api-test
cd express-api-test
npm init -y
```

## Step 2: Configure ES6 Modules

Add to `package.json`:

```json
{
  "type": "module"
}
```

## Step 3: Install Dependencies

```bash
npm install express mysql2 bcrypt jsonwebtoken dotenv cors helmet express-rate-limit zod
npm install --save-dev nodemon
```

### Dependencies Explained

**Production Dependencies:**

- **express**: Fast, minimalist web framework for Node.js to build APIs and web applications
- **mysql2**: MySQL client for Node.js with focus on performance and support for Promises
- **bcrypt**: Library to hash passwords securely using bcrypt algorithm
- **jsonwebtoken**: Implementation of JSON Web Tokens (JWT) for authentication
- **dotenv**: Loads environment variables from .env file into process.env
- **cors**: Middleware to enable Cross-Origin Resource Sharing (CORS)
- **helmet**: Secures Express apps by setting various HTTP headers
- **express-rate-limit**: Middleware to limit repeated requests to APIs and/or endpoints
- **zod**: TypeScript-first schema validation library with static type inference

**Development Dependencies:**

- **nodemon**: Automatically restarts the server when file changes are detected during development

## Step 4: Create Project Structure

```
express-api-test/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── init.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── users.js
│   │   └── posts.js
│   └── server.js
├── .env
└── package.json
```

## Step 5: Configure Environment Variables

Create `.env` file:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=mydatabase
JWT_SECRET=your-secret-key-here
```

## Step 6: Setup Database Connection

Create `src/config/database.js`:

```javascript
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool.promise();
```

## Step 7: Create Database Initialization with Mock Data

Create `src/config/mockData.js`:

```javascript
export const mockUsers = [
  {
    username: "johndoe",
    email: "john@example.com",
    password: "password123",
  },
  {
    username: "janedoe",
    email: "jane@example.com",
    password: "password456",
  },
];

export const mockPosts = [
  {
    title: "Getting Started with Node.js",
    content:
      "Node.js is a powerful JavaScript runtime built on Chrome's V8 engine. It allows developers to build scalable network applications.",
    user_id: 1,
  },
  {
    title: "Understanding Express Framework",
    content:
      "Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.",
    user_id: 1,
  },
  {
    title: "MySQL Best Practices",
    content:
      "When working with MySQL, it's important to follow best practices such as using prepared statements, indexing properly, and normalizing your data.",
    user_id: 2,
  },
  {
    title: "REST API Design Principles",
    content:
      "RESTful APIs should be stateless, cacheable, and follow standard HTTP methods. Proper resource naming and status codes are essential.",
    user_id: 2,
  },
  {
    title: "JWT Authentication Explained",
    content:
      "JSON Web Tokens provide a secure way to transmit information between parties. They consist of three parts: header, payload, and signature.",
    user_id: 1,
  },
];
```

Create `src/config/init.js`:

```javascript
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { mockUsers, mockPosts } from "./mockData.js";

dotenv.config();

const createTables = async () => {
  // Create a connection without specifying a database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Create database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
    );
    console.log("✓ Database ready");

    // Use the database
    await connection.query(`USE \`${process.env.DB_NAME}\``);

    // Create users table
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

    // Create posts table
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

    // Check if users table is empty
    const [userRows] = await connection.query(
      "SELECT COUNT(*) as count FROM users"
    );
    if (userRows[0].count === 0) {
      console.log("📝 Populating users with mock data...");
      for (const user of mockUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await connection.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [user.username, user.email, hashedPassword]
        );
      }
      console.log("✓ Mock users created");
    }

    // Check if posts table is empty
    const [postRows] = await connection.query(
      "SELECT COUNT(*) as count FROM posts"
    );
    if (postRows[0].count === 0) {
      console.log("📝 Populating posts with mock data...");
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
    // Close the connection
    await connection.end();
  }
};

export default createTables;
```

Create `src/config/database.js`:

```javascript
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool.promise();
```

Create `src/config/init.js`:

```javascript
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const createTables = async () => {
  // Create a connection without specifying a database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Create database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
    );
    console.log("✓ Database ready");

    // Use the database
    await connection.query(`USE \`${process.env.DB_NAME}\``);

    // Create users table
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

    // Create posts table
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

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Error initializing database:", error.message);
    throw error;
  } finally {
    // Close the connection
    await connection.end();
  }
};

export default createTables;
```

Create `src/config/init.js`:

```javascript
import db from "./database.js";

const createTables = async () => {
  try {
    // Create users table
    await db.query(`
                        CREATE TABLE IF NOT EXISTS users (
                                id INT PRIMARY KEY AUTO_INCREMENT,
                                username VARCHAR(50) UNIQUE NOT NULL,
                                email VARCHAR(100) UNIQUE NOT NULL,
                                password VARCHAR(255) NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                `);
    console.log("✓ Users table ready");

    // Create posts table
    await db.query(`
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

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Error initializing database:", error.message);
    throw error;
  }
};

export default createTables;
```

## Step 8: Create Authentication Middleware

Create `src/middleware/auth.js`:

```javascript
import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default authMiddleware;
```

## Step 9: Create User Routes

Create `src/routes/users.js`:

```javascript
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../config/database.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Register user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: "User created", userId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile (protected)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
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
```

## Step 10: Create Post Routes

Create `src/routes/posts.js`:

```javascript
import express from "express";
import db from "../config/database.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get all posts
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

// Get single post
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

// Create post (protected)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    const [result] = await db.query(
      "INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)",
      [title, content, req.user.id]
    );
    res.status(201).json({ message: "Post created", postId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update post (protected)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    const [result] = await db.query(
      "UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?",
      [title, content, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    res.json({ message: "Post updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post (protected)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM posts WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Step 11: Create Express Server

Create `src/server.js`:

```javascript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import createTables from "./config/init.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database tables
await createTables();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "API is running!" });
});

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Step 12: Update package.json Scripts

```json
"scripts": {
        "start": "node src/server.js",
        "dev": "nodemon src/server.js"
}
```

## Step 13: Run the Server

```bash
npm run dev
```

The database tables will be automatically created when the server starts if they don't already exist.

## API Endpoints

### User Routes

- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)

### Post Routes

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (protected)
- `PUT /api/posts/:id` - Update post (protected)
- `DELETE /api/posts/:id` - Delete post (protected)
