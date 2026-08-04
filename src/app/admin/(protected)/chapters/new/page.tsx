"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UploadCloud, FileArchive, Plus } from "lucide-react";
import toast from "react-hot-toast";

const createChapterSchema = z.object({
  mangaId: z.string().min(1, "Manga is required"),
  chapterNumber: z.coerce.number().min(0, "Chapter number must be positive"),
  title: z.string().optional(),
  isPublished: z.boolean(),
});

type CreateChapterFormValues = z.infer<typeof createChapterSchema>;

interface MangaOption { id: string; title: string; }
interface PageUploadResult { pageNumber: number; url: string; }

function AdminNewChapterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMangaId = searchParams.get("mangaId") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [mangaList, setMangaList] = useState<{ id: string; title: string }[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateChapterFormValues>({
    resolver: zodResolver(createChapterSchema),
    defaultValues: {
      mangaId: initialMangaId,
      isPublished: true,
    },
  });

  const isPublished = watch("isPublished");
  const selectedMangaId = watch("mangaId");

  useEffect(() => {
    // Fetch manga list for dropdown
    const fetchManga = async () => {
      try {
        const res = await fetch("/api/admin/manga?limit=100");
        const json = await res.json();
        if (json.data) {
          setMangaList(json.data.map((m: MangaOption) => ({ id: m.id, title: m.title })));
        }
      } catch (error) {
        toast.error("Failed to fetch manga list");
      }
    };
    fetchManga();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      toast.error("Only ZIP files are supported");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("ZIP file size must be less than 100MB");
      return;
    }

    setZipFile(file);
  };

  const onSubmit = async (data: CreateChapterFormValues) => {
    if (!zipFile) {
      toast.error("Please select a ZIP file containing the chapter images");
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Process ZIP and upload images to Cloudinary via backend
      toast.loading("Uploading and extracting ZIP file (this may take a while)...", { id: "upload" });
      
      const formData = new FormData();
      formData.append("file", zipFile);
      formData.append("mangaId", data.mangaId);
      formData.append("chapterNumber", data.chapterNumber.toString());

      const uploadRes = await fetch("/api/upload/chapter", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadResult.error || "Failed to process ZIP");
      }

      const pages = uploadResult.pages;
      toast.loading(`Successfully extracted ${pages.length} pages. Saving chapter...`, { id: "upload" });

      // 2. Save chapter to database
      const chapterRes = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId: data.mangaId,
          chapterNumber: data.chapterNumber,
          title: data.title,
          isPublished: data.isPublished,
          pages: pages.map((p: PageUploadResult) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.url,
          })),
        }),
      });

      const chapterResult = await chapterRes.json();

      if (!chapterRes.ok) {
        throw new Error(chapterResult.error || "Failed to save chapter");
      }

      toast.success("Chapter published successfully!", { id: "upload" });
      router.push("/admin/chapters");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred", { id: "upload" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Add New Chapter</h1>
        <p className="text-slate-400 mt-1">Upload a ZIP file containing chapter pages.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Chapter Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Manga <span className="text-red-500">*</span></label>
                <Select disabled={isLoading} value={selectedMangaId} onValueChange={(v) => setValue("mangaId", v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-800">
                    <SelectValue placeholder="Select Manga" />
                  </SelectTrigger>
                  <SelectContent>
                    {mangaList.map(manga => (
                      <SelectItem key={manga.id} value={manga.id}>{manga.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.mangaId && <p className="text-xs text-red-500">{errors.mangaId.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Chapter Number <span className="text-red-500">*</span></label>
                <Input {...register("chapterNumber")} type="number" step="0.1" placeholder="e.g. 1 or 1.5" className="bg-slate-950 border-slate-800" disabled={isLoading} />
                {errors.chapterNumber && <p className="text-xs text-red-500">{errors.chapterNumber.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Chapter Title (Optional)</label>
              <Input {...register("title")} placeholder="e.g. The Beginning" className="bg-slate-950 border-slate-800" disabled={isLoading} />
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <label className="text-sm font-medium text-slate-300">Upload Pages (ZIP Archive) <span className="text-red-500">*</span></label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors bg-slate-950 ${
                  zipFile ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-500'
                }`}
                onClick={() => document.getElementById('zip-upload')?.click()}
              >
                <div className="flex flex-col items-center justify-center">
                  <FileArchive className={`w-12 h-12 mb-4 ${zipFile ? 'text-indigo-500' : 'text-slate-600'}`} />
                  {zipFile ? (
                    <>
                      <span className="text-base font-medium text-white">{zipFile.name}</span>
                      <span className="text-xs text-slate-400 mt-1">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="text-indigo-400 text-sm mt-2 font-medium">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base font-medium text-slate-300">Click to select ZIP file</span>
                      <span className="text-sm text-slate-500 mt-1">Images inside must be named sequentially (e.g. 01.jpg, 02.jpg)</span>
                      <span className="text-xs text-slate-600 mt-2">Max 100MB</span>
                    </>
                  )}
                </div>
              </div>
              <input id="zip-upload" type="file" accept=".zip,application/zip" className="hidden" onChange={handleFileChange} disabled={isLoading} />
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-slate-800">
              <Checkbox 
                id="isPublished" 
                checked={isPublished} 
                onCheckedChange={(c) => setValue("isPublished", !!c)} 
                disabled={isLoading} 
              />
              <label htmlFor="isPublished" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                Publish immediately (uncheck to save as draft)
              </label>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload & Create Chapter
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default function AdminNewChapterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <AdminNewChapterContent />
    </Suspense>
  );
}
