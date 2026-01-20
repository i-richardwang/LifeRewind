'use client';

import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Users,
  Video,
  ExternalLink,
  Paperclip,
  XCircle,
} from 'lucide-react';
import { Badge, Label, Separator, Button } from '@workspace/ui';
import type { CalendarData } from '@/db/schema';

interface CalendarDetailProps {
  data: CalendarData;
  timestamp: Date;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  busy: 'default',
  tentative: 'secondary',
  free: 'outline',
  oof: 'destructive',
  workingElsewhere: 'secondary',
};

const responseColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  accepted: 'default',
  tentative: 'secondary',
  declined: 'destructive',
  none: 'outline',
  organizer: 'default',
};

export function CalendarDetail({ data, timestamp }: CalendarDetailProps) {
  const startDate = new Date(data.start.dateTime);
  const endDate = new Date(data.end.dateTime);

  return (
    <div className="grid min-w-0 gap-6">
      <CalendarHeader data={data} />
      <Separator />
      <TimeSection startDate={startDate} endDate={endDate} data={data} />
      {data.location && <LocationSection location={data.location} />}
      {data.isOnlineMeeting && <OnlineMeetingSection data={data} />}
      <AttendeesSection data={data} />
      {data.categories.length > 0 && <CategoriesSection categories={data.categories} />}
      {data.bodyPreview && <PreviewSection bodyPreview={data.bodyPreview} />}
      <ActionsSection webLink={data.webLink} />
    </div>
  );
}

function CalendarHeader({ data }: { data: CalendarData }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chart-1)]/10">
        <Calendar className="size-5 text-[var(--chart-1)]" />
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex items-center gap-2">
          <Label>{data.calendarName}</Label>
          {data.isCancelled && (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="mr-1 size-3" />
              Cancelled
            </Badge>
          )}
          <Badge variant={statusColors[data.status]} className="text-xs">
            {data.status}
          </Badge>
        </div>
        <p className="text-sm font-medium">{data.subject || 'Untitled Event'}</p>
      </div>
    </div>
  );
}

function TimeSection({
  startDate,
  endDate,
  data,
}: {
  startDate: Date;
  endDate: Date;
  data: CalendarData;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label>Time</Label>
        <p className="text-sm">
          {data.isAllDay
            ? format(startDate, 'PPP')
            : `${format(startDate, 'PPp')} - ${format(endDate, 'p')}`}
        </p>
        <p className="text-xs text-muted-foreground">{data.start.timeZone}</p>
      </div>
    </div>
  );
}

function LocationSection({ location }: { location: string }) {
  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center gap-1">
        <MapPin className="size-3" />
        Location
      </Label>
      <p className="break-words text-sm">{location}</p>
    </div>
  );
}

function OnlineMeetingSection({ data }: { data: CalendarData }) {
  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center gap-1">
        <Video className="size-3" />
        Online Meeting
      </Label>
      <div className="flex items-center gap-2">
        {data.onlineMeetingProvider && (
          <Badge variant="outline" className="text-xs">
            {data.onlineMeetingProvider}
          </Badge>
        )}
        {data.onlineMeetingUrl && (
          <a
            href={data.onlineMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Join Meeting
          </a>
        )}
      </div>
    </div>
  );
}

function AttendeesSection({ data }: { data: CalendarData }) {
  return (
    <>
      <Separator />
      <div className="grid min-w-0 gap-1.5">
        <Label className="flex items-center gap-1">
          <Users className="size-3" />
          Attendees ({data.attendees.length})
        </Label>
        <div className="grid min-w-0 gap-1.5">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">Organizer:</span>
            <span className="truncate">{data.organizer.name || data.organizer.email}</span>
          </div>
          {data.attendees.length > 0 && (
            <div className="max-h-32 min-w-0 space-y-1 overflow-y-auto">
              {data.attendees.slice(0, 5).map((a, i) => (
                <div key={i} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{a.name || a.email}</span>
                  <Badge variant={responseColors[a.status]} className="shrink-0 text-xs">
                    {a.status}
                  </Badge>
                </div>
              ))}
              {data.attendees.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{data.attendees.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CategoriesSection({ categories }: { categories: string[] }) {
  return (
    <>
      <Separator />
      <div className="grid gap-1.5">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Badge key={cat} variant="outline" className="text-xs">
              {cat}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}

function PreviewSection({ bodyPreview }: { bodyPreview: string }) {
  return (
    <>
      <Separator />
      <div className="grid min-w-0 gap-1.5">
        <Label>Description</Label>
        <div className="overflow-hidden rounded-md border bg-muted/50 p-3">
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {bodyPreview}
          </p>
        </div>
      </div>
    </>
  );
}

function ActionsSection({ webLink }: { webLink: string }) {
  return (
    <>
      <Separator />
      <Button variant="outline" className="w-full" asChild>
        <a href={webLink} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 size-4" />
          Open in Outlook
        </a>
      </Button>
    </>
  );
}
