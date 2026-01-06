import { addDays, isSameMonth } from 'date-fns';

/**
 * Determines if a week belongs to a given month using ISO week rule.
 * A week belongs to the month that contains its Thursday.
 *
 * @param weekStart - The Monday of the week
 * @param monthDate - Any date in the target month
 */
export function weekBelongsToMonth(weekStart: Date, monthDate: Date): boolean {
  const thursday = addDays(weekStart, 3);
  return isSameMonth(thursday, monthDate);
}
