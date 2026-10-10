/** Motion is an enhancement: HTML, focus and native disclosure stay usable. */
function initializeSeuil() {
  const body = document.body;
  if (!body?.hasAttribute("data-seuil-page")) return;

  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector<HTMLElement>("[data-seuil-hero]");
  const decor = hero?.querySelector<HTMLImageElement>("img[data-seuil-decor]");
  const doors = Array.from(
    document.querySelectorAll<HTMLElement>("[data-seuil-door]"),
  );
  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  let entranceAllowed =
    body.dataset.seuilPage === "home" &&
    !location.hash &&
    window.scrollY === 0 &&
    navigation?.type !== "back_forward" &&
    !preference.matches;
  let entranceStarted = false;
  let entranceTimer: ReturnType<typeof setTimeout> | undefined;
  let doorObserver: IntersectionObserver | undefined;
  let doorTimer: ReturnType<typeof setTimeout> | undefined;
  let imageRevision = 0;
  let selectedSource = "";
  let readySource = "";
  let resizeFrame = 0;

  function finishEntrance() {
    body.removeAttribute("data-seuil-enter");
    clearTimeout(entranceTimer);
  }

  function stopArrivals() {
    entranceAllowed = false;
    finishEntrance();
    doorObserver?.disconnect();
    clearTimeout(doorTimer);
    doors.forEach((door) => door.removeAttribute("data-seuil-door-arrive"));
  }

  function updatePreference() {
    body.dataset.seuilMotion = preference.matches ? "reduce" : "normal";
    // Returning to normal enables local responses, never replays an arrival.
    if (preference.matches) stopArrivals();
  }
  updatePreference();
  preference.addEventListener("change", updatePreference);

  function startEntrance() {
    if (
      !entranceAllowed ||
      entranceStarted ||
      preference.matches ||
      location.hash ||
      window.scrollY > 0
    ) {
      return;
    }
    entranceStarted = true;
    body.setAttribute("data-seuil-enter", "");
    // Fallback cleanup only; it never holds content or navigation back.
    entranceTimer = setTimeout(finishEntrance, 1100);
  }

  function invalidateDecor() {
    imageRevision += 1;
    readySource = "";
    hero?.removeAttribute("data-seuil-decor-ready");
    finishEntrance();
  }

  async function inspectDecor() {
    if (!decor || !hero) return;
    const source = decor.currentSrc;
    if (source !== selectedSource) {
      invalidateDecor();
      selectedSource = source;
    }
    if (
      !source ||
      !decor.complete ||
      decor.naturalWidth <= 0 ||
      decor.naturalHeight <= 0
    ) {
      if (readySource) invalidateDecor();
      return;
    }
    if (readySource === source) return;
    const revision = ++imageRevision;
    try {
      await decor.decode();
    } catch {
      if (revision === imageRevision) invalidateDecor();
      return;
    }
    if (
      revision !== imageRevision ||
      source !== decor.currentSrc ||
      !decor.complete ||
      decor.naturalWidth <= 0 ||
      decor.naturalHeight <= 0
    ) {
      return;
    }
    readySource = source;
    hero.setAttribute("data-seuil-decor-ready", "");
    startEntrance();
  }

  function scheduleImageCheck() {
    // Protect the status now, before responsive source selection settles.
    invalidateDecor();
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = requestAnimationFrame(() => void inspectDecor());
    });
  }

  if (decor && hero) {
    decor.addEventListener("load", () => {
      invalidateDecor();
      void inspectDecor();
    });
    decor.addEventListener("error", invalidateDecor);
    decor.addEventListener("animationend", (event) => {
      if (event.animationName === "seuil-approach") finishEntrance();
    });
    new MutationObserver(scheduleImageCheck).observe(
      decor.closest("picture") ?? decor,
      {
        attributes: true,
        attributeFilter: ["src", "srcset", "sizes", "media", "type"],
        subtree: true,
        childList: true,
      },
    );
    window.addEventListener("resize", scheduleImageCheck, { passive: true });
    window.addEventListener("orientationchange", scheduleImageCheck);
    void inspectDecor();
  }

  if (entranceAllowed && doors.length && "IntersectionObserver" in window) {
    doors.forEach((door, index) => {
      door.style.setProperty("--seuil-door-order", String(Math.min(index, 4)));
    });
    doorObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        doorObserver?.disconnect();
        if (!entranceAllowed || preference.matches || location.hash) return;
        doors.forEach((door) =>
          door.setAttribute("data-seuil-door-arrive", ""),
        );
        doorTimer = setTimeout(() => {
          doors.forEach((door) =>
            door.removeAttribute("data-seuil-door-arrive"),
          );
        }, 900);
      },
      { threshold: 0.18 },
    );
    doorObserver.observe(doors[0]);
  }

  document
    .querySelectorAll<HTMLDetailsElement>("details[data-seuil-menu]")
    .forEach((menu) => {
      const trigger = menu.querySelector<HTMLElement>(
        "summary[data-seuil-menu-trigger]",
      );
      const desktopNavigation = menu
        .closest("header")
        ?.querySelector<HTMLElement>(".desktop-nav-container");

      if (trigger && desktopNavigation) {
        // Keep this query aligned with SiteHeader's navigation replacement.
        const desktop = matchMedia("(min-width: 64rem)");
        let desktopVisible = desktop.matches;
        let navigationFocus: HTMLElement | null = null;

        function isNavigationTarget(target: Element) {
          return menu.contains(target) || desktopNavigation!.contains(target);
        }

        body.addEventListener("focusin", (event) => {
          if (!(event.target instanceof HTMLElement)) return;
          // CSS can release focus before the media-query change is delivered.
          if (event.target === body && desktop.matches !== desktopVisible)
            return;
          navigationFocus = isNavigationTarget(event.target)
            ? event.target
            : null;
        });
        body.addEventListener("focusout", (event) => {
          if (event.target !== navigationFocus) return;
          const next = event.relatedTarget;
          if (
            desktop.matches === desktopVisible ||
            (next instanceof Element &&
              next !== body &&
              next !== document.documentElement)
          ) {
            navigationFocus = null;
          }
        });
        body.addEventListener("pointerdown", (event) => {
          if (
            event.target instanceof Element &&
            !isNavigationTarget(event.target)
          ) {
            navigationFocus = null;
          }
        });

        desktop.addEventListener("change", () => {
          const active = document.activeElement;
          const origin =
            active instanceof HTMLElement &&
            active !== body &&
            active !== document.documentElement
              ? active
              : navigationFocus;
          desktopVisible = desktop.matches;
          menu.open = false;
          if (!origin) return;

          let target: HTMLElement | undefined;
          if (desktopVisible && menu.contains(origin)) {
            const links = Array.from(
              desktopNavigation.querySelectorAll<HTMLAnchorElement>("a[href]"),
            );
            const href = origin.closest("a[href]")?.getAttribute("href");
            target =
              links.find((link) => link.getAttribute("href") === href) ??
              links[0];
          } else if (!desktopVisible && desktopNavigation.contains(origin)) {
            target = trigger;
          }
          navigationFocus = null;
          if (target?.getClientRects().length) {
            target.focus({ preventScroll: true });
          }
        });
        // Initial desktop entry closes a hidden disclosure without moving focus.
        if (desktopVisible) menu.open = false;
      }

      menu.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !menu.open) return;
        event.preventDefault();
        menu.open = false;
        menu
          .querySelector<HTMLElement>("summary[data-seuil-menu-trigger]")
          ?.focus({ preventScroll: true });
      });
      menu.addEventListener("click", (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("a[href]")
        ) {
          menu.open = false;
        }
      });
    });

  body.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.closest("[data-seuil-status], [data-seuil-seal]") ||
      event.target.closest("a")?.querySelector("[data-seuil-seal]")
    ) {
      entranceStarted = true;
      finishEntrance();
    }
    event.target
      .closest("[data-seuil-door]")
      ?.removeAttribute("data-seuil-door-arrive");
  });

  window.addEventListener("hashchange", stopArrivals);
  window.addEventListener("popstate", stopArrivals);
  window.addEventListener("pagehide", () => {
    stopArrivals();
    invalidateDecor();
    cancelAnimationFrame(resizeFrame);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted || location.hash || window.scrollY > 0) stopArrivals();
    updatePreference();
    void inspectDecor();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSeuil, {
    once: true,
  });
} else {
  initializeSeuil();
}
