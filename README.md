# GetPass — Campus Digital Gate Pass System

Full-stack campus gate-pass management application built with **React 19 + Vite + Tailwind CSS v4** and an **Express + Node SQLite (`node:sqlite`)** backend, supporting **Student**, **Clerk**, **Guard**, and **Admin** portals.

## Local Development

```bash
npm install
npm run dev:all
```

- Frontend (Vite): `http://localhost:5173`
- Backend (Express API): `http://localhost:5000/api`

### Verification Scripts

```bash
npm run lint
npm test
npm run build
```

## Demo Credentials

| Role | Identifier | Password |
|---|---|---|
| Student | `CS2023045` | `password123` |
| Clerk | `CLK001` | `password123` |
| Guard | `GRD001` | `password123` |
| Admin | `ADM001` | `password123` |

## Deploying to Vercel

This repository is pre-configured for Vercel via `vercel.json` and `api/index.js`:

1. Import the GitHub repository (`shivamjawanjal/GetPass`) in Vercel.
2. Keep Framework Preset as **Vite** (`npm run build`, output directory `dist`).
3. Ensure **Node.js Version** is set to **22.x** (also declared via `engines.node` in `package.json`, required for `node:sqlite`).
4. Add environment variable `JWT_SECRET` in Vercel Project Settings (recommended for production).
5. **Database note**: On Vercel serverless functions, `server/config/db.js` automatically uses `/tmp/gatepass-data/gatepass.db` because the deployment filesystem is read-only. Data resets across cold starts unless you point `VITE_API_BASE_URL` to a persistently hosted backend instance.
