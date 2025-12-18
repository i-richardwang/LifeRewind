# @workspace/collector

Background data collection service for LifeRewind. Collects digital footprints from multiple sources and pushes to the Web API.

## Data Sources

| Type | Status | Description |
|------|--------|-------------|
| Git | ✅ Implemented | Git commit history |
| Browser | 🚧 Planned | Browser history |
| Filesystem | 🚧 Planned | File change tracking |
| AI Chat | 🚧 Planned | Claude/ChatGPT conversations |

## Configuration

Create `collector.config.json` (see `collector.config.example.json`):

```json
{
  "api": {
    "baseUrl": "http://localhost:3000",
    "apiKey": "your-api-key"
  },
  "sources": {
    "git": {
      "enabled": true,
      "schedule": "daily",
      "options": {
        "repositories": ["~/Projects/my-project"],
        "sinceDays": 30
      }
    }
  }
}
```

Config file lookup order:
1. `./collector.config.json`
2. `~/.config/liferewind/collector.json`
3. `~/.liferewind-collector.json`

Or use environment variables:
```bash
export LIFEREWIND_API_URL="http://localhost:3000"
export LIFEREWIND_API_KEY="your-api-key"
```

## Usage

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start

# PM2 daemon
pnpm pm2:start
pnpm pm2:stop
pnpm pm2:logs
```

## Schedule Frequencies

| Value | Cron | Description |
|-------|------|-------------|
| `hourly` | `0 * * * *` | Every hour |
| `daily` | `0 9 * * *` | Daily at 9:00 |
| `weekly` | `0 9 * * 1` | Monday at 9:00 |
| `monthly` | `0 9 1 * *` | 1st of month at 9:00 |
| `manual` | - | Manual trigger only |

## Adding a Data Source

1. Create a new directory under `src/sources/`
2. Extend the `DataSource<TOptions>` base class
3. Register in `src/index.ts`

```typescript
// src/sources/my-source/index.ts
import { DataSource } from '../base.js';

interface MySourceOptions {
  // ...
}

export class MySource extends DataSource<MySourceOptions> {
  readonly type = 'my-source' as const;
  readonly name = 'My Source';

  async validate(): Promise<boolean> {
    // Validate environment requirements
  }

  async collect(): Promise<CollectionResult> {
    // Collect data
  }
}

// src/index.ts
sourceRegistry.register('my-source', (config, ctx) => new MySource(config, ctx));
```

## Project Structure

```
src/
├── index.ts          # Entry point
├── core/
│   ├── types.ts      # Type definitions
│   ├── collector.ts  # Main orchestrator
│   └── scheduler.ts  # Cron scheduler
├── sources/
│   ├── base.ts       # DataSource base class
│   ├── registry.ts   # Source registry
│   └── git/          # Git data source
├── api/
│   └── client.ts     # API client
├── config/
│   ├── schema.ts     # Config schema (Zod)
│   └── loader.ts     # Config loader
└── utils/
    ├── logger.ts     # Logger
    └── retry.ts      # Retry with backoff
```
