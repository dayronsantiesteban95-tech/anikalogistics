import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STAGES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Phone, Mail, MapPin, Package, AlertTriangle, MessageSquare } from "lucide-react";
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
};

type Interaction = {
  id: string;
  note: string;
  created_at: string;
};

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newNote, setNewNote] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data as Lead[]);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const fetchInteractions = async (leadId: string) => {
    const { data } = await supabase.from("lead_interactions").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    if (data) setInteractions(data as Interaction[]);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    fetchInteractions(lead.id);
  };

  const addInteraction = async () => {
    if (!newNote.trim() || !selectedLead || !user) return;
    await supabase.from("lead_interactions").insert({ lead_id: selectedLead.id, note: newNote, created_by: user.id });
    setNewNote("");
    fetchInteractions(selectedLead.id);
  };

  const handleDrop = async (stage: "new_lead" | "first_contact" | "quote_sent" | "negotiation" | "account_won") => {
    if (!draggedId) return;
    await supabase.from("leads").update({ stage }).eq("id", draggedId);
    setDraggedId(null);
    fetchLeads();
  };

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("leads").insert({
      company_name: fd.get("company_name") as string,
      contact_person: fd.get("contact_person") as string,
      phone: fd.get("phone") as string || null,
      email: fd.get("email") as string || null,
      main_lanes: fd.get("main_lanes") as string || null,
      estimated_monthly_loads: Number(fd.get("loads")) || null,
      next_action_date: fd.get("next_action") as string || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowAdd(false);
      fetchLeads();
    }
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().toISOString().split("T")[0]);
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
                {leads.filter((l) => l.stage === stage.value).length}
              </Badge>
            </div>
            <div className="space-y-2 flex-1">
              {leads
                .filter((l) => l.stage === stage.value)
                .map((lead) => (
                  <Card
                    key={lead.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-accent/50"
                    draggable
                    onDragStart={() => setDraggedId(lead.id)}
                    onClick={() => openLead(lead)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <p className="font-semibold text-sm leading-tight">{lead.company_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.contact_person}</p>
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
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company Name *</Label><Input name="company_name" required /></div>
              <div><Label>Contact Person *</Label><Input name="contact_person" required /></div>
              <div><Label>Phone</Label><Input name="phone" /></div>
              <div><Label>Email</Label><Input name="email" type="email" /></div>
              <div><Label>Main Lanes</Label><Input name="main_lanes" placeholder="e.g. Miami to Dallas" /></div>
              <div><Label>Est. Monthly Loads</Label><Input name="loads" type="number" /></div>
            </div>
            <div><Label>Next Action Date</Label><Input name="next_action" type="date" /></div>
            <DialogFooter><Button type="submit">Add Lead</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.company_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p><strong>Contact:</strong> {selectedLead.contact_person}</p>
                {selectedLead.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {selectedLead.phone}</p>}
                {selectedLead.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {selectedLead.email}</p>}
                {selectedLead.main_lanes && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {selectedLead.main_lanes}</p>}
              </div>

              <div className="mt-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Interaction Log</h4>
                <div className="flex gap-2">
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Log an interaction..." className="text-sm" />
                  <Button onClick={addInteraction} size="sm" className="self-end">Add</Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {interactions.map((i) => (
                    <div key={i.id} className="bg-muted rounded-lg p-3 text-sm">
                      <p>{i.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(i.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
