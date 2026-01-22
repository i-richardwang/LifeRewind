interface TodoistTask {
  id: string;
  project_id: string;
  section_id: string | null;
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  priority: number;
  comment_count: number;
  creator_id: string;
  created_at: string;
  due: {
    date: string;
    is_recurring: boolean;
    datetime?: string;
    timezone?: string;
    string?: string;
  } | null;
  url: string;
}

interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
  order: number;
  comment_count: number;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
}

interface TodoistCompletedItem {
  completed_at: string;
  content: string;
  id: string;
  item_object: {
    id: string;
    project_id: string;
    section_id: string | null;
    content: string;
    description: string;
    priority: number;
    labels: string[];
    due: {
      date: string;
      is_recurring: boolean;
      datetime?: string;
      timezone?: string;
      string?: string;
    } | null;
    added_at: string;
  } | null;
  meta_data: null;
  note_count: number;
  project_id: string;
  section_id: string | null;
  task_id: string;
  user_id: string;
}

interface CompletedItemsResponse {
  items: TodoistCompletedItem[];
  projects: Record<string, TodoistProject>;
}

export interface TodoistTaskWithProject {
  task: TodoistTask;
  projectName: string;
  isCompleted: boolean;
  completedAt?: string;
}

async function fetchWithAuth(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Todoist authorization expired or revoked');
    }
    throw new Error(`Todoist API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchActiveTasks(
  accessToken: string
): Promise<TodoistTaskWithProject[]> {
  const [tasks, projects] = await Promise.all([
    fetchWithAuth('https://api.todoist.com/rest/v2/tasks', accessToken) as Promise<TodoistTask[]>,
    fetchWithAuth('https://api.todoist.com/rest/v2/projects', accessToken) as Promise<TodoistProject[]>,
  ]);

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  return tasks.map((task) => ({
    task,
    projectName: projectMap.get(task.project_id) || 'Unknown',
    isCompleted: false,
  }));
}

export async function fetchCompletedTasks(
  accessToken: string,
  sinceDays: number = 7
): Promise<TodoistTaskWithProject[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const params = new URLSearchParams({
      since: since.toISOString(),
      limit: '200',
    });

    const response: CompletedItemsResponse = await fetchWithAuth(
      `https://api.todoist.com/sync/v9/completed/get_all?${params.toString()}`,
      accessToken
    );

    return response.items.map((item) => {
      const itemObj = item.item_object;
      return {
        task: {
          id: item.task_id,
          project_id: item.project_id,
          section_id: item.section_id,
          content: item.content,
          description: itemObj?.description || '',
          is_completed: true,
          labels: itemObj?.labels || [],
          priority: itemObj?.priority || 1,
          comment_count: item.note_count,
          creator_id: item.user_id,
          created_at: itemObj?.added_at || item.completed_at,
          due: itemObj?.due || null,
          url: `https://app.todoist.com/app/task/${item.task_id}`,
        },
        projectName: response.projects[item.project_id]?.name || 'Unknown',
        isCompleted: true,
        completedAt: item.completed_at,
      };
    });
  } catch (error) {
    // Sync API completed/get_all requires Todoist Premium
    // Gracefully return empty array for free accounts
    console.warn('Failed to fetch completed tasks (may require Todoist Premium):', error);
    return [];
  }
}

export async function fetchAllTasks(
  accessToken: string,
  sinceDays: number = 7
): Promise<TodoistTaskWithProject[]> {
  const [activeTasks, completedTasks] = await Promise.all([
    fetchActiveTasks(accessToken),
    fetchCompletedTasks(accessToken, sinceDays),
  ]);

  // Both active and completed tasks are kept separately
  // - Active tasks represent current to-do state
  // - Completed tasks represent completion history (including recurring task completions)
  // Deduplication is handled by sourceKey: active uses ":active", completed uses ":done:{timestamp}"
  return [...activeTasks, ...completedTasks];
}
