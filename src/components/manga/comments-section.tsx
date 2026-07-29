"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Heart, Flag, MoreVertical, Reply, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CommentsSectionProps {
  mangaId: string;
}

export function CommentsSection({ mangaId }: CommentsSectionProps) {
  const { isSignedIn, userId } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [mangaId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?mangaId=${mangaId}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out replies, as they are nested inside top-level comments
        setComments(data.data.filter((c: any) => !c.parentId));
      }
    } catch (error) {
      console.error("Failed to load comments", error);
    }
  };

  const handleSubmit = async (parentId: string | null = null) => {
    if (!isSignedIn) {
      toast.error("Please login to comment");
      return;
    }

    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId, content, parentId }),
      });

      if (res.ok) {
        toast.success("Comment posted!");
        if (parentId) {
          setReplyContent("");
          setReplyingTo(null);
        } else {
          setNewComment("");
        }
        fetchComments();
      } else {
        toast.error("Failed to post comment");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!isSignedIn) {
      toast.error("Please login to like");
      return;
    }
    try {
      await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      fetchComments(); // Reload to get updated likes
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Comment deleted");
        fetchComments();
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: any, isReply?: boolean }) => {
    const isLiked = comment.likes?.some((l: any) => l.user?.clerkId === userId);
    const isOwner = comment.user?.clerkId === userId;

    return (
      <div className={`flex gap-3 ${isReply ? "mt-3" : "mt-6"}`}>
        <Avatar className="w-10 h-10 border-slate-800 border">
          <AvatarImage src={comment.user.image} />
          <AvatarFallback>{comment.user.name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-slate-900/50 rounded-2xl rounded-tl-none p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200 text-sm">{comment.user.name}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-3 h-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 bg-slate-900 border-slate-800">
                    <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Report</DropdownMenuItem>
                    {isOwner && (
                      <DropdownMenuItem className="text-red-400 focus:bg-slate-800 focus:text-red-300" onClick={() => handleDelete(comment.id)}>
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
          
          <div className="flex items-center gap-4 mt-2 ml-2">
            <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isLiked ? "text-rose-500" : "text-slate-400 hover:text-slate-300"}`}>
              <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500" : ""}`} />
              <span>{comment.likes?.length || 0}</span>
            </button>
            {!isReply && (
              <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors">
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {replyingTo === comment.id && !isReply && (
            <div className="mt-3 flex gap-3">
              <CornerDownRight className="w-5 h-5 text-slate-600 mt-2 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <Textarea 
                  value={replyContent} 
                  onChange={(e) => setReplyContent(e.target.value)} 
                  placeholder="Write a reply..." 
                  className="bg-slate-900 border-slate-800 min-h-[80px]" 
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSubmit(comment.id)} disabled={isSubmitting}>Reply</Button>
                </div>
              </div>
            </div>
          )}

          {comment.replies?.length > 0 && (
            <div className="pl-4 border-l-2 border-slate-800 mt-2 space-y-4">
              {comment.replies.map((reply: any) => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        <h3 className="text-xl font-bold text-white">Comments ({comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)})</h3>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        {isSignedIn ? (
          <>
            <Textarea 
              placeholder="What are your thoughts?" 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)}
              className="bg-slate-950 border-slate-700 focus:border-indigo-500 transition-colors min-h-[100px]" 
            />
            <div className="flex justify-end">
              <Button onClick={() => handleSubmit(null)} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                Post Comment
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-400 mb-4">You must be logged in to post a comment.</p>
            <Button onClick={() => window.location.href = '/login'} variant="outline" className="border-slate-700">
              Log In
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2 mt-8">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-slate-500">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
