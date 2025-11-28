import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function StarRating({ rating, size = 'md', showValue = false }: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center gap-1" data-testid="star-rating">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= roundedRating
                ? 'fill-accent text-accent'
                : 'text-muted-foreground'
            }`}
            data-testid={`star-${star}`}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1" data-testid="rating-value">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}
