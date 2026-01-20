import ews from 'ews-javascript-api';
import { addDays, subDays } from 'date-fns';
import type { CollectedItemPayload } from '@/services/ingest.service';
import { transformEwsAppointment } from './transform';

export interface ExchangeSyncOptions {
  since?: Date;
  daysBack?: number;
  daysForward?: number;
}

/**
 * Fetch calendar events from Exchange server using EWS
 */
export async function fetchExchangeCalendarEvents(
  service: ews.ExchangeService,
  options: ExchangeSyncOptions = {}
): Promise<CollectedItemPayload[]> {
  const now = new Date();
  const daysBack = options.daysBack ?? 30;
  const daysForward = options.daysForward ?? 30;

  const startDate = subDays(now, daysBack);
  const endDate = addDays(now, daysForward);

  // Create calendar view to expand recurring events
  // CalendarView expects ews.DateTime objects
  const calendarView = new ews.CalendarView(
    ews.DateTime.Parse(startDate.toISOString()),
    ews.DateTime.Parse(endDate.toISOString())
  );
  calendarView.MaxItemsReturned = 500;

  // Define properties to load
  const propertySet = new ews.PropertySet(ews.BasePropertySet.FirstClassProperties);
  propertySet.RequestedBodyType = ews.BodyType.Text;

  calendarView.PropertySet = propertySet;

  try {
    // Find appointments in calendar
    const findResults = await service.FindAppointments(
      ews.WellKnownFolderName.Calendar,
      calendarView
    );

    const events: CollectedItemPayload[] = [];

    for (const appointment of findResults.Items) {
      // Load additional properties for each appointment
      await appointment.Load(propertySet);

      // Filter by lastModifiedTime if doing incremental sync
      if (options.since) {
        const lastModified = appointment.LastModifiedTime;
        if (lastModified && new Date(lastModified.ToISOString()) < options.since) {
          continue;
        }
      }

      events.push(transformEwsAppointment(appointment));
    }

    return events;
  } catch (error) {
    console.error('Failed to fetch Exchange calendar events:', error);
    throw error;
  }
}
