import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getInitials, formatDate } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, RefreshCw, Loader2, ShieldCheck, User2,
  Mail, Calendar, Eye, EyeOff,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BRAND   = "#1978B8";

const ROLE_META = {
  admin: { label: "Admin",            color: "bg-amber-50 text-amber-700 border-amber-200" },
  sales: { label: "Sales Rep",        color: "bg-[#EBF5FB] text-[#1978B8] border-[#C5DFF0]" },
};

const emptyForm = { name: "", email: "", password: "", role: "sales", avatar_url: "" };

export const Users = () => {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Role change
  const [roleLoading, setRoleLoading] = useState({});

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/users`);
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // ── Add user ────────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setFormLoading(true);
    try {
      await axios.post(`${API_URL}/api/users`, {
        name:       form.name.trim(),
        email:      form.email.trim(),
        password:   form.password,
        role:       form.role,
        avatar_url: form.avatar_url.trim() || undefined,
      });
      toast.success(`${form.name} added successfully`);
      setShowAddDialog(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add user");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle role ─────────────────────────────────────────────────────────
  const handleRoleToggle = async (targetUser) => {
    const newRole = targetUser.role === "admin" ? "sales" : "admin";
    setRoleLoading((p) => ({ ...p, [targetUser.id]: true }));
    try {
      await axios.put(`${API_URL}/api/users/${targetUser.id}/role`, { role: newRole });
      toast.success(`${targetUser.name}'s role changed to ${newRole === "admin" ? "Admin" : "Sales Rep"}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change role");
    } finally {
      setRoleLoading((p) => ({ ...p, [targetUser.id]: false }));
    }
  };

  // ── Delete user ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_URL}/api/users/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name} removed successfully`);
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const admins = users.filter((u) => u.role === "admin");
  const salesReps = users.filter((u) => u.role === "sales");

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {users.length} users · {admins.length} admin{admins.length !== 1 ? "s" : ""} · {salesReps.length} sales rep{salesReps.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Add User Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <Plus size={16} style={{ color: BRAND }} />
                Add New User
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="border-gray-200 focus:border-[#1978B8]"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Email <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="priya@somvanshi.tech"
                    className="border-gray-200 focus:border-[#1978B8]"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="border-gray-200 focus:border-[#1978B8] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Rep</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Avatar URL
                  </Label>
                  <Input
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    placeholder="https://..."
                    className="border-gray-200 focus:border-[#1978B8]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} className="border-gray-200">
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading} className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Users Table ──────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F1F7FB] border-b-2 border-[#C5DFF0]">
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Email</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Joined</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    const isMe = u.id === me?.id;
                    const meta = ROLE_META[u.role] || ROLE_META.sales;
                    return (
                      <tr
                        key={u.id}
                        className={`border-b border-gray-50 hover:bg-[#F0F7FD] transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                      >
                        {/* User */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-gray-200">
                              <AvatarImage src={u.avatar_url} />
                              <AvatarFallback
                                className="text-xs font-bold text-white"
                                style={{ backgroundColor: BRAND }}
                              >
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {u.name}
                                {isMe && (
                                  <span className="ml-2 text-xs text-gray-400 font-normal">(you)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                            {u.email}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5 text-center">
                          <Badge className={`text-xs font-semibold border ${meta.color}`}>
                            {u.role === "admin"
                              ? <ShieldCheck size={11} className="mr-1 inline" />
                              : <User2 size={11} className="mr-1 inline" />
                            }
                            {meta.label}
                          </Badge>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3.5 text-gray-500 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            {formatDate(u.created_at)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            {/* Role toggle */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isMe || roleLoading[u.id]}
                              onClick={() => handleRoleToggle(u)}
                              className="h-8 gap-1.5 text-xs border-gray-200 hover:border-[#1978B8] hover:text-[#1978B8] disabled:opacity-40"
                              title={isMe ? "Cannot change your own role" : `Switch to ${u.role === "admin" ? "Sales Rep" : "Admin"}`}
                            >
                              {roleLoading[u.id]
                                ? <Loader2 size={12} className="animate-spin" />
                                : <RefreshCw size={12} />
                              }
                              {u.role === "admin" ? "→ Sales" : "→ Admin"}
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isMe}
                              onClick={() => {
                                setDeleteTarget(u);
                                setShowDeleteDialog(true);
                              }}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                              title={isMe ? "Cannot delete your own account" : "Remove user"}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center py-14 text-gray-400 text-sm">No users found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete confirmation dialog ────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-['Plus_Jakarta_Sans']">
              <Trash2 size={16} />
              Remove User
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 mt-2">
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-red-200">
                  <AvatarImage src={deleteTarget.avatar_url} />
                  <AvatarFallback className="text-sm font-bold text-white bg-red-400">
                    {getInitials(deleteTarget.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{deleteTarget.name}</p>
                  <p className="text-sm text-gray-500">{deleteTarget.email}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to remove this user? Their leads and activities will remain, but they will no longer be able to log in.
              </p>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading} className="border-gray-200">
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Remove User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
