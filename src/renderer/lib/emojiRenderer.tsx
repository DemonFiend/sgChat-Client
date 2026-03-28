import React from 'react';
import { Tooltip } from '@mantine/core';
import { useEmojiStore } from '../stores/emojiStore';
import { resolveAssetUrl } from './api';

/**
 * Replace :shortcode: patterns in text with inline custom emoji <img> elements.
 * Reads from emojiStore synchronously via getState().
 * Returns an array of React nodes (strings and img elements).
 */
export function renderCustomEmojis(text: string): (string | React.ReactElement)[] {
  try {
    if (!text || !text.includes(':')) return [text];

    const { manifest } = useEmojiStore.getState();
    if (!manifest?.master_enabled || !manifest.emojis || manifest.emojis.length === 0) return [text];

    const enabledPackIds = new Set(manifest.packs.filter((p) => p.enabled).map((p) => p.id));

    const parts: (string | React.ReactElement)[] = [];
    const regex = /:([a-zA-Z0-9_]{2,32}):/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const shortcode = match[1];
      const emoji = manifest.emojis.find((e) => e.shortcode === shortcode);

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
