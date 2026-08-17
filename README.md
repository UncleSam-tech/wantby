# WantBy

**What you want, by when.**

WantBy is a private, offline-first shopping and acquisition list. It turns quick sentences such as “charger, toothpaste and new shoes by Wednesday” into concrete, dated items and keeps everything on the current device.

**Live app:** [wantby.vercel.app](https://wantby.vercel.app)

## Highlights

- Installable Progressive Web App for Android and desktop
- Smart local sentence splitting and natural date detection
- Optional Chrome speech-to-text capture
- Today, list, calendar, completed, and recurring item views
- IndexedDB device storage with persistent-storage support
- JSON backup and restore
- `.ics` calendar export for reliable closed-app reminders
- Dark mode, reduced-motion support, and responsive touch targets
- No account, backend, cloud sync, analytics, or tracking

## Local development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm test
npm run typecheck
npm run build
```

## Reminder model

The web platform cannot guarantee exact, closed-app alarms without a push service. WantBy can show notifications while active and exports standard calendar events with alerts for dependable Android reminders.

## Data model

WantBy stores its state in IndexedDB under the deployed origin. Clearing site data removes it. Use Settings → Backup before changing phones, browsers, or deployment domains.
