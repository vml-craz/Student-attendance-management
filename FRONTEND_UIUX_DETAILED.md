# Frontend UI/UX Detailed Specification

## 1. Scope and Purpose

This document defines the full frontend UX, UI behavior, interaction rules, and implementation standards for the Student Attendance Management System.

It is aligned with the current frontend architecture:

- `frontend/index.html` (main SPA shell)
- `frontend/login.html` (authentication entry)
- `frontend/css/styles.css` (design tokens and global styles)
- `frontend/js/*.js` (feature modules and routing)

Primary goals:

- Provide a clear, role-aware experience for admin, teacher, and student users.
- Keep critical workflows fast: login, attendance, records lookup, ticketing.
- Ensure consistent component behavior across all pages/modules.
- Maintain responsive and accessible UI without framework lock-in.

## 2. Information Architecture

### 2.1 Role-Based Navigation

Admin and Teacher:

- Dashboard
- Students
- Mark Attendance
- Attendance Records
- Analytics
- Tickets
- Leave Requests
- Documents

Student:

- Attendance Records
- Tickets
- Leave Requests

Routing is hash-based and controlled by `frontend/js/app.js`.

### 2.2 App Structure

- Global shell: sidebar + top header + dynamic content area.
- Module rendering: each feature module injects content into `#content`.
- Global UI services:
- Toast notifications (`showToast`)
- Reusable modal (`openModal`, `closeModal`)
- Loading states (spinner container)

## 3. User Flows

### 3.1 Authentication Flow

1. User opens `login.html`.
2. User submits credentials.
3. Frontend calls `apiLogin` via `frontend/js/api.js`.
4. On success: token + user profile are persisted in `localStorage`.
5. User is redirected to `index.html`.
6. Router checks allowed pages by role and hides unauthorized nav items.

Failure states:

- Invalid credentials: inline error in login card.
- Network/server unavailable: user sees meaningful error text.

### 3.2 Daily Attendance Flow (Teacher/Admin)

1. Open Mark Attendance from sidebar.
2. Select date/class context (module-defined controls).
3. Mark present/absent per student quickly.
4. Submit attendance batch.
5. Success toast confirms save; errors are shown with retry path.

### 3.3 Records and Dispute Flow

1. User opens Attendance Records.
2. Filters by date/month/student.
3. If discrepancy exists, user raises ticket from record context.
4. Ticket status is tracked in Tickets module.

### 3.4 Leave Flow

1. Student/teacher submits leave request.
2. Reviewer (admin/teacher) updates status with note.
3. Timeline is visible via table/list status chips and notes.

## 4. Visual System

### 4.1 Design Principles

- Clarity first: dense data, low confusion.
- Action-first hierarchy: most common actions remain above fold.
- Consistent feedback: every action has loading + success/error state.
- Role transparency: visible badge and page availability by role.

### 4.2 Color and Semantic Usage

Use semantic tokens in `styles.css`:

- Primary: interactive emphasis (buttons, active states)
- Success: completion/positive actions
- Danger: destructive actions/errors
- Warning: pending or caution states
- Info: neutral notifications

Never use color alone to convey meaning. Pair with icon/text labels.

### 4.3 Typography

- Global family is defined at root and should remain consistent.
- Use a clear scale:
- Page title (header): highest hierarchy
- Section title: secondary hierarchy
- Body/table text: readable dense data size
- Metadata/help text: reduced contrast but accessible

### 4.4 Spacing and Density

- Maintain consistent rhythm through tokenized spacing.
- Cards and tables should preserve scanability over decoration.
- Minimum tap target for touch: 40x40 px.

## 5. Layout Specification

### 5.1 Desktop Layout

- Fixed left sidebar with role-aware navigation.
- Sticky top header with page title, date/time, role badge.
- Scrollable main content area.

### 5.2 Mobile Layout

- Sidebar becomes off-canvas.
- Hamburger toggles sidebar and overlay.
- Overlay click closes sidebar.
- Main content uses full width with reduced paddings.

### 5.3 Responsive Breakpoints (recommended)

- >=1200 px: spacious desktop tables/cards.
- 768-1199 px: compact desktop/tablet layout.
- <=767 px: mobile layout with stacked controls.

## 6. Component Behavior Standards

### 6.1 Navigation Item

- States: default, hover, active, disabled/hidden.
- Active state must reflect current route hash.
- Unauthorized items are hidden, not just disabled.

### 6.2 Buttons

- Variants: primary, secondary, danger, ghost.
- States: default, hover, focus-visible, disabled, loading.
- Loading button must prevent duplicate submit.

### 6.3 Form Controls

- Label always visible.
- Placeholder is assistive text, not a label replacement.
- Inline validation shown near control when possible.

### 6.4 Tables and Data Grids

- Sticky or persistent header for long lists (recommended).
- Zebra/subtle row separation for readability.
- Provide explicit empty states with recovery actions.

### 6.5 Toasts

- Auto-dismiss after short duration.
- Types: success, error, warning, info.
- Do not use toast for mission-critical errors without inline backup.

### 6.6 Modal

- Use for create/edit confirmations and detail forms.
- Must close on explicit cancel or successful submit.
- Should trap focus (recommended enhancement).

## 7. Page-by-Page UX Specification

### 7.1 Login (`login.html`, `js/auth.js`)

- Inputs: username, password, password visibility toggle.
- Validation:
- Empty fields blocked client-side.
- API errors displayed in prominent inline banner.
- CTA text changes during submit ("Signing in...").

### 7.2 Dashboard (`js/dashboard.js`)

- Purpose: quick operational snapshot.
- Include summary cards and short trend visuals.
- Primary actions should link to attendance and records workflows.

### 7.3 Students (`js/students.js`)

- CRUD with search/filter.
- Creation/edit should use modal or inline form with strong validation.
- Destructive delete requires confirmation.

### 7.4 Mark Attendance (`js/attendance.js`)

- Must optimize speed for repetitive marking tasks.
- Bulk action controls are recommended (all present/reset).
- Confirm successful save with both visual confirmation and toast.

### 7.5 Attendance Records (`js/records.js`)

- Filter controls at top.
- Results in readable table with export-ready structure.
- Clear empty-state guidance when no records match.

### 7.6 Analytics (`js/analytics.js`)

- Use charts only where they add decision value.
- Each chart must have title and context metric.
- Provide textual fallback for chart-only insights.

### 7.7 Tickets (`js/tickets.js`)

- Users can raise issues from attendance context.
- Status lifecycle should be visible (open/in-progress/resolved/rejected).
- Resolution note is mandatory for closure.

### 7.8 Leave Requests (`js/leaves.js`)

- Submission form with date range, reason, and validation.
- Review queue for approvers with action buttons and notes.
- Status badges should be instantly recognizable.

### 7.9 Documents (`js/documents.js`)

- Upload with file type and size guidance.
- List with metadata (name, uploader, date, size if available).
- Download and delete actions with clear permissions.

## 8. UX Writing and Microcopy

Use direct, action-oriented language:

- Good: "Mark Attendance", "Apply Leave", "Resolve Ticket"
- Avoid vague CTAs: "Submit" without context

Error copy format:

- What failed
- Why (if known)
- What user can do next

Example:

- "Attendance could not be saved. Please check your connection and try again."

## 9. Accessibility Requirements

Minimum standards:

- Keyboard navigation for all controls.
- Visible focus indicator for interactive elements.
- Proper label associations for form inputs.
- Contrast ratio target: WCAG AA for text and UI controls.
- ARIA labels for icon-only buttons.

Recommended upgrades:

- Focus trap and escape handling for modal.
- Announce toast messages for screen readers.
- Reduced motion preference support.

## 10. Performance and Reliability UX

- Show skeleton/loading UI during async fetches.
- Debounce expensive search/filter interactions.
- Prevent duplicate API requests on rapid clicks.
- Handle expired token by redirecting to login with clear reason.

## 11. State Model and Error States

Each module should explicitly support:

- Loading state
- Empty state
- Success state
- Recoverable error state
- Permission-restricted state (if role-limited)

Do not leave blank screens. Always provide user guidance.

## 12. Frontend Technical Conventions

- Keep module pattern: one feature per `frontend/js/*.js` file.
- All backend calls go through `frontend/js/api.js`.
- Reuse global helpers (`showToast`, `openModal`, `closeModal`).
- Keep DOM selectors scoped and defensive.
- Avoid introducing framework dependencies unless required.

## 13. QA Checklist (UI/UX)

- Login works for all roles and redirects correctly.
- Unauthorized pages are hidden and not routable.
- Sidebar works on mobile (open/close/overlay).
- Every primary action has success and error feedback.
- Forms block invalid submission and show useful messages.
- Tables/charts render correctly with large and empty datasets.
- Keyboard-only navigation works for main workflows.
- Layout remains usable at mobile widths.

## 14. Implementation Roadmap (Recommended)

Phase 1: Consistency hardening

- Normalize button/form/table variants across modules.
- Ensure all modules use standard loading/empty/error wrappers.

Phase 2: Accessibility and interaction quality

- Improve focus management, ARIA labels, and modal behavior.
- Add keyboard shortcuts for high-frequency actions.

Phase 3: Experience polish

- Add subtle motion transitions for route/page changes.
- Enhance dashboard information hierarchy and quick actions.

Phase 4: Advanced UX

- Add export actions, saved filters, and power-user workflows.
- Add optional progressive enhancement (offline-safe view caching).

## 15. Definition of Done for Frontend UI/UX

Frontend is considered complete when:

- Role-based routing and visibility are correct.
- All modules expose full CRUD/task workflow where applicable.
- Visual and interaction patterns are consistent.
- Accessibility baseline is met.
- Mobile and desktop experiences are both production-usable.
- Failures are recoverable with clear user messaging.
