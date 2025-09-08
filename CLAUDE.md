# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native Expo application for inventory management called "Mantra Vibes" - a cross-platform inventory tracker for books, souvenirs, and gift items. The app uses Supabase for backend services including authentication, database, and real-time features.

## Development Commands

```bash
# Start development server
npm start
# or
npx expo start

# Run on specific platforms
expo run:android
expo run:ios
expo start --web

# Code quality
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues where possible
npm run format        # Format code with Prettier
npm run format:check  # Check if code is formatted correctly
```

## Architecture

### Tech Stack

- **Frontend**: React Native 0.79.5 with Expo 53.0.20
- **Navigation**: React Navigation v6 (Stack + Bottom Tabs)
- **UI Library**: React Native Paper 5.12.5
- **State Management**: TanStack React Query 5.51.1 + React Context
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: React Native Paper theming
- **Storage**: Expo SecureStore for auth tokens

### Project Structure

```
src/
├── App.tsx              # Main app component with navigation setup
├── components/          # Reusable UI components
├── contexts/           # React Context providers (ReportContext)
├── hooks/              # Custom hooks (useProfileRole)
├── lib/                # Core utilities
│   ├── supabase.ts     # Supabase client configuration
│   ├── notifications.ts # Push notification helpers
│   └── utils.ts        # General utilities
└── screens/            # Screen components
    ├── AuthScreen.tsx
    ├── ItemsScreen.tsx
    ├── AddItemScreen.tsx
    ├── StockReportScreen.tsx
    ├── ReportsScreen.tsx
    ├── AdminScreen.tsx
    └── ProfileScreen.tsx

supabase/
├── schema.sql          # Complete database schema
├── seed_admin.sql      # Admin user setup
└── notes.md           # Implementation notes
```

### Key Architecture Patterns

#### Authentication & Authorization

- Uses Supabase Auth with email/password
- Role-based access control (user/admin) stored in `profiles` table
- Admin-specific screens conditionally rendered based on role
- Secure token storage with Expo SecureStore

#### Database Design

- **Items**: Core inventory items with stock tracking and low-stock thresholds
- **Tags**: Flexible tagging system with many-to-many relationship to items
- **Stock Reports**: Both single-item and multi-item batch reporting
- **Profiles**: User management with roles and push token storage
- Uses PostgreSQL views (`items_view`) for computed fields like `is_low` flag
- Row Level Security (RLS) policies for data access control

#### State Management

- React Query for server state management and caching
- ReportContext for multi-item stock report state
- Local React state for UI interactions

#### Real-time Features

- Supabase real-time subscriptions for live data updates
- Low-stock alerts for admin users
- In-app notification system ready for push notifications

## Environment Setup

1. Create Supabase project and obtain URL + anon key
2. Run `supabase/schema.sql` in Supabase SQL editor
3. Configure `.env` file:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Set first user as admin in profiles table or use `supabase/seed_admin.sql`

## Key Features Implementation

### Inventory Management

- Items have current stock, low-stock thresholds, and flexible tagging
- Stock automatically decrements based on sales reports
- Search and filter capabilities by tags

### Reporting System

- Single-item reports: individual stock transactions
- Multi-item batch reports: bulk stock updates with total revenue
- Date-range reporting with sales analytics
- Editable reports (long-press to edit/delete)

### Admin Features

- Total stock overview
- Low-stock alerts and notifications
- Sales reporting with date ranges
- User management capabilities

### Role-Based Navigation

- Bottom tab navigation with conditional admin tab
- Stack navigation for modal screens (Add Item)
- Authentication flow with persistent sessions

## Database Functions (RPC)

- `add_item_with_tags()`: Creates items with CSV tag input
- `record_stock_report()`: Atomic single-item stock reporting
- `record_stock_report_multi()`: Batch multi-item reporting
- `reports_between()`: Date-range report queries

## Notification System

Push notifications are outlined but not fully implemented. See `src/lib/notifications.ts` and `supabase/notes.md` for implementation guidance using Expo push tokens and Supabase Edge Functions.
