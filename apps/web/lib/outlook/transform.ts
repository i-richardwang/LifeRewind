import type { CollectedItemPayload } from '@/services/ingest.service';
import type { CalendarAttendee } from '@/db/schema';

interface GraphEvent {
  id: string;
  iCalUId: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  organizer?: {
    emailAddress: { name?: string; address: string };
  };
  attendees?: Array<{
    emailAddress: { name?: string; address: string };
    type: string;
    status: { response: string };
  }>;
  isOrganizer: boolean;
  showAs: string;
  responseStatus?: { response: string };
  isCancelled: boolean;
  location?: { displayName?: string };
  categories?: string[];
  importance: string;
  sensitivity: string;
  isOnlineMeeting: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string };
  type: string;
  seriesMasterId?: string;
  webLink: string;
  hasAttachments: boolean;
  lastModifiedDateTime: string;
  calendar?: { id: string; name: string };
}

function mapAttendeeType(type: string): CalendarAttendee['type'] {
  switch (type.toLowerCase()) {
    case 'required':
      return 'required';
    case 'optional':
      return 'optional';
    case 'resource':
      return 'resource';
    default:
      return 'optional';
  }
}

function mapAttendeeStatus(response: string): CalendarAttendee['status'] {
  switch (response.toLowerCase()) {
    case 'accepted':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'tentativelyaccepted':
    case 'tentative':
      return 'tentative';
    default:
      return 'none';
  }
}

function mapShowAs(showAs: string): 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' {
  switch (showAs.toLowerCase()) {
    case 'free':
      return 'free';
    case 'tentative':
      return 'tentative';
    case 'busy':
      return 'busy';
    case 'oof':
      return 'oof';
    case 'workingelsewhere':
      return 'workingElsewhere';
    default:
      return 'busy';
  }
}

function mapResponseStatus(
  response?: string
): 'none' | 'organizer' | 'accepted' | 'declined' | 'tentative' {
  if (!response) return 'none';
  switch (response.toLowerCase()) {
    case 'organizer':
      return 'organizer';
    case 'accepted':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'tentativelyaccepted':
    case 'tentative':
      return 'tentative';
    default:
      return 'none';
  }
}

function mapImportance(importance: string): 'low' | 'normal' | 'high' {
  switch (importance.toLowerCase()) {
    case 'low':
      return 'low';
    case 'high':
      return 'high';
    default:
      return 'normal';
  }
}

function mapSensitivity(
  sensitivity: string
): 'normal' | 'personal' | 'private' | 'confidential' {
  switch (sensitivity.toLowerCase()) {
    case 'personal':
      return 'personal';
    case 'private':
      return 'private';
    case 'confidential':
      return 'confidential';
    default:
      return 'normal';
  }
}

function mapEventType(
  type: string
): 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster' {
  switch (type.toLowerCase()) {
    case 'singleinstance':
      return 'singleInstance';
    case 'occurrence':
      return 'occurrence';
    case 'exception':
      return 'exception';
    case 'seriesmaster':
      return 'seriesMaster';
    default:
      return 'singleInstance';
  }
}

export function transformCalendarEvent(
  event: GraphEvent,
  calendarId: string,
  calendarName: string
): CollectedItemPayload {
  const attendees: CalendarAttendee[] = (event.attendees || []).map((a) => ({
    name: a.emailAddress.name,
    email: a.emailAddress.address,
    type: mapAttendeeType(a.type),
    status: mapAttendeeStatus(a.status.response),
  }));

  return {
    sourceType: 'calendar',
    timestamp: event.start.dateTime,
    data: {
      provider: 'outlook',
      eventId: event.id,
      iCalUId: event.iCalUId,
      subject: event.subject || '',
      calendarId,
      calendarName,
      start: event.start,
      end: event.end,
      isAllDay: event.isAllDay,
      organizer: {
        name: event.organizer?.emailAddress.name,
        email: event.organizer?.emailAddress.address || '',
      },
      attendees,
      isOrganizer: event.isOrganizer,
      status: mapShowAs(event.showAs),
      responseStatus: mapResponseStatus(event.responseStatus?.response),
      isCancelled: event.isCancelled,
      bodyPreview: event.bodyPreview,
      location: event.location?.displayName,
      categories: event.categories || [],
      importance: mapImportance(event.importance),
      sensitivity: mapSensitivity(event.sensitivity),
      isOnlineMeeting: event.isOnlineMeeting,
      onlineMeetingProvider: event.onlineMeetingProvider,
      onlineMeetingUrl: event.onlineMeeting?.joinUrl,
      type: mapEventType(event.type),
      seriesMasterId: event.seriesMasterId,
      webLink: event.webLink,
      hasAttachments: event.hasAttachments,
      lastModifiedDateTime: event.lastModifiedDateTime,
    },
  };
}
