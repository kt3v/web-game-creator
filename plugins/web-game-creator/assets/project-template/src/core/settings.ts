export type UIMode = 'auto' | 'desktop' | 'touch';
export type Quality = 'auto' | 'low' | 'high';
export interface Settings {
  master: number; music: number; effects: number; ui: number;
  uiMode: UIMode; quality: Quality; reducedMotion: boolean;
}
export const defaults: Readonly<Settings> = {
  master: .75, music: .35, effects: .8, ui: .65,
  uiMode: 'auto', quality: 'auto', reducedMotion: false,
};
export function validateSettings(value: unknown): Settings {
  const result = { ...defaults };
  if (!value || typeof value !== 'object') return result;
  const raw = value as Record<string, unknown>;
  for (const key of ['master', 'music', 'effects', 'ui'] as const) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) result[key] = Math.max(0, Math.min(1, raw[key]));
  }
  if (['auto', 'desktop', 'touch'].includes(raw.uiMode as string)) result.uiMode = raw.uiMode as UIMode;
  if (['auto', 'low', 'high'].includes(raw.quality as string)) result.quality = raw.quality as Quality;
  if (typeof raw.reducedMotion === 'boolean') result.reducedMotion = raw.reducedMotion;
  return result;
}
export function pixelRatio(quality: Quality, touch: boolean, dpr: number): number {
  return quality === 'low' ? .75 : Math.min(dpr, quality === 'high' ? 2 : touch ? 1.25 : 1.5);
}
