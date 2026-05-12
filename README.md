<p align="center">
  <img src="resources/icon.png" alt="sgChat" width="128" height="128">
</p>

<h1 align="center">sgChat</h1>

<p align="center">
  A self-hosted platform for text, voice, and video — built for communities that want to own their data.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Ubuntu%20%7C%20Android-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/status-alpha-orange" alt="Status">
</p>

---

<!-- Demo video placeholder — record a short walkthrough and link it here -->
<!-- <p align="center"> -->
<!--   <a href="https://www.youtube.com/watch?v=YOUR_VIDEO_ID"> -->
<!--     <img src="screenshots/demo-thumbnail.png" alt="sgChat Demo" width="600"> -->
<!--   </a> -->
<!--   <br><em>Click to watch a quick walkthrough</em> -->
<!-- </p> -->

## Why sgChat?

Most chat platforms own your data, lock you into their ecosystem, and charge for features that should be free. sgChat is different:

- **Self-hosted** — Your server, your rules. No third party ever touches your messages.
- **No telemetry** — Zero data collection, zero tracking, zero analytics.
- **No subscriptions** — Every feature is free. No nitro, no tiers, no paywalls.
- **Open source** — Read the code, fork it, contribute to it.

---

## Features

- **Text Chat** — Markdown, reactions, threads, pins, and message search
- **Voice & Video** — Channels with screen sharing and stage controls
- **AI Noise Suppression** — Pick your mode: RNNoise, NSNet2, or DeepFilterNet for crystal-clear mic input
- **End-to-End Encrypted DMs** — Signal-style key ratcheting; your DMs are unreadable by the server
- **Direct Messages** — Private conversations with voice and video calling
- **Soundboard & Voice Sounds** — Server soundboard plus custom join/leave sounds per server
- **Custom Emoji & Stickers** — Upload your own emoji packs, stickers, and use the GIF picker
- **Events & Calendar** — Schedule server events with RSVP
- **Roles & Moderation** — Granular permissions, audit logs, and moderation tools
- **Desktop Integration** — System tray, global shortcuts (push-to-talk, mute, deafen), and auto-launch with Windows
- **Per-App Audio Capture** — Windows-only: stream a specific app's audio without grabbing your whole system
- **Desktop Notifications** — Unread indicators, mention badges, and system alerts
- **Themes** — Customizable color themes to match your style
- **Multi-Server** — Connect to multiple servers and quick-switch between them

---

## How to Install

> sgChat is in **alpha**. Expect rough edges and missing features. We'd love your feedback.

### System Requirements

Measured against the current Windows alpha. Linux and Android requirements will be published when those builds ship.

| | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 (1809+) | Windows 11 |
| **CPU** | Dual-core x64 | Quad-core x64 |
| **RAM** | 4 GB system / 750 MB free | 8 GB system / 1 GB free |
| **Disk** | 700 MB install | 1 GB install |
| **Network** | 256 kbps voice / 1 Mbps screen share | 1 Mbps voice / 4 Mbps screen share |
| **GPU** | Any with hardware acceleration | Dedicated GPU for stream decoding |

Typical RAM usage in our testing:

- **Idle / browsing channels:** ~485 MB
- **In a voice call:** ~600 MB
- **Voice + screen share:** ~600 MB (the encoder is offloaded to the OS, so screen share barely adds any heap)

### Download

<!-- Alpha release links will go here once builds are published -->
| Platform | Download |
|----------|----------|
| Windows  | *Coming soon* |
| Ubuntu (LTS) | *Coming soon* |
| Android  | *Coming soon* |

### Setup

1. Download and install sgChat for your platform
2. Launch the app — you'll see the server connection screen
3. Enter your server's URL (e.g. `https://chat.example.com`)
4. Create an account or log in
5. You're in

Don't have a server? See [Host Your Own Server](#host-your-own-server) below.

---

## Security

The sgChat client is built to keep your device and credentials safe.

- **Encrypted credentials** — Your login tokens are stored encrypted on your machine, not in plain text
- **Sandboxed app** — The UI runs in a locked-down sandbox with no direct access to your filesystem or system
- **No telemetry** — The client collects zero data about you. No analytics, no tracking, no phone-home
- **Open source** — Every line of code is auditable. You don't have to take our word for it

---

## Host Your Own Server

sgChat is fully self-hosted. You run the server, you own the data. No third-party services, no telemetry, no subscriptions.

Check out the server repo for setup instructions:

**[sgChat Server on GitHub](https://github.com/DemonFiend/sgChat/blob/main/README.md)**

---

## Roadmap

Here's what's coming next. No promises on timelines — we ship when it's ready.

- [ ] Public alpha releases (Windows installer is built; Linux `.AppImage` and Android APK still to come)
- [ ] Auto-update connected to a release channel (`electron-updater` is wired; just needs a feed)
- [ ] Linux desktop build (Ubuntu LTS first)
- [ ] Android mobile app
- [ ] Push notifications (mobile)

Have a feature request? [Open an issue](https://github.com/DemonFiend/sgChat-Client/issues).

---

## FAQ

Have questions? Check the **[FAQ](https://github.com/DemonFiend/sgChat/blob/main/FAQ.md)**.

---

## Known Issues

This is alpha software. Here's what we know about:

- The desktop client and the web client are tracked separately and may temporarily diverge on individual screens
- Linux and Android builds are not yet published
- Auto-update is not yet connected to a release channel (it works locally; the feed is the missing piece)
- Voice/video quality depends on your server's LiveKit relay configuration
- Per-app audio capture is Windows-only — Linux/macOS fall back to system audio capture

Found a bug? [Open an issue](https://github.com/DemonFiend/sgChat-Client/issues).

---

## Contributing

We welcome contributions. If you'd like to help:

1. Check the [open issues](https://github.com/DemonFiend/sgChat-Client/issues) for things to work on
2. Fork the repo and create a branch
3. Submit a pull request

<!-- For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). -->

---

## Community

<!-- Links will be updated as community channels are set up -->

- **Bug Reports** — [GitHub Issues](https://github.com/DemonFiend/sgChat-Client/issues)
- **Server Repo** — [DemonFiend/sgChat](https://github.com/DemonFiend/sgChat)

<!-- - **Discord** — *Coming soon* -->
<!-- - **Matrix** — *Coming soon* -->

---

<details>
<summary><strong>Built With</strong></summary>

<br>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-39-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/LiveKit-WebRTC-FF6B35?logo=webrtc&logoColor=white" alt="LiveKit">
  <img src="https://img.shields.io/badge/Mantine-v8-339AF0?logo=mantine&logoColor=white" alt="Mantine">
</p>

</details>

<details>
<summary><strong>Screenshots</strong></summary>

<br>

<!-- Add screenshots here as the UI stabilizes. Format: -->
<!-- <p align="center"> -->
<!--   <img src="screenshots/chat.png" alt="Text chat" width="800"> -->
<!--   <br><em>Text chat with markdown and reactions</em> -->
<!-- </p> -->

*Screenshots will be added as the alpha UI stabilizes.*

</details>

---

<p align="center">
  MIT License
</p>
