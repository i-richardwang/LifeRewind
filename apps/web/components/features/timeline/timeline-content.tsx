'use client';

import { format } from 'date-fns';
import {
  Badge,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@workspace/ui';
import { Calendar } from 'lucide-react';
import { SourceIcon } from '@/components/source-icon';
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

      {/* Timeline Table */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 pb-8">
          {hours.map((hour) => (
            <section key={hour}>
              {/* Hour marker */}
              <div className="sticky top-0 z-10 mb-2 flex items-center gap-3 bg-background/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Badge variant="outline" className="font-mono text-xs">
                  {hour}
                </Badge>
                <Separator className="flex-1" />
              </div>

              {/* Items Table */}
              <div className="rounded-md border">
                <Table>
                  <TableBody>
                    {(itemsByHour[hour] ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="w-12 text-muted-foreground">
                          {format(new Date(item.timestamp), 'HH:mm')}
                        </TableCell>
                        <TableCell className="w-8">
                          <SourceIcon source={item.sourceType} className="size-4" />
                        </TableCell>
                        <TableCell className="max-w-0 truncate font-medium">
                          {item.title || 'Untitled'}
                        </TableCell>
                        <TableCell className="hidden w-20 md:table-cell">
                          <Badge variant="secondary" className="text-xs">
                            {item.sourceType}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
