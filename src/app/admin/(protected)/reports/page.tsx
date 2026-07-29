"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flag, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success(`Report marked as ${status}`);
        fetchReports();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports Queue</h1>
          <p className="text-slate-400 mt-1">Review and moderate user reports.</p>
        </div>
        <div className="flex gap-2">
          {["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter !== status ? "border-slate-700 text-slate-300" : ""}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
            <p>No reports found in this category.</p>
          </div>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="glass-card border-slate-800">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        {report.type}
                      </Badge>
                      <span className="text-sm font-medium text-slate-300">Reason: {report.reason}</span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 mb-4">
                      {report.details && (
                        <p className="text-sm text-slate-400 mb-3 whitespace-pre-wrap">"{report.details}"</p>
                      )}
                      
                      <div className="text-sm border-t border-slate-800/50 pt-3 mt-3">
                        <span className="text-slate-500 block mb-1">Target Context:</span>
                        {report.manga && (
                          <div className="text-slate-300">Manga: <span className="font-semibold">{report.manga.title}</span></div>
                        )}
                        {report.comment && (
                          <div className="text-slate-300">Comment: <span className="italic text-slate-400">"{report.comment.content}"</span></div>
                        )}
                        {report.review && (
                          <div className="text-slate-300">Review: <span className="font-semibold">{report.review.title}</span></div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Reported by:</span>
                      <Avatar className="w-5 h-5 border border-slate-700">
                        <AvatarImage src={report.user.image} />
                        <AvatarFallback>{report.user.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-slate-300">{report.user.name}</span>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 justify-end">
                    {report.status === "PENDING" && (
                      <Button size="sm" variant="outline" className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10" onClick={() => handleUpdateStatus(report.id, "REVIEWED")}>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Mark Reviewed
                      </Button>
                    )}
                    {report.status !== "RESOLVED" && (
                      <Button size="sm" variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleUpdateStatus(report.id, "RESOLVED")}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve (Action Taken)
                      </Button>
                    )}
                    {report.status !== "DISMISSED" && (
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:bg-slate-800" onClick={() => handleUpdateStatus(report.id, "DISMISSED")}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Dismiss (No Action)
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
