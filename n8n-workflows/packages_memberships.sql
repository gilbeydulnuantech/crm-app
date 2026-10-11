-- Payments on events, prepaid packages, and memberships.

-- How the client paid for a visit, and when. Package and membership-included visits are marked paid automatically.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Package catalog: "10 massages" for one price, valid for some days, for any service or one specific service.
CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sessions INTEGER NOT NULL CHECK (sessions > 0),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  valid_days INTEGER NOT NULL DEFAULT 180 CHECK (valid_days > 0),
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS packages_name_lower ON packages (lower(name));
-- A package a client bought. Name and prices are copied so later catalog changes never alter it.
CREATE TABLE IF NOT EXISTS client_packages (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sessions_total INTEGER NOT NULL,
  price_paid NUMERIC(12,2) NOT NULL,
  session_value NUMERIC(12,2) NOT NULL,      -- price_paid / sessions: what one visit is worth (basis for commission)
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_method TEXT,
  sold_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_client_packages_contact ON client_packages (contact_id);

CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  period_days INTEGER NOT NULL DEFAULT 30 CHECK (period_days > 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  included_sessions INTEGER NOT NULL DEFAULT 0 CHECK (included_sessions >= 0),   -- visits included in each period (0 = none)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS membership_plans_name_lower ON membership_plans (lower(name));
CREATE TABLE IF NOT EXISTS client_memberships (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  period_days INTEGER NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  included_sessions INTEGER NOT NULL DEFAULT 0,
  session_value NUMERIC(12,2) NOT NULL DEFAULT 0,  -- price / included_sessions
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  renews_at TIMESTAMPTZ NOT NULL,                  -- paid up to here; the benefits stop after it until renewed
  payment_method TEXT,
  sold_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_client_memberships_contact ON client_memberships (contact_id);

-- What covered a visit: a package session or a membership-included session (redeemed_value = the session's worth).
ALTER TABLE activities ADD COLUMN IF NOT EXISTS client_package_id INTEGER REFERENCES client_packages(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS client_membership_id INTEGER REFERENCES client_memberships(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS redeemed_value NUMERIC(12,2);
CREATE INDEX IF NOT EXISTS idx_activities_client_package ON activities (client_package_id) WHERE client_package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_client_membership ON activities (client_membership_id) WHERE client_membership_id IS NOT NULL;

-- Money fields: a redeemed session counts at its saved worth instead of price minus discount.
CREATE OR REPLACE FUNCTION activities_recalc_money() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.is_completed AND NEW.confirmed_at IS NULL AND (NEW.price IS NOT NULL OR NEW.staff_id IS NOT NULL)
     AND (TG_OP = 'INSERT' OR OLD.is_completed IS DISTINCT FROM true) THEN
    NEW.confirmed_at := now();
  END IF;
  IF NEW.confirmed_at IS NULL THEN
    NEW.amount_paid := NULL; NEW.commission_percent := NULL; NEW.commission_amount := NULL;
    RETURN NEW;
  END IF;
  NEW.amount_paid := CASE
    WHEN NEW.redeemed_value IS NOT NULL THEN NEW.redeemed_value
    WHEN NEW.price IS NULL THEN NULL
    ELSE round(NEW.price * (1 - COALESCE(NEW.discount_percent, 0) / 100.0), 2) END;
  IF NEW.staff_id IS NULL THEN
    NEW.commission_percent := NULL; NEW.commission_amount := NULL;
  ELSE
    IF TG_OP = 'INSERT' OR OLD.confirmed_at IS NULL OR NEW.staff_id IS DISTINCT FROM OLD.staff_id OR NEW.commission_percent IS NULL THEN
      SELECT sm.commission_percent INTO NEW.commission_percent FROM staff_members sm WHERE sm.id = NEW.staff_id;
    END IF;
    NEW.commission_amount := CASE WHEN NEW.amount_paid IS NULL THEN NULL
                                  ELSE round(NEW.amount_paid * COALESCE(NEW.commission_percent, 0) / 100.0, 2) END;
  END IF;
  RETURN NEW;
END
$fn$;

-- Sessions left on a package / included sessions left in a membership's current period.
CREATE OR REPLACE FUNCTION package_remaining(p_id int) RETURNS int LANGUAGE sql STABLE AS $$
  SELECT cp.sessions_total - (SELECT count(*)::int FROM activities a WHERE a.client_package_id = cp.id AND a.confirmed_at IS NOT NULL)
  FROM client_packages cp WHERE cp.id = p_id;
$$;
CREATE OR REPLACE FUNCTION membership_remaining(p_id int) RETURNS int LANGUAGE sql STABLE AS $$
  SELECT cm.included_sessions - (SELECT count(*)::int FROM activities a
      WHERE a.client_membership_id = cm.id AND a.redeemed_value IS NOT NULL AND a.confirmed_at IS NOT NULL
        AND a.due_at >= cm.period_start AND a.due_at < cm.renews_at)
  FROM client_memberships cm WHERE cm.id = p_id;
$$;

-- Replaces the version in event_billing.sql: adds the package / membership choices.
DROP FUNCTION IF EXISTS confirm_event_billing(int, int, int, boolean, boolean);
CREATE OR REPLACE FUNCTION confirm_event_billing(
  p_event int, p_card int, p_user int, p_is_admin boolean, p_unconfirm boolean DEFAULT false,
  p_package int DEFAULT NULL, p_membership int DEFAULT NULL, p_membership_mode text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE
  ev record; v_card_id int; v_card_name text; v_card_pct numeric;
  v_pkg int; v_pkg_value numeric; v_mem int; v_mem_value numeric; v_mem_name text; v_mem_pct numeric; v_contact int;
  v_choices int;
BEGIN
  SELECT id, user_id, contact_id, product_id, due_at, is_completed, confirmed_at INTO ev FROM activities WHERE id = p_event AND due_at IS NOT NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT p_is_admin AND ev.user_id IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF ev.is_completed AND NOT p_is_admin THEN RETURN jsonb_build_object('status', 'locked'); END IF;

  IF p_unconfirm THEN
    IF NOT p_is_admin THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
    UPDATE activities SET confirmed_at = NULL, confirmed_by = NULL, discount_card_id = NULL, discount_name = NULL, discount_percent = NULL,
      client_package_id = NULL, client_membership_id = NULL, redeemed_value = NULL, payment_method = NULL, paid_at = NULL, paid_by = NULL WHERE id = p_event;
  ELSE
    v_choices := (p_card IS NOT NULL)::int + (p_package IS NOT NULL)::int + (p_membership IS NOT NULL)::int;
    IF v_choices > 1 THEN RETURN jsonb_build_object('status', 'one_choice'); END IF;

    IF p_card IS NOT NULL THEN
      SELECT id, name, percent INTO v_card_id, v_card_name, v_card_pct FROM discount_cards WHERE id = p_card AND is_active;
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid_card'); END IF;
    ELSIF p_package IS NOT NULL THEN
      SELECT cp.id, cp.session_value INTO v_pkg, v_pkg_value FROM client_packages cp
      WHERE cp.id = p_package AND cp.contact_id = ev.contact_id AND cp.status = 'active' AND cp.expires_at >= now()
        AND (cp.product_id IS NULL OR cp.product_id = ev.product_id);
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid_package'); END IF;
      -- This event may already hold a session of the same package; only a different one needs a free session.
      IF (SELECT client_package_id FROM activities WHERE id = p_event) IS DISTINCT FROM v_pkg AND package_remaining(v_pkg) <= 0 THEN
        RETURN jsonb_build_object('status', 'no_sessions');
      END IF;
    ELSIF p_membership IS NOT NULL THEN
      SELECT cm.id, cm.session_value, cm.name, cm.discount_percent INTO v_mem, v_mem_value, v_mem_name, v_mem_pct FROM client_memberships cm
      WHERE cm.id = p_membership AND cm.contact_id = ev.contact_id AND cm.status = 'active' AND cm.renews_at >= now();
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid_membership'); END IF;
      IF p_membership_mode = 'session' THEN
        IF (SELECT client_membership_id FROM activities WHERE id = p_event) IS DISTINCT FROM v_mem AND membership_remaining(v_mem) <= 0 THEN
          RETURN jsonb_build_object('status', 'no_sessions');
        END IF;
      ELSIF p_membership_mode <> 'discount' OR p_membership_mode IS NULL THEN
        RETURN jsonb_build_object('status', 'invalid_membership');
      END IF;
    END IF;

    UPDATE activities SET
      discount_card_id = v_card_id,
      discount_name = CASE WHEN v_card_id IS NOT NULL THEN v_card_name WHEN p_membership IS NOT NULL AND p_membership_mode = 'discount' THEN 'Membership: ' || v_mem_name END,
      discount_percent = CASE WHEN v_card_id IS NOT NULL THEN v_card_pct WHEN p_membership IS NOT NULL AND p_membership_mode = 'discount' THEN v_mem_pct END,
      client_package_id = v_pkg,
      client_membership_id = v_mem,
      redeemed_value = CASE WHEN v_pkg IS NOT NULL THEN v_pkg_value WHEN v_mem IS NOT NULL AND p_membership_mode = 'session' THEN v_mem_value END,
      confirmed_at = COALESCE(confirmed_at, now()), confirmed_by = COALESCE(confirmed_by, p_user)
    WHERE id = p_event;
    -- A visit covered by a package or an included session is paid for already.
    IF v_pkg IS NOT NULL OR (v_mem IS NOT NULL AND p_membership_mode = 'session') THEN
      UPDATE activities SET payment_method = CASE WHEN v_pkg IS NOT NULL THEN 'package' ELSE 'membership' END, paid_at = COALESCE(paid_at, now()), paid_by = COALESCE(paid_by, p_user) WHERE id = p_event;
    ELSIF (SELECT payment_method FROM activities WHERE id = p_event) IN ('package', 'membership') THEN
      UPDATE activities SET payment_method = NULL, paid_at = NULL, paid_by = NULL WHERE id = p_event;
    END IF;
  END IF;
  RETURN (SELECT jsonb_build_object('status', 'ok', 'price', price, 'discount_name', discount_name, 'discount_percent', discount_percent,
            'amount_paid', amount_paid, 'commission_percent', commission_percent, 'commission_amount', commission_amount,
            'confirmed_at', confirmed_at, 'payment_method', payment_method, 'paid_at', paid_at) FROM activities WHERE id = p_event);
END
$fn$;

-- Record how the client paid (cash / kaspi / card) once the booking is confirmed. The owner or an admin can do it; only an admin can undo it.
CREATE OR REPLACE FUNCTION mark_event_paid(p_event int, p_method text, p_user int, p_is_admin boolean, p_unpaid boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE ev record;
BEGIN
  SELECT id, user_id, confirmed_at, payment_method, paid_at INTO ev FROM activities WHERE id = p_event AND due_at IS NOT NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT p_is_admin AND ev.user_id IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF ev.confirmed_at IS NULL THEN RETURN jsonb_build_object('status', 'not_confirmed'); END IF;
  IF ev.payment_method IN ('package', 'membership') THEN RETURN jsonb_build_object('status', 'prepaid'); END IF;
  IF p_unpaid THEN
    IF NOT p_is_admin THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
    UPDATE activities SET payment_method = NULL, paid_at = NULL, paid_by = NULL WHERE id = p_event;
  ELSE
    IF p_method NOT IN ('cash', 'kaspi', 'card') THEN RETURN jsonb_build_object('status', 'invalid_method'); END IF;
    IF ev.paid_at IS NOT NULL AND NOT p_is_admin THEN RETURN jsonb_build_object('status', 'locked'); END IF;
    UPDATE activities SET payment_method = p_method, paid_at = COALESCE(paid_at, now()), paid_by = COALESCE(paid_by, p_user) WHERE id = p_event;
  END IF;
  RETURN (SELECT jsonb_build_object('status', 'ok', 'payment_method', payment_method, 'paid_at', paid_at) FROM activities WHERE id = p_event);
END
$fn$;

-- Selling. The owner of the contact or an admin can sell; the price and rules are copied onto the client's record.
CREATE OR REPLACE FUNCTION sell_package(p_contact int, p_package int, p_method text, p_user int, p_is_admin boolean) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE c record; pk record; v_id int;
BEGIN
  IF p_method NOT IN ('cash', 'kaspi', 'card') THEN RETURN jsonb_build_object('status', 'invalid_method'); END IF;
  SELECT id, owner_id INTO c FROM contacts WHERE id = p_contact AND is_archived = false;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT p_is_admin AND c.owner_id IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  SELECT id, name, sessions, price, valid_days, product_id INTO pk FROM packages WHERE id = p_package AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid_package'); END IF;
  INSERT INTO client_packages (contact_id, package_id, name, sessions_total, price_paid, session_value, product_id, expires_at, payment_method, sold_by)
  VALUES (p_contact, pk.id, pk.name, pk.sessions, pk.price, round(pk.price / pk.sessions, 2), pk.product_id, now() + make_interval(days => pk.valid_days), p_method, p_user)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('status', 'ok', 'id', v_id);
END
$fn$;

CREATE OR REPLACE FUNCTION sell_membership(p_contact int, p_plan int, p_method text, p_user int, p_is_admin boolean) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE c record; pl record; v_id int;
BEGIN
  IF p_method NOT IN ('cash', 'kaspi', 'card') THEN RETURN jsonb_build_object('status', 'invalid_method'); END IF;
  SELECT id, owner_id INTO c FROM contacts WHERE id = p_contact AND is_archived = false;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT p_is_admin AND c.owner_id IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  SELECT id, name, price, period_days, discount_percent, included_sessions INTO pl FROM membership_plans WHERE id = p_plan AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid_plan'); END IF;
  IF EXISTS (SELECT 1 FROM client_memberships WHERE contact_id = p_contact AND plan_id = pl.id AND status = 'active' AND renews_at >= now()) THEN
    RETURN jsonb_build_object('status', 'already_active');
  END IF;
  INSERT INTO client_memberships (contact_id, plan_id, name, price, period_days, discount_percent, included_sessions, session_value, period_start, renews_at, payment_method, sold_by)
  VALUES (p_contact, pl.id, pl.name, pl.price, pl.period_days, pl.discount_percent, pl.included_sessions,
          CASE WHEN pl.included_sessions > 0 THEN round(pl.price / pl.included_sessions, 2) ELSE 0 END,
          now(), now() + make_interval(days => pl.period_days), p_method, p_user)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('status', 'ok', 'id', v_id);
END
$fn$;

-- Renewing takes another payment and adds one period: from the end of the current one if it hasn't run out, otherwise from today.
CREATE OR REPLACE FUNCTION renew_membership(p_membership int, p_method text, p_user int, p_is_admin boolean) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE m record; owner int; v_from timestamptz;
BEGIN
  IF p_method NOT IN ('cash', 'kaspi', 'card') THEN RETURN jsonb_build_object('status', 'invalid_method'); END IF;
  SELECT cm.id, cm.contact_id, cm.status, cm.renews_at, cm.period_days INTO m FROM client_memberships cm WHERE cm.id = p_membership;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  SELECT owner_id INTO owner FROM contacts WHERE id = m.contact_id;
  IF NOT p_is_admin AND owner IS DISTINCT FROM p_user THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF m.status <> 'active' THEN RETURN jsonb_build_object('status', 'cancelled'); END IF;
  v_from := GREATEST(m.renews_at, now());
  UPDATE client_memberships SET period_start = v_from, renews_at = v_from + make_interval(days => m.period_days), payment_method = p_method, sold_by = p_user WHERE id = p_membership;
  RETURN jsonb_build_object('status', 'ok');
END
$fn$;
