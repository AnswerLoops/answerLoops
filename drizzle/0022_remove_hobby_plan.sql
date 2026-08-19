-- There is no free tier. 'hobby' was a $0 plan the app fell back to for any
-- org with a canceled or missing subscription, which meant 50 free AI
-- deflections/month indefinitely with no payment ever required. The app no
-- longer recognizes 'hobby' as a valid PlanId (lib/billing/plans.ts) —
-- access is now gated on subscription status (hasActiveAccess), not just
-- which plan a row names. Any existing row still carrying 'hobby' is
-- explicitly canceled here as defense in depth, on top of getPlan()
-- already returning null for it.
UPDATE subscriptions SET status = 'canceled' WHERE plan_id = 'hobby' AND status != 'canceled';
--> statement-breakpoint
ALTER TABLE subscriptions ALTER COLUMN plan_id DROP DEFAULT;
