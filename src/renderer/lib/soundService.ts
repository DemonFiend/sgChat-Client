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
    const audio = getOrCreateAudio(sound);
    if (!audio) return;

    audio.volume = globalVolume;
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

  playNotification() {
    this.play('notification');
  },

  /** Play a one-shot sound from an arbitrary URL (e.g. custom join/leave sound). */
  playUrl(url: string) {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.volume = globalVolume;
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

  preload() {
    for (const sound of Object.keys(SOUND_URLS)) {
      getOrCreateAudio(sound);
    }
  },
};
