import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getInitials, formatDateTime } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Loader2, Trophy, Zap, TrendingUp, Star } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BRAND = "#1978B8";

const LEVEL_NAMES = [
  "Prospect", "Qualifier", "Connector", "Closer",
  "Performer", "Specialist", "Expert", "Elite", "Master", "Legend"
];

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 3000];

const ACTION_LABELS = {
  lead_created:    { label: "Lead Created",    xp: 5,  color: "bg-blue-100 text-blue-700" },
  stage_updated:   { label: "Stage Updated",   xp: 3,  color: "bg-purple-100 text-purple-700" },
  activity_logged: { label: "Activity Logged", xp: 5,  color: "bg-teal-100 text-teal-700" },
  meeting_booked:  { label: "Meeting Booked",  xp: 15, color: "bg-amber-100 text-amber-700" },
  deal_closed:     { label: "Deal Closed",     xp: 50, color: "bg-emerald-100 text-emerald-700" },
};

const LEVEL_COLORS = [
  "#94a3b8", // 1 Prospect - slate
  "#60a5fa", // 2 Qualifier - blue
  "#34d399", // 3 Connector - emerald
  "#a78bfa", // 4 Closer - violet
  "#f59e0b", // 5 Performer - amber
  "#f97316", // 6 Specialist - orange
  "#ef4444", // 7 Expert - red
  "#1978B8", // 8 Elite - brand blue
  "#7c3aed", // 9 Master - purple
  "#d97706", // 10 Legend - gold
];

function getLevelColor(level) {
  return LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)];
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
}

export const Levels = () => {
  const { user } = useAuth();
  const [myXp, setMyXp] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [myRes, lbRes] = await Promise.all([
          axios.get(`${API_URL}/api/levels/my-xp`),
          axios.get(`${API_URL}/api/levels/leaderboard`),
        ]);
        setMyXp(myRes.data);
        setLeaderboard(lbRes.data);
      } catch (err) {
        console.error("Failed to load levels data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#1978B8]" />
      </div>
    );
  }

  const myEntry = leaderboard.find((e) => e.user_id === user?.id);
  const levelColor = getLevelColor(myXp?.level || 1);
  const xpToNext = myXp?.next_threshold != null
    ? myXp.next_threshold - myXp.xp
    : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Levels &amp; XP
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Earn XP by closing deals, booking meetings and logging activities
        </p>
      </div>

      {/* My Level Card */}
      {myXp && (
        <Card
          className="border border-gray-200 shadow-sm bg-white overflow-hidden"
          style={{ borderTop: `3px solid ${levelColor}` }}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Level badge */}
              <div
                className="flex-shrink-0 h-20 w-20 rounded-2xl flex flex-col items-center justify-center text-white shadow-md"
                style={{ backgroundColor: levelColor }}
              >
                <span className="text-2xl font-extrabold leading-none">{myXp.level}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90 mt-0.5">
                  Level
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold text-gray-900">
                      {myXp.level_name}
                    </span>
                    {myEntry && (
                      <span className="text-sm text-gray-500 font-medium">
                        · Rank #{myEntry.rank}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-700">{myXp.xp} XP</span> total earned
                    {xpToNext != null && (
                      <span className="ml-1">· {xpToNext} XP to next level</span>
                    )}
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{myXp.current_threshold} XP</span>
                    {myXp.next_threshold != null && (
                      <span>{myXp.next_threshold} XP</span>
                    )}
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${myXp.next_threshold != null ? myXp.progress_pct : 100}%`,
                        backgroundColor: levelColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* XP summary pills */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(ACTION_LABELS).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${val.color}`}>
                      +{val.xp}
                    </span>
                    <span className="text-gray-600 truncate">{val.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200 shadow-sm bg-white" style={{ borderTop: `3px solid ${BRAND}` }}>
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Trophy size={16} style={{ color: BRAND }} />
                Team Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-gray-50">
              {leaderboard.map((entry) => {
                const isMe = entry.user_id === user?.id;
                const color = getLevelColor(entry.level);
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${
                      isMe ? "bg-[#EBF5FB]" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center flex-shrink-0">
                      <RankBadge rank={entry.rank} />
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={entry.avatar_url} className="object-cover" />
                      <AvatarFallback
                        className="text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {getInitials(entry.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name + level */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {entry.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-bold text-[#1978B8]">(you)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: color }}
                        >
                          Lvl {entry.level}
                        </span>
                        <span className="text-xs text-gray-500">{entry.level_name}</span>
                      </div>
                    </div>

                    {/* XP + progress */}
                    <div className="flex-shrink-0 text-right space-y-1.5 min-w-[90px]">
                      <div className="flex items-center justify-end gap-1">
                        <Zap size={11} style={{ color }} />
                        <span className="text-sm font-bold" style={{ color }}>
                          {entry.xp} XP
                        </span>
                      </div>
                      <div className="h-1.5 w-24 rounded-full bg-gray-100 overflow-hidden ml-auto">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${entry.next_threshold != null ? entry.progress_pct : 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent XP Activity */}
        <div>
          <Card className="border border-gray-200 shadow-sm bg-white" style={{ borderTop: `3px solid ${BRAND}` }}>
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp size={16} style={{ color: BRAND }} />
                Recent XP Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {myXp?.recent_events?.length > 0 ? (
                myXp.recent_events.map((evt) => {
                  const meta = ACTION_LABELS[evt.action_type] || {
                    label: evt.action_type,
                    color: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Star size={12} className="flex-shrink-0 text-amber-400" />
                        <span className="text-xs text-gray-600 truncate">{meta.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${meta.color}`}
                      >
                        +{evt.xp_amount} XP
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">
                  No XP earned yet. Start adding leads!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Level guide */}
          <Card className="border border-gray-200 shadow-sm bg-white mt-4">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                Level Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                {LEVEL_NAMES.map((name, i) => {
                  const lvl = i + 1;
                  const color = getLevelColor(lvl);
                  const isCurrent = myXp?.level === lvl;
                  return (
                    <div
                      key={lvl}
                      className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                        isCurrent ? "bg-[#EBF5FB] font-semibold" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {lvl}
                        </span>
                        <span className="text-gray-700">{name}</span>
                      </div>
                      <span className="text-gray-400">{LEVEL_THRESHOLDS[i]}+ XP</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
