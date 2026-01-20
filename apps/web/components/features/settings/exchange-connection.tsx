'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, CheckCircle, XCircle, Server, Eye, EyeOff } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Label,
} from '@workspace/ui';
import { formatDistanceToNow } from 'date-fns';

interface ExchangeStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string;
}

interface ConnectForm {
  email: string;
  username: string;
  password: string;
  ewsUrl: string;
}

export function ExchangeConnection() {
  const [status, setStatus] = useState<ExchangeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [form, setForm] = useState<ConnectForm>({
    email: '',
    username: '',
    password: '',
    ewsUrl: '',
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/calendar/exchange/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);

    try {
      const res = await fetch('/api/calendar/exchange/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setForm({ email: '', username: '', password: '', ewsUrl: '' });
        fetchStatus();
      } else {
        setConnectError(data.error || 'Failed to connect');
      }
    } catch {
      setConnectError('Failed to connect to Exchange');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!status?.email) return;

    try {
      await fetch(`/api/calendar/exchange/connect?email=${encodeURIComponent(status.email)}`, {
        method: 'DELETE',
      });
      setStatus({ connected: false });
    } catch {
      // Ignore errors
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/calendar/exchange/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSyncResult({ success: true, count: data.eventsImported });
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
            <Server className="size-5" />
            Exchange Calendar
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
          <Server className="size-5" />
          Exchange Calendar
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            On-Premises
          </Badge>
        </CardTitle>
        <CardDescription>
          Connect to your company&apos;s Exchange server to sync calendar events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <ConnectedState
            status={status}
            syncing={syncing}
            syncResult={syncResult}
            onSync={handleSync}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <DisconnectedState
            form={form}
            setForm={setForm}
            connecting={connecting}
            connectError={connectError}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            onConnect={handleConnect}
          />
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
  onDisconnect,
}: {
  status: ExchangeStatus;
  syncing: boolean;
  syncResult: { success: boolean; count?: number; error?: string } | null;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-primary" />
          <span>Connected</span>
        </div>
        <Badge variant="secondary">{status.email}</Badge>
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
            ? `Synced ${syncResult.count} calendar events`
            : syncResult.error}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onSync} disabled={syncing} className="flex-1" variant="outline">
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
        <Button onClick={onDisconnect} variant="ghost" className="text-destructive">
          Disconnect
        </Button>
      </div>
    </>
  );
}

function DisconnectedState({
  form,
  setForm,
  connecting,
  connectError,
  showPassword,
  setShowPassword,
  onConnect,
}: {
  form: ConnectForm;
  setForm: (form: ConnectForm) => void;
  connecting: boolean;
  connectError: string | null;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  onConnect: () => void;
}) {
  const isFormValid = form.email && form.username && form.password && form.ewsUrl;

  return (
    <>
      <div className="flex items-center gap-2 text-muted-foreground">
        <XCircle className="size-4" />
        <span>Not connected</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="exchange-email">Email</Label>
          <Input
            id="exchange-email"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exchange-username">Username</Label>
          <Input
            id="exchange-username"
            type="text"
            placeholder="username or DOMAIN\\username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exchange-password">Password</Label>
          <div className="relative">
            <Input
              id="exchange-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exchange-ews-url">EWS URL</Label>
          <Input
            id="exchange-ews-url"
            type="url"
            placeholder="https://mail.company.com/EWS/Exchange.asmx"
            value={form.ewsUrl}
            onChange={(e) => setForm({ ...form, ewsUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Usually ends with /EWS/Exchange.asmx
          </p>
        </div>
      </div>

      {connectError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {connectError}
        </div>
      )}

      <Button
        onClick={onConnect}
        disabled={connecting || !isFormValid}
        className="w-full"
      >
        {connecting ? (
          <>
            <RefreshCw className="mr-2 size-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Calendar className="mr-2 size-4" />
            Connect Exchange
          </>
        )}
      </Button>
    </>
  );
}
