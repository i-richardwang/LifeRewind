'use client';

import { format } from 'date-fns';
import { FileText, FolderOpen } from 'lucide-react';
import { Badge, Label, Separator } from '@workspace/ui';
import type { FilesystemData } from '@/db/schema';

interface FilesystemDetailProps {
  data: FilesystemData;
  timestamp: Date;
}

const eventTypeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  create: { label: 'Created', variant: 'default' },
  modify: { label: 'Modified', variant: 'secondary' },
  delete: { label: 'Deleted', variant: 'destructive' },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FilesystemDetail({ data, timestamp }: FilesystemDetailProps) {
  const {
    filePath,
    eventType,
    fileSize,
    extension,
    mimeType,
    contentPreview,
    parentDirectory,
    dailyModifyCount,
    firstModifiedTime,
    lastModifiedTime,
  } = data;

  const fileName = filePath.split('/').pop() || filePath;
  const eventInfo = eventTypeConfig[eventType] || { label: eventType, variant: 'secondary' as const };

  return (
    <div className="grid min-w-0 gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-3)]/10">
          <FileText className="size-5 text-[var(--chart-3)]" />
        </div>
        <div className="grid min-w-0 flex-1 gap-1">
          <Label>File</Label>
          <p className="truncate font-mono text-sm">{fileName}</p>
        </div>
        <Badge variant={eventInfo.variant}>{eventInfo.label}</Badge>
      </div>

      <Separator />

      {/* Metadata */}
      <div className="grid gap-4">
        {extension && (
          <div className="grid gap-1.5">
            <Label>Extension</Label>
            <p className="font-mono text-sm">{extension}</p>
          </div>
        )}
        {fileSize > 0 && (
          <div className="grid gap-1.5">
            <Label>Size</Label>
            <p className="text-sm">{formatFileSize(fileSize)}</p>
          </div>
        )}
        {mimeType && (
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <p className="text-sm text-muted-foreground">{mimeType}</p>
          </div>
        )}
        <div className="grid gap-1.5">
          <Label>Date</Label>
          <p className="text-sm">{format(new Date(timestamp), 'PPpp')}</p>
        </div>
      </div>

      {/* Full Path - Static text box with word wrap */}
      <Separator />
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-muted-foreground" />
          <Label>Location</Label>
        </div>
        <div className="rounded-md border bg-muted/50 p-3">
          <p className="break-all font-mono text-xs">{filePath}</p>
        </div>
        {parentDirectory && (
          <p className="text-xs text-muted-foreground">In: {parentDirectory}</p>
        )}
      </div>

      {/* Content Preview - Text box with max-height and vertical scroll */}
      {contentPreview && (
        <>
          <Separator />
          <div className="grid gap-1.5">
            <Label>Content Preview</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                {contentPreview}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Activity Stats - StatsCard */}
      {(dailyModifyCount > 0 || firstModifiedTime || lastModifiedTime) && (
        <>
          <Separator />
          <div className="grid gap-3">
            <Label>Activity Today</Label>
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="grid gap-2">
                {dailyModifyCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Modifications</span>
                    <Badge variant="secondary">{dailyModifyCount} times</Badge>
                  </div>
                )}
                {firstModifiedTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">First Modified</span>
                    <span>{firstModifiedTime}</span>
                  </div>
                )}
                {lastModifiedTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Modified</span>
                    <span>{lastModifiedTime}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
