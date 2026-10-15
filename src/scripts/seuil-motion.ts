/** Motion is an enhancement: HTML, focus and native disclosure stay usable. */
function initializeSeuil() {
  const body = document.body;
  if (!body?.hasAttribute("data-seuil-page")) return;

  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const pilot = body.hasAttribute("data-seuil-pilot");
  const motion = pilot || body.hasAttribute("data-seuil-profile");
  const profile = body.dataset.seuilProfile || (pilot ? "pilot" : "utility");
  const copyDuration =
    profile === "pilot"
      ? 1600
      : profile === "reading"
        ? 900
        : profile === "utility"
          ? 650
          : 1180;
  const ambientSurfaces = motion
    ? Array.from(body.querySelectorAll<HTMLElement>("[data-seuil-ambient]"))
    : [];
  const ambientVisibility = new Map<Element, number>();
  let pageActive = true;
  const hero = document.querySelector<HTMLElement>("[data-seuil-hero]");
  const decor = hero?.querySelector<HTMLImageElement>("img[data-seuil-decor]");
  const doors = Array.from(
    document.querySelectorAll<HTMLElement>("[data-seuil-door]"),
  );
  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  let pilotArrivalsAllowed =
    motion &&
    !location.hash &&
    window.scrollY === 0 &&
    navigation?.type !== "back_forward" &&
    !preference.matches;
  let entranceAllowed =
    body.dataset.seuilPage === "home" &&
    !location.hash &&
    window.scrollY === 0 &&
    navigation?.type !== "back_forward" &&
    !preference.matches;
  let fontsReady = !motion;
  let copyEntranceAllowed = pilotArrivalsAllowed;
  let openingSettled = !copyEntranceAllowed;
  let openingDeadline: ReturnType<typeof setTimeout> | undefined;
  if (motion)
    body.dataset.seuilOpening = openingSettled ? "settled" : "waiting";
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let revealObserver: IntersectionObserver | undefined;
  let entranceStarted = false;
  let entranceTimer: ReturnType<typeof setTimeout> | undefined;
  let doorObserver: IntersectionObserver | undefined;
  let doorTimer: ReturnType<typeof setTimeout> | undefined;
  let imageRevision = 0;
  let selectedSource = "";
  let readySource = "";
  let resizeFrame = 0;
  let ambientSelected: Element | undefined;
  let ambientTime = 0;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  let consumePassedGroups = () => {};
  let stabilizeGroup: (target: Element) => void = () => {};

  function settleOpening() {
    if (!motion) return;
    openingSettled = true;
    copyEntranceAllowed = false;
    entranceAllowed = false;
    body.dataset.seuilOpening = "settled";
    clearTimeout(openingDeadline);
    updateAmbient();
  }

  function finishEntrance() {
    body.removeAttribute("data-seuil-enter");
    clearTimeout(entranceTimer);
    if (entranceStarted) settleOpening();
  }

  function finishCopyEntrance() {
    copyEntranceAllowed = false;
    body.removeAttribute("data-seuil-copy-enter");
    clearTimeout(copyTimer);
    settleOpening();
  }

  function finishReveals() {
    clearTimeout(revealTimer);
    body.querySelectorAll("[data-seuil-arrive]").forEach((target) => {
      target.removeAttribute("data-seuil-arrive");
    });
  }

  function updateAmbient() {
    let selected: Element | undefined;
    let visibleArea = 0;
    if (
      openingSettled &&
      !preference.matches &&
      pageActive &&
      !document.hidden
    ) {
      ambientVisibility.forEach((area, surface) => {
        if (area > visibleArea) {
          visibleArea = area;
          selected = surface;
        }
      });
      // Retain the dominant surface around a boundary.
      const currentArea = ambientSelected
        ? (ambientVisibility.get(ambientSelected) ?? 0)
        : 0;
      if (currentArea > 0 && visibleArea < currentArea * 1.25)
        selected = ambientSelected;
    }
    if (selected !== ambientSelected) {
      const lightAnimation = (surface: Element | undefined) =>
        surface
          ?.getAnimations?.({ subtree: true })
          .find(
            (animation) =>
              (animation as CSSAnimation).animationName ===
              "seuil-light-breathe",
          );
      const previousTime = lightAnimation(ambientSelected)?.currentTime;
      if (typeof previousTime === "number") ambientTime = previousTime;
      const nextAnimation = lightAnimation(selected);
      if (nextAnimation) nextAnimation.currentTime = ambientTime;
    }
    ambientSelected = selected;
    ambientSurfaces.forEach((surface) => {
      surface.toggleAttribute(
        "data-seuil-ambient-running",
        surface === selected,
      );
    });
  }

  function stopArrivals() {
    entranceAllowed = false;
    pilotArrivalsAllowed = false;
    finishEntrance();
    finishCopyEntrance();
    finishReveals();
    revealObserver?.disconnect();
    doorObserver?.disconnect();
    clearTimeout(doorTimer);
    doors.forEach((door) => door.removeAttribute("data-seuil-door-arrive"));
  }

  function updatePreference() {
    const reduced = preference.matches;
    body.dataset.seuilMotion = reduced ? "reduce" : "normal";
    // Returning to normal enables local responses, never replays an arrival.
    if (reduced) stopArrivals();
    updateAmbient();
  }
  updatePreference();
  preference.addEventListener("change", updatePreference);

  function startEntrance() {
    if (
      !entranceAllowed ||
      entranceStarted ||
      !fontsReady ||
      preference.matches ||
      (motion && (openingSettled || performance.now() > 2500)) ||
      location.hash ||
      window.scrollY > 0
    ) {
      return;
    }
    entranceStarted = true;
    if (motion) {
      clearTimeout(openingDeadline);
      body.dataset.seuilOpening = "entering";
    }
    body.setAttribute("data-seuil-enter", "");
    // Fallback cleanup only; it never holds content or navigation back.
    entranceTimer = setTimeout(finishEntrance, pilot ? 3600 : 1100);
    updateAmbient();
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
      if (
        ["seuil-approach", "seuil-pilot-approach"].includes(event.animationName)
      )
        finishEntrance();
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

  if (
    !pilot &&
    entranceAllowed &&
    doors.length &&
    "IntersectionObserver" in window
  ) {
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

  if (motion) {
    body.setAttribute("data-seuil-pilot-ready", "");
    // A missing or very late image must not hold the scroll/ambient phases.
    if (!openingSettled) openingDeadline = setTimeout(settleOpening, 2500);

    // A short font barrier avoids animating the title through a font swap.
    // No visibility gate: slow fonts/images leave the final HTML readable.
    let fontTimer: ReturnType<typeof setTimeout>;
    void Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        fontTimer = setTimeout(resolve, 600);
      }),
    ]).then(() => {
      clearTimeout(fontTimer);
      fontsReady = true;
      if (readySource) startEntrance();
      if (
        body.dataset.seuilPage === "internal" &&
        copyEntranceAllowed &&
        !preference.matches &&
        !document.hidden &&
        !location.hash &&
        window.scrollY === 0 &&
        performance.now() < 2500
      ) {
        body.setAttribute("data-seuil-copy-enter", "");
        body.dataset.seuilOpening = "entering";
        clearTimeout(openingDeadline);
        copyTimer = setTimeout(finishCopyEntrance, copyDuration);
      }
    });

    if ("IntersectionObserver" in window) {
      const ambientObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            ambientVisibility.set(
              entry.target,
              entry.isIntersecting ? entry.intersectionRect.height : 0,
            );
          });
          updateAmbient();
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
      );
      ambientSurfaces.forEach((surface) => ambientObserver.observe(surface));

      if (pilotArrivalsAllowed) {
        // Only explicitly marked units participate. The short first member
        // is observed, never the height of a long chapter or whole article.
        const groups = new Map<Element, HTMLElement[]>();
        const rows = new Map<Element, { top: number; key: Element }[]>();
        body
          .querySelectorAll<HTMLElement>("[data-seuil-reveal]")
          .forEach((target) => {
            let group: Element = target.matches(
              '[data-seuil-door], .inversion-card, [data-seuil-reveal="choice"], [data-seuil-reveal="filet"]',
            )
              ? target
              : (target.parentElement ?? target);
            const row = target.closest("[data-seuil-row]");
            if (row) {
              const top = target.getBoundingClientRect().top;
              const known = rows.get(row) ?? [];
              const existing = known.find(
                (item) => Math.abs(item.top - top) < 4,
              );
              if (existing) group = existing.key;
              else known.push({ top, key: target });
              rows.set(row, known);
            }
            groups.set(group, [...(groups.get(group) ?? []), target]);
          });
        const phrases = new Map<Element, HTMLElement[]>();
        groups.forEach((targets) => phrases.set(targets[0], targets));
        const consumed = new Set<Element>();
        function consume(trigger: Element) {
          consumed.add(trigger);
          revealObserver?.unobserve(trigger);
        }
        stabilizeGroup = (target) => {
          phrases.forEach((members, trigger) => {
            if (
              !members.some(
                (member) =>
                  member.contains(target) ||
                  target.contains(member) ||
                  (member.dataset.seuilReveal === "choice" &&
                    member.closest("li")?.contains(target)),
              )
            )
              return;
            consume(trigger);
            members.forEach((member) =>
              member.removeAttribute("data-seuil-arrive"),
            );
          });
        };
        function revealPhrase(trigger: Element) {
          phrases.get(trigger)?.forEach((target, index) => {
            const kind = target.dataset.seuilReveal || "text";
            const delay =
              kind === "door"
                ? Math.min(index, 4) * 70
                : kind === "choice"
                  ? Math.min(index, 4) * 60
                  : target.matches(".inversion-card")
                    ? 0
                    : Math.min(index, 2) * 100;
            target.style.setProperty("--seuil-reveal-delay", `${delay}ms`);
            target.dataset.seuilArrive = kind;
          });
          revealTimer = setTimeout(finishReveals, pilot ? 1150 : 1050);
        }
        // First-screen units belong to the opening composition. They are
        // consumed now, including when fonts or the hero image arrive late.
        phrases.forEach((_, trigger) => {
          if (trigger.getBoundingClientRect().top < window.innerHeight)
            consume(trigger);
        });
        let previousScroll = window.scrollY;
        let readingDown = true;
        consumePassedGroups = () => {
          if (window.scrollY !== previousScroll)
            readingDown = window.scrollY > previousScroll;
          previousScroll = window.scrollY;
          phrases.forEach((targets, trigger) => {
            if (trigger.getBoundingClientRect().bottom <= 0) {
              consume(trigger);
              targets.forEach((target) =>
                target.removeAttribute("data-seuil-arrive"),
              );
            }
          });
        };
        revealObserver = new IntersectionObserver(
          (entries) => {
            consumePassedGroups();
            const candidates: Element[] = [];
            entries.forEach((entry) => {
              if (!entry.isIntersecting || consumed.has(entry.target)) return;
              consume(entry.target);
              if (entry.target.getBoundingClientRect().bottom > 0)
                candidates.push(entry.target);
            });
            // One phrase wins this visibility batch. All secondary groups
            // stay final: no queue, delayed catch-up, or replay on return.
            if (
              !openingSettled ||
              !pilotArrivalsAllowed ||
              preference.matches ||
              document.hidden ||
              body.querySelector("[data-seuil-arrive]")
            )
              return;
            candidates.sort((a, b) =>
              readingDown
                ? a.getBoundingClientRect().top - b.getBoundingClientRect().top
                : b.getBoundingClientRect().top - a.getBoundingClientRect().top,
            );
            const primary = candidates.find(
              (trigger) =>
                !phrases
                  .get(trigger)
                  ?.some((target) => target.matches(":focus-within, :hover")),
            );
            if (primary) revealPhrase(primary);
          },
          { threshold: 0.18, rootMargin: "0px 0px -5% 0px" },
        );
        phrases.forEach((_, trigger) => {
          if (!consumed.has(trigger)) revealObserver?.observe(trigger);
        });
        window.addEventListener("resize", () => {
          // A resize resolves existing groups; it never reassembles a row
          // under a pointer or replays already read material.
          stopArrivals();
        });
      }
    }

    body.addEventListener("animationend", (event) => {
      if (!(event.target instanceof Element)) return;
      if (
        ["seuil-reveal", "seuil-rule-trace", "seuil-door-greet"].includes(
          event.animationName,
        )
      ) {
        const target = event.target.closest<HTMLElement>("[data-seuil-arrive]");
        // Door arrows end last; don't cancel their stagger when text settles.
        if (
          target &&
          (target.dataset.seuilArrive !== "door" ||
            event.animationName === "seuil-door-greet")
        ) {
          target.removeAttribute("data-seuil-arrive");
        }
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        entranceAllowed = false;
        finishEntrance();
        finishCopyEntrance();
        finishReveals();
      }
      updateAmbient();
    });
    // Following the reader takes priority over finishing the opening scene.
    window.addEventListener(
      "scroll",
      () => {
        consumePassedGroups();
        if (!openingSettled && window.scrollY > 24) {
          entranceAllowed = false;
          finishEntrance();
          finishCopyEntrance();
        }
      },
      { passive: true },
    );
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
    stabilizeGroup(event.target);
    if (motion) {
      event.target
        .closest("[data-seuil-arrive]")
        ?.removeAttribute("data-seuil-arrive");
      if (event.target.closest("[data-seuil-intro]")) {
        entranceAllowed = false;
        finishEntrance();
        finishCopyEntrance();
      }
    }
  });

  function stabilizeInteraction(event: Event) {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest(
      "a, button, summary, [data-seuil-door]",
    );
    if (!target) return;
    stabilizeGroup(target);
    if (target.closest("[data-seuil-intro]")) {
      entranceAllowed = false;
      finishEntrance();
      finishCopyEntrance();
    }
  }
  body.addEventListener("pointerover", stabilizeInteraction);
  body.addEventListener("pointerdown", stabilizeInteraction);
  body.addEventListener("touchstart", stabilizeInteraction, { passive: true });

  window.addEventListener("hashchange", stopArrivals);
  window.addEventListener("popstate", stopArrivals);
  window.addEventListener("pagehide", () => {
    pageActive = false;
    updateAmbient();
    stopArrivals();
    invalidateDecor();
    cancelAnimationFrame(resizeFrame);
  });
  window.addEventListener("pageshow", (event) => {
    pageActive = true;
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
