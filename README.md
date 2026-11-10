# TaskFlow
Local project and task manager built with Next.js, NestJS, Drizzle, and Neon PostgreSQL.

## MVP scope
Create people and projects, select a project, create/edit/delete tasks, assign people, change task status, filter by status, sort, and paginate. People are workspace records, not authenticated accounts. This MVP is for local use; authentication and ownership enforcement are not implemented.

## Run without Docker
Use Node.js 24 and run npm ci in backend and frontend if dependencies are not installed. Keep the existing backend/.env; for a new setup copy backend/.env.example to backend/.env and set a Neon development DATABASE_URL privately. Existing users/projects/tasks tables are required. These changes need no new schema migration.

In one terminal:
```powershell
cd D:\Projects\TaskFlow\backend
npm run start:dev
```
In another:
```powershell
cd D:\Projects\TaskFlow\frontend
npm run dev
```
Open http://localhost:3001. NestJS runs on port 3000. The frontend proxies /api requests to the backend using server-only API_BASE_URL (default http://127.0.0.1:3000), so no browser CORS configuration or database secret is needed in the frontend.

Add a person, create a project owned by that person, then create tasks. Existing projects appear in the sidebar. Click a task title to edit; use its status menu to move it; deletion requires confirmation. See backend/LOCAL_WORKFLOW.md for direct API examples.

## Docker Compose
Start Docker Desktop's Linux engine on Windows (or Docker Engine on Ubuntu). Stop local development servers first to free ports 3000 and 3001. Keep backend/.env outside version control.

From the repository root:
```powershell
docker compose build
docker compose up -d
docker compose ps
```
Open http://localhost:3001. The API's database health check must succeed before the frontend starts. Both ports bind to loopback; nothing is published to the LAN or internet.

Troubleshooting:
```powershell
docker compose logs --tail=100 api web
docker compose down
```
Do not share logs containing credentials. No PostgreSQL container is used and stopping Compose does not delete Neon data. Images contain no .env files. Both runtime containers use the non-root node account. No registry push is needed for this local workflow.

On Ubuntu these loopback ports are accessible through SSH forwarding or a later host NGINX configuration. Existing NGINX configuration is not changed by this project.

## Checks
In backend: npm test -- --runInBand, npm run build, npm run lint.
In frontend: npm run build, npm run lint.
For browser regressions, run `npx playwright install chromium` once, then `npm run test:e2e` in frontend. On Windows with Edge installed, use `$env:PLAYWRIGHT_CHANNEL='msedge'` before the test command to use Edge instead. These tests run their own server on port 3101; stop any frontend dev server in this checkout first. They use isolated API fixtures, not Neon writes.
Backend tests mock database access; they do not prove live Neon connectivity. Verify /health/database and perform the UI flow on the development branch before calling deployment ready.

