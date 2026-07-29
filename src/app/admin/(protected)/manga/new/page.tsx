"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UploadCloud, ImageIcon, Plus } from "lucide-react";
import toast from "react-hot-toast";

const createMangaSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  alternativeTitles: z.string().optional(),
  synopsis: z.string().optional(),
  status: z.enum(["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"]),
  releaseYear: z.string().optional(),
  language: z.string().min(1, "Language is required"),
  demographic: z.string().optional(),
  ageRating: z.string().optional(),
  isFeatured: z.boolean(),
  isDraft: z.boolean(),
});

type CreateMangaFormValues = z.infer<typeof createMangaSchema>;

export default function AdminMangaCreatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMangaFormValues>({
    resolver: zodResolver(createMangaSchema),
    defaultValues: {
      status: "ONGOING",
      language: "Japanese",
      isDraft: true,
      isFeatured: false,
    },
  });

  const isDraft = watch("isDraft");
  const isFeatured = watch("isFeatured");
  const status = watch("status");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "cover" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "cover") {
        setCoverPreview(e.target?.result as string);
        setCoverFile(file);
      } else {
        setBannerPreview(e.target?.result as string);
        setBannerFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    // 1. Get signature
    const sigRes = await fetch(`/api/upload/signature?folder=${folder}`);
    if (!sigRes.ok) throw new Error("Failed to get upload signature");
    const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

    // 2. Upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("signature", signature);
    formData.append("timestamp", timestamp);
    formData.append("api_key", apiKey);
    formData.append("folder", folder);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) throw new Error("Failed to upload image");
    const data = await uploadRes.json();
    return data.secure_url;
  };

  const onSubmit = async (data: CreateMangaFormValues) => {
    if (!coverFile) {
      toast.error("Cover image is required");
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Upload cover
      toast.loading("Uploading cover image...", { id: "upload" });
      const coverUrl = await uploadImage(coverFile, "hentography/covers");
      
      // 2. Upload banner if exists
      let bannerUrl = "";
      if (bannerFile) {
        toast.loading("Uploading banner image...", { id: "upload" });
        bannerUrl = await uploadImage(bannerFile, "hentography/banners");
      }

      // 3. Create manga
      toast.loading("Creating manga entry...", { id: "upload" });
      
      const payload = {
        ...data,
        releaseYear: data.releaseYear ? parseInt(data.releaseYear) : null,
        coverImage: coverUrl,
        bannerImage: bannerUrl,
      };

      const response = await fetch("/api/admin/manga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to create manga", { id: "upload" });
        return;
      }

      toast.success("Manga created successfully!", { id: "upload" });
      router.push("/admin/manga");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred", { id: "upload" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Add New Manga</h1>
        <p className="text-slate-400 mt-1">Create a new manga entry in the database.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Title <span className="text-red-500">*</span></label>
                  <Input {...register("title")} className="bg-slate-950 border-slate-800" disabled={isLoading} />
                  {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Alternative Titles</label>
                  <Input {...register("alternativeTitles")} placeholder="Separated by commas" className="bg-slate-950 border-slate-800" disabled={isLoading} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Synopsis</label>
                  <Textarea {...register("synopsis")} className="bg-slate-950 border-slate-800 min-h-[150px]" disabled={isLoading} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Status</label>
                    <Select disabled={isLoading} value={status} onValueChange={(v) => setValue("status", v as any)}>
                      <SelectTrigger className="bg-slate-950 border-slate-800">
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
                    <Input {...register("releaseYear")} type="number" placeholder="e.g. 2023" className="bg-slate-950 border-slate-800" disabled={isLoading} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Demographic</label>
                    <Input {...register("demographic")} placeholder="e.g. Seinen" className="bg-slate-950 border-slate-800" disabled={isLoading} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Age Rating</label>
                    <Input {...register("ageRating")} placeholder="e.g. 18+" className="bg-slate-950 border-slate-800" disabled={isLoading} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Cover Image <span className="text-red-500">*</span></label>
                  <div 
                    className="border-2 border-dashed border-slate-700 rounded-lg p-1 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-slate-950 overflow-hidden relative group"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    {coverPreview ? (
                      <div className="aspect-[2/3] w-full relative">
                        <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover rounded-md" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-sm font-medium flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[2/3] w-full flex flex-col items-center justify-center text-slate-500 p-6">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">Click to upload cover</span>
                        <span className="text-xs mt-1 opacity-70">JPEG, PNG, WEBP (Max 5MB)</span>
                      </div>
                    )}
                  </div>
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "cover")} disabled={isLoading} />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Banner Image</label>
                  <div 
                    className="border-2 border-dashed border-slate-700 rounded-lg p-1 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-slate-950 overflow-hidden relative group"
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    {bannerPreview ? (
                      <div className="aspect-[16/9] w-full relative">
                        <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover rounded-md" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-sm font-medium flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[16/9] w-full flex flex-col items-center justify-center text-slate-500 p-4">
                        <ImageIcon className="w-6 h-6 mb-2 opacity-50" />
                        <span className="text-sm">Click to upload banner</span>
                      </div>
                    )}
                  </div>
                  <input id="banner-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "banner")} disabled={isLoading} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isDraft" 
                    checked={isDraft} 
                    onCheckedChange={(c: boolean | "indeterminate") => setValue("isDraft", !!c)} 
                    disabled={isLoading} 
                  />
                  <label htmlFor="isDraft" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                    Save as Draft
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isFeatured" 
                    checked={isFeatured} 
                    onCheckedChange={(c: boolean | "indeterminate") => setValue("isFeatured", !!c)} 
                    disabled={isLoading} 
                  />
                  <label htmlFor="isFeatured" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">
                    Feature on Homepage
                  </label>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {isDraft ? "Save Draft" : "Publish Manga"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
