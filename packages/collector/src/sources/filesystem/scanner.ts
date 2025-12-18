import { readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, extname, basename, dirname } from 'node:path';
import { minimatch } from 'minimatch';
import type { Logger } from '../../utils/logger.js';
import type { FileChangeItem, FilesystemSourceOptions } from './types.js';
import { expandPath, isGitRepository } from '../../utils/path.js';

/** Text file extensions that support content preview */
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.csv',
  '.log',
  '.rtf',
]);

/** Maximum characters to include in content preview */
const CONTENT_PREVIEW_LENGTH = 500;

/** MIME type mapping for common document formats */
const MIME_MAP: Record<string, string> = {
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.rtf': 'text/rtf',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pages': 'application/vnd.apple.pages',
  '.numbers': 'application/vnd.apple.numbers',
  '.key': 'application/vnd.apple.keynote',
};

export interface ScannerContext {
  logger: Logger;
  options: FilesystemSourceOptions;
}

export class FilesystemScanner {
  private context: ScannerContext;
  private sinceTimestamp: number;

  constructor(context: ScannerContext) {
    this.context = context;
    const sinceDays = context.options.sinceDays ?? 7;
    this.sinceTimestamp = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  }

  /** Check if file matches exclude patterns */
  private isExcluded(filePath: string): boolean {
    return this.context.options.excludePatterns.some((pattern) =>
      minimatch(filePath, pattern, { dot: true })
    );
  }

  /** Check if file matches allowed file types */
  private matchesFileTypes(filePath: string): boolean {
    const types = this.context.options.fileTypes;
    if (!types || types.length === 0) return true;

    const ext = extname(filePath).toLowerCase();
    return types.some((t) => t.toLowerCase() === ext);
  }

  /** Get MIME type based on extension */
  private getMimeType(ext: string): string | undefined {
    return MIME_MAP[ext.toLowerCase()];
  }

  /** Get content preview for text files */
  private getContentPreview(filePath: string, ext: string): string | undefined {
    if (!this.context.options.includeContent) return undefined;
    if (!TEXT_EXTENSIONS.has(ext.toLowerCase())) return undefined;

    try {
      const content = readFileSync(filePath, 'utf-8');
      if (content.length <= CONTENT_PREVIEW_LENGTH) {
        return content;
      }
      return content.slice(0, CONTENT_PREVIEW_LENGTH) + '...';
    } catch {
      return undefined;
    }
  }

  /** Scan a single directory recursively */
  private scanDirectory(dirPath: string): FileChangeItem[] {
    const results: FileChangeItem[] = [];

    let entries;
    try {
      entries = readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
      this.context.logger.warn(`Cannot read directory: ${dirPath}`, error);
      return results;
    }

    for (const entry of entries) {
      const fullPath = resolve(dirPath, entry.name);

      // Check exclusion patterns
      if (this.isExcluded(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Skip git repositories entirely
        if (isGitRepository(fullPath)) {
          this.context.logger.debug(`Skipping git repository: ${fullPath}`);
          continue;
        }
        // Recurse into subdirectory
        results.push(...this.scanDirectory(fullPath));
      } else if (entry.isFile()) {
        // Check file type filter
        if (!this.matchesFileTypes(fullPath)) {
          continue;
        }

        try {
          const stat = statSync(fullPath);
          const mtimeMs = stat.mtimeMs;

          // Check if modified within sinceDays
          if (mtimeMs < this.sinceTimestamp) {
            continue;
          }

          // Check max file size
          const maxSize = this.context.options.maxFileSize;
          if (maxSize !== undefined && stat.size > maxSize) {
            this.context.logger.debug(`Skipping large file: ${fullPath} (${stat.size} bytes)`);
            continue;
          }

          const ext = extname(fullPath);

          results.push({
            filePath: fullPath,
            fileName: basename(fullPath),
            eventType: 'modify', // Stateless mode: all changes are 'modify'
            modifiedAt: new Date(mtimeMs).toISOString(),
            fileSize: stat.size,
            extension: ext,
            mimeType: this.getMimeType(ext),
            contentPreview: this.getContentPreview(fullPath, ext),
            parentDirectory: dirname(fullPath),
          });
        } catch (error) {
          this.context.logger.warn(`Cannot stat file: ${fullPath}`, error);
        }
      }
    }

    return results;
  }

  /** Scan all configured watch paths */
  scan(): FileChangeItem[] {
    const allItems: FileChangeItem[] = [];

    for (const watchPath of this.context.options.watchPaths) {
      const expandedPath = expandPath(watchPath);

      try {
        const stat = statSync(expandedPath);
        if (!stat.isDirectory()) {
          this.context.logger.warn(`Watch path is not a directory: ${watchPath}`);
          continue;
        }

        // Skip if watchPath itself is a git repository
        if (isGitRepository(expandedPath)) {
          this.context.logger.info(`Skipping git repository: ${watchPath}`);
          continue;
        }

        this.context.logger.debug(`Scanning: ${expandedPath}`);
        const items = this.scanDirectory(expandedPath);
        allItems.push(...items);
        this.context.logger.debug(`Found ${items.length} files in ${watchPath}`);
      } catch (error) {
        this.context.logger.error(`Cannot access watch path: ${watchPath}`, error);
      }
    }

    // Sort by modification time descending
    allItems.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return allItems;
  }
}
