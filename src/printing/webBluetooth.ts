/**
 * Web Bluetooth (BLE) transport for thermal printers — Chrome/Edge only.
 *
 * Hard-won rules encoded here:
 * - Printers rarely advertise their print service → requestDevice with
 *   acceptAllDevices + optionalServices for every known print channel.
 * - A printer can expose OTHER writable characteristics that swallow bytes
 *   without printing → try KNOWN channels in order, never "first writable".
 * - BLE default-MTU payload is 20 bytes; long writes get ACKed-then-dropped
 *   by cheap firmware → 20-byte chunks with a small delay.
 * - Bridges swallow the first packet after connect → send a sacrificial
 *   ESC @ and wait ~150ms before the real payload.
 */

// ---- Minimal Web Bluetooth typings (lib.dom omits them) ----
interface BTCharacteristic {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(data: Uint8Array): Promise<void>;
  writeValueWithoutResponse?(data: Uint8Array): Promise<void>;
}
interface BTService {
  uuid: string;
  getCharacteristic(uuid: string | number): Promise<BTCharacteristic>;
  getCharacteristics(): Promise<BTCharacteristic[]>;
}
interface BTGattServer {
  connected: boolean;
  connect(): Promise<BTGattServer>;
  disconnect(): void;
  getPrimaryService(uuid: string | number): Promise<BTService>;
  getPrimaryServices(): Promise<BTService[]>;
}
export interface BTDevice {
  id: string;
  name?: string;
  gatt?: BTGattServer;
}
interface BluetoothApi {
  requestDevice(options: {
    acceptAllDevices?: boolean;
    optionalServices?: (string | number)[];
  }): Promise<BTDevice>;
}

/** Known print service/characteristic pairs, in trial order. */
export const KNOWN_CHANNELS: { service: string | number; characteristic: string | number; label: string }[] = [
  { service: 0x18f0, characteristic: 0x2af1, label: 'Std printer (18F0/2AF1)' },
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3', label: 'ISSC/Microchip' },
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', characteristic: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', label: 'Common BLE bridge' },
  { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', label: 'Nordic UART' },
  { service: 0xff00, characteristic: 0xff02, label: 'Clone (FF00/FF02)' },
];

const CHUNK = 20;
const CHUNK_DELAY_MS = 20;
const WARMUP_DELAY_MS = 150;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Live device objects for this browsing session, keyed by device id.
 * localStorage can only hold ids — navigator.bluetooth.getDevices() is not
 * universally available, so a stored id may still require a fresh picker tap.
 */
const sessionDevices = new Map<string, BTDevice>();

export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

function bluetooth(): BluetoothApi {
  if (!isWebBluetoothAvailable()) {
    throw new PrintTransportError(
      'bluetooth-unavailable',
      'This browser has no Web Bluetooth. Use Chrome or Edge — or print via PDF.',
    );
  }
  return (navigator as unknown as { bluetooth: BluetoothApi }).bluetooth;
}

export type TransportErrorCode =
  | 'bluetooth-unavailable'
  | 'user-cancelled'
  | 'device-not-remembered'
  | 'connect-failed'
  | 'no-print-channel'
  | 'write-failed';

export class PrintTransportError extends Error {
  constructor(public code: TransportErrorCode, message: string) {
    super(message);
  }
}

/** Open the browser device chooser; remember the picked device for the session. */
export async function pickDevice(): Promise<{ id: string; name: string }> {
  let device: BTDevice;
  try {
    device = await bluetooth().requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_CHANNELS.map((c) => c.service),
    });
  } catch (e) {
    if ((e as DOMException)?.name === 'NotFoundError') {
      throw new PrintTransportError('user-cancelled', 'No device chosen.');
    }
    throw new PrintTransportError('connect-failed', `Bluetooth chooser failed: ${(e as Error).message}`);
  }
  sessionDevices.set(device.id, device);
  return { id: device.id, name: device.name ?? 'Bluetooth printer' };
}

export function haveSessionDevice(id: string): boolean {
  return sessionDevices.has(id);
}

interface OpenChannel {
  device: BTDevice;
  characteristic: BTCharacteristic;
  channelKey: string;
}

/** Connect and locate a known print channel (pinned channel tried first). */
async function openChannel(deviceId: string, pinnedChannel?: string): Promise<OpenChannel> {
  const device = sessionDevices.get(deviceId);
  if (!device) {
    throw new PrintTransportError(
      'device-not-remembered',
      'The printer needs to be re-selected (browsers forget live connections between sessions). Tap "Connect printer" once.',
    );
  }
  let server: BTGattServer;
  try {
    server = await device.gatt!.connect();
  } catch (e) {
    throw new PrintTransportError(
      'connect-failed',
      `Could not connect to "${device.name ?? deviceId}". Check the printer is on and in range. (${(e as Error).message})`,
    );
  }

  const ordered = pinnedChannel
    ? [...KNOWN_CHANNELS].sort((a, b) => Number(channelKey(b) === pinnedChannel) - Number(channelKey(a) === pinnedChannel))
    : KNOWN_CHANNELS;

  for (const ch of ordered) {
    try {
      const service = await server.getPrimaryService(normalizeUuid(ch.service));
      const characteristic = await service.getCharacteristic(normalizeUuid(ch.characteristic));
      if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
        return { device, characteristic, channelKey: channelKey(ch) };
      }
    } catch {
      // Channel not present on this printer — try the next.
    }
  }
  server.disconnect();
  throw new PrintTransportError(
    'no-print-channel',
    'No known print channel on this device. It may be a Classic-Bluetooth-only printer (BLE cannot reach it) — use the PDF fallback, or run the channel probe.',
  );
}

export function channelKey(ch: { service: string | number; characteristic: string | number }): string {
  return `${ch.service}/${ch.characteristic}`;
}

function normalizeUuid(v: string | number): string | number {
  return v; // Web Bluetooth accepts 16-bit numbers and full UUID strings as-is.
}

/** Write a payload: sacrificial ESC @, then 20-byte paced chunks. */
async function writePaced(c: BTCharacteristic, payload: Uint8Array): Promise<void> {
  const preferNoResponse = c.properties.writeWithoutResponse && Boolean(c.writeValueWithoutResponse);
  const writeChunk = async (chunk: Uint8Array) => {
    // Uint8Array views are BufferSource-compatible.
    if (preferNoResponse) await c.writeValueWithoutResponse!(chunk);
    else await c.writeValue(chunk);
  };
  // Warm-up: bridges swallow the first packet after connect.
  await writeChunk(Uint8Array.from([0x1b, 0x40]));
  await sleep(WARMUP_DELAY_MS);
  for (let i = 0; i < payload.length; i += CHUNK) {
    await writeChunk(payload.subarray(i, i + CHUNK));
    await sleep(CHUNK_DELAY_MS);
  }
}

/** Full print: connect (pinned channel first), warm up, stream, disconnect. */
export async function printOverBle(
  deviceId: string,
  payload: Uint8Array,
  pinnedChannel?: string,
): Promise<{ channelKey: string }> {
  const open = await openChannel(deviceId, pinnedChannel);
  try {
    await writePaced(open.characteristic, payload);
    // Give the tail time to drain before dropping the link.
    await sleep(Math.min(2000, 400 + payload.length / 24));
    return { channelKey: open.channelKey };
  } catch (e) {
    if (e instanceof PrintTransportError) throw e;
    throw new PrintTransportError('write-failed', `Send failed mid-print: ${(e as Error).message}`);
  } finally {
    open.device.gatt?.disconnect();
  }
}

export interface ProbeChannel {
  index: number;
  key: string;
  label: string;
}

/**
 * Channel probe: send a numbered plain-text line through EVERY writable known
 * channel. The user reports which number printed; that channel gets pinned.
 */
export async function probeChannels(deviceId: string): Promise<ProbeChannel[]> {
  const device = sessionDevices.get(deviceId);
  if (!device) throw new PrintTransportError('device-not-remembered', 'Re-select the printer first.');
  const server = await device.gatt!.connect();
  const found: ProbeChannel[] = [];
  let index = 1;
  try {
    for (const ch of KNOWN_CHANNELS) {
      try {
        const service = await server.getPrimaryService(normalizeUuid(ch.service));
        const characteristic = await service.getCharacteristic(normalizeUuid(ch.characteristic));
        if (!characteristic.properties.write && !characteristic.properties.writeWithoutResponse) continue;
        const text = `\x1b@CHANNEL ${index} (${ch.label})\n\n\n`;
        const data = Uint8Array.from([...text].map((c) => c.charCodeAt(0) & 0x7f));
        await writePaced(characteristic, data);
        found.push({ index, key: channelKey(ch), label: ch.label });
        index++;
      } catch {
        // not present — skip
      }
    }
  } finally {
    server.disconnect();
  }
  if (found.length === 0) {
    throw new PrintTransportError('no-print-channel', 'No writable known channels found on this device.');
  }
  return found;
}
