'use client';

import { format } from 'date-fns';
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Calendar,
  FolderKanban,
  Tag,
  ExternalLink,
  Flag,
} from 'lucide-react';
import { Badge, Label, Separator, Button } from '@workspace/ui';
import type { TodoistData } from '@/db/schema';

interface TodoistDetailProps {
  data: TodoistData;
  timestamp: Date;
}

const priorityColors: Record<number, string> = {
  1: 'text-muted-foreground',
  2: 'text-blue-500',
  3: 'text-orange-500',
  4: 'text-red-500',
};

const priorityLabels: Record<number, string> = {
  1: 'Priority 4',
  2: 'Priority 3',
  3: 'Priority 2',
  4: 'Priority 1',
};

export function TodoistDetail({ data, timestamp }: TodoistDetailProps) {
  return (
    <div className="grid min-w-0 gap-6">
      <TodoistHeader data={data} />
      <Separator />
      <MetaSection data={data} timestamp={timestamp} />
      {data.due && <DueSection due={data.due} />}
      {data.labels.length > 0 && <LabelsSection labels={data.labels} />}
      {data.description && <DescriptionSection description={data.description} />}
      <ActionsSection url={data.url} />
    </div>
  );
}

function TodoistHeader({ data }: { data: TodoistData }) {
  const StatusIcon = data.isCompleted ? CheckCircle2 : Circle;

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-2)]/10">
        <CheckSquare className="size-5 text-[var(--chart-2)]" />
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex items-center gap-2">
          <Label>{data.projectName}</Label>
          <Badge
            variant={data.isCompleted ? 'default' : 'secondary'}
            className="text-xs"
          >
            <StatusIcon className="mr-1 size-3" />
            {data.isCompleted ? 'Completed' : 'Active'}
          </Badge>
        </div>
        <p className={`text-sm font-medium ${data.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {data.content}
        </p>
      </div>
    </div>
  );
}

function MetaSection({ data, timestamp: _timestamp }: { data: TodoistData; timestamp: Date }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label className="flex items-center gap-1">
          <FolderKanban className="size-3" />
          Project
        </Label>
        <p className="text-sm">{data.projectName}</p>
      </div>

      <div className="grid gap-1.5">
        <Label className="flex items-center gap-1">
          <Flag className={`size-3 ${priorityColors[data.priority]}`} />
          Priority
        </Label>
        <p className="text-sm">{priorityLabels[data.priority]}</p>
      </div>

      {data.isCompleted && data.completedAt && (
        <div className="grid gap-1.5">
          <Label className="flex items-center gap-1">
            <CheckCircle2 className="size-3 text-primary" />
            Completed
          </Label>
          <p className="text-sm">{format(new Date(data.completedAt), 'PPpp')}</p>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label>Created</Label>
        <p className="text-sm">{format(new Date(data.createdAt), 'PPpp')}</p>
      </div>
    </div>
  );
}

function DueSection({ due }: { due: TodoistData['due'] }) {
  if (!due) return null;

  const dueDate = due.datetime ? new Date(due.datetime) : new Date(due.date);
  const isOverdue = !due.isRecurring && dueDate < new Date();

  return (
    <>
      <Separator />
      <div className="grid gap-1.5">
        <Label className="flex items-center gap-1">
          <Calendar className="size-3" />
          Due Date
        </Label>
        <div className="flex items-center gap-2">
          <p className={`text-sm ${isOverdue ? 'text-destructive' : ''}`}>
            {due.datetime
              ? format(dueDate, 'PPpp')
              : format(dueDate, 'PPP')}
          </p>
          {due.isRecurring && (
            <Badge variant="outline" className="text-xs">
              Recurring
            </Badge>
          )}
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </div>
        {due.string && (
          <p className="text-xs text-muted-foreground">{due.string}</p>
        )}
      </div>
    </>
  );
}

function LabelsSection({ labels }: { labels: string[] }) {
  return (
    <>
      <Separator />
      <div className="grid gap-1.5">
        <Label className="flex items-center gap-1">
          <Tag className="size-3" />
          Labels
        </Label>
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <Badge key={label} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}

function DescriptionSection({ description }: { description: string }) {
  return (
    <>
      <Separator />
      <div className="grid min-w-0 gap-1.5">
        <Label>Description</Label>
        <div className="overflow-hidden rounded-md border bg-muted/50 p-3">
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </>
  );
}

function ActionsSection({ url }: { url: string }) {
  return (
    <>
      <Separator />
      <Button variant="outline" className="w-full" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 size-4" />
          Open in Todoist
        </a>
      </Button>
    </>
  );
}
