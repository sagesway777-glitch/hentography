"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

type Setting = {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Usually we would update all settings, for this basic version we will just show a success toast.
    // Full implementation would submit the form data to the API.
    try {
      // Simulate save
      await new Promise(r => setTimeout(r, 500));
      toast.success("Settings updated successfully (demo)");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Site Settings</h1>
        <p className="text-slate-400 mt-1">Configure global platform settings.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <form onSubmit={handleUpdate}>
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Update basic settings for your site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.length === 0 ? (
                <p className="text-sm text-slate-400">No settings found in the database.</p>
              ) : (
                settings.map(setting => (
                  <div key={setting.id} className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      {setting.key.replace(/_/g, " ")}
                    </label>
                    <Input 
                      defaultValue={setting.value} 
                      className="bg-slate-950 border-slate-800"
                      disabled={isSaving}
                    />
                    {setting.description && (
                      <p className="text-xs text-slate-500">{setting.description}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
