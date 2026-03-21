# sgChat Desktop Client

A feature-rich Windows desktop client for sgChat servers, built with Electron and React 19.

## Tech Stack

- **Electron 33** — Desktop shell with custom `app://` protocol
- **React 19** — Renderer UI framework
- **Mantine v8** — Component library (dark theme)
- **TanStack Query v5** — Server state management (REST data fetching, caching, infinite scroll)
- **TanStack Virtual** — Virtualized message lists
- **Zustand 5** — Client state management (UI, presence, typing, voice, themes, keybinds)
- **Socket.IO** — Real-time events (messages, presence, typing indicators)
- **LiveKit** — Voice/video via WebRTC
- **Framer Motion** — Animations and transitions
- **React Router v7** — Client-side routing
- **RNNoise WASM** — AI noise suppression (via `@jitsi/rnnoise-wasm`)
- **Vite 7** — Renderer bundler with HMR
- **esbuild** — Main/preload process bundler
- **electron-builder** — Packaging (NSIS/DMG/AppImage)

## Architecture

```
┌─ Main Process (Node.js) ──────────────────────┐
│  Window management, tray, global shortcuts     │
│  Encrypted token storage (electron-store)      │
│  REST API proxy (injects auth headers)         │
│  Auth manager (login, refresh, logout)         │
│  Custom app:// protocol for renderer           │
│  Auto-updater, crash reporter                  │
│  App audio capture (application loopback)      │
└────────────────────────────────────────────────┘
         ↕ IPC (contextBridge)
┌─ Renderer (Chromium) ─────────────────────────┐
│  React 19 + Mantine UI                        │
│  TanStack Query (REST data + caching)         │
│  Zustand stores (UI, presence, voice, etc.)   │
│  Socket.IO client (real-time events)          │
│  LiveKit client (voice/video WebRTC)          │
│  RNNoise WASM (AI noise suppression)          │
│  Markdown rendering, emoji system             │
└────────────────────────────────────────────────┘
         ↕ Network
┌─ sgChat Server ───────────────────────────────┐
│  REST API + Socket.IO gateway                 │
│  LiveKit media server                         │
└────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── main/                        # Electron main process
│   ├── index.ts                 # App entry, window creation, CSP
│   ├── protocol.ts              # Custom app:// protocol
│   ├── auth.ts                  # Token management (login, refresh, logout)
│   ├── api-proxy.ts             # REST proxy with auto-refresh
│   ├── ipc.ts                   # IPC handler registration
│   ├── store.ts                 # Encrypted auth + settings stores
│   ├── crypto.ts                # Encryption utilities
│   ├── tray.ts                  # System tray (show/hide/quit)
│   ├── shortcuts.ts             # Global shortcuts (mute, deafen)
│   ├── window-state.ts          # Window position/size persistence
│   ├── app-audio-capture.ts     # Application audio loopback
│   ├── update-checker.ts        # Auto-update checking
│   └── crash-reporter.ts        # Crash reporting
├── preload/
│   └── index.ts                 # contextBridge API (window.electronAPI)
├── renderer/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Auth router
│   ├── api/
│   │   └── socket.ts            # Socket.IO client + event dispatch
│   ├── lib/
│   │   ├── api.ts               # IPC-based REST wrapper
│   │   ├── queryClient.ts       # TanStack Query config
│   │   ├── voiceService.ts      # LiveKit room management
│   │   ├── dmVoiceService.ts    # DM voice calls
│   │   ├── noiseSuppressionService.ts  # RNNoise AI noise suppression
│   │   ├── soundService.ts      # Sound effects
│   │   ├── markdownParser.tsx   # Markdown rendering
│   │   ├── mentionUtils.ts      # @mention parsing
│   │   ├── messageCache.ts      # Offline message cache
│   │   ├── imageUtils.ts        # Image processing
│   │   └── crypto.ts            # Client-side encryption
│   ├── stores/                  # Zustand state stores
│   │   ├── authStore.ts         # Auth state
│   │   ├── uiStore.ts           # UI navigation + modals
│   │   ├── voiceStore.ts        # Voice connection state
│   │   ├── presenceStore.ts     # Online/offline/idle presence
│   │   ├── typingStore.ts       # Typing indicators
│   │   ├── themeStore.ts        # Theme customization
│   │   ├── keybindsStore.ts     # Custom keybindings
│   │   ├── notificationStore.ts # Notification preferences
│   │   └── ...                  # + activity, emoji, blocked users, etc.
│   ├── hooks/                   # TanStack Query hooks
│   │   ├── useMessages.ts       # Messages (infinite scroll)
│   │   ├── useChannels.ts       # Channel CRUD
│   │   ├── useServers.ts        # Server list
│   │   ├── useEmojis.ts         # Custom emoji system
│   │   ├── useEvents.ts         # Server events/calendar
│   │   └── ...                  # + categories, DMs, friends, etc.
│   ├── components/
│   │   ├── layout/              # TitleBar, Sidebars, ChatPanel, MemberList
│   │   ├── messages/            # MessageGroup, MessageItem, MessageInput
│   │   ├── ui/                  # Modals, pickers, panels, settings
│   │   │   └── server-settings/ # Dedicated server admin panels
│   │   └── voice/               # VoiceBar, VoicePanel, StageControls
│   ├── layouts/
│   │   └── AppLayout.tsx        # Main app shell layout
│   ├── pages/                   # Route-level views
│   │   ├── ServerView.tsx       # Server channel view
│   │   ├── ServerAdminView.tsx  # Server administration
│   │   ├── DMView.tsx           # Direct messages
│   │   ├── FriendsView.tsx      # Friends list
│   │   ├── SettingsView.tsx     # User settings
│   │   ├── LoginPage.tsx        # Authentication
│   │   └── ...                  # + register, forgot password, etc.
│   └── styles/
│       └── globals.css          # Global styles + Mantine CSS
├── scripts/
│   └── dev.mjs                  # Dev server (Vite + esbuild + Electron)
└── pages/
    └── setup.html               # First-run server URL configuration
```

## Features

- **Text Chat** — Rich messages with markdown, mentions, reactions, threads, embeds, pins
- **Voice & Video** — WebRTC via LiveKit with screen sharing and stage controls
- **AI Noise Suppression** — RNNoise WASM-based mic processing (48kHz, 10ms latency)
- **Direct Messages** — Private messaging with voice/video calls
- **Server Management** — Roles, permissions, channels, categories, invites, bans
- **Custom Emoji & Stickers** — Emoji packs, sticker uploads, GIF picker
- **Events & Calendar** — Server events with RSVP
- **Notifications** — Desktop notifications, unread indicators, mention badges
- **Soundboard** — Custom sound effects in voice channels
- **Search** — Message search with filters
- **Themes** — Customizable color themes
- **Auto-Update** — Built-in update checker

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Auth tokens stored encrypted in main process via electron-store
- REST API calls proxied through main process (tokens never exposed to renderer)
- Socket.IO tokens obtained via IPC, short-lived
- CSP headers injected for server origin
- Single instance lock, external links opened in system browser

## Development

```bash
npm install
npm run dev
```

Starts Vite (renderer HMR) + esbuild (main/preload watch) + Electron.

## Build

```bash
npm run build          # Build all (main + preload + renderer)
npm run start          # Build + launch Electron
npm run dist:win       # Package for Windows (NSIS installer)
npm run dist:mac       # Package for macOS (DMG)
npm run dist:linux     # Package for Linux (AppImage)
```

## License

MIT
