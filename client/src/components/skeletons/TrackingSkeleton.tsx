import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function TrackingSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative h-[40%] min-h-[180px] flex-shrink-0">
        <div className="absolute inset-0 bg-muted animate-pulse" />
        
        <div className="absolute top-3 left-3 right-3 z-10 space-y-2">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6 space-y-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DriverInfoCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </Card>
  );
}
