// Development log formatter. It runs in-process (no worker transport): pino hands it one JSON line per entry.

const HIDDEN_KEYS = new Set(["time", "level", "msg", "requestId", "err", "pid", "hostname"]);

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function formatTime(time: unknown): string {
  const date = new Date(typeof time === "number" ? time : Date.now());
  return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}.${pad(date.getMilliseconds(), 3)}`;
}

function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function formatPrettyLine(line: string): string {
  let entry: Record<string, unknown>;
  try {
    entry = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return line.trimEnd();
  }

  const parts = [formatTime(entry.time), String(entry.level ?? "").toUpperCase().padEnd(5)];
  if (typeof entry.requestId === "string") parts.push(entry.requestId);
  parts.push(String(entry.msg ?? ""));
  for (const [key, value] of Object.entries(entry)) {
    if (!HIDDEN_KEYS.has(key)) parts.push(`${key}=${formatValue(value)}`);
  }

  let output = parts.join(" ");
  const err = entry.err as { stack?: unknown; message?: unknown } | undefined;
  if (err) output += `\n${String(err.stack ?? err.message)}`;
  return output;
}

export function createPrettyStream(write: (text: string) => void = (text) => process.stdout.write(text)) {
  return {
    write(line: string) {
      write(`${formatPrettyLine(line)}\n`);
    },
  };
}
