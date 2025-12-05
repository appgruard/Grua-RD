import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'className'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  showSkeleton?: boolean;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  wrapperClassName?: string;
  imageClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallbackSrc = '',
  showSkeleton = true,
  aspectRatio,
  objectFit = 'cover',
  wrapperClassName,
  imageClassName,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  const imageSrc = error && fallbackSrc ? fallbackSrc : src;

  const hasExplicitSize = width || height || aspectRatio;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', wrapperClassName)}
      style={{
        aspectRatio: aspectRatio,
        width: width ? `${width}px` : hasExplicitSize ? undefined : '100%',
        height: height ? `${height}px` : undefined,
        minHeight: hasExplicitSize ? undefined : '1rem',
      }}
    >
      {showSkeleton && isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            imageClassName
          )}
          style={{ objectFit }}
          {...props}
        />
      )}
    </div>
  );
}

export function ProfileImage({
  src,
  alt,
  size = 'md',
  fallbackInitials,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackInitials?: string;
}) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  if (error || !src) {
    return (
      <div
        className={cn(
          'rounded-full bg-primary/10 flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        <span className={cn('text-primary font-semibold', textSizes[size])}>
          {fallbackInitials || alt.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-full', sizeClasses[size], className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
        className="w-full h-full object-cover"
        {...props}
      />
    </div>
  );
}
