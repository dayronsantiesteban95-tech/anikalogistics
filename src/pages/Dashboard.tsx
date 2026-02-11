import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckSquare, AlertTriangle, Users, Building2, UserCheck, CalendarClock } from "lucide-react";
import { LEAD_STAGES, TASK_PRIORITIES, TASK_STATUSES, DEPARTMENTS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const STAGE_COLORS = ["hsl(30,100%,50%)", "hsl(200,80%,50%)", "hsl(260,60%,55%)", "hsl(340,70%,50%)", "hsl(140,60%,45%)"];
const STATUS_COLORS = ["hsl(200,80%,50%)", "hsl(40,90%,50%)", "hsl(140,60%,45%)"];

const priorityDot = (priority: string) => {
  const p = TASK_PRIORITIES.find((tp) => tp.value === priority);
  return p ? p.color : "bg-muted";
};

const deptLabel = (dept: string | null) => {
  if (!dept) return null;
  const d = DEPARTMENTS.find((dd) => dd.value === dept);
  return d?.label ?? dept;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ leads: 0, tasksDueToday: 0, overdue: 0, wonAccounts: 0, companies: 0, contacts: 0 });
  const [pipelineCounts, setPipelineCounts] = useState<{ name: string; value: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; note: string; activity_type: string; created_at: string }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Tables<"tasks">[]>([]);
  const [taskStatusCounts, setTaskStatusCounts] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const today = new Date().toISOString().split("T")[0];
      const [leadsRes, tasksTodayRes, overdueRes, wonRes, companiesRes, contactsRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("due_date", today).neq("status", "done"),
        supabase.from("leads").select("id", { count: "exact", head: true }).lt("next_action_date", today),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "account_won"),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        leads: leadsRes.count ?? 0,
        tasksDueToday: tasksTodayRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        wonAccounts: wonRes.count ?? 0,
        companies: companiesRes.count ?? 0,
        contacts: contactsRes.count ?? 0,
      });

      const { data: allLeads } = await supabase.from("leads").select("stage");
      const counts: Record<string, number> = {};
      LEAD_STAGES.forEach((s) => (counts[s.value] = 0));
      allLeads?.forEach((l) => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
      setPipelineCounts(LEAD_STAGES.map((s) => ({ name: s.label, value: counts[s.value] })));

      const { data: activity } = await supabase
        .from("lead_interactions")
        .select("id, note, activity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (activity) setRecentActivity(activity);

      // Fetch upcoming tasks (overdue first, then nearest due, non-done, limit 5)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .neq("status", "done")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(5);
      if (tasks) setUpcomingTasks(tasks);

      // Fetch all tasks for status counts
      const { data: allTasks } = await supabase.from("tasks").select("status");
      const statusCounts: Record<string, number> = {};
      TASK_STATUSES.forEach((s) => (statusCounts[s.value] = 0));
      allTasks?.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
      setTaskStatusCounts(TASK_STATUSES.map((s) => ({ name: s.label, value: statusCounts[s.value] })));
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "Active Leads", value: stats.leads, icon: TrendingUp, color: "text-accent" },
    { label: "Tasks Due Today", value: stats.tasksDueToday, icon: CheckSquare, color: "text-blue-500" },
    { label: "Overdue Follow-ups", value: stats.overdue, icon: AlertTriangle, color: "text-red-500" },
    { label: "Accounts Won", value: stats.wonAccounts, icon: Users, color: "text-green-500" },
    { label: "Companies", value: stats.companies, icon: Building2, color: "text-purple-500" },
    { label: "Contacts", value: stats.contacts, icon: UserCheck, color: "text-indigo-500" },
  ];

  const activityTypeLabel: Record<string, string> = { note: "📝", email: "📧", call: "📞", meeting: "🤝" };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome to Anika Operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow border-0 glass-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                </div>
                <s.icon className={`h-6 w-6 ${s.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <Card className="shadow-sm border-0 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineCounts} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {pipelineCounts.map((_, i) => (
                    <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-sm border-0 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              )}
              {recentActivity.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <span className="text-lg">{activityTypeLabel[a.activity_type] ?? "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1">{a.note}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <Card className="shadow-sm border-0 glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No upcoming tasks</p>
              )}
              {upcomingTasks.map((task) => {
                const isOverdue = task.due_date != null && task.due_date < today;
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate("/tasks")}
                    className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${isOverdue ? "bg-destructive/10 border border-destructive/20" : ""}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${priorityDot(task.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                      <p className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {task.due_date ? new Date(task.due_date + "T00:00:00").toLocaleDateString() : "No date"}
                        {isOverdue && " · Overdue"}
                      </p>
                    </div>
                    {task.department && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {deptLabel(task.department)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Task Status Donut */}
        <Card className="shadow-sm border-0 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Task Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={taskStatusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {taskStatusCounts.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              {taskStatusCounts.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[i] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
