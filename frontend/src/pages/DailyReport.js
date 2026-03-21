import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getInitials, downloadCSV } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Phone, MessageSquare, RefreshCw, CalendarCheck, CalendarDays,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Loader2,
  ClipboardList, Download,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BRAND   = "#1978B8";

const METRICS = [
  { key: "calls_made",        label: "Calls Made",        icon: Phone,          color: "text-[#1978B8]", bg: "bg-[#EBF5FB]",  border: "border-[#C5DFF0]" },
  { key: "messages_sent",     label: "Messages Sent",     icon: MessageSquare,  color: "text-purple-600", bg: "bg-purple-50",   border: "border-purple-100" },
  { key: "follow_ups_made",   label: "Follow Ups Made",   icon: RefreshCw,      color: "text-amber-600",  bg: "bg-amber-50",    border: "border-amber-100" },
  { key: "meetings_set",      label: "Meetings Set",      icon: CalendarCheck,  color: "text-green-600",  bg: "bg-green-50",    border: "border-green-100" },
  { key: "meetings_attended", label: "Meetings Attended", icon: CalendarDays,   color: "text-indigo-600", bg: "bg-indigo-50",   border: "border-indigo-100" },
];

const getLocalDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};

const formatDisplayDate = (dateStr) => {
  const [y, m, day] = dateStr.split("-");
  return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
};

const formatShortDate = (dateStr) => {
  const [y, m, day] = dateStr.split("-");
  return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const emptyForm = {
  calls_made: "", messages_sent: "", follow_ups_made: "",
  meetings_set: "", meetings_attended: "", notes: "",
};

// ─── Metric Summary Card ─────────────────────────────────────────────────────
const MetricCard = ({ metric, value }) => {
  const { label, icon: Icon, color, bg, border } = metric;
  return (
    <Card className={`border ${border} bg-white shadow-sm`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Admin View ───────────────────────────────────────────────────────────────
const AdminView = () => {
  const [date, setDate]           = useState(getLocalDate());
  const [reports, setReports]     = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/daily-reports`, { params: { date } }),
        axios.get(`${API_URL}/api/users/sales`),
      ]);
      setReports(reportsRes.data);
      setSalesUsers(usersRes.data);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reportByUser = Object.fromEntries(reports.map((r) => [r.user_id, r]));

  const totals = METRICS.reduce((acc, m) => {
    acc[m.key] = reports.reduce((sum, r) => sum + (r[m.key] || 0), 0);
    return acc;
  }, {});

  const shiftDate = (days) => {
    const [y, mo, d] = date.split("-").map(Number);
    const next = new Date(y, mo - 1, d + days);
    setDate(next.toLocaleDateString("en-CA"));
  };

  const isToday = date === getLocalDate();

  const handleExport = () => {
    if (salesUsers.length === 0) {
      toast.error("No data to export");
      return;
    }
    const rows = salesUsers.map((su) => {
      const r = reportByUser[su.id];
      return {
        "Date": date,
        "Team Member": su.name,
        "Calls Made": r ? r.calls_made : 0,
        "Messages Sent": r ? r.messages_sent : 0,
        "Follow Ups Made": r ? r.follow_ups_made : 0,
        "Meetings Set": r ? r.meetings_set : 0,
        "Meetings Attended": r ? r.meetings_attended : 0,
        "Notes": r?.notes || "",
        "Status": r ? "Submitted" : "Pending",
      };
    });
    // Totals row
    rows.push({
      "Date": date,
      "Team Member": "TOTAL",
      "Calls Made": totals.calls_made,
      "Messages Sent": totals.messages_sent,
      "Follow Ups Made": totals.follow_ups_made,
      "Meetings Set": totals.meetings_set,
      "Meetings Attended": totals.meetings_attended,
      "Notes": "",
      "Status": `${reports.length}/${salesUsers.length} submitted`,
    });
    downloadCSV(rows, `daily_report_${date}`);
    toast.success("Report exported successfully");
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">Daily Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Track your team's daily activity — {formatShortDate(date)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date navigation */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={date}
              max={getLocalDate()}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 text-sm text-gray-700 font-medium focus:outline-none px-1 bg-transparent"
            />
            <button
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setDate(getLocalDate())} className="text-xs">
              Today
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleExport}
            className="gap-2 text-white"
            style={{ backgroundColor: BRAND }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRICS.map((m) => (
          <MetricCard key={m.key} metric={m} value={totals[m.key]} />
        ))}
      </div>

      {/* ── Submission progress ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              backgroundColor: BRAND,
              width: salesUsers.length > 0 ? `${(reports.length / salesUsers.length) * 100}%` : "0%",
            }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
          {reports.length} / {salesUsers.length} submitted
        </span>
      </div>

      {/* ── Team Table ──────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-0 border-b border-gray-100 px-5 py-3">
          <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-3.5 rounded-full inline-block" style={{ backgroundColor: BRAND }} />
            Team Activity
          </CardTitle>
        </CardHeader>
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
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600 w-48">
                      Team Member
                    </th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="text-center px-3 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <m.icon className={`h-4 w-4 ${m.color}`} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                            {m.label}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Notes</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesUsers.map((su, idx) => {
                    const report = reportByUser[su.id];
                    return (
                      <tr
                        key={su.id}
                        className={`border-b border-gray-50 hover:bg-[#F0F7FD] transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-gray-200">
                              <AvatarImage src={su.avatar_url} />
                              <AvatarFallback className="text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
                                {getInitials(su.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-gray-800 text-sm">{su.name}</span>
                          </div>
                        </td>
                        {METRICS.map((m) => (
                          <td key={m.key} className="px-3 py-3.5 text-center">
                            {report ? (
                              <span className={`font-bold text-base ${report[m.key] > 0 ? m.color : "text-gray-300"}`}>
                                {report[m.key]}
                              </span>
                            ) : (
                              <span className="text-gray-200 font-bold">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3.5 text-gray-500 max-w-[160px]">
                          {report?.notes
                            ? <span className="text-xs truncate block" title={report.notes}>{report.notes}</span>
                            : <span className="text-gray-200 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {report ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              Submitted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400 border-gray-200 gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  {salesUsers.length > 0 && (
                    <tr className="border-t-2 border-[#C5DFF0] bg-[#F1F7FB] font-semibold">
                      <td className="px-5 py-3.5 text-gray-700 text-sm">Team Total</td>
                      {METRICS.map((m) => (
                        <td key={m.key} className={`px-3 py-3.5 text-center font-bold text-base ${m.color}`}>
                          {totals[m.key]}
                        </td>
                      ))}
                      <td className="px-4 py-3.5" />
                      <td className="px-4 py-3.5 text-center text-xs text-gray-500">
                        {reports.length}/{salesUsers.length}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {salesUsers.length === 0 && (
                <p className="text-center py-14 text-gray-400 text-sm">No team members found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Sales View ───────────────────────────────────────────────────────────────
const SalesView = () => {
  const today = getLocalDate();
  const [form, setForm]           = useState(emptyForm);
  const [existingId, setExistingId] = useState(null);
  const [history, setHistory]     = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchMyReports = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/daily-reports`);
      const all = res.data;
      const todayReport = all.find((r) => r.date === today);
      if (todayReport) {
        setForm({
          calls_made:        todayReport.calls_made,
          messages_sent:     todayReport.messages_sent,
          follow_ups_made:   todayReport.follow_ups_made,
          meetings_set:      todayReport.meetings_set,
          meetings_attended: todayReport.meetings_attended,
          notes:             todayReport.notes || "",
        });
        setExistingId(todayReport.id);
      } else {
        setForm(emptyForm);
        setExistingId(null);
      }
      setHistory(all.filter((r) => r.date !== today).slice(0, 14));
    } catch {
      toast.error("Failed to load your reports");
    } finally {
      setDataLoading(false);
    }
  }, [today]);

  useEffect(() => { fetchMyReports(); }, [fetchMyReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await axios.post(`${API_URL}/api/daily-reports`, {
        date:              today,
        calls_made:        parseInt(form.calls_made) || 0,
        messages_sent:     parseInt(form.messages_sent) || 0,
        follow_ups_made:   parseInt(form.follow_ups_made) || 0,
        meetings_set:      parseInt(form.meetings_set) || 0,
        meetings_attended: parseInt(form.meetings_attended) || 0,
        notes:             form.notes || null,
      });
      toast.success(existingId ? "Report updated!" : "Report submitted!");
      fetchMyReports();
    } catch {
      toast.error("Failed to save report");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">Daily Report</h2>
        <p className="text-sm text-gray-500 mt-0.5">{formatDisplayDate(today)}</p>
      </div>

      {/* ── Today's Form ────────────────────────────────────────────── */}
      <Card className="border border-gray-200 shadow-sm bg-white" style={{ borderTop: `3px solid ${BRAND}` }}>
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="h-4.5 w-4.5" style={{ color: BRAND }} size={18} />
              {existingId ? "Update Today's Report" : "Log Today's Activity"}
            </CardTitle>
            {existingId && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submitted
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {dataLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {METRICS.map(({ key, label, icon: Icon, color, bg }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      <div className={`h-5 w-5 rounded ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-3 w-3 ${color}`} />
                      </div>
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder="0"
                      className="text-center font-semibold text-lg h-11 border-gray-200 focus:border-[#1978B8] focus:ring-[#1978B8]"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Notes (optional)
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any highlights, blockers, or comments for today..."
                  rows={3}
                  className="border-gray-200 focus:border-[#1978B8] resize-none"
                />
              </div>
              <div className="flex justify-end pt-1 border-t border-gray-100">
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="gap-2 text-white px-6"
                  style={{ backgroundColor: BRAND }}
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {existingId ? "Update Report" : "Submit Report"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Recent History ──────────────────────────────────────────── */}
      {history.length > 0 && (
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-0 border-b border-gray-100 px-5 py-3">
            <CardTitle className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full inline-block" style={{ backgroundColor: BRAND }} />
              Recent History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F1F7FB] border-b-2 border-[#C5DFF0]">
                    <th className="text-left px-5 py-2.5 font-semibold text-xs uppercase tracking-wider text-gray-600">Date</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`border-b border-gray-50 hover:bg-[#F0F7FD] transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                    >
                      <td className="px-5 py-3 text-gray-600 font-medium text-sm whitespace-nowrap">
                        {formatShortDate(r.date)}
                      </td>
                      {METRICS.map((m) => (
                        <td key={m.key} className={`px-3 py-3 text-center font-bold ${r[m.key] > 0 ? m.color : "text-gray-200"}`}>
                          {r[m.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export const DailyReport = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminView /> : <SalesView />;
};
