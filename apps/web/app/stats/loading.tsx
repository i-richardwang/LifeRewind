import { Skeleton, Card, CardHeader, CardDescription, CardFooter } from '@workspace/ui';
import { GitCommit, Globe, FileText, MessageSquare } from 'lucide-react';
import { Header } from '@/components/layout';

const statItems = [
  { title: 'Git Commits', icon: GitCommit, description: 'Total commits collected' },
  { title: 'Browser Visits', icon: Globe, description: 'Aggregated page visits' },
  { title: 'File Changes', icon: FileText, description: 'Files modified' },
  { title: 'Chat Sessions', icon: MessageSquare, description: 'AI conversations' },
];

export default function Loading() {
  return (
    <>
      <Header title="Statistics" />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              {statItems.map((item) => (
                <Card key={item.title} className="@container/card">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      {item.title}
                    </CardDescription>
                    <Skeleton className="h-8 w-24" />
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="text-muted-foreground">{item.description}</div>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardDescription>Total Items</CardDescription>
                  <Skeleton className="h-8 w-32" />
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="text-muted-foreground">Across all data sources</div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
