'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui';
import type { SummaryPeriod } from '@/db/schema';

interface PeriodViewToggleProps {
  currentPeriod: SummaryPeriod | 'all';
}

export function PeriodViewToggle({ currentPeriod }: PeriodViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const period = value as SummaryPeriod | 'all';
    const params = new URLSearchParams(searchParams.toString());
    if (period === 'all') {
      params.delete('period');
    } else {
      params.set('period', period);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={currentPeriod} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="week">Weekly</TabsTrigger>
        <TabsTrigger value="month">Monthly</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
