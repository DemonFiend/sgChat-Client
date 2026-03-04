const IMAGE_EXTENSIONS = ['gif', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'ico'];

const IMAGE_HOSTING_DOMAINS = [
  'giphy.com', 'media.giphy.com', 'i.giphy.com',
  'media0.giphy.com', 'media1.giphy.com', 'media2.giphy.com',
  'media3.giphy.com', 'media4.giphy.com',
  'imgur.com', 'i.imgur.com',
  'media.tenor.com', 'c.tenor.com',
  'media.discordapp.net', 'cdn.discordapp.com',
];

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getFileExtension(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function isImageHostingDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return IMAGE_HOSTING_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export function isImageUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes('\n') || trimmed.includes(' ')) return false;
  if (!isValidUrl(trimmed)) return false;

  const extension = getFileExtension(trimmed);
  if (extension && IMAGE_EXTENSIONS.includes(extension)) return true;
  if (isImageHostingDomain(trimmed)) return true;

  return false;
}

export function getImageType(url: string): 'gif' | 'png' | 'jpg' | 'webp' | 'svg' | 'unknown' {
  const extension = getFileExtension(url);
  if (!extension) {
    if (url.includes('giphy') || url.includes('tenor')) return 'gif';
    return 'unknown';
  }
  switch (extension) {
    case 'gif': return 'gif';
    case 'png': return 'png';
    case 'jpg': case 'jpeg': return 'jpg';
    case 'webp': return 'webp';
    case 'svg': return 'svg';
    default: return 'unknown';
  }
}

export function extractImageUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  return matches.filter((match) => isImageUrl(match));
}
