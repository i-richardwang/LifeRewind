'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Button,
  Calendar,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@workspace/ui';
import { useCalendarDates } from '@/hooks';

interface MobileDatePickerProps {
  selectedDate: Date;
  initialDatesWithData: Date[];
}

export function MobileDatePicker({
  selectedDate,
  initialDatesWithData,
}: MobileDatePickerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { datesWithData, handleMonthChange } = useCalendarDates({
    initialDates: initialDatesWithData,
    initialMonth: selectedDate,
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', format(date, 'yyyy-MM-dd'));
    router.push(`/timeline?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full justify-between lg:hidden">
          <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          <CalendarIcon className="size-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Select Date</DrawerTitle>
        </DrawerHeader>
        <div className="flex justify-center p-4">
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
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
