export interface GitCommit {
  hash: string;
  repository: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
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
