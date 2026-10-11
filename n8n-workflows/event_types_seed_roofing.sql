-- Starting types for the roofing install (the ones that were built into the app). Skip this file on a new
-- install for another industry: the list then starts blank, and only "meeting" is created because the
-- booking page and reminder workflows use it (it can still be renamed, e.g. to "Appointment").
INSERT INTO event_types (key, name, color, sort_order, is_system) VALUES
  ('meeting', 'Meeting', '#F59E0B', 0, true),
  ('inspection', 'Inspection', '#10B981', 1, false),
  ('call', 'Phone Call', '#3B82F6', 2, false),
  ('proposal', 'Proposal', '#A855F7', 3, false),
  ('material_delivery', 'Material Delivery', '#F97316', 4, false),
  ('site_visit', 'Site Visit', '#F43F5E', 5, false),
  ('personal', 'Personal', '#64748B', 6, false)
ON CONFLICT (key) DO NOTHING;
