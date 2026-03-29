/**
 * MicLevelMeter — dual horizontal dB bar showing input (raw) vs output (processed) levels.
 *
 * For DeepFilter mode: subscribes to electronAPI.micNs.onLevelUpdate() IPC push at ~30fps.
 * For NSNet2 mode: computes levels locally via AnalyserNode on raw and clean streams.
 * For off mode: single input bar only.
 */

import { useEffect, useRef, useState } from 'react';
import { Group, Progress, Stack, Text } from '@mantine/core';

interface MicLevelMeterProps {
  /** Raw mic stream (before processing) */
  rawStream?: MediaStream | null;
  /** Clean stream (after noise suppression) */
  cleanStream?: MediaStream | null;
  /** Active noise cancellation mode */
  mode: 'off' | 'nsnet2' | 'deepfilter';
}

function dbToPercent(db: number): number {
  // Map -60dB..0dB to 0..100%
  const clamped = Math.max(-60, Math.min(0, db));
  return ((clamped + 60) / 60) * 100;
}

function levelColor(percent: number): string {
  if (percent < 50) return 'green';
  if (percent < 80) return 'yellow';
  return 'red';
}

export function MicLevelMeter({ rawStream, cleanStream, mode }: MicLevelMeterProps) {
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // For DeepFilter mode: use IPC level updates from main process
    if (mode === 'deepfilter') {
      const api = (window as any).electronAPI;
      if (api?.micNs?.onLevelUpdate) {
        unsubRef.current = api.micNs.onLevelUpdate((levels: { inputDb: number; outputDb: number }) => {
          setInputLevel(dbToPercent(levels.inputDb));
          setOutputLevel(dbToPercent(levels.outputDb));
        });
      }
      return () => {
        unsubRef.current?.();
        unsubRef.current = null;
      };
    }

    // For NSNet2 and off modes: use AnalyserNode
    let running = true;

    function createAnalyser(stream: MediaStream): { ctx: AudioContext; analyser: AnalyserNode } {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      return { ctx, analyser };
    }

    if (rawStream) {
      const { ctx, analyser } = createAnalyser(rawStream);
      inputCtxRef.current = ctx;
      inputAnalyserRef.current = analyser;
    }

    if (cleanStream && mode !== 'off') {
      const { ctx, analyser } = createAnalyser(cleanStream);
      outputCtxRef.current = ctx;
      outputAnalyserRef.current = analyser;
    }

    const data = new Uint8Array(128);

    function tick() {
      if (!running) return;

      if (inputAnalyserRef.current) {
        inputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setInputLevel(Math.min(100, (avg / 128) * 100));
      }

      if (outputAnalyserRef.current) {
        outputAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setOutputLevel(Math.min(100, (avg / 128) * 100));
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      inputAnalyserRef.current = null;
      outputAnalyserRef.current = null;
      inputCtxRef.current?.close();
      outputCtxRef.current?.close();
      inputCtxRef.current = null;
      outputCtxRef.current = null;
    };
  }, [rawStream, cleanStream, mode]);

  return (
    <Stack gap={4}>
      <Group gap={8} align="center">
        <Text size="xs" c="dimmed" w={50}>Input</Text>
        <Progress value={inputLevel} color={levelColor(inputLevel)} size="sm" style={{ flex: 1 }} />
      </Group>
      {mode !== 'off' && (
        <Group gap={8} align="center">
          <Text size="xs" c="dimmed" w={50}>Output</Text>
          <Progress value={outputLevel} color={levelColor(outputLevel)} size="sm" style={{ flex: 1 }} />
        </Group>
      )}
    </Stack>
  );
}
