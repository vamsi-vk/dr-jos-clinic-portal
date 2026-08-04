# dr-jos-clinic-portal

Chrome Extension + Next.js Admin/API + PostgreSQL
Client: Dr. Jo's Skin Revive Clinic

## Structure

```
miosalon/
  web/          Next.js 14 admin portal + REST API
  extension/    Chrome Extension (Manifest V3)
```

## Prerequisites

- Node.js 20+
- A PostgreSQL database ([Neon](https://neon.tech) recommended)

## Web app setup

```bash
cd web
cp .env.example .env.local
# Edit .env.local with DATABASE_URL and secrets

npm install
npm run db:push          # apply schema to Postgres
npm run db:seed          # create admin + sample field groups
npm run dev              # http://localhost:3000
```

Default seeded admin (override via env):

- Email: `admin@drjo.clinic`
- Password: `ChangeMe123!`

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Next.js server |
| `npm run db:push` | Push Drizzle schema to DB |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed admin user + field groups |

### API (Sprint 1)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | Health check |
| POST | `/api/extension/login` | Staff credentials → JWT |
| GET/PUT | `/api/patients/:miosalonPatientId` | Extended patient data |
| GET/POST | `/api/field-groups` | Field group list/create |
| * | `/api/auth/*` | NextAuth |

## Chrome extension setup

```bash
cd extension
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `extension/dist`
4. Open the popup, set API base to `http://localhost:3000`, sign in

The content script injects a Shadow DOM panel on `*.miosalon.com` pages and attempts to extract a patient ID from the URL/DOM.

> Patient ID selectors will be hardened after a short DOM inspection session on a clinic Chrome browser (see proposal Next Steps).

## Sprint status

**Sprint 1 (in progress)** — foundation:

- [x] Next.js project + Tailwind
- [x] PostgreSQL schema (Drizzle)
- [x] NextAuth credentials + extension JWT
- [x] REST API base (health, patients, field groups, extension login)
- [x] Chrome Extension scaffold + Shadow DOM POC
- [ ] Live MioSalon DOM selector pass + production Neon/Vercel wiring

**Sprint 2** — form builder, field group UI, intake/signature panels
**Sprint 3** — reports, export, hardening, deploy
