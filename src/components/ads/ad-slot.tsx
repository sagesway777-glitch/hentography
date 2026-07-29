"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface AdSlotProps {
  position: string;
  className?: string;
}

export function AdSlot({ position, className = "" }: AdSlotProps) {
  const [ad, setAd] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tracked, setTracked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch(`/api/ads?position=${position}`);
        if (res.ok) {
          const data = await res.json();
          setAd(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch ad:", error);
      }
    };
    fetchAd();
  }, [position]);

  useEffect(() => {
    if (!ad || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !tracked) {
          setIsVisible(true);
          setTracked(true);
          // Track impression
          fetch("/api/ads/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: ad.id, type: "impression" }),
          }).catch(() => {});
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ad, tracked]);

  if (!ad) return null;

  const handleClick = () => {
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id, type: "click" }),
    }).catch(() => {});
  };

  const renderContent = () => {
    switch (ad.type) {
      case "BANNER":
      case "SIDEBAR":
      case "HEADER":
      case "FOOTER":
        return (
          <a href={ad.linkUrl || "#"} target="_blank" rel="noopener noreferrer" onClick={handleClick} className="block relative w-full h-full min-h-[100px]">
            {ad.imageUrl && (
              <img src={ad.imageUrl} alt={ad.name} className="w-full h-full object-cover rounded-lg" />
            )}
            <div className="absolute top-1 right-1 bg-black/50 text-[10px] text-white px-1 rounded uppercase tracking-wider backdrop-blur-sm">Ad</div>
          </a>
        );
      case "CUSTOM_HTML":
        return (
          <div className="relative">
            <div dangerouslySetInnerHTML={{ __html: ad.content }} onClick={handleClick} />
            <div className="absolute top-1 right-1 bg-black/50 text-[10px] text-white px-1 rounded uppercase tracking-wider backdrop-blur-sm">Ad</div>
          </div>
        );
      default:
        return (
          <div className="relative p-4 border border-slate-800 bg-slate-900 rounded-lg text-center" onClick={handleClick}>
            {ad.linkUrl ? (
              <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{ad.content}</a>
            ) : (
              <span className="text-slate-300">{ad.content}</span>
            )}
            <div className="absolute top-1 right-1 bg-black/50 text-[10px] text-white px-1 rounded uppercase tracking-wider">Ad</div>
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className={`w-full flex items-center justify-center my-4 ${className}`}>
      {renderContent()}
    </div>
  );
}
