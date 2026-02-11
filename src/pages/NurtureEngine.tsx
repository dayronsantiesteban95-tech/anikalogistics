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
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Mail, Phone, Clock, ChevronDown, ChevronRight, Copy, Plus, Pencil, Trash2,
  Play, CheckCircle, PhoneCall, AlertCircle, Settings, RotateCcw, Snowflake, ArrowRight,
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
  note: string | null;
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

type NurtureSettings = {
  email1_to_email2_days: number;
  email2_to_call_days: number;
  no_response_snooze_days: number;
};

const DEFAULT_SETTINGS: NurtureSettings = {
  email1_to_email2_days: 3,
  email2_to_call_days: 4,
  no_response_snooze_days: 3,
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

// ── Visual Decision Tree ──
function DecisionTree() {
  const steps = [
    { key: "email_1", label: "Email 1", icon: <Mail className="h-4 w-4" /> },
    { key: "email_2", label: "Email 2", icon: <Mail className="h-4 w-4" /> },
    { key: "call", label: "Call", icon: <Phone className="h-4 w-4" /> },
  ];
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Decision Flow</p>
        <div className="flex items-start gap-0 overflow-x-auto">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-start">
              {/* Step column */}
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium text-xs border border-primary/20">
                  {step.icon} {step.label}
                </div>
                {/* Branches */}
                <div className="flex gap-4 mt-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-3 bg-green-500" />
                    <span className="text-[9px] text-green-600 font-medium">Replied</span>
                    <div className="w-px h-2 bg-green-500" />
                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-green-500/30 text-green-600">QUALIFIED</Badge>
                    <div className="w-px h-2 bg-emerald-500" />
                    <span className="text-[9px] text-emerald-600 font-medium">Interested</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-500/30 text-emerald-600">🟢 FLAG</Badge>
                  </div>
                </div>
              </div>
              {/* Arrow to next step */}
              {i < steps.length - 1 && (
                <div className="flex flex-col items-center mt-2 mx-1">
                  <span className="text-[9px] text-muted-foreground mb-0.5">No Response</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Progress Bar (3 segments) ──
function SequenceProgressBar({ steps }: { steps: SequenceStep[] }) {
  const ordered = ["email_1", "email_2", "call"];
  return (
    <div className="flex gap-0.5">
      {ordered.map((st) => {
        const s = steps.find((x) => x.step_type === st);
        let color = "bg-muted";
        if (s?.status === "completed") color = "bg-green-500";
        else if (s?.status === "pending") color = "bg-primary";
        return <div key={st} className={`h-1.5 w-6 rounded-full ${color}`} title={`${STEP_LABELS[st]}: ${s?.status || "not started"}`} />;
      })}
    </div>
  );
}

export default function NurtureEngine() {
  const { user } = useAuth();
  const { isOwner } = useUserRole();
  const { toast } = useToast();

  // Settings
  const [settings, setSettings] = useState<NurtureSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);

  // Follow-Up Today
  const [followUps, setFollowUps] = useState<SequenceStep[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<Record<string, LeadWithSequences>>({});

  // Sequence Tracker
  const [trackerLeads, setTrackerLeads] = useState<LeadWithSequences[]>([]);
  const [leadSequences, setLeadSequences] = useState<Record<string, SequenceStep[]>>({});
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Cold leads
  const [coldLeads, setColdLeads] = useState<{ lead: LeadWithSequences; steps: SequenceStep[] }[]>([]);
  const [showCold, setShowCold] = useState(false);

  // Template Library
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [hubFilter, setHubFilter] = useState("all");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Bifurcation note popover
  const [noteText, setNoteText] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  // ── Fetch Settings ──
  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("nurture_settings").select("setting_key, setting_value");
    if (data) {
      const s = { ...DEFAULT_SETTINGS };
      for (const row of data) {
        const key = row.setting_key as keyof NurtureSettings;
        if (key in s) (s as any)[key] = parseInt(row.setting_value) || (DEFAULT_SETTINGS as any)[key];
      }
      setSettings(s);
      setSettingsForm(s);
    }
  }, []);

  // ── Save Settings ──
  const saveSettings = async () => {
    if (!user) return;
    const entries = Object.entries(settingsForm) as [string, number][];
    for (const [key, value] of entries) {
      await supabase.from("nurture_settings").upsert(
        { setting_key: key, setting_value: String(value), updated_by: user.id },
        { onConflict: "setting_key" }
      );
    }
    setSettings(settingsForm);
    setShowSettings(false);
    toast({ title: "Settings saved" });
  };

  // ── Fetch Follow-Up Today ──
  const fetchFollowUps = useCallback(async () => {
    const { data } = await supabase
      .from("lead_sequences")
      .select("*")
      .lte("follow_up_date", today)
      .eq("status", "pending")
      .neq("response_status", "cold")
      .order("follow_up_date", { ascending: true });
    if (!data) return;
    setFollowUps(data as SequenceStep[]);
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
        const coldMap: { lead: LeadWithSequences; steps: SequenceStep[] }[] = [];
        for (const s of seqs as SequenceStep[]) {
          if (!map[s.lead_id]) map[s.lead_id] = [];
          map[s.lead_id].push(s);
        }
        // Identify cold leads
        for (const lead of leads as LeadWithSequences[]) {
          const steps = map[lead.id] || [];
          if (steps.length > 0 && steps.some((s) => s.response_status === "cold")) {
            coldMap.push({ lead, steps });
          }
        }
        setLeadSequences(map);
        setColdLeads(coldMap);
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
    fetchSettings();
    fetchFollowUps();
    fetchTracker();
    fetchTemplates();
  }, [fetchSettings, fetchFollowUps, fetchTracker, fetchTemplates]);

  // ── Find matching template ──
  const findTemplate = (hub: string | null, stepType: string) => {
    if (!hub) return null;
    return templates.find((t) => t.hub.toLowerCase() === hub.toLowerCase() && t.step_type === stepType) || null;
  };

  // ── Bifurcation Actions ──
  const handleNoResponse = async (step: SequenceStep, note?: string) => {
    const newDate = format(addDays(new Date(), settings.no_response_snooze_days), "yyyy-MM-dd");
    await supabase.from("lead_sequences").update({
      follow_up_date: newDate,
      response_status: "no_response",
      ...(note ? { note } : {}),
    }).eq("id", step.id);
    toast({ title: "Follow-up rescheduled", description: `Next follow-up in ${settings.no_response_snooze_days} days` });
    fetchFollowUps();
    fetchTracker();
  };

  const handleReplied = async (step: SequenceStep, note?: string) => {
    if (!user) return;
    await supabase.from("lead_sequences").update({
      status: "completed",
      response_status: "replied",
      ...(note ? { note } : {}),
    }).eq("id", step.id);
    await supabase.from("leads").update({ stage: "qualified" as any }).eq("id", step.lead_id);
    const lead = followUpLeads[step.lead_id] || trackerLeads.find((l) => l.id === step.lead_id);
    await supabase.from("tasks").insert({
      title: `Call ${lead?.company_name || "lead"} - they replied!`,
      status: "todo" as any,
      priority: "high" as any,
      department: "prospecting" as any,
      created_by: user.id,
    });
    toast({ title: "🎉 Lead Replied!", description: `${lead?.company_name} moved to Qualified.` });
    fetchFollowUps();
    fetchTracker();
  };

  const handleInterestedCall = async (step: SequenceStep, note?: string) => {
    await supabase.from("lead_sequences").update({
      response_status: "interested_call",
      ...(note ? { note } : {}),
    }).eq("id", step.id);
    toast({ title: "Interested in Call", description: "Lead highlighted for call scheduling." });
    fetchFollowUps();
    fetchTracker();
  };

  // ── End-of-Sequence Actions ──
  const isSequenceExhausted = (steps: SequenceStep[]) => {
    if (steps.length === 0) return false;
    const allSteps = ["email_1", "email_2", "call"];
    return allSteps.every((st) => {
      const s = steps.find((x) => x.step_type === st);
      return s && (s.status === "completed" || s.response_status === "no_response");
    });
  };

  const restartSequence = async (leadId: string) => {
    if (!user) return;
    const e2Days = settings.email1_to_email2_days;
    const callDays = e2Days + settings.email2_to_call_days;
    const rows = [
      { lead_id: leadId, step_type: "email_1", status: "pending", follow_up_date: today, response_status: "no_response", created_by: user.id },
      { lead_id: leadId, step_type: "email_2", status: "pending", follow_up_date: format(addDays(new Date(), e2Days), "yyyy-MM-dd"), response_status: "no_response", created_by: user.id },
      { lead_id: leadId, step_type: "call", status: "pending", follow_up_date: format(addDays(new Date(), callDays), "yyyy-MM-dd"), response_status: "no_response", created_by: user.id },
    ];
    await supabase.from("lead_sequences").insert(rows);
    toast({ title: "Sequence restarted", description: "New 3-step cycle created." });
    fetchTracker();
    fetchFollowUps();
  };

  const markCold = async (leadId: string, steps: SequenceStep[]) => {
    const lastStep = steps[steps.length - 1];
    if (lastStep) {
      await supabase.from("lead_sequences").update({ response_status: "cold" }).eq("id", lastStep.id);
    }
    toast({ title: "Lead marked cold", description: "Moved to Cold Leads section." });
    fetchTracker();
    fetchFollowUps();
  };

  const reviveLead = async (leadId: string) => {
    // Remove cold status from all steps
    const steps = leadSequences[leadId] || [];
    for (const s of steps) {
      if (s.response_status === "cold") {
        await supabase.from("lead_sequences").update({ response_status: "no_response" }).eq("id", s.id);
      }
    }
    toast({ title: "Lead revived", description: "Lead is back in the tracker." });
    fetchTracker();
  };

  // ── Start Sequence (uses settings) ──
  const startSequence = async (leadId: string) => {
    if (!user) return;
    const e2Days = settings.email1_to_email2_days;
    const callDays = e2Days + settings.email2_to_call_days;
    const rows = [
      { lead_id: leadId, step_type: "email_1", status: "pending", follow_up_date: today, response_status: "no_response", created_by: user.id },
      { lead_id: leadId, step_type: "email_2", status: "pending", follow_up_date: format(addDays(new Date(), e2Days), "yyyy-MM-dd"), response_status: "no_response", created_by: user.id },
      { lead_id: leadId, step_type: "call", status: "pending", follow_up_date: format(addDays(new Date(), callDays), "yyyy-MM-dd"), response_status: "no_response", created_by: user.id },
    ];
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

  const filteredTemplates = hubFilter === "all" ? templates : templates.filter((t) => t.hub === hubFilter);

  // Filter out cold leads from tracker
  const activeColdIds = new Set(coldLeads.map((c) => c.lead.id));
  const activeTrackerLeads = trackerLeads.filter((l) => !activeColdIds.has(l.id));

  // ── Bifurcation buttons with note popover ──
  const BifurcationButtons = ({ step, lead }: { step: SequenceStep; lead?: LeadWithSequences }) => {
    const matchedTemplate = findTemplate(lead?.city_hub || null, step.step_type);

    return (
      <div className="space-y-2">
        {/* Template suggestion */}
        {matchedTemplate && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50 border border-accent">
            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {matchedTemplate.name}: <span className="italic">{matchedTemplate.subject}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => copyToClipboard(`Subject: ${matchedTemplate.subject}\n\n${matchedTemplate.body}`)}
            >
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <BifurcationAction label="No Response" icon={<Clock className="h-3 w-3" />} variant="outline" onConfirm={(note) => handleNoResponse(step, note)} />
          <BifurcationAction label="Replied" icon={<CheckCircle className="h-3 w-3" />} variant="outline" className="border-green-500/50 text-green-600 hover:bg-green-500/10" onConfirm={(note) => handleReplied(step, note)} />
          <BifurcationAction label="Interested in Call" icon={<PhoneCall className="h-3 w-3" />} variant="outline" className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10" onConfirm={(note) => handleInterestedCall(step, note)} />
        </div>
        {step.note && (
          <p className="text-xs text-muted-foreground italic pl-1">📝 {step.note}</p>
        )}
      </div>
    );
  };

  // ── Bifurcation Action with Note Popover ──
  const BifurcationAction = ({
    label, icon, variant, className: cls, onConfirm,
  }: {
    label: string;
    icon: React.ReactNode;
    variant: "outline" | "default";
    className?: string;
    onConfirm: (note?: string) => void;
  }) => {
    const [localNote, setLocalNote] = useState("");
    const [open, setOpen] = useState(false);
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant={variant} className={`gap-1.5 text-xs ${cls || ""}`}>
            {icon} {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2" align="start">
          <p className="text-xs font-medium">{label}</p>
          <Textarea
            placeholder="Add a note (optional)..."
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              onConfirm(localNote || undefined);
              setLocalNote("");
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nurture Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage pre-qualification outreach sequences</p>
        </div>
        {isOwner && (
          <Button variant="outline" size="icon" onClick={() => { setSettingsForm(settings); setShowSettings(true); }}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
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
                      <BifurcationButtons step={step} lead={lead} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: Sequence Tracker ── */}
        <TabsContent value="tracker">
          <DecisionTree />
          {activeTrackerLeads.length === 0 && coldLeads.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <p className="font-medium">No leads in "New Lead" stage</p>
              <p className="text-sm">Add leads from the Growth Pipeline to start sequences.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {activeTrackerLeads.map((lead) => {
                const seqs = leadSequences[lead.id] || [];
                const hasSequence = seqs.length > 0;
                const isInterested = seqs.some((s) => s.response_status === "interested_call");
                const exhausted = isSequenceExhausted(seqs);
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
                              <SequenceProgressBar steps={seqs} />
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
                                    {step.status === "pending" && <BifurcationButtons step={step} lead={lead} />}
                                    {step.note && step.status !== "pending" && (
                                      <p className="text-xs text-muted-foreground italic">📝 {step.note}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {/* End-of-sequence actions */}
                              {exhausted && (
                                <div className="flex gap-2 pt-2 border-t">
                                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => restartSequence(lead.id)}>
                                    <RotateCcw className="h-3 w-3" /> Restart Sequence
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1.5 text-xs text-blue-600 border-blue-500/50 hover:bg-blue-500/10" onClick={() => markCold(lead.id, seqs)}>
                                    <Snowflake className="h-3 w-3" /> Mark Cold
                                  </Button>
                                </div>
                              )}
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

              {/* Cold Leads Section */}
              {coldLeads.length > 0 && (
                <Collapsible open={showCold} onOpenChange={setShowCold}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {showCold ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Snowflake className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Cold Leads ({coldLeads.length})</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-1">
                      {coldLeads.map(({ lead }) => (
                        <Card key={lead.id} className="border-blue-500/20 bg-blue-500/5">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{lead.company_name}</p>
                              <p className="text-xs text-muted-foreground">{lead.contact_person} · {lead.city_hub || "No Hub"}</p>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => reviveLead(lead.id)}>
                              <RotateCcw className="h-3 w-3" /> Revive
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: Template Library ── */}
        <TabsContent value="templates">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              <Button variant={hubFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setHubFilter("all")}>All</Button>
              {HUBS.map((h) => (
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
              {filteredTemplates.map((t) => (
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
                    {HUBS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sequence Settings</DialogTitle>
            <DialogDescription>Configure the cadence for outreach sequences.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Days: Email 1 → Email 2</Label>
              <Input type="number" min={1} max={30} value={settingsForm.email1_to_email2_days} onChange={(e) => setSettingsForm((p) => ({ ...p, email1_to_email2_days: parseInt(e.target.value) || 3 }))} />
            </div>
            <div>
              <Label className="text-xs">Days: Email 2 → Call</Label>
              <Input type="number" min={1} max={30} value={settingsForm.email2_to_call_days} onChange={(e) => setSettingsForm((p) => ({ ...p, email2_to_call_days: parseInt(e.target.value) || 4 }))} />
            </div>
            <div>
              <Label className="text-xs">Days: "No Response" snooze</Label>
              <Input type="number" min={1} max={30} value={settingsForm.no_response_snooze_days} onChange={(e) => setSettingsForm((p) => ({ ...p, no_response_snooze_days: parseInt(e.target.value) || 3 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
