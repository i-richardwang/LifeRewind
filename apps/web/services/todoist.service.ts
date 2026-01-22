import { decrypt } from '@/lib/crypto';
import { findTokenByProvider, updateLastSyncAt } from '@/db/queries/tokens';
import { fetchAllTasks, transformTodoistTasks } from '@/lib/todoist';
import { ingestItems } from './ingest.service';

export interface TodoistSyncResult {
  success: boolean;
  tasksImported: number;
  error?: string;
}

export interface TodoistConnectionStatus {
  connected: boolean;
  lastSyncAt?: Date;
}

export async function syncTodoist(): Promise<TodoistSyncResult> {
  try {
    const token = await findTokenByProvider('todoist');

    if (!token) {
      return {
        success: false,
        tasksImported: 0,
        error: 'Todoist not connected',
      };
    }

    const accessToken = decrypt(token.accessToken);

    // Fetch all tasks (active + completed in last 7 days)
    const tasks = await fetchAllTasks(accessToken, 7);

    if (tasks.length === 0) {
      await updateLastSyncAt('todoist', token.email);
      return {
        success: true,
        tasksImported: 0,
      };
    }

    const items = transformTodoistTasks(tasks);

    const result = await ingestItems({
      deviceId: 'todoist',
      deviceName: 'Todoist',
      sourceType: 'todoist',
      collectedAt: new Date(),
      items,
    });

    await updateLastSyncAt('todoist', token.email);

    return {
      success: true,
      tasksImported: result.itemsInserted,
    };
  } catch (error) {
    console.error('Todoist sync error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError =
      errorMessage.includes('authorization expired') ||
      errorMessage.includes('revoked');

    return {
      success: false,
      tasksImported: 0,
      error: isAuthError
        ? 'Todoist authorization expired. Please reconnect.'
        : `Failed to sync tasks: ${errorMessage}`,
    };
  }
}

export async function getTodoistConnectionStatus(): Promise<TodoistConnectionStatus> {
  const token = await findTokenByProvider('todoist');

  if (!token) {
    return { connected: false };
  }

  return {
    connected: true,
    lastSyncAt: token.lastSyncAt || undefined,
  };
}
