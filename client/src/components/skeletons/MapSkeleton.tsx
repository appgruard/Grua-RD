import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative bg-muted ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
      <div className="absolute top-3 right-3">
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="absolute bottom-3 right-3 space-y-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export function MapWithControlsSkeleton() {
  return (
    <div className="relative h-full">
      <MapSkeleton className="absolute inset-0" />
      <div className="absolute top-3 left-3 right-3">
        <Skeleton className="h-12 w-full rounded-lg bg-background/80" />
      </div>
    </div>
  );
}
