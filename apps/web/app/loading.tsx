import { Card, CardContent, Skeleton } from '@workspace/ui';
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
              <div className="flex items-center justify-center gap-1">
                <Skeleton className="size-8" />
                <Skeleton className="mx-2 h-5 w-10" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-10" />
                ))}
                <Skeleton className="size-8" />
              </div>
            </div>

            {/* Period filter skeleton */}
            <div className="flex items-center justify-between px-4 lg:px-6">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-40" />
            </div>

            {/* Summary cards skeleton */}
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="flex flex-col">
                  <CardContent className="flex-1 p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-48" />
                      <div className="space-y-2 pt-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
