'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  format,
  subDays,
  startOfWeek,
  subWeeks,
  isToday,
  isYesterday,
  isSameDay,
} from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui';

interface QuickDatePickerProps {
  currentDate: Date;
}

type PresetType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek';

const PRESETS: { label: string; value: PresetType }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'Last Week', value: 'lastWeek' },
];

export function QuickDatePicker({ currentDate }: QuickDatePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getDateForPreset = (preset: PresetType): Date => {
    const today = new Date();
    switch (preset) {
      case 'today':
        return today;
      case 'yesterday':
        return subDays(today, 1);
      case 'thisWeek':
        return startOfWeek(today, { weekStartsOn: 1 });
      case 'lastWeek':
        return startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    }
  };

  const getActivePreset = (): PresetType | undefined => {
    if (isToday(currentDate)) return 'today';
    if (isYesterday(currentDate)) return 'yesterday';

    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    if (isSameDay(currentDate, thisWeekStart)) return 'thisWeek';

    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    if (isSameDay(currentDate, lastWeekStart)) return 'lastWeek';

    return undefined;
  };

  const handleValueChange = (value: string) => {
    if (!value) return;
    const date = getDateForPreset(value as PresetType);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', format(date, 'yyyy-MM-dd'));
    router.push(`/timeline?${params.toString()}`);
  };

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={getActivePreset()}
      onValueChange={handleValueChange}
    >
      {PRESETS.map((preset) => (
        <ToggleGroupItem key={preset.value} value={preset.value}>
          {preset.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
