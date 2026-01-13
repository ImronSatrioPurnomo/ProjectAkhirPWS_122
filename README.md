# Movies Open API (Website Open API) — Tugas Pengembangan Web Service

Project ini dibuat **mirip konsep website Open API** (kayak OpenRouter/Midtrans versi mini) dengan tema **Film (IMDb mini)**.

## Fitur
- **Landing page**: `/`
- **Portal API Key**: `/portal.html` (generate `x-api-key`)
- **Docs**: `/docs` (Swagger UI / OpenAPI 3)
- **Explore UI**: `/explore.html` (lihat list film + detail film)
- **Database**: SQLite (auto-create + seed data) di `data/app.db`
- **Rate limit**: semua route `/v1/*`

## Cara jalanin (lokal)
Requirement: Node.js 18+ (atau 20+)

```bash
cd openapi-website-sqlite
npm install
npm run dev
```

Buka:
- Landing: http://localhost:3000/
- Portal: http://localhost:3000/portal.html
- Docs: http://localhost:3000/docs
- Explore: http://localhost:3000/explore.html

## Cara pakai cepat
### 1) Generate API key
Lewat portal UI (`/portal.html`) atau curl:

```bash
curl -X POST http://localhost:3000/portal/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"Bro","email":"bro@example.com"}'
```

### 2) Public read (tanpa API key)
```bash
curl http://localhost:3000/v1/movies
curl http://localhost:3000/v1/movies/mv_inception
```

### 3) Protected write (wajib `x-api-key`)
```bash
curl -X POST http://localhost:3000/v1/movies \
  -H "Content-Type: application/json" \
  -H "x-api-key: <YOUR_KEY>" \
  -d '{"title":"My Movie","year":2026,"rating":7.5,"genres":["Drama"],"plot":"Short plot..."}'
```

## Endpoint ringkas
Public:
- `GET /v1/health`
- `GET /v1/movies`
- `GET /v1/movies/:id`

Protected (pakai `x-api-key`):
- `POST /v1/movies`
- `PUT /v1/movies/:id`
- `DELETE /v1/movies/:id`

## Reset database (kalau mau ulang demo)
1) Stop server
2) Hapus file `data/app.db`
3) Start lagi (`npm run dev`)

## Catatan submit tugas
- **Jangan** ikutkan `node_modules` di ZIP.
- **Jangan** ikutkan file SQLite WAL/SHM (`app.db-wal`, `app.db-shm`) kalau ada.
