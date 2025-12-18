import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from '../base.js';
import type { CollectionResult } from '../../core/types.js';
import type { GitCommit, GitSourceOptions } from './types.js';
import { expandPath, isGitRepository } from '../../utils/path.js';

export class GitSource extends DataSource<GitSourceOptions> {
  readonly type = 'git' as const;
  readonly name = 'Git Commits';

  private discoveredRepos: string[] = [];

  async validate(): Promise<boolean> {
    try {
      this.execGit('.', ['--version']);
    } catch {
      this.context.logger.error('Git is not installed or not in PATH');
      return false;
    }

    if (!this.options.scanPaths || this.options.scanPaths.length === 0) {
      this.context.logger.error('No scan paths configured for git source');
      return false;
    }

    // Discover all git repositories in scan paths
    const excludeSet = new Set(
      (this.options.excludeRepositories ?? []).map((p) => expandPath(p))
    );

    for (const scanPath of this.options.scanPaths) {
      const expanded = expandPath(scanPath);
      if (!existsSync(expanded)) {
        this.context.logger.warn(`Scan path does not exist: ${scanPath}`);
        continue;
      }

      const repos = this.discoverRepositories(expanded, excludeSet);
      this.discoveredRepos.push(...repos);
    }

    if (this.discoveredRepos.length === 0) {
      this.context.logger.error('No git repositories found in scan paths');
      return false;
    }

    this.context.logger.info(`Discovered ${this.discoveredRepos.length} git repositories`);
    return true;
  }

  /** Recursively discover git repositories in a directory */
  private discoverRepositories(dirPath: string, excludeSet: Set<string>): string[] {
    const repos: string[] = [];

    // Check if this directory itself is a git repo
    if (isGitRepository(dirPath)) {
      if (excludeSet.has(dirPath)) {
        this.context.logger.debug(`Excluding repository: ${dirPath}`);
      } else {
        repos.push(dirPath);
      }
      // Don't recurse into git repos (nested repos are rare)
      return repos;
    }

    // Scan subdirectories
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        // Skip hidden directories and common non-repo directories
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const subPath = resolve(dirPath, entry.name);
        repos.push(...this.discoverRepositories(subPath, excludeSet));
      }
    } catch (error) {
      this.context.logger.debug(`Cannot read directory: ${dirPath}`);
    }

    return repos;
  }

  async collect(): Promise<CollectionResult> {
    const items: GitCommit[] = [];
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - this.options.sinceDays);

    for (const repoPath of this.discoveredRepos) {
      try {
        const commits = this.getCommitsFromRepo(repoPath, sinceDate);
        items.push(...commits);
        this.context.logger.debug(`Found ${commits.length} commits in ${repoPath}`);
      } catch (error) {
        this.context.logger.error(`Failed to get commits from ${repoPath}`, error);
      }
    }

    return {
      sourceType: this.type,
      success: true,
      itemsCollected: items.length,
      items: items.map((commit) => ({
        sourceType: this.type,
        timestamp: new Date(commit.date),
        data: commit,
      })),
      collectedAt: new Date(),
    };
  }

  /** Execute git command safely using execFileSync */
  private execGit(repoPath: string, args: string[]): string {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  private getCommitsFromRepo(repoPath: string, since: Date): GitCommit[] {
    const sinceStr = since.toISOString().split('T')[0]!;
    // Use NULL (%x00) as field separator and record separator for safe parsing
    // %B = full commit message (subject + body)
    const fieldSep = '%x00';
    const recordSep = '%x00%x00';
    const format = `%H${fieldSep}%an${fieldSep}%ae${fieldSep}%at${fieldSep}%B${recordSep}`;

    const args = ['log', `--since=${sinceStr}`, `--format=${format}`];
    if (this.options.authors?.length) {
      for (const author of this.options.authors) {
        args.push(`--author=${author}`);
      }
    }

    try {
      const output = this.execGit(repoPath, args);
      const commits = this.parseGitLog(output, repoPath);

      return commits.map((commit) => {
        const stats = this.getCommitStats(repoPath, commit.hash);
        return { ...commit, stats };
      });
    } catch (error) {
      this.context.logger.warn(`Failed to get git log from ${repoPath}`, error);
      return [];
    }
  }

  private parseGitLog(output: string, repoPath: string): Omit<GitCommit, 'stats'>[] {
    const commits: Omit<GitCommit, 'stats'>[] = [];
    // Split by double NULL (record separator)
    const records = output.split('\0\0').filter(Boolean);

    for (const record of records) {
      // Split by single NULL (field separator)
      const parts = record.split('\0');
      if (parts.length < 5) continue;

      const [rawHash, authorName, authorEmail, timestamp, ...messageParts] = parts;
      // Trim hash to remove any leading/trailing whitespace (including newlines from %B)
      const hash = rawHash?.trim();
      if (!hash || !authorName || !authorEmail || !timestamp) continue;

      // Join message parts and trim whitespace
      const message = messageParts.join('\0').trim();

      commits.push({
        hash,
        repository: repoPath,
        authorName,
        authorEmail,
        date: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
        message,
      });
    }

    return commits;
  }

  private getCommitStats(
    repoPath: string,
    hash: string
  ): { filesChanged: number; insertions: number; deletions: number } {
    try {
      const output = this.execGit(repoPath, ['show', '--stat', '--format=', hash]);
      const lines = output.trim().split('\n');
      const summaryLine = lines[lines.length - 1] ?? '';

      const filesMatch = summaryLine.match(/(\d+) files? changed/);
      const insertMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
      const deleteMatch = summaryLine.match(/(\d+) deletions?\(-\)/);

      return {
        filesChanged: filesMatch?.[1] ? parseInt(filesMatch[1], 10) : 0,
        insertions: insertMatch?.[1] ? parseInt(insertMatch[1], 10) : 0,
        deletions: deleteMatch?.[1] ? parseInt(deleteMatch[1], 10) : 0,
      };
    } catch (error) {
      this.context.logger.warn(`Failed to get commit stats for ${hash}`, error);
      return { filesChanged: 0, insertions: 0, deletions: 0 };
    }
  }
}
