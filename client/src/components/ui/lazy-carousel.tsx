import { lazy, Suspense, ComponentProps } from 'react';
import { Skeleton } from './skeleton';

const CarouselLazy = lazy(() =>
  import('./carousel').then((m) => ({ default: m.Carousel }))
);

const CarouselContentLazy = lazy(() =>
  import('./carousel').then((m) => ({ default: m.CarouselContent }))
);

const CarouselItemLazy = lazy(() =>
  import('./carousel').then((m) => ({ default: m.CarouselItem }))
);

const CarouselPreviousLazy = lazy(() =>
  import('./carousel').then((m) => ({ default: m.CarouselPrevious }))
);

const CarouselNextLazy = lazy(() =>
  import('./carousel').then((m) => ({ default: m.CarouselNext }))
);

function CarouselSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden">
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-shrink-0 w-full h-48 rounded-lg"
            />
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}

type CarouselProps = ComponentProps<typeof CarouselLazy>;
type CarouselContentProps = ComponentProps<typeof CarouselContentLazy>;
type CarouselItemProps = ComponentProps<typeof CarouselItemLazy>;
type CarouselPreviousProps = ComponentProps<typeof CarouselPreviousLazy>;
type CarouselNextProps = ComponentProps<typeof CarouselNextLazy>;

export function LazyCarousel(props: CarouselProps) {
  return (
    <Suspense fallback={<CarouselSkeleton className={props.className as string} />}>
      <CarouselLazy {...props} />
    </Suspense>
  );
}

export function LazyCarouselContent(props: CarouselContentProps) {
  return (
    <Suspense fallback={null}>
      <CarouselContentLazy {...props} />
    </Suspense>
  );
}

export function LazyCarouselItem(props: CarouselItemProps) {
  return (
    <Suspense fallback={null}>
      <CarouselItemLazy {...props} />
    </Suspense>
  );
}

export function LazyCarouselPrevious(props: CarouselPreviousProps) {
  return (
    <Suspense fallback={null}>
      <CarouselPreviousLazy {...props} />
    </Suspense>
  );
}

export function LazyCarouselNext(props: CarouselNextProps) {
  return (
    <Suspense fallback={null}>
      <CarouselNextLazy {...props} />
    </Suspense>
  );
}

export { CarouselSkeleton };
