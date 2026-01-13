require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const { requireApiKey, getApiKeyFromReq } = require("./lib/auth");
const { store } = require("./lib/store");
const { initDb, DB_PATH } = require("./lib/db");

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
    }
  }
}));
app.use(cors({ origin: "*" }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

// static website (landing, portal, explore)
app.use("/", express.static(path.join(__dirname, "public")));

// swagger docs
const specPath = path.join(__dirname, "openapi.yaml");
const openapiSpec = YAML.load(specPath);
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: "Movies Open API Docs",
  })
);

// rate limit for all /v1 routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 60),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const k = getApiKeyFromReq(req);
    return k ? `key:${k}` : `ip:${req.ip}`;
  },
});

app.use("/v1", apiLimiter);

// ===== helpers =====
const normalizeMovie = (m) => {
  if (!m) return m;
  // if genres accidentally comes as JSON string, convert to array
  if (typeof m.genres === "string") {
    try {
      const arr = JSON.parse(m.genres);
      m.genres = Array.isArray(arr) ? arr : [];
    } catch {
      m.genres = [];
    }
  }
  return m;
};

// ===== Portal (public) =====
app.post("/portal/keys", async (req, res, next) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: "name dan email wajib diisi" });
    }

    const apiKey = await store.createApiKey({ name, email });
    return res.status(201).json({
      apiKey,
      note: "Simpan key ini. Kalau hilang, buat baru.",
      docs: "/docs",
    });
  } catch (e) {
    next(e);
  }
});

// ===== Public endpoints =====
app.get("/v1/health", (req, res) => {
  res.json({
    ok: true,
    service: "Movies Open API (SQLite)",
    db: path.basename(DB_PATH),
    time: new Date().toISOString(),
  });
});

// Movies public read
app.get("/v1/movies", async (req, res, next) => {
  try {
    const { q, year, limit, offset } = req.query;

    const data = await store.listMovies({
      q: q ? String(q) : undefined,
      year: year ? Number(year) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    // ✅ IMPORTANT: normalize output
    res.json({ data: data.map((m) => normalizeMovie({ ...m })) });
  } catch (e) {
    next(e);
  }
});

app.get("/v1/movies/:id", async (req, res, next) => {
  try {
    const movie = await store.getMovie(req.params.id);
    if (!movie) return res.status(404).json({ error: "movie tidak ditemukan" });

    // ✅ IMPORTANT: normalize output
    res.json({ data: normalizeMovie({ ...movie }) });
  } catch (e) {
    next(e);
  }
});

// ===== Protected endpoints (require API key) =====

// Movies write endpoints (protected)
app.post("/v1/movies", requireApiKey, async (req, res, next) => {
  try {
    const { title, year, rating, genres, plot } = req.body || {};
    if (!title || !year) return res.status(400).json({ error: "title dan year wajib" });

    const created = await store.createMovie({
      title,
      year,
      rating: rating ?? 0,
      genres: genres ?? [],
      plot: plot ?? "",
    });

    res.status(201).json({ data: normalizeMovie({ ...created }) });
  } catch (e) {
    next(e);
  }
});

app.put("/v1/movies/:id", requireApiKey, async (req, res, next) => {
  try {
    const updated = await store.updateMovie(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: "movie tidak ditemukan" });

    res.json({ data: normalizeMovie({ ...updated }) });
  } catch (e) {
    next(e);
  }
});

app.delete("/v1/movies/:id", requireApiKey, async (req, res, next) => {
  try {
    const ok = await store.deleteMovie(req.params.id);
    if (!ok) return res.status(404).json({ error: "movie tidak ditemukan" });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ===== Error handler =====
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error", detail: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});