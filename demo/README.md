# Roofing demo for the sales video

Loads a fictional roofer, **Summit Ridge Roofing & Restoration**: 14 contacts, 2 commercial
accounts, 10 open deals across the pipeline, 3 won deals, tasks, notes, 5 paid invoices and
1 unpaid one.

```
psql -d n8n_vectordb -1 -f demo/seed_roofing_demo.sql     # load
psql -d n8n_vectordb -1 -f demo/clean_roofing_demo.sql    # remove everything + restore the real company profile
```

## While it is loaded
- The company name, phone and address in the app, in emails, invoices and contracts are the
  demo company's. **Don't run real customer work in this state.**
- Every demo contact's email is `gilbeydulnuan+name@gmail.com`, so anything sent to them
  lands in your own inbox.
- The booked / canceled / inspection done / no-show / final inspection / closed: lost stages
  are left empty on purpose: those stages trigger live automations. Record the "booked" scene
  live, with a contact like `gilbeydulnuan+live@gmail.com`. Delete that live contact and deal
  yourself afterwards (the cleanup only removes what the seed created).

## Before recording
1. Log in with "Remember me" ticked.
2. n8n, pm2 services (`npx pm2 status`) and ngrok are running.
3. Rehearse the live scenes twice: public booking, the voice-agent call, an invoice email with
   its PDF, a Telegram message.
4. The Telegram scene needs a contact who has pressed Start on the bot (use your own Telegram).
