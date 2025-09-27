# nexTransfer Backend

A Node.js/Express API with MongoDB (Mongoose) for authentication and basic user management. Includes JWT auth, secure password hashing with a pepper, robust Mongo connection retries, health checks, request logging with client IPs, and development tooling for index inspection.

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- Auth: JWT (jsonwebtoken) + bcryptjs (with a server-side password pepper)
- Security: Helmet, CORS, cookie-parser
- Observability: File-based logger + request logging middleware

## Requirements
- Node.js 18+ (recommended)
- npm 9+
- MongoDB 5+ (local or remote)

## Getting Started
1. Copy environment template and configure values
   - From this folder:
     - cp .env.example .env
   - Update .env:
     - MONGO_URI=mongodb://localhost:27017/nextransfer (or your URI)
     - JWT_SECRET, PASSWORD_PEPPER to strong secrets
     - FRONTEND_URL=http://localhost:3000 (for CORS during local dev)
     - Optional DB_* vars (see below)

2. Install dependencies
   - npm install

3. Run the server
   - Development (auto-reload): npm run dev
   - Production: npm start

Server defaults to http://localhost:5000 (configurable via PORT in .env).

## Environment Variables
See `.env.example` for a complete list. Key variables:
- PORT: API port (default 5000)
- JWT_SECRET: Secret used to sign JWT access tokens
- ACCESS_EXPIRES: Access token TTL (e.g., 15m, 1h)
- PASSWORD_PEPPER: Secret concatenated to the plaintext password before hashing
- MONGO_URI: MongoDB connection string
- FRONTEND_URL: Allowed CORS origin (e.g., your Next.js dev server)
- DB_REQUIRED: true|false — when true, exit process on DB connection failure (default false)
- DB_MAX_RETRIES: Max retry attempts when connecting to Mongo (default 3)
- DB_RETRY_DELAY_MS: Initial retry delay (ms), exponential backoff applied (default 1000)
- DB_SELECTION_TIMEOUT_MS: Mongo server selection timeout per attempt (ms) (default 5000)
- LOG_DIR: Directory for log files (default backend/logs)
- LOG_FILE: Log filename (default app.log)

## Endpoints
Base URL: http://localhost:5000

- Health
  - GET /api/health — JSON with service info and Mongo connection state
  - GET /healthz — plain liveness check (ok)
  - GET /api/healthz — same as /healthz
- Auth
  - POST /api/auth/register — create user
  - POST /api/auth/login — get JWT access token
- Users (protected; requires Authorization: Bearer <token>)
  - GET /api/users/me — current authenticated user
- Dev only (disabled in production)
  - GET /api/dev/indexes — report Mongo readyState and `users` collection indexes

### Auth: Register
Request
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "P@ssw0rd123",
  "lastName": "Doe",
  "firstName": "Alice",
  "phone": "+15551234567",
  "dateOfBirth": "1990-05-20",
  "address": { "street": "123 Main St", "postalCode": "94016", "city": "San Francisco" }
}
```
Notes
- Required: email, password, lastName
- Optional: firstName, phone, dateOfBirth, address
- Uniqueness: email unique; phone unique and sparse (multiple docs can omit phone)

Response
```json
{
  "token": "<JWT>",
  "user": { "_id": "...", "email": "alice@example.com", "firstName": "alice", "lastName": "Doe", ... }
}
```

### Auth: Login
Request
```http
POST /api/auth/login
Content-Type: application/json

{ "email": "alice@example.com", "password": "P@ssw0rd123" }
```
Response
```json
{ "token": "<JWT>", "user": { "_id": "...", "email": "alice@example.com", ... } }
```
Backward compatibility
- If PASSWORD_PEPPER is set, the API first compares bcrypt hashes using password+pepper. If that fails, it falls back to comparing with the plain password (legacy behavior). On success, the hash is seamlessly upgraded to include the pepper.

### Users: Me
Request
```http
GET /api/users/me
Authorization: Bearer <token>
```
Response
```json
{ "user": { "_id": "...", "email": "alice@example.com", ... } }
```

## MongoDB and Indexes
- Connection is established via `src/db/mongoose.js` with bounded retries and exponential backoff.
- On startup, `User.syncIndexes()` ensures indexes are created and synchronized.
- Enforced indexes on `User` model:
  - email: unique
  - phone: unique, sparse
- For troubleshooting and maintenance, see `DB_SETTINGS.md` (verify indexes, resolve duplicates, drop/recreate).

## Logging and Observability
- All requests are logged with method, path, status, duration, and client IP to `logs/app.log` (configurable via LOG_DIR/LOG_FILE).
- The app sets `trust proxy = true` to capture the original client IP behind reverse proxies.
- Errors and Mongo connection issues are written to the same log.

## CORS
Configured via `FRONTEND_URL`. During local development, set `FRONTEND_URL=http://localhost:3000` for a Next.js frontend. Credentials are enabled.

## Postman
A ready-to-use collection is included:
- Collection: `backend/postman/nextransfer.postman_collection.json`
- Variables: `baseUrl` (defaults to http://localhost:5000) and `token`

Quick steps
1. Import the collection into Postman.
2. Option A: Use the collection-level variables.
   - Set `baseUrl` to your backend URL.
3. Option B: Import or create an environment with `baseUrl` and `token` variables.
4. Run Register or Login; token is auto-captured to `token` variable.
5. Call Users > GET /api/users/me; it uses `Authorization: Bearer {{token}}`.

## Folder Structure
```
backend/
  src/
    app.js                 # Express app, routes, health, startup, index sync
    controllers/
      authController.js    # register/login
      usersController.js   # GET /me
    db/
      mongoose.js          # connect with retries/backoff
    middleware/
      auth.js              # JWT middleware
      requestLogger.js     # Request logging with IP
    models/
      User.js              # User schema + indexes
    routes/
      auth.js, users.js    # Route definitions
    utils/
      logger.js            # File-based logger
  postman/
    nextransfer.postman_collection.json
  .env.example
  DB_SETTINGS.md
  package.json
```

## Production Notes
- Set strong values for JWT_SECRET and PASSWORD_PEPPER.
- Consider `DB_REQUIRED=true` so the process exits on DB failures.
- Restrict CORS origin(s) to your deployed frontend(s).
- Configure log rotation for `logs/app.log`.
- Behind a proxy/load balancer, keep `app.set('trust proxy', true)` so IPs are correct.

## License
This project is licensed under the terms of the repository's LICENSE.
