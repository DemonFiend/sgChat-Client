/**
 * Reusable animation presets for sgChat.
 *
 * Usage with Mantine Transition component:
 *   import { TRANSITIONS, DURATIONS, EASINGS } from '../../lib/animations';
 *
 *   <Transition mounted={visible} transition={TRANSITIONS.slideUp} duration={DURATIONS.normal}>
 *     {(styles) => <div style={styles}>...</div>}
 *   </Transition>
 *
 * Usage with inline styles:
 *   import { DURATIONS, EASINGS } from '../../lib/animations';
 *   style={{ transition: `opacity ${DURATIONS.normal}ms ${EASINGS.spring}` }}
 *
 * Inject keyframes once at app startup:
 *   import { injectKeyframes } from '../../lib/animations';
 *   injectKeyframes();
 */

// ---------------------------------------------------------------------------
// Duration constants (ms)
// ---------------------------------------------------------------------------

export const DURATIONS = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ---------------------------------------------------------------------------
// Easing / timing functions
// ---------------------------------------------------------------------------

export const EASINGS = {
  /** Standard ease for most UI transitions */
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Ease-in for exits */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Ease-out for entrances */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Approximated spring curve */
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  /** Snappy overshoot for modals / popovers */
  overshoot: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ---------------------------------------------------------------------------
// Mantine transition preset names
// ---------------------------------------------------------------------------
// These are built-in transition names accepted by Mantine's <Transition>
// component. Re-exported here for convenient, centralised reference.

export const TRANSITIONS = {
  fadeIn: 'fade',
  fadeOut: 'fade',
  slideUp: 'slide-up',
  slideDown: 'slide-down',
  slideLeft: 'slide-left',
  slideRight: 'slide-right',
  scaleIn: 'scale-y',
  scaleOut: 'scale-y',
  pop: 'pop',
  rotate: 'rotate-left',
} as const;

// ---------------------------------------------------------------------------
// CSS keyframe definitions
// ---------------------------------------------------------------------------

const KEYFRAMES = `
@keyframes sgFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes sgFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@keyframes sgSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes sgSlideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes sgSlideLeft {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes sgSlideRight {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes sgScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes sgScaleOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}

@keyframes sgPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}

@keyframes sgShake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-4px); }
  40%      { transform: translateX(4px); }
  60%      { transform: translateX(-2px); }
  80%      { transform: translateX(2px); }
}
`;

// ---------------------------------------------------------------------------
// Animation shorthand helpers
// ---------------------------------------------------------------------------
// Use these as `style={{ animation: ANIMATIONS.fadeIn }}` etc.

export const ANIMATIONS = {
  fadeIn: `sgFadeIn ${DURATIONS.normal}ms ${EASINGS.ease}`,
  fadeOut: `sgFadeOut ${DURATIONS.normal}ms ${EASINGS.ease}`,
  slideUp: `sgSlideUp ${DURATIONS.normal}ms ${EASINGS.easeOut}`,
  slideDown: `sgSlideDown ${DURATIONS.normal}ms ${EASINGS.easeOut}`,
  slideLeft: `sgSlideLeft ${DURATIONS.normal}ms ${EASINGS.easeOut}`,
  slideRight: `sgSlideRight ${DURATIONS.normal}ms ${EASINGS.easeOut}`,
  scaleIn: `sgScaleIn ${DURATIONS.normal}ms ${EASINGS.spring}`,
  scaleOut: `sgScaleOut ${DURATIONS.fast}ms ${EASINGS.easeIn}`,
  pulse: `sgPulse 1.5s ${EASINGS.ease} infinite`,
  shake: `sgShake ${DURATIONS.slow}ms ${EASINGS.ease}`,
} as const;

// ---------------------------------------------------------------------------
// Keyframe injection
// ---------------------------------------------------------------------------

let injected = false;

/** Inject the sgChat keyframe definitions into the document head. Safe to call multiple times. */
export function injectKeyframes(): void {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-sg-animations', '');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  injected = true;
}
