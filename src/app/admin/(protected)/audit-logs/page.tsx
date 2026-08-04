"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldAlert, Edit, Trash, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string | Date;
  user: { name: string | null; image: string | null; };
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadLogs = async () => {
      try {
        const res = await fetch("/api/admin/audit-logs");
        if (res.ok) {
          const data = await res.json();
          if (mounted) setLogs(data.data);
        }
      } catch {
        toast.error("Failed to fetch audit logs");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadLogs();

    return () => {
      mounted = false;
    };
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return <Plus className="w-4 h-4 text-emerald-400" />;
    if (action.includes("UPDATE")) return <Edit className="w-4 h-4 text-blue-400" />;
    if (action.includes("DELETE")) return <Trash className="w-4 h-4 text-red-400" />;
    if (action.includes("BAN") || action.includes("SUSPEND")) return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400 mt-1">Track admin and moderator actions across the platform.</p>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No audit logs found.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <div className="mt-1 bg-slate-800 p-2 rounded-full flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{log.action}</span>
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">{log.entity}</Badge>
                      {log.entityId && (
                        <span className="text-xs text-slate-500 font-mono hidden sm:inline-block">ID: {log.entityId}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="w-5 h-5 border border-slate-700">
                        <AvatarImage src={log.user.image || undefined} />
                        <AvatarFallback>{log.user.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-slate-300">by <span className="font-medium text-indigo-400">{log.user.name}</span></span>
                      <span className="text-xs text-slate-500 mx-2">•</span>
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>

                    {(log.oldValues || log.newValues) && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-slate-950 rounded p-3 border border-slate-800 overflow-x-auto">
                        {log.oldValues && (
                          <div>
                            <div className="text-slate-500 mb-1 font-sans font-medium">Previous State:</div>
                            <pre className="text-slate-400 whitespace-pre-wrap">{JSON.stringify(log.oldValues, null, 2)}</pre>
                          </div>
                        )}
                        {log.newValues && (
                          <div>
                            <div className="text-slate-500 mb-1 font-sans font-medium">New State:</div>
                            <pre className="text-emerald-400/80 whitespace-pre-wrap">{JSON.stringify(log.newValues, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
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
