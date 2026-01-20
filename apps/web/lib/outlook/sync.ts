import { Client } from '@microsoft/microsoft-graph-client';
import { addDays, subDays } from 'date-fns';
import type { CollectedItemPayload } from '@/services/ingest.service';
import { transformCalendarEvent } from './transform';

export interface CalendarSyncOptions {
  since?: Date;
  daysBack?: number;
  daysForward?: number;
}

const EVENT_SELECT_FIELDS = [
  'id',
  'iCalUId',
  'subject',
  'bodyPreview',
  'start',
  'end',
  'isAllDay',
  'organizer',
  'attendees',
  'isOrganizer',
  'showAs',
  'responseStatus',
  'isCancelled',
  'location',
  'categories',
  'importance',
  'sensitivity',
  'isOnlineMeeting',
  'onlineMeetingProvider',
  'onlineMeeting',
  'type',
  'seriesMasterId',
  'webLink',
  'hasAttachments',
  'lastModifiedDateTime',
].join(',');

/**
 * Fetch calendar events from Microsoft Graph API
 */
export async function fetchCalendarEvents(
  graphClient: Client,
  options: CalendarSyncOptions = {}
): Promise<CollectedItemPayload[]> {
  const now = new Date();
  const daysBack = options.daysBack ?? 30;
  const daysForward = options.daysForward ?? 30;

  const startDateTime = subDays(now, daysBack).toISOString();
  const endDateTime = addDays(now, daysForward).toISOString();

  // Get user's calendars first
  const calendarsResponse = await graphClient
    .api('/me/calendars')
    .select('id,name')
    .get();

  const calendars = calendarsResponse.value || [];
  const allEvents: CollectedItemPayload[] = [];

  // Fetch events from each calendar
  for (const calendar of calendars) {
    const events = await fetchEventsFromCalendar(
      graphClient,
      calendar.id,
      calendar.name,
      startDateTime,
      endDateTime,
      options.since
    );
    allEvents.push(...events);
  }

  return allEvents;
}

async function fetchEventsFromCalendar(
  graphClient: Client,
  calendarId: string,
  calendarName: string,
  startDateTime: string,
  endDateTime: string,
  since?: Date
): Promise<CollectedItemPayload[]> {
  const events: CollectedItemPayload[] = [];

  // Use calendarView to expand recurring events
  let request = graphClient
    .api(`/me/calendars/${calendarId}/calendarView`)
    .query({
      startDateTime,
      endDateTime,
    })
    .select(EVENT_SELECT_FIELDS)
    .orderby('start/dateTime')
    .top(500);

  // Filter by lastModifiedDateTime if doing incremental sync
  if (since) {
    request = request.filter(`lastModifiedDateTime ge ${since.toISOString()}`);
  }

  const response = await request.get();
  const graphEvents = response.value || [];

  for (const event of graphEvents) {
    events.push(transformCalendarEvent(event, calendarId, calendarName));
  }

  return events;
}
