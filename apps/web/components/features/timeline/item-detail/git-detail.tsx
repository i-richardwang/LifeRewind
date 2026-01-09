'use client';

import { format } from 'date-fns';
import { GitCommit, Plus, Minus, FileText } from 'lucide-react';
import { Badge, Label, Separator, ScrollArea } from '@workspace/ui';
import type { GitData } from '@/db/schema';

interface GitDetailProps {
  data: GitData;
  timestamp: Date;
}

export function GitDetail({ data, timestamp }: GitDetailProps) {
  const { hash, repository, authorName, authorEmail, messageBody, stats } = data;

  return (
    <div className="grid min-w-0 gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-1)]/10">
          <GitCommit className="size-5 text-[var(--chart-1)]" />
        </div>
        <div className="grid min-w-0 gap-1">
          <Label>Repository</Label>
          <p className="truncate font-mono text-sm">{repository}</p>
        </div>
      </div>

      <Separator />

      {/* Metadata */}
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Hash</Label>
          <p className="font-mono text-sm">{hash.slice(0, 8)}</p>
        </div>
        <div className="grid gap-1.5">
          <Label>Author</Label>
          <p className="text-sm">{authorName}</p>
          <p className="text-sm text-muted-foreground">{authorEmail}</p>
        </div>
        <div className="grid gap-1.5">
          <Label>Date</Label>
          <p className="text-sm">{format(new Date(timestamp), 'PPpp')}</p>
        </div>
      </div>

      {/* Commit Message - Static text box with word wrap */}
      {messageBody && (
        <>
          <Separator />
          <div className="grid gap-1.5">
            <Label>Commit Message</Label>
            <div className="rounded-md border bg-muted/50 p-3">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                {messageBody}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Stats */}
      {stats && (
        <>
          <Separator />
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Changes</Label>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <Plus className="size-3" />
                  {stats.insertions}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <Minus className="size-3" />
                  {stats.deletions}
                </span>
                <Badge variant="secondary">{stats.filesChanged} files</Badge>
              </div>
            </div>

            {/* Changed Files - Vertical scrollable list */}
            {stats.files && stats.files.length > 0 && (
              <ScrollArea className="max-h-48 rounded-md border bg-muted/50">
                <div className="p-3">
                  {stats.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex min-w-0 items-center gap-2 py-1 text-sm"
                    >
                      <FileText className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-xs">{file}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </>
      )}
    </div>
  );
}
