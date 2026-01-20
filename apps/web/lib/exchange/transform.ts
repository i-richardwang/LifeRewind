import ews from 'ews-javascript-api';
import type { CollectedItemPayload } from '@/services/ingest.service';
import type { CalendarAttendee } from '@/db/schema';

function mapLegacyFreeBusyStatus(
  status: ews.LegacyFreeBusyStatus | undefined
): 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' {
  if (status === undefined || status === null) return 'busy';

  // Use numeric comparison for enum values
  switch (status) {
    case ews.LegacyFreeBusyStatus.Free:
      return 'free';
    case ews.LegacyFreeBusyStatus.Tentative:
      return 'tentative';
    case ews.LegacyFreeBusyStatus.Busy:
      return 'busy';
    case ews.LegacyFreeBusyStatus.OOF:
      return 'oof';
    case ews.LegacyFreeBusyStatus.WorkingElsewhere:
      return 'workingElsewhere';
    default:
      return 'busy';
  }
}

function mapMeetingResponseType(
  response: ews.MeetingResponseType | undefined
): 'none' | 'organizer' | 'accepted' | 'declined' | 'tentative' {
  if (response === undefined || response === null) return 'none';

  switch (response) {
    case ews.MeetingResponseType.Organizer:
      return 'organizer';
    case ews.MeetingResponseType.Accept:
      return 'accepted';
    case ews.MeetingResponseType.Decline:
      return 'declined';
    case ews.MeetingResponseType.Tentative:
      return 'tentative';
    default:
      return 'none';
  }
}

function mapAttendeeResponse(
  response: ews.MeetingResponseType | undefined
): CalendarAttendee['status'] {
  if (response === undefined || response === null) return 'none';

  switch (response) {
    case ews.MeetingResponseType.Accept:
      return 'accepted';
    case ews.MeetingResponseType.Decline:
      return 'declined';
    case ews.MeetingResponseType.Tentative:
      return 'tentative';
    default:
      return 'none';
  }
}

function mapImportance(importance: ews.Importance | undefined): 'low' | 'normal' | 'high' {
  if (importance === undefined || importance === null) return 'normal';

  switch (importance) {
    case ews.Importance.Low:
      return 'low';
    case ews.Importance.High:
      return 'high';
    case ews.Importance.Normal:
    default:
      return 'normal';
  }
}

function mapSensitivity(
  sensitivity: ews.Sensitivity | undefined
): 'normal' | 'personal' | 'private' | 'confidential' {
  if (sensitivity === undefined || sensitivity === null) return 'normal';

  switch (sensitivity) {
    case ews.Sensitivity.Personal:
      return 'personal';
    case ews.Sensitivity.Private:
      return 'private';
    case ews.Sensitivity.Confidential:
      return 'confidential';
    case ews.Sensitivity.Normal:
    default:
      return 'normal';
  }
}

function mapAppointmentType(
  type: ews.AppointmentType | undefined
): 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster' {
  if (type === undefined || type === null) return 'singleInstance';

  switch (type) {
    case ews.AppointmentType.Single:
      return 'singleInstance';
    case ews.AppointmentType.Occurrence:
      return 'occurrence';
    case ews.AppointmentType.Exception:
      return 'exception';
    case ews.AppointmentType.RecurringMaster:
      return 'seriesMaster';
    default:
      return 'singleInstance';
  }
}

function extractAttendees(appointment: ews.Appointment): CalendarAttendee[] {
  const attendees: CalendarAttendee[] = [];

  // Required attendees
  const requiredAttendees = appointment.RequiredAttendees;
  if (requiredAttendees) {
    const count = requiredAttendees.Count;
    for (let i = 0; i < count; i++) {
      const attendee = requiredAttendees._getItem(i);
      attendees.push({
        name: attendee.Name,
        email: attendee.Address || '',
        type: 'required',
        status: mapAttendeeResponse(attendee.ResponseType),
      });
    }
  }

  // Optional attendees
  const optionalAttendees = appointment.OptionalAttendees;
  if (optionalAttendees) {
    const count = optionalAttendees.Count;
    for (let i = 0; i < count; i++) {
      const attendee = optionalAttendees._getItem(i);
      attendees.push({
        name: attendee.Name,
        email: attendee.Address || '',
        type: 'optional',
        status: mapAttendeeResponse(attendee.ResponseType),
      });
    }
  }

  // Resources
  const resources = appointment.Resources;
  if (resources) {
    const count = resources.Count;
    for (let i = 0; i < count; i++) {
      const resource = resources._getItem(i);
      attendees.push({
        name: resource.Name,
        email: resource.Address || '',
        type: 'resource',
        status: mapAttendeeResponse(resource.ResponseType),
      });
    }
  }

  return attendees;
}

function getDateTimeWithTimezone(dateTime: ews.DateTime | undefined): {
  dateTime: string;
  timeZone: string;
} {
  if (!dateTime) {
    return { dateTime: new Date().toISOString(), timeZone: 'UTC' };
  }

  return {
    dateTime: dateTime.ToISOString(),
    timeZone: 'UTC', // EWS returns UTC times
  };
}

function extractCategories(appointment: ews.Appointment): string[] {
  const categories: string[] = [];
  const categoryList = appointment.Categories;

  if (categoryList) {
    const count = categoryList.Count;
    for (let i = 0; i < count; i++) {
      const category = categoryList._getItem(i);
      if (category) {
        categories.push(category);
      }
    }
  }

  return categories;
}

export function transformEwsAppointment(appointment: ews.Appointment): CollectedItemPayload {
  const id = appointment.Id?.UniqueId || '';
  const iCalUId = appointment.ICalUid || id;

  const start = getDateTimeWithTimezone(appointment.Start);
  const end = getDateTimeWithTimezone(appointment.End);

  const organizer = appointment.Organizer;
  const attendees = extractAttendees(appointment);
  const categories = extractCategories(appointment);

  // Check if current user is the organizer by comparing with MyResponseType
  const isOrganizer = appointment.MyResponseType === ews.MeetingResponseType.Organizer;

  // Get location
  const location = appointment.Location || '';

  // Check for online meeting
  const isOnlineMeeting = appointment.IsOnlineMeeting ?? false;

  // Get web link (OWA URL)
  const webLink = appointment.WebClientReadFormQueryString || '';

  return {
    sourceType: 'calendar',
    timestamp: start.dateTime,
    data: {
      provider: 'exchange' as const,
      eventId: id,
      iCalUId,
      subject: appointment.Subject || '',
      calendarId: 'default',
      calendarName: 'Calendar',
      start,
      end,
      isAllDay: appointment.IsAllDayEvent ?? false,
      organizer: {
        name: organizer?.Name,
        email: organizer?.Address || '',
      },
      attendees,
      isOrganizer,
      status: mapLegacyFreeBusyStatus(appointment.LegacyFreeBusyStatus),
      responseStatus: mapMeetingResponseType(appointment.MyResponseType),
      isCancelled: appointment.IsCancelled ?? false,
      bodyPreview: appointment.Body?.Text?.substring(0, 500),
      location,
      categories,
      importance: mapImportance(appointment.Importance),
      sensitivity: mapSensitivity(appointment.Sensitivity),
      isOnlineMeeting,
      onlineMeetingProvider: isOnlineMeeting ? 'unknown' : undefined,
      onlineMeetingUrl: undefined, // EWS doesn't expose this directly
      type: mapAppointmentType(appointment.AppointmentType),
      seriesMasterId: appointment.AppointmentType === ews.AppointmentType.Occurrence
        ? appointment.ICalRecurrenceId?.toString()
        : undefined,
      webLink,
      hasAttachments: appointment.HasAttachments ?? false,
      lastModifiedDateTime: appointment.LastModifiedTime?.ToISOString() || new Date().toISOString(),
    },
  };
}
