'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, RefreshCw, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@workspace/ui';
import { formatDistanceToNow } from 'date-fns';

interface TodoistStatus {
  connected: boolean;
  lastSyncAt?: string;
}

export function TodoistConnection() {
  const [status, setStatus] = useState<TodoistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/todoist/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/auth/todoist';
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/todoist/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSyncResult({ success: true, count: data.tasksImported });
        fetchStatus();
      } else {
        setSyncResult({ success: false, error: data.error });
      }
    } catch {
      setSyncResult({ success: false, error: 'Failed to sync' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="size-5" />
            Todoist
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="size-5" />
          Todoist
        </CardTitle>
        <CardDescription>
          Sync your Todoist tasks to track your productivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <ConnectedState
            status={status}
            syncing={syncing}
            syncResult={syncResult}
            onSync={handleSync}
          />
        ) : (
          <DisconnectedState onConnect={handleConnect} />
        )}
      </CardContent>
    </Card>
  );
}

function ConnectedState({
  status,
  syncing,
  syncResult,
  onSync,
}: {
  status: TodoistStatus;
  syncing: boolean;
  syncResult: { success: boolean; count?: number; error?: string } | null;
  onSync: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-primary" />
          <span>Connected</span>
        </div>
      </div>

      {status.lastSyncAt && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Sync</span>
          <span>
            {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
          </span>
        </div>
      )}

      {syncResult && (
        <div
          className={`rounded-md p-3 text-sm ${
            syncResult.success
              ? 'bg-primary/10 text-primary'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {syncResult.success
            ? `Synced ${syncResult.count} tasks`
            : syncResult.error}
        </div>
      )}

      <Button onClick={onSync} disabled={syncing} className="w-full" variant="outline">
        {syncing ? (
          <>
            <RefreshCw className="mr-2 size-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 size-4" />
            Sync Now
          </>
        )}
      </Button>
    </>
  );
}

function DisconnectedState({ onConnect }: { onConnect: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 text-muted-foreground">
        <XCircle className="size-4" />
        <span>Not connected</span>
      </div>

      <Button onClick={onConnect} className="w-full">
        <ExternalLink className="mr-2 size-4" />
        Connect Todoist
      </Button>
    </>
  );
}
