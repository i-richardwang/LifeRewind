'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Separator, Checkbox, ScrollArea } from '@workspace/ui';
import { useCalendarDates } from '@/hooks';
import type { SourceType } from '@/db/schema';

interface TimelineSidebarProps {
  selectedDate: Date;
  initialDatesWithData: Date[];
  selectedSources: SourceType[];
}

const ALL_SOURCES: SourceType[] = ['git', 'browser', 'filesystem', 'chatbot'];

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'git', label: 'Git Commits' },
  { value: 'browser', label: 'Browser History' },
  { value: 'filesystem', label: 'File Changes' },
  { value: 'chatbot', label: 'Chat Sessions' },
];

export function TimelineSidebar({
  selectedDate,
  initialDatesWithData,
  selectedSources,
}: TimelineSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { datesWithData, handleMonthChange } = useCalendarDates({
    initialDates: initialDatesWithData,
    initialMonth: selectedDate,
  });

  // If no sources selected, treat as "all selected"
  const effectiveSources =
    selectedSources.length === 0 ? ALL_SOURCES : selectedSources;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', format(date, 'yyyy-MM-dd'));
    router.push(`/timeline?${params.toString()}`);
  };

  const handleSourceToggle = (source: SourceType, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('source');

    let newSources: SourceType[];

    if (checked) {
      if (selectedSources.length === 0) {
        newSources = ALL_SOURCES;
      } else {
        newSources = [...selectedSources, source];
      }
    } else {
      if (selectedSources.length === 0) {
        newSources = ALL_SOURCES.filter((s) => s !== source);
      } else {
        newSources = selectedSources.filter((s) => s !== source);
      }
    }

    if (newSources.length !== ALL_SOURCES.length && newSources.length > 0) {
      newSources.forEach((s) => params.append('source', s));
    }

    router.push(`/timeline?${params.toString()}`);
  };

  const isSourceSelected = (source: SourceType): boolean => {
    return effectiveSources.includes(source);
  };

  return (
    <aside className="bg-sidebar hidden h-full w-[280px] shrink-0 flex-col border-l lg:flex">
      <div className="shrink-0 border-b p-4">
        <h3 className="font-medium">Select Date</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          <div className="px-2 pt-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              defaultMonth={selectedDate}
              modifiers={{
                hasData: datesWithData,
              }}
              modifiersClassNames={{
                hasData: '[&>button]:bg-primary/20 [&>button]:font-semibold',
              }}
              className="w-full bg-transparent p-0"
            />
          </div>

          <Separator className="my-2" />

          <div className="p-2">
            <div className="text-sidebar-foreground/70 mb-2 px-2 text-xs font-medium">
              Filter by Source
            </div>
            <div className="space-y-3 px-2">
              {SOURCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={isSourceSelected(option.value)}
                    onCheckedChange={(checked) =>
                      handleSourceToggle(option.value, checked === true)
                    }
                  />
                  <span
                    className={
                      isSourceSelected(option.value)
                        ? ''
                        : 'text-muted-foreground'
                    }
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
