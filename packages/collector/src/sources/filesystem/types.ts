/** Filesystem data source configuration options */
export interface FilesystemSourceOptions {
  /** Paths to watch for file changes, supports ~/ expansion */
  watchPaths: string[];
  /** Glob patterns to exclude (e.g., node_modules, .git) */
  excludePatterns: string[];
  /** File extensions to include (e.g., ['.md', '.docx']), empty means all */
  fileTypes?: string[];
  /** Only scan files modified within this many days */
  sinceDays: number;
  /** Skip files larger than this size in bytes */
  maxFileSize?: number;
  /** Include content preview for text files */
  includeContent?: boolean;
}

/** Event type for file changes */
export type FileEventType = 'create' | 'modify' | 'delete';

/** Information about a file change */
export interface FileChangeItem {
  /** Absolute path to the file */
  filePath: string;
  /** Base name of the file */
  fileName: string;
  /** Type of change (always 'modify' in stateless mode) */
  eventType: FileEventType;
  /** ISO timestamp of file modification */
  modifiedAt: string;
  /** File size in bytes */
  fileSize: number;
  /** File extension (e.g., '.md') */
  extension: string;
  /** MIME type if detectable */
  mimeType?: string;
  /** First N characters of text content */
  contentPreview?: string;
  /** Parent directory path */
  parentDirectory: string;
}
