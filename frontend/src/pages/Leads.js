import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  cn,
  formatCurrency,
  formatDate,
  getStageColor,
  getInitials,
  LEAD_STAGES,
  LEAD_SOURCES,
} from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  ChevronRight,
  Edit,
  Loader2,
  Trash2,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Leads = () => {
  const { isAdmin, user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [newLead, setNewLead] = useState({
    company_name: "",
    website: "",
    industry: "",
    company_size: "",
    location: "",
    contact_name: "",
    contact_designation: "",
    contact_email: "",
    contact_phone: "",
    contact_linkedin: "",
    source: "Other",
    owner_id: "",
    estimated_value: 0,
    expected_close_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [stageFilter]);

  const fetchLeads = async () => {
    try {
      const params = stageFilter !== "all" ? { stage: stageFilter } : {};
      const response = await axios.get(`${API_URL}/api/leads`, { params });
      setLeads(response.data);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/sales`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.company_name || !newLead.contact_name) {
      toast.error("Company name and contact name are required");
      return;
    }

    setFormLoading(true);
    try {
      const rawPayload = {
        ...newLead,
        estimated_value: parseFloat(newLead.estimated_value) || 0,
        owner_id: newLead.owner_id || user.id,
      };
      const payload = Object.fromEntries(
        Object.entries(rawPayload).map(([k, v]) => [k, v === "" ? null : v])
      );
      await axios.post(`${API_URL}/api/leads`, payload);
      toast.success("Lead created successfully");
      setShowAddDialog(false);
      setNewLead({
        company_name: "",
        website: "",
        industry: "",
        company_size: "",
        location: "",
        contact_name: "",
        contact_designation: "",
        contact_email: "",
        contact_phone: "",
        contact_linkedin: "",
        source: "Other",
        owner_id: "",
        estimated_value: 0,
        expected_close_date: "",
        notes: "",
      });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to create lead");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    setFormLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(selectedLead).map(([k, v]) => [k, v === "" ? null : v])
      );
      await axios.put(`${API_URL}/api/leads/${selectedLead.id}`, payload);
      toast.success("Lead updated successfully");
      setShowDetailDialog(false);
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update lead");
    } finally {
      setFormLoading(false);
    }
  };

  const canDeleteLead = (lead) => {
    if (isAdmin) return true;
    return lead.owner_id === user?.id;
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    setDeleteLoading(true);
    try {
      const params = deleteReason ? { reason: deleteReason } : {};
      await axios.delete(`${API_URL}/api/leads/${leadToDelete.id}`, { params });
      toast.success(`Lead "${leadToDelete.company_name}" deleted`);
      setShowDeleteDialog(false);
      setLeadToDelete(null);
      setDeleteReason("");
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete lead");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
            Leads
          </h2>
          <p className="text-gray-500">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1978B8] hover:bg-[#155f93]" data-testid="add-lead-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Plus_Jakarta_Sans']">Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-6 mt-4">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={newLead.company_name}
                      onChange={(e) =>
                        setNewLead({ ...newLead, company_name: e.target.value })
                      }
                      placeholder="Enter company name"
                      data-testid="company-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={newLead.website}
                      onChange={(e) =>
                        setNewLead({ ...newLead, website: e.target.value })
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input
                      value={newLead.industry}
                      onChange={(e) =>
                        setNewLead({ ...newLead, industry: e.target.value })
                      }
                      placeholder="e.g., Technology"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select
                      value={newLead.company_size}
                      onValueChange={(value) =>
                        setNewLead({ ...newLead, company_size: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={newLead.location}
                      onChange={(e) =>
                        setNewLead({ ...newLead, location: e.target.value })
                      }
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Person
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      value={newLead.contact_name}
                      onChange={(e) =>
                        setNewLead({ ...newLead, contact_name: e.target.value })
                      }
                      placeholder="Enter contact name"
                      data-testid="contact-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input
                      value={newLead.contact_designation}
                      onChange={(e) =>
                        setNewLead({ ...newLead, contact_designation: e.target.value })
                      }
                      placeholder="e.g., CEO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newLead.contact_email}
                      onChange={(e) =>
                        setNewLead({ ...newLead, contact_email: e.target.value })
                      }
                      placeholder="email@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newLead.contact_phone}
                      onChange={(e) =>
                        setNewLead({ ...newLead, contact_phone: e.target.value })
                      }
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>LinkedIn Profile</Label>
                    <Input
                      value={newLead.contact_linkedin}
                      onChange={(e) =>
                        setNewLead({ ...newLead, contact_linkedin: e.target.value })
                      }
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Lead Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={newLead.source}
                      onValueChange={(value) =>
                        setNewLead({ ...newLead, source: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select
                        value={newLead.owner_id}
                        onValueChange={(value) =>
                          setNewLead({ ...newLead, owner_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Estimated Value (₹)</Label>
                    <Input
                      type="number"
                      value={newLead.estimated_value}
                      onChange={(e) =>
                        setNewLead({ ...newLead, estimated_value: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Close Date</Label>
                    <Input
                      type="date"
                      value={newLead.expected_close_date}
                      onChange={(e) =>
                        setNewLead({ ...newLead, expected_close_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newLead.notes}
                      onChange={(e) =>
                        setNewLead({ ...newLead, notes: e.target.value })
                      }
                      placeholder="Add any notes about this lead..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  data-testid="save-lead-btn"
                >
                  {formLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Lead
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-leads-input"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="stage-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {LEAD_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <Table className="data-table">
            <TableHeader>
              <TableRow className="bg-[#F1F7FB] border-b-2 border-[#C5DFF0]">
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Company</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Contact</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Stage</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Value</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Owner</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Source</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-gray-600">Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <div className="h-12 bg-slate-100 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-[#F0F7FD]"
                    onClick={() => {
                      setSelectedLead(lead);
                      setShowDetailDialog(true);
                    }}
                    data-testid={`lead-row-${lead.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.company_name}
                          </p>
                          {lead.industry && (
                            <p className="text-sm text-gray-500">{lead.industry}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{lead.contact_name}</p>
                      {lead.contact_email && (
                        <p className="text-sm text-gray-500">{lead.contact_email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getStageColor(lead.stage))}
                      >
                        {lead.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(lead.estimated_value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-[#EBF5FB] text-[#1978B8]">
                            {getInitials(lead.owner_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{lead.owner_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {canDeleteLead(lead) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToDelete(lead);
                              setDeleteReason("");
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`delete-lead-btn-${lead.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Plus_Jakarta_Sans'] flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Lead
            </DialogTitle>
          </DialogHeader>
          {leadToDelete && (
            <div className="space-y-4 mt-2">
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-1">
                <p className="font-medium text-gray-900">{leadToDelete.company_name}</p>
                <p className="text-sm text-gray-600">{leadToDelete.contact_name}</p>
                {leadToDelete.contact_email && (
                  <p className="text-sm text-gray-500">{leadToDelete.contact_email}</p>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this lead? The lead will be hidden from all views but preserved in the database.
              </p>
              <div className="space-y-2">
                <Label>Reason for deletion</Label>
                <Select value={deleteReason} onValueChange={setDeleteReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Duplicate">Duplicate</SelectItem>
                    <SelectItem value="Invalid Lead">Invalid Lead</SelectItem>
                    <SelectItem value="Spam">Spam</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteLead}
                  disabled={deleteLoading}
                  data-testid="confirm-delete-lead-btn"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Plus_Jakarta_Sans']">
              Edit Lead
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleUpdateLead} className="space-y-6 mt-4">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={selectedLead.company_name}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          company_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={selectedLead.website || ""}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          website: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select
                      value={selectedLead.stage}
                      onValueChange={(value) =>
                        setSelectedLead({ ...selectedLead, stage: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Value (₹)</Label>
                    <Input
                      type="number"
                      value={selectedLead.estimated_value}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          estimated_value: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>Assigned To</Label>
                      <Select
                        value={selectedLead.owner_id || ""}
                        onValueChange={(value) =>
                          setSelectedLead({ ...selectedLead, owner_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedLead.stage === "Closed Won" && (
                    <div className="space-y-2">
                      <Label>Final Value (₹)</Label>
                      <Input
                        type="number"
                        value={selectedLead.final_value || ""}
                        onChange={(e) =>
                          setSelectedLead({
                            ...selectedLead,
                            final_value: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Person
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={selectedLead.contact_name}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          contact_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={selectedLead.contact_email || ""}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          contact_email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={selectedLead.contact_phone || ""}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          contact_phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input
                      value={selectedLead.contact_designation || ""}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          contact_designation: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedLead.notes || ""}
                  onChange={(e) =>
                    setSelectedLead({ ...selectedLead, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  data-testid="update-lead-btn"
                >
                  {formLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
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
