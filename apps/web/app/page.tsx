import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@workspace/ui';
import { listSummaries } from '@/services/summary.service';
import { Header } from '@/components/layout';
import { SummaryCard, GenerateSummaryButton } from '@/components/features/summary';

export const metadata: Metadata = {
  title: 'Life Review',
  description: 'AI-powered summaries of your digital footprints',
};

export default async function HomePage() {
  const summaries = await listSummaries({ limit: 20 });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Life Review" action={<GenerateSummaryButton />} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {summaries.length === 0 ? (
              <div className="px-4 lg:px-6">
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Sparkles />
                    </EmptyMedia>
                    <EmptyTitle>No summaries yet</EmptyTitle>
                    <EmptyDescription>
                      Generate your first AI-powered life review to get started
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <GenerateSummaryButton />
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="space-y-4 px-4 lg:px-6">
                {summaries.map((summary) => (
                  <SummaryCard key={summary.id} summary={summary} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
