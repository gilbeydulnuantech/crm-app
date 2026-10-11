# Industry cuts (30 to 45 seconds each)

Each cut reuses scenes from the roofing master (`narration_script_roofing.md`) with the
industry's own words. Every cut ends on the same closing slide:
**"Your own system. Your own server. Your data, always yours."**
About 140 words a minute, so each cut is roughly 70 to 105 words of narration.

What these cuts do NOT claim (not built or not verified): SMS, WhatsApp, deposits at booking,
automatic recall or rebooking campaigns, conflict-of-interest checks, compliance
certifications (HIPAA and similar), and "instant". Follow-ups are shown as rules the owner
builds in the automation builder (Wait + Send email / Telegram).

---

## 1. Hair salon and barber shop (about 40 s)

| Time | On screen | Narration |
|---|---|---|
| 0:00 | A chair, scissors, a phone buzzing mid-cut | "You're mid-cut. The phone rings. You can't answer, and that booking walks to the shop down the street." |
| 0:08 | Booking page: a client books a fade for Saturday at 2 | "With this, clients book themselves. Saturday at two, done." |
| 0:15 | Confirmation email arrives; the booking lands on the calendar and the client card | "A confirmation goes out within seconds, and it's on your calendar without you touching a thing." |
| 0:22 | The voice agent answers a call and books a slot | "Calls get answered too, by an AI that checks your real calendar and books them in." |
| 0:29 | Automation builder: "Visit done, wait 21 days, send 'Time for a fresh cut?'" | "And you decide the follow-up. Three weeks after a cut, they get a friendly nudge to rebook. You build it in a minute." |
| 0:37 | Closing slide | "Your own system, on your own server." |

Pipeline stages to set up for the recording: **Booked, Visited, Rebook due**.
Email wording: "See you Saturday at 2." No-shows can get a friendly email (the no-show automation).

---

## 2. Dental and medical clinics (about 42 s)

| Time | On screen | Narration |
|---|---|---|
| 0:00 | A reception desk, phone ringing, patients waiting | "Your front desk is checking in patients while the phone keeps ringing. Missed calls are missed appointments." |
| 0:09 | Voice agent takes a call and books a check-up on the real calendar | "An AI receptionist answers, finds an open slot, and books the appointment, even after hours." |
| 0:19 | Confirmation email and reminder emails; the appointment shows on the patient card | "The patient gets a confirmation and reminders before the visit, so fewer people forget." |
| 0:27 | Automation builder: "Visit done, wait 180 days, send 'Time for your check-up'" | "Then you set the follow-up. Six months after a visit, a reminder goes out to book the next check-up." |
| 0:36 | Closing slide | "Your own system, your own server, your own data." |

Pipeline stages: **Booked, Seen, Recall due**. Show appointment details only, never health
information, in the recording. Do not say HIPAA or "compliant". Configure the wait as 180 days.

---

## 3. Real estate (about 45 s)

| Time | On screen | Narration |
|---|---|---|
| 0:00 | A listing page and a new enquiry notification | "A buyer enquires on a listing. The agent who replies first usually wins." |
| 0:08 | Enquiry form submitted; the thank-you email arrives; the contact and deal appear in the pipeline at "Enquiry" | "With this, the reply goes out in seconds, and the buyer is already in your pipeline." |
| 0:18 | Booking page: a viewing for Thursday at 5 | "They book their own viewing, and it goes straight onto your calendar." |
| 0:26 | Pipeline board: Enquiry, Viewing, Offer, Closed, with deals | "Every buyer and every deal, on one board, so nothing slips." |
| 0:34 | An offer sent for e-signature | "Offers go out for e-signature, and you see when they're signed." |
| 0:41 | Closing slide | "Your own system. Your data, always yours." |

Pipeline stages: **Enquiry, Viewing, Offer, Closed**. Email wording: "Viewing confirmed".

---

## 4. Accounting and law firms (about 45 s)

| Time | On screen | Narration |
|---|---|---|
| 0:00 | A cluttered desk, email inbox overflowing | "New enquiries sit in an inbox while you're with a client, and the prospect hires whoever answers first." |
| 0:08 | Intake form submitted; the thank-you email arrives; the contact appears at "Enquiry" | "Now an enquiry gets a reply within seconds, and they're in your pipeline." |
| 0:17 | Booking page: a consultation for Tuesday at 10 | "They book a consultation themselves, straight onto your calendar." |
| 0:25 | The engagement letter or contract e-signed | "Engagement letters go out for e-signature, with no printing and no chasing." |
| 0:32 | An invoice emailed with the PDF attached | "Then the invoice goes out as a PDF, and you see when it's paid." |
| 0:40 | Closing slide | "Your own system, on your own server." |

Pipeline stages: **Enquiry, Consult, Engaged**. Email wording: "Your consultation is booked".
Law firms: do not claim conflict checks or privilege protections (not built). Optional extra for
accounting only: a separate short clip of Document Triage reading an invoice, once the AI model
is upgraded. Don't include it in this cut for now.

---

## Before recording any cut
1. Create a pipeline for the industry with the stage names above and a handful of demo contacts
   and deals. The roofing seed is the model; ask for an industry version.
2. Change the booking-page service name, the confirmation email wording, and the voice agent's
   greeting and prompt to the industry's language.
3. Rehearse the live scenes (booking, voice call, invoice email) twice.
4. Reuse the Telegram scene as an optional 8-second add-on in any cut.
