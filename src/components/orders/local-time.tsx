"use client";

import { useSyncExternalStore } from "react";

const utc = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const local = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const subscribe = () => () => {};

/**
 * A moment in the viewer's own time zone. The server (and the first client render) show UTC with a
 * label so the markup matches; right after hydration it switches to local time.
 */
export function LocalTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const text = useSyncExternalStore(
    subscribe,
    () => local.format(date),
    () => `${utc.format(date)} UTC`,
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
