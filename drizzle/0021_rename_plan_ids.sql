-- Renames the two lowest paid plan ids to match the display names shipped
-- in PR #204 (old "Pro" plan -> displays as "Standard"; old "Scale" plan ->
-- displays as "Pro"). The id was deliberately left unrenamed in that PR;
-- this closes the gap.
--
-- Order matters. 'pro' -> 'standard' must run before 'scale' -> 'pro' —
-- reversing the order would let rows already renamed to 'pro' in the first
-- pass collide with the second statement's WHERE plan_id = 'scale' match
-- if it ran first and produced 'pro' rows before the first statement had a
-- chance to move the *original* 'pro' rows out of the way.
UPDATE subscriptions SET plan_id = 'standard' WHERE plan_id = 'pro';
--> statement-breakpoint
UPDATE subscriptions SET plan_id = 'pro' WHERE plan_id = 'scale';
