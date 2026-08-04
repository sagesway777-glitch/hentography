"use client";

import * as React from "react";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  className?: string;
}

function StarRating({ rating, onRatingChange, size = 20, readonly = false, className }: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = hoverRating >= star || (!hoverRating && rating >= star);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onRatingChange?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={cn(
              "relative transition-transform duration-150",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <Star
              size={size}
              className={cn(
                fill
                  ? "text-amber-400 fill-amber-400"
                  : "text-slate-600",
                "transition-colors duration-150"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export { StarRating };
