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
import { Button } from '@workspace/ui';

interface QuickDatePickerProps {
  currentDate: Date;
}

type PresetType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek';

interface Preset {
  label: string;
  value: PresetType;
}

const PRESETS: Preset[] = [
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

  const isActivePreset = (preset: PresetType): boolean => {
    switch (preset) {
      case 'today':
        return isToday(currentDate);
      case 'yesterday':
        return isYesterday(currentDate);
      case 'thisWeek': {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        return isSameDay(currentDate, weekStart);
      }
      case 'lastWeek': {
        const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), {
          weekStartsOn: 1,
        });
        return isSameDay(currentDate, lastWeekStart);
      }
    }
  };

  const handlePresetClick = (preset: PresetType) => {
    const date = getDateForPreset(preset);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', format(date, 'yyyy-MM-dd'));
    router.push(`/timeline?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          variant={isActivePreset(preset.value) ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
