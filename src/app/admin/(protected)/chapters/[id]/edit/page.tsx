"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Loader2, Plus, GripVertical, Trash2, Image as ImageIcon, Save } from "lucide-react";
import toast from "react-hot-toast";

const editChapterSchema = z.object({
  mangaId: z.string().min(1, "Manga is required"),
  chapterNumber: z.coerce.number().min(0, "Chapter number must be positive"),
  title: z.string().optional(),
  isPublished: z.boolean(),
});

type EditChapterFormValues = z.infer<typeof editChapterSchema>;

interface PageItem {
  id: string;
  file: File | null;
  url: string | null;
  progress: number;
  isUploading: boolean;
}

export default function AdminEditChapterContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [mangaList, setMangaList] = useState<{ id: string; title: string }[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditChapterFormValues>({
    resolver: zodResolver(editChapterSchema),
    defaultValues: {
      isPublished: true,
    },
  });

  const selectedMangaId = watch("mangaId");
  const isPublished = watch("isPublished");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch manga list
        const mangaRes = await fetch("/api/admin/manga?limit=100");
        const mangaJson = await mangaRes.json();
        if (mangaJson.data) setMangaList(mangaJson.data);

        // Fetch chapter data
        const res = await fetch(`/api/admin/chapters/${id}`);
        if (!res.ok) throw new Error("Failed to fetch chapter");
        const responseJson = await res.json();
        const data = responseJson.data;
        
        reset({
          mangaId: data.mangaId,
          chapterNumber: data.chapterNumber,
          title: data.title || "",
          isPublished: !data.isDraft,
        });

        if (data.images && Array.isArray(data.images)) {
          setPages(data.images.map((url: string, index: number) => ({
            id: `page-${index}-${Math.random().toString(36).substring(2, 9)}`,
            file: null,
            url,
            progress: 0,
            isUploading: false,
          })));
        }
      } catch (error) {
        toast.error("Failed to load chapter data");
        router.push("/admin/chapters");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [id, reset, router]);

  const addPage = () => {
    document.getElementById("page-upload")?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newPages = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      url: URL.createObjectURL(file),
      progress: 0,
      isUploading: false,
    }));

    setPages((prev) => [...prev, ...newPages]);
    e.target.value = ""; // Reset input
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const replacePage = (id: string, file: File) => {
    setPages((prev) => prev.map((p) => 
      p.id === id ? { ...p, file, url: URL.createObjectURL(file), progress: 0, isUploading: false } : p
    ));
  };

  // Drag and Drop reordering
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newPages = [...pages];
    const draggedItem = newPages[draggedItemIndex];
    newPages.splice(draggedItemIndex, 1);
    newPages.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    setPages(newPages);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const uploadPageToCloudinary = (page: PageItem, index: number): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!page.file) {
          if (page.url && page.url.startsWith("http")) return resolve(page.url);
          return reject(new Error("No file or URL provided"));
        }

        setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, isUploading: true } : p));

        const sigRes = await fetch("/api/upload/signature?folder=hentaiplus/chapters");
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

        const formData = new FormData();
        formData.append("file", page.file);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp);
        formData.append("api_key", apiKey);
        formData.append("folder", "hentaiplus/chapters");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, progress } : p));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, url: response.secure_url, isUploading: false, file: null } : p));
            resolve(response.secure_url);
          } else {
            reject(new Error("Failed to upload image"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      } catch (err) {
        setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, isUploading: false } : p));
        reject(err);
      }
    });
  };

  const onSubmit = async (data: EditChapterFormValues) => {
    if (pages.length === 0) {
      toast.error("Please add at least one page");
      return;
    }

    setIsLoading(true);
    toast.loading("Saving pages...", { id: "save" });

    try {
      // 1. Upload all pending files sequentially
      const uploadedUrls: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].file) {
          toast.loading(`Uploading new page ${i + 1} of ${pages.length}...`, { id: "save" });
        }
        const url = await uploadPageToCloudinary(pages[i], i);
        uploadedUrls.push(url);
      }

      // 2. Save chapter to DB
      toast.loading("Saving chapter...", { id: "save" });
      const payload = {
        ...data,
        isDraft: !data.isPublished,
        pages: uploadedUrls.length,
        images: uploadedUrls, 
      };

      const res = await fetch(`/api/admin/chapters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update chapter");

      toast.success("Chapter updated successfully!", { id: "save" });
      router.push("/admin/chapters");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred", { id: "save" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Edit Chapter</h1>
          <p className="text-[var(--text-muted)] mt-1">Reorder, replace, or add pages.</p>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading || pages.length === 0}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Manga <span className="text-red-500">*</span></label>
                <Select disabled={isLoading} value={selectedMangaId} onValueChange={(v) => setValue("mangaId", v)}>
                  <SelectTrigger className="bg-[var(--bg-base)] border-[var(--border)]">
                    <SelectValue placeholder="Select manga" />
                  </SelectTrigger>
                  <SelectContent>
                    {mangaList.map((manga) => (
                      <SelectItem key={manga.id} value={manga.id}>
                        {manga.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.mangaId && <p className="text-xs text-red-500">{errors.mangaId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Chapter Number <span className="text-red-500">*</span></label>
                <Input {...register("chapterNumber")} type="number" step="0.1" className="bg-[var(--bg-base)] border-[var(--border)]" disabled={isLoading} />
                {errors.chapterNumber && <p className="text-xs text-red-500">{errors.chapterNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Chapter Title</label>
                <Input {...register("title")} placeholder="Optional title" className="bg-[var(--bg-base)] border-[var(--border)]" disabled={isLoading} />
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Publish Directly</p>
                  <p className="text-xs text-[var(--text-muted)]">Make visible immediately</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setValue("isPublished", e.target.checked)}
                  disabled={isLoading}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="glass-card min-h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] pb-4">
              <CardTitle>Pages ({pages.length})</CardTitle>
              <Button onClick={addPage} disabled={isLoading} size="sm" variant="secondary" className="bg-[var(--bg-card-2)] border-[var(--border)] text-white hover:bg-[var(--bg-base)]">
                <Plus className="w-4 h-4 mr-2" />
                Add Pages
              </Button>
              <input 
                id="page-upload" 
                type="file" 
                multiple 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
                onChange={handleFileSelect} 
              />
            </CardHeader>
            <CardContent className="flex-1 p-4">
              {pages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[var(--border)] rounded-xl mt-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--bg-base)] flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-[var(--primary)]" />
                  </div>
                  <h3 className="text-lg font-medium text-white">No pages yet</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1 mb-6 max-w-sm">
                    Click the Add Pages button to select images. You can select multiple images at once.
                  </p>
                  <Button onClick={addPage} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white">
                    Browse Images
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {pages.map((page, index) => (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                        draggedItemIndex === index
                          ? "bg-[var(--bg-base)] border-[var(--primary)] opacity-50"
                          : "bg-[var(--bg-card-2)] border-[var(--border)] hover:border-[var(--primary)]"
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-white">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="w-8 font-bold text-slate-400 text-center">
                        {index + 1}
                      </div>
                      <div className="w-12 h-16 rounded overflow-hidden bg-black/50 shrink-0 border border-slate-700">
                        {page.url && <img src={page.url} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {page.file ? page.file.name : `Page ${index + 1}`}
                        </p>
                        {page.isUploading ? (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--primary)] transition-all duration-300" style={{ width: `${page.progress}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-8">{page.progress}%</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            {page.file ? `${(page.file.size / 1024 / 1024).toFixed(2)} MB` : 'Existing Page'}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          className="hidden" 
                          id={`replace-${page.id}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) replacePage(page.id, file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => document.getElementById(`replace-${page.id}`)?.click()}
                          disabled={isLoading || page.isUploading}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        >
                          Replace Image
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePage(page.id)}
                          disabled={isLoading || page.isUploading}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Page
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
