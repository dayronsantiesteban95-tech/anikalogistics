import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STAGES, ACTIVITY_TYPES, CITY_HUBS, INDUSTRIES, ACTION_ZONE_CITIES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Phone, Mail, MapPin, Package, AlertTriangle, MessageSquare,
  Pencil, Trash2, Search, Users, Crosshair,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Lead = {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string | null;
  email: string | null;
  main_lanes: string | null;
  estimated_monthly_loads: number | null;
  stage: string;
  next_action_date: string | null;
  created_at: string;
  city_hub: string | null;
  industry: string | null;
  delivery_points: string | null;
};

type Interaction = {
  id: string;
  note: string;
  activity_type: string;
  created_at: string;
};

const activityIcon = (type: string) => {
  switch (type) {
    case "email": return <Mail className="h-3 w-3 text-blue-500" />;
    case "call": return <Phone className="h-3 w-3 text-green-500" />;
    case "meeting": return <Users className="h-3 w-3 text-purple-500" />;
    default: return <MessageSquare className="h-3 w-3 text-muted-foreground" />;
  }
};

const getIndustryInfo = (value: string | null) => INDUSTRIES.find((i) => i.value === value);
const getCityLabel = (value: string | null) => CITY_HUBS.find((c) => c.value === value)?.label;

const checkActionZone = (deliveryPoints: string | null, cityHub: string | null): "in_zone" | "out_zone" | "no_data" => {
  if (!deliveryPoints) return "no_data";
  const text = deliveryPoints.toLowerCase();
  // Check against all hubs, but prioritize the lead's own hub
  const hubsToCheck = cityHub ? [cityHub, ...Object.keys(ACTION_ZONE_CITIES).filter(h => h !== cityHub)] : Object.keys(ACTION_ZONE_CITIES);
  for (const hub of hubsToCheck) {
    const cities = ACTION_ZONE_CITIES[hub];
    if (cities?.some((city) => text.includes(city))) return "in_zone";
  }
  return "out_zone";
};

const getDaysSinceContact = (leadId: string, lastContactMap: Record<string, string>): number | null => {
  const last = lastContactMap[leadId];
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
};

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activityType, setActivityType] = useState<string>("note");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [lastContactMap, setLastContactMap] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data as Lead[]);
  }, []);

  const fetchLastContacts = useCallback(async () => {
    const { data } = await supabase.rpc("get_last_contacts" as any).select("*");
    // fallback: query directly
    if (!data) {
      const { data: interactions } = await supabase
        .from("lead_interactions")
        .select("lead_id, created_at")
        .order("created_at", { ascending: false });
      if (interactions) {
        const map: Record<string, string> = {};
        for (const i of interactions) {
          if (!map[i.lead_id]) map[i.lead_id] = i.created_at;
        }
        setLastContactMap(map);
      }
      return;
    }
    const map: Record<string, string> = {};
    for (const row of data as any[]) {
      map[row.lead_id] = row.last_contact;
    }
    setLastContactMap(map);
  }, []);

  useEffect(() => { fetchLeads(); fetchLastContacts(); }, [fetchLeads, fetchLastContacts]);

  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => fetchLeads())
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_interactions" }, () => fetchLastContacts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads, fetchLastContacts]);

  const fetchInteractions = async (leadId: string) => {
    const { data } = await supabase
      .from("lead_interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (data) setInteractions(data as Interaction[]);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    fetchInteractions(lead.id);
  };

  const addInteraction = async () => {
    if (!newNote.trim() || !selectedLead || !user) return;
    const at = activityType as "note" | "email" | "call" | "meeting";
    await supabase.from("lead_interactions").insert({
      lead_id: selectedLead.id,
      note: newNote,
      activity_type: at,
      created_by: user.id,
    });
    setNewNote("");
    setActivityType("note");
    fetchInteractions(selectedLead.id);
    fetchLastContacts();
  };

  const handleDrop = async (stage: "new_lead" | "first_contact" | "quote_sent" | "negotiation" | "account_won") => {
    if (!draggedId) return;
    await supabase.from("leads").update({ stage }).eq("id", draggedId);
    setDraggedId(null);
    fetchLeads();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      company_name: fd.get("company_name") as string,
      contact_person: fd.get("contact_person") as string,
      phone: fd.get("phone") as string || null,
      email: fd.get("email") as string || null,
      main_lanes: fd.get("main_lanes") as string || null,
      estimated_monthly_loads: Number(fd.get("loads")) || null,
      next_action_date: fd.get("next_action") as string || null,
      city_hub: fd.get("city_hub") as string || null,
      industry: fd.get("industry") as string || null,
      delivery_points: fd.get("delivery_points") as string || null,
    };

    if (editLead) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editLead.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { setEditLead(null); fetchLeads(); }
    } else {
      const { error } = await supabase.from("leads").insert({ ...payload, created_by: user.id });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { setShowAdd(false); fetchLeads(); }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("leads").delete().eq("id", deleteId);
    setDeleteId(null);
    if (selectedLead?.id === deleteId) setSelectedLead(null);
    fetchLeads();
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toISOString().split("T")[0]);
  };

  const filtered = leads.filter((l) => {
    if (search && !l.company_name.toLowerCase().includes(search.toLowerCase()) && !l.contact_person.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter !== "all" && l.city_hub !== cityFilter) return false;
    if (industryFilter !== "all" && l.industry !== industryFilter) return false;
    return true;
  });

  const isFormOpen = showAdd || !!editLead;

  const isGhosting = (leadId: string) => {
    const days = getDaysSinceContact(leadId, lastContactMap);
    if (days === null) {
      // No interactions at all — check if lead is older than 10 days
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return false;
      const leadAge = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return leadAge > 10;
    }
    return days > 10;
  };

  const ghostingDays = (leadId: string) => {
    const days = getDaysSinceContact(leadId, lastContactMap);
    if (days !== null) return days;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return 0;
    return Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Growth Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your prospecting leads</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          <Button variant={cityFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setCityFilter("all")}>All</Button>
          {CITY_HUBS.map((c) => (
            <Button key={c.value} variant={cityFilter === c.value ? "default" : "outline"} size="sm" onClick={() => setCityFilter(c.value)}>
              {c.label}
            </Button>
          ))}
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map((i) => (
              <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[60vh]">
        {LEAD_STAGES.map((stage) => (
          <div
            key={stage.value}
            className="bg-muted/50 rounded-xl p-3 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage.value)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{stage.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {filtered.filter((l) => l.stage === stage.value).length}
              </Badge>
            </div>
            <div className="space-y-2 flex-1">
              {filtered
                .filter((l) => l.stage === stage.value)
                .map((lead) => {
                  const ghosting = isGhosting(lead.id);
                  const industryInfo = getIndustryInfo(lead.industry);
                  const cityLabel = getCityLabel(lead.city_hub);
                  return (
                    <Card
                      key={lead.id}
                      className={`group cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${
                        ghosting ? "border-l-[#FF6700] animate-[shake_0.5s_ease-in-out_infinite]" : "border-l-accent/50"
                      }`}
                      draggable
                      onDragStart={() => setDraggedId(lead.id)}
                      onClick={() => openLead(lead)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-sm leading-tight">{lead.company_name}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditLead(lead); }} className="p-1 rounded hover:bg-muted">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteId(lead.id); }} className="p-1 rounded hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{lead.contact_person}</p>
                        <div className="flex flex-wrap gap-1">
                          {cityLabel && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cityLabel}</Badge>}
                          {industryInfo && (
                            <Badge className={`text-[10px] px-1.5 py-0 text-white ${industryInfo.color}`}>
                              {industryInfo.label}
                            </Badge>
                          )}
                        </div>
                        {lead.main_lanes && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {lead.main_lanes}
                          </div>
                        )}
                        {lead.estimated_monthly_loads && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" /> {lead.estimated_monthly_loads} loads/mo
                          </div>
                        )}
                        {lead.next_action_date && (
                          <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue(lead.next_action_date) ? "text-red-500" : "text-muted-foreground"}`}>
                            <AlertTriangle className={`h-3 w-3 ${isOverdue(lead.next_action_date) ? "text-red-500" : ""}`} />
                            {lead.next_action_date}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {lead.delivery_points && (() => {
                            const zone = checkActionZone(lead.delivery_points, lead.city_hub);
                            return (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${zone === "in_zone" ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}`}>
                                <Crosshair className="h-2.5 w-2.5 mr-0.5" />
                                {zone === "in_zone" ? "In Zone" : "Out of Zone"}
                              </Badge>
                            );
                          })()}
                          {ghosting && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#FF6700] text-white">
                              ⚠ {ghostingDays(lead.id)}d no contact
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Lead Dialog */}
      <Dialog open={isFormOpen} onOpenChange={() => { setShowAdd(false); setEditLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>{editLead ? "Update the lead details." : "Fill in the lead information."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company Name *</Label><Input name="company_name" defaultValue={editLead?.company_name ?? ""} required /></div>
              <div><Label>Contact Person *</Label><Input name="contact_person" defaultValue={editLead?.contact_person ?? ""} required /></div>
              <div><Label>Phone</Label><Input name="phone" defaultValue={editLead?.phone ?? ""} /></div>
              <div><Label>Email</Label><Input name="email" type="email" defaultValue={editLead?.email ?? ""} /></div>
              <div><Label>Main Lanes</Label><Input name="main_lanes" defaultValue={editLead?.main_lanes ?? ""} placeholder="e.g. Miami to Dallas" /></div>
              <div><Label>Est. Monthly Loads</Label><Input name="loads" type="number" defaultValue={editLead?.estimated_monthly_loads ?? ""} /></div>
              <div>
                <Label>City Hub</Label>
                <select name="city_hub" defaultValue={editLead?.city_hub ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">None</option>
                  {CITY_HUBS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Industry</Label>
                <select name="industry" defaultValue={editLead?.industry ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">None</option>
                  {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Next Action Date</Label><Input name="next_action" type="date" defaultValue={editLead?.next_action_date ?? ""} /></div>
            <div><Label>Delivery Points</Label><Textarea name="delivery_points" defaultValue={editLead?.delivery_points ?? ""} placeholder="e.g. Fort Lauderdale, Orlando, Tampa" className="text-sm" /></div>
            <DialogFooter><Button type="submit">{editLead ? "Save Changes" : "Add Lead"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.company_name}</DialogTitle>
                <DialogDescription>Lead details and interaction history</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p><strong>Contact:</strong> {selectedLead.contact_person}</p>
                {selectedLead.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {selectedLead.phone}</p>}
                {selectedLead.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {selectedLead.email}</p>}
                {selectedLead.main_lanes && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {selectedLead.main_lanes}</p>}
                <div className="flex flex-wrap gap-1">
                  {getCityLabel(selectedLead.city_hub) && <Badge variant="outline">{getCityLabel(selectedLead.city_hub)}</Badge>}
                  {getIndustryInfo(selectedLead.industry) && (
                    <Badge className={`text-white ${getIndustryInfo(selectedLead.industry)!.color}`}>
                      {getIndustryInfo(selectedLead.industry)!.label}
                    </Badge>
                  )}
                </div>
                {selectedLead.delivery_points && (
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-3 w-3" />
                    <span>{selectedLead.delivery_points}</span>
                    {(() => {
                      const zone = checkActionZone(selectedLead.delivery_points, selectedLead.city_hub);
                      return (
                        <Badge variant="outline" className={zone === "in_zone" ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}>
                          {zone === "in_zone" ? "In Zone" : "Out of Zone"}
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Activity Log</h4>
                <div className="flex gap-2">
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Log activity..." className="text-sm flex-1" />
                  <Button onClick={addInteraction} size="sm" className="self-end">Log</Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {interactions.map((i) => (
                    <div key={i.id} className="bg-muted rounded-lg p-3 text-sm flex gap-2">
                      <div className="mt-0.5">{activityIcon(i.activity_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{i.activity_type}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
                        </div>
                        <p>{i.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the lead and all its interactions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
