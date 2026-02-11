import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUSES, TASK_PRIORITIES, DEPARTMENTS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Calendar, User, Pencil, Trash2, Search, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  department: string | null;
  created_by: string | null;
  created_at: string;
};

type Profile = { user_id: string; full_name: string };

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<{ id: string; company_name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { isOwner } = useUserRole();
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

  // Filter: role-based visibility + department + search
  const filteredTasks = tasks.filter((t) => {
    // Role-based: dispatchers only see their assigned tasks
    if (!isOwner && t.assigned_to !== user?.id) return false;
    if (activeDept && t.department !== activeDept) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDrop = async (status: "todo" | "in_progress" | "done") => {
    if (!draggedId) return;
    await supabase.from("tasks").update({ status }).eq("id", draggedId);
    setDraggedId(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const priority = (fd.get("priority") as string || "medium") as "critical" | "high" | "medium" | "low";
    const dept = fd.get("department") as string || null;
    const payload = {
      title: fd.get("title") as string,
      description: fd.get("description") as string || null,
      priority,
      assigned_to: fd.get("assigned_to") as string || null,
      due_date: fd.get("due_date") as string || null,
      department: dept as any,
    };

    if (editTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editTask.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { setEditTask(null); fetchTasks(); }
    } else {
      const { error } = await supabase.from("tasks").insert([{ ...payload, created_by: user.id }]);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else {
        const leadId = fd.get("linked_lead") as string;
        if (leadId) {
          const { data: newTask } = await supabase.from("tasks").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (newTask) await supabase.from("task_lead_links").insert({ task_id: newTask.id, lead_id: leadId });
        }
        setShowAdd(false);
        fetchTasks();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("tasks").delete().eq("id", deleteId);
    setDeleteId(null);
    fetchTasks();
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500" };
    return map[p] || "bg-muted";
  };

  const statusColumnStyle = (s: string) => {
    const map: Record<string, string> = {
      todo: "bg-muted/50 border-t-4 border-t-yellow-400",
      in_progress: "bg-muted/50 border-t-4 border-t-blue-500",
      done: "bg-muted/50 border-t-4 border-t-green-500",
    };
    return map[s] || "bg-muted/50";
  };

  const statusCardBorder = (s: string) => {
    const map: Record<string, string> = {
      todo: "hsl(45, 93%, 55%)",
      in_progress: "hsl(213, 94%, 55%)",
      done: "hsl(142, 71%, 45%)",
    };
    return map[s] || "hsl(213, 20%, 88%)";
  };

  const dueDateColor = (date: string | null) => {
    if (!date) return "text-muted-foreground";
    const today = new Date().toISOString().split("T")[0];
    if (date < today) return "text-red-500 font-semibold";
    if (date === today) return "text-amber-500 font-semibold";
    return "text-muted-foreground";
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p) => p.user_id === userId)?.full_name ?? "Unknown";
  };

  const deptLabel = (v: string | null) => DEPARTMENTS.find((d) => d.value === v)?.label;

  const isFormOpen = showAdd || !!editTask;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOwner ? "All team tasks" : "Your assigned tasks"}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={activeDept === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveDept(null)}
          >
            All
          </Button>
          {DEPARTMENTS.map((d) => (
            <Button
              key={d.value}
              variant={activeDept === d.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDept(activeDept === d.value ? null : d.value)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
        {TASK_STATUSES.map((status) => (
          <div
            key={status.value}
            className={`rounded-xl p-3 flex flex-col ${statusColumnStyle(status.value)}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status.value)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{status.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {filteredTasks.filter((t) => t.status === status.value).length}
              </Badge>
            </div>
            <div className="space-y-2 flex-1">
              {filteredTasks
                .filter((t) => t.status === status.value)
                .map((task) => (
                  <Card
                    key={task.id}
                    className="group cursor-pointer hover:shadow-md transition-all duration-200 border-l-4"
                    style={{ borderLeftColor: statusCardBorder(task.status) }}
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${priorityColor(task.priority)}`} />
                          <p className="font-semibold text-sm leading-tight">{task.title}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditTask(task); }} className="p-1 rounded hover:bg-muted">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }} className="p-1 rounded hover:bg-destructive/10">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                        {task.department && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {deptLabel(task.department)}
                          </Badge>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${dueDateColor(task.due_date)}`}><Calendar className="h-3 w-3" /> {task.due_date}</span>
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

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={() => { setShowAdd(false); setEditTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle>
            <DialogDescription>{editTask ? "Update the task details below." : "Fill in the task details to create a new task."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Title *</Label><Input name="title" defaultValue={editTask?.title ?? ""} required /></div>
            <div><Label>Description</Label><Textarea name="description" defaultValue={editTask?.description ?? ""} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue={editTask?.priority ?? "medium"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select name="department" defaultValue={editTask?.department ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To</Label>
                <Select name="assigned_to" defaultValue={editTask?.assigned_to ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input name="due_date" type="date" defaultValue={editTask?.due_date ?? ""} /></div>
            </div>
            {!editTask && (
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
            )}
            <DialogFooter><Button type="submit">{editTask ? "Save Changes" : "Create Task"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
