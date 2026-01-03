import { Skeleton, Card, CardHeader, CardDescription, CardFooter } from '@workspace/ui';
import { Header } from '@/components/layout';

export default function Loading() {
  return (
    <>
      <Header title="Life Review" />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="space-y-4 px-4 lg:px-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="@container/card">
                  <CardHeader>
                    <CardDescription>Weekly Summary</CardDescription>
                    <Skeleton className="h-5 w-40" />
                  </CardHeader>
                  <div className="px-6 pb-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <CardFooter className="text-sm text-muted-foreground">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1">
                        <Skeleton className="h-4 w-8" /> commits
                      </span>
                      <span className="flex items-center gap-1">
                        <Skeleton className="h-4 w-8" /> visits
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
