# Google Calendar and low-friction capture

## Product intent

Sonder should bring external commitments into the same agenda as native events, and make it effortless to get an obligation out of a conversation and into Sonder. These are two parts of one workflow: capture commitments where they appear, then see them alongside the rest of life.

## Calendar subscriptions (primary integration)

### User experience

- Make URL subscription the primary path. Under Settings > Integrations > Calendars, provide an Add calendar flow with a single URL field and a display-name field.
- Accept iCalendar subscription URLs (normally HTTPS URLs returning an .ics feed). The user should not need to sign in to Google or grant Sonder access to their Google account.
- After validation, show the subscribed calendar alongside Sonder's native calendar and Today agenda. Clearly label its source; keep external events read-only.
- Show last successful refresh, next scheduled refresh, and a manual Refresh now action. Let the user rename, pause, refresh, or remove a subscription.
- Refresh automatically on the server, independent of whether the app is open. Start with a 15-minute interval, with backoff for failures and sensible caching.
- Support more than one subscription so users can add several shared calendars.

### What link is needed?

- A Google Calendar ID by itself is not a credential and cannot grant access to a private calendar.
- For a private shared Google calendar, the user can paste its secret iCal address from Google Calendar settings. Treat that URL like a password: anyone who has it may be able to read the feed.
- Public iCal/ICS URLs also work.
- If the user only has a calendar ID, explain that they need the calendar owner to share it with them and provide an iCal subscription URL, or use the Google OAuth integration as an optional future path.
- Some providers require authentication, block server-side fetches, or rotate feed URLs. Do not claim universal compatibility; validate the URL and show a clear error if it cannot be fetched.

### Technical design and security

- Implement a generic iCalendar feed provider first; do not require Google OAuth for this workflow.
- Validate HTTPS URLs, reject localhost/private/link-local IP ranges and redirects to private networks, limit response size and fetch duration, and revalidate redirect destinations to prevent SSRF.
- Never render or execute content from feed descriptions. Escape imported text in the UI.
- Store subscription URLs encrypted at rest. Never return the full secret URL to clients after creation; show a masked value and a replace-link action.
- Parse RFC 5545 iCalendar data, including VEVENT, UID, DTSTART, DTEND, DURATION, SUMMARY, DESCRIPTION, LOCATION, STATUS, RECURRENCE-ID, RRULE, EXDATE, and time zones. Preserve date-only all-day events and time-zone semantics.
- Keep imported subscription events in separate tables from native calendar_events. Use a stable unique key based on subscription and VEVENT UID/RECURRENCE-ID; upsert to prevent duplicates.
- Handle changed and cancelled events, recurring instances, ETags/Last-Modified where available, conditional requests, malformed feeds, and feed removal.
- A failed refresh must not erase the last known good calendar. Record sync status and surface stale/error state without hiding previously imported events.
- Apply per-user ownership checks, per-host rate limits, bounded feed size, timeouts, and retry/backoff. Never log secret URLs or event descriptions.

### Optional Google OAuth path later

- Offer OAuth only as an optional alternative for calendars where a subscription URL is unavailable or insufficient.
- Keep Calendar scopes separate from ordinary Google sign-in. Use read-only access and encrypted server-side refresh tokens.
- Shared-calendar visibility remains limited by the permissions Google grants. A calendar ID alone still does not bypass access controls.

## Quick capture from conversations

### Recommended first release

Do not build a WhatsApp history scraper. Personal WhatsApp conversations are not exposed through a supported general-purpose API, and broad message ingestion would be invasive and noisy.

Instead, extend the existing Quick Capture experience with a native iOS Share Sheet extension and a web share target. On iOS, the user can select text in Apple Messages or WhatsApp, tap Share, and send it straight to Sonder:

1. In WhatsApp, Messages, Mail, or a browser, the user chooses Share and selects Sonder.
2. Sonder receives the shared text, link, or selected content through the share extension and runs the same capture pipeline as the existing Quick Capture input.
3. For clear, high-confidence intent, create the task or event immediately. Extract title, date/time, deadline, and location when present.
4. If intent or timing is ambiguous, save the original content to Inbox rather than guessing. Show a concise confirmation/result when capture succeeds.
5. Preserve the original message text as source context so the user can verify the suggestion.

The existing Inbox and its convert-to-task/event/note endpoints are the foundation. Extend them rather than creating a parallel task system.

### Capture channels, in order

- Native iOS Share Sheet extension: the first priority, so selected text from Apple Messages, WhatsApp, Mail, and other apps can be sent into the existing capture pipeline without granting Sonder access to entire conversations.
- Web/PWA share target: useful on desktop and supported mobile browsers; accept plain text and URLs.
- Quick-add command: a global text field that accepts natural language such as Ask Daria about the slides tomorrow and stores it immediately.
- Optional bot channel later: a Telegram bot is a practical opt-in messaging bridge. A WhatsApp Business Cloud API number is possible only as a separate business-account integration; it is not a way to read a user's personal WhatsApp chats.

### Parsing and trust

- Start with deterministic extraction for dates, times, URLs, and obvious task language. Add an AI parser only when a supported inference provider or local model is deliberately configured.
- Never create an external calendar event or mark a task complete based only on an inference.
- Automatically create clear, high-confidence tasks and events from explicitly shared content. Save ambiguous content to Inbox. Make auto-creation behavior configurable, and never infer an event time that is not actually present.
- Make source, extracted fields, and confidence inspectable. Let the user correct the suggestion before conversion.
- Add idempotency keys to inbound capture so OS share retries or bot webhook retries cannot create duplicates.
- Treat shared content as private user data. Do not send it to third-party AI services unless the user explicitly enables that processing.

## Delivery slices

1. Foundation: schema, encrypted token storage, OAuth state/callback, provider connection status, and calendar list/selection.
2. Read-only sync: initial + incremental sync, expired-token recovery, imported-event query merged into agenda, and manual sync.
3. Background sync: scheduled refresh, observability, retry/backoff, and sync status in Settings.
4. Capture: native iOS Share Sheet extension and web share target into the existing capture pipeline; auto-create only high-confidence tasks/events and route uncertain content to Inbox.
5. Smart triage: date/time extraction, task/event/note suggestions, confirmation UI, and duplicate protection.
6. Optional messaging bridge: evaluate Telegram first; evaluate WhatsApp Business only if there is a real business-number use case.

## Release gates

- Google sign-in continues to work without Calendar permissions.
- Shared calendars appear only when Google grants access; read-only calendars remain read-only.
- Repeated and concurrent syncs do not duplicate events.
- Time zones, all-day events, recurring events, cancellations, and expired sync tokens have regression tests.
- Tokens are encrypted at rest and never returned to clients or written to logs.
- A shared message can be sent to Sonder from WhatsApp into Inbox in a few taps, without granting Sonder access to the rest of the chat.
- Uncertain parsing never silently creates a wrong task or event.
- Web and native flows are tested before release; migrations are reviewed and applied deliberately.