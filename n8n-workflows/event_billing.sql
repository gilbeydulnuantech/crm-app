-- Discount cards (promotions), therapist commission, and the money fields on an event.
CREATE TABLE IF NOT EXISTS discount_cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  percent NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS discount_cards_name_lower ON discount_cards (lower(name));

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (commission_percent >= 0 AND commission_percent <= 100);

-- price (already on events) is the list price saved at booking. Confirming the booking saves the discount that applies;
-- amount_paid and commission_* are worked out by the trigger below, so they can never drift from price/discount/staff.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS discount_card_id INTEGER REFERENCES discount_cards(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS discount_name TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2);
CREATE INDEX IF NOT EXISTS idx_activities_commission ON activities (staff_id, due_at) WHERE confirmed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION activities_recalc_money() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  -- Completing a priced booking that was never confirmed confirms it (no discount), so revenue and commission are captured.
  IF NEW.is_completed AND NEW.confirmed_at IS NULL AND (NEW.price IS NOT NULL OR NEW.staff_id IS NOT NULL)
     AND (TG_OP = 'INSERT' OR OLD.is_completed IS DISTINCT FROM true) THEN
    NEW.confirmed_at := now();
  END IF;

  IF NEW.confirmed_at IS NULL THEN
    NEW.amount_paid := NULL; NEW.commission_percent := NULL; NEW.commission_amount := NULL;
    RETURN NEW;
  END IF;

  NEW.amount_paid := CASE WHEN NEW.price IS NULL THEN NULL
                          ELSE round(NEW.price * (1 - COALESCE(NEW.discount_percent, 0) / 100.0), 2) END;
  IF NEW.staff_id IS NULL THEN
    NEW.commission_percent := NULL; NEW.commission_amount := NULL;
  ELSE
    -- The rate is saved when the booking is confirmed (or when its staff member changes) so later rate changes don't rewrite history.
    IF TG_OP = 'INSERT' OR OLD.confirmed_at IS NULL OR NEW.staff_id IS DISTINCT FROM OLD.staff_id OR NEW.commission_percent IS NULL THEN
      SELECT sm.commission_percent INTO NEW.commission_percent FROM staff_members sm WHERE sm.id = NEW.staff_id;
    END IF;
    NEW.commission_amount := CASE WHEN NEW.amount_paid IS NULL THEN NULL
                                  ELSE round(NEW.amount_paid * COALESCE(NEW.commission_percent, 0) / 100.0, 2) END;
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS trg_activities_recalc_money ON activities;
CREATE TRIGGER trg_activities_recalc_money BEFORE INSERT OR UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION activities_recalc_money();

-- Confirm a booking and pick the discount card (or clear it). Reps can do this for their own events until the visit is
-- completed; after that only an admin can change it, and the commission follows automatically.
CREATE OR REPLACE FUNCTION confirm_event_billing(p_event int, p_card int, p_user int, p_is_admin boolean, p_unconfirm boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE ev record; v_card_id int; v_card_name text; v_card_pct numeric;
BEGIN
  SELECT id, user_id, is_completed, confirmed_at INTO ev FROM activities WHERE id = p_event AND due_at IS NOT NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT p_is_admin AND ev.user_id IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF ev.is_completed AND NOT p_is_admin THEN RETURN jsonb_build_object('status', 'locked'); END IF;
  IF p_unconfirm THEN
    IF NOT p_is_admin THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
    UPDATE activities SET confirmed_at = NULL, confirmed_by = NULL, discount_card_id = NULL, discount_name = NULL, discount_percent = NULL WHERE id = p_event;
  ELSE
    IF p_card IS NOT NULL THEN
      SELECT id, name, percent INTO v_card_id, v_card_name, v_card_pct FROM discount_cards WHERE id = p_card AND is_active;
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid_card'); END IF;
    END IF;
    UPDATE activities SET discount_card_id = v_card_id, discount_name = v_card_name, discount_percent = v_card_pct,
      confirmed_at = COALESCE(confirmed_at, now()), confirmed_by = COALESCE(confirmed_by, p_user)
    WHERE id = p_event;
  END IF;
  RETURN (SELECT jsonb_build_object('status', 'ok', 'price', price, 'discount_name', discount_name, 'discount_percent', discount_percent,
            'amount_paid', amount_paid, 'commission_percent', commission_percent, 'commission_amount', commission_amount,
            'confirmed_at', confirmed_at) FROM activities WHERE id = p_event);
END
$fn$;
