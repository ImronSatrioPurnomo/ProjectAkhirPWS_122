const { store } = require("./store");

function getApiKeyFromReq(req) {
  const key = req.header("x-api-key");
  return key ? String(key).trim() : null;
}

async function requireApiKey(req, res, next) {
  try {
    const key = getApiKeyFromReq(req);
    if (!key) {
      return res.status(401).json({
        error: "API key required",
        hint: "Buat key di /portal.html lalu kirim header x-api-key: <YOUR_KEY>"
      });
    }
    const ok = await store.isValidApiKey(key);
    if (!ok) {
      return res.status(403).json({ error: "Invalid API key" });
    }
    req.apiKey = key;
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireApiKey, getApiKeyFromReq };
