import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStageColor(stage) {
  const colors = {
    "Lead Identified": "bg-slate-100 text-slate-700 border-slate-200",
    "Contacted": "bg-blue-50 text-blue-700 border-blue-200",
    "First Call Scheduled": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "First Call Done": "bg-teal-50 text-teal-700 border-teal-200",
    "Follow Up": "bg-violet-50 text-violet-700 border-violet-200",
    "Meeting Scheduled": "bg-purple-50 text-purple-700 border-purple-200",
    "Meeting Completed": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Proposal Sent": "bg-sky-50 text-sky-700 border-sky-200",
    "Negotiation": "bg-amber-50 text-amber-700 border-amber-200",
    "Closed Won": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Closed Lost": "bg-rose-50 text-rose-700 border-rose-200",
  };
  return colors[stage] || "bg-slate-100 text-slate-700 border-slate-200";
}

export function getSourceIcon(source) {
  const icons = {
    Apollo: "rocket",
    LinkedIn: "linkedin",
    Referral: "users",
    Website: "globe",
    Event: "calendar",
    Other: "file-text",
  };
  return icons[source] || "file-text";
}

export function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

export const LEAD_STAGES = [
  "Lead Identified",
  "Contacted",
  "First Call Scheduled",
  "First Call Done",
  "Follow Up",
  "Meeting Scheduled",
  "Meeting Completed",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export const LEAD_SOURCES = ["Apollo", "LinkedIn", "Referral", "Website", "Event", "Other"];

export const ACTIVITY_TYPES = ["Call", "Email", "WhatsApp", "Meeting", "Note", "Follow Up"];

export const MEETING_TYPES = ["Discovery", "Demo", "Proposal", "Negotiation", "Other"];
