-- Demo data for recording a sales video: "Summit Ridge Roofing & Restoration".
--
-- Run (atomic):   psql -d n8n_vectordb -1 -f demo/seed_roofing_demo.sql
-- Undo everything: psql -d n8n_vectordb -1 -f demo/clean_roofing_demo.sql
--
-- Every row this script creates is recorded in demo_seed_registry, so the cleanup
-- removes exactly those rows and nothing else. The company profile is backed up
-- first and restored by the cleanup (emails/invoices/contracts show the demo
-- company name while the demo is loaded).
--
-- SAFE BY DESIGN — your live n8n engines poll this database and email contacts, so
-- this data is built not to trigger any of them:
--   * no deals in the stages that automations/engines watch: booked(19), canceled(20),
--     inspection done(21), final inspection(29), no-show(38), closed: lost(33)
--   * the 3 won deals (closed: won, 32) get a deal_won_actions row marked as already
--     processed, so no kickoff / review-request emails are sent
--   * no proposals, contracts, or meetings (those drive the proposal/contract/booking
--     reminder automations); tasks only
--   * no 'down_payment' / 'final' invoices (those drive the invoice reminder engines)
--   * every contact email is a plus-address of the admin mailbox
--     (gilbeydulnuan+name@gmail.com), so even a stray email lands in your own inbox
--   * no maintenance interval on won deals, no birthdates, recent contact activity

DO $$
BEGIN
  IF to_regclass('public.demo_seed_registry') IS NOT NULL THEN
    RAISE EXCEPTION 'Demo data is already loaded (demo_seed_registry exists). Run demo/clean_roofing_demo.sql first.';
  END IF;
END $$;

CREATE TABLE demo_seed_registry (table_name text NOT NULL, row_id int NOT NULL);
CREATE TABLE demo_company_profile_backup AS SELECT * FROM company_profile;

-- Company profile shown on screen, emails, invoices and contracts while the demo is loaded.
UPDATE company_profile SET
  company_name = 'Summit Ridge Roofing & Restoration',
  phone = '(303) 555-0142',
  address = '4120 Ridgeview Drive, Denver, CO 80202',
  website = 'summitridgeroofing.example',
  logo_url = NULL,
  brand_color = '#C2410C',
  updated_at = now()
WHERE id = 1;

DO $$
DECLARE
  base_email constant text := 'gilbeydulnuan';
  stage_ids int[]; pipe constant int := 3;
  co int[]; c int[]; d int[]; w int[]; inv int[];
  v int; i int;
  tag_storm int; tag_ins int; tag_vip int;
  -- people: first, last, title, company idx (0 = none), slug, city, zip, source, status, owner, days since created
  people text[][] := ARRAY[
    ['Daniel','Ortega','Homeowner','0','daniel.ortega','Denver','80220','Google Search','Active','2','21'],
    ['Priya','Nair','Homeowner','0','priya.nair','Aurora','80012','Referral','Active','3','18'],
    ['Margaret','Collins','Property Manager','1','margaret.collins','Denver','80206','Storm Campaign','Active','1','25'],
    ['Tom','Hendricks','Homeowner','0','tom.hendricks','Lakewood','80226','Facebook Ad','Active','2','15'],
    ['Luis','Fernandez','Facilities Manager','2','luis.fernandez','Aurora','80011','Referral','Active','3','30'],
    ['Aisha','Patel','Homeowner','0','aisha.patel','Arvada','80002','Website Form','Active','2','12'],
    ['Brian','Kowalski','Homeowner','0','brian.kowalski','Littleton','80120','Google Search','Active','1','28'],
    ['Chloe','Nguyen','Homeowner','0','chloe.nguyen','Denver','80210','Storm Campaign','Active','3','10'],
    ['Robert','Sanders','Homeowner','0','robert.sanders','Centennial','80112','Referral','Active','2','40'],
    ['Elena','Rossi','Homeowner','0','elena.rossi','Denver','80218','Google Search','Customer','1','55'],
    ['Marcus','Johnson','Homeowner','0','marcus.johnson','Aurora','80013','Referral','Customer','3','62'],
    ['Hannah','Lee','Homeowner','0','hannah.lee','Lakewood','80215','Website Form','Customer','2','48'],
    ['Victor','Alvarez','Homeowner','0','victor.alvarez','Denver','80222','Facebook Ad','New','2','3'],
    ['Sophie','Turner','Homeowner','0','sophie.turner','Arvada','80003','Website Form','New','3','2']
  ];
BEGIN
  -- companies
  FOR i IN 1..2 LOOP
    INSERT INTO companies (name, industry, city, state, country, phone, owner_id, created_by, street_address, zip_code, lead_source)
    VALUES (CASE i WHEN 1 THEN 'Maple Court HOA' ELSE 'Northgate Apartments' END, 'Property Management',
            CASE i WHEN 1 THEN 'Denver' ELSE 'Aurora' END, 'CO', 'US', '(303) 555-01' || (60+i), 1, 1,
            CASE i WHEN 1 THEN '500 Maple Court' ELSE '2200 Northgate Blvd' END,
            CASE i WHEN 1 THEN '80206' ELSE '80011' END, 'Referral')
    RETURNING id INTO v;
    co := co || v; INSERT INTO demo_seed_registry VALUES ('companies', v);
  END LOOP;

  -- contacts
  FOR i IN 1..array_length(people,1) LOOP
    INSERT INTO contacts (first_name, last_name, job_title, account_id, email, phone, city, state, zip_code, country,
                          lead_status, lead_source, owner_id, created_by, last_contacted_at, created_at, updated_at, timezone)
    VALUES (people[i][1], people[i][2], people[i][3],
            CASE WHEN people[i][4]::int > 0 THEN co[people[i][4]::int] END,
            base_email || '+' || people[i][5] || '@gmail.com', '(303) 555-01' || lpad((10+i)::text,2,'0'),
            people[i][6], 'CO', people[i][7], 'US', people[i][9], people[i][8], people[i][10]::int, 1,
            now() - ((i % 4) || ' days')::interval,
            now() - (people[i][11] || ' days')::interval, now(), 'America/Denver')
    RETURNING id INTO v;
    c := c || v; INSERT INTO demo_seed_registry VALUES ('contacts', v);
  END LOOP;

  -- open deals (pipeline "Roofing Restoration"); stages chosen so no engine/automation fires
  -- name | contact# | company# (0 none) | stage | value | probability | days in stage | owner
  DECLARE
    deals text[][] := ARRAY[
      ['Full roof replacement - 1428 Aspen Ct','1','0','22','18400','30','6','2'],
      ['Hail damage repair - 77 Birch Ln','2','0','22','6200','30','3','3'],
      ['Storm restoration - Maple Court HOA','3','1','23','42000','50','9','1'],
      ['Roof replacement - 912 Pine St','4','0','24','14900','60','4','2'],
      ['Flat roof recoat - Northgate Apartments','5','2','25','27500','75','7','3'],
      ['Shingle replacement - 305 Cedar Ave','6','0','26','11300','85','5','2'],
      ['Metal roof install - 58 Ridge Rd','7','0','27','31800','90','8','1'],
      ['Gutter + roof repair - 640 Oak Dr','8','0','28','7400','90','2','3'],
      ['Roof replacement - 22 Willow Way','9','0','30','16700','95','2','2'],
      ['Storm damage repair - 19 Elm St','10','0','31','9850','100','1','1']
    ];
  BEGIN
    FOR i IN 1..array_length(deals,1) LOOP
      INSERT INTO opportunities (name, contact_id, account_id, pipeline_id, stage_id, assigned_user, created_by, deal_value, probability,
                                 status, expected_close, created_at, updated_at, stage_entered_at, source, priority)
      VALUES (deals[i][1], c[deals[i][2]::int], CASE WHEN deals[i][3]::int > 0 THEN co[deals[i][3]::int] END, pipe, deals[i][4]::int,
              deals[i][8]::int, 1, deals[i][5]::numeric, deals[i][6]::int, 'Open',
              current_date + (7 + i * 3), now() - ((deals[i][7]::int + 10) || ' days')::interval, now(),
              now() - (deals[i][7] || ' days')::interval, 'Demo', 'Medium')
      RETURNING id INTO v;
      d := d || v; INSERT INTO demo_seed_registry VALUES ('opportunities', v);
    END LOOP;
  END;

  -- won deals (stage "closed: won") — pre-marked processed so the Deal Won Engine sends nothing
  DECLARE
    won text[][] := ARRAY[
      ['Full re-roof - 8 Summit Dr','11','21300','10'],
      ['Skylight + flashing - 31 Lark Ln','12','8900','24'],
      ['Roof replacement - 140 Prairie Rd','10','15800','36']
    ];
  BEGIN
    FOR i IN 1..array_length(won,1) LOOP
      INSERT INTO opportunities (name, contact_id, pipeline_id, stage_id, assigned_user, created_by, deal_value, probability, status,
                                 closed_at, created_at, updated_at, stage_entered_at, source, priority)
      VALUES (won[i][1], c[won[i][2]::int], pipe, 32, 1 + (i % 3), 1, won[i][3]::numeric, 100, 'Won',
              now() - (won[i][4] || ' days')::interval, now() - ((won[i][4]::int + 25) || ' days')::interval, now(),
              now() - (won[i][4] || ' days')::interval, 'Demo', 'Medium')
      RETURNING id INTO v;
      w := w || v; INSERT INTO demo_seed_registry VALUES ('opportunities', v);
      INSERT INTO deal_won_actions (opportunity_id, contact_id, processed_at, review_sent_at, review_reminder_sent_at)
      VALUES (v, c[won[i][2]::int], now(), now(), now()) RETURNING id INTO v;
      INSERT INTO demo_seed_registry VALUES ('deal_won_actions', v);
    END LOOP;
  END;

  -- tasks only (no meetings: they drive booking/stage reminder emails)
  DECLARE
    tasks text[][] := ARRAY[
      ['Follow up on proposal - Aspen Ct','1','1','1','2','false'],
      ['Call insurance adjuster - Maple Court HOA','3','3','0','1','false'],
      ['Send contract for signature - Pine St','4','4','2','3','false'],
      ['Order materials - Northgate','5','5','3','3','false'],
      ['Confirm crew schedule - Cedar Ave','6','6','1','2','false'],
      ['Final walkthrough photos - Willow Way','9','9','-1','2','false'],
      ['Request Google review - Elm St','10','10','5','1','false'],
      ['Check material delivery - Ridge Rd','7','7','-2','3','true']
    ];
  BEGIN
    FOR i IN 1..array_length(tasks,1) LOOP
      INSERT INTO activities (contact_id, opportunity_id, user_id, type, subject, due_at, is_completed, completed_at)
      VALUES (c[tasks[i][2]::int], d[tasks[i][3]::int], tasks[i][5]::int, 'task', tasks[i][1],
              date_trunc('day', now()) + (tasks[i][4] || ' days')::interval + interval '14 hours',
              tasks[i][6]::boolean, CASE WHEN tasks[i][6]::boolean THEN now() - interval '1 day' END)
      RETURNING id INTO v;
      INSERT INTO demo_seed_registry VALUES ('activities', v);
    END LOOP;
  END;

  -- notes
  DECLARE
    notes text[][] := ARRAY[
      ['1','Spoke with Daniel after the inspection. Hail damage on the north slope; he wants architectural shingles in charcoal. Waiting on his insurance estimate.'],
      ['3','HOA board meets Thursday to approve the storm restoration scope. Margaret will send the board contact for the e-sign.'],
      ['5','Flat roof on buildings A and B. Needs TPO recoat; crew available the week after contract is signed.'],
      ['7','Customer prefers a standing-seam metal roof in matte black. Materials ordered, delivery confirmed.'],
      ['10','Great project, very happy with the result. Asked for a review link and mentioned a neighbor who needs a roof inspection.'],
      ['13','New lead from Facebook ad. Reported a leak after last week''s storm. Call back today.']
    ];
  BEGIN
    FOR i IN 1..array_length(notes,1) LOOP
      INSERT INTO notes (entity_type, entity_id, body) VALUES ('contact', c[notes[i][1]::int], notes[i][2]) RETURNING id INTO v;
      INSERT INTO demo_seed_registry VALUES ('notes', v);
    END LOOP;
  END;

  -- invoices + payments: 5 paid, 1 unpaid. Untyped (not down_payment/final) so no reminder engine touches them.
  -- number | contact# | won/open deal ref | total | paid method | days ago paid | line item
  DECLARE
    invs text[][] := ARRAY[
      ['INV-3101','11','W1','21300','credit_card','10','Full re-roof - architectural shingles, tear-off and disposal'],
      ['INV-3102','12','W2','8900','bank_transfer','24','Skylight replacement and flashing repair'],
      ['INV-3103','10','D10','9850','credit_card','6','Storm damage repair - decking and shingles'],
      ['INV-3104','6','D6','3390','credit_card','5','Deposit - shingle replacement, Cedar Ave'],
      ['INV-3105','5','D5','8250','check','9','Deposit - flat roof recoat, Northgate'],
      ['INV-3106','9','D9','16700','','0','Roof replacement - Willow Way (balance due)']
    ];
    opp int;
  BEGIN
    FOR i IN 1..array_length(invs,1) LOOP
      opp := CASE WHEN invs[i][3] LIKE 'W%' THEN w[substr(invs[i][3],2)::int] ELSE d[substr(invs[i][3],2)::int] END;
      INSERT INTO invoices (invoice_number, opportunity_id, contact_id, amount, tax, discount, total, line_items, issue_date, due_date, created_by, customer_notes)
      VALUES (invs[i][1], opp, c[invs[i][2]::int], invs[i][4]::numeric, 0, 0, invs[i][4]::numeric,
              jsonb_build_array(jsonb_build_object('product', invs[i][7], 'qty', 1, 'unit_price', invs[i][4]::numeric, 'discount', 0, 'tax', 0, 'total', invs[i][4]::numeric)),
              current_date - (invs[i][6]::int + 3), current_date - (invs[i][6]::int - 11), 1, 'Thank you for choosing Summit Ridge Roofing.')
      RETURNING id INTO v;
      inv := inv || v; INSERT INTO demo_seed_registry VALUES ('invoices', v);
      IF invs[i][5] <> '' THEN
        INSERT INTO payments (payment_number, invoice_id, opportunity_id, contact_id, amount, amount_received, method, status, payment_date, created_by)
        VALUES ('PAY-' || substr(invs[i][1], 5), v, opp, c[invs[i][2]::int], invs[i][4]::numeric, invs[i][4]::numeric, invs[i][5], 'paid',
                current_date - invs[i][6]::int, 1)
        RETURNING id INTO v;
        INSERT INTO demo_seed_registry VALUES ('payments', v);
      END IF;
    END LOOP;
  END;

  -- tags (reuse existing ones, create only what is missing)
  SELECT id INTO tag_vip FROM tags WHERE name = 'vip' LIMIT 1;
  SELECT id INTO tag_storm FROM tags WHERE name = 'storm damage' LIMIT 1;
  IF tag_storm IS NULL THEN INSERT INTO tags (name) VALUES ('storm damage') RETURNING id INTO tag_storm; INSERT INTO demo_seed_registry VALUES ('tags', tag_storm); END IF;
  SELECT id INTO tag_ins FROM tags WHERE name = 'insurance claim' LIMIT 1;
  IF tag_ins IS NULL THEN INSERT INTO tags (name) VALUES ('insurance claim') RETURNING id INTO tag_ins; INSERT INTO demo_seed_registry VALUES ('tags', tag_ins); END IF;
  FOREACH i IN ARRAY ARRAY[1,2,3,8,10] LOOP
    INSERT INTO taggables (tag_id, entity_type, entity_id) VALUES (tag_storm, 'contact', c[i]) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH i IN ARRAY ARRAY[1,3] LOOP
    INSERT INTO taggables (tag_id, entity_type, entity_id) VALUES (tag_ins, 'contact', c[i]) ON CONFLICT DO NOTHING;
  END LOOP;
  IF tag_vip IS NOT NULL THEN
    FOREACH i IN ARRAY ARRAY[3,10] LOOP INSERT INTO taggables (tag_id, entity_type, entity_id) VALUES (tag_vip, 'contact', c[i]) ON CONFLICT DO NOTHING; END LOOP;
  END IF;
END $$;
