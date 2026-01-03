'use client';

import { format } from 'date-fns';
import { Badge } from '@workspace/ui';
import { SourceIcon } from '@/components/source-icon';
import type { CollectedItem } from '@/db/schema';

interface TimelineItemProps {
  item: CollectedItem;
}

export function TimelineItem({ item }: TimelineItemProps) {
  const time = format(new Date(item.timestamp), 'HH:mm');

  return (
    <div className="group relative">
      {/* Time marker dot */}
      <div className="absolute -left-6 top-3 -ml-1 size-2 rounded-full bg-primary" />

      {/* Content */}
      <div className="rounded-lg p-3 transition-colors hover:bg-muted/50">
        <div className="flex items-start gap-3">
          <SourceIcon source={item.sourceType} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{time}</span>
              <Badge variant="outline" className="text-xs">
                {item.sourceType}
              </Badge>
            </div>
            <p className="mt-1 truncate font-medium">
              {item.title || 'Untitled'}
            </p>
            {item.url && (
              <p className="truncate text-sm text-muted-foreground">
                {item.url}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
