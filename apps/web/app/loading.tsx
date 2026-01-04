import { Skeleton, Card, CardHeader, CardDescription, CardFooter } from '@workspace/ui';
import { Header } from '@/components/layout';

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Life Review" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Year/Month picker skeleton */}
            <div className="px-4 lg:px-6">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="size-8" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="size-8" />
                </div>
                <div className="flex flex-wrap justify-center gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-12" />
                  ))}
                </div>
              </div>
            </div>

            {/* Period filter skeleton */}
            <div className="flex items-center justify-between px-4 lg:px-6">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>

            {/* Summary cards skeleton */}
            <div className="space-y-4 px-4 lg:px-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="@container/card">
                  <CardHeader>
                    <CardDescription>
                      <Skeleton className="h-4 w-40" />
                    </CardDescription>
                    <Skeleton className="h-6 w-64" />
                  </CardHeader>
                  <div className="space-y-2 px-6 pb-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <CardFooter className="text-sm text-muted-foreground">
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
