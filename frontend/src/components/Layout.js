import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "../context/AuthContext";
import { cn, getInitials } from "../lib/utils";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Activity,
  Calendar,
  FileText,
  Trophy,
  Flame,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Menu,
  ClipboardList,
  UserCog,
  Sun,
  Moon,
} from "lucide-react";
import { NotificationPanel } from "./NotificationPanel";

const BRAND = "#1978B8";
const BRAND_DARK = "#3b82f6";

const navItems = [
  { path: "/dashboard",    label: "Dashboard",       icon: LayoutDashboard },
  { path: "/leads",        label: "Leads",            icon: Users },
  { path: "/pipeline",     label: "Pipeline",         icon: Kanban },
  { path: "/activities",   label: "Activities",       icon: Activity },
  { path: "/meetings",     label: "Meetings",         icon: Calendar },
  { path: "/reports",      label: "Reports",          icon: FileText },
  { path: "/daily-report", label: "Daily Report",     icon: ClipboardList },
  { path: "/team",         label: "Team Performance", icon: Trophy,   adminOnly: true },
  { path: "/users",        label: "User Management",  icon: UserCog,  adminOnly: true },
  { path: "/levels",       label: "Levels & XP",      icon: Flame },
  { path: "/settings",     label: "Settings",         icon: Settings },
];

export const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toggleKey, setToggleKey] = useState(0);

  const handleLogout = () => { logout(); navigate("/login"); };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
    setToggleKey(k => k + 1);
  };

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const currentPageLabel =
    filteredNavItems.find((i) => i.path === location.pathname)?.label ||
    navItems.find((i) => i.path === location.pathname)?.label ||
    "Dashboard";

  const brand = isDark ? BRAND_DARK : BRAND;

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isDark ? "bg-[#09090c]" : "bg-[#F8FAFC]"
    )}>

      {/* ── Mobile Header ──────────────────────────────────────────── */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4",
        isDark
          ? "bg-[#0e0e15] border-b border-white/[0.06]"
          : "bg-white border-b border-gray-200 shadow-sm"
      )}>
        <Button
          variant="ghost" size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={isDark ? "text-white/60 hover:text-white hover:bg-white/[0.05]" : "text-gray-600"}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <img
          src="https://customer-assets.emergentagent.com/job_somvanshi-sales/artifacts/967iq83j_Somvanshi%20Technologies%20India.png"
          alt="Somvanshi Technologies"
          className="h-10"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            onClick={toggleTheme}
            className={isDark
              ? "text-white/60 hover:text-white hover:bg-white/[0.05]"
              : "text-gray-600 hover:bg-gray-100"}
          >
            <span key={toggleKey} className="theme-icon-enter">
              {isDark ? <Sun className="h-4.5 w-4.5" size={18} /> : <Moon className="h-4.5 w-4.5" size={18} />}
            </span>
          </Button>
          <Button
            variant="ghost" size="icon"
            className={isDark ? "text-white/60 hover:text-white hover:bg-white/[0.05]" : "text-gray-600"}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isDark
          ? "bg-[#0e0e15] border-r border-white/[0.06]"
          : "bg-white border-r border-gray-200 shadow-sm"
      )}>

        {/* Logo area */}
        <div
          className={cn(
            "flex items-center justify-between flex-shrink-0",
            collapsed ? "h-16 px-3 justify-center" : "h-16 px-4",
            isDark ? "border-b border-white/[0.06]" : "border-b border-gray-100"
          )}
          style={{ borderTop: `2px solid ${brand}` }}
        >
          {!collapsed && (
            <img
              src="https://customer-assets.emergentagent.com/job_somvanshi-sales/artifacts/967iq83j_Somvanshi%20Technologies%20India.png"
              alt="Somvanshi Technologies"
              className="h-10 object-contain"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden lg:flex flex-shrink-0",
              isDark
                ? "text-white/30 hover:text-white/80 hover:bg-white/[0.05]"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                  isActive
                    ? "font-semibold shadow-sm"
                    : isDark
                      ? "text-white/50 hover:text-white hover:bg-white/[0.05]"
                      : "text-gray-600 hover:bg-[#EBF5FB] hover:text-[#1978B8]"
                )}
                style={isActive ? {
                  backgroundColor: isDark ? "rgba(59,130,246,0.15)" : BRAND,
                  color: isDark ? "#3b82f6" : "white",
                  boxShadow: isDark ? "inset 0 0 0 1px rgba(59,130,246,0.3)" : undefined,
                } : {}}
              >
                <Icon
                  className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")}
                  size={18}
                  style={isActive ? { color: isDark ? "#3b82f6" : "white" } : {}}
                />
                {!collapsed && (
                  <span className="text-sm truncate">{item.label}</span>
                )}
                {/* Active indicator bar */}
                {isActive && !collapsed && isDark && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className={cn(
          "flex-shrink-0 p-2",
          isDark ? "border-t border-white/[0.06]" : "border-t border-gray-100"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto py-2 rounded-lg",
                  collapsed ? "px-2 justify-center" : "px-3 justify-start gap-3",
                  isDark
                    ? "text-white/70 hover:text-white hover:bg-white/[0.05]"
                    : "hover:bg-[#EBF5FB]"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback
                    className="text-xs font-semibold text-white"
                    style={{ backgroundColor: brand }}
                  >
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start min-w-0">
                    <span className={cn(
                      "text-sm font-semibold truncate max-w-[140px]",
                      isDark ? "text-white/90" : "text-gray-800"
                    )}>
                      {user?.name}
                    </span>
                    <span className="text-xs font-medium capitalize" style={{ color: brand }}>
                      {user?.role}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn(
              "w-52",
              isDark && "bg-[#121219] border-white/[0.07] shadow-2xl"
            )}>
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className={cn("cursor-pointer", isDark && "text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05]")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className={isDark ? "bg-white/[0.06]" : ""} />
              <DropdownMenuItem
                onClick={handleLogout}
                className={cn(isDark ? "text-red-400 focus:text-red-400 focus:bg-red-500/10" : "text-rose-600 focus:text-rose-600")}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className={cn("lg:hidden fixed inset-0 z-30", isDark ? "bg-black/70" : "bg-black/40")}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className={cn("transition-all duration-300 pt-14 lg:pt-0", collapsed ? "lg:ml-16" : "lg:ml-64")}>

        {/* Desktop Header */}
        <header className={cn(
          "hidden lg:flex h-14 items-center justify-between px-6",
          isDark
            ? "bg-[#0e0e15] border-b border-white/[0.06]"
            : "bg-white border-b border-gray-200 shadow-sm"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: brand }} />
            <h1 className={cn(
              "text-base font-semibold tracking-tight",
              isDark ? "text-white/90" : "text-gray-900"
            )}>
              {currentPageLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* User pill */}
            <div className={cn(
              "flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 border",
              isDark
                ? "bg-white/[0.03] border-white/[0.07] text-white/70"
                : "bg-gray-50 border-gray-200 text-gray-500"
            )}>
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="text-xs text-white" style={{ backgroundColor: brand }}>
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className={cn("font-medium", isDark ? "text-white/80" : "text-gray-700")}>
                {user?.name}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded font-semibold text-white"
                style={{ backgroundColor: brand }}
              >
                {user?.role?.toUpperCase()}
              </span>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={cn(
                "relative transition-all duration-200",
                isDark
                  ? "text-white/50 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20"
                  : "text-gray-500 hover:text-[#1978B8] hover:bg-[#EBF5FB]"
              )}
            >
              <span key={toggleKey} className="theme-icon-enter">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative transition-all duration-200",
                isDark
                  ? "text-white/50 hover:text-white hover:bg-white/[0.05]"
                  : "text-gray-500 hover:text-[#1978B8] hover:bg-[#EBF5FB]"
              )}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className={cn("p-4 lg:p-6", isDark ? "text-white/90" : "text-gray-900")}>
          {children}
        </div>
      </main>

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};
