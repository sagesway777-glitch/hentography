"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";
import {
  Settings,
  Sun,
  Minus,
  Plus,
  Maximize,
  Minimize,
  AlignJustify,
  LayoutGrid,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  ImageOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReadingMode = "vertical" | "horizontal" | "webtoon";
type ReadingDirection = "ltr" | "rtl";

interface ReaderSettings {
  readingMode: ReadingMode;
  readingDirection: ReadingDirection;
  brightness: number; // 0.3 – 1
  zoom: number; // 0.5 – 2
}

interface ChapterData {
  id: string;
  mangaId: string;
  images: string[];
}

interface HistoryData {
  pageNumber?: number;
  readingMode?: string;
  readingDirection?: string;
  zoomLevel?: number;
  brightness?: number;
}

interface ReaderClientProps {
  chapter: ChapterData;
  mangaSlug: string;
  initialHistory: HistoryData | null;
  nextChapterSlug?: string | null;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const SETTINGS_KEY = "reader_settings_v2";

function loadSettings(history: HistoryData | null): ReaderSettings {
  const defaults: ReaderSettings = {
    readingMode: "vertical",
    readingDirection: "ltr",
    brightness: 1,
    zoom: 1,
  };
  try {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
    const parsed = stored ? (JSON.parse(stored) as Partial<ReaderSettings>) : {};
    return {
      ...defaults,
      ...parsed,
      // DB-saved values take priority — user may have changed per-chapter
      readingMode:
        (history?.readingMode as ReadingMode) ||
        parsed.readingMode ||
        defaults.readingMode,
      readingDirection:
        (history?.readingDirection as ReadingDirection) ||
        parsed.readingDirection ||
        defaults.readingDirection,
      // Restore zoom and brightness from DB if available
      zoom: history?.zoomLevel ?? parsed.zoom ?? defaults.zoom,
      brightness: history?.brightness ?? parsed.brightness ?? defaults.brightness,
    };
  } catch {
    return defaults;
  }
}

function saveSettings(settings: ReaderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ─── Image with error retry ───────────────────────────────────────────────────

function ReaderImage({
  src,
  alt,
  className,
  style,
  loading,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "eager" | "lazy";
}) {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  const handleError = () => {
    if (retryCount < MAX_RETRIES) {
      // Brief delay before retry
      setTimeout(() => {
        setRetryCount((c) => c + 1);
        setError(false);
      }, 1500);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-slate-900 text-slate-600 rounded"
        style={{ minHeight: 300, ...style }}
        role="img"
        aria-label={`${alt} — failed to load`}
      >
        <ImageOff className="w-10 h-10 mb-2" />
        <p className="text-xs">Image failed to load</p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${src}-${retryCount}`}
      src={optimizeCloudinaryUrl(src, 1200)}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
    />
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

function SettingsPanel({
  settings,
  onClose,
  onChange,
}: {
  settings: ReaderSettings;
  onClose: () => void;
  onChange: (next: Partial<ReaderSettings>) => void;
}) {
  // Trap focus within panel
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Reader Settings"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full sm:w-96 bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white text-lg" id="settings-title">
            Reader Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-slate-400" aria-hidden="true" />
          </button>
        </div>

        {/* Reading Mode */}
        <fieldset className="mb-5">
          <legend className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 block">
            Reading Mode
          </legend>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Reading mode">
            {(
              [
                { id: "vertical" as const, label: "Vertical" },
                { id: "horizontal" as const, label: "Single Page" },
                { id: "webtoon" as const, label: "Webtoon" },
              ]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onChange({ readingMode: id })}
                aria-pressed={settings.readingMode === id}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingMode === id
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Reading Direction */}
        <fieldset className="mb-5">
          <legend className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 block">
            Reading Direction
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "ltr" as const, label: "Left → Right" },
                { id: "rtl" as const, label: "Right → Left" },
              ]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onChange({ readingDirection: id })}
                aria-pressed={settings.readingDirection === id}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingDirection === id
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Brightness */}
        <div className="mb-5">
          <label
            htmlFor="brightness-slider"
            className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center justify-between"
          >
            <span>Brightness</span>
            <span className="text-slate-300 normal-case font-normal">
              {Math.round(settings.brightness * 100)}%
            </span>
          </label>
          <div className="flex items-center gap-3">
            <Sun className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            <input
              id="brightness-slider"
              type="range"
              min={30}
              max={100}
              value={Math.round(settings.brightness * 100)}
              onChange={(e) =>
                onChange({ brightness: parseInt(e.target.value) / 100 })
              }
              aria-valuemin={30}
              aria-valuemax={100}
              aria-valuenow={Math.round(settings.brightness * 100)}
              aria-label="Brightness level"
              className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <Sun className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* Zoom (not for webtoon) */}
        {settings.readingMode !== "webtoon" && (
          <div className="mb-2">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center justify-between">
              <span>Zoom</span>
              <span className="text-slate-300 normal-case font-normal">
                {Math.round(settings.zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  onChange({ zoom: Math.max(0.5, parseFloat((settings.zoom - 0.1).toFixed(1))) })
                }
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Decrease zoom"
              >
                <Minus className="w-4 h-4 text-slate-300" aria-hidden="true" />
              </button>
              <div
                className="flex-1 h-1.5 bg-slate-700 rounded-full relative"
                role="presentation"
              >
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${((settings.zoom - 0.5) / 1.5) * 100}%` }}
                />
              </div>
              <button
                onClick={() =>
                  onChange({ zoom: Math.min(2, parseFloat((settings.zoom + 0.1).toFixed(1))) })
                }
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Increase zoom"
              >
                <Plus className="w-4 h-4 text-slate-300" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-600 mt-4 text-center">
          Settings save automatically — press{" "}
          <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">S</kbd> to
          open anytime.
        </p>
      </div>
    </div>
  );
}

// ─── Main ReaderClient ────────────────────────────────────────────────────────

export function ReaderClient({
  chapter,
  mangaSlug,
  initialHistory,
  nextChapterSlug,
}: ReaderClientProps) {
  const [settings, setSettings] = useState<ReaderSettings>({
    readingMode: "vertical",
    readingDirection: "ltr",
    brightness: 1,
    zoom: 1,
  });
  const [currentPage, setCurrentPage] = useState(initialHistory?.pageNumber || 0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    const s = loadSettings(initialHistory);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(s);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsLoaded(true);
  }, [initialHistory]);

  // Persist settings to localStorage
  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  // Preload next chapter images in background
  useEffect(() => {
    if (!nextChapterSlug || typeof window === "undefined") return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = `/read/${mangaSlug}/${nextChapterSlug}`;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [nextChapterSlug, mangaSlug]);

  // Debounced history save — only fires when user is actively reading
  const saveHistory = useCallback(
    (pageNumber: number, mode: ReadingMode, direction: ReadingDirection, zoom: number, brightness: number) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mangaId: chapter.mangaId,
              chapterId: chapter.id,
              pageNumber,
              readingMode: mode,
              readingDirection: direction,
              zoomLevel: zoom,
              brightness,
              isCompleted: pageNumber >= chapter.images.length - 1,
            }),
          });
        } catch {
          // Non-fatal — swallow silently
        }
      }, 1500);
    },
    [chapter.id, chapter.mangaId, chapter.images.length]
  );

  useEffect(() => {
    saveHistory(currentPage, settings.readingMode, settings.readingDirection, settings.zoom, settings.brightness);
  }, [currentPage, settings.readingMode, settings.readingDirection, settings.zoom, settings.brightness, saveHistory]);

  // Scroll tracking for vertical/webtoon modes
  const handleScroll = useCallback(() => {
    if (
      settings.readingMode !== "vertical" &&
      settings.readingMode !== "webtoon"
    )
      return;

    let bestIndex = currentPage;
    let maxRatio = 0;

    pageRefs.current.forEach((el, index) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const visible =
        Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const ratio = visible / el.clientHeight;
      if (ratio > maxRatio) {
        maxRatio = ratio;
        bestIndex = index;
      }
    });

    if (bestIndex !== currentPage) setCurrentPage(bestIndex);
  }, [currentPage, settings.readingMode]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((p: number) => p - 1);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [currentPage]);

  const nextPage = useCallback(() => {
    if (currentPage < chapter.images.length - 1) {
      setCurrentPage((p: number) => p + 1);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [currentPage, chapter.images.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (showSettings) {
        if (e.key === "Escape") setShowSettings(false);
        return;
      }

      if (settings.readingMode === "horizontal") {
        if (e.key === "ArrowRight") {
          if (settings.readingDirection === "ltr") {
            nextPage();
          } else {
            prevPage();
          }
        } else if (e.key === "ArrowLeft") {
          if (settings.readingDirection === "ltr") {
            prevPage();
          } else {
            nextPage();
          }
        }
      }

      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === "s" || e.key === "S") setShowSettings((v) => !v);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [settings, showSettings, currentPage, toggleFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleSettingChange = useCallback((next: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
  }, []);

  if (!chapter.images || chapter.images.length === 0) {
    return (
      <div className="pt-14 pb-20 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <BookOpen className="w-12 h-12 text-slate-700 mb-4" aria-hidden="true" />
        <p className="text-slate-400 text-lg font-medium">
          No images available for this chapter.
        </p>
      </div>
    );
  }

  // Brightness overlay — rendered via CSS filter to avoid layout impact
  const brightnessFilter =
    settings.brightness < 1
      ? { filter: `brightness(${settings.brightness})` }
      : {};

  const imageTransform =
    settings.readingMode !== "webtoon" && settings.zoom !== 1
      ? {
          transform: `scale(${settings.zoom})`,
          transformOrigin: "top center",
          transition: "transform 0.15s ease",
        }
      : {};

  // ── Horizontal ──────────────────────────────────────────────────────────────
  if (settings.readingMode === "horizontal") {
    const orderedImages =
      settings.readingDirection === "rtl"
        ? [...chapter.images].reverse()
        : chapter.images;

    const displayPageNumber =
      settings.readingDirection === "rtl"
        ? chapter.images.length - currentPage
        : currentPage + 1;

    return (
      <>
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onClose={() => setShowSettings(false)}
            onChange={handleSettingChange}
          />
        )}

        <div
          className="pt-14 pb-20 min-h-screen flex flex-col items-center justify-center bg-black select-none"
          style={brightnessFilter}
        >
          <div
            className="relative flex items-center justify-center w-full h-[calc(100vh-8rem)]"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (e.clientX - rect.left < rect.width / 2) {
                prevPage();
              } else {
                nextPage();
              }
            }}
            role="region"
            aria-label={`Page ${displayPageNumber} of ${chapter.images.length}`}
          >
            {/* Click zone hints */}
            <div
              className="absolute left-0 top-0 h-full w-1/4 z-10 flex items-center pl-4 opacity-0 hover:opacity-100 transition-opacity"
              aria-hidden="true"
            >
              <div className="bg-black/40 text-white rounded-full p-3 backdrop-blur-sm">
                <ChevronLeft className="w-6 h-6" />
              </div>
            </div>
            <div
              className="absolute right-0 top-0 h-full w-1/4 z-10 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
              aria-hidden="true"
            >
              <div className="bg-black/40 text-white rounded-full p-3 backdrop-blur-sm">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>

            <ReaderImage
              src={orderedImages[currentPage]}
              alt={`Page ${displayPageNumber} of ${chapter.images.length}`}
              className="max-h-full max-w-full object-contain"
              style={imageTransform}
              loading="eager"
            />
          </div>

          {/* Page counter + controls */}
          <div
            className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 backdrop-blur-xl border border-slate-700/50 rounded-full px-4 py-2 z-50"
            role="navigation"
            aria-label="Page navigation"
          >
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className="p-1 text-slate-300 hover:text-white disabled:text-slate-700 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span
              className="text-sm font-medium text-white tabular-nums min-w-[60px] text-center"
              aria-live="polite"
              aria-atomic="true"
            >
              {displayPageNumber} / {chapter.images.length}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= chapter.images.length - 1}
              className="p-1 text-slate-300 hover:text-white disabled:text-slate-700 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="w-px h-4 bg-slate-700" aria-hidden="true" />
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Open reader settings"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Maximize className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Vertical & Webtoon ────────────────────────────────────────────────────────
  const isWebtoon = settings.readingMode === "webtoon";

  return (
    <>
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onChange={handleSettingChange}
        />
      )}

      <div
        className={`pt-14 pb-24 ${isWebtoon ? "bg-[#111]" : "bg-slate-950"}`}
        ref={containerRef}
        style={brightnessFilter}
      >
        <div className={`mx-auto ${isWebtoon ? "max-w-[800px]" : "max-w-4xl px-4"}`}>
          <div className={isWebtoon ? "" : "space-y-3"}>
            {chapter.images.map((image: string, index: number) => (
              <div
                key={index}
                ref={(el) => {
                  pageRefs.current[index] = el;
                }}
                className="relative w-full flex justify-center"
              >
                <ReaderImage
                  src={image}
                  alt={`Page ${index + 1} of ${chapter.images.length}`}
                  className={`${isWebtoon ? "w-full" : "max-w-full"} h-auto`}
                  style={!isWebtoon ? imageTransform : undefined}
                  loading={index < 3 ? "eager" : "lazy"}
                />
                {!isWebtoon && (
                  <span
                    className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none select-none"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50" role="toolbar" aria-label="Reader controls">
        <button
          onClick={() => setShowSettings(true)}
          className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/50 rounded-xl backdrop-blur-xl text-slate-300 hover:text-white transition-all shadow-lg"
          aria-label="Reader settings (S)"
          title="Settings (S)"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/50 rounded-xl backdrop-blur-xl text-slate-300 hover:text-white transition-all shadow-lg"
          aria-label={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
          title="Fullscreen (F)"
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Maximize className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/50 rounded-xl backdrop-blur-xl text-slate-400 hover:text-white transition-all shadow-lg text-sm font-bold"
          aria-label="Back to top"
          title="Back to top"
        >
          ↑
        </button>
      </div>
    </>
  );
}
