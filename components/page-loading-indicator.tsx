"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigationStartEvent = "lin-system:navigation-start";

function isInternalNavigationLink(link: HTMLAnchorElement) {
  if (link.target && link.target !== "_self") {
    return false;
  }

  const url = new URL(link.href);
  const current = new URL(window.location.href);

  if (url.origin !== current.origin) {
    return false;
  }

  return `${url.pathname}${url.search}` !== `${current.pathname}${current.search}`;
}

export function startPageLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(navigationStartEvent));
  }
}

export function PageLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const previousLocation = useRef(`${pathname}?${searchParams.toString()}`);

  useEffect(() => {
    function handleNavigationStart() {
      setIsLoading(true);
    }

    function handleClick(event: globalThis.MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");

      if (link instanceof HTMLAnchorElement && isInternalNavigationLink(link)) {
        setIsLoading(true);
      }
    }

    window.addEventListener(navigationStartEvent, handleNavigationStart);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener(navigationStartEvent, handleNavigationStart);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    const nextLocation = `${pathname}?${searchParams.toString()}`;

    if (previousLocation.current !== nextLocation) {
      previousLocation.current = nextLocation;
      const timeout = window.setTimeout(() => setIsLoading(false), 180);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [pathname, searchParams]);

  if (!isLoading) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed left-0 right-0 top-0 z-[100] border-b border-blue-900/10 bg-blue-700 text-white shadow-sm"
      role="status"
    >
      <div className="h-1 overflow-hidden bg-blue-950/15">
        <div className="h-full w-1/3 animate-page-loading bg-white/95" />
      </div>
      <div className="mx-auto flex h-9 max-w-6xl items-center px-6 text-sm font-medium">
        Loading page...
      </div>
    </div>
  );
}
