"use client";

import { StarRating } from "@/components/ui/star-rating";
import { useState } from "react";

interface MangaRatingSectionProps {
  mangaId: string;
  initialRating: number;
  averageRating: number;
}

export function MangaRatingSection({ mangaId, initialRating, averageRating }: MangaRatingSectionProps) {
  const [rating, setRating] = useState(initialRating);

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId, rating: newRating }),
      });
    } catch (err) {
      console.error("Failed to save rating:", err);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <StarRating rating={rating} onRatingChange={handleRatingChange} />
      <span className="text-slate-400">{averageRating.toFixed(1)} / 5.0</span>
    </div>
  );
}
