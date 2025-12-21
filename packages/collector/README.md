# liferewind

[![npm version](https://img.shields.io/npm/v/liferewind.svg)](https://www.npmjs.com/package/liferewind)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered personal life review tool - collect your digital footprints from git, browser history, documents, and AI chatbots.

## Installation

```bash
npm install -g liferewind
```

## Quick Start

```bash
# Interactive configuration wizard
liferewind init

# Start collecting
liferewind start

# Manual collection
liferewind collect
```

## Data Sources

| Type | Status | Description |
|------|--------|-------------|
| Git | ✅ Implemented | Git commit history |
| Browser | ✅ Implemented | Browser history (Chrome, Safari, Arc, Dia, Comet) |
| Filesystem | ✅ Implemented | Document change tracking (.md, .txt, .docx, .pdf, etc.) |
| Chatbot | ✅ Implemented | Local AI chatbot history (ChatWise) |

## Configuration

Run `liferewind init` for interactive setup, or create config manually.

Config file lookup order:
1. `~/.liferewind/config.json` (primary user config)
2. `~/.config/liferewind/collector.json`
3. `~/.liferewind-collector.json`
4. `./collector.config.json`

Example configuration (see `collector.config.example.json`):

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
        "scanPaths": ["~/Documents", "~/Projects"],
        "sinceDays": 30
      }
    },
    "browser": {
      "enabled": true,
      "schedule": "daily",
      "options": {
        "browsers": ["chrome", "safari", "arc"],
        "excludeDomains": ["localhost", "127.0.0.1"],
        "sinceDays": 7
      }
    },
    "filesystem": {
      "enabled": false,
      "schedule": "daily",
      "options": {
        "watchPaths": ["~/Documents"],
        "excludePatterns": ["**/node_modules/**", "**/.git/**"],
        "fileTypes": [".md", ".txt", ".docx", ".pdf"],
        "sinceDays": 7,
        "includeContent": true
      }
    },
    "chatbot": {
      "enabled": false,
      "schedule": "daily",
      "options": {
        "clients": ["chatwise"],
        "sinceDays": 30,
        "includeContent": true
      }
    }
  },
  "logging": {
    "level": "info"
  }
}
```

**Note:** Git repositories are automatically excluded from filesystem scanning.

Environment variables (fallback):
```bash
export LIFEREWIND_API_URL="http://localhost:3000"
export LIFEREWIND_API_KEY="your-api-key"
```

## CLI Commands

```bash
# Configuration
liferewind init              # Interactive setup wizard
liferewind config show       # Display current config
liferewind config edit       # Open config in editor
liferewind config validate   # Validate config file
liferewind config path       # Show config file locations

# Collection
liferewind start             # Start collector service
liferewind start --run-once  # Collect once and exit
liferewind collect           # Manual trigger (all sources)
liferewind collect git       # Manual trigger (specific source)

# Diagnostics
liferewind status            # Show service status
liferewind doctor            # Check environment issues
```

## Development

```bash
# Development with watch
pnpm dev

# Build
pnpm build

# Production
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
3. Register in `src/sources/index.ts`

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

// src/sources/index.ts
sourceRegistry.register('my-source', (config, ctx) => new MySource(config, ctx));
```

## Project Structure

```
src/
├── index.ts          # Library exports
├── cli/              # CLI commands
│   ├── index.ts      # CLI entry point
│   ├── commands/     # Command implementations
│   ├── detect/       # Environment detection
│   └── utils/        # CLI utilities
├── core/
│   ├── types.ts      # Type definitions
│   ├── collector.ts  # Main orchestrator
│   └── scheduler.ts  # Cron scheduler
├── sources/
│   ├── base.ts       # DataSource base class
│   ├── registry.ts   # Source registry
│   ├── index.ts      # Source registration
│   ├── git/          # Git data source
│   ├── browser/      # Browser history (multi-browser)
│   ├── filesystem/   # Filesystem changes
│   └── chatbot/      # Chatbot history (multi-client)
├── api/
│   └── client.ts     # API client
├── config/
│   ├── schema.ts     # Config schema (Zod)
│   ├── loader.ts     # Config loader
│   ├── writer.ts     # Config writer
│   └── paths.ts      # Config path constants
└── utils/
    ├── logger.ts     # Logger
    └── retry.ts      # Retry with backoff
```
