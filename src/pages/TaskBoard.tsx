import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, User, Link2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
};

type Profile = { user_id: string; full_name: string };

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<{ id: string; company_name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  }, []);

  useEffect(() => {
    fetchTasks();
    supabase.from("profiles").select("user_id, full_name").then(({ data }) => { if (data) setProfiles(data); });
    supabase.from("leads").select("id, company_name").then(({ data }) => { if (data) setLeads(data); });
  }, [fetchTasks]);

  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const handleDrop = async (status: "todo" | "in_progress" | "done") => {
    if (!draggedId) return;
    await supabase.from("tasks").update({ status }).eq("id", draggedId);
    setDraggedId(null);
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const priority = (fd.get("priority") as string || "medium") as "critical" | "high" | "medium" | "low";
    const { error } = await supabase.from("tasks").insert([{
      title: fd.get("title") as string,
      description: fd.get("description") as string || null,
      priority,
      assigned_to: fd.get("assigned_to") as string || null,
      due_date: fd.get("due_date") as string || null,
      created_by: user.id,
    }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Link to lead if selected
      const leadId = fd.get("linked_lead") as string;
      if (leadId) {
        const { data: newTask } = await supabase.from("tasks").select("id").order("created_at", { ascending: false }).limit(1).single();
        if (newTask) {
          await supabase.from("task_lead_links").insert({ task_id: newTask.id, lead_id: leadId });
        }
      }
      setShowAdd(false);
      fetchTasks();
    }
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500" };
    return map[p] || "bg-muted";
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p) => p.user_id === userId)?.full_name ?? "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage team tasks and projects</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
        {TASK_STATUSES.map((status) => (
          <div
            key={status.value}
            className="bg-muted/50 rounded-xl p-3 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status.value)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{status.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {tasks.filter((t) => t.status === status.value).length}
              </Badge>
            </div>
            <div className="space-y-2 flex-1">
              {tasks
                .filter((t) => t.status === status.value)
                .map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200"
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${priorityColor(task.priority)}`} />
                        <p className="font-semibold text-sm leading-tight">{task.title}</p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {task.due_date && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {task.due_date}</span>
                        )}
                        {task.assigned_to && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {getAssigneeName(task.assigned_to)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-3">
            <div><Label>Title *</Label><Input name="title" required /></div>
            <div><Label>Description</Label><Textarea name="description" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign To</Label>
                <Select name="assigned_to">
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input name="due_date" type="date" /></div>
              <div>
                <Label>Link to Lead</Label>
                <Select name="linked_lead">
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="submit">Create Task</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
