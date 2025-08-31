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

// Create the 'events' table if it doesn't exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    location TEXT,
    created_by INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )
`);

// Create the 'news' table if it doesn't exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )
`);

// Create the 'rsvps' table if it doesn't exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Yes', 'No', 'Maybe')),
    comment TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, user_id)
  )
`);

// --- Access Control Tables ---

// Roles table
db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

// Access Groups table
db.exec(`
  CREATE TABLE IF NOT EXISTS access_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

// User-Roles junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
  )
`);

// User-Access-Groups junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_access_groups (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES access_groups (id) ON DELETE CASCADE
  )
`);

// --- Seed initial data ---

// Insert default roles if they don't exist
const defaultRoles = ['Admin', 'Member'];
const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name) VALUES (?)');
defaultRoles.forEach(role => insertRole.run(role));


console.log("Database initialized and all tables are ready.");

export default db;
