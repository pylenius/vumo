import { shallowRef, type Ref } from 'vue';

export interface AudioCueInput {
  src: string;
  from: number;
  durationInFrames: number;
  volume?: number;
  loop?: boolean;
  startOffset?: number;
}

export interface AudioCue {
  readonly id: number;
  readonly src: string;
  readonly from: number;
  readonly durationInFrames: number;
  readonly volume: number;
  readonly loop: boolean;
  readonly startOffset: number;
}

let nextId = 0;
const cuesRef = shallowRef<readonly AudioCue[]>([]);

function cueKey(c: Omit<AudioCue, 'id'>): string {
  return `${c.src}|${c.from}|${c.durationInFrames}|${c.volume}|${c.loop}|${c.startOffset}`;
}

export function registerAudioCue(input: AudioCueInput): number {
  const normalized: Omit<AudioCue, 'id'> = {
    src: input.src,
    from: input.from,
    durationInFrames: input.durationInFrames,
    volume: input.volume ?? 1,
    loop: input.loop ?? false,
    startOffset: input.startOffset ?? 0,
  };
  const newKey = cueKey(normalized);
  for (const existing of cuesRef.value) {
    if (cueKey(existing) === newKey) return existing.id;
  }
  const cue: AudioCue = { id: nextId++, ...normalized };
  cuesRef.value = [...cuesRef.value, cue];
  return cue.id;
}

export function listAudioCues(): readonly AudioCue[] {
  return cuesRef.value;
}

export function getAudioCuesRef(): Readonly<Ref<readonly AudioCue[]>> {
  return cuesRef;
}

export function clearAudioCues(): void {
  cuesRef.value = [];
  nextId = 0;
}
