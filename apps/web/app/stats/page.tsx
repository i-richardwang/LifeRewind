import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui';
import { GitCommit, Globe, FileText, MessageSquare } from 'lucide-react';
import { StatCard } from '@/components/features/stats';
import { getStats } from '@/services/stats.service';

export const metadata: Metadata = {
  title: 'Statistics',
  description: 'Overview of your collected data',
};

export default async function StatsPage() {
  const { overview } = await getStats();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Statistics" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              <StatCard
                title="Git Commits"
                value={overview.gitCommits}
                icon={GitCommit}
                description="Total commits collected"
              />
              <StatCard
                title="Browser Visits"
                value={overview.browserVisits}
                icon={Globe}
                description="Aggregated page visits"
              />
              <StatCard
                title="File Changes"
                value={overview.filesChanged}
                icon={FileText}
                description="Files modified"
              />
              <StatCard
                title="Chat Sessions"
                value={overview.chatSessions}
                icon={MessageSquare}
                description="AI conversations"
              />
            </div>

            {/* Total */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardDescription>Total Items</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {overview.totalItems.toLocaleString()}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="text-muted-foreground">
                    Across all data sources
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
