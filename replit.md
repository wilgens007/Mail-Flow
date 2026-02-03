# MailFlow - Email Marketing SaaS Platform

## Overview
MailFlow is a production-ready multi-tenant email marketing SaaS platform with a stunning, mobile-friendly design. Built with React, TypeScript, Express, and PostgreSQL using Drizzle ORM.

## Demo Accounts
- **Admin:** admin@mailflow.io / admin123
- **User:** demo@example.com / demo123

## Project Architecture

### Tech Stack
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** JWT with bcrypt password hashing
- **Charts:** Recharts

### Directory Structure
```
├── client/src/
│   ├── components/         # Reusable UI components
│   │   └── ui/            # Shadcn components
│   ├── lib/               # Utilities (auth, queryClient)
│   ├── pages/
│   │   ├── dashboard/     # Dashboard pages (contacts, campaigns, billing, etc.)
│   │   ├── admin/         # Admin pages (tenants, system)
│   │   ├── landing.tsx    # Marketing landing page
│   │   ├── login.tsx      # Login page
│   │   └── signup.tsx     # Signup page
│   └── App.tsx            # Main app with routing
├── server/
│   ├── auth.ts            # JWT authentication middleware
│   ├── db.ts              # Database connection
│   ├── email-processor.ts # Background email queue processor
│   ├── index.ts           # Express server entry
│   ├── routes.ts          # API endpoints
│   ├── seed.ts            # Database seed data
│   └── storage.ts         # Database CRUD operations
└── shared/
    └── schema.ts          # Drizzle schema & types
```

### Database Schema (8 Tables)
1. **users** - User accounts with roles
2. **tenants** - Organizations/companies
3. **contacts** - Email subscribers
4. **campaigns** - Email campaigns
5. **campaignSends** - Individual send tracking
6. **subscriptions** - Stripe subscription data
7. **suppressions** - Bounced/unsubscribed emails
8. **eventLogs** - System event logging

### Subscription Plans
- **Starter:** $19/month - 1,000 emails
- **Pro:** $49/month - 10,000 emails  
- **Agency:** $149/month - 50,000 emails

## Key Features
- Multi-tenant architecture with proper isolation
- Contact management with CSV import
- Campaign builder with HTML editor & preview
- Email queue processor for background sending
- Real-time analytics dashboard
- Dark/light mode theme
- Admin panel for tenant management
- Mobile-responsive design

## API Endpoints

### Authentication
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

### Contacts
- GET /api/contacts
- POST /api/contacts
- POST /api/contacts/upload (CSV)
- POST /api/contacts/bulk-delete

### Campaigns
- GET /api/campaigns
- GET /api/campaigns/:id
- POST /api/campaigns
- PATCH /api/campaigns/:id
- DELETE /api/campaigns/:id
- POST /api/campaigns/:id/send

### Other
- GET /api/dashboard/stats
- GET /api/analytics
- GET /api/unsubscribe (public)

## Running the Project
```bash
npm run dev          # Start development server
npm run db:push      # Push database schema
```

## Configuration Notes
- **Stripe:** Billing endpoints are placeholder - requires STRIPE_SECRET_KEY
- **AWS SES:** Email processor simulates sending - requires AWS credentials for production
- **JWT Secret:** Uses SESSION_SECRET environment variable

## Recent Changes
- Created complete database schema with 8 tables
- Built stunning landing page with features/pricing/testimonials
- Implemented full dashboard with sidebar navigation
- Added contact management with CSV upload
- Created campaign builder with HTML editor
- Implemented analytics with charts
- Added admin panel for tenant management
- Built background email queue processor
- Added tenant-specific security checks
