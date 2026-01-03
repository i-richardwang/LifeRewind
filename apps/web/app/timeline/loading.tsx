import { Skeleton, Separator } from '@workspace/ui';
import { Header } from '@/components/layout';

export default function Loading() {
  return (
    <>
      <Header title="Timeline" />

      <div className="flex flex-1">
        {/* Content area */}
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="space-y-4 px-4 lg:px-6">
                {/* Quick date picker skeleton */}
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>

                {/* Mobile date picker skeleton */}
                <Skeleton className="h-10 w-full lg:hidden" />

                {/* Date header skeleton */}
                <div className="hidden lg:block space-y-1">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>

                {/* Timeline items skeleton */}
                <div className="space-y-6">
                  {[1, 2, 3].map((hour) => (
                    <div key={hour} className="relative">
                      <div className="mb-2 flex items-center gap-2 py-1">
                        <Skeleton className="h-4 w-12" />
                        <Separator className="flex-1" />
                      </div>

                      <div className="space-y-2 border-l pl-6">
                        {[1, 2].map((item) => (
                          <div key={item} className="relative rounded-lg p-3">
                            <div className="absolute -left-6 top-3 -ml-1 size-2 rounded-full bg-muted" />
                            <div className="flex items-start gap-3">
                              <Skeleton className="size-5 rounded" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Skeleton className="h-3 w-10" />
                                  <Skeleton className="h-4 w-16" />
                                </div>
                                <Skeleton className="h-5 w-3/4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar skeleton (desktop only) */}
        <div className="hidden w-[280px] border-l lg:block">
          <div className="border-b p-4">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="p-4">
            <Skeleton className="h-[280px] w-full" />
          </div>
          <div className="p-4 space-y-3">
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
    </>
  );
}
