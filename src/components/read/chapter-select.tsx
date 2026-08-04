"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChapterSelectProps {
  currentChapterNumber: number;
  mangaSlug: string;
  allChapters: { chapterNumber: number; title: string | null }[];
}

export function ChapterSelect({ currentChapterNumber, mangaSlug, allChapters }: ChapterSelectProps) {
  return (
    <Select
      defaultValue={`chapter-${currentChapterNumber}`}
      onValueChange={(v) => {
        window.location.href = `/read/${mangaSlug}/${v}`;
      }}
    >
      <SelectTrigger
        className="h-8 w-48 bg-slate-800 border-slate-700 text-slate-200 text-xs"
        aria-label="Select chapter"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64 overflow-y-auto">
        {allChapters.map((ch) => (
          <SelectItem
            key={ch.chapterNumber}
            value={`chapter-${ch.chapterNumber}`}
            className="text-xs"
          >
            Chapter {ch.chapterNumber}
            {ch.title ? ` — ${ch.title}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
