"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSurveyContext } from "@/components/survey/SurveyProvider";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queueAction } from "@/lib/offline-queue";

interface ReviewFormProps {
  businessId: string;
  userId: string;
}

export function ReviewForm({ businessId }: ReviewFormProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { markAction } = useSurveyContext();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/businesses/${businessId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit review.");
        return;
      }

      setSubmitted(true);
      markAction("business_review");
      setRating(0);
      setText("");
      router.refresh();
    } catch {
      // Offline: queue review for later
      queueAction({
        endpoint: `/api/businesses/${businessId}/reviews`,
        method: "POST",
        body: { rating, text: text.trim() || undefined },
      });
      toast.info("Review saved offline — will submit when you reconnect");
      setSubmitted(true);
      setRating(0);
      setText("");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
        <p className="text-sm text-green-800 font-medium">
          Review submitted. Thank you!
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-[#2E7D32]"
          onClick={() => setSubmitted(false)}
        >
          Write another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium text-gray-700">Write a Review</p>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Rating</Label>
        <StarRating
          value={rating}
          onChange={setRating}
          size="lg"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="review-text" className="text-xs text-gray-500">
          Comment (optional)
        </Label>
        <Textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your experience…"
          rows={3}
          maxLength={500}
          className="text-sm resize-none"
        />
        <p className="text-right text-xs text-gray-400">{text.length}/500</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full bg-[#2E7D32] hover:bg-[#1B5E20]"
      >
        {loading ? "Submitting…" : "Submit Review"}
      </Button>
    </form>
  );
}
