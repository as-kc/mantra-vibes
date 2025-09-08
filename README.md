# React Native (Expo) + Supabase Inventory Starter

Cross-platform inventory tracker for books, souvenirs, and gift items.
Features:

- Email/password auth with roles (user/admin)
- Items with tags and low-stock threshold
- Stock reports (start, end, sold, optional revenue)
- Inventory auto-decrement based on reports
- Search + filter by tags
- Admin: total stock, low-stock alerts (in-app), date-range sales report
- Editable reports

## Getting Started

1. **Create a Supabase project** and copy your Project URL + anon key.
2. In Supabase SQL editor, run `supabase/schema.sql` from this repo.
3. Copy `.env.example` to `.env` and fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Install deps and run:

```bash
npm install
npx expo start
```

Login on a device with the Expo Go app or run an emulator/simulator.

### Admin Role

- After your first user signs up, set their role to `admin` in the `profiles` table (use Supabase dashboard).
- Or run the helper SQL in `supabase/seed_admin.sql` with your user ID/email.

### Low-stock notifications

This starter shows **in-app** low-stock banners for admins and a Realtime alert stream.
For push notifications, add an Edge Function to send Expo push notifications using stored device tokens.
See `supabase/notes.md` and `src/lib/notifications.ts` for pointers.

### Editing Reports

Long-press a report row to edit or delete.

---
