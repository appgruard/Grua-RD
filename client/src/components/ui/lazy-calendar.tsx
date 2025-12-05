import { lazy, Suspense, ComponentProps } from 'react';
import { Skeleton } from './skeleton';

const CalendarLazy = lazy(() =>
  import('./calendar').then((m) => ({ default: m.Calendar }))
);

function CalendarSkeleton() {
  return (
    <div className="p-3 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-9" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={`day-${i}`} className="h-9 w-9 rounded" />
        ))}
      </div>
    </div>
  );
}

type CalendarProps = ComponentProps<typeof CalendarLazy>;

export function LazyCalendar(props: CalendarProps) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarLazy {...props} />
    </Suspense>
  );
}

export { CalendarSkeleton };
