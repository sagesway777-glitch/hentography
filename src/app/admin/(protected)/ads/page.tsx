"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Megaphone, Activity, MousePointerClick } from "lucide-react";
import toast from "react-hot-toast";

interface Ad {
  id: string;
  name: string;
  type: string;
  position: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  priority: number;
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("BANNER");
  const [position, setPosition] = useState("HOME_HERO");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [priority, setPriority] = useState(0);

  const fetchAds = async () => {
    try {
      const res = await fetch("/api/admin/ads");
      if (res.ok) {
        const data = await res.json();
        setAds(data.data);
      }
    } catch {
      toast.error("Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadAds = async () => {
      try {
        const res = await fetch("/api/admin/ads");
        if (res.ok) {
          const data = await res.json();
          if (mounted) setAds(data.data);
        }
      } catch {
        toast.error("Failed to load ads");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadAds();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, type, position, content, imageUrl, linkUrl, priority: Number(priority), isActive: true, isDraft: false
        })
      });

      if (res.ok) {
        toast.success("Ad created successfully");
        setShowForm(false);
        fetchAds();
        // Reset form
        setName(""); setContent(""); setImageUrl(""); setLinkUrl(""); setPriority(0);
      } else {
        toast.error("Failed to create ad");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    try {
      const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Ad deleted");
        fetchAds();
      }
    } catch (error) {
      toast.error("Failed to delete ad");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        toast.success("Status updated");
        fetchAds();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Advertisements</h1>
          <p className="text-slate-400 mt-1">Manage ad placements across the platform.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Create Ad"}
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-slate-800">
          <CardHeader>
            <CardTitle>Create New Advertisement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Campaign Name</label>
                  <Input required value={name} onChange={e => setName(e.target.value)} className="bg-slate-900 border-slate-700" placeholder="e.g., Summer Sale 2026" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Ad Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100">
                    <option value="BANNER">Banner Image</option>
                    <option value="CUSTOM_HTML">Custom HTML</option>
                    <option value="GOOGLE_ADSENSE">Google AdSense</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Position</label>
                  <select value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100">
                    <option value="HOME_HERO">Home Hero</option>
                    <option value="MANGA_TOP">Manga Detail Top</option>
                    <option value="READER_TOP">Reader Top</option>
                    <option value="READER_BOTTOM">Reader Bottom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Priority (Higher = Shows First)</label>
                  <Input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} className="bg-slate-900 border-slate-700" />
                </div>
              </div>

              {type === "BANNER" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Image URL</label>
                    <Input required value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="bg-slate-900 border-slate-700" placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Link URL (Destination)</label>
                    <Input required value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="bg-slate-900 border-slate-700" placeholder="https://..." />
                  </div>
                </div>
              )}

              {(type === "CUSTOM_HTML" || type === "GOOGLE_ADSENSE") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">HTML / Script Content</label>
                  <textarea required value={content} onChange={e => setContent(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-300" placeholder="<!-- HTML/Script here -->" />
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Save Advertisement</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading ads...</div>
        ) : ads.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No advertisements found. Create one to get started.</div>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id} className="glass-card border-slate-800">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{ad.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ad.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                        {ad.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1"><Megaphone className="w-4 h-4" /> {ad.position}</div>
                      <div className="flex items-center gap-1"><Activity className="w-4 h-4" /> {ad.impressions.toLocaleString()} Impressions</div>
                      <div className="flex items-center gap-1"><MousePointerClick className="w-4 h-4" /> {ad.clicks.toLocaleString()} Clicks</div>
                      {ad.impressions > 0 && (
                        <div className="flex items-center gap-1">CTR: {((ad.clicks / ad.impressions) * 100).toFixed(2)}%</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={() => toggleStatus(ad.id, ad.isActive)}>
                      {ad.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(ad.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
