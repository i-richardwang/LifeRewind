import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui';
import { CheckCircle, XCircle, Database, Key, Bot } from 'lucide-react';
import { db } from '@/db';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'System configuration and status',
};

export default async function SettingsPage() {
  // Check database connection
  let dbConnected = false;
  try {
    await db.execute('SELECT 1');
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  // Check API keys
  const apiKeyConfigured = !!process.env.LIFEREWIND_API_KEY;
  const llmKeyConfigured = !!process.env.LLM_API_KEY;
  const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const llmModel = process.env.LLM_MODEL || 'gpt-4o';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Settings" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="space-y-4 px-4 lg:px-6">
              {/* Status */}
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>
                    Current status of system components
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusItem
                    label="Database Connection"
                    icon={Database}
                    connected={dbConnected}
                  />
                  <StatusItem
                    label="Collector API Key"
                    icon={Key}
                    connected={apiKeyConfigured}
                  />
                  <StatusItem
                    label="LLM API Key"
                    icon={Bot}
                    connected={llmKeyConfigured}
                  />
                </CardContent>
              </Card>

              {/* LLM Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>LLM Configuration</CardTitle>
                  <CardDescription>
                    AI model settings for generating summaries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Base URL</dt>
                      <dd className="font-mono text-xs">{llmBaseUrl}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Model</dt>
                      <dd className="font-mono">{llmModel}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Environment */}
              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                  <CardDescription>
                    Current environment configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Node Environment</dt>
                      <dd className="font-mono">{process.env.NODE_ENV}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  icon: Icon,
  connected,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      {connected ? (
        <div className="flex items-center gap-1 text-primary">
          <CheckCircle className="size-4" />
          <span className="text-sm">Connected</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-destructive">
          <XCircle className="size-4" />
          <span className="text-sm">Not configured</span>
        </div>
      )}
    </div>
  );
}
