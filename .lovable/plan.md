

## Dashboard Task Overview + Task Management Enhancements

### 1. Dashboard - Task Overview Section

Add a new "My Tasks" card to the dashboard (below the charts row) showing:

- **Upcoming Tasks list**: The 5 nearest-due tasks with priority dot, title, due date, assignee, and department badge
- **Task summary by status**: A small donut/pie chart showing To Do vs In Progress vs Done counts
- **Overdue tasks highlight**: Tasks past due date shown in red at the top of the list
- Clicking a task navigates to the Task Board

This fetches from the `tasks` table alongside existing dashboard queries.

---

### 2. Additional Task Management Features

Here are features worth adding:

| Feature | Description |
|---|---|
| **Task comments/notes** | A comments thread on each task (new `task_comments` table) so team members can discuss without leaving the board |
| **Subtasks / checklists** | Break tasks into smaller checklist items (new `task_checklist_items` table) with completion tracking |
| **Task due date reminders** | Visual badge/notification when tasks are approaching their due date (e.g., due tomorrow) |
| **Task time tracking** | Log time spent on tasks for workload analysis |
| **Recurring tasks** | Auto-create tasks on a schedule (weekly check-ins, monthly reports) |
| **Task activity log** | Track who changed what and when on each task |

I recommend starting with **Task comments** and **Subtasks/checklists** as they add the most immediate value.

---

### 3. ZoomInfo API Integration

ZoomInfo does not have a pre-built connector available in your workspace. To integrate with ZoomInfo, here's what would be needed:

- **ZoomInfo API credentials**: You'd need a ZoomInfo API key or OAuth credentials from your ZoomInfo account (requires a paid ZoomInfo subscription)
- **Backend function**: An edge function would proxy requests to ZoomInfo's API to enrich company/contact data
- **Use cases**: Auto-populate company details (revenue, employee count, industry) and contact info (email, phone, title) when adding leads

**Important**: ZoomInfo is an enterprise product with paid API access. If you have a ZoomInfo account and API key, I can build the integration. Otherwise, alternatives like Apollo.io or Clearbit may be worth considering.

Would you like to proceed with the ZoomInfo integration? If so, I'll need you to provide your API key.

---

### Technical Details

**Dashboard changes** (`src/pages/Dashboard.tsx`):
- Add state for `upcomingTasks` and `taskStatusCounts`
- Fetch tasks ordered by `due_date` ascending, limited to 5, filtered to non-done
- Fetch task counts grouped by status
- Render a new grid row with a task list card and a pie chart card
- Use existing `TASK_STATUSES`, `TASK_PRIORITIES`, `DEPARTMENTS` constants for labels/colors

**New database table** (for task comments, if approved):
```text
task_comments
  - id (uuid, PK)
  - task_id (uuid, FK -> tasks)
  - content (text)
  - created_by (uuid)
  - created_at (timestamptz)
```

With RLS policies matching the existing task access patterns.

