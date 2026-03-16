# ArchMock

AI-powered system design interview practice platform.

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker

### Setup

1. **Copy environment template**

   ```bash
   cp .env.example .env.local
   ```

2. **Add required keys to `.env.local`**

   - [Clerk](https://clerk.com) — Create a free dev app for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
   - [Anthropic](https://console.anthropic.com) — For `ANTHROPIC_API_KEY` (needed for AI features in later sprints)

3. **Run setup script**

   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

4. **Start development**

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000

## Project Structure

```
archmock/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── ws-server/    # Hono WebSocket backend
├── packages/
│   ├── shared/       # Shared types and constants
│   └── db/           # Drizzle schema, migrations, seed
├── problems/         # Problem definitions (YAML)
└── scripts/
```

## Commands

| Command        | Description                    |
|----------------|--------------------------------|
| `pnpm dev`     | Start frontend + WS server     |
| `pnpm dev:web` | Start frontend only            |
| `pnpm dev:ws`  | Start WS server only           |
| `pnpm build`   | Build all packages             |
| `pnpm db:migrate` | Run database migrations     |
| `pnpm db:seed` | Seed problem bank              |
| `pnpm db:studio` | Open Drizzle Studio          |

## CI/CD

GitHub Actions runs lint, typecheck, and build on push. Add these repository secrets for the build to succeed:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Design & Plan

- **System design**: `archmock-system-design.md`
- **Implementation plan**: `archmock-mvp-implementation-plan.md`
