"use client";

import { useState } from "react";
import { Share, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, text = "", url, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Determine the share URL: provided URL or current window URL
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    // Prepare share data
    const shareData = {
      title,
      text,
      url: shareUrl,
    };

    // Attempt native Web Share API (mobile devices, Safari, Edge)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
      console.error("Clipboard write failed", err);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleShare}
      className={`border-slate-700 bg-slate-900/50 hover:bg-slate-800 ${className}`}
      aria-label="Share this page"
    >
      {copied ? (
        <Check className="w-4 h-4 mr-2 text-green-400" />
      ) : (
        <Share className="w-4 h-4 mr-2" />
      )}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
