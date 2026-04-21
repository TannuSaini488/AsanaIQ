export function formatSlotLabel(slot) {
  const { date, startTime, endTime } = slot;
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (date) {
    const parsedDate =
      typeof date === 'object' && typeof date._seconds === 'number'
        ? new Date(date._seconds * 1000)
        : date;
    const d = new Date(parsedDate);
    if (!Number.isNaN(d.valueOf())) {
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return slot.id || slot.slotId || 'Slot';
}
