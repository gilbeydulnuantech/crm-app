-- Spa / Salon automation rules. They use the existing Automation Engine (it checks calendar events and contacts every
-- 30 seconds), so no webhook or extra n8n workflow is needed. Reps can edit the wording in Automation rules.
-- Cancelled / No-show fire when the rep picks that status in the event card's ⋮ menu. Birthday repeats every year.
DO $do$
DECLARE a1 int; a2 int; a3 int;
  link text := 'https://sequence-crumpet-available.ngrok-free.dev/book';
BEGIN
  IF EXISTS (SELECT 1 FROM automations WHERE name LIKE 'Spa/Salon -%') THEN RAISE NOTICE 'Spa rules already exist'; RETURN; END IF;

  INSERT INTO automations (name, trigger_type, trigger_config, is_active, created_by)
  VALUES ('Spa/Salon - Booking Cancelled', 'calendar', '{"field": "outcome", "value": "cancelled", "operator": "equals"}', true, 1) RETURNING id INTO a1;
  INSERT INTO automation_actions (automation_id, branch, action_type, action_config, sort_order, step_key, parent_step_key) VALUES
   (a1, 'default', 'add_tag', '{"tag_name": "canceled"}', 0, 1, NULL),
   (a1, 'default', 'send_team_notification', '{"message": "Team, {{contact.first_name}} cancelled {{appointment.title}} ({{appointment.start_time}}).", "channel_id": 1}', 1, 2, NULL),
   (a1, 'default', 'condition', '{"field": "do_not_contact", "value": false, "operator": "is_false"}', 2, 3, NULL),
   (a1, 'true', 'condition', '{"field": "dnc_email", "value": false, "operator": "is_false"}', 0, 4, 3),
   (a1, 'true', 'send_email', jsonb_build_object('is_html', true, 'subject', 'Your booking has been cancelled, {{contact.first_name}}',
     'body', '<p>Hi {{contact.first_name}},</p><p>Your booking for {{appointment.title}} on {{appointment.start_time}} has been cancelled.</p><p>Whenever you would like to come back, you can pick a new time here: <a href="' || link || '">Book again</a>. You can also just reply to this email.</p><p>{{user.company_name}} Team</p>'), 0, 5, 4);

  INSERT INTO automations (name, trigger_type, trigger_config, is_active, created_by)
  VALUES ('Spa/Salon - No-Show', 'calendar', '{"field": "outcome", "value": "no_show", "operator": "equals"}', true, 1) RETURNING id INTO a2;
  INSERT INTO automation_actions (automation_id, branch, action_type, action_config, sort_order, step_key, parent_step_key) VALUES
   (a2, 'default', 'add_tag', '{"tag_name": "no show"}', 0, 1, NULL),
   (a2, 'default', 'send_team_notification', '{"message": "Team, {{contact.first_name}} did not show up for {{appointment.title}} ({{appointment.start_time}}).", "channel_id": 1}', 1, 2, NULL),
   (a2, 'default', 'condition', '{"field": "do_not_contact", "value": false, "operator": "is_false"}', 2, 3, NULL),
   (a2, 'true', 'condition', '{"field": "dnc_email", "value": false, "operator": "is_false"}', 0, 4, 3),
   (a2, 'true', 'send_email', jsonb_build_object('is_html', true, 'subject', 'We missed you, {{contact.first_name}}',
     'body', '<p>Hi {{contact.first_name}},</p><p>We had you booked for {{appointment.title}} on {{appointment.start_time}} but were not able to see you. No worries, these things happen!</p><p>If you would still like to come in, you can choose a new time here: <a href="' || link || '">Book again</a>. You can also just reply to this email.</p><p>{{user.company_name}} Team</p>'), 0, 5, 4);

  INSERT INTO automations (name, trigger_type, trigger_config, is_active, created_by)
  VALUES ('Spa/Salon - Birthday Greeting', 'contact', '{"field": "birthday_today", "value": true, "operator": "is_true"}', true, 1) RETURNING id INTO a3;
  INSERT INTO automation_actions (automation_id, branch, action_type, action_config, sort_order, step_key, parent_step_key) VALUES
   (a3, 'default', 'condition', '{"field": "local_hour", "value": 8, "operator": "greater_than"}', 0, 1, NULL),
   (a3, 'true', 'condition', '{"field": "do_not_contact", "value": false, "operator": "is_false"}', 0, 2, 1),
   (a3, 'true', 'condition', '{"field": "dnc_email", "value": false, "operator": "is_false"}', 0, 3, 2),
   (a3, 'true', 'send_email', jsonb_build_object('is_html', true, 'subject', 'Happy birthday, {{contact.first_name}}!',
     'body', '<p>Hi {{contact.first_name}},</p><p>Everyone at {{user.company_name}} wishes you a very happy birthday!</p><p>Treat yourself to some time out. You can book your next visit here: <a href="' || link || '">Book now</a>.</p><p>{{user.company_name}} Team</p>'), 0, 4, 3);
END
$do$;
