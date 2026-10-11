# Telegram channel — setup and how it works

Telegram sits next to SMS as a messaging channel. It is a bot, so it works
differently from SMS: a bot **cannot message a phone number or start a
conversation**. A contact has to open their personal invite link and press
**Start** once. After that, automations can message them.

## One-time setup (about 10 minutes)

1. **Create the bot.** In Telegram, message **@BotFather** → `/newbot` → pick a
   name and a username ending in `bot`. Copy the **token** it gives you.
2. **Add the token in n8n.** Credentials → open **"Telegram Bot (PLACEHOLDER -
   replace me)"** → paste the token into *Access Token* → rename it to
   "Telegram Bot" → Save. (Do not paste the token anywhere else; it is never
   stored in the CRM.)
3. **Activate "Telegram Inbound"** in n8n (it is created inactive on purpose —
   it can't activate until the real token is in). n8n registers its webhook
   with Telegram automatically. Needs n8n to be reachable over public HTTPS
   (`WEBHOOK_URL`); a changed tunnel/domain means re-activating it.
4. **Save the bot username in the CRM.** Settings → Integrations → Telegram →
   Connect → enter the username without the `@`.

## How a contact connects

Open a contact → **Telegram** button → it copies their personal link
(`https://t.me/<bot>?start=<token>`) → send it to them (email, SMS, WhatsApp…).
When they press **Start**, their chat id is saved and the button shows
"Telegram ✓". Replying **STOP** opts them out (`dnc_telegram`); opening their
link again and pressing Start opts them back in.

## Sending a message by hand

On a contact who has connected, the **Telegram** button opens a message box.
The server refuses (with a plain-language reason) when the contact has not
connected, has replied **STOP**, or is marked Do Not Contact — a rep cannot
override an unsubscribe; the contact has to press Start on their invite link
again. Sent and received messages appear on the contact's **Telegram** tab in
the activity timeline. Click one to read it in full; a received reply is blue
until it has been opened, then turns light green (same as received emails).

## Using it in an automation

Add a **Send Telegram** action (plain text, supports the same `{{first_name}}`,
`{{deal_name}}` style fields as SMS). It is **skipped, and logged as
"skipped" with a reason**, when the contact has not linked Telegram, has
`dnc_telegram` set, or is marked Do Not Contact. A send failure (for example
the contact blocked the bot) is logged as "error" with Telegram's message.

## What was added

| Piece | Where |
|---|---|
| Columns `telegram_chat_id`, `telegram_linked_at`, `telegram_link_token`, `dnc_telegram` | `contacts_add_telegram.sql` |
| `send_telegram` action | Automation Engine (6 nodes), Automations validators, automation builder UI |
| Personal invite link endpoint `GET /get-telegram-invite` | `Telegram Invite.json` |
| Manual send endpoint `POST /send-telegram` | `Telegram Send.json` |
| Mark-as-read endpoint `POST /mark-telegram-read` | `Telegram Mark Read.json` |
| Inbound: Start/link, STOP, message logging | `Telegram Inbound.json` (Telegram Trigger) |
| `dnc_telegram` in contact update + merge | `contacts-update.json`, `Merge Contacts.json` |
| Bot username setting | Settings → Integrations (provider `telegram`) |

Inbound messages from a linked contact are logged on the contact's activity
as category `telegram`.
