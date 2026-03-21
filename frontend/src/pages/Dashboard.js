import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { useAuth } from "../context/AuthContext";
import { cn, formatCurrency, getStageColor, LEAD_STAGES } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import {
  Users, TrendingUp, DollarSign, Calendar,
  Target, Trophy, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BRAND   = "#1978B8";

// Dark mode: shades of blue from deep to bright
const DARK_CHART_COLORS  = ["#3b82f6","#1d4ed8","#60a5fa","#93c5fd","#2563eb","#bfdbfe","#1e40af","#dbeafe"];
const LIGHT_CHART_COLORS = ["#1978B8","#0F4C7A","#2EA3D0","#4FC3E8","#10B981","#F59E0B","#EF4444","#8B5CF6"];

const StatCard = ({ label, value, icon: Icon, isDark, children }) => (
  <Card className={cn(
    "border stat-card transition-all duration-200",
    isDark
      ? "bg-[#0e0e15] border-white/[0.06] hover:border-blue-500/30"
      : "border-gray-200 shadow-sm bg-white"
  )}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-semibold uppercase tracking-wider mb-2",
            isDark ? "text-white/40" : "text-gray-500"
          )}>{label}</p>
          <p className={cn(
            "text-3xl font-bold font-['Plus_Jakarta_Sans']",
            isDark ? "text-white" : "text-gray-900"
          )}>{value}</p>
          {children}
        </div>
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-4",
          isDark ? "bg-blue-500/10 ring-1 ring-blue-500/20" : "bg-[#EBF5FB]"
        )}>
          <Icon className={cn("h-5 w-5", isDark ? "text-blue-400" : "text-[#1978B8]")} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [stats, setStats] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  const brand = isDark ? "#3b82f6" : BRAND;
  const chartColors = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  useEffect(() => { fetchDashboardData(); }, []); // eslint-disable-line

  const fetchDashboardData = async () => {
    try {
      const [statsRes, perfRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        isAdmin
          ? axios.get(`${API_URL}/api/dashboard/performance`)
          : Promise.resolve({ data: [] }),
      ]);
      setStats(statsRes.data);
      setPerformance(perfRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const pipelineData = stats
    ? LEAD_STAGES.filter(
        (s) => !["Closed Won", "Closed Lost"].includes(s) && stats.leads_by_stage[s] > 0
      ).map((s) => ({
        name: s.length > 14 ? s.substring(0, 14) + "…" : s,
        fullName: s,
        count: stats.leads_by_stage[s] || 0,
      }))
    : [];

  const stageDistribution = stats
    ? Object.entries(stats.leads_by_stage)
        .filter(([, c]) => c > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const tooltipStyle = isDark
    ? {
        background: "#121219",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#f8fafc",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }
    : {
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: "8px",
        fontSize: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      };

  const axisColor  = isDark ? "rgba(248,250,252,0.35)" : "#94A3B8";
  const gridColor  = isDark ? "rgba(255,255,255,0.04)" : "#EEF2FF";
  const labelColor = isDark ? "rgba(248,250,252,0.55)" : "#64748B";

  const cardCls = cn(
    "border",
    isDark
      ? "bg-[#0e0e15] border-white/[0.06]"
      : "border-gray-200 shadow-sm bg-white"
  );
  const headerCls = cn(
    "pb-2 border-b",
    isDark ? "border-white/[0.06]" : "border-gray-100"
  );
  const titleCls = cn(
    "text-xs font-semibold uppercase tracking-wider flex items-center gap-2",
    isDark ? "text-white/50" : "text-gray-700"
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className={cardCls}>
              <CardContent className="p-5">
                <Skeleton className={cn("h-3 w-20 mb-3", isDark && "bg-white/[0.06]")} />
                <Skeleton className={cn("h-8 w-28", isDark && "bg-white/[0.06]")} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads"     value={stats?.total_leads || 0}                         icon={Users}      isDark={isDark} />
        <StatCard label="Pipeline Value"  value={formatCurrency(stats?.total_pipeline_value || 0)} icon={TrendingUp} isDark={isDark} />
        <StatCard label="Closed Revenue"  value={formatCurrency(stats?.closed_revenue || 0)}       icon={DollarSign} isDark={isDark} />
        <StatCard label="Conversion Rate" value={`${stats?.conversion_rate || 0}%`}                icon={Target}     isDark={isDark}>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={cn(
              "text-xs border",
              isDark
                ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}>
              {stats?.deals_closed_won || 0} Won
            </Badge>
            <Badge className={cn(
              "text-xs border",
              isDark
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}>
              {stats?.deals_closed_lost || 0} Lost
            </Badge>
          </div>
        </StatCard>
      </div>

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pipeline Bar Chart */}
        <Card className={cardCls}>
          <CardHeader className={headerCls}>
            <CardTitle className={titleCls}>
              <span className="w-0.5 h-4 rounded-full inline-block" style={{ backgroundColor: brand }} />
              Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {pipelineData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: axisColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: labelColor, fontSize: 11 }}
                      width={110}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, n, p) => [v + " leads", p.payload.fullName]}
                    />
                    <Bar dataKey="count" fill={brand} radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={cn("h-[280px] flex items-center justify-center text-sm", isDark ? "text-white/25" : "text-gray-400")}>
                No pipeline data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Distribution Donut */}
        <Card className={cardCls}>
          <CardHeader className={headerCls}>
            <CardTitle className={titleCls}>
              <span className="w-0.5 h-4 rounded-full inline-block" style={{ backgroundColor: brand }} />
              Stage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {stageDistribution.length > 0 ? (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageDistribution}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={isDark ? 0 : 2}
                        stroke={isDark ? "transparent" : "#fff"}
                      >
                        {stageDistribution.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {stageDistribution.slice(0, 6).map((item, i) => (
                    <span
                      key={item.name}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border",
                        isDark
                          ? "border-white/[0.06] text-white/55 bg-white/[0.02]"
                          : "border-gray-200 text-gray-600 bg-white"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                      {item.name}: <strong className={isDark ? "text-white/80" : ""}>{item.value}</strong>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className={cn("h-[280px] flex items-center justify-center text-sm", isDark ? "text-white/25" : "text-gray-400")}>
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Meetings Booked",  value: stats?.meetings_booked || 0,                  icon: Calendar },
          { label: "Expected Revenue", value: formatCurrency(stats?.expected_revenue || 0),  icon: TrendingUp },
          { label: "Deals Won",        value: stats?.deals_closed_won || 0,                  icon: Trophy },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className={cn(cardCls, "stat-card")}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center",
                  isDark ? "bg-blue-500/10 ring-1 ring-blue-500/20" : "bg-[#EBF5FB]"
                )}>
                  <Icon className={cn("h-5 w-5", isDark ? "text-blue-400" : "text-[#1978B8]")} />
                </div>
                <div>
                  <p className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    isDark ? "text-white/40" : "text-gray-500"
                  )}>{label}</p>
                  <p className={cn(
                    "text-2xl font-bold font-['Plus_Jakarta_Sans'] mt-0.5",
                    isDark ? "text-white" : "text-gray-900"
                  )}>{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Team Performance ─────────────────────────────────────────── */}
      {isAdmin && performance.length > 0 && (
        <Card className={cardCls}>
          <CardHeader className={headerCls}>
            <CardTitle className={titleCls}>
              <span className="w-0.5 h-4 rounded-full inline-block" style={{ backgroundColor: brand }} />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              {performance.map((member, index) => (
                <div
                  key={member.user_id}
                  className={cn(
                    "flex items-center gap-4 p-3.5 rounded-lg border transition-all duration-150",
                    isDark
                      ? "bg-white/[0.02] border-white/[0.04] hover:bg-blue-500/[0.06] hover:border-blue-500/20"
                      : "bg-gray-50 border-transparent hover:bg-[#EBF5FB] hover:border-[#C5DFF0]"
                  )}
                >
                  <div className="flex items-center justify-center w-7">
                    {index === 0
                      ? <Trophy className={cn("h-5 w-5", isDark ? "text-blue-400" : "text-amber-500")} />
                      : <span className={cn("text-sm font-bold", isDark ? "text-white/30" : "text-gray-400")}>#{index + 1}</span>
                    }
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="text-xs font-semibold text-white" style={{ backgroundColor: brand }}>
                      {member.user_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-semibold text-sm", isDark ? "text-white/90" : "text-gray-900")}>
                      {member.user_name}
                    </p>
                    <div className={cn("flex items-center gap-3 text-xs mt-0.5", isDark ? "text-white/35" : "text-gray-500")}>
                      <span>{member.leads_added} leads</span>
                      <span className={isDark ? "text-white/15" : "text-gray-300"}>|</span>
                      <span>{member.meetings_booked} meetings</span>
                      <span className={isDark ? "text-white/15" : "text-gray-300"}>|</span>
                      <span>{member.deals_closed} deals closed</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn("font-bold text-sm font-['Plus_Jakarta_Sans']", isDark ? "text-white/90" : "text-gray-900")}>
                      {formatCurrency(member.revenue_generated)}
                    </p>
                    <div className="flex items-center gap-1 text-xs justify-end mt-0.5">
                      {member.conversion_rate > 50
                        ? <ArrowUpRight className={cn("h-3.5 w-3.5", isDark ? "text-blue-400" : "text-emerald-500")} />
                        : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                      }
                      <span className={
                        member.conversion_rate > 50
                          ? isDark ? "text-blue-400" : "text-emerald-600"
                          : "text-red-400"
                      }>
                        {member.conversion_rate}% conv.
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
