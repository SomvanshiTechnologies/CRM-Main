import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  cn,
  formatDateTime,
  formatDate,
  MEETING_TYPES,
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
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  Clock,
  Building2,
  User,
  CheckCircle,
  Search,
  Loader2,
  Video,
  FileText,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const meetingTypeColors = {
  Discovery: "bg-blue-100 text-blue-700 border-blue-200",
  Demo: "bg-purple-100 text-purple-700 border-purple-200",
  Proposal: "bg-amber-100 text-amber-700 border-amber-200",
  Negotiation: "bg-rose-100 text-rose-700 border-rose-200",
  Other: "bg-slate-100 text-gray-700 border-gray-200",
};

export const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const [newMeeting, setNewMeeting] = useState({
    lead_id: "",
    meeting_type: "Discovery",
    scheduled_at: "",
    notes: "",
    next_action: "",
  });

  useEffect(() => {
    fetchMeetings();
    fetchLeads();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/meetings`);
      setMeetings(response.data);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
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

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!newMeeting.lead_id || !newMeeting.scheduled_at) {
      toast.error("Please select a lead and meeting time");
      return;
    }

    setFormLoading(true);
    try {
      await axios.post(`${API_URL}/api/meetings`, newMeeting);
      toast.success("Meeting scheduled successfully");
      setShowAddDialog(false);
      setNewMeeting({
        lead_id: "",
        meeting_type: "Discovery",
        scheduled_at: "",
        notes: "",
        next_action: "",
      });
      fetchMeetings();
    } catch (error) {
      toast.error("Failed to schedule meeting");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateMeeting = async (e) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    setFormLoading(true);
    try {
      await axios.put(`${API_URL}/api/meetings/${selectedMeeting.id}`, {
        outcome: selectedMeeting.outcome,
        notes: selectedMeeting.notes,
        next_action: selectedMeeting.next_action,
        completed: selectedMeeting.completed,
      });
      toast.success("Meeting updated");
      setShowDetailDialog(false);
      fetchMeetings();
    } catch (error) {
      toast.error("Failed to update meeting");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.lead_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "upcoming" && !meeting.completed) ||
      (filter === "completed" && meeting.completed);
    return matchesSearch && matchesFilter;
  });

  const upcomingMeetings = filteredMeetings.filter((m) => !m.completed);
  const completedMeetings = filteredMeetings.filter((m) => m.completed);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
            Meetings
          </h2>
          <p className="text-gray-500">
            {upcomingMeetings.length} upcoming, {completedMeetings.length} completed
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1978B8] hover:bg-[#155f93]" data-testid="schedule-meeting-btn">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-['Plus_Jakarta_Sans']">Schedule Meeting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMeeting} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Lead *</Label>
                <Select
                  value={newMeeting.lead_id}
                  onValueChange={(value) =>
                    setNewMeeting({ ...newMeeting, lead_id: value })
                  }
                >
                  <SelectTrigger data-testid="meeting-lead-select">
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
                <Label>Meeting Type</Label>
                <Select
                  value={newMeeting.meeting_type}
                  onValueChange={(value) =>
                    setNewMeeting({ ...newMeeting, meeting_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={newMeeting.scheduled_at}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, scheduled_at: e.target.value })
                  }
                  data-testid="meeting-datetime-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newMeeting.notes}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, notes: e.target.value })
                  }
                  placeholder="Meeting agenda or notes..."
                  rows={3}
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
                  data-testid="save-meeting-btn"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Schedule
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
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-meetings-input"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Meetings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Meetings</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Meetings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-gray-500">No meetings found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting) => (
            <Card
              key={meeting.id}
              className={cn(
                "border-gray-200 cursor-pointer hover:border-slate-300 transition-all",
                meeting.completed && "opacity-75"
              )}
              onClick={() => {
                setSelectedMeeting(meeting);
                setShowDetailDialog(true);
              }}
              data-testid={`meeting-card-${meeting.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", meetingTypeColors[meeting.meeting_type])}
                  >
                    {meeting.meeting_type}
                  </Badge>
                  {meeting.completed ? (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Upcoming
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-gray-900">
                      {meeting.lead_company}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{formatDateTime(meeting.scheduled_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{meeting.user_name}</span>
                  </div>

                  {meeting.notes && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-2 pt-2 border-t border-slate-100">
                      {meeting.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meeting Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Plus_Jakarta_Sans']">Meeting Details</DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <form onSubmit={handleUpdateMeeting} className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F1F7FB]">
                <div className="h-10 w-10 rounded-lg bg-[#EBF5FB] flex items-center justify-center">
                  <Video className="h-5 w-5 text-[#1978B8]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.lead_company}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(selectedMeeting.scheduled_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <Textarea
                  value={selectedMeeting.outcome || ""}
                  onChange={(e) =>
                    setSelectedMeeting({
                      ...selectedMeeting,
                      outcome: e.target.value,
                    })
                  }
                  placeholder="What was the outcome of this meeting?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedMeeting.notes || ""}
                  onChange={(e) =>
                    setSelectedMeeting({
                      ...selectedMeeting,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Meeting notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Next Action</Label>
                <Input
                  value={selectedMeeting.next_action || ""}
                  onChange={(e) =>
                    setSelectedMeeting({
                      ...selectedMeeting,
                      next_action: e.target.value,
                    })
                  }
                  placeholder="What's the next step?"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F1F7FB]">
                <input
                  type="checkbox"
                  id="completed"
                  checked={selectedMeeting.completed}
                  onChange={(e) =>
                    setSelectedMeeting({
                      ...selectedMeeting,
                      completed: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="completed" className="cursor-pointer">
                  Mark as completed
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1978B8] hover:bg-[#155f93]"
                  disabled={formLoading}
                  data-testid="update-meeting-btn"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
