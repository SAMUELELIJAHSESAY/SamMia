# SamMia - Attendance Management System

A modern, production-ready **Software-as-a-Service (SaaS) attendance management platform** built with React, TypeScript, and Supabase. Designed for multi-tenant companies to manage employee attendance, leave, payroll, and reporting with offline-first capabilities.

---

## 🎯 Features

### Core Features
- ✅ **Multi-Tenant Architecture** - Isolated data per company
- ✅ **Role-Based Access Control** - 5 user roles (super_admin, company_admin, branch_manager, department_manager, staff)
- ✅ **Clock In/Out System** - QR code validation with GPS tracking
- ✅ **Attendance Tracking** - Real-time attendance with break tracking
- ✅ **Leave Management** - Request, approve, reject with email notifications
- ✅ **Payroll System** - Auto-calculate from hours, tax deduction, overtime
- ✅ **Reports & Analytics** - PDF/Excel/CSV export with custom filters
- ✅ **Email Verification** - Real email account verification on signup/login
- ✅ **Offline Support** - 24-hour offline queueing with auto-sync
- ✅ **PWA Installation** - Install as app on desktop/mobile with SamMia branding

### Admin Features
- 🔧 Company CRUD operations
- 👥 Employee management with bulk invite
- 🏢 Branch/Department management
- 📧 Email template customization
- 💰 Platform billing tracking (cash-only)
- 📊 Platform analytics dashboard
- 🎫 Support ticket management
- ⚙️ System settings & configuration

---

## 🛠 Tech Stack

### Frontend
- **React 18.3** - UI framework with strict TypeScript
- **Vite 5.4.8** - Lightning-fast build tool
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling with dark mode
- **React Router v6** - Client-side routing with role guards
- **TanStack Query v5** - Server state management
- **Zustand** - Client state management
- **Recharts** - Interactive data visualization
- **Lucide Icons** - Beautiful icon library

### Backend
- **Supabase PostgreSQL** - Database with RLS (Row-Level Security)
- **Supabase Edge Functions** - Deno serverless functions (12 functions)
- **Supabase Auth** - JWT-based authentication
- **Supabase Storage** - File storage for reports/exports

### DevOps & PWA
- **Service Worker** - Network-first caching strategy with background sync
- **Workbox** - PWA optimizations
- **VitePWA** - PWA manifest generation
- **GitHub** - Version control
- **Vercel** - Frontend deployment

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account (free tier supported)
- Vercel account (for deployment)

### Local Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd project

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Start development server
npm run dev
# Open http://localhost:5173

# 5. Build for production
npm run build

# 6. Preview production build
npm run preview
```

---

## ⚙️ Configuration

### 1. Environment Variables

Create `.env.local` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from **Supabase Dashboard → Project Settings → API**

### 2. Supabase Setup

#### A. Run Migrations
```bash
# Option 1: Via Supabase CLI
supabase link --project-ref <project-id>
supabase db push

# Option 2: Manual - Copy-paste each migration to Supabase SQL Editor
# supabase/migrations/001 through 006
```

#### B. Deploy Edge Functions
```bash
# Option 1: Via CLI
supabase functions deploy

# Option 2: Via GitHub (recommended)
# 1. Connect GitHub repo to Supabase
# 2. Functions auto-deploy on push to main

# Option 3: Manual - Copy functions to Supabase Dashboard → Edge Functions
```

#### C. Enable Email Verification

1. Go to **Supabase Dashboard → Authentication → Providers → Email**
2. Toggle **"Enable email confirmations"** ON
3. Set **"Redirect to URL"**:
   - Dev: `http://localhost:5173/verify-email`
   - Production: `https://your-vercel-domain.vercel.app/verify-email`
4. (Optional) Customize email template in **Email Templates → Confirm signup**

#### D. Create Super Admin User

In Supabase SQL Editor:

```sql
-- Method 1: Create via Dashboard then update role
UPDATE profiles
SET role = 'super_admin', status = 'active'
WHERE email = 'admin@yourdomain.com';

-- Method 2: Direct SQL creation (requires service role)
-- Refer to README section "Create Super Admin User"
```

---

## 🚀 Deployment

### Deploy Frontend to Vercel

**Option 1: Using GitHub (Recommended)**

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "New Project" → Select GitHub repository
4. Vercel auto-detects Vite and configures build
5. Add environment variables in Vercel settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

**Option 2: Using Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

**Option 3: Using GitHub Desktop + Drag-Drop**

1. Build locally: `npm run build`
2. Drag `dist/` folder to Vercel (vercel.com/import)

### Update Supabase Email Redirect

After Vercel deployment, update the redirect URL:

**Supabase → Authentication → Providers → Email → Redirect to URL**

```
https://your-app.vercel.app/verify-email
```

---

## 👥 User Roles & Permissions

| Role | Permissions |
|------|------------|
| **super_admin** | Full platform access, manage companies, users, billing, analytics |
| **company_admin** | Manage own company: employees, branches, attendance, payroll |
| **branch_manager** | Manage branch: attendance, reports, leave approvals |
| **department_manager** | Manage department: attendance, leave approvals |
| **staff** | Clock in/out, view own attendance, request leave |

---

## 📱 Offline Functionality

The app automatically works offline with 24-hour queueing:

1. **Clock In/Out Offline** - Actions stored locally
2. **Auto-Sync** - Syncs when online (every 60 seconds)
3. **Visible Status** - Shows offline pending count
4. **Background Sync** - Service worker syncs in background

### Testing Offline
1. Open DevTools → Network tab
2. Set to "Offline" mode
3. Clock in/out - see local queue
4. Go back online - auto-syncs

---

## 📧 Email Verification Flow

### User Signup
1. User fills signup form → Submit
2. Company created, auth user created
3. Verification email sent automatically
4. User sees "Check your email" message

### Email Verification
1. User clicks link in email OR
2. Goes to `/verify-email` and enters 6-digit code
3. Email verified → Can login

### Unverified Login Attempt
1. User tries login without verifying email
2. Login fails with message: "Please verify your email first"
3. Shown link to `/verify-email` page

### Email Configuration
The app uses Supabase's built-in email service (free tier). For production, configure custom SMTP in `supabase/functions/email-send/index.ts`:
- SendGrid
- Mailgun
- AWS SES

---

## 📊 Project Structure

```
project/
├── src/
│   ├── App.tsx                          # Main routing (25 routes)
│   ├── main.tsx                         # React entry point
│   ├── components/
│   │   ├── attendance/                  # Clock in/out, history
│   │   ├── dashboard/                   # Dashboard cards
│   │   ├── layout/                      # Layout wrappers
│   │   ├── qr/                          # QR code scanner
│   │   └── ui/                          # Reusable UI components
│   ├── hooks/
│   │   ├── useAttendance.ts             # Attendance logic
│   │   ├── useAuth.ts                   # Auth utilities
│   │   ├── useOffline.ts                # Offline sync
│   │   └── ... (8 total)
│   ├── pages/
│   │   ├── auth/                        # Login, signup, email verification
│   │   ├── company-admin/               # Company admin pages (10 routes)
│   │   ├── staff/                       # Staff dashboard
│   │   └── super-admin/                 # Super admin pages (8 routes)
│   ├── stores/
│   │   ├── authStore.ts                 # Auth state (Zustand)
│   │   ├── attendanceStore.ts           # Offline queue
│   │   └── uiStore.ts                   # UI state
│   ├── lib/
│   │   ├── supabase.ts                  # Supabase client
│   │   └── utils.ts                     # Helper functions
│   ├── types/
│   │   ├── database.ts                  # Generated from Supabase
│   │   └── index.ts                     # Custom types
│   ├── sw.ts                            # Service worker
│   └── index.css                        # Global styles
├── supabase/
│   ├── migrations/                      # 6 SQL migrations
│   │   ├── 001_create_companies_and_tenants.sql
│   │   ├── 002_create_users_and_roles.sql
│   │   ├── 003_create_attendance_and_qr_system.sql
│   │   ├── 004_create_leave_schedules_reports.sql
│   │   ├── 005_create_functions_and_views.sql
│   │   └── 006_create_storage_and_final_config.sql (with RLS fixes)
│   └── functions/                       # 12 Edge Functions
│       ├── attendance-process/          # Clock in/out logic
│       ├── qr-validate/                 # QR validation
│       ├── report-generate/             # PDF/Excel export
│       ├── payroll-calculate/           # Auto payroll
│       └── ... (8 more)
├── public/
│   ├── manifest.json                    # PWA manifest
│   ├── icon-192x192.png                 # SamMia logo (192px)
│   ├── icon-512x512.png                 # SamMia logo (512px)
│   └── apple-touch-icon.png             # iOS icon
├── vite.config.ts                       # Vite config with PWA
├── tailwind.config.js                   # TailwindCSS config
├── tsconfig.json                        # TypeScript config
├── package.json                         # Dependencies
└── .gitignore                           # Git ignore patterns
```

---

## 🧪 Development

### Start Development Server
```bash
npm run dev
```

### Run Linting
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Generate Icons (if needed)
```bash
npm install sharp
node generate-icons.js
```

---

## 🔐 Security Features

- ✅ Row-Level Security (RLS) on all tables
- ✅ Email verification for real accounts
- ✅ JWT authentication
- ✅ Multi-tenant isolation via company_id
- ✅ Role-based access control
- ✅ Service worker with signature verification
- ✅ HTTPS only in production
- ✅ Secure password hashing

---

## 📚 Database Schema

### Key Tables (20+)
- `companies` - Multi-tenant companies
- `profiles` - Users with roles
- `attendance_records` - Clock in/out history
- `break_records` - Break tracking
- `qr_codes` - QR code management
- `leave_requests` - Leave application workflow
- `payroll_records` - Salary calculations
- `reports` - Generated reports
- `company_settings` - Configuration per company
- `email_templates` - Customizable templates

All tables have RLS policies enforcing multi-tenant isolation.

---

## 🚨 Edge Functions

All 12 functions are ready to deploy:

1. **qr-validate** - QR code validation
2. **attendance-process** - Clock in/out with GPS
3. **report-generate** - PDF/Excel/CSV export
4. **payroll-calculate** - Auto calculation
5. **leave-approval** - Approve/reject workflow
6. **notify-user** - Push notifications
7. **calculate-penalties** - Late/no-show penalties
8. **email-send** - SMTP integration ready
9. **sync-attendance** - Offline sync
10. **generate-analytics** - Platform metrics
11. **export-data** - Bulk export
12. **backup-database** - Auto backups

---

## 🎨 Theming

Dark mode is built-in with TailwindCSS dark mode classes:

```tsx
// Automatically applied based on system preferences
// Or manually toggle via useAuthStore → setTheme()
<div className="dark:bg-gray-800 dark:text-white">
  Content here
</div>
```

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -m "Add feature"`
3. Push to GitHub: `git push origin feature/feature-name`
4. Create Pull Request

---

## 📝 License

Proprietary - All rights reserved

---

## 🆘 Support

For issues or questions:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console: DevTools → Console
3. Check Edge Function logs: Dashboard → Functions → Logs

---

## 🎉 What's Included (Production-Ready)

✅ Authentication & authorization
✅ Multi-tenant data isolation  
✅ Real email verification
✅ Offline first with sync queue
✅ PWA with installation
✅ SamMia branding (icons, logos)
✅ 25 routes with role guards
✅ 8 super admin pages
✅ 10 company admin pages
✅ Attendance tracking with GPS
✅ Leave management with workflow
✅ Payroll auto-calculation
✅ PDF/Excel/CSV reports
✅ Email templates
✅ Analytics dashboard
✅ Dark mode support
✅ Mobile responsive
✅ Service worker with caching
✅ Database migrations
✅ 12 edge functions
✅ Row-Level Security
✅ Production build (51.67s, 0 errors)

---

## 📞 Getting Started Checklist

- [ ] Clone repository
- [ ] `npm install`
- [ ] Create `.env.local` with Supabase credentials
- [ ] `npm run dev` (test locally)
- [ ] Run Supabase migrations: `supabase db push`
- [ ] Deploy edge functions: `supabase functions deploy`
- [ ] Enable email verification in Supabase
- [ ] Create super admin user
- [ ] Deploy to Vercel
- [ ] Update Supabase email redirect URL
- [ ] Test signup → verification → login on production

---

**Happy deploying! 🚀**
