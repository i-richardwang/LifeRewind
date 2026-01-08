import { Skeleton, Separator } from '@workspace/ui';
import { Header } from '@/components/layout';

export default function Loading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Timeline" />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Content area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:py-6 lg:px-6">
          {/* Quick date picker skeleton */}
          <div className="shrink-0">
            <div className="flex gap-1">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>

          {/* Mobile date picker skeleton */}
          <div className="mt-4 shrink-0 lg:hidden">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Date header skeleton (desktop) */}
          <div className="mt-4 hidden shrink-0 lg:block">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-1 h-4 w-40" />
          </div>

          {/* Timeline Table skeleton */}
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pb-8">
            {[1, 2, 3].map((hour) => (
              <section key={hour}>
                {/* Hour marker */}
                <div className="mb-2 flex items-center gap-3 py-1">
                  <Skeleton className="h-5 w-12" />
                  <Separator className="flex-1" />
                </div>

                {/* Table skeleton */}
                <div className="rounded-md border">
                  <div className="divide-y">
                    {[1, 2, 3].map((row) => (
                      <div key={row} className="flex items-center gap-2 p-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="size-4" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="hidden h-5 w-16 md:block" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Right sidebar skeleton (desktop only) */}
        <div className="hidden w-[280px] shrink-0 border-l lg:block">
          <div className="border-b p-4">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="p-4">
            <Skeleton className="h-[280px] w-full" />
          </div>
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
