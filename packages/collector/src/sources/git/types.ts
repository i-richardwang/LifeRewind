export interface GitCommit {
  hash: string;
  repository: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
    files: string[];
  };
}

export interface GitSourceOptions {
  /** Directories to scan for git repositories */
  scanPaths: string[];
  /** Repository paths to exclude from collection */
  excludeRepositories?: string[];
  /** Filter commits by author email or name */
  authors?: string[];
  /** Only collect commits from the last N days */
  sinceDays: number;
}
