export interface Role {
  id: string;
  name: string;
  color?: string | null;
  position: number;
  hoist?: boolean;
  is_hoisted?: boolean;
  is_mentionable?: boolean;
  server_permissions?: string;
  text_permissions?: string;
  voice_permissions?: string;
}

export interface Member {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  roles?: { id: string; name: string; color?: string | null; position: number }[];
  joined_at?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  position: number;
  category_id?: string;
  topic?: string;
}

export interface Invite {
  code: string;
  uses: number;
  max_uses?: number;
  expires_at?: string;
  created_by?: { id: string; username: string };
  created_at: string;
}

export interface Ban {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  reason?: string;
  banned_at: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  user_id: string | null;
  actor_username: string | null;
  target_type?: string;
  target_id?: string;
  changes?: Record<string, any>;
  reason?: string;
  created_at: string;
}

export interface SoundboardSound {
  id: string;
  name: string;
  url: string;
  server_id: string;
  created_by: string;
  created_at: string;
}

// Full permission definitions matching server shared/permissions/index.ts
export const ROLE_PERMISSIONS = {
  server: [
    { key: 'ADMINISTRATOR', label: 'Administrator', description: 'Full access — bypasses all checks', bit: 0 },
    { key: 'MANAGE_SERVER', label: 'Manage Server', description: 'Edit server settings', bit: 1 },
    { key: 'MANAGE_CHANNELS', label: 'Manage Channels', description: 'Create, edit, delete channels', bit: 2 },
    { key: 'MANAGE_ROLES', label: 'Manage Roles', description: 'Create, edit, delete roles', bit: 3 },
    { key: 'MANAGE_CATEGORIES', label: 'Manage Categories', description: 'Create, edit, delete categories', bit: 4 },
    { key: 'KICK_MEMBERS', label: 'Kick Members', description: 'Remove members from the server', bit: 5 },
    { key: 'BAN_MEMBERS', label: 'Ban Members', description: 'Permanently ban members', bit: 6 },
    { key: 'TIMEOUT_MEMBERS', label: 'Timeout Members', description: 'Temporarily restrict members', bit: 7 },
    { key: 'MANAGE_NICKNAMES', label: 'Manage Nicknames', description: "Change other members' nicknames", bit: 8 },
    { key: 'CREATE_INVITES', label: 'Create Invites', description: 'Create invite links', bit: 9 },
    { key: 'MANAGE_INVITES', label: 'Manage Invites', description: 'View and delete invite links', bit: 10 },
    { key: 'CHANGE_NICKNAME', label: 'Change Nickname', description: 'Change own nickname', bit: 11 },
    { key: 'VIEW_AUDIT_LOG', label: 'View Audit Log', description: 'View the server audit log', bit: 12 },
    { key: 'VIEW_SERVER_INSIGHTS', label: 'View Insights', description: 'View server analytics', bit: 13 },
    { key: 'MANAGE_EMOJIS', label: 'Manage Emojis', description: 'Create, edit, delete custom emojis', bit: 14 },
    { key: 'MANAGE_STICKERS', label: 'Manage Stickers', description: 'Create, edit, delete stickers', bit: 15 },
    { key: 'MANAGE_EXPRESSIONS', label: 'Manage Expressions', description: 'Manage all expressions', bit: 16 },
    { key: 'MANAGE_WEBHOOKS', label: 'Manage Webhooks', description: 'Create, edit, delete webhooks', bit: 17 },
    { key: 'CREATE_EVENTS', label: 'Create Events', description: 'Create server events', bit: 18 },
    { key: 'MANAGE_EVENTS', label: 'Manage Events', description: 'Edit and delete server events', bit: 19 },
    { key: 'MANAGE_THREADS', label: 'Manage Threads', description: 'Manage all threads', bit: 20 },
    { key: 'CREATE_PUBLIC_THREADS', label: 'Create Public Threads', description: 'Create public threads', bit: 21 },
    { key: 'CREATE_PRIVATE_THREADS', label: 'Create Private Threads', description: 'Create private threads', bit: 22 },
    { key: 'VIEW_SERVER_MEMBERS', label: 'View Members', description: 'View the member list', bit: 23 },
    { key: 'MODERATE_MEMBERS', label: 'Moderate Members', description: 'Auto-moderation and member screening', bit: 24 },
  ],
  text: [
    { key: 'VIEW_CHANNEL', label: 'View Channel', description: 'See the channel in the list', bit: 0 },
    { key: 'SEND_MESSAGES', label: 'Send Messages', description: 'Send messages in channels', bit: 1 },
    { key: 'SEND_TTS_MESSAGES', label: 'Send TTS', description: 'Send text-to-speech messages', bit: 2 },
    { key: 'READ_MESSAGE_HISTORY', label: 'Read History', description: 'Read past messages', bit: 3 },
    { key: 'EMBED_LINKS', label: 'Embed Links', description: 'Post links with previews', bit: 4 },
    { key: 'ATTACH_FILES', label: 'Attach Files', description: 'Upload files and images', bit: 5 },
    { key: 'USE_EXTERNAL_EMOJIS', label: 'External Emojis', description: 'Use emojis from other servers', bit: 6 },
    { key: 'USE_EXTERNAL_STICKERS', label: 'External Stickers', description: 'Use stickers from other servers', bit: 7 },
    { key: 'ADD_REACTIONS', label: 'Add Reactions', description: 'React to messages', bit: 8 },
    { key: 'MENTION_EVERYONE', label: 'Mention @everyone', description: 'Use @everyone and @here', bit: 9 },
    { key: 'MENTION_ROLES', label: 'Mention Roles', description: 'Mention any role', bit: 10 },
    { key: 'MANAGE_MESSAGES', label: 'Manage Messages', description: "Delete/pin others' messages", bit: 11 },
    { key: 'DELETE_OWN_MESSAGES', label: 'Delete Own Messages', description: 'Delete own messages', bit: 12 },
    { key: 'EDIT_OWN_MESSAGES', label: 'Edit Own Messages', description: 'Edit own messages', bit: 13 },
    { key: 'CREATE_PUBLIC_THREADS', label: 'Create Public Threads', description: 'Create public threads', bit: 14 },
    { key: 'CREATE_PRIVATE_THREADS', label: 'Create Private Threads', description: 'Create private threads', bit: 15 },
    { key: 'SEND_MESSAGES_IN_THREADS', label: 'Send in Threads', description: 'Send messages in threads', bit: 16 },
    { key: 'MANAGE_THREADS', label: 'Manage Threads', description: 'Archive and delete threads', bit: 17 },
    { key: 'USE_APPLICATION_COMMANDS', label: 'App Commands', description: 'Use slash commands', bit: 18 },
    { key: 'MANAGE_WEBHOOKS', label: 'Manage Webhooks', description: 'Manage channel webhooks', bit: 19 },
    { key: 'BYPASS_SLOWMODE', label: 'Bypass Slowmode', description: 'Ignore slowmode restrictions', bit: 20 },
  ],
  voice: [
    { key: 'CONNECT', label: 'Connect', description: 'Join voice channels', bit: 0 },
    { key: 'VIEW_CHANNEL', label: 'View Channel', description: 'See the voice channel', bit: 1 },
    { key: 'SPEAK', label: 'Speak', description: 'Transmit audio', bit: 2 },
    { key: 'VIDEO', label: 'Video', description: 'Share camera', bit: 3 },
    { key: 'STREAM', label: 'Stream', description: 'Screen share', bit: 4 },
    { key: 'USE_VOICE_ACTIVITY', label: 'Voice Activity', description: 'Use voice activity detection', bit: 5 },
    { key: 'PRIORITY_SPEAKER', label: 'Priority Speaker', description: "Lower others' volume when speaking", bit: 6 },
    { key: 'USE_SOUNDBOARD', label: 'Use Soundboard', description: 'Play soundboard sounds', bit: 7 },
    { key: 'USE_EXTERNAL_SOUNDS', label: 'External Sounds', description: 'Use sounds from other servers', bit: 8 },
    { key: 'MUTE_MEMBERS', label: 'Mute Members', description: 'Server mute others', bit: 9 },
    { key: 'DEAFEN_MEMBERS', label: 'Deafen Members', description: 'Server deafen others', bit: 10 },
    { key: 'MOVE_MEMBERS', label: 'Move Members', description: 'Move members between channels', bit: 11 },
    { key: 'DISCONNECT_MEMBERS', label: 'Disconnect Members', description: 'Disconnect from voice', bit: 12 },
    { key: 'REQUEST_TO_SPEAK', label: 'Request to Speak', description: 'Request in stage channels', bit: 13 },
    { key: 'MANAGE_STAGE', label: 'Manage Stage', description: 'Manage stage speakers', bit: 14 },
    { key: 'MANAGE_VOICE_CHANNEL', label: 'Manage Voice Channel', description: 'Edit voice channel settings', bit: 15 },
    { key: 'SET_VOICE_STATUS', label: 'Set Voice Status', description: 'Set a custom voice channel status', bit: 16 },
  ],
} as const;

// ── Access Control Types ─────────────────────────────────────────────

export interface AccessControlSettings {
  signups_disabled: boolean;
  member_approvals_enabled: boolean;
  approvals_skip_for_invited: boolean;
  denial_cooldown_hours: number;
}

export interface IntakeQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  max_length?: number;
  placeholder?: string;
  options?: string[];
}

export interface IntakeFormConfig {
  questions: IntakeQuestion[];
}

export interface Approval {
  id: string;
  user_id: string;
  username: string;
  email?: string;
  avatar_url: string | null;
  user_created_at?: string;
  status: 'pending' | 'approved' | 'denied';
  responses: Record<string, string | boolean>;
  invite_code: string | null;
  denial_reason: string | null;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface BlacklistEntry {
  id: string;
  type: 'email' | 'ip';
  value: string;
  reason: string | null;
  created_by: string | null;
  created_by_username: string | null;
  created_at: string;
}

export function hasBit(perms: string | number | undefined, bit: number): boolean {
  const n = Number(perms || 0);
  return (n & (1 << bit)) !== 0;
}

export function setBit(perms: string | number | undefined, bit: number, on: boolean): number {
  let n = Number(perms || 0);
  if (on) {
    n |= (1 << bit);
  } else {
    n &= ~(1 << bit);
  }
  return n;
}
