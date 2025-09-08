## Push notifications (outline)

- Store Expo push tokens in `profiles.expo_push_token` from the app (`src/lib/notifications.ts`).
- Create an Edge Function in Supabase that listens for low-stock items (cron or DB trigger) and sends pushes via Expo Push API.
- Alternatively, subscribe admins to `items_view` realtime and show in-app alerts (already works in Admin screen).

## Low-stock strategy

- DB computes `is_low` in `items_view` using `current_stock` and `low_stock_threshold`.
- You can add a trigger on `items` update to insert a row in `low_stock_alerts` table when `is_low` flips from false to true.
