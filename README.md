# Hush — AI Governance & Data Leakage Gatekeeper

**Keep the AI workflow. Lose the accidental oversharing.**

Hush is a local-first Chrome/Edge extension and control center that scans text in supported AI composers before it is submitted. When it finds credentials, payment data, or PII, it can replace the sensitive values with safe placeholders or stop the action. Masked text returns to the composer for review—Hush never auto-sends a modified prompt.

## What is included

- **Manifest V3 browser extension** for Chrome and Edge.
- **Send-time interception** for Enter, send-button clicks, and form submissions.
- **Optional paste-time masking** for AI text composers.
- **Local detection engine** using regex, field-label context, entropy checks, Luhn validation, and linked-name references.
- **Three replacement formats:** pseudonym tokens, full redaction, and SHA-256 placeholders.
- **Interactive control center** with overview charts, activity filters, JSON export, per-policy toggles, per-destination controls, and a real scan-and-protect playground.
- **Privacy-safe activity metadata:** destination, timestamp, action, categories, risk, and counts only. Prompt text, detected values, and masked output are not persisted.

## Quick start

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local Vite URL to use the control center and playground. The web workspace starts with clearly labeled **demo data**; real extension workspaces start empty.

### Run checks

```bash
npm test        # Detection, masking, co-reference, and storage unit tests
npm run build   # Type-check, build the dashboard, and bundle extension scripts
```

## Install the extension

1. Run `npm run build`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this project's generated `dist/` directory.
5. Pin Hush for quick status, or open its control center to configure policies.

The production `dist/` folder contains the dashboard, manifest, icons, content script, and background service worker. No separate backend is required.

### Try it safely

Use the synthetic examples in **Test playground**, or start with this fictional prompt:

```text
Customer: Maya Chen
Email: maya.chen@example.com
Phone: +1 415 555 0198

Maya was charged twice. Draft a concise support response.
```

Hush detects the labeled name, email, phone number, and the later `Maya` reference. On a supported AI site, it stops the initial send action, replaces those values in the composer, and waits for you to review. **Never test with real customer data or live credentials.**

## Supported AI destinations

The content script is scoped to these URL patterns:

| Destination | URL patterns |
| --- | --- |
| ChatGPT | `chatgpt.com`, `chat.openai.com` |
| Claude | `claude.ai` |
| Gemini | `gemini.google.com` |
| Microsoft Copilot | `copilot.microsoft.com` |
| Perplexity | `www.perplexity.ai` |
| Poe | `poe.com` |
| Grok | `grok.com` |

Each destination can be enabled independently. Hush does not run on general browsing pages.

## Detection policies

| Category | Included detectors |
| --- | --- |
| Secrets | Private keys, OpenAI keys, AWS access key IDs, GitHub tokens, JWTs, credential-bearing connection strings, and context-labeled passwords/secrets |
| PII | US SSNs, email addresses, formatted North American phone numbers, and context-labeled person names with linked references |
| Financial | Payment card numbers with Luhn validation |

The generic secret rule recognizes labels such as `api_key`, `access_token`, `client_secret`, `AWS_SECRET_ACCESS_KEY`, `password`, and related variants. Entropy filtering reduces obvious false positives.

### Response modes

- **Mask & let me review:** stop the original action, replace sensitive values in the editable composer, and let the user explicitly send later.
- **Block:** stop the action and leave the original text untouched so the user can edit it.

### Replacement formats

| Format | Example | Best for |
| --- | --- | --- |
| Pseudonym token | `[EMAIL_0512AA]` | Preserving data-type context with short deterministic placeholders |
| Full redaction | `[REDACTED_EMAIL]` | Maximum simplicity and low-entropy sensitive values |
| SHA-256 placeholder | `[EMAIL_SHA256:94a8…]` | Correlating repeated values without storing the original |

Tokens and hash placeholders use Web Crypto SHA-256. If Web Crypto is unavailable, Hush fails closed to full redaction. **Hashing is not anonymization for guessable values** such as SSNs; prefer full redaction for low-entropy data.

## Privacy model

- Detection and replacement run in the browser.
- There is no Hush server, account system, analytics SDK, or cloud AI request.
- Fonts and application assets are bundled locally.
- Activity records contain no prompt text or finding values.
- The playground keeps text in memory and does not add tests to activity history.
- Settings and metadata use `chrome.storage.local` in the extension and `localStorage` in the web control center.

The extension's activity message deliberately accepts only event metadata. See `src/extension/content.ts` and `src/lib/storage.ts` for the event shape and retention limit (latest 100 events).

## Important limitations

Hush is a **defense-in-depth layer, not a guarantee of complete data-loss prevention**.

- Regex and lightweight heuristics can miss unknown token formats, free-form proprietary information, international identifiers, and obfuscated data.
- Name co-reference is intentionally conservative and can produce false positives or miss references.
- Protection covers supported text composers on bundled AI domains. It does not inspect file attachments, browser extensions, desktop applications, direct API traffic, or every possible network path.
- AI websites can change their DOM and composer behavior. Generic send-button/form adapters may need site-specific maintenance.
- A user can disable the extension or choose an unsupported destination. Organizational deployments should combine Hush with managed browser policies, DLP/CASB controls, and staff training.

Always review masked output before sending, especially for highly sensitive workflows.

## Project structure

```text
src/
├── components/          # Reusable dashboard UI
├── extension/
│   ├── background.ts    # Metadata event recording and notifications
│   └── content.ts       # Composer interception and local masking
├── lib/
│   ├── protection.ts    # Detectors, co-reference, SHA-256 masking
│   ├── storage.ts       # State, demo data, metadata-only activity
│   └── useHushState.ts  # Shared React state persistence
├── pages/               # Overview, activity, policies, destinations, playground, settings, popup
└── styles.css           # Responsive visual system
public/
├── manifest.json        # MV3 configuration and scoped AI-site matches
└── icon*                # Local extension icons
```

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the web control center on `0.0.0.0` |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Build the complete production extension in `dist/` |
| `npm run preview` | Preview the production dashboard |
