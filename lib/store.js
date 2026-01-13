const { nanoid } = require("nanoid");
const { getDb } = require("./db");

function parseGenres(genresStr) {
  try {
    if (Array.isArray(genresStr)) return genresStr;
    const arr = JSON.parse(genresStr || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const store = {
  // ===== API Keys =====
  async createApiKey({ name, email }) {
    const db = await getDb();
    const apiKey = `kapi_${nanoid(24)}`;
    await db.run(
      "INSERT INTO api_keys(apiKey, name, email, createdAt) VALUES(?,?,?,?)",
      [apiKey, name, email, new Date().toISOString()]
    );
    return apiKey;
  },

  async isValidApiKey(key) {
    const db = await getDb();
    const row = await db.get("SELECT apiKey FROM api_keys WHERE apiKey = ? LIMIT 1", [key]);
    return !!row;
  },

  // ===== Movies (IMDb-style) =====
  async listMovies({ q, year, limit = 50, offset = 0 } = {}) {
    const db = await getDb();
    const params = [];
    const where = [];

    if (q) {
      where.push("(lower(title) LIKE ? OR lower(plot) LIKE ?)");
      const like = `%${String(q).toLowerCase()}%`;
      params.push(like, like);
    }
    if (year) {
      where.push("year = ?");
      params.push(Number(year));
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    params.push(Number(limit), Number(offset));

    const rows = await db.all(
      `SELECT id, title, year, rating, genres, plot, createdAt
       FROM movies
       ${whereSql}
       ORDER BY rating DESC, year DESC, title ASC
       LIMIT ? OFFSET ?`,
      params
    );

    return rows.map((r) => ({ ...r, genres: parseGenres(r.genres) }));
  },

  async getMovie(id) {
    const db = await getDb();
    const row = await db.get(
      "SELECT id, title, year, rating, genres, plot, createdAt FROM movies WHERE id=? LIMIT 1",
      [id]
    );
    if (!row) return null;
    return { ...row, genres: parseGenres(row.genres) };
  },

  async createMovie({ title, year, rating = 0, genres = [], plot = "" }) {
    const db = await getDb();
    const created = {
      id: `mv_${nanoid(12)}`,
      title,
      year: Number(year),
      rating: Number(rating),
      genres: Array.isArray(genres) ? genres : [],
      plot: String(plot || ""),
      createdAt: new Date().toISOString(),
    };

    await db.run(
      "INSERT INTO movies(id, title, year, rating, genres, plot, createdAt) VALUES(?,?,?,?,?,?,?)",
      [
        created.id,
        created.title,
        created.year,
        created.rating,
        JSON.stringify(created.genres),
        created.plot,
        created.createdAt,
      ]
    );

    return created;
  },

  async updateMovie(id, { title, year, rating, genres, plot }) {
    const db = await getDb();
    const existing = await store.getMovie(id);
    if (!existing) return null;

    const next = {
      title: title !== undefined ? String(title) : existing.title,
      year: year !== undefined ? Number(year) : existing.year,
      rating: rating !== undefined ? Number(rating) : existing.rating,
      genres: genres !== undefined ? (Array.isArray(genres) ? genres : []) : existing.genres,
      plot: plot !== undefined ? String(plot) : existing.plot,
    };

    await db.run(
      "UPDATE movies SET title=?, year=?, rating=?, genres=?, plot=? WHERE id=?",
      [next.title, next.year, next.rating, JSON.stringify(next.genres), next.plot, id]
    );

    return { ...existing, ...next };
  },

  async deleteMovie(id) {
    const db = await getDb();
    const res = await db.run("DELETE FROM movies WHERE id=?", [id]);
    return res && res.changes > 0;
  },
};

module.exports = { store };
