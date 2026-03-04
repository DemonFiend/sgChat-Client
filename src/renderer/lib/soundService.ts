// Sound effects service for voice events
const audioCache = new Map<string, HTMLAudioElement>();
let globalVolume = 0.5;

const SOUND_URLS: Record<string, string> = {
  join: '/sounds/JoinVoice.mp3',
  leave: '/sounds/LeaveVoice.mp3',
  'stream-join': '/sounds/stream-join.mp3',
  'stream-leave': '/sounds/stream-leave.mp3',
  notification: '/sounds/notification.mp3',
};

function getOrCreateAudio(sound: string): HTMLAudioElement | null {
  const url = SOUND_URLS[sound];
  if (!url) return null;

  let audio = audioCache.get(sound);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(sound, audio);
  }
  return audio;
}

export const soundService = {
  play(sound: string) {
    const audio = getOrCreateAudio(sound);
    if (!audio) return;

    // Clone for overlapping playback
    const clone = audio.cloneNode(true) as HTMLAudioElement;
    clone.volume = globalVolume;
    clone.play().catch(() => {});
  },

  playVoiceJoin() {
    this.play('join');
  },

  playVoiceLeave() {
    this.play('leave');
  },

  playNotification() {
    this.play('notification');
  },

  setVolume(volume: number) {
    globalVolume = Math.max(0, Math.min(1, volume));
  },

  getVolume(): number {
    return globalVolume;
  },

  preload() {
    for (const sound of Object.keys(SOUND_URLS)) {
      getOrCreateAudio(sound);
    }
  },
};
