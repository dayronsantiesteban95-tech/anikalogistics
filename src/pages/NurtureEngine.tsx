import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Mail, Phone, Clock, ChevronDown, Copy, Plus, Pencil, Trash2,
  Play, CheckCircle, PhoneCall, AlertCircle,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

type LeadWithSequences = {
  id: string;
  company_name: string;
  contact_person: string;
  city_hub: string | null;
  industry: string | null;
  stage: string;
};

type SequenceStep = {
  id: string;
  lead_id: string;
  step_type: string;
  status: string;
  follow_up_date: string | null;
  sent_at: string | null;
  response_status: string;
  created_at: string;
  leads?: LeadWithSequences;
};

type EmailTemplate = {
  id: string;
  name: string;
  hub: string;
  step_type: string;
  subject: string;
  body: string;
  created_by: string | null;
};

const STEP_LABELS: Record<string, string> = {
  email_1: "Email 1",
  email_2: "Email 2",
  call: "Call",
};

const STEP_ICONS: Record<string, React.ReactNode> = {
  email_1: <Mail className="h-3.5 w-3.5" />,
  email_2: <Mail className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
};

const HUBS = ["Miami", "Phoenix", "LA"];

export default function NurtureEngine() {
  const { user } = useAuth();
  const { isOwner } = useUserRole();
  const { toast } = useToast();

  // Follow-Up Today
  const [followUps, setFollowUps] = useState<SequenceStep[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<Record<string, LeadWithSequences>>({});

  // Sequence Tracker
  const [trackerLeads, setTrackerLeads] = useState<LeadWithSequences[]>([]);
  const [leadSequences, setLeadSequences] = useState<Record<string, SequenceStep[]>>({});
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Template Library
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [hubFilter, setHubFilter] = useState("all");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // ── Fetch Follow-Up Today ──
  const fetchFollowUps = useCallback(async () => {
    const { data } = await supabase
      .from("lead_sequences")
      .select("*")
      .lte("follow_up_date", today)
      .eq("status", "pending")
      .order("follow_up_date", { ascending: true });
    if (!data) return;
    setFollowUps(data as SequenceStep[]);
    // fetch associated leads
    const leadIds = [...new Set(data.map((d: any) => d.lead_id))];
    if (leadIds.length) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, company_name, contact_person, city_hub, industry, stage")
        .in("id", leadIds);
      if (leads) {
        const map: Record<string, LeadWithSequences> = {};
        for (const l of leads) map[l.id] = l as LeadWithSequences;
        setFollowUpLeads(map);
      }
    }
  }, [today]);

  // ── Fetch Sequence Tracker ──
  const fetchTracker = useCallback(async () => {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, company_name, contact_person, city_hub, industry, stage")
      .eq("stage", "new_lead")
      .order("created_at", { ascending: false });
    if (!leads) return;
    setTrackerLeads(leads as LeadWithSequences[]);
    const leadIds = leads.map((l: any) => l.id);
    if (leadIds.length) {
      const { data: seqs } = await supabase
        .from("lead_sequences")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: true });
      if (seqs) {
        const map: Record<string, SequenceStep[]> = {};
        for (const s of seqs as SequenceStep[]) {
          if (!map[s.lead_id]) map[s.lead_id] = [];
          map[s.lead_id].push(s);
        }
        setLeadSequences(map);
      }
    }
  }, []);

  // ── Fetch Templates ──
  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("hub", { ascending: true });
    if (data) setTemplates(data as EmailTemplate[]);
  }, []);

  useEffect(() => {
    fetchFollowUps();
    fetchTracker();
    fetchTemplates();
  }, [fetchFollowUps, fetchTracker, fetchTemplates]);

  // ── Bifurcation Actions ──
  const handleNoResponse = async (step: SequenceStep) => {
    const newDate = format(addDays(new Date(), 3), "yyyy-MM-dd");
    await supabase.from("lead_sequences").update({
      follow_up_date: newDate,
      response_status: "no_response",
    }).eq("id", step.id);
    toast({ title: "Follow-up rescheduled", description: `Next follow-up set for ${newDate}` });
    fetchFollowUps();
    fetchTracker();
  };

  const handleReplied = async (step: SequenceStep) => {
    if (!user) return;
    // Update sequence step
    await supabase.from("lead_sequences").update({
      status: "completed",
      response_status: "replied",
    }).eq("id", step.id);
    // Move lead to qualified
    await supabase.from("leads").update({ stage: "qualified" as any }).eq("id", step.lead_id);
    // Create task
    const lead = followUpLeads[step.lead_id] || trackerLeads.find(l => l.id === step.lead_id);
    const taskTitle = `Call ${lead?.company_name || "lead"} - they replied!`;
    await supabase.from("tasks").insert({
      title: taskTitle,
      status: "todo" as any,
      priority: "high" as any,
      department: "prospecting" as any,
      created_by: user.id,
    });
    toast({ title: "🎉 Lead Replied!", description: `${lead?.company_name} moved to Qualified. Task created.` });
    fetchFollowUps();
    fetchTracker();
  };

  const handleInterestedCall = async (step: SequenceStep) => {
    await supabase.from("lead_sequences").update({
      response_status: "interested_call",
    }).eq("id", step.id);
    toast({ title: "Interested in Call", description: "Lead highlighted for call scheduling." });
    fetchFollowUps();
    fetchTracker();
  };

  // ── Start Sequence ──
  const startSequence = async (leadId: string) => {
    if (!user) return;
    const steps = [
      { step_type: "email_1", follow_up_date: today },
      { step_type: "email_2", follow_up_date: format(addDays(new Date(), 3), "yyyy-MM-dd") },
      { step_type: "call", follow_up_date: format(addDays(new Date(), 7), "yyyy-MM-dd") },
    ];
    const rows = steps.map(s => ({
      lead_id: leadId,
      step_type: s.step_type,
      status: "pending",
      follow_up_date: s.follow_up_date,
      response_status: "no_response",
      created_by: user.id,
    }));
    await supabase.from("lead_sequences").insert(rows);
    toast({ title: "Sequence Started", description: "3-step outreach sequence created." });
    fetchTracker();
  };

  // ── Template CRUD ──
  const handleTemplateSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      hub: fd.get("hub") as string,
      step_type: fd.get("step_type") as string,
      subject: fd.get("subject") as string,
      body: fd.get("body") as string,
    };
    if (editTemplate) {
      await supabase.from("email_templates").update(payload).eq("id", editTemplate.id);
      toast({ title: "Template updated" });
    } else {
      await supabase.from("email_templates").insert({ ...payload, created_by: user.id });
      toast({ title: "Template created" });
    }
    setShowTemplateForm(false);
    setEditTemplate(null);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("email_templates").delete().eq("id", id);
    fetchTemplates();
    toast({ title: "Template deleted" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  // ── Helpers ──
  const daysOverdue = (date: string | null) => {
    if (!date) return 0;
    return differenceInDays(new Date(), new Date(date));
  };

  const stepBadgeColor = (status: string) => {
    if (status === "completed") return "bg-green-500/10 text-green-600 border-green-500/30";
    if (status === "skipped") return "bg-muted text-muted-foreground";
    return "bg-primary/10 text-primary border-primary/30";
  };

  const filteredTemplates = hubFilter === "all" ? templates : templates.filter(t => t.hub === hubFilter);

  // ── Bifurcation buttons component ──
  const BifurcationButtons = ({ step }: { step: SequenceStep }) => (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={() => handleNoResponse(step)} className="gap-1.5 text-xs">
        <Clock className="h-3 w-3" /> No Response
      </Button>
      <Button size="sm" variant="outline" onClick={() => handleReplied(step)} className="gap-1.5 text-xs border-green-500/50 text-green-600 hover:bg-green-500/10">
        <CheckCircle className="h-3 w-3" /> Replied
      </Button>
      <Button size="sm" variant="outline" onClick={() => handleInterestedCall(step)} className="gap-1.5 text-xs border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10">
        <PhoneCall className="h-3 w-3" /> Interested in Call
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nurture Engine</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage pre-qualification outreach sequences</p>
      </div>

      <Tabs defaultValue="follow-up">
        <TabsList>
          <TabsTrigger value="follow-up" className="gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> Follow-Up Today
            {followUps.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{followUps.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tracker" className="gap-1.5">
            <Play className="h-3.5 w-3.5" /> Sequence Tracker
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Template Library
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Follow-Up Today ── */}
        <TabsContent value="follow-up">
          {followUps.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No follow-ups due today.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {followUps.map((step) => {
                const lead = followUpLeads[step.lead_id];
                const overdue = daysOverdue(step.follow_up_date);
                const isInterested = step.response_status === "interested_call";
                return (
                  <Card key={step.id} className={`transition-all ${isInterested ? "border-l-4 border-l-green-500" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${stepBadgeColor(step.status)}`}>
                            {STEP_ICONS[step.step_type] || <Mail className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{lead?.company_name || "Unknown Lead"}</p>
                            <p className="text-xs text-muted-foreground">{lead?.contact_person} · {lead?.city_hub || "No Hub"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{STEP_LABELS[step.step_type] || step.step_type}</Badge>
                          {overdue > 0 && (
                            <Badge variant="destructive" className="text-xs">{overdue}d overdue</Badge>
                          )}
                          {isInterested && (
                            <Badge className="bg-green-500 text-white text-xs">🟢 Wants Call</Badge>
                          )}
                        </div>
                      </div>
                      <BifurcationButtons step={step} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: Sequence Tracker ── */}
        <TabsContent value="tracker">
          {trackerLeads.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <p className="font-medium">No leads in "New Lead" stage</p>
              <p className="text-sm">Add leads from the Growth Pipeline to start sequences.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {trackerLeads.map((lead) => {
                const seqs = leadSequences[lead.id] || [];
                const hasSequence = seqs.length > 0;
                const isInterested = seqs.some(s => s.response_status === "interested_call");
                return (
                  <Collapsible key={lead.id} open={expandedLead === lead.id} onOpenChange={(open) => setExpandedLead(open ? lead.id : null)}>
                    <Card className={`transition-all ${isInterested ? "border-l-4 border-l-green-500" : ""}`}>
                      <CollapsibleTrigger className="w-full">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-semibold text-sm text-left">{lead.company_name}</p>
                              <p className="text-xs text-muted-foreground">{lead.contact_person} · {lead.city_hub || "No Hub"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasSequence ? (
                              <div className="flex gap-1">
                                {["email_1", "email_2", "call"].map(st => {
                                  const s = seqs.find(x => x.step_type === st);
                                  return (
                                    <div key={st} className={`w-2.5 h-2.5 rounded-full ${
                                      s?.status === "completed" ? "bg-green-500" :
                                      s?.status === "pending" ? "bg-primary" : "bg-muted"
                                    }`} title={`${STEP_LABELS[st]}: ${s?.status || "not started"}`} />
                                  );
                                })}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">No sequence</Badge>
                            )}
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t pt-3">
                          {hasSequence ? (
                            <div className="space-y-3">
                              {seqs.map((step, i) => (
                                <div key={step.id} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`p-1.5 rounded-full ${stepBadgeColor(step.status)}`}>
                                      {STEP_ICONS[step.step_type] || <Mail className="h-3 w-3" />}
                                    </div>
                                    {i < seqs.length - 1 && <div className="w-px h-6 bg-border" />}
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium">{STEP_LABELS[step.step_type] || step.step_type}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {step.status === "completed" && step.sent_at ? `Sent ${format(new Date(step.sent_at), "MMM d")}` :
                                           step.follow_up_date ? `Due ${format(new Date(step.follow_up_date), "MMM d")}` : "No date"}
                                        </p>
                                      </div>
                                      <Badge variant="outline" className={`text-[10px] ${stepBadgeColor(step.status)}`}>
                                        {step.status}
                                      </Badge>
                                    </div>
                                    {step.status === "pending" && <BifurcationButtons step={step} />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-3">
                              <Button size="sm" onClick={() => startSequence(lead.id)} className="gap-1.5">
                                <Play className="h-3.5 w-3.5" /> Start Sequence
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: Template Library ── */}
        <TabsContent value="templates">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              <Button variant={hubFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setHubFilter("all")}>All</Button>
              {HUBS.map(h => (
                <Button key={h} variant={hubFilter === h ? "default" : "outline"} size="sm" onClick={() => setHubFilter(h)}>{h}</Button>
              ))}
            </div>
            {isOwner && (
              <Button size="sm" onClick={() => { setEditTemplate(null); setShowTemplateForm(true); }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Template
              </Button>
            )}
          </div>

          {filteredTemplates.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm">
                {isOwner ? "Create your first email template for your team." : "Your team lead hasn't added templates yet."}
              </p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(t => (
                <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.subject}</p>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px]">{t.hub}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{STEP_LABELS[t.step_type] || t.step_type}</Badge>
                      </div>
                    </div>
                    {expandedTemplate === t.id && (
                      <div className="pt-2 border-t space-y-3">
                        <p className="text-sm whitespace-pre-wrap">{t.body}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyToClipboard(`Subject: ${t.subject}\n\n${t.body}`); }} className="gap-1.5">
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                          {isOwner && (
                            <>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditTemplate(t); setShowTemplateForm(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} className="text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Form Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={() => { setShowTemplateForm(false); setEditTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>Create email templates for your dispatchers.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTemplateSave} className="space-y-3">
            <div>
              <Label>Template Name</Label>
              <Input name="name" defaultValue={editTemplate?.name ?? ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hub</Label>
                <Select name="hub" defaultValue={editTemplate?.hub ?? "Miami"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HUBS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Step Type</Label>
                <Select name="step_type" defaultValue={editTemplate?.step_type ?? "email_1"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_1">Email 1</SelectItem>
                    <SelectItem value="email_2">Email 2</SelectItem>
                    <SelectItem value="call_script">Call Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input name="subject" defaultValue={editTemplate?.subject ?? ""} required />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea name="body" defaultValue={editTemplate?.body ?? ""} required rows={6} />
            </div>
            <DialogFooter>
              <Button type="submit">{editTemplate ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
