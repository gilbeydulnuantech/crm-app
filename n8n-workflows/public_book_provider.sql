-- Books an online appointment with a chosen provider (or the first free one when p_staff = 'any').
-- Everything happens inside one function so the slot check, the contact, the event and the owner message are consistent,
-- and an advisory lock stops two visitors taking the same slot at once.
DROP FUNCTION IF EXISTS public_book_provider(text, timestamptz, int, text, text, text, text);
CREATE OR REPLACE FUNCTION public_book_provider(
  p_staff text, p_start timestamptz, p_service int, p_first text, p_last text, p_email text, p_phone text, p_duration int DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE
  cfg record; slot_min int; step_min int; buf_min int; svc_durs jsonb := '[]'::jsonb; tier_min int; tier_price numeric; v_start int; v_end int; days jsonb; lead int; win int;
  local_ts timestamp; mins int; s timestamptz; e timestamptz;
  prov record; svc_id int; svc_name text; svc_price numeric; svc_type text; v_contact int; v_event int; digits text;
  notifier int; v_conv int; v_key text; txt text; tfmt text;
BEGIN
  SELECT timezone, booking_hours, online_provider_choice, time_format INTO cfg FROM company_profile WHERE id = 1;
  IF NOT FOUND OR cfg.online_provider_choice IS NOT TRUE THEN RETURN jsonb_build_object('status', 'disabled'); END IF;
  slot_min := (cfg.booking_hours->>'slot_minutes')::int; v_start := (cfg.booking_hours->>'start')::int; v_end := (cfg.booking_hours->>'end')::int;
  step_min := COALESCE(NULLIF((cfg.booking_hours->>'step_minutes')::int, 0), slot_min); buf_min := COALESCE((cfg.booking_hours->>'buffer_minutes')::int, 0);
  days := cfg.booking_hours->'days'; lead := COALESCE((cfg.booking_hours->>'lead_hours')::int, 2); win := COALESCE((cfg.booking_hours->>'window_days')::int, 14);
  -- Plain variables, not a record: a record that was never assigned (no service chosen) cannot be read.
  IF p_service IS NOT NULL THEN
    SELECT p.id, p.name, p.unit_price, et.key, p.durations INTO svc_id, svc_name, svc_price, svc_type, svc_durs
    FROM products p LEFT JOIN event_types et ON et.id = p.event_type_id
    WHERE p.id = p_service AND p.is_active AND p.bookable_online;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
    -- A service with several lengths (30 / 60 / 90 min ...) needs one of them chosen; its price comes from that choice.
    IF jsonb_array_length(svc_durs) > 0 THEN
      SELECT (t->>'minutes')::int, (t->>'price')::numeric INTO tier_min, tier_price
      FROM jsonb_array_elements(svc_durs) t WHERE (t->>'minutes')::int = p_duration LIMIT 1;
      IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
      slot_min := tier_min; svc_price := tier_price;
    END IF;
  END IF;
  s := p_start; e := s + make_interval(mins => slot_min);
  local_ts := s AT TIME ZONE cfg.timezone;
  mins := extract(hour from local_ts)::int * 60 + extract(minute from local_ts)::int;
  IF NOT (days @> to_jsonb(extract(dow from local_ts)::int)) OR mins < v_start * 60 OR mins + slot_min > v_end * 60
     OR (mins - v_start * 60) % step_min <> 0 OR s < now() + make_interval(hours => lead) OR s > now() + make_interval(days => win + 1) THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;


  PERFORM pg_advisory_xact_lock(hashtext('public_book_provider'));
  SELECT sm.id, sm.name, sm.owner_user_id INTO prov
  FROM staff_members sm JOIN users u ON u.id = sm.owner_user_id AND u.active
  WHERE sm.is_active AND sm.bookable_online AND (p_staff = 'any' OR sm.id::text = p_staff)
    AND NOT EXISTS (
      SELECT 1 FROM activities a
      WHERE a.staff_id = sm.id AND a.is_completed = false AND a.outcome IS NULL AND a.due_at < e + make_interval(mins => buf_min) AND COALESCE(a.end_at, a.due_at + interval '30 minutes') + make_interval(mins => buf_min) > s)
  ORDER BY lower(sm.name) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'taken'); END IF;

  digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  SELECT id INTO v_contact FROM contacts
  WHERE is_archived = false AND ((COALESCE(p_email, '') <> '' AND lower(email) = lower(p_email))
     OR (digits <> '' AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = digits))
  ORDER BY id LIMIT 1;
  IF v_contact IS NULL THEN
    INSERT INTO contacts (first_name, last_name, email, phone, lead_status, lead_source, owner_id, created_at, updated_at)
    VALUES (p_first, NULLIF(p_last, ''), NULLIF(p_email, ''), NULLIF(p_phone, ''), 'New', 'Online Booking', prov.owner_user_id, now(), now())
    RETURNING id INTO v_contact;
  ELSE
    UPDATE contacts SET owner_id = COALESCE(owner_id, prov.owner_user_id), updated_at = now() WHERE id = v_contact;
  END IF;

  INSERT INTO activities (contact_id, user_id, type, subject, due_at, end_at, staff_id, product_id, price, notify_contact)
  VALUES (v_contact, prov.owner_user_id, COALESCE(svc_type, 'meeting'), COALESCE(svc_name, 'Online booking'), s, e, prov.id, svc_id, svc_price, true)
  RETURNING id INTO v_event;

  -- Tell the owner (the branch user) in Team Chat. Sent by user 1, or by the system sender when user 1 is the owner.
  notifier := CASE WHEN prov.owner_user_id = 1 THEN 9 ELSE 1 END;
  v_key := least(notifier, prov.owner_user_id) || '-' || greatest(notifier, prov.owner_user_id);
  INSERT INTO conversations (type, dm_key, created_by) VALUES ('dm', v_key, notifier) ON CONFLICT (dm_key) WHERE type = 'dm' DO NOTHING;
  SELECT id INTO v_conv FROM conversations WHERE type = 'dm' AND dm_key = v_key;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (v_conv, notifier), (v_conv, prov.owner_user_id) ON CONFLICT DO NOTHING;
  tfmt := CASE WHEN cfg.time_format = '24h' THEN 'HH24:MI' ELSE 'FMHH12:MI AM' END;
  txt := 'New online booking: ' || btrim(p_first || ' ' || COALESCE(p_last, '')) || ' - ' || COALESCE(svc_name, 'appointment') || ' (' || slot_min || ' min) with ' || prov.name
         || ' on ' || to_char(local_ts, 'FMDy DD Mon') || ' at ' || to_char(local_ts, tfmt);
  INSERT INTO messages (conversation_id, sender_id, body)
  SELECT v_conv, notifier, txt
  WHERE EXISTS (SELECT 1 FROM users WHERE id = prov.owner_user_id AND COALESCE((notification_preferences->>'automation_dms')::boolean, true) = true);

  RETURN jsonb_build_object('status', 'booked', 'provider', prov.name, 'event_id', v_event, 'contact_id', v_contact, 'start', s);
END
$fn$;
