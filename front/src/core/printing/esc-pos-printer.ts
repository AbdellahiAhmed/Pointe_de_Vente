/**
 * ESC/POS Thermal Printer driver using Web Serial API.
 * Falls back to window.print() when Web Serial is not available.
 */

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30], // Double width + height
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  CUT_PAPER: [GS, 0x56, 0x00], // Full cut
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01], // Partial cut
  OPEN_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa], // Pulse pin 2
  FEED_LINES: (n: number) => [ESC, 0x64, n],
} as const;

// 80mm printers typically have 48 characters per line (for Font A)
const LINE_WIDTH = 48;

export interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream | null;
  readable: ReadableStream | null;
}

let connectedPort: SerialPort | null = null;

export function isWebSerialSupported(): boolean {
  return 'serial' in navigator;
}

export function isConnected(): boolean {
  return connectedPort !== null;
}

export async function connectPrinter(): Promise<boolean> {
  if (!isWebSerialSupported()) return false;

  try {
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });
    connectedPort = port;
    return true;
  } catch {
    connectedPort = null;
    return false;
  }
}

export async function disconnectPrinter(): Promise<void> {
  if (connectedPort) {
    try {
      await connectedPort.close();
    } catch {
      // Ignore close errors
    }
    connectedPort = null;
  }
}

async function writeBytes(bytes: number[]): Promise<void> {
  if (!connectedPort?.writable) {
    throw new Error('Printer not connected');
  }

  const writer = connectedPort.writable.getWriter();
  try {
    await writer.write(new Uint8Array(bytes));
  } finally {
    writer.releaseLock();
  }
}

function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

/**
 * ReceiptBuilder — fluent builder for ESC/POS receipt commands.
 */
export class ReceiptBuilder {
  private buffer: number[] = [];

  constructor() {
    this.buffer.push(...CMD.INIT);
  }

  center(): this {
    this.buffer.push(...CMD.ALIGN_CENTER);
    return this;
  }

  left(): this {
    this.buffer.push(...CMD.ALIGN_LEFT);
    return this;
  }

  right(): this {
    this.buffer.push(...CMD.ALIGN_RIGHT);
    return this;
  }

  bold(on = true): this {
    this.buffer.push(...(on ? CMD.BOLD_ON : CMD.BOLD_OFF));
    return this;
  }

  doubleSize(on = true): this {
    this.buffer.push(...(on ? CMD.DOUBLE_SIZE_ON : CMD.NORMAL_SIZE));
    return this;
  }

  doubleHeight(on = true): this {
    this.buffer.push(...(on ? CMD.DOUBLE_HEIGHT_ON : CMD.NORMAL_SIZE));
    return this;
  }

  underline(on = true): this {
    this.buffer.push(...(on ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF));
    return this;
  }

  text(str: string): this {
    this.buffer.push(...textToBytes(str));
    return this;
  }

  line(str = ''): this {
    this.buffer.push(...textToBytes(str), LF);
    return this;
  }

  /** Print a line of dashes as separator */
  separator(char = '-'): this {
    this.buffer.push(...textToBytes(char.repeat(LINE_WIDTH)), LF);
    return this;
  }

  /** Print left-right aligned text on one line (e.g., "Label:      Value") */
  columns(left: string, right: string, fillChar = ' '): this {
    const space = LINE_WIDTH - left.length - right.length;
    const fill = space > 0 ? fillChar.repeat(space) : ' ';
    this.buffer.push(...textToBytes(left + fill + right), LF);
    return this;
  }

  /** Print 3-column row (left, center, right) */
  columns3(col1: string, col2: string, col3: string): this {
    const c1Width = Math.floor(LINE_WIDTH * 0.45);
    const c2Width = Math.floor(LINE_WIDTH * 0.15);
    const c3Width = LINE_WIDTH - c1Width - c2Width;
    const padded =
      col1.padEnd(c1Width).substring(0, c1Width) +
      col2.padStart(c2Width).substring(0, c2Width) +
      col3.padStart(c3Width).substring(0, c3Width);
    this.buffer.push(...textToBytes(padded), LF);
    return this;
  }

  /** Print 4-column row */
  columns4(col1: string, col2: string, col3: string, col4: string): this {
    const c1Width = Math.floor(LINE_WIDTH * 0.35);
    const c2Width = Math.floor(LINE_WIDTH * 0.20);
    const c3Width = Math.floor(LINE_WIDTH * 0.10);
    const c4Width = LINE_WIDTH - c1Width - c2Width - c3Width;
    const padded =
      col1.padEnd(c1Width).substring(0, c1Width) +
      col2.padStart(c2Width).substring(0, c2Width) +
      col3.padStart(c3Width).substring(0, c3Width) +
      col4.padStart(c4Width).substring(0, c4Width);
    this.buffer.push(...textToBytes(padded), LF);
    return this;
  }

  feed(lines = 1): this {
    this.buffer.push(...CMD.FEED_LINES(lines));
    return this;
  }

  cut(): this {
    this.feed(3);
    this.buffer.push(...CMD.CUT_PAPER_PARTIAL);
    return this;
  }

  openDrawer(): this {
    this.buffer.push(...CMD.OPEN_DRAWER);
    return this;
  }

  build(): number[] {
    return [...this.buffer];
  }

  async print(): Promise<void> {
    await writeBytes(this.buffer);
  }
}

export { LINE_WIDTH };
