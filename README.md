# sgChat Desktop Client

An independent Windows desktop client for sgChat servers, built with Electron and React 19.

## Tech Stack

- **Electron 33** — Desktop shell with custom `app://` protocol
- **React 19** — Renderer UI framework
- **Mantine v8** — Component library (dark theme)
- **TanStack Query** — Server state management (REST data fetching, caching, infinite scroll)
- **Zustand** — Client state management (UI, presence, typing, voice)
- **Socket.IO** — Real-time events (messages, presence, typing indicators)
- **LiveKit** — Voice/video via WebRTC
- **Vite** — Renderer bundler with HMR
- **esbuild** — Main/preload process bundler

## Architecture

```
┌─ Main Process (Node.js) ──────────────────────┐
│  • Window management, tray, shortcuts          │
│  • Encrypted token storage (electron-store)    │
│  • REST API proxy (injects auth headers)       │
│  • Auth manager (login, refresh, logout)       │
│  • Custom app:// protocol for renderer         │
└────────────────────────────────────────────────┘
         ↕ IPC (contextBridge)
┌─ Renderer (Chromium) ─────────────────────────┐
│  • React 19 + Mantine UI                      │
│  • TanStack Query (REST data)                 │
│  • Zustand stores (UI, presence, typing)      │
│  • Socket.IO client (real-time events)        │
│  • LiveKit client (voice/video WebRTC)        │
└────────────────────────────────────────────────┘
         ↕ Network
┌─ sgChat Server ───────────────────────────────┐
│  • REST API + Socket.IO gateway               │
│  • LiveKit media server                       │
└────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry, window creation
│   ├── protocol.ts          # Custom app:// protocol
│   ├── auth.ts              # Token management
│   ├── api-proxy.ts         # REST proxy with auto-refresh
│   ├── ipc.ts               # IPC handler registration
│   ├── store.ts             # Encrypted auth + settings stores
│   ├── tray.ts              # System tray
│   ├── shortcuts.ts         # Global keyboard shortcuts
│   └── window-state.ts      # Window position persistence
├── preload/
│   └── index.ts             # contextBridge API
├── renderer/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Auth router
│   ├── theme.ts             # Mantine theme config
│   ├── api/
│   │   └── socket.ts        # Socket.IO client + event dispatch
│   ├── lib/
│   │   ├── api.ts           # IPC-based REST wrapper
│   │   ├── queryClient.ts   # TanStack Query config
│   │   └── voiceService.ts  # LiveKit room management
│   ├── stores/
│   │   ├── authStore.ts     # Auth state
│   │   ├── uiStore.ts       # UI navigation state
│   │   ├── presenceStore.ts # Online/offline presence
│   │   ├── typingStore.ts   # Typing indicators
│   │   └── voiceStore.ts    # Voice connection state
│   ├── hooks/               # TanStack Query hooks
│   ├── components/
│   │   ├── layout/          # TitleBar, Sidebars, ChatPanel, MemberList
│   │   ├── messages/        # MessageItem, MessageInput, TypingIndicator
│   │   └── voice/           # VoiceBar
│   ├── layouts/
│   │   └── AppLayout.tsx    # Main app layout
│   ├── pages/               # ServerView, DMView, FriendsView, SettingsView
│   └── styles/
│       └── globals.css      # Global styles + Mantine CSS imports
└── scripts/
    └── dev.mjs              # Dev server (Vite + esbuild + Electron)
```

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Auth tokens stored encrypted in main process via electron-store
- REST API calls proxied through main process (tokens never exposed to renderer)
- Socket.IO tokens obtained via IPC, short-lived
- Single instance lock, external links opened in system browser

## Development

```bash
npm install
npm run dev
```

This starts Vite (renderer HMR on port 5173) + esbuild (main/preload watch) + Electron.

## Build

```bash
npm run build          # Build all (main + preload + renderer)
npm run start          # Build + launch Electron
npm run dist:win       # Package for Windows (NSIS installer)
```

## Server Requirements

See [SERVER-CHANGES.md](SERVER-CHANGES.md) for server-side configuration needed to support this client.
