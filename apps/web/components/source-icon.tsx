import { GitCommit, Globe, FileText, MessageSquare, Mail, Calendar } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import type { SourceType } from '@/db/schema';

const iconMap: Record<SourceType, typeof GitCommit> = {
  git: GitCommit,
  browser: Globe,
  filesystem: FileText,
  chatbot: MessageSquare,
  email: Mail,
  calendar: Calendar,
};

const colorMap: Record<SourceType, string> = {
  git: 'text-[var(--chart-1)]',
  browser: 'text-[var(--chart-2)]',
  filesystem: 'text-[var(--chart-3)]',
  chatbot: 'text-[var(--chart-4)]',
  email: 'text-[var(--chart-5)]',
  calendar: 'text-[var(--chart-1)]',
};

const labelMap: Record<SourceType, string> = {
  git: 'Git',
  browser: 'Browser',
  filesystem: 'Files',
  chatbot: 'Chat',
  email: 'Email',
  calendar: 'Calendar',
};

interface SourceIconProps {
  source: SourceType;
  className?: string;
  showLabel?: boolean;
}

export function SourceIcon({ source, className, showLabel }: SourceIconProps) {
  const Icon = iconMap[source];
  const color = colorMap[source];
  const label = labelMap[source];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon className={cn('size-4', color)} />
      {showLabel && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
