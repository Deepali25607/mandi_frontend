import type { ThermalEncoding } from './escpos';

/**
 * Thermal print settings — persisted per device/browser in localStorage.
 * (The native app and each browser have separate storage; the settings screen
 * says so explicitly.)
 */

export type PrinterKind = 'regular' | 'bluetooth';
export type PaperChoice = '58' | '80' | '104' | 'custom';
export type ThermalFormat = 'image' | 'modern' | 'old';
export type ColsChoice = 'auto' | 32 | 48 | 64;

export interface ThermalSettings {
  printerType: PrinterKind;
  paper: PaperChoice;
  customWidthMm: number;
  /** Image (default) | Modern | Old. */
  format: ThermalFormat;
  charsPerLine: ColsChoice;
  encoding: ThermalEncoding;
  /** 1–5; 3 = printer default (send nothing). Text modes only. */
  density: number;
  feedLines: number;
  autoCut: boolean;
  rememberPrinter: boolean;
  autoConnect: boolean;
  /** Remembered BLE device (id survives reloads; live object does not). */
  deviceId: string | null;
  deviceName: string | null;
  /** Print channel pinned by the probe tool. */
  pinnedChannel: string | null;
}

export const DEFAULT_THERMAL_SETTINGS: ThermalSettings = {
  printerType: 'regular',
  paper: '58',
  customWidthMm: 58,
  format: 'image',
  charsPerLine: 'auto',
  encoding: 'cp437',
  density: 3,
  feedLines: 3,
  autoCut: false,
  rememberPrinter: true,
  autoConnect: true,
  deviceId: null,
  deviceName: null,
  pinnedChannel: null,
};

const KEY = 'mandi.thermalPrint';

export function loadThermalSettings(): ThermalSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_THERMAL_SETTINGS };
    return { ...DEFAULT_THERMAL_SETTINGS, ...(JSON.parse(raw) as Partial<ThermalSettings>) };
  } catch {
    return { ...DEFAULT_THERMAL_SETTINGS };
  }
}

export function saveThermalSettings(s: ThermalSettings): void {
  const toStore = s.rememberPrinter ? s : { ...s, deviceId: null, deviceName: null, pinnedChannel: null };
  localStorage.setItem(KEY, JSON.stringify(toStore));
}

/** Effective paper width in mm. */
export function paperWidthMm(s: ThermalSettings): number {
  if (s.paper === 'custom') return Math.min(120, Math.max(40, s.customWidthMm || 58));
  return Number(s.paper);
}
