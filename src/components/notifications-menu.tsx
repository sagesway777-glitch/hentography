"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, BookOpen, MessageSquare, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data);
        setUnreadCount(data.meta.unreadCount);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "NEW_CHAPTER": return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case "NEW_COMMENT": return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "NEW_REPLY": return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "SYSTEM": return <Star className="w-4 h-4 text-amber-400" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => { if (open && unreadCount > 0) markAllAsRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-slate-900 border-slate-800 p-0 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && <Badge variant="secondary">{unreadCount} New</Badge>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className={`p-4 border-b border-slate-800/50 cursor-pointer focus:bg-slate-800 flex items-start gap-3 rounded-none ${!notification.isRead ? "bg-indigo-500/5" : ""}`} asChild>
                <Link href={notification.link || "#"}>
                  <div className="mt-1 bg-slate-800 p-2 rounded-full">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-200">{notification.title}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-slate-500 mt-2">{formatDistanceToNow(new Date(notification.createdAt))} ago</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              No notifications yet.
            </div>
          )}
        </div>
        <div className="p-2 border-t border-slate-800">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full text-xs text-indigo-400">View All</Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
