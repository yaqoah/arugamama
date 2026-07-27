import { useEffect, useState } from 'react';

/**
 * Live UAE clock (Gulf Standard Time, UTC+4, no DST).
 * Updates every second; returns time + Gregorian + Hijri day label.
 */
export function useUaeClock(): {
  time: string;
  dateLabel: string;
  hijriLabel: string;
  gstLabel: string;
} {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const hijriFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    calendar: 'islamic',
  });

  return {
    time: fmt.format(now),
    dateLabel: dateFmt.format(now).toUpperCase(),
    hijriLabel: hijriFmt.format(now),
    gstLabel: 'GST+4',
  };
}
