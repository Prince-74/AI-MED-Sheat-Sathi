/**
 * Date & Time Utilities for Appointment and Telehealth
 * Prevents timezone offset day/hour rollbacks.
 */

/**
 * Returns YYYY-MM-DD in local wall-clock time without UTC date shifting.
 */
export function formatLocalDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a canonical date (YYYY-MM-DD or ISO string) to human-readable date.
 * Example: "2026-09-01" -> "Tue, Sep 1, 2026"
 */
export function formatSlotDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "-";
  
  if (typeof dateInput === "string") {
    // If YYYY-MM-DD format, parse parts directly to avoid UTC shifts
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats time from ISO string or HH:mm string.
 * Example: "2026-09-01T12:30:00.000Z" -> "12:30 PM"
 * Example: "12:30" -> "12:30 PM"
 */
export function formatSlotTimeSimple(timeOrIso: string | undefined): string {
  if (!timeOrIso) return "-";

  // Check if it's already HH:mm
  const hhmmMatch = timeOrIso.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const h = Number(hhmmMatch[1]);
    const m = Number(hhmmMatch[2]);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  }

  // Check ISO string
  const isoTimeMatch = timeOrIso.match(/T(\d{2}):(\d{2})/);
  if (isoTimeMatch) {
    const h = Number(isoTimeMatch[1]);
    const m = Number(isoTimeMatch[2]);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  }

  const d = new Date(timeOrIso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formats full slot time range.
 * Example: ("2026-09-01T12:30:00.000Z", "2026-09-01T13:00:00.000Z") -> "12:30 PM - 01:00 PM"
 */
export function formatSlotTime(slotStartIso?: string, slotEndIso?: string): string {
  if (!slotStartIso) return "-";
  const start = formatSlotTimeSimple(slotStartIso);
  if (!slotEndIso) return start;
  const end = formatSlotTimeSimple(slotEndIso);
  return `${start} - ${end}`;
}
