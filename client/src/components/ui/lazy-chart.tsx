import { lazy, Suspense, ComponentProps } from 'react';
import { Skeleton } from './skeleton';

const ChartContainerLazy = lazy(() =>
  import('./chart').then((m) => ({ default: m.ChartContainer }))
);

const ChartTooltipLazy = lazy(() =>
  import('./chart').then((m) => ({ default: m.ChartTooltip }))
);

const ChartTooltipContentLazy = lazy(() =>
  import('./chart').then((m) => ({ default: m.ChartTooltipContent }))
);

const ChartLegendLazy = lazy(() =>
  import('./chart').then((m) => ({ default: m.ChartLegend }))
);

const ChartLegendContentLazy = lazy(() =>
  import('./chart').then((m) => ({ default: m.ChartLegendContent }))
);

const CHART_BAR_HEIGHTS = ['45%', '70%', '55%', '85%', '60%', '75%', '50%'];

function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-end gap-2 h-[200px]">
        {CHART_BAR_HEIGHTS.map((height, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height }}
          />
        ))}
      </div>
      <div className="flex justify-center gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

type ChartContainerProps = ComponentProps<typeof ChartContainerLazy>;

export function LazyChartContainer(props: ChartContainerProps) {
  return (
    <Suspense fallback={<ChartSkeleton className={props.className as string} />}>
      <ChartContainerLazy {...props} />
    </Suspense>
  );
}

export function LazyChartTooltip(props: ComponentProps<typeof ChartTooltipLazy>) {
  return (
    <Suspense fallback={null}>
      <ChartTooltipLazy {...props} />
    </Suspense>
  );
}

export function LazyChartTooltipContent(props: ComponentProps<typeof ChartTooltipContentLazy>) {
  return (
    <Suspense fallback={null}>
      <ChartTooltipContentLazy {...props} />
    </Suspense>
  );
}

export function LazyChartLegend(props: ComponentProps<typeof ChartLegendLazy>) {
  return (
    <Suspense fallback={null}>
      <ChartLegendLazy {...props} />
    </Suspense>
  );
}

export function LazyChartLegendContent(props: ComponentProps<typeof ChartLegendContentLazy>) {
  return (
    <Suspense fallback={null}>
      <ChartLegendContentLazy {...props} />
    </Suspense>
  );
}

export { ChartSkeleton };
