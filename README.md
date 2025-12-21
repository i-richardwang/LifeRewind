# LifeRewind

AI-powered personal life review and reflection tool based on digital footprints. Automatically collect multi-source data and intelligently generate periodic work and life summaries.

## Core Philosophy

Every day, we leave numerous digital traces on our computers—documents written, web pages browsed, conversations with AI—but these fragmented pieces of information are scattered everywhere, making it difficult to form a complete self-awareness. LifeRewind aims to automatically aggregate these digital footprints and leverage AI's understanding capabilities to help us regularly review and reflect on our time investment and life trajectory.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│                 │  HTTP   │                 │
│    Collector    │ ──────► │      Web        │
│   (Stateless)   │  POST   │   (Next.js)     │
│                 │         │                 │
└─────────────────┘         └─────────────────┘
        │                           │
        │                           │
   ┌────┴────┐                 ┌────┴────┐
   │ Sources │                 │   DB    │
   ├─────────┤                 │ (Postgres)
   │ • Git   │                 │         │
   │ • Browser│                │ • Storage│
   │ • Files │                 │ • AI Summary│
   │ • Chatbot│                │ • Analytics│
   └─────────┘                 └─────────┘
```

### Design Principles

- **Collector**: Stateless collector that only collects and pushes data, no storage
- **Web**: All storage and intelligent processing is centralized on the Web side
- **Decoupled**: Two modules are decoupled for independent development and deployment

## Project Structure

```
LifeRewind/
├── apps/
│   └── web/                    # Next.js Web Application
│       ├── app/                # App Router pages and API routes
│       ├── db/                 # Database schema (Drizzle ORM)
│       └── lib/                # Utilities and auth
├── packages/
│   ├── collector/              # Data collection service
│   │   ├── src/sources/        # Data sources (git, browser, filesystem, chatbot)
│   │   └── src/core/           # Scheduler and collector logic
│   ├── ui/                     # Shared React components
│   ├── eslint-config/          # Shared ESLint configuration
│   └── typescript-config/      # Shared TypeScript configuration
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Data Sources

| Source | Description | Status |
|--------|-------------|--------|
| Git | Commit history from local repositories | ✅ Implemented |
| Browser | Browsing history (Chrome, Safari, Arc, Dia, Comet) | ✅ Implemented |
| Filesystem | Document changes (.md, .txt, .docx, .pdf, etc.) | ✅ Implemented |
| Chatbot | Local AI chatbot history (ChatWise) | ✅ Implemented |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/LifeRewind.git
cd LifeRewind

# Install dependencies
pnpm install
```

### Configuration

#### Web Application

Create `apps/web/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/liferewind
LIFEREWIND_API_KEY=your-secure-api-key
```

Run database migrations:

```bash
cd apps/web
pnpm db:migrate
```

#### Collector

**Quick Start (Recommended):**

```bash
cd packages/collector

# Interactive configuration wizard
pnpm exec liferewind init

# Start collecting
pnpm exec liferewind start
```

The wizard will auto-detect installed browsers and create config at `~/.liferewind/config.json`.

**Manual Configuration:**

Create config file (searched in order):
1. `~/.liferewind/config.json` (recommended)
2. `~/.config/liferewind/collector.json`
3. `./collector.config.json`

Example configuration:

```json
{
  "api": {
    "baseUrl": "http://localhost:3000",
    "apiKey": "your-secure-api-key"
  },
  "sources": {
    "git": {
      "enabled": true,
      "schedule": "daily",
      "options": {
        "scanPaths": ["~/Documents", "~/Projects"],
        "sinceDays": 30
      }
    },
    "browser": {
      "enabled": true,
      "schedule": "daily",
      "options": {
        "browsers": ["chrome", "safari", "arc"],
        "excludeDomains": ["localhost"],
        "sinceDays": 7
      }
    },
    "filesystem": {
      "enabled": true,
      "schedule": "daily",
      "options": {
        "watchPaths": ["~/Documents"],
        "excludePatterns": ["**/node_modules/**", "**/.git/**", "**/Library/**"],
        "fileTypes": [".md", ".txt", ".docx"],
        "sinceDays": 7
      }
    },
    "chatbot": {
      "enabled": true,
      "schedule": "daily",
      "options": {
        "clients": ["chatwise"],
        "sinceDays": 30
      }
    }
  }
}
```

### Running

#### Development

```bash
# Start all services (Web + Collector)
pnpm dev

# Or start individually
cd apps/web && pnpm dev
cd packages/collector && pnpm dev
```

#### Production

```bash
# Build all packages
pnpm build

# Start Web
cd apps/web && pnpm start

# Start Collector (with PM2)
cd packages/collector
pnpm pm2:start
```

## API Reference

### POST /api/collector/ingest

Receive collected data from the Collector.

**Headers:**
```
Authorization: Bearer <LIFEREWIND_API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sourceType": "git" | "browser" | "filesystem" | "chatbot",
  "collectedAt": "2024-12-19T12:00:00.000Z",
  "items": [...]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemsReceived": 100,
    "itemsInserted": 95,
    "requestId": "req_abc123"
  }
}
```

## Development Guide

### Adding a New Data Source

1. Create a new directory under `packages/collector/src/sources/`
2. Extend the `DataSource<TOptions>` base class
3. Register in `packages/collector/src/index.ts`

```typescript
// packages/collector/src/sources/my-source/index.ts
import { DataSource } from '../base.js';

interface MySourceOptions {
  // Your options
}

export class MySource extends DataSource<MySourceOptions> {
  readonly type = 'my-source' as const;
  readonly name = 'My Source';

  async validate(): Promise<boolean> {
    // Validate environment requirements
    return true;
  }

  async collect(): Promise<CollectionResult> {
    // Collect and return data
  }
}
```

### Scripts

```bash
pnpm dev          # Start development servers
pnpm build        # Build all packages
pnpm lint         # Run ESLint
pnpm check-types  # Run TypeScript type checking
pnpm format       # Format code with Prettier
```

## Schedule Options

| Value | Cron | Description |
|-------|------|-------------|
| `hourly` | `0 * * * *` | Every hour |
| `daily` | `0 9 * * *` | Daily at 9:00 AM |
| `weekly` | `0 9 * * 1` | Monday at 9:00 AM |
| `monthly` | `0 9 1 * *` | 1st of month at 9:00 AM |
| `manual` | - | Manual trigger only |

## Tech Stack

- **Runtime**: Node.js 20+
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo
- **Web Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS 4

## License

MIT

## Roadmap

- [ ] Dashboard UI for viewing collected data
- [ ] AI-powered periodic summaries (daily/weekly/monthly)
- [ ] Timeline visualization
- [ ] Search and filtering
- [ ] Data export functionality
- [ ] Additional data sources (calendar, email, etc.)
