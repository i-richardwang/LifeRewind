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
  '.tsv',
  '.log',
  '.rtf',
  '.sql',
  '.rmd',
  '.qmd',
]);

/** Maximum characters to include in content preview */
const CONTENT_PREVIEW_LENGTH = 500;

/** Check if a filename is a temporary or hidden file that should be skipped */
function isTemporaryOrHiddenFile(fileName: string): boolean {
  // Hidden files (start with .)
  if (fileName.startsWith('.')) return true;

  // Microsoft Office temporary files (~$xxx.docx, ~WRL0001.tmp)
  if (fileName.startsWith('~$') || fileName.startsWith('~WRL')) return true;

  // General temporary files starting with ~
  if (fileName.startsWith('~') && !fileName.endsWith('.md')) return true;

  // macOS temporary files (.DS_Store already caught by hidden check)
  // Windows temporary files
  if (fileName.endsWith('.tmp') || fileName.endsWith('.temp')) return true;

  // Backup files
  if (fileName.endsWith('~') || fileName.endsWith('.bak')) return true;

  // Lock files
  if (fileName.endsWith('.lock') || fileName.endsWith('.lck')) return true;

  // Swap files (vim, etc.)
  if (fileName.endsWith('.swp') || fileName.endsWith('.swo')) return true;

  return false;
}

/** MIME type mapping for common document formats */
const MIME_MAP: Record<string, string> = {
  // Text & Markdown
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.rtf': 'text/rtf',
  '.log': 'text/plain',

  // Data formats
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',

  // Documents
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

  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.psd': 'image/vnd.adobe.photoshop',
  '.ai': 'application/postscript',
  '.eps': 'application/postscript',
  '.sketch': 'application/x-sketch',
  '.fig': 'application/x-figma',

  // Archives
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.bz2': 'application/x-bzip2',
  '.xz': 'application/x-xz',
  '.dmg': 'application/x-apple-diskimage',

  // Applications & Installers
  '.exe': 'application/x-msdownload',
  '.msi': 'application/x-msi',
  '.app': 'application/x-apple-application',
  '.pkg': 'application/x-newton-compatible-pkg',
  '.deb': 'application/x-deb',
  '.rpm': 'application/x-rpm',
  '.apk': 'application/vnd.android.package-archive',
  '.ipa': 'application/x-ios-app',

  // Data Science & Analytics
  '.parquet': 'application/x-parquet',
  '.feather': 'application/x-feather',
  '.arrow': 'application/x-arrow',
  '.pickle': 'application/x-pickle',
  '.pkl': 'application/x-pickle',
  '.h5': 'application/x-hdf5',
  '.hdf5': 'application/x-hdf5',
  '.npy': 'application/x-numpy',
  '.npz': 'application/x-numpy',
  '.sav': 'application/x-spss-sav',
  '.dta': 'application/x-stata-dta',
  '.rds': 'application/x-r-data',
  '.rdata': 'application/x-r-data',

  // Tableau
  '.twb': 'application/x-tableau-workbook',
  '.twbx': 'application/x-tableau-packaged-workbook',
  '.tds': 'application/x-tableau-datasource',
  '.tdsx': 'application/x-tableau-packaged-datasource',
  '.hyper': 'application/x-tableau-hyper',
  '.tde': 'application/x-tableau-extract',

  // Database
  '.sql': 'application/sql',
  '.db': 'application/x-sqlite3',
  '.sqlite': 'application/x-sqlite3',
  '.sqlite3': 'application/x-sqlite3',

  // Notebooks & Scripts
  '.ipynb': 'application/x-ipynb+json',
  '.rmd': 'text/x-r-markdown',
  '.qmd': 'text/x-quarto-markdown',

  // E-books
  '.epub': 'application/epub+zip',
  '.mobi': 'application/x-mobipocket-ebook',
  '.azw3': 'application/vnd.amazon.ebook',
  '.djvu': 'image/vnd.djvu',
  '.cbz': 'application/vnd.comicbook+zip',
  '.cbr': 'application/vnd.comicbook-rar',

  // Fonts
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
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

      // Skip hidden and temporary files/directories
      if (isTemporaryOrHiddenFile(entry.name)) {
        continue;
      }

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
