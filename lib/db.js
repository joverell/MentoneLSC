import sqlite from 'better-sqlite3';
import path from 'path';

// Determine the path for the database file.
// In a Next.js environment, process.cwd() points to the project root.
const dbPath = path.join(process.cwd(), 'mentone.db');

// Initialize the database connection.
const db = new sqlite(dbPath);

// Set WAL mode for better concurrency.
db.pragma('journal_mode = WAL');

// Create the 'users' table if it doesn't exist.
// This is safe to run every time the application starts.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log("Database initialized and 'users' table is ready.");

export default db;
