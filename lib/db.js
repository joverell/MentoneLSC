import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// We use `globalThis` to store a single instance of the database connection.
// This is important in development because Next.js's hot reloading can
// cause this module to be re-evaluated, but `globalThis` will persist.
const singleton = globalThis;

let db;

// This function will be the single entry point for accessing the database.
export function getDb() {
  // If the database connection does not already exist, create it.
  if (!singleton.db) {
    const dbPath = path.join(process.cwd(), 'mentone.db');
    console.log("Opening database connection from:", dbPath);
    singleton.db = new Database(dbPath);

    // Set WAL mode for better concurrency.
    singleton.db.pragma('journal_mode = WAL');

    // Create tables if they don't exist.
    singleton.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    singleton.db.exec(`
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
    singleton.db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);
    singleton.db.exec(`
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
    singleton.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);
    singleton.db.exec(`
      CREATE TABLE IF NOT EXISTS access_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);
    singleton.db.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
      )
    `);
    singleton.db.exec(`
      CREATE TABLE IF NOT EXISTS user_access_groups (
        user_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, group_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES access_groups (id) ON DELETE CASCADE
      )
    `);

    // Seed initial data
    const defaultRoles = ['Admin', 'Member'];
    const insertRole = singleton.db.prepare('INSERT OR IGNORE INTO roles (name) VALUES (?)');
    defaultRoles.forEach(role => insertRole.run(role));

    console.log("Database has been initialised.");
  }

  // Return the singleton connection.
  db = singleton.db;
  return db;
}
