import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  cn,
  formatDateTime,
  ACTIVITY_TYPES,
} from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Circle,
  Loader2,
  Search,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const activityIcons = {
  Call: Phone,
  Email: Mail,
  WhatsApp: MessageSquare,
  Meeting: Calendar,
  Note: FileText,
  "Follow Up": Clock,
};

export const Activities = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [newActivity, setNewActivity] = useState({
    lead_id: "",
    activity_type: "Call",
    description: "",
    scheduled_at: "",
  });

  useEffect(() => {
    fetchActivities();
    fetchLeads();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.lead_id || !newActivity.description) {
      toast.error("Please select a lead and add a description");
      return;
    }

    setFormLoading(true);
    try {
      await axios.post(`${API_URL}/api/activities`, newActivity);
      toast.success("Activity logged successfully");
      setShowAddDialog(false);
      setNewActivity({
        lead_id: "",
        activity_type: "Call",
        description: "",
        scheduled_at: "",
      });
      fetchActivities();
    } catch (error) {
      toast.error("Failed to log activity");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCompleteActivity = async (activityId) => {
    try {
      await axios.put(`${API_URL}/api/activities/${activityId}/complete`);
      toast.success("Activity completed");
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, completed: true } : a))
      );
    } catch (error) {
      toast.error("Failed to complete activity");
    }
  };

  const getLeadName = (leadId) => {
    const lead = leads.find((l) => l.id === leadId);
    return lead ? lead.company_name : "Unknown";
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getLeadName(activity.lead_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || activity.activity_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
            Activities
          </h2>
          <p className="text-gray-500">
            {filteredActivities.length} activities logged
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1978B8] hover:bg-[#155f93]" data-testid="add-activity-btn">
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-['Plus_Jakarta_Sans']">Log Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateActivity} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Lead *</Label>
                <Select
                  value={newActivity.lead_id}
                  onValueChange={(value) =>
                    setNewActivity({ ...newActivity, lead_id: value })
                  }
                >
                  <SelectTrigger data-testid="activity-lead-select">
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.company_name} - {lead.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select
                  value={newActivity.activity_type}
                  onValueChange={(value) =>
                    setNewActivity({ ...newActivity, activity_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newActivity.description}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, description: e.target.value })
                  }
                  placeholder="Describe the activity..."
                  rows={3}
                  data-testid="activity-description-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Scheduled For (optional)</Label>
                <Input
                  type="datetime-local"
                  value={newActivity.scheduled_at}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, scheduled_at: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1978B8] hover:bg-[#155f93]"
                  disabled={formLoading}
                  data-testid="save-activity-btn"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Log Activity
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-activities-input"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activities Timeline */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p>No activities found</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="activity-timeline space-y-6">
                {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        {new Date(date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="space-y-3">
                      {dateActivities.map((activity) => {
                        const Icon = activityIcons[activity.activity_type] || FileText;
                        return (
                          <div
                            key={activity.id}
                            className={cn(
                              "activity-item p-4 rounded-lg border transition-all",
                              activity.completed
                                ? "bg-[#F1F7FB] border-gray-200"
                                : "bg-white border-gray-200 hover:border-slate-300"
                            )}
                            data-testid={`activity-item-${activity.id}`}
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={cn(
                                  "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                  activity.completed
                                    ? "bg-slate-100 text-gray-500"
                                    : "bg-[#EBF5FB] text-[#1978B8]"
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.activity_type}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {getLeadName(activity.lead_id)}
                                  </span>
                                </div>
                                <p className="text-gray-900 mb-2">
                                  {activity.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span>{activity.user_name}</span>
                                  <span>
                                    {formatDateTime(activity.created_at)}
                                  </span>
                                  {activity.scheduled_at && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      Scheduled:{" "}
                                      {formatDateTime(activity.scheduled_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!activity.completed && activity.scheduled_at && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCompleteActivity(activity.id)}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  data-testid={`complete-activity-${activity.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              )}
                              {activity.completed && (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Done
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
