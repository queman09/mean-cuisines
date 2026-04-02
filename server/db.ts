import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";

const sqlite = new Database("./data.db");

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

// Create tables if they don't exist (safe to run on every startup)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS contributors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'contributor'
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    cook_time_minutes INTEGER NOT NULL,
    servings INTEGER NOT NULL DEFAULT 1,
    equipment TEXT NOT NULL DEFAULT '[]',
    ingredients TEXT NOT NULL DEFAULT '[]',
    steps TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    contributor_id INTEGER REFERENCES contributors(id),
    source_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedule_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    equipment TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
