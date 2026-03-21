import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getInitials } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  User, Lock, Camera, CheckCircle2, Loader2, Eye, EyeOff, Upload, X,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BRAND   = "#1978B8";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const Settings = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  // ── Profile state ─────────────────────────────────────────────────────
  const [name, setName]               = useState(user?.name || "");
  const [avatarFile, setAvatarFile]   = useState(null);   // File object
  const [previewSrc, setPreviewSrc]   = useState(null);   // blob URL for local preview
  const [profileSaving, setProfileSaving] = useState(false);

  // Revoke object URL when component unmounts or file changes
  useEffect(() => {
    return () => { if (previewSrc?.startsWith("blob:")) URL.revokeObjectURL(previewSrc); };
  }, [previewSrc]);

  // ── Password state ────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd]     = useState("");
  const [newPwd, setNewPwd]             = useState("");
  const [confirmPwd, setConfirmPwd]     = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd]     = useState(false);
  const [pwdSaving, setPwdSaving]       = useState(false);

  // ── File selection ────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP or GIF images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_SIZE_MB} MB`);
      return;
    }

    // Revoke previous blob URL to free memory
    if (previewSrc?.startsWith("blob:")) URL.revokeObjectURL(previewSrc);

    setAvatarFile(file);
    setPreviewSrc(URL.createObjectURL(file));
    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";
  };

  const handleClearFile = () => {
    if (previewSrc?.startsWith("blob:")) URL.revokeObjectURL(previewSrc);
    setAvatarFile(null);
    setPreviewSrc(null);
  };

  // ── Profile save ─────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }

    setProfileSaving(true);
    try {
      // 1. Upload new photo first if one was selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await axios.post(`${API_URL}/api/users/me/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setAvatarFile(null);
        setPreviewSrc(null);
      }

      // 2. Update name (always, even if just the name changed)
      await axios.put(`${API_URL}/api/users/me`, { name: name.trim() });

      // 3. Refresh user context so sidebar/header reflects changes immediately
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Password save ─────────────────────────────────────────────────────
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPwd !== confirmPwd) { toast.error("New passwords do not match"); return; }
    if (newPwd.length < 6)    { toast.error("New password must be at least 6 characters"); return; }

    setPwdSaving(true);
    try {
      await axios.put(`${API_URL}/api/users/me/password`, {
        current_password: currentPwd,
        new_password: newPwd,
      });
      toast.success("Password changed successfully");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally {
      setPwdSaving(false);
    }
  };

  // Displayed avatar: local preview > current saved photo > initials fallback
  const displaySrc = previewSrc || user?.avatar_url || null;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account profile and security</p>
      </div>

      {/* ── Profile card ─────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white" style={{ borderTop: `3px solid ${BRAND}` }}>
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={16} style={{ color: BRAND }} />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleProfileSave} className="space-y-6">

            {/* ── Avatar upload area ─────────────────────────────────── */}
            <div className="flex items-start gap-6">

              {/* Avatar with camera overlay */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-[#C5DFF0]">
                    <AvatarImage src={displaySrc} className="object-cover" />
                    <AvatarFallback
                      className="text-2xl font-bold text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      {getInitials(name || user?.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Click-to-upload overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title="Upload photo"
                  >
                    <Camera size={18} className="text-white" />
                    <span className="text-white text-[10px] font-semibold">Upload</span>
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium hover:underline"
                  style={{ color: BRAND }}
                >
                  Change photo
                </button>
              </div>

              {/* Right side: file info + name */}
              <div className="flex-1 space-y-4 min-w-0">

                {/* Selected file indicator */}
                {avatarFile ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#EBF5FB] border border-[#C5DFF0]">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: BRAND }}
                    >
                      <Upload size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{avatarFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(avatarFile.size / 1024).toFixed(0)} KB · Ready to upload
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                      title="Remove selected file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed border-gray-200 hover:border-[#1978B8] hover:bg-[#EBF5FB] cursor-pointer transition-colors"
                  >
                    <Upload size={16} className="text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">
                        Click to upload a photo
                      </p>
                      <p className="text-xs text-gray-400">JPEG, PNG, WebP or GIF · Max 5 MB</p>
                    </div>
                  </div>
                )}

                {/* Name field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="border-gray-200 focus:border-[#1978B8]"
                  />
                </div>
              </div>
            </div>

            {/* ── Read-only info ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</Label>
                <div className="flex items-center h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-500 truncate">
                  {user?.email}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</Label>
                <div className="flex items-center h-9 px-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Badge className="text-xs font-semibold text-white capitalize" style={{ backgroundColor: BRAND }}>
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1 border-t border-gray-100">
              <Button
                type="submit"
                disabled={profileSaving}
                className="gap-2 text-white px-6"
                style={{ backgroundColor: BRAND }}
              >
                {profileSaving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Password card ────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Lock size={16} className="text-gray-500" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPwd ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="border-gray-200 focus:border-[#1978B8] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="border-gray-200 focus:border-[#1978B8] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Repeat new password"
                  className={`border-gray-200 focus:border-[#1978B8] ${
                    confirmPwd && newPwd !== confirmPwd ? "border-red-300" : ""
                  }`}
                />
                {confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1 border-t border-gray-100">
              <Button
                type="submit"
                variant="outline"
                disabled={pwdSaving}
                className="gap-2 px-6 border-gray-300 hover:bg-gray-50"
              >
                {pwdSaving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Lock className="h-4 w-4" />
                }
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
