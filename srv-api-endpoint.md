# sgChat Server — Complete API Reference

> **For the Windows desktop client.** Every HTTP endpoint and Socket.IO event the server exposes.
> This file is the single source of truth for achieving 100% feature parity.

**Base URL**: `https://chat.sosiagaming.com` (or `http://localhost:3000` for dev)

**Dual registration**: Every route is available at both `/api/<path>` (canonical) and `/<path>` (legacy). Only `/api/` paths are listed below.

**Auth**: Pass `Authorization: Bearer <access_token>` header. Routes marked "Auth: Yes" require it.

**Password format**: Client must pre-hash passwords as `sha256:<hex>` before sending.

**Encryption**: Optional ECDH + AES-256-GCM encryption via `/api/crypto/exchange`. Pass `cryptoSessionId` in Socket.IO handshake to enable per-socket payload encryption.

---

## Table of Contents

1. [System / Health](#system--health)
2. [Auth](#auth)
3. [Crypto](#crypto)
4. [Users](#users)
5. [Servers](#servers)
6. [Channels](#channels)
7. [Messages](#messages)
8. [Direct Messages (DMs)](#direct-messages-dms)
9. [Friends](#friends)
10. [Voice](#voice)
11. [Server (Single-Tenant)](#server-single-tenant)
12. [Server Popup Config](#server-popup-config)
13. [Standalone Shortcuts](#standalone-shortcuts)
14. [Categories](#categories)
15. [Upload](#upload)
16. [Notifications](#notifications)
17. [Giphy](#giphy)
18. [Soundboard](#soundboard)
19. [Role Reactions](#role-reactions)
20. [Activity / Rich Presence](#activity--rich-presence)
21. [Keybinds](#keybinds)
22. [Channel Notification Settings](#channel-notification-settings)
23. [Releases](#releases)
24. [Crash Reports](#crash-reports)
25. [Gateway / Events](#gateway--events)
26. [Socket.IO — Client → Server](#socketio--client--server)
27. [Socket.IO — Server → Client](#socketio--server--client)

---

## System / Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Returns `{ status: "ok" }` |
| GET | `/api/version` | No | Returns server version string |

---

## Auth

### POST `/api/auth/register`
**Auth:** No

**Body:**
```json
{ "username": "string", "email": "string", "password": "sha256:<hex>" }
```

**Response:**
```json
{ "user": { "id", "username", "email" }, "accessToken": "string", "refreshToken": "string" }
```

---

### POST `/api/auth/login`
**Auth:** No

**Body:**
```json
{ "email": "string", "password": "sha256:<hex>" }
```

**Response:**
```json
{
  "user": { "id", "username", "email", "avatar_url", "status" },
  "accessToken": "string",
  "refreshToken": "string"
}
```

Sets `refreshToken` as httpOnly cookie.

---

### POST `/api/auth/refresh`
**Auth:** No (reads httpOnly cookie or body)

**Body (optional):**
```json
{ "refreshToken": "string" }
```

**Response:**
```json
{ "accessToken": "string" }
```

---

### POST `/api/auth/logout`
**Auth:** Yes

Invalidates the refresh token and clears cookie.

**Response:** `{ "success": true }`

---

### POST `/api/auth/claim-admin`
**Auth:** No (one-time use, only works if no admin exists)

**Body:**
```json
{ "userId": "uuid", "claimToken": "string" }
```

**Response:** `{ "success": true, "message": "..." }`

---

### POST `/api/auth/forgot-password`
**Auth:** No

**Body:**
```json
{ "email": "string" }
```

**Response:** `{ "success": true }` (always, prevents enumeration)

---

### POST `/api/auth/reset-password`
**Auth:** No

**Body:**
```json
{ "token": "string", "password": "sha256:<hex>" }
```

**Response:** `{ "success": true }`

---

### GET `/api/auth/verify-reset-token`
**Auth:** No

**Query:** `?token=<string>`

**Response:** `{ "valid": true }` or error

---

## Crypto

### POST `/api/crypto/exchange`
**Auth:** No

ECDH key exchange. Client sends P-256 public key (base64, 65 bytes uncompressed). Server derives shared AES-256 session key.

**Body:**
```json
{ "clientPublicKey": "<base64 P-256 uncompressed key>" }
```

**Response:**
```json
{
  "serverPublicKey": "<base64>",
  "sessionId": "<uuid>",
  "expiresAt": "<ISO8601>"
}
```

Pass `sessionId` as `cryptoSessionId` in Socket.IO handshake auth to enable encryption.

---

## Users

All routes require auth unless noted.

### GET `/api/users/me`
Get current user profile.

**Response:**
```json
{
  "id", "username", "email", "display_name", "avatar_url", "banner_url",
  "status", "custom_status", "custom_status_emoji", "bio", "created_at"
}
```

---

### PATCH `/api/users/me`
Update profile.

**Body:** `{ "username?", "display_name?", "bio?" }`

**Response:** Updated user object

---

### PATCH `/api/users/me/status`
Set presence status.

**Body:** `{ "status": "online" | "idle" | "dnd" | "offline" }`

**Response:** Updated user object. Broadcasts `presence.update`.

---

### PATCH `/api/users/me/presence`
Alias for `/me/status`.

---

### PATCH `/api/users/me/custom-status`
**Body:** `{ "custom_status": "string | null" }`

**Response:** Updated user object

---

### PATCH `/api/users/me/status_comment`
Set status comment with optional emoji and expiry.

**Body:**
```json
{ "text": "string | null", "emoji": "string | null", "expires_at": "ISO8601 | null" }
```

**Response:** `{ "success": true }`

---

### POST `/api/users/me/push-token`
Register push notification token (ntfy).

**Body:** `{ "token": "string", "platform?": "string" }`

**Response:** `{ "success": true }`

---

### GET `/api/users/me/settings`
**Response:** `{ "notifications_enabled", "sound_enabled", ... }`

---

### PATCH `/api/users/me/settings`
**Body:** Partial settings object

**Response:** Updated settings

---

### GET `/api/users/me/preferences`
**Response:** Preferences object

---

### PATCH `/api/users/me/preferences`
**Body:** Partial preferences object

**Response:** Updated preferences

---

### POST `/api/users/me/password`
**Body:** `{ "current_password": "sha256:<hex>", "new_password": "sha256:<hex>" }`

**Response:** `{ "success": true }`

---

### POST `/api/users/me/email`
**Body:** `{ "email": "string", "password": "sha256:<hex>" }`

**Response:** `{ "success": true }`

---

### POST `/api/users/me/avatar`
**Content-Type:** `multipart/form-data` — field: `file` (image)

**Response:** `{ "avatar_url": "string" }`

---

### DELETE `/api/users/me/avatar`
**Response:** `{ "success": true }`

---

### POST `/api/users/me/banner`
**Content-Type:** `multipart/form-data` — field: `file` (image)

**Response:** `{ "banner_url": "string" }`

---

### DELETE `/api/users/me/banner`
**Response:** `{ "success": true }`

---

### POST `/api/users/me/avatar/revert`
Revert to a previous avatar from history.

**Body:** `{ "avatar_url": "string" }`

**Response:** `{ "avatar_url": "string" }`

---

### GET `/api/users/me/avatar/history`
**Response:** `{ "history": [{ "avatar_url", "changed_at" }] }`

---

### GET `/api/users/me/avatar/limits`
**Response:** `{ "max_size_bytes", "max_width", "max_height" }`

---

### GET `/api/users/blocked`
**Response:** `[{ "id", "username", "avatar_url", "blocked_at" }]`

---

### POST `/api/users/:userId/block`
**Response:** `{ "success": true }`

---

### DELETE `/api/users/:userId/block`
**Response:** `{ "success": true }`

---

### GET `/api/users/:userId`
Get public profile of any user.

**Response:**
```json
{
  "id", "username", "display_name", "avatar_url", "banner_url",
  "bio", "status", "custom_status", "last_seen_at"
}
```

---

### GET `/api/users/search`
**Query:** `?q=<string>&limit=<number>`

**Response:** `[{ "id", "username", "display_name", "avatar_url" }]`

---

### GET `/api/users/me/servers/:serverId/sounds`
Get custom join/leave voice sounds for current user in a server.

**Response:** `{ "join?": { "url", "name" }, "leave?": { "url", "name" } }`

---

### PUT `/api/users/me/servers/:serverId/sounds/:type`
Upload a custom voice sound. `type` = `join` or `leave`.

**Content-Type:** `multipart/form-data` — field: `file` (audio)

**Response:** `{ "url": "string", "name": "string" }`

---

### DELETE `/api/users/me/servers/:serverId/sounds/:type`
Remove custom voice sound. `type` = `join` or `leave`.

**Response:** `{ "success": true }`

---

## Servers

All routes require auth.

### GET `/api/servers`
List all servers the current user is a member of.

**Response:** `[{ "id", "name", "icon_url", "owner_id", "member_count" }]`

---

### POST `/api/servers`
Create a new server.

**Body:** `{ "name": "string", "icon_url?": "string" }`

**Response:** Created server object

---

### GET `/api/servers/:id`
**Response:** Full server object with channels, roles, member count

---

### PATCH `/api/servers/:id`
Update server settings. Requires `MANAGE_SERVER`.

**Body:** `{ "name?", "icon_url?" }`

**Response:** Updated server object

---

### DELETE `/api/servers/:id`
Owner only.

**Response:** `{ "success": true }`

---

### POST `/api/servers/:id/transfer`
Transfer ownership.

**Body:** `{ "new_owner_id": "uuid" }`

**Response:** `{ "success": true }`

---

### GET `/api/servers/:id/channels`
**Response:** `[{ "id", "name", "type", "position", "category_id" }]`

---

### POST `/api/servers/:id/channels`
**Body:** `{ "name", "type": "text|voice|...", "category_id?", "position?" }`

**Response:** Created channel object

---

### GET `/api/servers/:id/members`
Members now include roles array and activity.

**Response:**
```json
[{
  "user_id", "server_id", "nickname", "announce_online", "joined_at",
  "username", "display_name", "avatar_url", "status", "custom_status",
  "activity": "UserActivity | null",
  "roles": [{ "id", "name", "color", "position", "is_hoisted" }]
}]
```

---

### GET `/api/servers/:id/roles`
**Response:** `[{ "id", "name", "color", "permissions", "position", "is_everyone" }]`

---

### POST `/api/servers/:id/roles`
**Body:** `{ "name", "color?", "permissions?", "position?" }`

**Response:** Created role object

---

### POST `/api/servers/:id/roles/from-template`
**Body:** `{ "template": "string" }`

**Response:** Array of created roles

---

### GET `/api/servers/:id/roles/:roleId`
**Response:** Role object

---

### PATCH `/api/servers/:id/roles/:roleId`
**Body:** `{ "name?", "color?", "permissions?", "position?", "hoist?", "mentionable?" }`

**Response:** Updated role object

---

### DELETE `/api/servers/:id/roles/:roleId`
**Response:** `{ "success": true }`

---

### PATCH `/api/servers/:id/roles/reorder`
**Body:** `{ "roles": [{ "id", "position" }] }`

**Response:** `{ "success": true }`

---

### POST `/api/servers/:id/members/:userId/roles/:roleId`
Add a role to a member.

**Response:** `{ "success": true }`

---

### DELETE `/api/servers/:id/members/:userId/roles/:roleId`
Remove a role from a member.

**Response:** `{ "success": true }`

---

### GET `/api/servers/:id/members/:userId/roles`
**Response:** Array of role objects

---

### PUT `/api/servers/:id/members/:userId/roles`
Bulk set roles for a member.

**Body:** `{ "role_ids": ["uuid"] }`

**Response:** `{ "success": true }`

---

### POST `/api/servers/:id/members/:userId/kick`
Requires `KICK_MEMBERS`.

**Body:** `{ "reason?": "string" }`

**Response:** `{ "success": true }`

---

### POST `/api/servers/:id/members/:userId/ban`
Requires `BAN_MEMBERS`.

**Body:** `{ "reason?": "string", "delete_messages_days?": "number" }`

**Response:** `{ "success": true }`

---

### POST `/api/servers/:id/members/:userId/warn`
**Body:** `{ "reason": "string" }`

**Response:** `{ "success": true }`

---

### POST `/api/servers/:id/members/:userId/timeout`
**Body:** `{ "duration_minutes": "number", "reason?": "string" }`

**Response:** `{ "success": true }`

---

### DELETE `/api/servers/:id/members/:userId/timeout`
**Response:** `{ "success": true }`

---

### GET `/api/servers/:id/bans`
**Response:** `[{ "user": { "id", "username" }, "reason", "banned_at" }]`

---

### DELETE `/api/servers/:id/bans/:userId`
**Response:** `{ "success": true }`

---

### GET `/api/servers/:id/invites`
**Response:** `[{ "code", "created_by", "uses", "max_uses", "expires_at" }]`

---

### POST `/api/servers/:id/invites`
**Body:** `{ "max_uses?": "number", "expires_in_hours?": "number" }`

**Response:** `{ "code", "url", "expires_at" }`

---

### DELETE `/api/servers/:id/invites/:code`
**Response:** `{ "success": true }`

---

### POST `/api/servers/join/:code`
Join via invite code.

**Response:** `{ "server": { "id", "name" } }`

---

### POST `/api/servers/:id/leave`
**Response:** `{ "success": true }`

---

### GET `/api/servers/:id/audit-log`
**Query:** `?limit=&before=&action_type=`

**Response:** `[{ "id", "action", "actor", "target", "reason", "created_at" }]`

---

### GET `/api/servers/:id/permissions`
Get effective permissions for current user.

**Response:** `{ "server": "bigint string", "text": "bigint string", "voice": "bigint string" }`

---

### GET `/api/servers/:id/members/:userId/permissions`
Get effective permissions for a specific member.

**Response:** `{ "server": "bigint string", "text": "bigint string", "voice": "bigint string" }`

---

### GET `/api/servers/:id/categories`
**Response:** `[{ "id", "name", "position", "channels": [...] }]`

---

### POST `/api/servers/:id/categories`
**Body:** `{ "name": "string", "position?": "number" }`

**Response:** Created category object

---

## Channels

All routes require auth.

### GET `/api/channels/:id`
**Response:** `{ "id", "name", "type", "topic", "position", "server_id", "category_id", "bitrate", "user_limit" }`

---

### GET `/api/channels/:id/messages`
Supports ETag caching.

**Query:** `?limit=<number>&before=<message_id>`

**Headers:** `If-None-Match: <etag>` (optional, returns 304 if unchanged)

**Response:**
```json
{
  "messages": [{
    "id", "content",
    "author": { "id", "username", "display_name", "avatar_url" },
    "created_at", "edited_at", "attachments", "reactions", "reply_to_id"
  }],
  "hash": "<etag>"
}
```

---

### POST `/api/channels/:id/messages`
Send a message via REST. Supports idempotency.

**Headers:** `Idempotency-Key: <uuid>` (optional)

**Body:** `{ "content": "string", "reply_to_id?": "uuid" }`

**Response:** Full message object

---

### PATCH `/api/channels/:id`
Update channel settings.

**Body:**
```json
{
  "name?": "string (1-100)",
  "topic?": "string (max 1024) | null",
  "position?": "number",
  "bitrate?": "number (8000-384000, voice only)",
  "user_limit?": "number (0-99, voice only)",
  "is_afk_channel?": "boolean (voice only)"
}
```

**Response:** Updated channel object

---

### DELETE `/api/channels/:id`
**Response:** `{ "success": true }`

---

### PATCH `/api/channels/:id/bitrate`
**Body:** `{ "bitrate": "number (8000-384000)" }`

**Response:** Updated channel object

---

### PATCH `/api/channels/:id/reorder`
**Body:** `{ "channels": [{ "id": "uuid", "position": "number" }] }`

**Response:** `{ "success": true }`

---

### POST `/api/channels/:id/ack`
Mark channel as read.

**Body:** `{ "message_id?": "string" }` (defaults to latest)

**Response:** `{ "success": true }`

---

### GET `/api/channels/:id/read-state`
**Response:** `{ "last_read_message_id", "unread_count" }`

---

### GET `/api/channels/:id/voice-participants`
**Response:** `[{ "user_id", "username", "avatar_url", "is_muted", "is_deafened", "is_streaming" }]`

---

### GET `/api/channels/:id/permissions`
**Response:** `{ "roles": [...], "users": [...] }`

---

### PUT `/api/channels/:id/permissions/roles/:roleId`
**Body:** `{ "allow": "bigint string", "deny": "bigint string" }`

**Response:** `{ "success": true }`

---

### PUT `/api/channels/:id/permissions/users/:userId`
**Body:** `{ "allow": "bigint string", "deny": "bigint string" }`

**Response:** `{ "success": true }`

---

### DELETE `/api/channels/:id/permissions/roles/:roleId`
**Response:** `{ "success": true }`

---

### DELETE `/api/channels/:id/permissions/users/:userId`
**Response:** `{ "success": true }`

---

### GET `/api/channels/:id/pinned`
**Response:** Array of message objects

---

### POST `/api/channels/:id/messages/:messageId/pin`
**Response:** `{ "success": true }`

---

### DELETE `/api/channels/:id/messages/:messageId/pin`
**Response:** `{ "success": true }`

---

### GET `/api/channels/:id/retention`
**Response:** `{ "effective": { "max_messages?", "max_age_days?" }, "channel_override": {...} | null, "server_default": {...} }`

---

### PATCH `/api/channels/:id/retention`
**Body:** `{ "max_messages?": "number | null", "max_age_days?": "number | null" }`

**Response:** `{ "success": true }`

---

### GET `/api/channels/:id/storage-stats`
**Response:** `{ "message_count", "total_size_bytes", "attachment_count" }`

---

### GET `/api/channels/:id/segments`
List message archive segments.

**Response:** `[{ "id", "start_time", "end_time", "message_count" }]`

---

### GET `/api/channels/:id/segments/:segmentId/messages`
**Response:** Array of message objects from archive

---

## Messages

All routes require auth.

### PATCH `/api/messages/:id`
Edit a message (own messages only).

**Body:** `{ "content": "string" }`

**Response:** Updated message object

---

### DELETE `/api/messages/:id`
Delete a message (own, or `MANAGE_MESSAGES` permission).

**Response:** `{ "success": true }`

---

### PUT `/api/messages/:id/reactions/:emoji`
Add a reaction.

**Response:** `{ "success": true }`

---

### DELETE `/api/messages/:id/reactions/:emoji`
Remove your reaction.

**Response:** `{ "success": true }`

---

### GET `/api/messages/:id/reactions`
**Response:** `[{ "emoji", "count", "users": [{ "id", "username" }] }]`

---

### GET `/api/messages/:id/preview`
Get URL preview/embed for a message link.

**Response:** `{ "url", "title", "description", "image_url" }` or `null`

---

## Direct Messages (DMs)

All routes require auth.

### GET `/api/dms`
List all DM channels.

**Response:** `[{ "id", "other_user": { "id", "username", "avatar_url", "status" }, "last_message", "unread_count" }]`

---

### POST `/api/dms`
Create or find a DM channel with a user.

**Body:** `{ "user_id": "uuid" }`

**Response:** DM channel object

---

### GET `/api/dms/:id/messages`
Supports ETag.

**Query:** `?limit=<number>&before=<message_id>`

**Headers:** `If-None-Match: <etag>`

**Response:** `{ "messages": [...], "hash": "<etag>" }`

---

### POST `/api/dms/:id/messages`
**Body:** `{ "content": "string", "reply_to_id?": "uuid" }`

**Response:** Full message object

---

### GET `/api/dms/user/:userId/messages`
Get DM messages by userId instead of channel ID.

**Query:** `?limit=<number>&before=<message_id>`

**Response:** `{ "messages": [...], "hash": "<etag>" }`

---

### POST `/api/dms/user/:userId/messages`
Send DM by userId.

**Body:** `{ "content": "string" }`

**Response:** Full message object

---

### POST `/api/dms/ack`
**Body:** `{ "dm_channel_id": "uuid", "message_id?": "uuid" }`

**Response:** `{ "success": true }`

---

### GET `/api/dms/unread`
**Response:** `[{ "dm_channel_id", "unread_count" }]`

---

### POST `/api/dms/:id/voice/join`
Join voice call in DM.

**Response:** `{ "token": "string", "room_name": "string" }`

---

### POST `/api/dms/:id/voice/leave`
**Response:** `{ "success": true }`

---

### GET `/api/dms/:id/voice/status`
**Response:** `{ "active": "boolean", "participants": [...] }`

---

### GET `/api/dms/:id/retention`
**Response:** `{ "effective": { "max_messages?", "max_age_days?" } }`

---

### PATCH `/api/dms/:id/retention`
**Body:** `{ "max_messages?": "number | null", "max_age_days?": "number | null" }`

**Response:** `{ "success": true }`

---

### GET `/api/dms/:id/storage-stats`
**Response:** `{ "message_count", "total_size_bytes", "attachment_count" }`

---

### GET `/api/dms/:id/storage-stats/comprehensive`
**Response:** Extended stats object

---

### GET `/api/dms/:id/segments`
**Response:** `[{ "id", "start_time", "end_time", "message_count" }]`

---

### GET `/api/dms/:id/segments/:segmentId/messages`
**Response:** Array of message objects

---

### POST `/api/dms/:id/cleanup`
Run retention cleanup.

**Response:** `{ "deleted_count": "number" }`

---

### POST `/api/dms/:id/export`
**Body:** `{ "format?": "json | txt", "date_from?": "ISO8601", "date_to?": "ISO8601" }`

**Response:** `{ "export_path", "status": "pending | complete" }`

---

### GET `/api/dms/:id/exports`
**Response:** `[{ "path", "created_at", "size_bytes", "format" }]`

---

### GET `/api/dms/:id/exports/:exportPath/download`
**Response:** File download (binary)

---

### DELETE `/api/dms/:id/exports/:exportPath`
**Response:** `{ "success": true }`

---

## Friends

All routes require auth.

### GET `/api/friends`
**Response:** `[{ "id", "username", "display_name", "avatar_url", "status", "friendship_since" }]`

---

### POST `/api/friends/:userId`
Send friend request.

**Response:** `{ "success": true }`

---

### DELETE `/api/friends/:userId`
Remove friend.

**Response:** `{ "success": true }`

---

### GET `/api/friends/requests`
**Response:** `{ "incoming": [...], "outgoing": [...] }`

---

### POST `/api/friends/requests/:userId/accept`
**Response:** `{ "success": true }`

---

### POST `/api/friends/requests/:userId/reject`
**Response:** `{ "success": true }`

---

## Voice

All routes require auth.

### GET `/api/voice/token`
Get LiveKit token for current voice channel.

**Response:** `{ "token": "string", "server_url": "string" }`

---

### POST `/api/voice/join/:channelId`
Join a voice channel. Checks permissions, user limits, timeouts.

**Response:** `{ "token": "string", "server_url": "string", "channel": { "id", "name" } }`

---

### POST `/api/voice/leave/:channelId`
**Response:** `{ "success": true }`

---

### POST `/api/voice/move-member`
Force-move a member. Requires `MOVE_MEMBERS`.

**Body:** `{ "user_id": "uuid", "channel_id": "uuid" }`

**Response:** `{ "success": true }`

---

### POST `/api/voice/disconnect-member`
Disconnect a member from voice. Server-side cleanup — client does NOT need to emit `voice:leave`.

**Body:** `{ "user_id": "uuid" }`

**Response:** `{ "success": true }`

---

### POST `/api/voice/server-mute`
Requires `MUTE_MEMBERS`.

**Body:** `{ "user_id": "uuid", "muted": "boolean" }`

**Response:** `{ "success": true }`

---

### POST `/api/voice/server-deafen`
Requires `DEAFEN_MEMBERS`.

**Body:** `{ "user_id": "uuid", "deafened": "boolean" }`

**Response:** `{ "success": true }`

---

### POST `/api/voice/move-to-afk`
**Response:** `{ "moved_count": "number" }`

---

### GET `/api/voice/temp-settings`
**Response:** `{ "user_limit?", "bitrate?", "name?" }`

---

### PATCH `/api/voice/temp-settings`
**Body:** `{ "user_limit?", "bitrate?", "name?" }`

**Response:** `{ "success": true }`

---

### POST `/api/voice/cleanup-temp-channels`
Admin: clean up empty temp channels.

**Response:** `{ "cleaned_count": "number" }`

---

### GET `/api/voice/me`
Current user's voice state.

**Response:** `{ "channel_id", "is_muted", "is_deafened", "is_streaming", "joined_at" } | null`

---

### GET `/api/voice/participants`
All voice participants the user can see.

**Response:** `[{ "channel_id", "user_id", "username", "avatar_url", "is_muted", "is_deafened", "is_streaming" }]`

---

## Server (Single-Tenant)

These operate on the single default server. All require auth.

### GET `/api/server`
Get server info. Admins receive a `settings` object including `temp_channel_timeout`.

**Response:** Full server object

---

### PATCH `/api/server`
Update server settings. Requires `MANAGE_SERVER`.

**Body:**
```json
{
  "name?": "string (1-100)",
  "description?": "string (max 500) | null",
  "icon_url?": "url | null",
  "banner_url?": "url | null",
  "motd?": "string (max 2000) | null",
  "motd_enabled?": "boolean",
  "announce_joins?": "boolean",
  "announce_leaves?": "boolean",
  "announce_online?": "boolean",
  "afk_timeout?": "number (60-3600)",
  "afk_channel_id?": "uuid | null",
  "temp_channel_timeout?": "number (30-86400)",
  "welcome_channel_id?": "uuid | null"
}
```

**Response:** Updated server object

---

### GET `/api/server/time`
**Response:** `{ "time": "ISO8601", "timestamp": "number" }`

---

### POST `/api/server/transfer-ownership`
**Body:** `{ "new_owner_id": "uuid" }`

**Response:** `{ "success": true }`

---

### GET `/api/server/settings/avatar-limits`
**Response:** `{ "max_size_bytes", "max_width", "max_height", "allowed_formats": ["string"] }`

---

### PATCH `/api/server/settings/avatar-limits`
Admin only.

**Body:** `{ "max_size_bytes?", "max_width?", "max_height?", "allowed_formats?" }`

**Response:** Updated limits

---

### GET `/api/server/storage`
**Response:** `{ "total_bytes", "used_bytes", "by_type": { "messages", "attachments", "avatars" } }`

---

### GET `/api/server/storage/comprehensive`
**Response:** Extended storage report

---

### GET `/api/server/storage/thresholds`
**Response:** `{ "warning_gb", "critical_gb" }`

---

### POST `/api/server/storage/alerts/check`
**Response:** `{ "status": "ok | warning | critical", "used_gb", "threshold_gb" }`

---

### GET `/api/server/storage/alerts`
**Response:** `[{ "level", "message", "triggered_at" }]`

---

### GET `/api/server/settings/retention`
**Response:** `{ "max_messages?", "max_age_days?", "enabled": "boolean" }`

---

### PATCH `/api/server/settings/retention`
Admin only.

**Body:** `{ "max_messages?": "number | null", "max_age_days?": "number | null", "enabled?": "boolean" }`

**Response:** Updated policy

---

### POST `/api/server/cleanup/run`
Admin: trigger message retention cleanup.

**Response:** `{ "deleted_count": "number" }`

---

### GET `/api/server/cleanup/logs`
**Response:** `[{ "ran_at", "deleted_count", "duration_ms" }]`

---

## Server Popup Config

### GET `/api/server/popup-config`
**Auth:** Yes

**Response:** Popup config object

---

### PUT `/api/server/popup-config`
**Auth:** Yes

**Body:** Popup config object

**Response:** Updated config

---

### GET `/api/server/popup-config/data`
**Auth:** Yes

**Response:** `{ "config", "data" }`

---

## Standalone Shortcuts

Convenience routes that operate on the default server (no server ID). All require auth.

| Method | Path | Equivalent |
|--------|------|------------|
| GET | `/api/roles` | `GET /api/servers/:id/roles` |
| POST | `/api/roles` | `POST /api/servers/:id/roles` |
| PATCH | `/api/roles/:roleId` | `PATCH /api/servers/:id/roles/:roleId` |
| DELETE | `/api/roles/:roleId` | `DELETE /api/servers/:id/roles/:roleId` |
| PATCH | `/api/roles/reorder` | `PATCH /api/servers/:id/roles/reorder` |
| GET | `/api/members` | `GET /api/servers/:id/members` |
| PATCH | `/api/members/:userId` | Update member (nickname, etc.) |
| POST | `/api/members/:userId/kick` | Kick member |
| POST | `/api/members/:userId/ban` | Ban member |
| GET | `/api/invites` | List invites |
| POST | `/api/invites` | Create invite |
| DELETE | `/api/invites/:code` | Delete invite |
| POST | `/api/invites/:code/join` | Join via invite |
| GET | `/api/bans` | List bans |
| DELETE | `/api/bans/:userId` | Unban |
| GET | `/api/audit-log` | Audit log |
| GET | `/api/channels` | List channels |
| POST | `/api/channels` | Create channel |

---

## Categories

Operate on the default server. All require auth.

### GET `/api/categories`
**Response:** `[{ "id", "name", "position", "server_id" }]`

---

### POST `/api/categories`
**Body:** `{ "name": "string", "position?": "number" }`

**Response:** Created category object

---

### PATCH `/api/categories/:id`
**Body:** `{ "name?", "position?" }`

**Response:** Updated category object

---

### DELETE `/api/categories/:id`
**Response:** `{ "success": true }`

---

### POST `/api/categories/reorder`
**Body:** `{ "categories": [{ "id", "position" }] }`

**Response:** `{ "success": true }`

---

## Upload

### POST `/api/upload`
**Auth:** Yes

Generic file upload (attachments).

**Content-Type:** `multipart/form-data` — field: `file`

**Response:** `{ "url", "filename", "size", "content_type" }`

---

### POST `/api/upload/image`
**Auth:** Yes

Image upload with optional resizing.

**Content-Type:** `multipart/form-data` — field: `file` (image)

**Response:** `{ "url", "width", "height" }`

---

## Notifications

All routes require auth.

### GET `/api/notifications`
**Query:** `?limit=&before=&type=&unread_only=true|false`

**Response:** `[{ "id", "type", "priority", "data", "is_read", "created_at" }]`

---

### GET `/api/notifications/unread-count`
**Response:** `{ "count": "number" }`

---

### PATCH `/api/notifications/:id/read`
**Response:** `{ "success": true }`

---

### POST `/api/notifications/read-all`
**Response:** `{ "updated_count": "number" }`

---

### DELETE `/api/notifications/:id`
**Response:** `{ "success": true }`

---

## Giphy

All routes require auth.

### GET `/api/giphy/trending`
**Query:** `?limit=&offset=`

**Response:** `[{ "id", "url", "preview_url", "title", "width", "height" }]`

---

### GET `/api/giphy/search`
**Query:** `?q=<string>&limit=&offset=`

**Response:** `[{ "id", "url", "preview_url", "title", "width", "height" }]`

---

## Soundboard

All routes require auth.

### GET `/api/servers/:serverId/soundboard`
**Response:** `[{ "id", "name", "url", "created_by", "created_at" }]`

---

### POST `/api/servers/:serverId/soundboard`
**Content-Type:** `multipart/form-data` — `file` (audio) + `name` (string)

**Response:** `{ "id", "name", "url", "created_at" }`

---

### DELETE `/api/servers/:serverId/soundboard/:soundId`
**Response:** `{ "success": true }`

---

### POST `/api/servers/:serverId/soundboard/:soundId/play`
Play a soundboard sound in voice channel.

**Body:** `{ "channel_id?": "uuid" }` (defaults to user's current voice channel)

**Response:** `{ "success": true }`

---

### GET `/api/servers/:serverId/soundboard/settings`
**Response:** Soundboard settings object

---

### PATCH `/api/servers/:serverId/soundboard/settings`
**Body:** Partial soundboard settings object

**Response:** Updated settings

---

## Role Reactions

Self-service role assignment system. Admins configure emoji→role mappings on system-posted messages; users react to assign/remove roles. All routes require auth + `MANAGE_ROLES` permission.

Default role groups (Color, Pronoun, Notification, Region, Platform, Server Access, Personality) are auto-created during server creation. The `/setup` endpoint exists for servers created before this feature.

---

### GET `/api/servers/:serverId/role-reactions`
List all role reaction groups with their mappings.

**Response:**
```json
{
  "groups": [{
    "id": "uuid",
    "server_id": "uuid",
    "channel_id": "uuid",
    "message_id": "uuid | null",
    "name": "string",
    "description": "string | null",
    "position": "number",
    "enabled": "boolean",
    "remove_roles_on_disable": "boolean",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "mappings": [{
      "id": "uuid",
      "group_id": "uuid",
      "role_id": "uuid",
      "role_name": "string",
      "role_color": "string | null",
      "emoji": "string",
      "label": "string | null",
      "position": "number"
    }]
  }]
}
```

---

### POST `/api/servers/:serverId/role-reactions/setup`
Initialize 7 default role groups with pre-created roles and emoji mappings. Fails if groups already exist.

**Body:**
```json
{ "channel_id": "uuid" }
```

**Response:** `{ "groups": [RoleReactionGroup] }`

**Errors:** `400` if groups already exist

---

### POST `/api/servers/:serverId/role-reactions/groups`
Create a new role reaction group.

**Body:**
```json
{
  "name": "string (1-100)",
  "description?": "string (max 500) | null",
  "channel_id": "uuid",
  "position?": "number (min 0)",
  "enabled?": "boolean (default true)",
  "remove_roles_on_disable?": "boolean (default true)"
}
```

**Response:** `{ "group": RoleReactionGroup }`

**Errors:** `409` if name already exists in server

---

### PATCH `/api/servers/:serverId/role-reactions/groups/:groupId`
Update a role reaction group. If `channel_id` changes, the message is moved to the new channel.

**Body:**
```json
{
  "name?": "string (1-100)",
  "description?": "string (max 500) | null",
  "channel_id?": "uuid",
  "position?": "number (min 0)",
  "remove_roles_on_disable?": "boolean"
}
```

**Response:** `{ "group": RoleReactionGroup }`

---

### DELETE `/api/servers/:serverId/role-reactions/groups/:groupId`
Delete a role reaction group. Cascades to mappings and deletes the channel message.

**Query:** `?remove_roles=true` — also strip assigned roles from all members

**Response:** `{ "success": true, "roles_removed": "number" }`

---

### PATCH `/api/servers/:serverId/role-reactions/groups/:groupId/toggle`
Enable or disable a group. Disabling deletes the message; enabling posts a new one.

**Body:**
```json
{
  "enabled": "boolean",
  "remove_roles?": "boolean (overrides group's remove_roles_on_disable)"
}
```

**Response:** `{ "group": RoleReactionGroup, "roles_removed?": "number" }`

**Errors:** `400` if already in requested state

---

### POST `/api/servers/:serverId/role-reactions/groups/:groupId/mappings`
Add an emoji→role mapping to a group.

**Body:**
```json
{
  "emoji": "string (1-32)",
  "role_id": "uuid",
  "label?": "string (max 100) | null"
}
```

**Response:** `{ "mapping": RoleReactionMapping }`

**Errors:** `409` if emoji already used in this group, `404` if role not found

---

### PATCH `/api/servers/:serverId/role-reactions/groups/:groupId/mappings/:mappingId`
Update an existing mapping.

**Body:**
```json
{
  "emoji?": "string (1-32)",
  "role_id?": "uuid",
  "label?": "string (max 100) | null"
}
```

**Response:** `{ "mapping": RoleReactionMapping }`

---

### DELETE `/api/servers/:serverId/role-reactions/groups/:groupId/mappings/:mappingId`
Remove a mapping from a group.

**Response:** `{ "success": true }`

---

### PATCH `/api/servers/:serverId/role-reactions/groups/:groupId/mappings/reorder`
Reorder mappings within a group.

**Body:**
```json
{ "mapping_ids": ["uuid", "uuid", "..."] }
```

**Response:** `{ "mappings": [RoleReactionMapping] }`

---

### GET `/api/servers/:serverId/role-reactions/format-channel/preview`
Preview how many messages would be deleted by formatting.

**Query:** `?channel_id=<uuid>`

**Response:**
```json
{
  "messages_to_delete": "number",
  "groups_to_repost": "number",
  "channel_name": "string"
}
```

---

### POST `/api/servers/:serverId/role-reactions/format-channel`
Delete all non-role-reaction messages from a channel, then repost all enabled groups in order.

**Body:**
```json
{ "channel_id": "uuid" }
```

**Response:**
```json
{
  "messages_deleted": "number",
  "groups_reposted": "number"
}
```

---

### Role Reaction Intercept (automatic)

When a user adds or removes a reaction on a role-reaction message (via `PUT /api/messages/:id/reactions/:emoji` or `DELETE /api/messages/:id/reactions/:emoji`), the server automatically:
- **On react**: Assigns the mapped role to the user (idempotent — `ON CONFLICT DO NOTHING`)
- **On unreact**: Removes the mapped role from the user

No additional API calls needed. The server emits `member.update` with updated roles after assignment/removal.

---

## Activity / Rich Presence

Set and broadcast the user's current activity (e.g., "Playing Valorant"). Activity auto-clears after 15 minutes of no heartbeat (server-side pg_cron).

All data is encrypted in transit via the global ECDH + AES-256-GCM encryption layer. The client should encrypt activity data before sending; the server decrypts, stores, and re-encrypts when broadcasting to other users.

---

### PATCH `/api/users/me/activity`
**Auth:** Yes

Set current activity. Broadcasts `activity.update` to all servers the user belongs to.

**Body:**
```json
{
  "type": "playing | listening | watching | streaming | competing | custom",
  "name": "string (1-128)",
  "details?": "string (max 128) | null",
  "state?": "string (max 128) | null",
  "started_at?": "ISO8601 | null",
  "large_image_url?": "url | null",
  "small_image_url?": "url | null"
}
```

**Response:** `{ "success": true }`

---

### DELETE `/api/users/me/activity`
**Auth:** Yes

Clear current activity. Broadcasts `activity.update` with `null` activity.

**Response:** `{ "success": true }`

---

## Keybinds

Sync keybind settings across devices. Stored as JSONB on `user_settings`. The client is responsible for interpreting keybind strings — the server just stores and returns them.

All keybind data is encrypted in transit.

---

### GET `/api/users/me/keybinds`
**Auth:** Yes

**Response:**
```json
{
  "keybinds": {
    "toggle_mute": "Ctrl+Shift+M",
    "toggle_deafen": "Ctrl+Shift+D",
    "push_to_talk": "V"
  }
}
```

Returns `{ "keybinds": {} }` if no keybinds configured.

---

### PATCH `/api/users/me/keybinds`
**Auth:** Yes

Merge-updates keybinds (existing keys are preserved, provided keys are overwritten).

**Body:** Object of `{ "action_name": "key_combo" }` pairs. Max 50 chars per key/value.
```json
{ "toggle_mute": "Ctrl+M", "push_to_talk": "CapsLock" }
```

**Response:**
```json
{ "keybinds": { "...merged result..." } }
```

---

## Channel Notification Settings

Per-channel notification overrides for the current user. These let users mute specific channels, set mentions-only mode, or suppress @everyone/@role pings per channel.

All notification settings are encrypted in transit.

---

### GET `/api/channels/notification-settings`
**Auth:** Yes

Bulk fetch all channel notification overrides for the current user. Call on app startup.

**Response:**
```json
[{
  "channel_id": "uuid",
  "level": "all | mentions | none | default",
  "suppress_everyone": "boolean",
  "suppress_roles": "boolean"
}]
```

---

### GET `/api/channels/:id/notification-settings`
**Auth:** Yes

Get notification override for a specific channel.

**Response:**
```json
{
  "level": "all | mentions | none | default",
  "suppress_everyone": "boolean",
  "suppress_roles": "boolean"
}
```

Returns `{ "level": "default", "suppress_everyone": false, "suppress_roles": false }` if no override set.

---

### PATCH `/api/channels/:id/notification-settings`
**Auth:** Yes

Set or update notification override for a channel. Uses UPSERT.

**Body:**
```json
{
  "level": "all | mentions | none | default",
  "suppress_everyone?": "boolean",
  "suppress_roles?": "boolean"
}
```

**Response:** Updated settings object

---

### DELETE `/api/channels/:id/notification-settings`
**Auth:** Yes

Remove notification override (revert to server defaults).

**Response:** `{ "success": true }`

---

## Releases

Desktop app update check system. The `/releases/latest` endpoint is unauthenticated so the app can check for updates before login. Admin endpoints require server owner.

All payloads encrypted in transit (except `/releases/latest` which is public).

---

### GET `/api/releases/latest`
**Auth:** No

Get the latest release for a platform. The client should call this on startup to check for updates.

**Query:** `?platform=windows` (default: `windows`, options: `windows`, `mac`, `linux`, `all`)

**Response:**
```json
{
  "id": "uuid",
  "version": "1.2.3",
  "platform": "windows",
  "download_url": "https://...",
  "changelog": "string | null",
  "required": "boolean",
  "published_at": "ISO8601"
}
```

If `required` is `true`, the client should force the update before allowing use.

Returns `404` if no release exists for the platform.

---

### GET `/api/releases`
**Auth:** Yes (admin/owner only)

List all releases.

**Query:** `?limit=50` (max 100)

**Response:** `{ "releases": [Release] }`

---

### POST `/api/releases`
**Auth:** Yes (admin/owner only)

Create a new release.

**Body:**
```json
{
  "version": "string (1-20)",
  "platform?": "windows | mac | linux | all (default: windows)",
  "download_url": "url",
  "changelog?": "string (max 5000) | null",
  "required?": "boolean (default: false)"
}
```

**Response:** Created release object

---

### DELETE `/api/releases/:id`
**Auth:** Yes (admin/owner only)

**Response:** `{ "success": true }`

---

## Crash Reports

Automated crash reporting. The POST endpoint accepts optional auth so crash reports can be submitted even when the user isn't logged in (e.g., during login crashes). All data is encrypted in transit.

**Privacy:** Stack traces and metadata should be sanitized client-side before submission — strip file paths, user data, and credentials. The server stores reports as-is.

---

### POST `/api/crash-reports`
**Auth:** Optional (uses `optionalAuth` — includes user_id if authenticated, NULL otherwise)

**Body:**
```json
{
  "version": "string (1-20)",
  "platform": "string (1-20)",
  "error_type?": "string (max 100)",
  "error_message?": "string (max 1000)",
  "stack_trace?": "string (max 10000)",
  "metadata?": "object (arbitrary JSON)"
}
```

**Response:** `{ "success": true, "id": "uuid" }`

---

### GET `/api/crash-reports`
**Auth:** Yes (admin/owner only)

**Query:** `?limit=50&platform=windows&version=1.2.3` (max 100)

**Response:** `{ "reports": [CrashReport] }`

---

## Gateway / Events

SSE fallback and sequence management.

### GET `/api/events/stream`
**Auth:** Yes

**Headers:** `Accept: text/event-stream`

**Response:** SSE stream of `EventEnvelope` objects

---

### GET `/api/events/resync`
**Auth:** Yes

Replay missed events for reconnection recovery.

**Query:** `?resource_id=<string>&last_sequence=<number>&limit=<number>`

**Response:** `{ "events": [EventEnvelope], "current_sequence": "number" }`

---

### GET `/api/events/sequence`
**Auth:** Yes

Get current sequence numbers.

**Query:** `?resource_id=<string>` or `?resource_ids=<csv>`

**Response:** `{ "sequences": { "<resource_id>": "number" } }`

---

---

# Socket.IO Events

**Transport**: WebSocket via Socket.IO

**Connection**: Pass JWT in handshake auth:
```json
{ "auth": { "token": "<accessToken>", "cryptoSessionId": "<sessionId (optional)>" } }
```

**Encryption**: If `cryptoSessionId` is provided, all payloads are AES-256-GCM encrypted/decrypted transparently.

**Heartbeat**: Client must send `gateway.heartbeat` every 30s. Server disconnects after 45s of silence.

---

## Socket.IO — Client → Server

### `gateway.heartbeat`
Keep connection alive. Sent every 30s.

**Payload:** none

**Server responds:** `gateway.heartbeat_ack`

---

### `gateway.resume`
Resume previous session after brief disconnect.

**Payload:**
```json
{
  "session_id": "string",
  "last_sequences": { "<resource_id>": "number" }
}
```

**Server responds:** `gateway.resumed` or `gateway.resume_failed`

---

### `message:send`
Send channel message.

**Rate limit:** 5 per 5 seconds

**Payload:**
```json
{
  "channel_id": "uuid",
  "content": "string",
  "reply_to_id": "uuid (optional)",
  "idempotency_key": "uuid (optional)"
}
```

**Publishes:** `message.new`

---

### `message:edit`
Edit own message.

**Rate limit:** 5 per 10 seconds

**Payload:**
```json
{ "message_id": "uuid", "content": "string" }
```

**Publishes:** `message.update` or `dm.message.update`

---

### `message:delete`
**Rate limit:** 10 per 10 seconds

**Payload:**
```json
{ "message_id": "uuid" }
```

**Publishes:** `message.delete` or `dm.message.delete`

---

### `typing.start` / `typing:start`
**Rate limit:** 5 per 5 seconds

**Payload:**
```json
{ "channel_id": "uuid" }
```

Auto-stops after 5 seconds.

---

### `typing.stop` / `typing:stop`
**Payload:**
```json
{ "channel_id": "uuid" }
```

---

### `presence:update`
**Rate limit:** 3 per 10 seconds

**Payload:**
```json
{ "status": "online | idle | dnd | offline" }
```

---

### `status_comment:update`
**Rate limit:** 3 per 30 seconds

**Payload:**
```json
{
  "text": "string | null (max 128)",
  "emoji": "string | null",
  "expires_at": "ISO8601 | null"
}
```

---

### `activity:update`
Set current activity / rich presence.

**Rate limit:** 3 per 30 seconds

**Payload:**
```json
{
  "type": "playing | listening | watching | streaming | competing | custom",
  "name": "string (1-128)",
  "details?": "string (max 128) | null",
  "state?": "string (max 128) | null",
  "started_at?": "ISO8601 | null",
  "large_image_url?": "url | null",
  "small_image_url?": "url | null"
}
```

**Publishes:** `activity.update` to all servers the user belongs to

---

### `activity:clear`
Clear current activity.

**Rate limit:** 3 per 30 seconds (shared with `activity:update`)

**Payload:** none

**Publishes:** `activity.update` with `{ user_id, activity: null }`

---

### `voice:join`
Updates mute/deafen state after joining voice (actual join via REST `POST /voice/join/:channelId`).

**Rate limit:** 5 per 30 seconds

**Payload:**
```json
{ "channel_id": "uuid", "muted": "boolean", "deafened": "boolean" }
```

---

### `voice:leave`
**Payload:**
```json
{ "channel_id": "uuid (optional)" }
```

---

### `voice:update`
Toggle mute, deafen, screen share.

**Rate limit:** 10 per 10 seconds

**Payload:**
```json
{ "muted": "boolean", "deafened": "boolean", "screen_sharing": "boolean" }
```

---

### `voice:activity`
Ping to prevent AFK detection.

**Payload:** none

---

### `dm:send`
**Rate limit:** 5 per 5 seconds

**Payload:**
```json
{
  "dm_channel_id": "uuid",
  "content": "string",
  "reply_to_id": "uuid (optional)",
  "idempotency_key": "uuid (optional)"
}
```

---

### `dm:ack`
Acknowledge DM receipt. Updates delivery status to `received`.

**Payload:**
```json
{ "message_ids": ["uuid"] }
```

---

### `dm.typing.start` / `dm:typing:start`
**Rate limit:** 5 per 5 seconds

**Payload:**
```json
{ "user_id": "uuid (recipient)" }
```

---

### `dm.typing.stop` / `dm:typing:stop`
**Payload:**
```json
{ "user_id": "uuid (recipient)" }
```

---

### `join:dm`
Subscribe to a DM channel room.

**Payload:**
```json
{ "user_id": "uuid" }
```

---

### `leave:dm`
Unsubscribe from a DM channel room.

**Payload:**
```json
{ "user_id": "uuid" }
```

---

## Socket.IO — Server → Client

All broadcast events are delivered in two ways:
1. **Generic envelope:** `event` — full `EventEnvelope` with `{ id, type, timestamp, actor_id, resource_id, sequence, payload }`
2. **Named event:** The event type string directly (e.g., `message.new`) with just the payload

Events via `emitEncrypted()` are only emitted as the named event (no envelope wrapper).

---

### Gateway Events

#### `gateway.hello`
Sent immediately on connection.
```json
{ "heartbeat_interval": 30000, "session_id": "uuid" }
```

#### `gateway.ready`
Sent after hello with current state.
```json
{
  "user": { "id", "username", "status" },
  "sequences": { "<resource_id>": "number" },
  "subscriptions": ["server:uuid", "channel:uuid", "dm:uuid", "user:uuid"]
}
```

#### `gateway.heartbeat_ack`
```json
{ "timestamp": "ISO8601" }
```

#### `gateway.resumed`
```json
{
  "session_id": "string",
  "missed_events": ["EventEnvelope"],
  "sequences": { "<resource_id>": "number" },
  "subscriptions": ["..."]
}
```

#### `gateway.resume_failed`
```json
{ "reason": "invalid_session | internal_error", "message": "string" }
```

#### `error`
```json
{ "message": "string", "code": "RATE_LIMITED | DECRYPT_ERROR (optional)" }
```

---

### Message Events

| Event | Room | Payload |
|-------|------|---------|
| `message.new` | `channel:<id>` | Full message object with author |
| `message.update` | `channel:<id>` | Updated message object (or reactions update) |
| `message.delete` | `channel:<id>` | `{ id, channel_id, dm_channel_id: null }` |
| `message.pin` | `channel:<id>` | `{ channel_id, message: {...} }` |
| `message.unpin` | `channel:<id>` | `{ channel_id, message_id, unpinned_by }` |

---

### DM Events

| Event | Room | Payload |
|-------|------|---------|
| `dm.message.new` | `dm:<id>` + `user:<recipientId>` | `{ from_user_id, message: {...} }` |
| `dm.message.update` | `dm:<id>` or `user:<authorId>` | Updated fields or `{ id, status, received_at }` |
| `dm.message.delete` | `dm:<id>` | `{ id, channel_id: null, dm_channel_id }` |
| `dm.typing.start` | `user:<targetId>` | `{ user_id }` |
| `dm.typing.stop` | `user:<targetId>` | `{ user_id }` |

---

### Typing Events

| Event | Room | Payload |
|-------|------|---------|
| `typing.start` | `channel:<id>` | `{ channel_id, user: { id, username, display_name } }` |
| `typing.stop` | `channel:<id>` | `{ channel_id, user_id }` |

---

### Presence Events

| Event | Room | Payload |
|-------|------|---------|
| `presence.update` | `server:<id>` | `{ user_id, status, custom_status?, activity?, last_seen_at? }` |
| `status_comment.update` | `server:<id>` | `{ user_id, text, emoji, expires_at }` |
| `activity.update` | `server:<id>` | `{ user_id, activity: UserActivity \| null }` |

---

### Voice Events

| Event | Room | Payload |
|-------|------|---------|
| `voice.join` | `server:<id>` | `{ channel_id, user: { id, username, display_name, avatar_url }, livekit_token?, custom_join_sound? }` |
| `voice.leave` | `server:<id>` | `{ channel_id, user_id, user?, custom_leave_sound? }` |
| `voice.state_update` | `server:<id>` | `{ channel_id, user_id, is_muted?, is_deafened?, is_streaming?, is_server_muted?, is_server_deafened? }` |
| `voice.force_move` | `user:<targetId>` | `{ from_channel_id, to_channel_id, moved_by?, reason? }` |
| `voice.force_disconnect` | `user:<targetId>` | `{ channel_id, disconnected_by }` |
| `voice.server_mute` | `user:<targetId>` | `{ channel_id, muted, muted_by }` |
| `voice.server_deafen` | `user:<targetId>` | `{ channel_id, deafened, deafened_by }` |

---

### Channel & Category Events

| Event | Room | Payload |
|-------|------|---------|
| `channel.create` | `server:<id>` | `{ channel: {...} }` |
| `channel.update` | `server:<id>` | Updated channel object |
| `channel.delete` | `server:<id>` | `{ id, server_id }` |
| `channels.reorder` | `server:<id>` | Full array of channel objects |
| `channel.permissions.update` | `server:<id>` | `{ channel_id, type: "role|user", target_id }` |
| `channel.permissions.delete` | `server:<id>` | `{ channel_id, type: "role|user", target_id }` |
| `category.create` | `server:<id>` | Category object |
| `category.update` | `server:<id>` | Updated category object |
| `category.delete` | `server:<id>` | `{ id, server_id }` |
| `category.permissions.update` | `server:<id>` | `{ category_id, type: "role", target_id }` |
| `category.permissions.delete` | `server:<id>` | `{ category_id, type: "role", target_id }` |

---

### Server Events

| Event | Room | Payload |
|-------|------|---------|
| `server.update` | `server:<id>` | Updated server object |
| `server.delete` | `server:<id>` | `{ id }` |
| `server.kicked` | `user:<targetId>` | `{ server_id, server_name, reason? }` |
| `server.banned` | `user:<targetId>` | `{ server_id, server_name, reason? }` |
| `server.popup_config.update` | `server:<id>` | Updated popup config |

---

### Member Events

| Event | Room | Payload |
|-------|------|---------|
| `member.join` | `server:<id>` | `{ member: { id, username, display_name, avatar_url, status, joined_at } }` |
| `member.leave` | `server:<id>` | `{ user_id }` |
| `member.role.add` | `server:<id>` | `{ user_id, server_id, role_id, role_name }` |
| `member.role.remove` | `server:<id>` | `{ user_id, server_id, role_id }` |
| `member.roles.update` | `server:<id>` | `{ user_id, server_id, roles: [Role] }` |
| `member.update` | `server:<id>` | `{ user_id, server_id, roles: [Role] }` — emitted on role-reaction assign/remove |
| `member.timeout` | `user:<targetId>` | `{ server_id, server_name, duration, reason? }` |
| `member.timeout.remove` | `user:<targetId>` | `{ server_id }` |
| `member.warn` | `user:<targetId>` | `{ server_id, server_name, reason?, moderator_username }` |

---

### Role Events

| Event | Room | Payload |
|-------|------|---------|
| `role.create` | `server:<id>` | Full role object |
| `role.update` | `server:<id>` | Updated role object |
| `role.delete` | `server:<id>` | `{ id }` |
| `roles.reorder` | `server:<id>` | Full array of role objects |

---

### Notification Events

| Event | Room | Payload |
|-------|------|---------|
| `notification.new` | `user:<id>` | `{ id, user_id, type, data, priority, created_at }` |
| `notification.read` | `user:<id>` | `{ id? }` or `{ all: true }` |

---

### Friend Events

| Event | Room | Payload |
|-------|------|---------|
| `friend.request.new` | `user:<targetId>` | `{ request: { id, from_user_id, from_user: {...}, created_at } }` |
| `friend.request.accepted` | `user:<id>` (both users) | `{ friend: { id, username, display_name, avatar_url, since } }` |
| `friend.request.declined` | `user:<id>` | `{ request_id }` |
| `friend.removed` | `user:<id>` (both users) | `{ user_id }` |

---

### Soundboard Events

| Event | Room | Payload |
|-------|------|---------|
| `soundboard.play` | `server:<id>` | `{ server_id, sound_id, sound_url, played_by }` |
| `soundboard.added` | `server:<id>` | `{ sound: { id, server_id, name, file_url, duration_seconds, file_size_bytes } }` |
| `soundboard.removed` | `server:<id>` | `{ sound_id }` |

---

### User Events

| Event | Room | Payload |
|-------|------|---------|
| `user.block` | `user:<blockedUserId>` | `{ user_id }` (the blocker's ID) |
