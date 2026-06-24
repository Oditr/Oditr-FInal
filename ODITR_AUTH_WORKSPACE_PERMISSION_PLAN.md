# Authentication, Workspaces & Team Permission Engine Plan

## 1. Current System Analysis

### 1. Current Auth System
- **Provider:** Supabase Auth is being used (`auth.users`).
- **State:** The app uses `@supabase/ssr` with cookie-based sessions (seen in API routes and middleware).
- **Frontend UI:** Currently minimal or placeholder; we need robust Signup, Login, and Protected Route components.

### 2. Current User Model
- Exists in `public.profiles` (`id` references `auth.users(id)`).
- Profile stores basic info but no team/workspace associations.

### 3. Current Project/Report Ownership Model
- **Projects:** Bound directly to `user_id`.
- **Reports (Audit/Client):** Bound directly to `user_id` and `project_id`.
- **Clients:** Bound directly to `user_id`.

### 4. Current Billing/Subscription Ownership
- **Billing:** Subscriptions and Usage Records are bound directly to `user_id` (via `public.subscriptions` and `public.usage_records`).

### 5. Current API Protection Status
- Most API routes (like `/api/audit/full`, `/api/stripe/checkout`) verify the user via Supabase session (`supabase.auth.getSession()`).
- RLS policies use `auth.uid() = user_id`.

### 6. Client/Agency Ownership
- **Clients & Agency Branding:** Bound directly to `user_id`.

### 7. Current Frontend Auth UI
- Mostly minimal placeholder pages. Need proper login, signup, session context, and workspace switcher.

### 8. Backend Modules Required
- `authService`: Handle standard auth wrapping.
- `workspaceService`: Workspace CRUD.
- `workspaceMemberService`: Manage invites and team members.
- `permissionService`: RBAC permission checks (`workspace.manage`, `audits.run`).
- `apiTokenService`: Secure creation and hashing of API/CI tokens.

### 9. Frontend Components Required
- `<LoginForm>`, `<SignupForm>`, `<AuthLayout>`
- `<WorkspaceSwitcher>`, `<CurrentUserMenu>`
- `<TeamMembersPage>`, `<InviteMemberModal>`
- `<RoleBadge>`, `<PermissionGate>`, `<ProtectedRoute>`

### 10. Database Changes Required
- **New Tables**: `workspaces`, `workspace_members`, `invites`, `api_tokens`.
- **Modifications**: Add `workspace_id` to `projects`, `clients`, `audit_reports`, `agency_branding`, `client_reports`, `subscriptions`, `usage_records`.
- **Data Migration**: Existing `user_id` records must be migrated into newly generated default workspaces for each user.
- **RLS Policy Overhaul**: Change `auth.uid() = user_id` to workspace member existence checks.

### 11. Security Risks
- **RLS Bypass Risk**: When transitioning from `user_id` to `workspace_id`, improper RLS policies could accidentally expose data to cross-tenant users.
- **Billing Leakage**: Subscriptions will move from user to workspace. The access service must be updated to check the *workspace's* subscription.
- **API Token Storage**: CI/CD tokens must not be stored in plaintext. Use SHA-256 to hash tokens upon creation. Only display the raw token to the user once.

### 12. Safe Implementation Order
Due to the massive scope of refactoring ownership models across 10+ tables, a structured, incremental approach is essential.

**Phase 1: Foundation (Data Layer)**
- Create new SQL schema files for `workspaces`, `workspace_members`, `invites`, and `api_tokens`.
- Modify the auto-signup trigger to automatically provision a "Personal Workspace" and add the user as an `owner`.
- Add `default_workspace_id` to `profiles`.

**Phase 2: Refactoring Existing Tables (Migration)**
- Add `workspace_id` to all entity tables (`projects`, `clients`, `subscriptions`, etc.).
- Update RLS policies to check for `workspace_id` membership instead of `user_id` ownership.

**Phase 3: Backend Auth & Permission Services**
- Build the `permission-service.ts` defining rules for `workspace.manage`, `audits.run`, `billing.manage`, etc.
- Update all API routes to extract the current `workspace_id` and validate permissions before acting.

**Phase 4: Frontend UI Integration**
- Build the dedicated Auth Pages (Login/Signup).
- Implement the `WorkspaceSwitcher` in the global navigation.
- Build the Team Management settings page.
- Wrap UI actions in `<PermissionGate required="action_key" />`.
