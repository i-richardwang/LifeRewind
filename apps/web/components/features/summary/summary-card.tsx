import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
} from '@workspace/ui';
import { Calendar, GitCommit, Globe, FileText, MessageSquare } from 'lucide-react';
import type { Summary } from '@/db/schema';

interface SummaryCardProps {
  summary: Summary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const periodLabel = summary.period === 'week' ? 'Weekly Review' : 'Monthly Review';
  const dateRange = `${format(new Date(summary.periodStart), 'MMM d')} - ${format(new Date(summary.periodEnd), 'MMM d, yyyy')}`;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {periodLabel}
        </CardDescription>
        <CardTitle className="text-xl">{summary.title}</CardTitle>
        <CardAction>
          <Badge variant="secondary">{dateRange}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{summary.content}</ReactMarkdown>
        </div>

        {/* Highlights */}
        {summary.highlights && summary.highlights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Highlights</h4>
            <ul className="space-y-1">
              {summary.highlights.map((highlight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary">•</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      {/* Data stats */}
      {summary.dataStats && (
        <CardFooter className="flex-wrap gap-4 text-sm text-muted-foreground">
          {summary.dataStats.gitCommits > 0 && (
            <div className="flex items-center gap-1.5">
              <GitCommit className="size-4 text-[var(--chart-1)]" />
              <span>{summary.dataStats.gitCommits} commits</span>
            </div>
          )}
          {summary.dataStats.browserVisits > 0 && (
            <div className="flex items-center gap-1.5">
              <Globe className="size-4 text-[var(--chart-2)]" />
              <span>{summary.dataStats.browserVisits} visits</span>
            </div>
          )}
          {summary.dataStats.filesChanged > 0 && (
            <div className="flex items-center gap-1.5">
              <FileText className="size-4 text-[var(--chart-3)]" />
              <span>{summary.dataStats.filesChanged} files</span>
            </div>
          )}
          {summary.dataStats.chatSessions > 0 && (
            <div className="flex items-center gap-1.5">
              <MessageSquare className="size-4 text-[var(--chart-4)]" />
              <span>{summary.dataStats.chatSessions} chats</span>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
