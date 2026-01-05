import { Skeleton, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@workspace/ui';
import { Database, Key, Bot } from 'lucide-react';
import { Header } from '@/components/layout';

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Settings" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="space-y-4 px-4 lg:px-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current status of system components</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Database, label: 'Database Connection' },
                    { icon: Key, label: 'Collector API Key' },
                    { icon: Bot, label: 'LLM API Key' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="size-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* LLM Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>LLM Configuration</CardTitle>
                  <CardDescription>AI model settings for generating summaries</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {['Base URL', 'Model', 'Language'].map((label) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              {/* Environment */}
              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                  <CardDescription>Current environment configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Node Environment</dt>
                      <Skeleton className="h-4 w-20" />
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
