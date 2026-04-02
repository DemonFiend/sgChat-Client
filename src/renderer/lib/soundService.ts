// Sound effects service for voice events
const audioCache = new Map<string, HTMLAudioElement>();
let globalVolume = 0.5;

// Ringtone state
let ringtoneAudio: HTMLAudioElement | null = null;

// Hold music state (separate from ringtone — can play independently)
let holdMusicAudio: HTMLAudioElement | null = null;

// User settings (loaded from server)
let enableSounds = true;
let enableVoiceJoinSounds = true;
let audioOutputVolume = 100;

const electronAPI = (window as any).electronAPI;

const SOUND_URLS: Record<string, string> = {
  join: '/sounds/JoinVoice.mp3',
  leave: '/sounds/LeaveVoice.mp3',
  'stream-join': '/sounds/stream-join.mp3',
  'stream-leave': '/sounds/stream-leave.mp3',
  notification: '/sounds/notification.mp3',
  ringtone: '/sounds/ringtone.mp3',
  holdMusic: '/sounds/HoldMusic.mp3',
};

function getOrCreateAudio(sound: string): HTMLAudioElement | null {
  const url = SOUND_URLS[sound];
  if (!url) return null;

  let audio = audioCache.get(sound);
  if (!audio) {
    audio = document.createElement('audio');
    audio.src = url;
    audio.preload = 'auto';
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioCache.set(sound, audio);
  }
  return audio;
}

export const soundService = {
  play(sound: string) {
    // Respect global sound toggle
    if (!enableSounds) return;
    // Respect voice join/leave sound toggle
    if (!enableVoiceJoinSounds && (sound === 'join' || sound === 'leave' || sound === 'stream-join' || sound === 'stream-leave')) return;

    const audio = getOrCreateAudio(sound);
    if (!audio) return;

    const effectiveVolume = globalVolume * (audioOutputVolume / 100);
    audio.volume = Math.max(0, Math.min(1, effectiveVolume));
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn(`[soundService] Failed to play "${sound}":`, err.message);
    });
  },

  playVoiceJoin() {
    this.play('join');
  },

  playVoiceLeave() {
    this.play('leave');
  },

  playStreamJoin() {
    this.play('stream-join');
  },

  playStreamLeave() {
    this.play('stream-leave');
  },

  playNotification() {
    this.play('notification');
  },

  playRingtone(volume?: number) {
    this.stopRingtone();
    const audio = document.createElement('audio');
    audio.src = SOUND_URLS.ringtone || '/sounds/ringtone.mp3';
    audio.loop = true;
    audio.volume = volume ?? 0.35;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audio.play().catch((err) => {
      console.warn('[soundService] Failed to play ringtone:', err.message);
    });
    ringtoneAudio = audio;
  },

  stopRingtone() {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.remove();
      ringtoneAudio = null;
    }
  },

  playHoldMusic() {
    this.stopHoldMusic();
    const audio = getOrCreateAudio('holdMusic');
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0.15;
    audio.currentTime = 0;
    holdMusicAudio = audio;

    // If audio is already loaded, play immediately; otherwise wait for it
    if (audio.readyState >= 2) {
      audio.play().catch((err) => {
        console.warn('[soundService] Failed to play hold music:', err.message);
      });
    } else {
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        // Only play if we haven't been stopped in the meantime
        if (holdMusicAudio === audio) {
          audio.play().catch((err) => {
            console.warn('[soundService] Failed to play hold music:', err.message);
          });
        }
      };
      audio.addEventListener('canplay', onCanPlay);
      // Force reload if stale
      audio.load();
    }
  },

  stopHoldMusic() {
    if (holdMusicAudio) {
      holdMusicAudio.pause();
      holdMusicAudio.loop = false;
      holdMusicAudio.currentTime = 0;
      // Don't remove — it's cached by getOrCreateAudio for reuse
      holdMusicAudio = null;
    }
  },

  /** Play a one-shot sound from an arbitrary URL (e.g. custom join/leave sound). */
  playUrl(url: string) {
    if (!enableSounds) return;
    const audio = document.createElement('audio');
    audio.src = url;
    const effectiveVolume = globalVolume * (audioOutputVolume / 100);
    audio.volume = Math.max(0, Math.min(1, effectiveVolume));
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audio.play().catch((err) => {
      console.warn(`[soundService] Failed to play URL "${url}":`, err.message);
    });
    audio.addEventListener('ended', () => audio.remove(), { once: true });
    audio.addEventListener('error', () => audio.remove(), { once: true });
  },

  setVolume(volume: number) {
    globalVolume = Math.max(0, Math.min(1, volume));
  },

  getVolume(): number {
    return globalVolume;
  },

  /** Load user sound settings from server */
  async loadSettings(): Promise<void> {
    try {
      const settings = await electronAPI.api.request('GET', '/api/users/me/settings');
      if (settings?.ok && settings.data) {
        const data = settings.data;
        if (typeof data.enable_sounds === 'boolean') enableSounds = data.enable_sounds;
        if (typeof data.enable_voice_join_sounds === 'boolean') enableVoiceJoinSounds = data.enable_voice_join_sounds;
        if (typeof data.audio_output_volume === 'number') audioOutputVolume = data.audio_output_volume;
      }
    } catch (err) {
      console.warn('[soundService] Failed to load settings:', err);
    }
  },

  /** Update settings (call when user changes settings) */
  updateSettings(settings: { enableSounds?: boolean; enableVoiceJoinSounds?: boolean; audioOutputVolume?: number }) {
    if (typeof settings.enableSounds === 'boolean') enableSounds = settings.enableSounds;
    if (typeof settings.enableVoiceJoinSounds === 'boolean') enableVoiceJoinSounds = settings.enableVoiceJoinSounds;
    if (typeof settings.audioOutputVolume === 'number') audioOutputVolume = settings.audioOutputVolume;
  },

  getSettings() {
    return { enableSounds, enableVoiceJoinSounds, audioOutputVolume };
  },

  preload() {
    for (const sound of Object.keys(SOUND_URLS)) {
      getOrCreateAudio(sound);
    }
  },
};
