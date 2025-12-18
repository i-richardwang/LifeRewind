import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { DataSource } from '../base.js';
import type { CollectionResult } from '../../core/types.js';
import type { GitCommit, GitSourceOptions } from './types.js';

function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return resolve(homedir(), path.slice(2));
  }
  return resolve(path);
}

export class GitSource extends DataSource<GitSourceOptions> {
  readonly type = 'git' as const;
  readonly name = 'Git Commits';

  async validate(): Promise<boolean> {
    try {
      this.execGit('.', ['--version']);
    } catch {
      this.context.logger.error('Git is not installed or not in PATH');
      return false;
    }

    const validRepos: string[] = [];
    for (const repoPath of this.options.repositories) {
      const expanded = expandPath(repoPath);
      if (!existsSync(expanded)) {
        this.context.logger.warn(`Repository path does not exist: ${repoPath}`);
        continue;
      }
      const gitDir = resolve(expanded, '.git');
      if (!existsSync(gitDir)) {
        this.context.logger.warn(`Not a git repository: ${repoPath}`);
        continue;
      }
      validRepos.push(expanded);
    }

    if (validRepos.length === 0) {
      this.context.logger.error('No valid git repositories found');
      return false;
    }

    return true;
  }

  async collect(): Promise<CollectionResult> {
    const items: GitCommit[] = [];
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - this.options.sinceDays);

    for (const repoPath of this.options.repositories) {
      const expanded = expandPath(repoPath);
      try {
        const commits = this.getCommitsFromRepo(expanded, sinceDate);
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
    const format = '%H|%an|%ae|%at|%s';

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
    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 5) continue;

      const [hash, authorName, authorEmail, timestamp, ...subjectParts] = parts;
      if (!hash || !authorName || !authorEmail || !timestamp) continue;

      commits.push({
        hash,
        repository: repoPath,
        authorName,
        authorEmail,
        date: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
        subject: subjectParts.join('|'),
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
