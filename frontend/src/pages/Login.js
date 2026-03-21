import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Sun, Moon } from "lucide-react";
import { cn } from "../lib/utils";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [toggleKey, setToggleKey] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast.success("Welcome to Somvanshi CRM!");
      navigate("/dashboard");
    } else {
      toast.error(result.error);
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
    setToggleKey(k => k + 1);
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4 transition-colors duration-300",
      isDark ? "bg-[#09090c]" : "bg-slate-50"
    )}>

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className={cn(
          "fixed top-4 right-4 p-2 rounded-lg transition-all duration-200",
          isDark
            ? "text-white/40 hover:text-blue-400 hover:bg-blue-500/10 border border-white/[0.06] hover:border-blue-500/25"
            : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-gray-200"
        )}
      >
        <span key={toggleKey} className="theme-icon-enter block">
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </span>
      </button>

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://customer-assets.emergentagent.com/job_somvanshi-sales/artifacts/967iq83j_Somvanshi%20Technologies%20India.png"
            alt="Somvanshi Technologies"
            className="h-36 mx-auto mb-5"
          />
          <h1 className={cn(
            "text-3xl font-bold font-['Plus_Jakarta_Sans']",
            isDark ? "text-white" : "text-slate-900"
          )}>
            Somvanshi CRM
          </h1>
          <p className={cn("mt-2 text-sm", isDark ? "text-white/40" : "text-slate-500")}>
            Sales Pipeline Management System
          </p>
        </div>

        {/* Card */}
        <div className={cn(
          "rounded-xl border p-8",
          isDark
            ? "bg-[#0e0e15] border-white/[0.07] shadow-[0_8px_64px_rgba(0,0,0,0.8)]"
            : "bg-white border-slate-200 shadow-lg"
        )}>
          <div className="mb-6">
            <h2 className={cn("text-xl font-semibold font-['Plus_Jakarta_Sans']", isDark ? "text-white" : "text-slate-900")}>
              Sign in
            </h2>
            <p className={cn("text-sm mt-1", isDark ? "text-white/40" : "text-slate-500")}>
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className={isDark ? "text-white/60 text-xs font-semibold uppercase tracking-wider" : ""}>
                Email
              </Label>
              <div className="relative">
                <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-white/25" : "text-slate-400")} />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "pl-10",
                    isDark && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  )}
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className={isDark ? "text-white/60 text-xs font-semibold uppercase tracking-wider" : ""}>
                Password
              </Label>
              <div className="relative">
                <Lock className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-white/25" : "text-slate-400")} />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "pl-10",
                    isDark && "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  )}
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full font-semibold transition-all duration-200",
                isDark
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.25)] hover:shadow-[0_0_32px_rgba(59,130,246,0.4)] border-0"
                  : "bg-slate-900 hover:bg-slate-800"
              )}
              disabled={loading}
              data-testid="login-btn"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Team members */}
          <div className={cn("mt-7 pt-6 border-t", isDark ? "border-white/[0.06]" : "border-slate-200")}>
            <p className={cn("text-xs font-semibold uppercase tracking-wider text-center mb-4", isDark ? "text-white/30" : "text-slate-400")}>
              Team Members
            </p>
            <div className="space-y-2.5">
              {[
                { name: "Ameya Somvanshi",  email: "ameya@somvanshi.tech" },
                { name: "Rajdeep Ghai",     email: "rajdeep@somvanshi.tech" },
                { name: "Ishaan Nair",      email: "ishaan@somvanshi.tech" },
                { name: "Bhargavi M.",      email: "bhargavi@somvanshi.tech" },
              ].map(({ name, email: em }) => (
                <div
                  key={em}
                  className={cn(
                    "flex justify-between items-center text-sm px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150",
                    isDark
                      ? "text-white/50 hover:text-white hover:bg-blue-500/[0.07] border border-transparent hover:border-blue-500/20"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                  onClick={() => setEmail(em)}
                >
                  <span className={isDark ? "font-medium text-white/65" : "font-medium"}>{name}</span>
                  <span className={isDark ? "text-white/30 text-xs font-mono" : "text-slate-400 text-xs"}>{em}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className={cn("text-center text-xs mt-6", isDark ? "text-white/20" : "text-slate-400")}>
          &copy; 2024 Somvanshi Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
};
