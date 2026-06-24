# ODITR_ONBOARDING_ACTIVATION_ENGINE_PLAN

## 1. Current signup/login flow
- Supabase Auth handles standard email/password or OAuth login.
- `src/app/signup/page.tsx` and `src/app/login/page.tsx` provide the UI.
- `src/app/auth/callback/route.ts` handles auth state confirmation and currently creates or fetches the default workspace for the user.

## 2. Current dashboard empty state
- `src/app/dashboard/page.tsx` is primarily a "Run Audit" input screen. 
- It lacks a guided empty state that explains to users *why* they should add a project or how to configure their account for maximum value.

## 3. Current project creation flow
- Supported via `src/app/api/projects/route.ts` and `src/lib/monitoring/project-service.ts`.
- The database has a `projects` table (workspace-scoped), but users aren't heavily guided to create one immediately after signup.

## 4. Current audit start flow
- The user enters a URL in `dashboard/page.tsx`.
- Calls `executeAuditRequest` which streams data from `/api/audit/full/route.ts`.
- The audit runs the Core Audit Intelligence Engine, Lighthouse, and AI-readiness sequentially/parallelly.

## 5. Current workspace flow
- Built into the `auth-workspace-schema.sql` and `src/lib/auth/workspace-service.ts`.
- Users have default workspaces, and can switch between them, but during signup, there is no UI step to name or configure their workspace intentionally.

## 6. Current billing/plan state
- Handled by `billing-schema.sql` and `src/lib/billing/`.
- Usage metering tracks scans and projects.
- Onboarding must respect limits but not block the flow entirely.

## 7. Existing onboarding/checklist UI
- No structured user onboarding flow exists.
- The dashboard does not feature a "Setup Checklist" or "Next Best Action" card.

## 8. Backend modules required
- `src/lib/onboarding/state-service.ts`
- `src/lib/onboarding/profile-service.ts`
- `src/lib/onboarding/recommendation-service.ts`
- `src/app/api/onboarding/...` routes for saving progress and skipping steps.

## 9. Frontend components required
- `src/components/onboarding/OnboardingFlow.tsx` (main orchestrator)
- Step components: `WelcomeStep`, `UserTypeStep`, `WorkspaceSetupStep`, `ProjectSetupStep`, `FirstAuditStep`, `FirstResultStep`
- Dashboard components: `ActivationChecklist.tsx`, `NextBestActionCard.tsx`, `EmptyDashboardState.tsx`

## 10. Database changes required
New SQL migration file (`supabase/onboarding-schema.sql`):
- `user_profiles` table (roleType, primaryGoal, experienceLevel)
- `onboarding_state` table (currentStep, completedSteps, activationScore, isCompleted)
- `setup_checklist_items` (optional, can be derived dynamically from `onboarding_state` and `projects` tables)

## 11. Risks and limitations
- **Friction**: Adding too many steps might cause drop-offs. We must ensure steps are skippable (e.g., Revenue Impact inputs).
- **Existing Users**: We need to ensure existing users who have already run audits are automatically marked as `isCompleted=true` in `onboarding_state` so they don't get trapped in the flow.
- **Vercel Timeout**: Running the first audit during onboarding must handle potential Vercel 180s function limits gracefully.

## 12. Safe implementation order
1. **Database Schema**: Create and apply `onboarding-schema.sql`.
2. **Backend Services**: Implement `state-service.ts` and `profile-service.ts`.
3. **API Routes**: Expose onboarding endpoints.
4. **Frontend Components**: Build the UI for the onboarding wizard.
5. **Dashboard Updates**: Integrate the Empty States and Checklist into `dashboard/page.tsx`.
6. **Auth Flow Tie-in**: Hook the onboarding check into the post-login redirect (e.g., in middleware or a protected layout).
