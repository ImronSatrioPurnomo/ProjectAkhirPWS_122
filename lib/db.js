const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

/**
 * SQLite setup
 * - DB file: /data/app.db
 * - Auto-create tables + seed data (sample movies)
 */
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, "app.db");

let dbPromise = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
  }
  return dbPromise;
}

async function initDb() {
  const db = await getDb();

  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      apiKey TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // IMDb-style dataset: Movies table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      rating REAL NOT NULL DEFAULT 0,
      genres TEXT NOT NULL DEFAULT '[]',   -- JSON string array
      plot TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );
  `);

  // Seed movies (if empty)
  const movieRow = await db.get("SELECT COUNT(*) as cnt FROM movies;");
  if (!movieRow || movieRow.cnt === 0) {
    const now = new Date().toISOString();
    const seed = [
      { id: "mv_inception", title: "Inception", year: 2010, rating: 8.8, genres: ["Action","Sci-Fi"], plot: "A thief enters dreams to steal secrets—then gets a chance to erase his past.", createdAt: now },
      { id: "mv_interstellar", title: "Interstellar", year: 2014, rating: 8.7, genres: ["Adventure","Sci-Fi"], plot: "A team travels through a wormhole searching for a new home for humanity.", createdAt: now },
      { id: "mv_darkknight", title: "The Dark Knight", year: 2008, rating: 9.0, genres: ["Action","Crime"], plot: "Batman faces the Joker, who pushes Gotham into chaos.", createdAt: now },
      { id: "mv_spiritedaway", title: "Spirited Away", year: 2001, rating: 8.6, genres: ["Animation","Fantasy"], plot: "A girl enters a spirit world to save her parents.", createdAt: now },
      { id: "mv_parasite", title: "Parasite", year: 2019, rating: 8.5, genres: ["Drama","Thriller"], plot: "A poor family schemes to infiltrate a wealthy household.", createdAt: now },
      { id: "mv_whiplash", title: "Whiplash", year: 2014, rating: 8.5, genres: ["Drama","Music"], plot: "A young drummer clashes with a ruthless teacher to reach greatness.", createdAt: now },
      { id: "mv_matrix", title: "The Matrix", year: 1999, rating: 8.7, genres: ["Action","Sci-Fi"], plot: "A hacker discovers reality is a simulation—and fights to free humanity.", createdAt: now },
      { id: "mv_godfather", title: "The Godfather", year: 1972, rating: 9.2, genres: ["Crime","Drama"], plot: "A mafia patriarch transfers control to his reluctant son.", createdAt: now }
    ];

    for (const m of seed) {
      await db.run(
        "INSERT INTO movies(id, title, year, rating, genres, plot, createdAt) VALUES(?,?,?,?,?,?,?)",
        [m.id, m.title, m.year, m.rating, JSON.stringify(m.genres), m.plot, m.createdAt]
      );
    }
  }

  return db;
}

module.exports = { getDb, initDb, DB_PATH };
