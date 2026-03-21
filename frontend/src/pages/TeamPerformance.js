import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { cn, formatCurrency, getInitials } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import {
  Users, TrendingUp, Target, Phone, Calendar, Trophy,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const TeamPerformance = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  const brand = isDark ? "#3b82f6" : "#1978B8";

  useEffect(() => { fetchPerformance(); }, []); // eslint-disable-line

  const fetchPerformance = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/performance`);
      setPerformance(response.data);
    } catch (error) {
      console.error("Failed to fetch performance:", error);
      toast.error("Failed to load team performance");
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue   = performance.reduce((sum, p) => sum + p.revenue_generated, 0);
  const totalLeads     = performance.reduce((sum, p) => sum + p.leads_added, 0);
  const totalDeals     = performance.reduce((sum, p) => sum + p.deals_closed, 0);
  const avgConversion  = performance.length > 0
    ? performance.reduce((sum, p) => sum + p.conversion_rate, 0) / performance.length
    : 0;

  const chartData = performance.map((p) => ({
    name:    p.user_name.split(" ")[0],
    leads:   p.leads_added,
    deals:   p.deals_closed,
    revenue: p.revenue_generated / 100000,
  }));

  // ── Dark-aware chart styles ─────────────────────────────────────────
  const tooltipStyle = isDark
    ? { background: "#121219", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", color: "#f8fafc", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }
    : { background: "white",   border: "1px solid #e2e8f0",               borderRadius: "8px", fontSize: "12px" };
  const axisColor = isDark ? "rgba(248,250,252,0.35)" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "#e2e8f0";

  // ── Shared class helpers ────────────────────────────────────────────
  const cardCls = cn("border", isDark ? "bg-[#0e0e15] border-white/[0.06]" : "border-gray-200");
  const headerBorderCls = isDark ? "border-white/[0.06]" : "";
  const titleCls = cn("font-semibold font-['Plus_Jakarta_Sans']", isDark ? "text-white/80" : "");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("h-32 rounded-lg animate-pulse", isDark ? "bg-white/[0.04]" : "bg-slate-100")} />
          ))}
        </div>
        <div className={cn("h-96 rounded-lg animate-pulse", isDark ? "bg-white/[0.04]" : "bg-slate-100")} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h2 className={cn("text-2xl font-bold font-['Plus_Jakarta_Sans']", isDark ? "text-white" : "text-gray-900")}>
          Team Performance
        </h2>
        <p className={cn("text-sm", isDark ? "text-white/40" : "text-gray-500")}>
          Monitor your sales team's performance and metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Team Size",      value: performance.length,          sub: "Active members",   icon: Users },
          { label: "Total Revenue",  value: formatCurrency(totalRevenue), sub: "All time",         icon: TrendingUp },
          { label: "Total Deals",    value: totalDeals,                   sub: "Closed won",       icon: Trophy },
          { label: "Avg Conversion", value: `${avgConversion.toFixed(1)}%`, sub: "Team average",  icon: Target },
        ].map(({ label, value, sub, icon: Icon }) => (
          <Card key={label} className={cardCls}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn("text-sm font-medium uppercase tracking-wider", isDark ? "text-white/40" : "text-gray-500")}>{label}</p>
                  <p className={cn("text-3xl font-bold mt-2 font-['Plus_Jakarta_Sans']", isDark ? "text-white" : "text-gray-900")}>{value}</p>
                  <p className={cn("text-sm mt-1", isDark ? "text-white/35" : "text-gray-500")}>{sub}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", isDark ? "bg-blue-500/10 ring-1 ring-blue-500/20" : "bg-[#EBF5FB]")}>
                  <Icon className={cn("h-6 w-6", isDark ? "text-blue-400" : "text-[#1978B8]")} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Chart */}
      <Card className={cardCls}>
        <CardHeader className={cn("border-b", headerBorderCls)}>
          <CardTitle className={titleCls}>Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => {
                      if (name === "revenue") return [`₹${(value * 100000).toLocaleString()}`, "Revenue"];
                      return [value, name.charAt(0).toUpperCase() + name.slice(1)];
                    }}
                  />
                  <Bar dataKey="leads" fill={isDark ? "#3b82f6" : "#2563eb"} name="Leads" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deals" fill={isDark ? "#60a5fa" : "#3b82f6"} name="Deals" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={cn("h-[350px] flex items-center justify-center text-sm", isDark ? "text-white/25" : "text-gray-500")}>
              No performance data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performance.map((member, index) => (
          <Card
            key={member.user_id}
            className={cn("overflow-hidden border", isDark ? "bg-[#0e0e15] border-white/[0.06]" : "border-gray-200")}
            data-testid={`performance-card-${index}`}
          >
            {/* Accent top bar */}
            <div className="h-1.5" style={{ backgroundColor: brand }} />
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-14 w-14">
                  <AvatarFallback
                    className="text-lg font-bold text-white"
                    style={{ backgroundColor: brand }}
                  >
                    {getInitials(member.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className={cn("font-semibold text-lg", isDark ? "text-white/90" : "text-gray-900")}>
                    {member.user_name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border",
                      index === 0
                        ? isDark ? "bg-blue-500/10 text-blue-300 border-blue-500/25" : "bg-amber-50 text-amber-700 border-amber-200"
                        : isDark ? "bg-white/[0.04] text-white/50 border-white/[0.08]" : "bg-[#F1F7FB]"
                    )}
                  >
                    {index === 0 ? "🏆 Top Performer" : `#${index + 1}`}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Users,    label: "Leads Added",    value: member.leads_added },
                  { icon: Phone,    label: "Activities",     value: member.activities_logged },
                  { icon: Calendar, label: "Meetings",       value: member.meetings_booked },
                  { icon: Trophy,   label: "Deals Closed",   value: member.deals_closed },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-white/50" : "text-gray-600")}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    <span className={cn("font-semibold", isDark ? "text-white/90" : "text-gray-900")}>{value}</span>
                  </div>
                ))}

                <div className={cn("pt-4 border-t", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-sm", isDark ? "text-white/50" : "text-gray-600")}>Conversion Rate</span>
                    <div className="flex items-center gap-1">
                      {member.conversion_rate > 50
                        ? <ArrowUpRight className={cn("h-4 w-4", isDark ? "text-blue-400" : "text-emerald-500")} />
                        : <ArrowDownRight className="h-4 w-4 text-red-400" />
                      }
                      <span className={cn("font-semibold",
                        member.conversion_rate > 50
                          ? isDark ? "text-blue-400" : "text-emerald-600"
                          : "text-red-400"
                      )}>
                        {member.conversion_rate}%
                      </span>
                    </div>
                  </div>
                  <Progress value={member.conversion_rate} className={cn("h-1.5", isDark && "[&>div]:bg-blue-500 bg-white/[0.06]")} />
                </div>

                <div className={cn("pt-4 border-t", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm", isDark ? "text-white/50" : "text-gray-600")}>Revenue Generated</span>
                    <span className={cn("text-lg font-bold font-['Plus_Jakarta_Sans']", isDark ? "text-blue-400" : "text-emerald-600")}>
                      {formatCurrency(member.revenue_generated)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
