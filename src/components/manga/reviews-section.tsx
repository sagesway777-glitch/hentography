"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Award, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface ReviewsSectionProps {
  mangaId: string;
}

export function ReviewsSection({ mangaId }: ReviewsSectionProps) {
  const { isSignedIn } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [mangaId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?mangaId=${mangaId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data);
      }
    } catch (error) {
      console.error("Failed to load reviews", error);
    }
  };

  const handleSubmit = async () => {
    if (!isSignedIn) {
      toast.error("Please login to review");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (newReview.length < 20) {
      toast.error("Review must be at least 20 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId, rating, body: newReview }),
      });

      if (res.ok) {
        toast.success("Review posted!");
        setNewReview("");
        setRating(0);
        fetchReviews();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to post review");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ReviewItem = ({ review }: { review: any }) => {
    return (
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-slate-700">
              <AvatarImage src={review.user.image} />
              <AvatarFallback>{review.user.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-slate-200 text-sm">{review.user.name}</div>
              <div className="text-xs text-slate-500">{formatDistanceToNow(new Date(review.createdAt))} ago</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-bold text-amber-400">{review.rating}</span>
            <span className="text-amber-400/50 text-xs">/10</span>
          </div>
        </div>
        
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{review.body}</p>
        
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors">
            <Award className="w-4 h-4" />
            <span>Helpful ({review.helpfulVotes})</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-5 h-5 text-amber-400" />
        <h3 className="text-xl font-bold text-white">Reviews ({reviews.length})</h3>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
        {isSignedIn ? (
          <>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Your Rating</label>
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-6 h-6 cursor-pointer transition-colors ${i < rating ? "text-amber-400 fill-amber-400" : "text-slate-700 hover:text-amber-400/50"}`}
                    onClick={() => setRating(i + 1)}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Your Review</label>
              <Textarea 
                placeholder="What did you think of this manga?" 
                value={newReview} 
                onChange={(e) => setNewReview(e.target.value)}
                className="bg-slate-950 border-slate-700 focus:border-indigo-500 transition-colors min-h-[120px]" 
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                Post Review
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-400 mb-4">You must be logged in to write a review.</p>
            <Button onClick={() => window.location.href = '/login'} variant="outline" className="border-slate-700">
              Log In
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4 mt-8">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-slate-500">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
