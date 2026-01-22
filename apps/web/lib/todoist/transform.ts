import type { TodoistTaskWithProject } from './sync';
import type { CollectedItemPayload } from '@/services/ingest.service';

export function transformTodoistTasks(
  tasks: TodoistTaskWithProject[]
): CollectedItemPayload[] {
  return tasks.map((item) => {
    const { task, projectName, isCompleted, completedAt } = item;

    const timestamp = completedAt || task.created_at;

    return {
      sourceType: 'todoist' as const,
      timestamp,
      data: {
        taskId: task.id,
        projectId: task.project_id,
        projectName,
        sectionId: task.section_id || undefined,
        content: task.content,
        description: task.description || undefined,
        priority: task.priority as 1 | 2 | 3 | 4,
        labels: task.labels,
        due: task.due
          ? {
              date: task.due.date,
              isRecurring: task.due.is_recurring,
              datetime: task.due.datetime,
              timezone: task.due.timezone,
              string: task.due.string,
            }
          : undefined,
        isCompleted,
        completedAt,
        createdAt: task.created_at,
        url: task.url,
      },
    };
  });
}
