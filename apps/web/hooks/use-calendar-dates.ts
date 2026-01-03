'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

interface UseCalendarDatesOptions {
  /** Initial dates with data (from server) */
  initialDates?: Date[];
  /** Initial month to display */
  initialMonth: Date;
}

interface UseCalendarDatesReturn {
  /** Current displayed month */
  displayedMonth: Date;
  /** Dates that have data in the current month */
  datesWithData: Date[];
  /** Whether data is being fetched */
  isLoading: boolean;
  /** Handle month change from calendar */
  handleMonthChange: (month: Date) => void;
}

/**
 * Hook to manage calendar dates with data
 * Fetches dates dynamically when month changes
 */
export function useCalendarDates({
  initialDates = [],
  initialMonth,
}: UseCalendarDatesOptions): UseCalendarDatesReturn {
  const [displayedMonth, setDisplayedMonth] = useState(initialMonth);
  const [datesWithData, setDatesWithData] = useState<Date[]>(initialDates);
  const [isLoading, setIsLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, Date[]>>(() => {
    // Initialize cache with initial data
    const monthKey = format(initialMonth, 'yyyy-MM');
    return { [monthKey]: initialDates };
  });

  const fetchDatesForMonth = useCallback(async (month: Date) => {
    const monthKey = format(month, 'yyyy-MM');

    // Check cache first
    if (cache[monthKey]) {
      setDatesWithData(cache[monthKey]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/items/dates?month=${monthKey}`);
      if (!response.ok) throw new Error('Failed to fetch dates');

      const data = await response.json();
      const dates = (data.data?.dates || []).map((d: string) => new Date(d));

      // Update cache
      setCache((prev) => ({ ...prev, [monthKey]: dates }));
      setDatesWithData(dates);
    } catch (error) {
      console.error('Failed to fetch dates with data:', error);
      setDatesWithData([]);
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  const handleMonthChange = useCallback(
    (month: Date) => {
      setDisplayedMonth(month);
      fetchDatesForMonth(month);
    },
    [fetchDatesForMonth]
  );

  // Update cache when initialDates changes (e.g., after navigation)
  useEffect(() => {
    const monthKey = format(initialMonth, 'yyyy-MM');
    setCache((prev) => ({ ...prev, [monthKey]: initialDates }));
    setDatesWithData(initialDates);
    setDisplayedMonth(initialMonth);
  }, [initialDates, initialMonth]);

  return {
    displayedMonth,
    datesWithData,
    isLoading,
    handleMonthChange,
  };
}
