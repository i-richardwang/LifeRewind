import { existsSync, statSync } from 'node:fs';
import { DataSource } from '../base.js';
import type { CollectionResult } from '../../core/types.js';
import type { FilesystemSourceOptions } from './types.js';
import { FilesystemScanner } from './scanner.js';
import { expandPath } from '../../utils/path.js';

export class FilesystemSource extends DataSource<FilesystemSourceOptions> {
  readonly type = 'filesystem' as const;
  readonly name = 'Filesystem Changes';

  async validate(): Promise<boolean> {
    if (!this.options.watchPaths || this.options.watchPaths.length === 0) {
      this.context.logger.error('No watch paths configured for filesystem source');
      return false;
    }

    const validPaths: string[] = [];

    for (const watchPath of this.options.watchPaths) {
      const expanded = expandPath(watchPath);

      if (!existsSync(expanded)) {
        this.context.logger.warn(`Watch path does not exist: ${watchPath}`);
        continue;
      }

      try {
        const stat = statSync(expanded);
        if (!stat.isDirectory()) {
          this.context.logger.warn(`Watch path is not a directory: ${watchPath}`);
          continue;
        }
        validPaths.push(expanded);
      } catch (error) {
        this.context.logger.warn(`Cannot access watch path: ${watchPath}`, error);
      }
    }

    if (validPaths.length === 0) {
      this.context.logger.error('No valid watch paths found');
      return false;
    }

    this.context.logger.info(`Validated ${validPaths.length} watch paths for filesystem source`);
    return true;
  }

  async collect(): Promise<CollectionResult> {
    const scanner = new FilesystemScanner({
      logger: this.context.logger,
      options: this.options,
    });

    const items = scanner.scan();

    this.context.logger.info(`Found ${items.length} modified files`);

    return {
      sourceType: this.type,
      success: true,
      itemsCollected: items.length,
      items: items.map((item) => ({
        sourceType: this.type,
        timestamp: new Date(item.modifiedAt),
        data: item,
      })),
      collectedAt: new Date(),
    };
  }
}
