import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckSquare, AlertTriangle, Users } from "lucide-react";
import { LEAD_STAGES } from "@/lib/constants";

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, tasksDueToday: 0, overdue: 0, wonAccounts: 0 });
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchStats() {
      const today = new Date().toISOString().split("T")[0];

      const [leadsRes, tasksTodayRes, overdueRes, wonRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("due_date", today).neq("status", "done"),
        supabase.from("leads").select("id", { count: "exact", head: true }).lt("next_action_date", today),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "account_won"),
      ]);

      setStats({
        leads: leadsRes.count ?? 0,
        tasksDueToday: tasksTodayRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        wonAccounts: wonRes.count ?? 0,
      });

      // Pipeline counts
      const { data: allLeads } = await supabase.from("leads").select("stage");
      const counts: Record<string, number> = {};
      LEAD_STAGES.forEach((s) => (counts[s.value] = 0));
      allLeads?.forEach((l) => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
      setPipelineCounts(counts);
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "Active Leads", value: stats.leads, icon: TrendingUp, color: "text-accent" },
    { label: "Tasks Due Today", value: stats.tasksDueToday, icon: CheckSquare, color: "text-blue-500" },
    { label: "Overdue Follow-ups", value: stats.overdue, icon: AlertTriangle, color: "text-red-500" },
    { label: "Accounts Won", value: stats.wonAccounts, icon: Users, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome to Anika Operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {LEAD_STAGES.map((stage) => (
              <div key={stage.value} className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3 min-w-[140px]">
                <span className="text-2xl font-bold">{pipelineCounts[stage.value] ?? 0}</span>
                <span className="text-xs text-muted-foreground leading-tight">{stage.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
