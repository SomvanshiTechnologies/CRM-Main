import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  cn,
  formatCurrency,
  getStageColor,
  getInitials,
  LEAD_STAGES,
} from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  Building2,
  DollarSign,
  GripVertical,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Pipeline = () => {
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pipeline`);
      setPipeline(response.data);
    } catch (error) {
      console.error("Failed to fetch pipeline:", error);
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, lead, fromStage) => {
    setDraggedLead({ lead, fromStage });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, toStage) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead || draggedLead.fromStage === toStage) {
      setDraggedLead(null);
      return;
    }

    const { lead, fromStage } = draggedLead;

    // Optimistically update UI
    setPipeline((prev) => {
      const newPipeline = { ...prev };
      newPipeline[fromStage] = prev[fromStage].filter((l) => l.id !== lead.id);
      newPipeline[toStage] = [...(prev[toStage] || []), { ...lead, stage: toStage }];
      return newPipeline;
    });

    try {
      await axios.put(`${API_URL}/api/pipeline/${lead.id}/move?stage=${encodeURIComponent(toStage)}`);
      toast.success(`Lead moved to ${toStage}`);
    } catch (error) {
      console.error("Failed to move lead:", error);
      toast.error("Failed to move lead");
      // Revert on error
      fetchPipeline();
    }

    setDraggedLead(null);
  };

  const getStageStats = useCallback(
    (stage) => {
      const leads = pipeline[stage] || [];
      const count = leads.length;
      const value = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
      return { count, value };
    },
    [pipeline]
  );

  const getStageHeaderColor = (stage) => {
    if (stage === "Closed Won") return "bg-emerald-500";
    if (stage === "Closed Lost") return "bg-rose-500";
    if (stage === "Negotiation") return "bg-amber-500";
    return "bg-indigo-500";
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.slice(0, 5).map((stage) => (
          <div
            key={stage}
            className="min-w-[300px] w-[300px] rounded-xl bg-slate-100 animate-pulse h-96"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
            Pipeline
          </h2>
          <p className="text-gray-500">
            Drag and drop leads between stages
          </p>
        </div>
      </div>

      {/* Pipeline Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
          {LEAD_STAGES.map((stage) => {
            const { count, value } = getStageStats(stage);
            const isDropTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                className={cn(
                  "min-w-[300px] w-[300px] rounded-xl border transition-all flex flex-col",
                  isDropTarget
                    ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200"
                    : "bg-[#F1F7FB]/50 border-gray-200"
                )}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                data-testid={`pipeline-column-${stage.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        getStageHeaderColor(stage)
                      )}
                    />
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {stage}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-xs bg-slate-200"
                    >
                      {count}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(value)}
                  </p>
                </div>

                {/* Cards Container */}
                <ScrollArea className="flex-1 p-3" style={{ maxHeight: "calc(100vh - 300px)" }}>
                  <div className="space-y-3">
                    {(pipeline[stage] || []).map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead, stage)}
                        className={cn(
                          "pipeline-card bg-white p-4 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing",
                          draggedLead?.lead.id === lead.id && "opacity-50"
                        )}
                        data-testid={`pipeline-card-${lead.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-slate-300 hover:text-gray-500">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <p className="font-medium text-gray-900 truncate">
                                {lead.company_name}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500 truncate mb-2">
                              {lead.contact_name}
                              {lead.contact_designation &&
                                ` • ${lead.contact_designation}`}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatCurrency(lead.estimated_value)}
                              </div>
                              {lead.owner_name && (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={lead.owner_avatar} />
                                  <AvatarFallback className="text-xs bg-[#EBF5FB] text-[#1978B8]">
                                    {getInitials(lead.owner_name)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        </div>
                        {lead.source && (
                          <Badge
                            variant="outline"
                            className="mt-3 text-xs w-full justify-center"
                          >
                            {lead.source}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {(pipeline[stage] || []).length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <p className="text-sm">No leads in this stage</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
