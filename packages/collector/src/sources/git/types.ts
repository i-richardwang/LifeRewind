export interface GitCommit {
  hash: string;
  repository: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string; // Full commit message (subject + body)
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

export interface GitSourceOptions {
  repositories: string[];
  authors?: string[];
  sinceDays: number;
}
