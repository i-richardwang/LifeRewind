'use client';

import { format } from 'date-fns';
import { Globe, ExternalLink } from 'lucide-react';
import { Badge, Label, Separator, Button, ScrollArea, ScrollBar } from '@workspace/ui';
import type { BrowserData } from '@/db/schema';

interface BrowserDetailProps {
  data: BrowserData;
  timestamp: Date;
  url: string | null;
}

const browserLabels: Record<string, string> = {
  chrome: 'Chrome',
  safari: 'Safari',
  arc: 'Arc',
  dia: 'Dia',
  comet: 'Comet',
};

export function BrowserDetail({ data, timestamp, url }: BrowserDetailProps) {
  const {
    browser,
    profiles,
    dailyVisitCount,
    firstVisitTime,
    lastVisitTime,
  } = data;

  const hostname = url ? new URL(url).hostname : null;

  return (
    <div className="grid min-w-0 gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-2)]/10">
          <Globe className="size-5 text-[var(--chart-2)]" />
        </div>
        <div className="grid min-w-0 gap-1">
          <Label>Website</Label>
          <p className="truncate text-sm">{hostname || 'Unknown'}</p>
        </div>
      </div>

      <Separator />

      {/* Metadata */}
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Browser</Label>
          <div>
            <Badge variant="outline">
              {browserLabels[browser] || browser}
            </Badge>
          </div>
        </div>
        {profiles && profiles.length > 0 && (
          <div className="grid gap-1.5">
            <Label>Profile</Label>
            <p className="text-sm">{profiles.join(', ')}</p>
          </div>
        )}
        <div className="grid gap-1.5">
          <Label>Visited</Label>
          <p className="text-sm">{format(new Date(timestamp), 'PPpp')}</p>
        </div>
      </div>

      {/* URL - Horizontal scrollable */}
      {url && (
        <>
          <Separator />
          <div className="grid gap-1.5">
            <Label>URL</Label>
            <div className="flex min-w-0 items-center gap-2">
              <ScrollArea className="min-w-0 flex-1 rounded-md border bg-muted/50">
                <div className="p-3">
                  <code className="whitespace-nowrap font-mono text-xs">{url}</code>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <Button variant="outline" size="icon" asChild className="shrink-0">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Visit Stats - StatsCard */}
      {(dailyVisitCount > 0 || firstVisitTime || lastVisitTime) && (
        <>
          <Separator />
          <div className="grid gap-3">
            <Label>Activity Today</Label>
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="grid gap-2">
                {dailyVisitCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Visit Count</span>
                    <Badge variant="secondary">{dailyVisitCount} times</Badge>
                  </div>
                )}
                {firstVisitTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">First Visit</span>
                    <span>{firstVisitTime}</span>
                  </div>
                )}
                {lastVisitTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Visit</span>
                    <span>{lastVisitTime}</span>
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
