'use client';

import { format } from 'date-fns';
import { Mail, Paperclip, Star } from 'lucide-react';
import { Badge, Label, Separator } from '@workspace/ui';
import type { EmailData } from '@/db/schema';

interface EmailDetailProps {
  data: EmailData;
  timestamp: Date;
}

function formatEmailAddress(addr: { name?: string; email: string }): string {
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

const labelColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INBOX: 'default',
  SENT: 'secondary',
  IMPORTANT: 'destructive',
  STARRED: 'default',
  SPAM: 'destructive',
  TRASH: 'destructive',
};

export function EmailDetail({ data, timestamp }: EmailDetailProps) {
  const {
    from,
    to,
    cc,
    labels,
    snippet,
    hasAttachments,
    attachmentCount,
    isRead,
    isStarred,
  } = data;

  // Filter out system labels that start with CATEGORY_
  const displayLabels = labels.filter(
    (l) => !l.startsWith('CATEGORY_') && l !== 'UNREAD'
  );

  return (
    <div className="grid min-w-0 gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-5)]/10">
          <Mail className="size-5 text-[var(--chart-5)]" />
        </div>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex items-center gap-2">
            <Label>From</Label>
            {isStarred && <Star className="size-3 fill-yellow-400 text-yellow-400" />}
            {!isRead && <Badge variant="default" className="text-xs">Unread</Badge>}
          </div>
          <p className="truncate text-sm">{formatEmailAddress(from)}</p>
        </div>
      </div>

      <Separator />

      {/* Recipients */}
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>To</Label>
          <div className="space-y-1">
            {to.map((addr, i) => (
              <p key={i} className="truncate text-sm">
                {formatEmailAddress(addr)}
              </p>
            ))}
          </div>
        </div>

        {cc && cc.length > 0 && (
          <div className="grid gap-1.5">
            <Label>Cc</Label>
            <div className="space-y-1">
              {cc.map((addr, i) => (
                <p key={i} className="truncate text-sm text-muted-foreground">
                  {formatEmailAddress(addr)}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label>Date</Label>
          <p className="text-sm">{format(new Date(timestamp), 'PPpp')}</p>
        </div>
      </div>

      {/* Labels */}
      {displayLabels.length > 0 && (
        <>
          <Separator />
          <div className="grid gap-1.5">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-1">
              {displayLabels.map((label) => (
                <Badge
                  key={label}
                  variant={labelColors[label] || 'outline'}
                  className="text-xs"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      {snippet && (
        <>
          <Separator />
          <div className="grid gap-1.5">
            <Label>Preview</Label>
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {snippet}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Attachments */}
      {hasAttachments && (
        <>
          <Separator />
          <div className="grid gap-1.5">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <Paperclip className="size-4 text-muted-foreground" />
              <span className="text-sm">
                {attachmentCount} file{attachmentCount !== 1 ? 's' : ''} attached
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
