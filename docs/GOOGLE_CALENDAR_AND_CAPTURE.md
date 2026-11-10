# Google Calendar and low-friction capture

## Product intent

Sonder should bring external commitments into the same agenda as native events, and make it effortless to get an obligation out of a conversation and into Sonder. These are two parts of one workflow: capture commitments where they appear, then see them alongside the rest of life.

## Google Calendar

### User experience

- Add a dedicated Connect Google Calendar action under Settings > Integrations. Do not change the scopes requested by ordinary Google sign-in.
- Explain the requested access before redirecting to Google. The first release is read-only: Sonder reads calendars and events, but does not create, edit, or delete Google events.
- After consent, show every calendar returned by Google's calendar list, including calendars shared with the user. Let the user toggle which calendars appear in Sonder.
- Imported events appear in the existing Calendar and Today agenda, visually identified by their source calendar. Native Sonder events remain editable; imported Google events are read-only.
- Show last successful sync and a manual Sync now action. Disconnecting Google stops future sync and removes stored credentials; let the user choose whether already-imported historical events remain visible or are removed.

### Technical design

- Use a dedicated Google OAuth connection flow for Calendar. Do not silently add Calendar scopes to the existing Better Auth Google sign-in provider.
- Request the minimum read-only scope: https://www.googleapis.com/auth/calendar.readonly. Request offline access so the server can refresh access tokens. Store refresh credentials encrypted at rest; never expose them to web or native clients.
- Add provider connection, calendar selection, sync cursor, and imported event records as separate tables. Imported events must not be written into calendar_events, which is reserved for events created and owned in Sonder.
- Key imported events by user, provider, calendar ID, and provider event ID. Upsert records so repeated syncs are idempotent.
- Initial sync lists the user's calendar list and selected calendars, then pages through events in a bounded date window. Persist each calendar's nextSyncToken only after all pages have been stored.
- Incremental sync uses the saved sync token. If Google returns HTTP 410 (expired token), discard that calendar's cursor and perform a fresh sync. Handle cancelled/deleted provider events as tombstones.
- Include shared calendars returned by calendarList.list. Event detail visibility depends on permissions granted by the calendar owner. Do not attempt to bypass free/busy-only or private-event visibility.
- Start with scheduled server-side refresh plus manual sync. A polling cadence around 15 minutes is a reasonable first release; Google push notifications can be added later because channels expire and require renewal. Never rely on a client being open for background sync.
- Add per-user ownership checks to every connection/calendar/event query. Rate-limit OAuth callback and sync endpoints, validate OAuth state, and avoid logging tokens or event descriptions.

### Important semantics

- Google Calendar is an external source, not a second copy of Sonder's own calendar. Imported events are read-only in v1.
- Preserve provider time zones and all-day date semantics. Do not shift all-day events through UTC conversion.
- Use provider event IDs and ETags/update timestamps to avoid unnecessary writes.
- Sync a bounded future/past window for the agenda, and document the retention window. Recurring event instances must be expanded consistently and de-duplicated by provider instance ID.
- If a calendar is deselected, stop syncing it and remove or hide its imported events according to the user's chosen disconnect policy.

## Quick capture from conversations

### Recommended first release

Do not build a WhatsApp history scraper. Personal WhatsApp conversations are not exposed through a supported general-purpose API, and broad message ingestion would be invasive and noisy.

Instead, make Sonder a share destination on mobile and a share target on the web:

1. In WhatsApp, Messages, Mail, or a browser, the user chooses Share and selects Sonder.
2. Sonder receives the shared text, link, or selected content and creates an Inbox item immediately.
3. A lightweight parser suggests a type and extracts likely title, date/time, deadline, and location when present.
4. Show a compact review row/card with one-tap Add task, Add event, or Save note. Keep uncertain dates and ambiguous intent in Inbox rather than inventing details.
5. Preserve the original message text as source context so the user can verify the suggestion.

The existing Inbox and its convert-to-task/event/note endpoints are the foundation. Extend them rather than creating a parallel task system.

### Capture channels, in order

- Native share target: the best first channel because it works from WhatsApp without needing WhatsApp account access.
- Web/PWA share target: useful on desktop and supported mobile browsers; accept plain text and URLs.
- Quick-add command: a global text field that accepts natural language such as Ask Daria about the slides tomorrow and stores it immediately.
- Optional bot channel later: a Telegram bot is a practical opt-in messaging bridge. A WhatsApp Business Cloud API number is possible only as a separate business-account integration; it is not a way to read a user's personal WhatsApp chats.

### Parsing and trust

- Start with deterministic extraction for dates, times, URLs, and obvious task language. Add an AI parser only when a supported inference provider or local model is deliberately configured.
- Never create an external calendar event or mark a task complete based only on an inference.
- Default to saving first, then proposing a task/event. For high-confidence simple tasks, allow a user-controlled setting for automatic task creation.
- Make source, extracted fields, and confidence inspectable. Let the user correct the suggestion before conversion.
- Add idempotency keys to inbound capture so OS share retries or bot webhook retries cannot create duplicates.
- Treat shared content as private user data. Do not send it to third-party AI services unless the user explicitly enables that processing.

## Delivery slices

1. Foundation: schema, encrypted token storage, OAuth state/callback, provider connection status, and calendar list/selection.
2. Read-only sync: initial + incremental sync, expired-token recovery, imported-event query merged into agenda, and manual sync.
3. Background sync: scheduled refresh, observability, retry/backoff, and sync status in Settings.
4. Capture: native share intent and web share target into the existing Inbox.
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