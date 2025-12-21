import { sourceRegistry } from './registry.js';
import { GitSource } from './git/index.js';
import { BrowserSource } from './browser/index.js';
import { FilesystemSource } from './filesystem/index.js';
import { ChatbotSource } from './chatbot/index.js';

export function registerBuiltinSources(): void {
  sourceRegistry.register('git', (config, ctx) => new GitSource(config, ctx));
  sourceRegistry.register('browser', (config, ctx) => new BrowserSource(config, ctx));
  sourceRegistry.register('filesystem', (config, ctx) => new FilesystemSource(config, ctx));
  sourceRegistry.register('chatbot', (config, ctx) => new ChatbotSource(config, ctx));
}

export { sourceRegistry } from './registry.js';
export { GitSource } from './git/index.js';
export { BrowserSource } from './browser/index.js';
export { FilesystemSource } from './filesystem/index.js';
export { ChatbotSource } from './chatbot/index.js';
