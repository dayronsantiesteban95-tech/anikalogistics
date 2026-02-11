export const TEAM_MEMBERS = [
  { name: "Dayron Santiesteban", role: "owner" as const },
  { name: "Reinaldo Neira", role: "owner" as const },
  { name: "Andres Villegas", role: "owner" as const },
  { name: "Juan Pedraza", role: "dispatcher" as const },
  { name: "Daniela Villegas", role: "dispatcher" as const },
  { name: "Rosalia Dominguez", role: "dispatcher" as const },
  { name: "Dana Perez", role: "dispatcher" as const },
];

export const LEAD_STAGES = [
  { value: "new_lead", label: "New Lead" },
  { value: "first_contact", label: "First Contact" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "account_won", label: "Account Won" },
] as const;

export const TASK_PRIORITIES = [
  { value: "critical", label: "Critical", color: "bg-red-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "low", label: "Low", color: "bg-green-500" },
] as const;

export const TASK_STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const;

export const TIMEZONES = [
  { city: "Miami", timezone: "America/New_York", abbr: "EST" },
  { city: "Phoenix", timezone: "America/Phoenix", abbr: "MST" },
  { city: "Los Angeles", timezone: "America/Los_Angeles", abbr: "PST" },
] as const;
