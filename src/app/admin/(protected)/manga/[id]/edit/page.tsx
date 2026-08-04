"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Loader2, UploadCloud, ImageIcon, Save, X } from "lucide-react";
import toast from "react-hot-toast";

const editMangaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  alternativeTitles: z.string().optional(),
  author: z.string().optional(),
  artist: z.string().optional(),
  synopsis: z.string().optional(),
  status: z.enum(["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"]),
  releaseYear: z.string().optional(),
  ageRating: z.string().optional(),
  isFeatured: z.boolean(),
  isTrending: z.boolean(),
  isPublished: z.boolean(),
});

type EditMangaFormValues = z.infer<typeof editMangaSchema>;

export default function AdminMangaEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  // Image Upload State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Genres & Tags State
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditMangaFormValues>({
    resolver: zodResolver(editMangaSchema),
    defaultValues: {
      status: "ONGOING",
      isFeatured: false,
      isTrending: false,
      isPublished: true,
    },
  });

  const status = watch("status");
  const isFeatured = watch("isFeatured");
  const isTrending = watch("isTrending");
  const isPublished = watch("isPublished");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch genres
        const genresRes = await fetch("/api/genres");
        const genresJson = await genresRes.json();
        if (genresJson.data) setGenres(genresJson.data);

        // Fetch manga data
        const res = await fetch(`/api/admin/manga/${id}`);
        if (!res.ok) throw new Error("Failed to fetch manga");
        const data = await res.json();
        
        reset({
          title: data.title || "",
          alternativeTitles: data.alternativeTitles || "",
          author: data.author || "",
          artist: data.artist || "",
          synopsis: data.synopsis || "",
          status: data.status || "ONGOING",
          releaseYear: data.releaseYear?.toString() || "",
          ageRating: data.ageRating || "",
          isFeatured: data.isFeatured || false,
          isTrending: data.isTrending || false,
          isPublished: !data.isDraft,
        });

        if (data.coverImage) setCoverPreview(data.coverImage);
        if (data.genres) setSelectedGenres(data.genres);
        if (data.tags) setTags(data.tags);

      } catch (error) {
        toast.error("Failed to load manga data");
        window.location.href = "/admin/manga";
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [id, reset, router]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
      setCoverFile(file);
    };
    reader.readAsDataURL(file);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  const uploadImage = (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const sigRes = await fetch("/api/upload/signature?folder=hentaiplus/covers");
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp);
        formData.append("api_key", apiKey);
        formData.append("folder", "hentaiplus/covers");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            reject(new Error("Failed to upload image"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
  };

  const onSubmit = async (data: EditMangaFormValues) => {
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      let coverUrl = coverPreview;
      if (coverFile) {
        toast.loading("Uploading new cover image...", { id: "upload" });
        coverUrl = await uploadImage(coverFile);
      }
      
      toast.loading("Saving changes...", { id: "upload" });
      const payload = {
        ...data,
        isDraft: !data.isPublished,
        releaseYear: data.releaseYear ? parseInt(data.releaseYear) : null,
        coverImage: coverUrl,
        genres: selectedGenres,
        tags: tags,
      };

      const response = await fetch(`/api/admin/manga/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to update manga", { id: "upload" });
        return;
      }

      toast.success("Manga updated successfully!", { id: "upload" });
      window.location.href = "/admin/manga";
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred", { id: "upload" });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Edit Manga</h1>
          <p className="text-[var(--text-muted)] mt-1">Update manga details in the database.</p>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/25"
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cover Upload */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="relative aspect-[2/3] w-full max-w-[280px] mx-auto rounded-xl overflow-hidden border-2 border-dashed border-[var(--border)] bg-[var(--bg-card-2)] hover:border-[var(--primary)] transition-colors group cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                      <UploadCloud className="w-8 h-8 text-white mb-2" />
                      <span className="text-sm font-medium text-white">Click to Replace</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-base)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-8 h-8 text-[var(--primary)]" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">Drag & Drop Image</p>
                    <p className="text-xs text-[var(--text-muted)]">or click to browse</p>
                  </div>
                )}
                <input 
                  id="cover-upload" 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4 w-full max-w-[280px] mx-auto">
                  <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--primary)] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-2 text-[var(--text-muted)]">{uploadProgress}% Uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Visibility & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Publish Directly</p>
                  <p className="text-xs text-[var(--text-muted)]">Make visible immediately</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setValue("isPublished", e.target.checked)}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Featured</p>
                  <p className="text-xs text-[var(--text-muted)]">Show in hero banner</p>
                </div>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setValue("isFeatured", e.target.checked)}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Trending</p>
                  <p className="text-xs text-[var(--text-muted)]">Show in trending section</p>
                </div>
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setValue("isTrending", e.target.checked)}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Manga Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Title <span className="text-red-500">*</span></label>
                  <Input {...register("title")} className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]" />
                  {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Alternative Titles</label>
                  <Input {...register("alternativeTitles")} placeholder="Separated by commas" className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Author</label>
                  <Input {...register("author")} className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Artist</label>
                  <Input {...register("artist")} className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Description</label>
                <Textarea {...register("synopsis")} className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)] min-h-[120px]" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Status</label>
                  <Select value={status} onValueChange={(v) => setValue("status", v as "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED")}>
                    <SelectTrigger className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="HIATUS">Hiatus</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Release Year</label>
                  <Input {...register("releaseYear")} type="number" placeholder="2023" className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Age Rating</label>
                  <Input {...register("ageRating")} placeholder="18+" className="bg-[var(--bg-base)] border-[var(--border)] focus:border-[var(--primary)]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Taxonomy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Genres (Multi-select)</label>
                <div className="flex flex-wrap gap-2 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl min-h-[100px] max-h-[200px] overflow-y-auto">
                  {genres.length > 0 ? (
                    genres.map((genre) => (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleGenre(genre.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          selectedGenres.includes(genre.id)
                            ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                            : "bg-[var(--bg-card-2)] border-[var(--border)] text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {genre.name}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">No genres found. Add genres in taxonomy settings.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Tags</label>
                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-2 flex flex-wrap gap-2 items-center focus-within:border-[var(--primary)] transition-colors">
                  {tags.map((tag) => (
                    <div key={tag} className="flex items-center gap-1 bg-[var(--bg-card-2)] border border-[var(--border)] px-2 py-1 rounded-md text-sm text-white">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="Type a tag and press Enter"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white min-w-[150px] p-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
