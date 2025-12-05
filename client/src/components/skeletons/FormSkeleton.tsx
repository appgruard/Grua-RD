import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
      <Skeleton className="h-10 w-full rounded-md mt-6" />
    </div>
  );
}

export function FormCardSkeleton({ 
  title = true, 
  fields = 4 
}: { 
  title?: boolean; 
  fields?: number 
}) {
  return (
    <Card className="p-6 space-y-4">
      {title && <Skeleton className="h-6 w-40 mb-2" />}
      <FormSkeleton fields={fields} />
    </Card>
  );
}

export function SelectFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

export function TextareaFieldSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={`w-full rounded-md`} style={{ height: `${rows * 24 + 16}px` }} />
    </div>
  );
}

export function CheckboxFieldSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function RadioGroupSkeleton({ options = 3 }: { options?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        {Array.from({ length: options }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
