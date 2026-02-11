// Terminal utility functions
export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

export function termWidth(): number {
  return process.stdout.columns || 80;
}

export function indent(text: string, spaces: number = 2): string {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map(line => prefix + line).join('\n');
}

export interface BoxOptions {
  padding?: number;
  borderColor?: string;
}

export function box(text: string, _opts?: BoxOptions): string {
  // Stub - simplified box rendering
  return `\n${text}\n`;
}

export function heading(text: string): string {
  return `\n${text}\n`;
}

export function stepHeader(step: number, _total: number, text: string): string {
  return `[${step}] ${text}`;
}
