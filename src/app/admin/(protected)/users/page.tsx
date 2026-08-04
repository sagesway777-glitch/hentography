"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Shield, Ban, CheckCircle, UserX } from "lucide-react";
import toast from "react-hot-toast";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  createdAt: string | Date;
}
interface UserUpdates {
  role?: string;
  status?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUsers(data.data);
        }
      } catch {
        toast.error("Failed to fetch users");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = () => {
    setLoading(true);
    void fetchUsers();
  };

  const handleUpdate = async (id: string, updates: UserUpdates) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        toast.success("User updated");
        fetchUsers();
      } else {
        toast.error("Update failed");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="text-slate-400 mt-1">Manage users, roles, and bans.</p>
      </div>

      <Card className="glass-card border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Users</CardTitle>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Search users..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-64 bg-slate-900 border-slate-700" 
            />
            <Button onClick={handleSearch} variant="secondary"><Search className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8">No users found.</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-slate-700">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-white">{user.name || "Unknown"}</div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={user.role === "ADMIN" ? "default" : user.role === "MODERATOR" ? "secondary" : "outline"} className="text-[10px]">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"} className="text-[10px]">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {user.role === "USER" ? (
                            <Button size="sm" variant="outline" className="border-slate-700" onClick={() => handleUpdate(user.id, { role: "MODERATOR" })} title="Make Moderator">
                              <Shield className="w-4 h-4 text-indigo-400" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="border-slate-700" onClick={() => handleUpdate(user.id, { role: "USER" })} title="Demote to User">
                              <UserX className="w-4 h-4 text-slate-400" />
                            </Button>
                          )}

                          {user.status === "ACTIVE" ? (
                            <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => handleUpdate(user.id, { status: "BANNED" })} title="Ban User">
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleUpdate(user.id, { status: "ACTIVE" })} title="Unban User">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
