import React from 'react';
import { Tooltip } from '@mantine/core';
import { useEmojiStore } from '../stores/emojiStore';
import { resolveAssetUrl } from './api';

/**
 * Common Unicode emoji shortcodes (Discord-style).
 * Maps shortcode (without colons) to the Unicode emoji character.
 */
const UNICODE_SHORTCODES: Record<string, string> = {
  // Smileys & Emotion
  smile: '\u{1F604}', grinning: '\u{1F600}', laughing: '\u{1F606}', satisfied: '\u{1F606}',
  rofl: '\u{1F923}', joy: '\u{1F602}', slightly_smiling_face: '\u{1F642}', upside_down: '\u{1F643}',
  wink: '\u{1F609}', blush: '\u{1F60A}', innocent: '\u{1F607}', heart_eyes: '\u{1F60D}',
  star_struck: '\u{1F929}', kissing_heart: '\u{1F618}', kissing: '\u{1F617}',
  kissing_smiling_eyes: '\u{1F619}', kissing_closed_eyes: '\u{1F61A}',
  yum: '\u{1F60B}', stuck_out_tongue: '\u{1F61B}', stuck_out_tongue_winking_eye: '\u{1F61C}',
  stuck_out_tongue_closed_eyes: '\u{1F61D}', zany_face: '\u{1F92A}',
  money_mouth: '\u{1F911}', hugging: '\u{1F917}', thinking: '\u{1F914}',
  shushing_face: '\u{1F92B}', zipper_mouth: '\u{1F910}', raised_eyebrow: '\u{1F928}',
  neutral_face: '\u{1F610}', expressionless: '\u{1F611}', no_mouth: '\u{1F636}',
  smirk: '\u{1F60F}', unamused: '\u{1F612}', rolling_eyes: '\u{1F644}',
  grimacing: '\u{1F62C}', lying_face: '\u{1F925}', relieved: '\u{1F60C}',
  pensive: '\u{1F614}', sleepy: '\u{1F62A}', drooling_face: '\u{1F924}',
  sleeping: '\u{1F634}', mask: '\u{1F637}', thermometer_face: '\u{1F912}',
  head_bandage: '\u{1F915}', nauseated_face: '\u{1F922}', sneezing_face: '\u{1F927}',
  dizzy_face: '\u{1F635}', cowboy: '\u{1F920}', partying_face: '\u{1F973}',
  sunglasses: '\u{1F60E}', nerd: '\u{1F913}', monocle_face: '\u{1F9D0}',
  confused: '\u{1F615}', worried: '\u{1F61F}', slightly_frowning_face: '\u{1F641}',
  frowning: '\u{2639}\u{FE0F}', open_mouth: '\u{1F62E}', hushed: '\u{1F62F}',
  astonished: '\u{1F632}', flushed: '\u{1F633}', pleading_face: '\u{1F97A}',
  fearful: '\u{1F628}', cold_sweat: '\u{1F630}', disappointed_relieved: '\u{1F625}',
  cry: '\u{1F622}', sob: '\u{1F62D}', scream: '\u{1F631}', confounded: '\u{1F616}',
  persevere: '\u{1F623}', disappointed: '\u{1F61E}', sweat: '\u{1F613}',
  weary: '\u{1F629}', tired_face: '\u{1F62B}', yawning_face: '\u{1F971}',
  triumph: '\u{1F624}', rage: '\u{1F621}', angry: '\u{1F620}', cursing_face: '\u{1F92C}',
  // People & Gestures
  wave: '\u{1F44B}', ok_hand: '\u{1F44C}', thumbsup: '\u{1F44D}', thumbup: '\u{1F44D}',
  '+1': '\u{1F44D}', thumbsdown: '\u{1F44E}', '-1': '\u{1F44E}',
  clap: '\u{1F44F}', handshake: '\u{1F91D}', pray: '\u{1F64F}',
  muscle: '\u{1F4AA}', point_up: '\u{261D}\u{FE0F}', point_down: '\u{1F447}',
  point_left: '\u{1F448}', point_right: '\u{1F449}', middle_finger: '\u{1F595}',
  raised_hand: '\u{270B}', v: '\u{270C}\u{FE0F}', call_me: '\u{1F919}', metal: '\u{1F918}',
  eyes: '\u{1F440}', eye: '\u{1F441}\u{FE0F}', tongue: '\u{1F445}', lips: '\u{1F444}',
  brain: '\u{1F9E0}', skull: '\u{1F480}', skull_crossbones: '\u{2620}\u{FE0F}',
  // Hearts & Symbols
  heart: '\u{2764}\u{FE0F}', orange_heart: '\u{1F9E1}', yellow_heart: '\u{1F49B}',
  green_heart: '\u{1F49A}', blue_heart: '\u{1F499}', purple_heart: '\u{1F49C}',
  black_heart: '\u{1F5A4}', white_heart: '\u{1F90D}', brown_heart: '\u{1F90E}',
  broken_heart: '\u{1F494}', sparkling_heart: '\u{1F496}', heartpulse: '\u{1F497}',
  heartbeat: '\u{1F493}', two_hearts: '\u{1F495}', revolving_hearts: '\u{1F49E}',
  cupid: '\u{1F498}', gift_heart: '\u{1F49D}', heart_exclamation: '\u{2763}\u{FE0F}',
  fire: '\u{1F525}', star: '\u{2B50}', star2: '\u{1F31F}', sparkles: '\u{2728}',
  zap: '\u{26A1}', boom: '\u{1F4A5}', collision: '\u{1F4A5}', sweat_drops: '\u{1F4A6}',
  dash: '\u{1F4A8}', hole: '\u{1F573}\u{FE0F}', bomb: '\u{1F4A3}',
  hundred: '\u{1F4AF}', '100': '\u{1F4AF}',
  speech_balloon: '\u{1F4AC}', thought_balloon: '\u{1F4AD}',
  // Animals & Nature
  dog: '\u{1F436}', cat: '\u{1F431}', mouse: '\u{1F42D}', hamster: '\u{1F439}',
  rabbit: '\u{1F430}', fox: '\u{1F98A}', bear: '\u{1F43B}', panda_face: '\u{1F43C}',
  koala: '\u{1F428}', tiger: '\u{1F42F}', lion_face: '\u{1F981}', cow: '\u{1F42E}',
  pig: '\u{1F437}', frog: '\u{1F438}', monkey_face: '\u{1F435}', chicken: '\u{1F414}',
  penguin: '\u{1F427}', bird: '\u{1F426}', eagle: '\u{1F985}', owl: '\u{1F989}',
  bat: '\u{1F987}', wolf: '\u{1F43A}', bee: '\u{1F41D}', bug: '\u{1F41B}',
  butterfly: '\u{1F98B}', snail: '\u{1F40C}', octopus: '\u{1F419}',
  snake: '\u{1F40D}', turtle: '\u{1F422}', crab: '\u{1F980}', shrimp: '\u{1F990}',
  fish: '\u{1F41F}', dolphin: '\u{1F42C}', whale: '\u{1F433}', shark: '\u{1F988}',
  unicorn: '\u{1F984}', dragon: '\u{1F409}', dragon_face: '\u{1F432}',
  cactus: '\u{1F335}', christmas_tree: '\u{1F384}', evergreen_tree: '\u{1F332}',
  deciduous_tree: '\u{1F333}', palm_tree: '\u{1F334}', seedling: '\u{1F331}',
  herb: '\u{1F33F}', shamrock: '\u{2618}\u{FE0F}', four_leaf_clover: '\u{1F340}',
  maple_leaf: '\u{1F341}', fallen_leaf: '\u{1F342}', mushroom: '\u{1F344}',
  sunflower: '\u{1F33B}', rose: '\u{1F339}', tulip: '\u{1F337}', cherry_blossom: '\u{1F338}',
  bouquet: '\u{1F490}', hibiscus: '\u{1F33A}',
  // Food & Drink
  apple: '\u{1F34E}', green_apple: '\u{1F34F}', banana: '\u{1F34C}', grapes: '\u{1F347}',
  watermelon: '\u{1F349}', strawberry: '\u{1F353}', peach: '\u{1F351}', cherries: '\u{1F352}',
  pineapple: '\u{1F34D}', avocado: '\u{1F951}', pizza: '\u{1F355}', hamburger: '\u{1F354}',
  fries: '\u{1F35F}', hotdog: '\u{1F32D}', taco: '\u{1F32E}', burrito: '\u{1F32F}',
  sushi: '\u{1F363}', ramen: '\u{1F35C}', spaghetti: '\u{1F35D}',
  egg: '\u{1F95A}', pancakes: '\u{1F95E}', cookie: '\u{1F36A}', cake: '\u{1F370}',
  birthday: '\u{1F382}', ice_cream: '\u{1F368}', doughnut: '\u{1F369}',
  chocolate_bar: '\u{1F36B}', candy: '\u{1F36C}', lollipop: '\u{1F36D}',
  coffee: '\u{2615}', tea: '\u{1F375}', beer: '\u{1F37A}', beers: '\u{1F37B}',
  wine_glass: '\u{1F377}', cocktail: '\u{1F378}', tropical_drink: '\u{1F379}',
  champagne: '\u{1F37E}', baby_bottle: '\u{1F37C}',
  // Objects & Activities
  soccer: '\u{26BD}', basketball: '\u{1F3C0}', football: '\u{1F3C8}', baseball: '\u{26BE}',
  tennis: '\u{1F3BE}', volleyball: '\u{1F3D0}', ping_pong: '\u{1F3D3}',
  trophy: '\u{1F3C6}', medal: '\u{1F3C5}', gold_medal: '\u{1F947}',
  video_game: '\u{1F3AE}', joystick: '\u{1F579}\u{FE0F}', dart: '\u{1F3AF}',
  game_die: '\u{1F3B2}', guitar: '\u{1F3B8}', musical_note: '\u{1F3B5}',
  notes: '\u{1F3B6}', microphone: '\u{1F3A4}', headphones: '\u{1F3A7}',
  art: '\u{1F3A8}', film_frames: '\u{1F39E}\u{FE0F}', camera: '\u{1F4F7}',
  computer: '\u{1F4BB}', keyboard: '\u{2328}\u{FE0F}', phone: '\u{1F4F1}',
  telephone: '\u{260E}\u{FE0F}', tv: '\u{1F4FA}', radio: '\u{1F4FB}',
  bulb: '\u{1F4A1}', flashlight: '\u{1F526}', battery: '\u{1F50B}',
  electric_plug: '\u{1F50C}', mag: '\u{1F50D}', mag_right: '\u{1F50E}',
  lock: '\u{1F512}', unlock: '\u{1F513}', key: '\u{1F511}',
  hammer: '\u{1F528}', wrench: '\u{1F527}', gear: '\u{2699}\u{FE0F}', link: '\u{1F517}',
  paperclip: '\u{1F4CE}', scissors: '\u{2702}\u{FE0F}', pencil: '\u{270F}\u{FE0F}',
  pen: '\u{1F58A}\u{FE0F}', book: '\u{1F4D6}', books: '\u{1F4DA}',
  envelope: '\u{2709}\u{FE0F}', email: '\u{1F4E7}', mailbox: '\u{1F4EB}',
  bell: '\u{1F514}', no_bell: '\u{1F515}',
  moneybag: '\u{1F4B0}', dollar: '\u{1F4B5}', credit_card: '\u{1F4B3}',
  clock: '\u{1F570}\u{FE0F}', hourglass: '\u{231B}', stopwatch: '\u{23F1}\u{FE0F}',
  calendar: '\u{1F4C5}', date: '\u{1F4C5}', pushpin: '\u{1F4CC}', pin: '\u{1F4CC}',
  // Flags & Misc
  checkered_flag: '\u{1F3C1}', triangular_flag: '\u{1F6A9}',
  white_check_mark: '\u{2705}', ballot_box_with_check: '\u{2611}\u{FE0F}',
  heavy_check_mark: '\u{2714}\u{FE0F}', x: '\u{274C}', cross_mark: '\u{274C}',
  negative_squared_cross_mark: '\u{274E}',
  question: '\u{2753}', grey_question: '\u{2754}', exclamation: '\u{2757}',
  grey_exclamation: '\u{2755}',
  warning: '\u{26A0}\u{FE0F}', no_entry: '\u{26D4}', prohibited: '\u{1F6AB}',
  recycle: '\u{267B}\u{FE0F}',
  arrow_up: '\u{2B06}\u{FE0F}', arrow_down: '\u{2B07}\u{FE0F}',
  arrow_left: '\u{2B05}\u{FE0F}', arrow_right: '\u{27A1}\u{FE0F}',
  new: '\u{1F195}', sos: '\u{1F198}', cool: '\u{1F192}', free: '\u{1F193}',
  ok: '\u{1F197}', up: '\u{1F199}',
  rainbow: '\u{1F308}', cloud: '\u{2601}\u{FE0F}', sunny: '\u{2600}\u{FE0F}',
  umbrella: '\u{2602}\u{FE0F}', snowflake: '\u{2744}\u{FE0F}', snowman: '\u{26C4}',
  comet: '\u{2604}\u{FE0F}', ocean: '\u{1F30A}', earth_americas: '\u{1F30E}',
  earth_africa: '\u{1F30D}', earth_asia: '\u{1F30F}', globe_with_meridians: '\u{1F310}',
  rocket: '\u{1F680}', airplane: '\u{2708}\u{FE0F}', car: '\u{1F697}',
  taxi: '\u{1F695}', bus: '\u{1F68C}', train: '\u{1F686}', ship: '\u{1F6A2}',
  anchor: '\u{2693}', construction: '\u{1F6A7}', police_car: '\u{1F693}',
  ambulance: '\u{1F691}', fire_engine: '\u{1F692}',
  house: '\u{1F3E0}', office: '\u{1F3E2}', hospital: '\u{1F3E5}', school: '\u{1F3EB}',
  church: '\u{26EA}', tent: '\u{26FA}', stadium: '\u{1F3DF}\u{FE0F}',
  // Celebration
  tada: '\u{1F389}', confetti_ball: '\u{1F38A}', balloon: '\u{1F388}',
  party_popper: '\u{1F389}', gift: '\u{1F381}', ribbon: '\u{1F380}',
  sparkler: '\u{1F387}', fireworks: '\u{1F386}',
  jack_o_lantern: '\u{1F383}', ghost: '\u{1F47B}', alien: '\u{1F47D}',
  robot: '\u{1F916}', poop: '\u{1F4A9}', hankey: '\u{1F4A9}',
  clown: '\u{1F921}', devil: '\u{1F608}', imp: '\u{1F47F}',
  angel: '\u{1F47C}', crown: '\u{1F451}', gem: '\u{1F48E}', ring: '\u{1F48D}',
  zzz: '\u{1F4A4}', dizzy: '\u{1F4AB}', sweat_smile: '\u{1F605}',
  smiley: '\u{1F603}', grin: '\u{1F601}', stuck_out_tongue_winking: '\u{1F61C}',
  stuck_out_tongue_closed: '\u{1F61D}',
  white_frowning_face: '\u{2639}\u{FE0F}', angry_face: '\u{1F620}',
  see_no_evil: '\u{1F648}', hear_no_evil: '\u{1F649}', speak_no_evil: '\u{1F64A}',
  // More common ones
  poop_face: '\u{1F4A9}', money_face: '\u{1F911}', nerd_face: '\u{1F913}',
  cowboy_hat_face: '\u{1F920}', hot_face: '\u{1F975}', cold_face: '\u{1F976}',
  woozy_face: '\u{1F974}', face_with_monocle: '\u{1F9D0}',
  shrug: '\u{1F937}', facepalm: '\u{1F926}',
  thumbs_up: '\u{1F44D}', thumbs_down: '\u{1F44E}',
  raised_hands: '\u{1F64C}', folded_hands: '\u{1F64F}',
  // Misc commonly typed
  pls: '\u{1F97A}', lol: '\u{1F602}', lmao: '\u{1F923}', bruh: '\u{1F611}',
  cap: '\u{1F9E2}', no_cap: '\u{1F645}', sus: '\u{1F928}',
  nap: '\u{1F634}', sob_face: '\u{1F62D}',
};

/**
 * Look up a standard Unicode emoji by shortcode.
 * Returns the emoji character string or undefined if not found.
 */
function lookupUnicodeEmoji(shortcode: string): string | undefined {
  return UNICODE_SHORTCODES[shortcode] ?? UNICODE_SHORTCODES[shortcode.toLowerCase()];
}

/**
 * Replace :shortcode: patterns in text with inline emoji elements.
 *
 * Resolution order:
 * 1. Custom server emoji (from emojiStore manifest) — rendered as <img>
 * 2. Standard Unicode emoji shortcodes (e.g. :smile: -> 😄) — rendered as <span>
 *
 * Reads from emojiStore synchronously via getState().
 * Returns an array of React nodes (strings, img, and span elements).
 */
export function renderCustomEmojis(text: string): (string | React.ReactElement)[] {
  try {
    if (!text || !text.includes(':')) return [text];

    const { manifest } = useEmojiStore.getState();
    const hasManifest = manifest?.master_enabled && manifest.emojis && manifest.emojis.length > 0;
    const enabledPackIds = hasManifest
      ? new Set(manifest!.packs.filter((p) => p.enabled).map((p) => p.id))
      : null;

    const parts: (string | React.ReactElement)[] = [];
    const regex = /:([a-zA-Z0-9_+-]{1,32}):/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const shortcode = match[1];

      // 1. Try custom server emoji first
      let handled = false;
      if (hasManifest && enabledPackIds) {
        const emoji = manifest!.emojis.find((e) => e.shortcode === shortcode);
        if (emoji && enabledPackIds.has(emoji.pack_id)) {
          if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
          }
          const url = resolveAssetUrl(emoji.image_url);
          parts.push(
            <Tooltip
              key={`emoji-${match.index}`}
              label={`:${shortcode}:`}
              position="top"
              withArrow
              openDelay={300}
            >
              <img
                src={url}
                alt={`:${shortcode}:`}
                title={`:${shortcode}:`}
                className="inline-block align-text-bottom"
                style={{ width: '1.375em', height: '1.375em', objectFit: 'contain', margin: '0 1px' }}
                loading="lazy"
              />
            </Tooltip>,
          );
          lastIndex = match.index + match[0].length;
          handled = true;
        }
      }

      // 2. Fall back to standard Unicode emoji shortcodes
      if (!handled) {
        const unicode = lookupUnicodeEmoji(shortcode);
        if (unicode) {
          if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
          }
          parts.push(
            <Tooltip
              key={`uemoji-${match.index}`}
              label={`:${shortcode}:`}
              position="top"
              withArrow
              openDelay={300}
            >
              <span
                role="img"
                aria-label={shortcode}
                style={{ fontSize: '1.375em', lineHeight: 1, verticalAlign: 'text-bottom', margin: '0 1px' }}
              >
                {unicode}
              </span>
            </Tooltip>,
          );
          lastIndex = match.index + match[0].length;
        }
      }
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    if (parts.length === 0) return [text];
    return parts;
  } catch (err) {
    console.error('[EmojiRenderer] Error rendering emojis:', err);
    return [text];
  }
}
