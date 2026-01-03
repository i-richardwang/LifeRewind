import { GitCommit, Globe, FileText, MessageSquare } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import type { SourceType } from '@/db/schema';

const iconMap = {
  git: GitCommit,
  browser: Globe,
  filesystem: FileText,
  chatbot: MessageSquare,
};

const colorMap = {
  git: 'text-[var(--chart-1)]',
  browser: 'text-[var(--chart-2)]',
  filesystem: 'text-[var(--chart-3)]',
  chatbot: 'text-[var(--chart-4)]',
};

const labelMap = {
  git: 'Git',
  browser: 'Browser',
  filesystem: 'Files',
  chatbot: 'Chat',
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
