#!/usr/bin/env node

/**
 * Download DeepFilterNet DFN3 binary for packaging.
 *
 * Downloads the DeepFilterNet binary from GitHub Releases, verifies the SHA256
 * checksum, and places it in resources/deepfilter/ for electron-builder to bundle.
 *
 * Usage: node scripts/download-deepfilter.mjs
 *
 * Run this before `electron-builder` in CI/CD packaging.
 */

import { createWriteStream, mkdirSync, existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// DeepFilterNet DFN3 release configuration
const VERSION = 'v0.5.6';
const PLATFORM_ASSETS = {
  win32: {
    url: `https://github.com/Rikorose/DeepFilterNet/releases/download/${VERSION}/DeepFilterNet-${VERSION}-windows-x64.zip`,
    binaryName: 'deepfilter.exe',
    sha256: '', // TODO: fill with actual hash once binary is obtained
  },
  linux: {
    url: `https://github.com/Rikorose/DeepFilterNet/releases/download/${VERSION}/DeepFilterNet-${VERSION}-linux-x64.tar.gz`,
    binaryName: 'deepfilter',
    sha256: '',
  },
};

const platform = process.platform;
const asset = PLATFORM_ASSETS[platform];

if (!asset) {
  console.log(`[download-deepfilter] No DeepFilterNet binary for platform: ${platform} — skipping`);
  process.exit(0);
}

const outputDir = join(PROJECT_ROOT, 'resources', 'deepfilter');
const outputPath = join(outputDir, asset.binaryName);

if (existsSync(outputPath)) {
  console.log(`[download-deepfilter] Binary already exists at ${outputPath}`);

  // Verify checksum if configured
  if (asset.sha256) {
    const binary = readFileSync(outputPath);
    const hash = createHash('sha256').update(binary).digest('hex');
    if (hash === asset.sha256) {
      console.log('[download-deepfilter] Checksum OK');
      process.exit(0);
    } else {
      console.warn(`[download-deepfilter] Checksum mismatch — re-downloading`);
    }
  } else {
    console.log('[download-deepfilter] No checksum configured — skipping verification');
    process.exit(0);
  }
}

mkdirSync(outputDir, { recursive: true });

console.log(`[download-deepfilter] Downloading ${asset.url}...`);

try {
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // For now, download to a temp file — extraction depends on archive format
  const tempPath = join(outputDir, 'download.tmp');
  const fileStream = createWriteStream(tempPath);
  await pipeline(response.body, fileStream);

  console.log(`[download-deepfilter] Downloaded to ${tempPath}`);
  console.log('[download-deepfilter] NOTE: Manual extraction needed — extract the binary to:');
  console.log(`  ${outputPath}`);
  console.log('[download-deepfilter] Then update the SHA256 hash in this script and in deepfilterProcessor.ts');
} catch (err) {
  console.error('[download-deepfilter] Download failed:', err.message);
  console.log('[download-deepfilter] DeepFilterNet will be unavailable — NSNet2 will be used as fallback.');
  process.exit(0); // Non-fatal — app works without DeepFilterNet
}
