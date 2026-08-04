"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Trash2, MessageSquare, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

interface AdminComment {
  id: string;
  content: string;
  isApproved: boolean;
  isHidden: boolean;
  createdAt: string | Date;
  user: { name: string | null; image: string | null; };
  manga: { title: string; };
}
interface CommentUpdates {
  isApproved?: boolean;
  isHidden?: boolean;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "hidden">("all");

  const fetchComments = async () => {
    let url = "/api/admin/comments";
    if (filter === "pending") url += "?isApproved=false";
    // For hidden we'd need another query param, keeping simple for now
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (filter === "hidden") {
          setComments(data.data.filter((c: AdminComment) => c.isHidden));
        } else {
          setComments(data.data);
        }
      }
    } catch (error) {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadComments = async () => {
      try {
        const res = await fetch(`/api/admin/comments?filter=${filter}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setComments(data.data);
        }
      } catch {
        toast.error("Failed to load comments");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadComments();

    return () => {
      mounted = false;
    };
  }, [filter]);

  const handleFilterChange = (newFilter: typeof filter) => {
    setLoading(true);
    setFilter(newFilter);
  };

  const handleUpdate = async (id: string, updates: CommentUpdates) => {
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        toast.success("Comment updated");
        fetchComments();
      } else {
        toast.error("Failed to update comment");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Comment deleted");
        fetchComments();
      }
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Comment Moderation</h1>
          <p className="text-slate-400 mt-1">Review and manage user comments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => handleFilterChange("all")} className={filter !== "all" ? "border-slate-700 text-slate-300" : ""}>All</Button>
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => handleFilterChange("pending")} className={filter !== "pending" ? "border-slate-700 text-slate-300" : ""}>Pending Approval</Button>
          <Button variant={filter === "hidden" ? "default" : "outline"} size="sm" onClick={() => handleFilterChange("hidden")} className={filter !== "hidden" ? "border-slate-700 text-slate-300" : ""}>Hidden</Button>
        </div>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle>Recent Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No comments found matching filter.</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={`p-4 rounded-lg border ${!comment.isApproved ? 'border-amber-500/30 bg-amber-500/5' : comment.isHidden ? 'border-slate-700 bg-slate-900' : 'border-slate-800/50 bg-slate-900/50'}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6 border border-slate-700">
                          <AvatarImage src={comment.user.image || undefined} />
                          <AvatarFallback>{comment.user.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-slate-200 text-sm">{comment.user.name}</span>
                        <span className="text-xs text-slate-500 mx-1">•</span>
                        <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                        {!comment.isApproved && <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Pending Approval</span>}
                        {comment.isHidden && <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>}
                      </div>
                      
                      <p className="text-slate-300 text-sm whitespace-pre-wrap pl-8 mb-2">
                        {comment.content}
                      </p>
                      
                      <div className="pl-8 text-xs text-slate-500 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Posted on: <span className="text-indigo-400 font-medium">{comment.manga.title}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:self-start">
                      {!comment.isApproved ? (
                        <Button size="sm" variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleUpdate(comment.id, { isApproved: true })}>
                          <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={() => handleUpdate(comment.id, { isApproved: false })}>
                          <XCircle className="w-4 h-4 mr-1.5" /> Unapprove
                        </Button>
                      )}
                      
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-400" onClick={() => handleUpdate(comment.id, { isHidden: !comment.isHidden })}>
                        <EyeOff className="w-4 h-4 mr-1.5" /> {comment.isHidden ? "Unhide" : "Hide"}
                      </Button>
                      
                      <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(comment.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
