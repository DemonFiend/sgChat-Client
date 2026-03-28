/**
 * Static permission metadata definitions grouped into categories.
 * Each permission has a human-readable label, description, and dangerous flag.
 */

export type PermissionCategory = 'general' | 'membership' | 'text' | 'voice' | 'advanced';

export interface PermissionDef {
  key: string;
  bit: number;
  label: string;
  description: string;
  dangerous: boolean;
  category: PermissionCategory;
  /** Which permission bitmask this applies to: server, text, or voice */
  scope: 'server' | 'text' | 'voice';
}

export interface PermissionGroup {
  name: string;
  category: PermissionCategory;
  permissions: PermissionDef[];
}

const SERVER_PERMISSIONS: PermissionDef[] = [
  // General
  { key: 'ADMINISTRATOR', bit: 0, label: 'Administrator', description: 'Full access — bypasses all permission checks', dangerous: true, category: 'general', scope: 'server' },
  { key: 'MANAGE_SERVER', bit: 1, label: 'Manage Server', description: 'Edit server settings, icon, and description', dangerous: true, category: 'general', scope: 'server' },
  { key: 'MANAGE_CHANNELS', bit: 2, label: 'Manage Channels', description: 'Create, edit, and delete channels', dangerous: false, category: 'general', scope: 'server' },
  { key: 'MANAGE_ROLES', bit: 3, label: 'Manage Roles', description: 'Create, edit, and delete roles below yours', dangerous: true, category: 'general', scope: 'server' },
  { key: 'MANAGE_CATEGORIES', bit: 4, label: 'Manage Categories', description: 'Create, edit, and delete categories', dangerous: false, category: 'general', scope: 'server' },
  { key: 'VIEW_AUDIT_LOG', bit: 12, label: 'View Audit Log', description: 'View the server audit log', dangerous: false, category: 'general', scope: 'server' },
  { key: 'VIEW_SERVER_INSIGHTS', bit: 13, label: 'View Insights', description: 'View server analytics and statistics', dangerous: false, category: 'general', scope: 'server' },

  // Membership
  { key: 'KICK_MEMBERS', bit: 5, label: 'Kick Members', description: 'Remove members from the server', dangerous: true, category: 'membership', scope: 'server' },
  { key: 'BAN_MEMBERS', bit: 6, label: 'Ban Members', description: 'Permanently ban members from the server', dangerous: true, category: 'membership', scope: 'server' },
  { key: 'TIMEOUT_MEMBERS', bit: 7, label: 'Timeout Members', description: 'Temporarily restrict member actions', dangerous: true, category: 'membership', scope: 'server' },
  { key: 'MANAGE_NICKNAMES', bit: 8, label: 'Manage Nicknames', description: "Change other members' nicknames", dangerous: false, category: 'membership', scope: 'server' },
  { key: 'CHANGE_NICKNAME', bit: 11, label: 'Change Nickname', description: 'Change your own nickname', dangerous: false, category: 'membership', scope: 'server' },
  { key: 'CREATE_INVITES', bit: 9, label: 'Create Invites', description: 'Create server invite links', dangerous: false, category: 'membership', scope: 'server' },
  { key: 'MANAGE_INVITES', bit: 10, label: 'Manage Invites', description: 'View and revoke invite links', dangerous: false, category: 'membership', scope: 'server' },
  { key: 'VIEW_SERVER_MEMBERS', bit: 23, label: 'View Members', description: 'View the server member list', dangerous: false, category: 'membership', scope: 'server' },
  { key: 'MODERATE_MEMBERS', bit: 24, label: 'Moderate Members', description: 'Auto-moderation and member screening', dangerous: true, category: 'membership', scope: 'server' },

  // Advanced (server-level)
  { key: 'MANAGE_EMOJIS', bit: 14, label: 'Manage Emojis', description: 'Create, edit, and delete custom emojis', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'MANAGE_STICKERS', bit: 15, label: 'Manage Stickers', description: 'Create, edit, and delete stickers', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'MANAGE_EXPRESSIONS', bit: 16, label: 'Manage Expressions', description: 'Manage all server expressions', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'MANAGE_WEBHOOKS', bit: 17, label: 'Manage Webhooks', description: 'Create, edit, and delete webhooks', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'CREATE_EVENTS', bit: 18, label: 'Create Events', description: 'Create server events', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'MANAGE_EVENTS', bit: 19, label: 'Manage Events', description: 'Edit and delete server events', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'MANAGE_THREADS', bit: 20, label: 'Manage Threads', description: 'Manage all threads', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'CREATE_PUBLIC_THREADS', bit: 21, label: 'Create Public Threads', description: 'Create public discussion threads', dangerous: false, category: 'advanced', scope: 'server' },
  { key: 'CREATE_PRIVATE_THREADS', bit: 22, label: 'Create Private Threads', description: 'Create private threads', dangerous: false, category: 'advanced', scope: 'server' },
];

const TEXT_PERMISSIONS: PermissionDef[] = [
  { key: 'VIEW_CHANNEL', bit: 0, label: 'View Channel', description: 'See the channel in the sidebar', dangerous: false, category: 'text', scope: 'text' },
  { key: 'SEND_MESSAGES', bit: 1, label: 'Send Messages', description: 'Send messages in text channels', dangerous: false, category: 'text', scope: 'text' },
  { key: 'SEND_TTS_MESSAGES', bit: 2, label: 'Send TTS', description: 'Send text-to-speech messages', dangerous: false, category: 'text', scope: 'text' },
  { key: 'READ_MESSAGE_HISTORY', bit: 3, label: 'Read History', description: 'Read past messages in the channel', dangerous: false, category: 'text', scope: 'text' },
  { key: 'EMBED_LINKS', bit: 4, label: 'Embed Links', description: 'Post links that show rich previews', dangerous: false, category: 'text', scope: 'text' },
  { key: 'ATTACH_FILES', bit: 5, label: 'Attach Files', description: 'Upload files, images, and media', dangerous: false, category: 'text', scope: 'text' },
  { key: 'USE_EXTERNAL_EMOJIS', bit: 6, label: 'External Emojis', description: 'Use emojis from other servers', dangerous: false, category: 'text', scope: 'text' },
  { key: 'USE_EXTERNAL_STICKERS', bit: 7, label: 'External Stickers', description: 'Use stickers from other servers', dangerous: false, category: 'text', scope: 'text' },
  { key: 'ADD_REACTIONS', bit: 8, label: 'Add Reactions', description: 'React to messages with emojis', dangerous: false, category: 'text', scope: 'text' },
  { key: 'MENTION_EVERYONE', bit: 9, label: 'Mention @everyone', description: 'Use @everyone and @here mentions', dangerous: true, category: 'text', scope: 'text' },
  { key: 'MENTION_ROLES', bit: 10, label: 'Mention Roles', description: 'Mention any role in messages', dangerous: false, category: 'text', scope: 'text' },
  { key: 'MANAGE_MESSAGES', bit: 11, label: 'Manage Messages', description: "Delete or pin others' messages", dangerous: true, category: 'text', scope: 'text' },
  { key: 'DELETE_OWN_MESSAGES', bit: 12, label: 'Delete Own Messages', description: 'Delete your own messages', dangerous: false, category: 'text', scope: 'text' },
  { key: 'EDIT_OWN_MESSAGES', bit: 13, label: 'Edit Own Messages', description: 'Edit your own messages', dangerous: false, category: 'text', scope: 'text' },
  { key: 'CREATE_PUBLIC_THREADS_TEXT', bit: 14, label: 'Create Public Threads', description: 'Create public threads in text channels', dangerous: false, category: 'text', scope: 'text' },
  { key: 'CREATE_PRIVATE_THREADS_TEXT', bit: 15, label: 'Create Private Threads', description: 'Create private threads', dangerous: false, category: 'text', scope: 'text' },
  { key: 'SEND_MESSAGES_IN_THREADS', bit: 16, label: 'Send in Threads', description: 'Send messages inside threads', dangerous: false, category: 'text', scope: 'text' },
  { key: 'MANAGE_THREADS_TEXT', bit: 17, label: 'Manage Threads', description: 'Archive and delete threads', dangerous: false, category: 'text', scope: 'text' },
  { key: 'USE_APPLICATION_COMMANDS', bit: 18, label: 'App Commands', description: 'Use slash commands and integrations', dangerous: false, category: 'text', scope: 'text' },
  { key: 'MANAGE_WEBHOOKS_TEXT', bit: 19, label: 'Manage Webhooks', description: 'Manage channel-specific webhooks', dangerous: false, category: 'text', scope: 'text' },
  { key: 'BYPASS_SLOWMODE', bit: 20, label: 'Bypass Slowmode', description: 'Ignore slowmode channel restrictions', dangerous: false, category: 'text', scope: 'text' },
];

const VOICE_PERMISSIONS: PermissionDef[] = [
  { key: 'CONNECT', bit: 0, label: 'Connect', description: 'Join voice channels', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'VIEW_VOICE_CHANNEL', bit: 1, label: 'View Channel', description: 'See the voice channel in the sidebar', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'SPEAK', bit: 2, label: 'Speak', description: 'Transmit audio in voice channels', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'VIDEO', bit: 3, label: 'Video', description: 'Share camera in voice channels', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'STREAM', bit: 4, label: 'Stream', description: 'Screen share in voice channels', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'USE_VOICE_ACTIVITY', bit: 5, label: 'Voice Activity', description: 'Use voice activity detection (vs push-to-talk)', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'PRIORITY_SPEAKER', bit: 6, label: 'Priority Speaker', description: "Lower others' volume when speaking", dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'USE_SOUNDBOARD', bit: 7, label: 'Use Soundboard', description: 'Play soundboard sounds in voice', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'USE_EXTERNAL_SOUNDS', bit: 8, label: 'External Sounds', description: 'Use sounds from other servers', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'MUTE_MEMBERS', bit: 9, label: 'Mute Members', description: 'Server mute other members', dangerous: true, category: 'voice', scope: 'voice' },
  { key: 'DEAFEN_MEMBERS', bit: 10, label: 'Deafen Members', description: 'Server deafen other members', dangerous: true, category: 'voice', scope: 'voice' },
  { key: 'MOVE_MEMBERS', bit: 11, label: 'Move Members', description: 'Move members between voice channels', dangerous: true, category: 'voice', scope: 'voice' },
  { key: 'DISCONNECT_MEMBERS', bit: 12, label: 'Disconnect Members', description: 'Disconnect members from voice', dangerous: true, category: 'voice', scope: 'voice' },
  { key: 'REQUEST_TO_SPEAK', bit: 13, label: 'Request to Speak', description: 'Request to speak in stage channels', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'MANAGE_STAGE', bit: 14, label: 'Manage Stage', description: 'Manage stage channel speakers', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'MANAGE_VOICE_CHANNEL', bit: 15, label: 'Manage Voice Channel', description: 'Edit voice channel settings', dangerous: false, category: 'voice', scope: 'voice' },
  { key: 'SET_VOICE_STATUS', bit: 16, label: 'Set Voice Status', description: 'Set a custom voice channel status', dangerous: false, category: 'voice', scope: 'voice' },
];

/** All permissions flat list */
export const ALL_PERMISSIONS: PermissionDef[] = [
  ...SERVER_PERMISSIONS,
  ...TEXT_PERMISSIONS,
  ...VOICE_PERMISSIONS,
];

/** Set of permission keys that are dangerous */
export const DANGEROUS_PERM_KEYS = new Set(
  ALL_PERMISSIONS.filter((p) => p.dangerous).map((p) => p.key),
);

/** Build grouped permission list for the role editor UI */
export function buildPermissionGroups(): PermissionGroup[] {
  const groupMap: Record<PermissionCategory, PermissionDef[]> = {
    general: [],
    membership: [],
    text: [],
    voice: [],
    advanced: [],
  };

  for (const perm of ALL_PERMISSIONS) {
    groupMap[perm.category].push(perm);
  }

  const groups: PermissionGroup[] = [
    { name: 'General', category: 'general', permissions: groupMap.general },
    { name: 'Membership', category: 'membership', permissions: groupMap.membership },
    { name: 'Text Channels', category: 'text', permissions: groupMap.text },
    { name: 'Voice Channels', category: 'voice', permissions: groupMap.voice },
    { name: 'Advanced', category: 'advanced', permissions: groupMap.advanced },
  ];

  return groups.filter((g) => g.permissions.length > 0);
}

export const PERMISSION_GROUPS = buildPermissionGroups();
