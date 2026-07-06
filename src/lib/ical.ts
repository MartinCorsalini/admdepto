// Minimal iCalendar parser tailored to Airbnb / Booking exported calendars.
// They emit VEVENT blocks with DTSTART;VALUE=DATE, DTEND;VALUE=DATE, UID, SUMMARY, DESCRIPTION.

export type ICalEvent = {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string;
  summary: string;
  description: string;
};

function unfold(text: string): string {
  // RFC5545 line-folding: a line beginning with space/tab continues previous line.
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseDate(v: string): string {
  // Accepts 20260115 or 20260115T120000Z
  const s = v.replace(/[^0-9T]/g, "");
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function parseICal(raw: string): ICalEvent[] {
  const text = unfold(raw);
  const events: ICalEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0];
    const lines = body.split(/\r?\n/);
    let uid = "";
    let start = "";
    let end = "";
    let summary = "";
    let description = "";
    for (const line of lines) {
      const [rawKey, ...rest] = line.split(":");
      if (!rawKey || rest.length === 0) continue;
      const key = rawKey.split(";")[0].toUpperCase();
      const value = rest.join(":").trim();
      if (key === "UID") uid = value;
      else if (key === "DTSTART") start = parseDate(value);
      else if (key === "DTEND") end = parseDate(value);
      else if (key === "SUMMARY") summary = value;
      else if (key === "DESCRIPTION") description = value.replace(/\\n/g, "\n");
    }
    if (uid && start && end) {
      events.push({ uid, start, end, summary, description });
    }
  }
  return events;
}

export function guessPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("airbnb")) return "airbnb";
  if (u.includes("booking")) return "booking";
  return "other";
}

export function isBlockedEvent(summary: string): boolean {
  const s = (summary || "").toLowerCase();
  return (
    s.includes("not available") ||
    s.includes("blocked") ||
    s.includes("bloqueado") ||
    s === "closed" ||
    s.includes("unavailable")
  );
}
