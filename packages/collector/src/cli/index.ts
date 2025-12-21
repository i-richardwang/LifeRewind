#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { collectCommand } from './commands/collect.js';
import { configCommand } from './commands/config.js';
import { statusCommand } from './commands/status.js';
import { doctorCommand } from './commands/doctor.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

const program = new Command();

program
  .name('liferewind')
  .description('LifeRewind data collector - capture your digital footprint')
  .version(packageJson.version)
  .option('-c, --config <path>', 'path to config file')
  .option('--verbose', 'enable verbose output')
  .option('--quiet', 'suppress non-essential output');

program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(collectCommand);
program.addCommand(configCommand);
program.addCommand(statusCommand);
program.addCommand(doctorCommand);

program.parse();
