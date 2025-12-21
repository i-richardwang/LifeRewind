import cron from 'node-cron';
import type { ScheduleFrequency, SourceType } from './types.js';
import type { Logger } from '../utils/logger.js';

interface ScheduledTask {
  sourceType: SourceType;
  cronJob: cron.ScheduledTask;
  frequency: ScheduleFrequency;
}

const CRON_EXPRESSIONS: Record<ScheduleFrequency, string | null> = {
  hourly: '0 * * * *',
  daily: '0 9 * * *',
  weekly: '0 9 * * 1',
  monthly: '0 9 1 * *',
  manual: null,
};

export class Scheduler {
  private tasks = new Map<SourceType, ScheduledTask>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  schedule(
    sourceType: SourceType,
    frequency: ScheduleFrequency,
    handler: () => Promise<unknown>
  ): void {
    this.unschedule(sourceType);

    const cronExpression = CRON_EXPRESSIONS[frequency];
    if (!cronExpression) {
      this.logger.info(`Source ${sourceType} set to manual - no schedule created`);
      return;
    }

    const cronJob = cron.schedule(cronExpression, () => {
      this.logger.info(`Running scheduled collection for ${sourceType}`);
      handler().catch((error: unknown) => {
        this.logger.error(`Scheduled collection failed for ${sourceType}`, error);
      });
    });

    this.tasks.set(sourceType, { sourceType, cronJob, frequency });
    this.logger.info(`Scheduled ${sourceType} with frequency: ${frequency}`);
  }

  unschedule(sourceType: SourceType): void {
    const task = this.tasks.get(sourceType);
    if (task) {
      task.cronJob.stop();
      this.tasks.delete(sourceType);
    }
  }

  startAll(): void {
    for (const task of this.tasks.values()) {
      task.cronJob.start();
    }
  }

  stopAll(): void {
    for (const task of this.tasks.values()) {
      task.cronJob.stop();
    }
  }
}
