'use client';

import { format } from 'date-fns';
import {
  Separator,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@workspace/ui';
import { Calendar } from 'lucide-react';
import { TimelineItem } from './timeline-item';
import type { CollectedItem } from '@/db/schema';

interface TimelineContentProps {
  items: CollectedItem[];
  currentDate: Date;
}

export function TimelineContent({ items, currentDate }: TimelineContentProps) {
  // Group items by hour
  const itemsByHour = items.reduce(
    (acc, item) => {
      const hour = format(new Date(item.timestamp), 'HH:00');
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(item);
      return acc;
    },
    {} as Record<string, CollectedItem[]>
  );

  const hours = Object.keys(itemsByHour).sort();

  if (items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Calendar />
          </EmptyMedia>
          <EmptyTitle>No activity recorded</EmptyTitle>
          <EmptyDescription>
            There is no collected data for {format(currentDate, 'MMMM d, yyyy')}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Date header - visible on desktop */}
      <div className="hidden shrink-0 lg:block">
        <h2 className="text-lg font-medium">{format(currentDate, 'EEEE')}</h2>
        <p className="text-sm text-muted-foreground">
          {format(currentDate, 'MMMM d, yyyy')} · {items.length} items
        </p>
      </div>

      {/* Timeline - scrollable area that fills remaining space */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto lg:mt-4">
        <div className="space-y-6 pb-8">
          {hours.map((hour) => (
            <div key={hour} className="relative">
              {/* Hour marker */}
              <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 bg-background py-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {hour}
                </span>
                <Separator className="flex-1" />
              </div>

              {/* Items */}
              <div className="space-y-2 border-l pl-6">
                {(itemsByHour[hour] ?? []).map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
