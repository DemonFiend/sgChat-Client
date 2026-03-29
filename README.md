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
- **AI Noise Suppression** — Built-in mic processing so your background stays quiet
- **Direct Messages** — Private conversations with voice and video calling
- **Custom Emoji & Stickers** — Upload your own emoji packs, stickers, and use the GIF picker
- **Events & Calendar** — Schedule server events with RSVP
- **Roles & Moderation** — Granular permissions, audit logs, and moderation tools
- **Desktop Notifications** — Unread indicators, mention badges, and system alerts
- **Themes** — Customizable color themes to match your style
- **Multi-Server** — Connect to multiple servers and quick-switch between them

---

## How to Install

> sgChat is in **alpha**. Expect rough edges and missing features. We'd love your feedback.

### System Requirements

| | Minimum |
|---|---------|
| **OS** | Windows 10+, Ubuntu 22.04+ LTS, or Android 10+ |
| **RAM** | 4 GB |
| **Storage** | 200 MB |
| **Network** | Active connection to a sgChat server |

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

## Security & Privacy

sgChat is designed so that you never have to trust a third party with your conversations.

- **End-to-end encrypted transport** — All client-server communication is encrypted
- **Encrypted credential storage** — Auth tokens are stored encrypted on your device
- **Sandboxed renderer** — The UI runs in a locked-down Chromium sandbox with no direct system access
- **No data leaves your server** — Messages, files, and calls stay on infrastructure you control

---

## Host Your Own Server

sgChat is fully self-hosted. You run the server, you own the data. No third-party services, no telemetry, no subscriptions.

Check out the server repo for setup instructions:

**[sgChat Server on GitHub](https://github.com/DemonFiend/sgChat/blob/main/README.md)**

---

## Roadmap

Here's what's coming next. No promises on timelines — we ship when it's ready.

- [ ] Alpha release builds (Windows installer, Ubuntu .AppImage, Android APK)
- [ ] Auto-update connected to release channel
- [ ] Full feature parity with the web client
- [ ] Android mobile app
- [ ] Push notifications (mobile)
- [ ] End-to-end encrypted DMs

Have a feature request? [Open an issue](https://github.com/DemonFiend/sgChat-Client/issues).

---

## FAQ

Have questions? Check the **[FAQ](https://github.com/DemonFiend/sgChat/blob/main/FAQ.md)**.

---

## Known Issues

This is alpha software. Here's what we know about:

- Some features are still being ported from the web client
- Ubuntu and Android builds have not been extensively tested
- Auto-update is not yet connected to a release channel
- Voice/video quality depends on your server's LiveKit relay configuration

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
