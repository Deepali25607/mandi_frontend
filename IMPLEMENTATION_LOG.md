# Mandi ERP — Implementation Log

Autonomous build session (2026-06-14). This log records every feature implemented,
the design decisions behind them, and all assumptions made. The user will review and
test the morning of 2026-06-14/15.

## Architecture (unchanged from prior sessions)

- **Frontend**: `Mandi-frontend` — React 19 + TypeScript + Vite + MUI v6 + Redux Toolkit / RTK Query + react-router v7 + recharts. Mobile-first.
- **Backend**: `mandi-backend` — NestJS + TypeScript + TypeORM + PostgreSQL (Docker, host port **5435**).
- **Auth**: mobile + OTP (dev: OTP returned as `devCode`). JWT, global guards, 8 roles, RBAC via `@Roles`.
- **Multi-tenant**: every transactional/master row carries `organizationId` (+ `branchId` for transactions). All queries are org/branch-scoped.
- **Money**: Postgres `numeric` columns via `NumericTransformer` → JS numbers. Rounded to 2 dp in services.

### How to run
- DB: `cd mandi-backend && docker compose up -d`
- Seed: `npm run seed`
- API: `npm run dev` (or `npm run build && node dist/main.js`) → http://localhost:5000/api
- Web: `cd Mandi-frontend && npm run dev` → http://localhost:5173 (proxies /api → :5000)
- Demo logins (any role): mobile `9000000000`(super_admin) … `9000000007`(auditor). Accountant `9000000002` sees the most.

---

## Money model & key domain assumptions

> These are the assumptions a reviewer most needs to validate against real mandi practice.

1. **Adhati sale model**: On a sale, the **customer is billed the gross** (weight × rate). The
   **supplier nets gross − commission − market fee**. The commission is the agent's earning.
   Market fee (mandi tax/laga) is treated as a deduction from the supplier, NOT added to the
   customer bill. *If your mandi charges market fee to the buyer, this needs adjustment.*
2. **Customer outstanding (receivable)** = opening balance + Σ(sale gross) − Σ(collections).
3. **Supplier payable** = opening balance + Σ(finalised supplier-bill net payable) − Σ(supplier payments).
4. **Supplier bill** aggregates the supplier's sold-lot net over a date range, then applies
   editable deductions (commission already in net, plus labour / extra market fee / crate / other).
   See the Supplier Settlement section for the exact formula used.
5. **Accounting** is implemented as a **derived ledger** (party/cash/bank ledgers computed from
   sales, collections, bills, payments, expenses) rather than a full chartered double-entry GL.
   Trial-balance / P&L are simplified summaries. *Full GAAP double-entry + Balance Sheet is NOT
   implemented* — logged as a known limitation.
6. **GST**: GST numbers are captured on org/customer; GST-rate tax computation & GSTR reports are
   NOT implemented (logged as pending — needs HSN/tax-slab master).
7. **External integrations** (WhatsApp Business API, SMS OTP gateway, AWS S3 uploads) are built
   on the app side but the outbound call is stubbed/simulated in dev — logged per feature.

---

## Feature log (chronological)

### Session 1 — Foundation
- Multi-tenant entities (Organization, Branch, User), JWT+OTP auth, RBAC guards, role-based
  responsive app shell, dashboard (demo data), login.

### Session 2 — Core mandi flow
- Masters: Items, Suppliers, Customers (CRUD, search, archive, auto-codes).
- Arrivals → stock lots; Inventory (lots + summary); single-window Sales (gross/commission/fee/net,
  lot drawdown). Verified end-to-end.

### Session 3 — Full BRD build (this session)

**Backend modules added (all tenant-scoped, RBAC-guarded, verified via smoke test):**
- **Collections (Module 11)**: `Collection` entity; record customer payment (COL-xxxx), list w/ filters, totals-by-customer for outstanding.
- **Settlements (Module 6)**: `SupplierBill` (SB-xxxx) + `SupplierPayment` (SP-xxxx). Bill aggregates a supplier's lot-linked sale lines over a date range (gross/commission/marketFee) then applies labour/crate/other deductions → netPayable. `preview` endpoint computes before saving. Payment can clear a bill (→ status paid). Assumption: only **lot-linked** sale lines are attributable to a supplier.
- **Outstanding (Module 12)**: customer receivable = opening + Σsales − Σcollections; supplier payable = opening + Σ bill.netPayable − Σ payments (dues recognised at billing). FIFO customer aging buckets. `unbilled` net sales surfaced as a prompt to settle.
- **Expenses (Module 15)**: `Expense` (EXP-xxxx), 5 categories.
- **Accounting (Module 13)**: derived ledgers — customer ledger (sales Dr / receipts Cr), supplier ledger (bills Cr / payments Dr), cash book & bank book (from collections/payments/expenses by payment mode), simplified trial balance. NOTE: trial balance is a **summary, does not strictly balance** (no full double-entry GL) — known limitation.
- **Crates (Module 10)**: `CrateTransaction` (party in/out + damaged), balances per customer (held by them) / supplier (held by us).
- **Admin (Module 1)**: Organization get/update, Branch CRUD, User management (list/create/update, role assignment).
- **Dashboard (Module 18)**: replaced demo data with **real aggregations** (today's sales/arrival/collections/commission, inventory value, receivable/payable, 7-day trends, aging, top items/customers/suppliers). `isDemoData` now false. Assumption: "today" uses server UTC date; gross profit (today) ≈ commission + market fee.

**Assumptions added this session:** see items 2–7 in the Money Model section above (supplier dues recognised at bill finalisation; trial balance summarised; GST not computed; external integrations stubbed).

**Frontend pages added (all mobile-first, role-gated via navConfig + routed in App.tsx):**
- **Collections** (`/collections`): record customer payment + recent list.
- **Customer Billing** (`/billing`): sales as invoices; tap → invoice dialog with line items & totals; **Print** (hidden-iframe) and **WhatsApp share** (wa.me deep link, prefilled invoice text).
- **Supplier Settlement** (`/settlements`): pick supplier + date range → **Preview** sales aggregate → enter labour/crate/other deductions → live **Net payable** → Generate bill; bill list with **Pay** dialog.
- **Outstanding** (`/outstanding`): Customers / Suppliers / Aging tabs; receivable & payable summary cards; FIFO aging bar chart.
- **Expenses** (`/expenses`): record + list + running total.
- **Accounting** (`/accounting`): Ledgers (customer/supplier picker), Cash/Bank book toggle, Trial Balance — all in tables.
- **Crates** (`/crates`): Record tab (party/direction/qty/damaged) + Balances tab.
- **Organization** (`/organization`): edit org profile + branch CRUD.
- **Users** (`/users`): list + add/edit, role & branch assignment, enable/disable.
- **Reports** (`/reports`): quick-link cards + Sales / Collection / Stock registers (printable).
- **PWA**: `manifest.webmanifest` + apple-mobile meta tags → installable to home screen ("Add to Home Screen"), standalone display, themed.
- New API slices: `financeApi.ts`, `adminApi.ts`; types in `types/finance.ts`. Shared utils: `share.ts` (WhatsApp + print), `useLookups.ts`.

### Session 4 — special-mandi modules (this phase)

- **Module 5 — Rate & Weight Adjustment** (`/adjustments`): `Adjustment` entity (type = rate/weight ↑/↓; actualValue, reportedValue, signed `amount`). Records the gap between actual customer-side figure and the value reported to the supplier; **customer bills unaffected** (supplier & customer kept separate per BRD). Signed amount flows into **supplier outstanding** (`balance = opening + billed + adjustments − paid`) and appears as a row in the **supplier ledger**. Frontend: form with auto-suggested amount (reported − actual) + recent list. Verified: ADJ created → supplier outstanding `adjustments` field + ledger row reflect it.
- **Module 9 — For-Sale Challan** (`/challans`): `Challan` + `ChallanLine` entities. Flow = **transfer → report → settle**: creating a challan **draws down the chosen stock lots** (atomic, like a sale), then `POST /challans/:id/report` records the bikri report (reported sale − agent commission − other charges = net receivable), then `POST /:id/settle` records money received. Status machine `transferred → reported → settled`. Frontend: multi-line transfer form (lot picker), challan list with stage-appropriate Report/Settle dialogs. Verified end-to-end incl. lot closing to 0kg and net-receivable math.
- **Arrival history**: Arrivals page now shows a "Recent arrivals" list under the entry form (was entry-only).

### Session 5 — Username/password authentication (replaces OTP)

Per user request: **self-contained username + password auth, no third-party/external providers.**

- **User entity**: added `username` (unique, case-insensitive, stored lower-case), `passwordHash` (bcryptjs), `mustChangePassword`, `securityQuestion` + `securityAnswerHash`. `mobile` is now optional/non-unique. OTP entity removed.
- **Auth endpoints**: `POST /auth/login` (username+password), `POST /auth/register-organization` (self-onboarding: creates org + Main Branch + org_admin), `POST /auth/change-password`, `POST /auth/security-question`, `GET /auth/recovery-question?username=`, `POST /auth/recover` (security-question reset — **no email/SMS**). OTP endpoints removed.
- **Users admin**: create user with username + temp password (forces change on first login); `POST /users/:id/reset-password` (admin reset → forces change). Update whitelists fields (never changes username/password).
- **Frontend**: LoginPage (username/password, show/hide), RegisterPage (org onboarding), ForgotPasswordPage (username → security question → reset), ChangePasswordPage (forced + voluntary, full-screen gate via `RequirePasswordChange`), AccountPage (change password + set security question, in app shell user menu). Shared `AuthLayout`.
- **Security**: bcrypt (10 rounds) for passwords + security answers; passwordHash/securityAnswerHash use `select:false`; generic login error (no user-enumeration on login); min 6-char passwords; usernames `[a-z0-9._-]`.
- **Seed**: 8 demo users with usernames + password `Mandi@123`; admin has a security question (answer `Delhi`).
- **Dev note**: schema was reset (drop/recreate) because adding the non-null `username` column to existing rows isn't auto-migratable under `synchronize`. Verified end-to-end: login, wrong-password reject, case-insensitive username, org register, duplicate-username block, staff onboarding + forced change, admin reset, security-question recovery (right & wrong answer).

### Session 6 — Platform Super Admin, subscriptions & per-org backup

Per user request: a **Platform Super Admin** area separated from day-to-day operations, **subscription plans / pricing / feature availability**, and **per-organization data backup**.

**Subscriptions & feature flags (backend):**
- `SubscriptionPlan` entity (platform-level): name, code, monthly/yearly price, max users/branches, `features` (jsonb feature keys), `isDefault`/`isPublic`/`isActive`/`sortOrder`.
- `Organization` extended: `planId` (→ plan relation), `subscriptionStatus` (trial/active/suspended/expired/cancelled), `billingCycle`, `subscriptionStart`, `renewalDate`.
- `PlatformFeature` catalogue = optional/advanced modules (settlements, expenses, accounting, crates, challans, adjustments, reports). **Core modules** (dashboard, sales, arrivals, inventory, collections, billing, masters, users, organization) are always on.
- `SubscriptionService.resolveContext(orgId)` resolves an org's effective features from its plan (empty if suspended/expired/inactive plan). Wired into JWT issuance + every request (`JwtStrategy`), so `req.user.features` is always current. Suspended orgs (`isActive=false`) are blocked at login and on every request.
- **Enforcement = hide + enforce**: `@RequireFeature(...)` on accounting/challans/crates/adjustments/settlements/expenses controllers + global `FeatureGuard` → 403 if the plan lacks it. Super Admin is exempt; core controllers ungated.

**Platform console (backend, Super-Admin-only `@Roles(SUPER_ADMIN)`):**
- `GET /platform/stats` — orgs, active orgs, total users, estimated MRR, counts by status/plan, recent registrations.
- `GET/GET :id/PATCH :id /platform/organizations` — list tenants (+ user/branch counts), detail (+ usage counts + primary admin), update subscription (assign plan, status, billing cycle, renewal date, activate/suspend).
- `GET/POST/PATCH /platform/plans`, `GET /platform/feature-catalogue`, `GET /platform/settings` + `PATCH /platform/settings/:key` (key/value, seeded defaults).
- `GET /plans/public` (`@Public`) — active public plans for the registration screen.
- Registration assigns the chosen plan (or the platform **default**) + a 14-day trial.

**Per-organization backup (backend):** `GET /backup/export` (`@Roles(ORG_ADMIN)`, plan-independent). Strictly tenant-scoped single-JSON dump of all the org's masters + transactions (line tables filtered via their parents); user **password/security-answer hashes excluded** (`select:false`). Includes `meta.recordCounts`.

**Frontend:**
- `AuthUser` carries `features` + `subscription`; nav split — `navConfig.canAccess` shows platform items ONLY to super_admin, shows org items only for the role **and** when the plan includes the feature. `RoleGuard`/`RoleHome` keep the two worlds separate (super_admin → `/platform`, org users → `/dashboard`).
- Platform pages: **Platform Overview** (stats + plan/status distribution + recent orgs), **Organizations** (list + manage dialog: usage, plan, status, suspend/activate), **Plans & Pricing** (CRUD with feature checkboxes, limits, default/public/active flags), **Platform Settings** (key/value editor).
- **Data Backup** page (org admin): one-click download of the org JSON (tenant-isolated, credentials excluded).
- **Registration** now shows a plan picker (public plans, defaults to the platform default).
- User menu shows a subscription chip (plan · status).
- **Seed**: 3 plans — Starter (free, default; core + expenses/reports), Standard (₹999; + settlements/crates), Premium (₹2499; all features). Demo org "Shree Balaji Trading Co." subscribed to **Premium/active** so every module works.
- **Verified** (backend smoke): platform stats/list/plans, org_admin→platform = 403, public plans, registration→default Starter (trial, features [expenses,reports]), feature gating (Starter→accounting/challans 403, expenses 200; Premium→accounting 200), backup export (org-isolated, accountant 403), plan assignment, suspend→login 401→reactivate. Frontend typecheck + build clean; Vite proxy serves new endpoints.

**Org Admin = full operational access + role guide (same session):**
- `RolesGuard`: ORG_ADMIN now bypasses role checks for **every org-level route** (can act as Accountant/Sales/Inventory/Collection/Purchase/Auditor for urgency), but is still denied SUPER_ADMIN-only platform routes. Verified: org_admin GET sales/arrivals/collections/crates/challans/accounting = 200; org_admin → `/platform/*` = 403.
- Frontend nav (`canAccess`): org_admin sees **all** org modules (still subject to plan features); other roles unchanged.
- New **Roles & Access** page (`/roles`, org_admin only): a role-wise guide — each role's summary, responsibilities and accessible screens (screens derived live from `navConfig` via `src/config/roles.ts` so the guide stays in sync). Org Admin shown first with a "Full access" badge. The Users page role dropdown now shows the selected role's summary.

### Session 7 — Module-wise Reports

Reorganized **Reports** into a module-wise hub (BRD reporting). Landing page (`/reports`) groups reports by module — **Sales, Purchase, Inventory, Collection, Accounting, Customers, Suppliers, Settlements, Expenses** — each as a card category; a report opens at `/reports/:reportKey`.

- **Shared toolkit** (`src/features/reports/shared.tsx`): `ReportShell` renders a back-nav, a filter/export bar and a table with an optional totals footer; **CSV export** (`exportCsv`, Excel-friendly UTF-8 BOM) and **Print** (existing `printHtml`) are generated from the same column/row definitions. `DateRangeFilter` (defaults to current month), `FilterSelect`, `inRange` date helper, `ReportColumn`/`ReportRow` types.
- **19 reports** (`src/features/reports/modules/*`), all with relevant filters + export:
  - Sales: Sales Register (date/customer filter), Item-wise Sales.
  - Purchase: Purchase Register (date/supplier), Item-wise Purchase.
  - Inventory: Stock Summary, Stock Lot Register (item/status), Item Master.
  - Collection: Collection Register (date/customer).
  - Accounting: Trial Balance, Cash Book, Bank Book, Customer Ledger, Supplier Ledger (party picker).
  - Customers: Customer Outstanding, Customer Master.
  - Suppliers: Supplier Outstanding, Supplier Master.
  - Settlements: Supplier Bills, Supplier Payments.
  - Expenses: Expense Register (date/category).
- **Registry-driven** (`reportsRegistry.tsx`): each report = `{ key, module, title, description, feature?, Component }`; landing groups by `MODULE_ORDER`, runner (`ReportRunnerPage`) resolves `:reportKey`.
- **Feature-gated** (hide + enforce): Accounting reports need `accounting`, Settlements need `settlements`, Expenses needs `expenses` — hidden from the landing page AND redirected by the runner when the org's plan lacks them (consistent with backend 403s). Core module reports always available.
- Verified: all report data endpoints' field shapes match the report column mappings; frontend typecheck + build clean.

## Theme & Background Wallpaper Management (Org Admin)

- **Goal**: let an Org Admin re-skin the whole app for their organization (colours, light/dark, corner radius, background wallpaper). Tenant-isolated; applies to every user in the org.
- **Backend** (`organizations` module): added a nullable `appearance` **jsonb** column on `Organization` holding `{ primaryColor, secondaryColor, mode, borderRadius, wallpaper{ type,value,opacity } }` (`organization.entity.ts`, with `DEFAULT_APPEARANCE`). New endpoints — `GET /organization/appearance` (open to **all** org roles so the theme loads for everyone) and `PATCH /organization/appearance` (**`@Roles(ORG_ADMIN)`**), validated by `UpdateAppearanceDto` (`@IsHexColor`, nested `WallpaperDto`, image data-URL cap 4 MB). Service `getAppearance`/`updateAppearance` return default when uncustomised.
- **Frontend**:
  - `types/appearance.ts` — `AppearanceConfig`, `DEFAULT_APPEARANCE`, 8 `PALETTE_PRESETS`, 8 CSS-gradient `GRADIENT_PRESETS` (no image files needed).
  - `theme/theme.ts` refactored to **`buildTheme(config)`** factory (dynamic palette, dark-mode surfaces, divider token, radius-driven component overrides); `theme/wallpaper.ts` builds the root `sx` (wallpaper + readability scrim).
  - State: `store/appearanceSlice.ts` (localStorage-hydrated for instant paint) + `components/theme/ThemedApp.tsx` rebuilds the MUI theme live; `main.tsx` now wraps the app in `ThemedApp`.
  - Sync: `api/appearanceApi.ts` (+`Appearance` tag); `AppShell` loads the saved config on login (skips Super Admin who has no org), applies the wallpaper, resets on logout, and uses the `divider` token for borders (dark-mode-correct).
  - **Sidebar style** (`sidebar`: default | dark | primary | accent) — `theme/sidebar.ts` `sidebarPalette(variant, theme)` derives panel/text/selection colours; applied to the desktop drawer + mobile menu + brand in `AppShell`. Editable via swatches on the Appearance page.
  - UI: `features/admin/AppearancePage.tsx` — palette presets, primary/accent colour pickers, light/dark toggle, radius slider, sidebar-style picker, wallpaper (none/colour/gradient/image-upload as data URL ≤2 MB) with overlay slider, **live preview pane** (now includes a mini sidebar), and Save / Discard / Reset. Nav item **Appearance** (Admin section, org_admin only) + route `/appearance`.
- **Design choices**: org-scoped (not per-user) so the look is consistent for the tenant; localStorage cache avoids a flash of default theme on reload; gradients/colours are dependency-free; image wallpapers are inlined as base64 in the org's own jsonb (dev-level — no object storage), keeping data tenant-isolated per the standing "no external services" constraint.
- **Verified**: both builds clean; backend restarted (routes mapped, jsonb synced); scripted E2E — default GET, admin PATCH persists, non-admin GET 200 / PATCH 403, invalid hex 400.

## Login screen / Platform branding (Super Admin)

- **Goal**: the public sign-in / register / recovery screens (shown before any org context) are themed by the **Platform Super Admin**, not org admins.
- **Backend** (`platform` module): branding stored as a JSON blob in `PlatformSetting` key `branding` (`PlatformSettingsService.getBranding/setBranding`, `DEFAULT_BRANDING`; excluded from the plain settings list). Endpoints — **public** `GET /branding/public` (`@Public()` on `PlansController`, no auth so the login screen can read it), admin `GET/PATCH /platform/branding` (`@Roles(SUPER_ADMIN)` via `PlatformController`), validated by `UpdateBrandingDto` (appName/tagline, `@IsHexColor` primary, nested background gradient/color/image data-URL).
- **Frontend**: `types/appearance.ts` adds `PlatformBranding`/`DEFAULT_BRANDING`/`LOGIN_BG_PRESETS`; `platformApi` adds `getBranding`/`updateBranding`/`getPublicBranding` (+`Branding` tag). `AuthLayout` now fetches the public branding and applies the **background** (gradient/color/image), wraps the auth card in a `buildTheme({primaryColor})` so buttons/links use the brand colour, and shows `appName`/`tagline` (LoginPage no longer hardcodes them; Register/Forgot keep action-specific titles). New Super-Admin page `features/platform/BrandingPage.tsx` (identity fields, brand colour, background presets/colour/image upload ≤3 MB, **live login preview**, Save/Reset) + nav item **Login & Branding** (`/platform/branding`).
- **Verified**: both builds clean; backend restarted; E2E — public GET (no token) ✓, super-admin PATCH persists & shows on public route ✓, org_admin PATCH 403 ✓, default restored.

## NOT implemented / partial (still pending after session 4)

- **Module 13 — Accounting depth**: ledgers/cash-book/trial-balance are **derived** summaries. **No full double-entry GL, no P&L statement, no Balance Sheet.** Trial balance is a summary and does not strictly balance.
- **GST**: GST numbers captured; **no tax-rate computation, no GSTR/GST reports** (needs HSN + tax-slab master).
- **Module 16 — Commission**: commission % configured on Item (default) and Supplier (rate), computed on each sale. No separate "commission slabs/laga config" screen beyond masters.
- **Module 17 — WhatsApp**: implemented as **wa.me deep-link share** (manual send) for invoices. Real **WhatsApp Business API** auto-send, and shares for supplier bills/outstanding/collection receipts, are **stubbed/partial**.
- **Module 19 — Mobile app**: delivered as a **responsive PWA** (installable). Native Android/iOS wrappers not built (architecture is API-driven & ready for it).
- **OTP delivery**: dev mode only (code returned in response). **No real SMS gateway** wired.
- **File uploads** (supplier photo, BRD): field exists (`photoUrl`); **no S3 upload** implemented.
- **Arrival history UI**: arrivals list API exists; the Arrivals page is entry-only (no dedicated history/detail screen yet). Sales history is covered by the Billing page.
- **DB migrations**: dev uses TypeORM `synchronize:true` (auto-schema). **Generate migrations before production.**

## Verification done this session
- Backend: typecheck + build clean; 58 routes mapped; scripted E2E covering collection → outstanding → supplier-bill preview → expense → crate → customer ledger → cash book → trial balance → real dashboard all passed.
- Frontend: typecheck + production build clean; all new routes proxy correctly (401 unauth = exist); all new page modules transform via Vite without import errors.
- Earlier sessions' core flow (arrival → lot → sale → drawdown, RBAC 403) still passing.
