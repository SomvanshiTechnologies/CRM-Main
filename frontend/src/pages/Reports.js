import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "next-themes";
import { cn, formatCurrency, downloadCSV } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { toast } from "sonner";
import { Download, TrendingUp, Users, DollarSign, Trophy } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Reports = () => {
  const { isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [period, setPeriod] = useState("week");
  const [leadsReport, setLeadsReport] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, [period]); // eslint-disable-line

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [leadsRes, revenueRes, exportRes] = await Promise.all([
        axios.get(`${API_URL}/api/reports/leads`, { params: { period } }),
        axios.get(`${API_URL}/api/reports/revenue`, { params: { period } }),
        axios.get(`${API_URL}/api/reports/export`),
      ]);
      setLeadsReport(leadsRes.data);
      setRevenueReport(revenueRes.data);
      setExportData(exportRes.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (exportData?.data) {
      downloadCSV(exportData.data, "leads_export");
      toast.success("Export downloaded successfully");
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "day":   return "Today";
      case "week":  return "This Week";
      case "month": return "This Month";
      default:      return "";
    }
  };

  // ── Dark-aware chart styles ──────────────────────────────────────────
  const tooltipStyle = isDark
    ? { background: "#121219", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", color: "#f8fafc", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }
    : { background: "white",   border: "1px solid #e2e8f0",               borderRadius: "8px", fontSize: "12px" };

  const axisColor  = isDark ? "rgba(248,250,252,0.35)" : "#64748b";
  const gridColor  = isDark ? "rgba(255,255,255,0.04)" : "#e2e8f0";
  const bar1Color  = isDark ? "#3b82f6" : "#2563eb";
  const bar2Color  = isDark ? "#60a5fa" : "#3b82f6";

  // ── Shared class helpers ─────────────────────────────────────────────
  const cardCls = cn("border", isDark ? "bg-[#0e0e15] border-white/[0.06]" : "border-gray-200");
  const headerBorderCls = isDark ? "border-white/[0.06]" : "border-gray-100";
  const titleCls = cn("text-sm font-semibold uppercase tracking-wider flex items-center gap-2", isDark ? "text-white/50" : "text-gray-700");
  const emptyTextCls = cn("h-[300px] flex items-center justify-center text-sm", isDark ? "text-white/25" : "text-gray-500");
  const tableHeaderRowCls = isDark ? "bg-white/[0.03] border-b border-white/[0.06]" : "bg-[#F1F7FB]";
  const tableHeadCls = cn("font-semibold text-xs uppercase tracking-wider", isDark ? "text-white/40" : "");
  const tableRowCls = isDark ? "border-b border-white/[0.04] hover:bg-blue-500/[0.04]" : "";

  const statIconCls = isDark ? "bg-blue-500/10 ring-1 ring-blue-500/20" : "";
  const statLabelCls = cn("text-sm font-medium uppercase tracking-wider", isDark ? "text-white/40" : "text-gray-500");
  const statValueCls = cn("text-3xl font-bold mt-2 font-['Plus_Jakarta_Sans']", isDark ? "text-white" : "text-gray-900");
  const statSubCls   = cn("text-sm mt-1", isDark ? "text-white/35" : "text-gray-500");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("h-32 rounded-lg animate-pulse", isDark ? "bg-white/[0.04]" : "bg-slate-100")} />
          ))}
        </div>
        <div className={cn("h-80 rounded-lg animate-pulse", isDark ? "bg-white/[0.04]" : "bg-slate-100")} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={cn("text-2xl font-bold font-['Plus_Jakarta_Sans']", isDark ? "text-white" : "text-gray-900")}>
            Reports
          </h2>
          <p className={cn("text-sm", isDark ? "text-white/40" : "text-gray-500")}>
            Performance analytics and data export
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={!exportData}
          data-testid="export-csv-btn"
          className={isDark
            ? "bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-[0_0_16px_rgba(59,130,246,0.2)]"
            : "bg-[#1978B8] hover:bg-[#155f93]"
          }
        >
          <Download className="h-4 w-4 mr-2" />
          Export All Leads (CSV)
        </Button>
      </div>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className={isDark ? "bg-white/[0.04] border border-white/[0.06]" : "bg-slate-100"}>
          <TabsTrigger value="day"   data-testid="period-day">Daily</TabsTrigger>
          <TabsTrigger value="week"  data-testid="period-week">Weekly</TabsTrigger>
          <TabsTrigger value="month" data-testid="period-month">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-6">
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Leads Generated", value: leadsReport?.total_leads || 0,                sub: getPeriodLabel(),                            icon: Users },
                { label: "Pipeline Value",  value: formatCurrency(leadsReport?.total_value || 0), sub: "From new leads",                           icon: TrendingUp },
                { label: "Revenue Closed",  value: formatCurrency(revenueReport?.total_revenue || 0), sub: `${revenueReport?.total_deals || 0} deals closed`, icon: DollarSign },
              ].map(({ label, value, sub, icon: Icon }) => (
                <Card key={label} className={cardCls}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={statLabelCls}>{label}</p>
                        <p className={statValueCls}>{value}</p>
                        <p className={statSubCls}>{sub}</p>
                      </div>
                      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", isDark ? statIconCls : "bg-blue-100")}>
                        <Icon className={cn("h-6 w-6", isDark ? "text-blue-400" : "text-blue-600")} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Leads by User */}
              <Card className={cardCls}>
                <CardHeader className={cn("border-b pb-4", headerBorderCls)}>
                  <CardTitle className={titleCls}>Leads by Team Member</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {leadsReport?.by_user?.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsReport.by_user}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis
                            dataKey="user_name"
                            tick={{ fill: axisColor, fontSize: 12 }}
                            tickFormatter={(v) => v.split(" ")[0]}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="leads_count" fill={bar1Color} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className={emptyTextCls}>No data for this period</div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by User */}
              <Card className={cardCls}>
                <CardHeader className={cn("border-b pb-4", headerBorderCls)}>
                  <CardTitle className={titleCls}>Revenue by Team Member</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {revenueReport?.by_user?.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueReport.by_user}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis
                            dataKey="user_name"
                            tick={{ fill: axisColor, fontSize: 12 }}
                            tickFormatter={(v) => v.split(" ")[0]}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: axisColor, fontSize: 12 }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) =>
                              v >= 100000 ? `${(v / 100000).toFixed(0)}L`
                              : v >= 1000 ? `${(v / 1000).toFixed(0)}K`
                              : v
                            }
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(v) => [formatCurrency(v), "Revenue"]}
                          />
                          <Bar dataKey="revenue" fill={bar2Color} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className={emptyTextCls}>No revenue data for this period</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Leads Leaderboard */}
              <Card className={cardCls}>
                <CardHeader className={cn("border-b pb-4", headerBorderCls)}>
                  <CardTitle className={cn(titleCls)}>
                    <Trophy className={cn("h-4 w-4", isDark ? "text-blue-400" : "text-amber-500")} />
                    Leads Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {leadsReport?.by_user?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className={tableHeaderRowCls}>
                          <TableHead className={tableHeadCls}>Rank</TableHead>
                          <TableHead className={tableHeadCls}>Team Member</TableHead>
                          <TableHead className={cn(tableHeadCls, "text-right")}>Leads</TableHead>
                          <TableHead className={cn(tableHeadCls, "text-right")}>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsReport.by_user.map((user, index) => (
                          <TableRow key={user.user_id} className={tableRowCls} data-testid={`leads-leaderboard-row-${index}`}>
                            <TableCell>
                              {index === 0 ? <span className={cn("text-xs font-bold px-2 py-1 rounded", isDark ? "bg-blue-500/10 text-blue-300" : "bg-amber-100 text-amber-700")}>🥇 1st</span>
                               : index === 1 ? <span className={cn("text-xs font-bold px-2 py-1 rounded", isDark ? "bg-white/[0.05] text-white/60" : "bg-slate-100 text-gray-700")}>🥈 2nd</span>
                               : index === 2 ? <span className={cn("text-xs font-bold px-2 py-1 rounded", isDark ? "bg-blue-500/[0.08] text-blue-400" : "bg-orange-100 text-orange-700")}>🥉 3rd</span>
                               : <span className={isDark ? "text-white/35 text-sm" : "text-gray-500 text-sm"}>#{index + 1}</span>}
                            </TableCell>
                            <TableCell className={cn("font-medium", isDark ? "text-white/80" : "")}>{user.user_name}</TableCell>
                            <TableCell className={cn("text-right font-medium", isDark ? "text-white/90" : "")}>{user.leads_count}</TableCell>
                            <TableCell className={cn("text-right", isDark ? "text-white/60" : "")}>{formatCurrency(user.total_value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className={cn("py-8 text-center text-sm", isDark ? "text-white/25" : "text-gray-500")}>
                      No leads data for this period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue Leaderboard */}
              <Card className={cardCls}>
                <CardHeader className={cn("border-b pb-4", headerBorderCls)}>
                  <CardTitle className={titleCls}>
                    <DollarSign className={cn("h-4 w-4", isDark ? "text-blue-400" : "text-emerald-500")} />
                    Revenue Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {revenueReport?.by_user?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className={tableHeaderRowCls}>
                          <TableHead className={tableHeadCls}>Rank</TableHead>
                          <TableHead className={tableHeadCls}>Team Member</TableHead>
                          <TableHead className={cn(tableHeadCls, "text-right")}>Deals</TableHead>
                          <TableHead className={cn(tableHeadCls, "text-right")}>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueReport.by_user.map((user, index) => (
                          <TableRow key={user.user_id} className={tableRowCls} data-testid={`revenue-leaderboard-row-${index}`}>
                            <TableCell>
                              {index === 0 ? <span className={cn("text-xs font-bold px-2 py-1 rounded", isDark ? "bg-blue-500/10 text-blue-300" : "bg-amber-100 text-amber-700")}>🥇 1st</span>
                               : index === 1 ? <span className={cn("text-xs font-bold px-2 py-1 rounded", isDark ? "bg-white/[0.05] text-white/60" : "bg-slate-100 text-gray-700")}>🥈 2nd</span>
                               : index === 2 ? <span className={cn("text-xs font-bold px-2 py-1 rounded", isDark ? "bg-blue-500/[0.08] text-blue-400" : "bg-orange-100 text-orange-700")}>🥉 3rd</span>
                               : <span className={isDark ? "text-white/35 text-sm" : "text-gray-500 text-sm"}>#{index + 1}</span>}
                            </TableCell>
                            <TableCell className={cn("font-medium", isDark ? "text-white/80" : "")}>{user.user_name}</TableCell>
                            <TableCell className={cn("text-right font-medium", isDark ? "text-white/90" : "")}>{user.deals_closed}</TableCell>
                            <TableCell className={cn("text-right font-bold", isDark ? "text-blue-400" : "text-emerald-600")}>{formatCurrency(user.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className={cn("py-8 text-center text-sm", isDark ? "text-white/25" : "text-gray-500")}>
                      No revenue data for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        </TabsContent>
      </Tabs>
    </div>
  );
};
