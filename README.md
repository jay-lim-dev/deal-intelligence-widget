# Deal Desk

A Zoho CRM widget that surfaces key deal information and messaging tools directly on a Deal record. Triggered by a custom button, it opens a panel with two tabs: an **Overview** for deal fields and stage history, and a **Messaging** tab for sending SMS via Twilio.

---

## What It Does

- Opens as an embedded widget from a custom button on any Zoho CRM Deal record
- **Overview tab** — displays a curated set of deal fields (owner, stage, amount, close date, and more) alongside a visual timeline showing progression through pipeline stages
- **Messaging tab** — lets users compose and send an SMS to the contact associated with the deal, powered by Twilio, without leaving the CRM

---

## Tech Stack

| Layer | Technology |
|---|---|
| Widget runtime | [Zoho Extension Toolkit (zet)](https://www.zoho.com/crm/developer/docs/widgets/) |
| CRM data access | Zoho CRM JS SDK (`ZOHO.CRM`) |
| Messaging | Twilio Programmable SMS (REST API) |
| Frontend | Plain HTML, CSS, JavaScript (no framework) |
| Local dev server | `zet run` |

---

## Project Structure

```
deal-intelligence-widget/
├── app/
│   ├── index.html          # Widget entry point
│   ├── css/
│   │   └── style.css       # Widget styles
│   ├── js/
│   │   └── app.js          # Tab logic, SDK calls, Twilio integration
│   └── variables.json      # Credentials and config (not committed — see below)
├── plugin-manifest.json    # Widget metadata and permissions
└── .gitignore
```

---

## Features

### Overview Tab
- Displays core deal fields pulled live from the CRM record (owner, stage, amount, close date, account name, contact)
- Visual stage progression timeline showing which pipeline stages have been completed and which is current
- Read-only — no writes back to CRM from this view

### Messaging Tab
- Pre-populates the recipient phone number from the deal's associated contact
- Free-text SMS compose area
- Sends the message via Twilio using credentials stored in `app/variables.json`
- Displays send status (success / error) inline

---

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- Zoho Extension Toolkit CLI installed globally:
  ```bash
  npm install -g zoho-extension-toolkit
  ```
- A Zoho CRM Developer account with a sandbox or production org

### Steps

```bash
# Clone the repository
git clone https://github.com/jay-lim-dev/deal-intelligence-widget.git
cd deal-intelligence-widget

# Start the local dev server
zet run
```

`zet run` serves the widget at `https://127.0.0.1:5000` and tunnels it to your Zoho CRM org. Open a Deal record, click the custom button, and the widget loads from your local machine.

> **Note:** Your browser may warn about the self-signed certificate used by the local server. Accept the exception once to proceed.

---

## Credentials Management

Sensitive values — Twilio Account SID, Auth Token, and the sending phone number — are stored in `app/variables.json`, which is excluded from version control via `.gitignore`.

Create this file locally before running the widget:

```json
{
  "twilioAccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "twilioAuthToken": "your_auth_token",
  "twilioFromNumber": "+1XXXXXXXXXX"
}
```

> **Never commit `app/variables.json` to source control.** Share credentials with teammates through a secure channel (password manager, secrets vault, etc.).

When deploying to production via the Zoho Marketplace or a direct upload, use the widget's built-in [custom variables](https://www.zoho.com/crm/developer/docs/widgets/custom-variables.html) feature to inject these values at the org level.

---

## Adapting for Other Clients

This widget is built to be reused across different Zoho CRM orgs with minimal changes. The main things to adjust per client:

| What to change | Where | Notes |
|---|---|---|
| Deal fields displayed | `app/js/app.js` | Update the API field names passed to `ZOHO.CRM.API.getRecord` |
| Pipeline stages | `app/js/app.js` | Replace the stage list array with the client's actual stage names in order |
| Sending phone number | `app/variables.json` | Each client uses their own Twilio number |
| Twilio credentials | `app/variables.json` | Each client needs their own Account SID and Auth Token |
| Widget display name | `plugin-manifest.json` | Update `name` and `description` to match the client |
| SMS message template | `app/js/app.js` | Adjust any pre-filled message copy if used |

For multi-client deployments, consider maintaining a separate branch or config file per client rather than modifying shared source files.

---

## Deploying to Production

1. Validate the widget: `zet validate`
2. Pack it: `zet pack` (produces a `.zip` in the project root)
3. Upload the `.zip` via **Zoho CRM → Setup → Developer Space → Widgets**
4. Set production credential values using the org-level custom variables UI

---

## License

Internal tooling — not licensed for public distribution.
