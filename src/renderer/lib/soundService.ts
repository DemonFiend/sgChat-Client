// Sound effects service for voice events
const audioCache = new Map<string, HTMLAudioElement>();
let globalVolume = 1.0;

const SOUND_URLS: Record<string, string> = {
  join: '/sounds/join.mp3',
  leave: '/sounds/leave.mp3',
  mute: '/sounds/mute.mp3',
  unmute: '/sounds/unmute.mp3',
  deafen: '/sounds/deafen.mp3',
  undeafen: '/sounds/undeafen.mp3',
  disconnect: '/sounds/disconnect.mp3',
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

    audio.volume = globalVolume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
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
