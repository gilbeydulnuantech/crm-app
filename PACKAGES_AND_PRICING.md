# CRM & Automation Packages — Per-Organization Isolated Deployment

The business-facing offer built on top of `n8n-workflows/CLIENT_PILOT_SETUP.md`
and `n8n-workflows/scripts/deploy-workflows.cjs`. Each client gets their own
fully isolated instance — own VPS, own database, own n8n, own credentials.
Nothing of theirs ever touches another client's data, and vice versa. This
doc is pricing/packaging; the technical how-to stays in `CLIENT_PILOT_SETUP.md`.

Numbers below are a starting point, not fixed — validate against what your
first 1-2 real clients will actually pay before treating these as final.

## The pitch, in one line

"Your own CRM and automation system, built around how your business
actually works — not a seat license on someone else's shared platform. You
own the data, you own the server, nothing is multi-tenant."

This is the strongest differentiator against SaaS CRMs (GoHighLevel,
HubSpot) and against productized agencies like Growth Install: true data
isolation, not logical isolation behind a shared database.

## Package Tiers

### Starter — Lead Capture & Response
**Setup fee: $800–1,200 one-time · Monthly: $150–250**

- CRM core: contacts, companies, pipeline/deals, tasks, notes
- Lead capture automation (public form → instant contact creation →
  auto-acknowledgment)
- One email nurture sequence
- Basic reporting dashboard
- VPS hosting, SSL, backups included in monthly fee
- Up to 3 internal users

Best fit: a business that just needs faster lead response and a real
pipeline — matches the roofing-company pitch (lead speed) directly.

### Growth — Full Operations Layer
**Setup fee: $1,500–2,500 one-time · Monthly: $350–500**

Everything in Starter, plus:
- Proposal/contract generation with templates
- Automation rules engine (stage reminders, deal-stuck alerts, tag sync)
- Google Calendar two-way sync + booking
- Payments/invoicing integration (Stripe)
- Observability dashboard (automation health, error visibility)
- Up to 10 internal users

Best fit: a business ready to run most of its operations through the
system, not just capture leads — matches the security-company and spa
scoping conversations.

### Growth + Voice AI
**Setup fee: $2,500–4,000 one-time · Monthly: $500–750**

Everything in Growth, plus:
- Voice AI booking agent (Retell/Vapi) — check availability, book,
  reschedule, cancel by phone, wired into the same backend as the web CRM
- Custom conversation prompt tuned to the business
- Real-call QA pass before go-live (the same verification loop used on
  the actual build: test real scenarios, confirm against live calendar
  state, not just a clean-looking response)

Best fit: businesses with real phone-booking volume — spas, home
services, clinics. This is your most differentiated offering; most
competitors selling "automation" don't ship a working voice agent.

### Enterprise / Custom
**Quoted per engagement**

- Multiple locations/brands under one organization
- Custom integrations beyond what's templated (industry-specific tools,
  legacy system connections)
- Dedicated monitoring/SLA
- Ongoing retainer for new automation requests

## What's Included vs. Add-On, Across All Tiers

**Included in every tier:**
- Dedicated VPS, isolated database, SSL/domain setup
- Initial SOPs/documentation so the client's team can operate day-to-day
  without you
- One round of onboarding configuration (pipeline stages, templates)
  seeded to their business, not yours

**Billed separately / pass-through:**
- Domain registration (~$10-15/year, client's own domain)
- Any third-party API costs that scale with their usage (e.g., Retell
  per-minute voice costs, SMS/email sending volume beyond a baseline)

## Contract Structure

- Minimum 3-month initial term (covers your setup time + gives the
  client a fair trial window), then month-to-month.
- Setup fee due at signing; monthly billing starts at go-live.
- Migration/export clause: client data is theirs — if they leave, they
  get a full database export, no lock-in. This is a trust/sales point,
  not just a legal nicety, given the "you own your data" pitch.

## Delivery Process (client-facing version of CLIENT_PILOT_SETUP.md)

1. **Discovery call** — scope their actual process (same question set
   used for the security-company and spa prep: what's manual today, what
   breaks, what "success" looks like in 90 days).
2. **Provisioning** — VPS, database, workflows deployed (internal:
   `deploy-workflows.cjs` + schema dump, ~1-2 days of work).
3. **Credential handoff** — client connects their own Gmail/Calendar/
   Stripe/Retell accounts (staged access, same principle as any serious
   consulting engagement: read-only first where possible).
4. **Configuration pass** — pipeline stages, templates, automation rules
   tailored to their business, not generic defaults.
5. **Go-live + first-week monitoring** — watch the observability
   dashboard closely for the first week, fix anything that surfaces.
6. **Weekly/monthly check-in** — the same "hours saved" reporting
   pattern from the pilot runbook, turned into an ongoing client-facing
   report that justifies the monthly fee.

## Pricing Rationale (why these numbers)

- VPS hosting itself costs you ~$10-20/month per client — the monthly
  fee is overwhelmingly your ongoing maintenance/support time, not infra
  cost. Price for the value delivered (hours saved, leads not missed),
  not just server cost.
- Anchor against alternatives: a dedicated in-house automation
  specialist runs $2,000-2,500/month (per the roles you've been
  evaluating) for one business. This package delivers comparable
  systems-building value across many clients at a fraction of that
  per-client cost — that's your pitch when a prospect balks at price.
  Growth Install's model (results-based guarantee, no published price)
  is the competing reference point for home-service clients specifically.
- Setup fee exists so your time isn't free when a prospect churns after
  month one — it also filters for serious buyers.

## Open Questions to Validate With Real Clients

- Is the 3-tier structure right, or do most prospects only ever want
  Starter or jump straight to Growth + Voice AI?
- Does the setup fee kill conversion for price-sensitive prospects
  (roofing, smaller home-service businesses) — might need a lower-friction
  "Starter Lite" with reduced setup fee and more generic defaults?
- What's the real per-client support time cost once you have 3+ clients
  running simultaneously — this determines whether current monthly
  pricing is actually sustainable or needs revisiting.

## Competitor Comparison — What You Get Without a Paid Tier

Competitor figures below were checked against public 2026 pricing guides on
2026-10-04. Vendors change plans often, so re-verify against their own
pricing pages before quoting any number to a prospect.

### Where the competition gates the features this system ships

| Feature (workflow here) | HubSpot Sales Hub | Pipedrive | GoHighLevel |
|---|---|---|---|
| Workflow automation (Automation Engine) | Professional (~$90–100/seat/mo + $1,500 onboarding) | Growth ($39/seat/mo annual) | Included in all plans |
| Email sequences / nurture (Nurture Sequence Engine) | Professional (500 enrollments/user/mo) | Growth; Campaigns is a paid add-on | Included |
| Lead scoring (Lead Scoring Engine) | Basic scoring at Professional, predictive scoring at Enterprise (~$150/seat/mo + $3,500 onboarding) | Premium ($59/seat/mo annual) | Not a headline feature |
| E-signature / contracts (Contracts, Proposals) | Higher tiers | Premium; Smart Docs is a paid add-on | Included in higher plans |
| Data enrichment (Enrich Contact, Bulk Enrich) | Paid enrichment credits | Premium / Ultimate | Via integrations |
| Voice AI booking (Retell/Vapi workflows) | Not offered | Not offered | AI Employee add-on: $97/mo unlimited, or $50/mo for 100 voice minutes; Voice AI usage ~$0.06/min plus the LLM cost |
| Observability / automation health dashboard | Enterprise-level reporting | Ultimate-level | Basic logs |
| Document Triage (PO / invoice / receipt AI) | Not a CRM feature | Not a CRM feature | Not a CRM feature |

### What a 5-person team pays elsewhere (monthly, rough)

| Option | Approx. monthly | Notes |
|---|---|---|
| HubSpot Sales Hub Professional | ~$450–500 | Plus $1,500 one-time onboarding; per-seat pricing grows with the team |
| Pipedrive Premium | ~$295 (annual) | Per seat; add-ons (Campaigns, Smart Docs) cost extra |
| GoHighLevel Unlimited + AI Employee | ~$394 base; $440–600 with real SMS, call and email usage | Flat rate, not per seat |
| **This system, Growth + Voice AI** | **$500–750** | Per client, flat, no per-seat fee; includes VPS, backups and maintenance |

### Honest positioning

- **GoHighLevel is the real competitor.** It bundles most of this at a flat
  price. On monthly cost alone this system is not cheaper than GoHighLevel.
  Don't pitch on price against it.
- **Against HubSpot and Pipedrive** the case is stronger: per-seat costs
  climb as the team grows, and the automation, sequences and e-sign the
  client needs sit behind their middle and upper tiers. A flat fee for a
  whole team compares well from about 5 users up.
- **What nobody else offers together:** a dedicated, isolated instance (own
  VPS, own database, nothing multi-tenant), a working voice agent wired into
  the same backend as the CRM, and AI document triage — built around the
  client's process rather than a generic template.
- **Pitch on control and fit, not features-per-dollar.** Data ownership,
  full export on exit, and a build tailored to the business are the points a
  shared SaaS can't match.

### Readiness caveats — confirm before selling each feature

- Merge Contacts is active in n8n as of 2026-10-04 (the older reference doc
  said inactive). Task Reminders was also listed as inactive; not verified.
- No general SMS workflow was confirmed in the workflow files (only the
  Retell/Vapi voice paths). This blocks missed-call text-back, rebook
  nudges and speed-to-lead SMS.
- No automated review-request workflow was confirmed.
- Document Triage runs on a small local model (hermes3:3b). Extraction of
  parties and amounts needs human review on anything important until a
  larger model is used.

Sources (checked 2026-10-04):
[GoHighLevel pricing](https://ghlcentral.com/gohighlevel-pricing/) ·
[GoHighLevel AI Employee](https://botpenguin.com/blogs/gohighlevel-ai-pricing) ·
[HubSpot Sales Hub pricing](https://www.sybill.ai/blogs/hubspot-sales-hub-pricing) ·
[Pipedrive pricing](https://saascrmreview.com/pipedrive-pricing/)
