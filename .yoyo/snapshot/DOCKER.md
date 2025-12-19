## Docker Deployment

### 1. Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- 2+ GB free disk space for MongoDB volume

### 2. Configuration

1. Copy `backend/.env.docker` to include any secrets (JWT, SQL creds, etc.). Defaults already point the backend at the Mongo service.
2. If you need the frontend to call a different API host, set `EXPO_PUBLIC_API_URL` in a `.env` file (Docker Compose automatically loads it).

### 3. Build & Run

```bash
docker compose up --build
```

Services:
- `mongo` — MongoDB database persisted in the `mongo-data` volume
- `backend` — FastAPI/uvicorn backend exposed at `http://localhost:8001`
- `frontend` — Static Expo web build served via Nginx at `http://localhost:3000`

To run in the background:

```bash
docker compose up --build -d
```

### 4. Common Commands

- Stop containers: `docker compose down`
- Stop and remove volumes (fresh DB): `docker compose down -v`
- Tail logs: `docker compose logs -f backend` (or `frontend`, `mongo`)
- Rebuild only one service: `docker compose build backend`

### 5. Notes

- Expo’s web build (`npm run build:web`) outputs to `dist/` and is baked into the frontend image.
- The frontend bundle contains the API URL compiled at build time. Override `EXPO_PUBLIC_API_URL` before `docker compose up --build` if deploying to another host.
- MongoDB data persists in the `mongo-data` volume. Use `docker volume rm stock_verify_mongo-data` to wipe it (name may be prefixed by the folder name).
