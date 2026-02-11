

# Security Hardening Plan

## Overview
Fix critical security vulnerabilities: add JWT validation to the AI chat function, tighten RLS policies across all tables using role-based access, and enable leaked password protection.

---

## 1. Fix AI Chat Edge Function (Critical)

**File:** `supabase/functions/ai-chat/index.ts`

- Add JWT validation using `getClaims()` before processing any request
- Use the authenticated user's client (with anon key + auth header) instead of the service role key for data queries, so RLS policies are respected
- Return 401 for unauthenticated requests

---

## 2. Tighten RLS Policies (Critical)

Replace all `USING (true)` UPDATE/DELETE policies with ownership or role-based checks. The approach uses the existing `has_role()` function and `created_by` columns.

### Policy Strategy

Since this is a team CRM where collaboration is needed, the approach will be:
- **SELECT**: Keep `USING (true)` for most tables (team needs shared visibility)
- **INSERT**: Keep `auth.uid() = created_by` (already correct)
- **UPDATE**: Allow creator OR owner role: `(auth.uid() = created_by) OR has_role(auth.uid(), 'owner')`
- **DELETE**: Allow creator OR owner role: `(auth.uid() = created_by) OR has_role(auth.uid(), 'owner')`

### Tables to Update

| Table | UPDATE Policy | DELETE Policy |
|-------|--------------|---------------|
| companies | creator OR owner | creator OR owner |
| contacts | creator OR owner | creator OR owner |
| leads | creator OR owner | creator OR owner |
| lead_interactions | creator OR owner | creator OR owner |
| lead_sequences | creator OR owner | creator OR owner |
| email_templates | creator OR owner | creator OR owner |
| sop_articles | creator OR owner | creator OR owner |
| tasks | creator OR assigned_to OR owner | creator OR owner |
| task_lead_links | owner only | owner only |

### Migration SQL (single migration)

For each table, the migration will:
1. DROP the existing permissive UPDATE/DELETE policies
2. CREATE new policies with proper ownership + role checks
3. Make `created_by` columns NOT NULL with DEFAULT `auth.uid()` where safe

---

## 3. Enable Leaked Password Protection

Use the configure-auth tool to enable leaked password protection, which checks passwords against known breach databases during signup and login.

---

## 4. Make `created_by` Columns NOT NULL

For tables where `created_by` is nullable, alter them to have a default of `auth.uid()` and set NOT NULL (after backfilling any existing NULL values with a placeholder or the first owner user).

---

## Technical Details

### Files to Modify
- `supabase/functions/ai-chat/index.ts` -- add JWT validation, switch from service role key to user-scoped client

### Database Migration
Single migration covering:
- ~18 policy DROP + CREATE statements across 9 tables
- ALTER COLUMN statements for `created_by` defaults

### No Frontend Changes Required
All fixes are backend-only. The frontend already sends the auth token in requests.

