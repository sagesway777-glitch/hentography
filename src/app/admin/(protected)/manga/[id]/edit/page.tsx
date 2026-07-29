"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

const editMangaSchema = z.object({
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

type EditMangaFormValues = z.infer<typeof editMangaSchema>;

export default function AdminMangaEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
      language: "Japanese",
      isDraft: false,
      isFeatured: false,
    },
  });

  const isDraft = watch("isDraft");
  const isFeatured = watch("isFeatured");
  const status = watch("status");

  useEffect(() => {
    const fetchManga = async () => {
      try {
        const res = await fetch(`/api/admin/manga/${id}`);
        if (!res.ok) throw new Error("Failed to fetch manga");
        const data = await res.json();
        reset({
          title: data.title || "",
          alternativeTitles: data.alternativeTitles || "",
          synopsis: data.synopsis || "",
          status: data.status || "ONGOING",
          releaseYear: data.releaseYear?.toString() || "",
          language: data.language || "Japanese",
          demographic: data.demographic || "",
          ageRating: data.ageRating || "",
          isFeatured: data.isFeatured || false,
          isDraft: data.isDraft || false,
        });
      } catch (error) {
        toast.error("Failed to load manga data");
        router.push("/admin/manga");
      } finally {
        setIsFetching(false);
      }
    };
    fetchManga();
  }, [id, reset, router]);

  const onSubmit = async (data: EditMangaFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        releaseYear: data.releaseYear ? parseInt(data.releaseYear) : null,
      };

      const response = await fetch(`/api/admin/manga/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to update manga");
        return;
      }

      toast.success("Manga updated successfully!");
      router.push("/admin/manga");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Edit Manga</h1>
        <p className="text-slate-400 mt-1">Update manga details in the database.</p>
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
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
