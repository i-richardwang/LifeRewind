import { Skeleton, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@workspace/ui';
import { Database, Key, Bot } from 'lucide-react';
import { Header } from '@/components/layout';

export default function Loading() {
  return (
    <>
      <Header title="Settings" />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system configuration and health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: Database, label: 'Database Connection' },
                  { icon: Key, label: 'API Key' },
                  { icon: Bot, label: 'LLM Configuration' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="size-4 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment</CardTitle>
                <CardDescription>Runtime environment information</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {['Node Version', 'Environment'].map((label) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-muted-foreground">{label}</dt>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
