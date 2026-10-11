-- Cancelled / no-show bookings. A booking with an outcome stays on the calendar (greyed out) but frees its time slot,
-- earns no commission, uses no package session and gets no reminders.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_outcome_check;
ALTER TABLE activities ADD CONSTRAINT activities_outcome_check CHECK (outcome IS NULL OR outcome IN ('cancelled', 'no_show'));

-- Cancel / no-show / restore. Owner or admin. A rep cannot change a visit that is already completed.
-- Setting an outcome also un-confirms the booking, which gives back any package or membership session.
CREATE OR REPLACE FUNCTION set_event_outcome(p_event int, p_outcome text, p_user int, p_is_admin boolean)
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE ev record;
BEGIN
  IF p_outcome IS NOT NULL AND p_outcome NOT IN ('cancelled', 'no_show') THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  SELECT id, user_id, is_completed, type INTO ev FROM activities WHERE id = p_event AND due_at IS NOT NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF ev.type = 'task' THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT p_is_admin AND ev.user_id IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF ev.is_completed AND NOT p_is_admin THEN RETURN jsonb_build_object('status', 'locked'); END IF;

  IF p_outcome IS NULL THEN
    UPDATE activities SET outcome = NULL WHERE id = p_event;
  ELSE
    UPDATE activities SET outcome = p_outcome, is_completed = false, completed_at = NULL,
      confirmed_at = NULL, confirmed_by = NULL, discount_card_id = NULL, discount_name = NULL, discount_percent = NULL,
      client_package_id = NULL, client_membership_id = NULL, redeemed_value = NULL, payment_method = NULL, paid_at = NULL, paid_by = NULL
    WHERE id = p_event;
  END IF;
  RETURN jsonb_build_object('status', 'ok', 'outcome', p_outcome);
END
$fn$;

-- A cancelled or no-show booking cannot be completed; restore it first.
CREATE OR REPLACE FUNCTION activities_outcome_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.outcome IS NOT NULL AND NEW.is_completed THEN
    RAISE EXCEPTION 'This booking is cancelled or a no-show. Restore it before completing it.';
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS trg_activities_outcome_guard ON activities;
CREATE TRIGGER trg_activities_outcome_guard BEFORE INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION activities_outcome_guard();
