/*
 * dsh-hdd 2.0.0 —— H.D.D. 界面：开机影片、全息核心、对话区背景、输入胶囊、人格。
 *
 * 2.0.0 的背景模型只有一句话：图挂在文档画布上，不挂在对话区里。
 * 皮肤的美术部分自 dsh-fairy-splash（二次开发自 dsh-fairy-pack，MIT）而来，
 * 骨架、控制面板与诊断通道属于本项目。
 */
window.__ModuleLoader__.load({
  id: 'dsh-hdd',
  factory(require) {
    /** 原皮肤模块体：返回它自己的 { inject, apply }。 */
    function __createSplash(require) {
    try {
    const React = require('react')
    const h = React.createElement

    const VIDEO_URL = '/hdd/v1/boot.mp4'
    const POSTER_URL = '/hdd/v1/poster.jpg'
    /*
     * boot.mp4 runs 14.5 s, but its picture is finished at 12.9 s: the frames
     * from 13.0 s to the end are a static black hold (~68 bytes each). Waiting
     * for `ended` therefore parks the ready console behind ~1.9 s of black.
     * The splash instead hands over while the last live frame is still dimming,
     * so the fade and the film's own fade-to-black finish together.
     */
    const BOOT_HANDOFF_SECONDS = 1.85
    const BOOT_FADE_MS = 160
    const ICON_URL = '/hdd/v1/icon-64.png'
    /* 把标签页图标换成 H.D.D. 核心；失败不影响任何功能。 */
    ;(() => {
      try {
        let link = document.querySelector('link[rel="icon"]')
        if (link === null) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.type = 'image/png'
        link.href = ICON_URL
      }
      catch {
        /* ignore */
      }
    })()
    /*
     * The fairy stage follows the conversation column instead of the window.
     * Opening the right task panel (or collapsing the left sidebar) moves the
     * centre of the conversation, so the core and its halo have to move with
     * it. better-sidebar marks that column with [data-dsh-center-col]; the
     * shell's own conversation slot is the fallback when it is absent. The two
     * custom properties feed .fs-hero, which every layer inside is centred on.
     */
    ;(() => {
      const STAGE_LEFT = '--hdd-stage-left'
      const STAGE_RIGHT = '--hdd-stage-right'
      const STAGE_SELECTORS = [
        '[data-dsh-center-col]',
        '[data-slot="main.conversation"]',
        '.V4vHZW_root',
        '.V4vHZW_root',
      ]
      let frame = 0
      let stage = null
      let resizeObserver = null
      let lastLeft = Number.NaN
      let lastRight = Number.NaN
      const findStage = () => {
        for (const selector of STAGE_SELECTORS) {
          const el = document.querySelector(selector)
          if (el !== null && el.getBoundingClientRect().width > 1) return el
        }
        return null
      }
      const applyStage = () => {
        frame = 0
        const root = document.documentElement
        const next = findStage()
        if (next !== stage) {
          resizeObserver?.disconnect()
          resizeObserver = null
          stage = next
          if (stage !== null && typeof ResizeObserver === 'function') {
            resizeObserver = new ResizeObserver(scheduleStage)
            resizeObserver.observe(stage)
          }
        }
        if (stage === null) {
          lastLeft = Number.NaN
          lastRight = Number.NaN
          root.style.removeProperty(STAGE_LEFT)
          root.style.removeProperty(STAGE_RIGHT)
          return
        }
        const rect = stage.getBoundingClientRect()
        const left = Math.round(rect.left)
        const right = Math.max(0, Math.round(window.innerWidth - rect.right))
        if (left === lastLeft && right === lastRight) return
        lastLeft = left
        lastRight = right
        root.style.setProperty(STAGE_LEFT, left + 'px')
        root.style.setProperty(STAGE_RIGHT, right + 'px')
        /* Lets the drag shield notice a rail being resized even when the
           handle it is dragged by has no class we can recognise. */
        document.dispatchEvent(new Event('fairy-stage-resize'))
      }
      const scheduleStage = () => {
        if (frame === 0 && typeof window.requestAnimationFrame === 'function') {
          frame = window.requestAnimationFrame(applyStage)
        }
      }
      /* The column's own ResizeObserver covers the panel opening, closing and
         being dragged. The interval is the safety net for a wholesale swap of
         the centre column, and it costs one rect read per tick. Deliberately no
         subtree MutationObserver: a streaming reply would schedule it on every
         token. */
      window.addEventListener('resize', scheduleStage, { passive: true })
      scheduleStage()
      window.setInterval(scheduleStage, 1200)
    })()
    /*
     * Drag-time paint shield. While a rail is being resized the app re-lays out
     * the conversation on every pointer move; on top of that the glass panes
     * stack three 22-28px backdrop blurs, which is what turns a drag into a
     * slideshow. A pointerdown on a divider flips html[data-hdd-resizing] for
     * the length of the gesture and the stylesheet drops blur, shadows and
     * transitions until it ends.
     */
    ;(() => {
      let active = false
      const clear = () => {
        if (!active) return
        active = false
        document.documentElement.removeAttribute('data-hdd-resizing')
      }
      const DIVIDERS = '[class*="_divider"], [class*="_resize"], [class*="_resizer"], [class*="_gutter"]'
      const isDivider = (node) => {
        if (!(node instanceof Element)) return false
        if (node.closest(DIVIDERS) !== null) return true
        return document.body.hasAttribute('data-dsh-sidebar-dragging')
      }
      document.addEventListener('pointerdown', (event) => {
        if (!isDivider(event.target)) return
        active = true
        document.documentElement.setAttribute('data-hdd-resizing', '')
      }, true)
      /*
       * Second trigger, independent of class names: three layout changes inside
       * 350ms means something is being dragged, even if the handle is called
       * something else in the next build. The flag then expires 220ms after the
       * last change, so a slow drag still reads as one gesture.
       */
      let hits = []
      let settle = 0
      document.addEventListener('fairy-stage-resize', () => {
        const now = performance.now()
        hits.push(now)
        hits = hits.filter((t) => now - t < 350)
        if (hits.length >= 3) {
          active = true
          document.documentElement.setAttribute('data-hdd-resizing', '')
        }
        window.clearTimeout(settle)
        settle = window.setTimeout(() => {
          hits = []
          clear()
        }, 220)
      })
      window.addEventListener('pointerup', clear, true)
      window.addEventListener('pointercancel', clear, true)
      window.addEventListener('blur', clear)
      document.addEventListener('mouseup', clear, true)
    })()
    const CORE_GLITCH_CYCLE = 7200
    const CORE_EPOCH = performance.now()
    const coreGlitchPhase = () => `${-((performance.now() - CORE_EPOCH) % CORE_GLITCH_CYCLE)}ms`
    /* Master switch for the boot film. */
    const SPLASH_ENABLED = true
    /*
     * The film belongs to a launch of the app, not to every page load.
     * Two signals have to agree: the document must not be a reload, and this
     * window must not have booted before. Session storage survives Ctrl+R and
     * F5 and is wiped when the app itself restarts, so a refresh never sees the
     * film twice, including the first refresh after an update.
     */
    const SPLASH_ON_LAUNCH = (() => {
      if (!SPLASH_ENABLED) return false
      const entries = performance.getEntriesByType('navigation')
      const navigationType = entries[0]?.type ?? 'navigate'
      let booted = false
      try {
        const storage = window.sessionStorage
        booted = storage.getItem('fairy-splash:booted') === '1'
        if (!booted && navigationType !== 'reload') storage.setItem('fairy-splash:booted', '1')
      }
      catch {
        // Storage unavailable: the navigation type alone decides.
      }
      return !booted && navigationType !== 'reload'
    })()

    const CSS = `
.fs-root, .fs-root * { box-sizing: border-box; }
/*
 * Keep the top-left layout exactly as the app owns it: only the existing
 * "应用 / 编辑" caption menu is allowed to float over the video. The brand row
 * (icon + wordmark) stays below the splash layer, so no DeepSeek mark appears
 * and nothing is nudged into a different position.
 */
html[data-hdd-skin][data-hdd-splash-caption] [data-windows-menu] {
  filter: drop-shadow(0 1px 9px rgba(0, 0, 0, .8));
  pointer-events: none;
}
html[data-hdd-skin][data-hdd-splash-caption] .BynINW_frame:before {
  background: transparent !important;
}
.fs-root {
  position: fixed; inset: 0; z-index: 2147482200;
  pointer-events: none;
  font-family: "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
  color: #eaf1ff;
}

/* ---------- boot picture ---------- */
.fs-cinema {
  position: fixed; inset: 0; z-index: 2147483000;
  display: flex; align-items: center; justify-content: center;
  background: #000; overflow: hidden; pointer-events: auto;
  opacity: 1; transition: opacity ${BOOT_FADE_MS}ms cubic-bezier(.4, 0, .2, 1);
}
.fs-cinema.is-leaving { opacity: 0; pointer-events: none; }
.fs-cinema video {
  display: block; width: 100%; height: 100%; object-fit: cover;
  background: #000;
}
.fs-cinema::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 54%, rgba(0, 0, 0, .46) 100%);
}
.fs-controls {
  position: absolute; right: clamp(16px, 3vw, 40px); bottom: clamp(14px, 2.4vw, 30px);
  z-index: 2; display: flex; align-items: center; gap: 9px;
  opacity: 0; transition: opacity 500ms ease;
}
.fs-controls.is-ready { opacity: .72; }
.fs-controls:hover { opacity: 1; }
.fs-btn {
  appearance: none; cursor: pointer;
  padding: 7px 14px; border-radius: 999px;
  corner-shape: round;
  border: 1px solid rgba(201, 220, 255, .24);
  background: rgba(8, 17, 38, .44); color: rgba(233, 242, 255, .9);
  font: inherit; font-size: 11px; line-height: 1; letter-spacing: .16em;
  text-transform: uppercase; backdrop-filter: blur(9px);
  transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
}
.fs-btn:hover { border-color: rgba(147, 179, 255, .64); background: rgba(20, 37, 78, .64); color: #fff; }
.fs-btn:focus-visible { outline: 2px solid #7f9cff; outline-offset: 3px; }

.fs-aura {
  position: absolute; inset: -28%; border-radius: 50%;
  corner-shape: round;
  background: radial-gradient(circle, rgba(103, 139, 255, .22) 0%, rgba(63, 90, 218, .10) 42%, transparent 70%);
  filter: blur(16px);
  animation: fs-aura 5.6s ease-in-out infinite;
}
.fs-orb { position: relative; display: block; width: 100%; height: 100%; overflow: visible; }
.fs-orb .fs-gear { transform-box: view-box; transform-origin: 300px 300px; animation: fs-gear-spin 18s linear infinite; }
.fs-orb .fs-iris-spin { transform-box: view-box; transform-origin: 300px 300px; animation: fs-iris-spin 12s linear infinite; }
.fs-orb .fs-iris { transform-box: view-box; transform-origin: 300px 300px; animation: fs-iris-pulse 8s ease-in-out infinite; }
.fs-orb .fs-pupil { transform-box: view-box; transform-origin: 300px 300px; animation: fs-pupil-pulse 4s ease-in-out infinite; }
.fs-orb .fs-highlight {
  transform-box: view-box; transform-origin: 372px 372px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, .9));
  animation: fs-highlight-twinkle 3s ease-in-out infinite, fs-highlight-jump 7s ease-in-out infinite;
}
/*
 * Global motion: the eye blinks and the core breathes a halo whenever the
 * console is up, with no streaming marker required.
 */
.fs-orb .fs-lid {
  animation: fs-lid-blink 7s cubic-bezier(.45, 0, .3, 1) 1.2s infinite;
}
/* Slow lid: ~0.7s to close, ~2s held shut, ~0.7s to open again. */
@keyframes fs-lid-blink {
  0%, 45% { transform: translateY(-380px); }
  50% { transform: translateY(-150px); }
  55%, 83% { transform: translateY(0); }
  93%, 100% { transform: translateY(-380px); }
}
/*
 * The halo sits beside the core instead of inside .fs-hero-orb: that element
 * carries a drop-shadow filter, and its filter region would crop a travelling
 * ring into a rounded square. Out here the ring stays a true circle at every
 * scale.
 */
.fs-halo {
  position: absolute;
  left: 50%;
  top: var(--hdd-orb-top);
  width: var(--hdd-orb-size);
  height: var(--hdd-orb-size);
  transform: translateX(-50%);
  pointer-events: none;
}
.fs-halo::before,
.fs-halo::after {
  content: "";
  position: absolute;
  inset: -6%;
  border-radius: 50%;
  corner-shape: round;
  background: radial-gradient(circle,
    rgba(236, 243, 255, 0) 58%,
    rgba(236, 243, 255, .18) 67%,
    rgba(240, 246, 255, .55) 74%,
    rgba(236, 243, 255, .16) 81%,
    rgba(236, 243, 255, 0) 90%);
  filter: blur(1.5px);
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
  animation: fs-halo-ring 2.6s cubic-bezier(.22, .6, .3, 1) infinite;
}
.fs-halo::after { animation-delay: 1.3s; }
@keyframes fs-halo-ring {
  0% { transform: scale(.92); opacity: 0; }
  16% { opacity: .5; }
  68% { opacity: .16; }
  100% { transform: scale(1.55); opacity: 0; }
}

/* =====================================================================
   Fairy H.D.D. skin — the dark blue console shown after the boot film.
   Every selector is scoped to html[data-hdd-skin], so disabling the
   bundle restores the untouched app theme.
   ===================================================================== */
:root[data-hdd-skin] {
  /* Noto Sans SC ships with Windows as a variable face: one family covers the
     light label cut and the heavy conversation cut without synthesised bold. */
  --hdd-display-font: "Segoe UI", "Noto Sans SC", "Microsoft YaHei UI", "Microsoft YaHei", "Arial", sans-serif;
  --hdd-orb-size: clamp(180px, min(22.5vw, 33vh), 330px);
  --hdd-orb-top: 42px;
  --hdd-chat-top: calc(var(--hdd-orb-size) + 16px);
  --hdd-line: rgba(196, 205, 218, .55);
  /* How far above the reserved band the message text starts dissolving. */
  --hdd-chat-fade: 200px;
  --hdd-chat-fade-from: max(0px, calc(var(--hdd-chat-top) - var(--hdd-chat-fade)));
  color-scheme: dark;
}
html[data-hdd-skin] { background: #04060d !important; }
html[data-hdd-skin] body {
  /* One typeface across the console; the heavy cut is reserved for the
     nameplate and controls, body copy keeps a readable regular weight. */
  /* Latin runs on Segoe UI (rounded humanist terminals), CJK on Noto Sans SC. */
  --dsw-font-family: "Segoe UI", "Noto Sans SC", "Microsoft YaHei UI", "Microsoft YaHei", "Arial", sans-serif !important;
  --dsw-alias-bg-base: #05070e !important;
  --dsw-alias-bg-layer-1: #070b14f2 !important;
  --dsw-alias-bg-layer-2: #0a1020e8 !important;
  --dsw-alias-bg-layer-3: #0c1428f2 !important;
  --dsw-alias-bg-overlay: #070b14fa !important;
  --dsw-alias-brand-primary: #5b7cff !important;
  --dsw-alias-brand-text: #eaf1ff !important;
  --dsw-alias-link: #91a9ff !important;
  --dsw-alias-label-primary: #eaf1ff !important;
  --dsw-alias-label-secondary: #adc0e2 !important;
  --dsw-alias-label-tertiary: #8196bb !important;
  --dsw-alias-label-caption: #6f84a8 !important;
  --dsw-alias-border-l1: #16233c99 !important;
  --dsw-alias-border-l2: #1d3050aa !important;
  --dsw-alias-border-l3: #2a4270cc !important;
  --dsw-alias-button-primary-fill: #5b7cff !important;
  --dsw-alias-button-primary-hover: #7893ff !important;
  --dsw-focus-ring-color: #6d8cff !important;
  /* The desktop shell measures this var to paint the Windows caption overlay,
     so it carries the title-strip tone instead of the old near-black. */
  --dsw-specific-sidebar-fill: #3b4048 !important;
  --dsw-alias-interactive-bg-hover: rgba(103, 139, 255, .10) !important;
  --dsw-alias-interactive-bg-hover-danger: rgba(255, 96, 128, .12) !important;
  --dsw-alias-scrollbar-bg-l2: #1b2942 !important;
  --dsw-alias-scrollbar-hover-l2: #2a4168 !important;
  color: #dbe6ff !important;
  background: #05070e !important;
}
html[data-hdd-skin] .BynINW_frame {
  background:
    linear-gradient(rgba(92, 128, 255, .048) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 128, 255, .048) 1px, transparent 1px),
    radial-gradient(900px 620px at 58% 4%, rgba(54, 88, 230, .13), transparent 62%),
    radial-gradient(720px 560px at 18% 104%, rgba(38, 66, 185, .10), transparent 66%),
    #05070e !important;
  background-size: 22px 22px, 22px 22px, auto, auto, auto !important;
}
html[data-hdd-skin] .BynINW_frame:before {
  /* Title strip: a solid slab, deeper than the rail so the two never merge. */
  /* Solid, so the native caption overlay (fed the same tone) meets it seamlessly. */
  background: #3b4048 !important;
  border-bottom: 1px solid rgba(0, 0, 0, .55) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol {
  background:
    linear-gradient(rgba(92, 128, 255, .034) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 128, 255, .034) 1px, transparent 1px),
    linear-gradient(180deg, rgba(7, 12, 24, .93), rgba(4, 7, 14, .97)) !important;
  background-size: 22px 22px, 22px 22px, auto !important;
  border-right: 1px solid rgba(91, 124, 220, .16) !important;
}
html[data-hdd-skin] ._2H3hWW_root {
  background: transparent !important;
  color: #dfe9ff !important;
}
html[data-hdd-skin] :is([data-slot="main"], [data-slot="main.conversation"], .V4vHZW_root, .V4vHZW_frame, .V4vHZW_scroll, .V4vHZW_scroll, .V4vHZW_column, .V4vHZW_root, .V4vHZW_scroll, .V4vHZW_column) {
  background: transparent !important;
}
/*
 * Conversation backdrop — the artwork rides on the conversation column itself.
 *
 * Two things made the old arrangement show a dark band at the foot of the
 * screen once the list was scrolled to the bottom, and neither of them was the
 * picture. The host paints a --dsw-alias-bg-base gradient on the composer seat
 * (transparent at 0px, solid from 36px) and pins the seat to the foot of the
 * column with margin-top:auto, so the seat covered the last 147px of the
 * column with a solid slab. The picture itself hung on this same column, which
 * is the right surface: it is a layout cell, not a scroller, and its box
 * already reaches the window's bottom edge.
 *
 * So the picture stays where it was and the seat stops painting — see the
 * composer stylesheet below. The anchor is written as
 * [data-slot="main.conversation"] > [data-phase] because the two slot wrappers
 * around the column are display:contents and own no box at all; the stable
 * attribute on the element that does is data-phase.
 */
html[data-hdd-skin] body {
  background: transparent !important;
}
html[data-hdd-skin] #root,
html[data-hdd-skin] :is([data-conversation-scroll], [data-conversation-content], [data-conversation-session]) {
  background-color: transparent !important;
  background-image: none !important;
}
html[data-hdd-skin] [data-slot="main.conversation"] > [data-phase] {
  background-color: #04060d;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: 50% 14%;
}
html[data-hdd-skin] .an3WzG_header {
  background: transparent !important;
  border-bottom: 1px solid rgba(91, 124, 220, .13) !important;
  backdrop-filter: none !important;
}
html[data-hdd-skin] ._2H3hWW_newSession {
  background: linear-gradient(180deg, rgba(12, 22, 43, .90), rgba(7, 14, 28, .92)) !important;
  border: 1px solid rgba(103, 139, 255, .30) !important;
  border-radius: 8px !important;
  color: #dfe9ff !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05), 0 0 18px rgba(70, 110, 255, .08) !important;
}
html[data-hdd-skin] ._2H3hWW_newSession:hover {
  border-color: rgba(125, 158, 255, .62) !important;
  background: rgba(16, 31, 60, .94) !important;
}
html[data-hdd-skin] ._2H3hWW_panelRow,
html[data-hdd-skin] ._9lTDKa_sessionRow {
  border-radius: 6px !important;
}
html[data-hdd-skin] ._2H3hWW_panelRow:hover,
html[data-hdd-skin] ._9lTDKa_sessionRow:hover {
  background: rgba(103, 139, 255, .07) !important;
}
html[data-hdd-skin] ._9lTDKa_sessionRow[aria-current="true"],
html[data-hdd-skin] ._9lTDKa_sessionRow[data-active="true"] {
  border: 1px solid rgba(103, 139, 255, .28) !important;
  background: rgba(41, 70, 145, .18) !important;
}
html[data-hdd-skin] .cJsG2q_bubble {
  background: linear-gradient(135deg, #1d5da6, #15457c) !important;
  border: 1px solid rgba(110, 168, 255, .32) !important;
  border-radius: 18px !important;
  color: #f4f9ff !important;
  padding: 10px 18px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 255, 255, .10) !important;
  font-size: 15px !important;
}
html[data-hdd-skin] .cJsG2q_contextRow {
  color: #b9cdf0 !important;
  font-size: 14px !important;
  opacity: .85;
}
html[data-hdd-skin] .cJsG2q_contextRow svg { color: #a8c4ff !important; }
html[data-hdd-skin] .V4vHZW_column {
  color: #eaf2ff !important;
  font-weight: 550;
  /* A hair of soft edge: rounds the terminals without smearing the glyphs. */
  text-shadow: 0 0 .5px rgba(234, 242, 255, .60);
  letter-spacing: .008em;
}
html[data-hdd-skin] :is(.cJsG2q_bubble, .RlGAzG_input, ._3GBCTG_thinkBody) { font-weight: 500; }
html[data-hdd-skin] :is(.V4vHZW_column h1, .V4vHZW_column h2, .V4vHZW_column h3, .V4vHZW_column strong, .V4vHZW_column b) { font-weight: 700; }
html[data-hdd-skin] .V4vHZW_column :is(p, li) { color: #eaf2ff !important; }
html[data-hdd-skin] ._3GBCTG_title,
html[data-hdd-skin] ._3GBCTG_summaryText { color: #a9c1e8 !important; }
/*
 * The composer seat is not a surface. It used to paint the grey rail it rides
 * on; it is now transparent in every state, so the artwork passes underneath
 * the capsule and the input area has no foot of its own. The capsule keeps its
 * own glass — see the composer stylesheet at the end of this file.
 */
/*
 * New-session screen: drop whatever width cap the app puts on its hero
 * composer, and nothing else. No forced width, no margins — the capsule then
 * fills exactly the space the chat screen gives it, which is the parity asked
 * for. Forcing width here is what broke the layout earlier.
 */
html[data-hdd-skin] :is(.V4vHZW_root[data-phase="hero"], .V4vHZW_frame[data-content-phase="hero"]) .an3WzG_composerSeat [class*="_card"] {
  max-width: none !important;
}
/* Any trailing spacer inside the seat loses its own margins too. */
html[data-hdd-skin] .an3WzG_composerSeat > :last-child {
  margin-top: 2px !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}
/*
 * New-session (hero) state: the app centers the composer seat in the
 * scrollport, which drops it straight onto the H.D.D. wordmark. Dock the seat
 * at the bottom of the column instead — the seat keeps its own 32px hero
 * padding — and keep the hero copy clear of the input.
 */
html[data-hdd-skin] :is(.V4vHZW_root[data-phase="hero"], .V4vHZW_frame[data-content-phase="hero"]) .V4vHZW_scroll {
  justify-content: flex-start;
}
html[data-hdd-skin] :is(.V4vHZW_root[data-phase="hero"], .V4vHZW_frame[data-content-phase="hero"]) .an3WzG_composerSeat {
  margin-top: auto;
}
/* Hero composer width is left to the app: forcing 100% on its wrapper crushed
   the capsule against the window edge and hid it behind the bottom seam. */
/*
 * Frame depth. Both grey rails now read as physical slabs instead of flat
 * fills: one radius variable rounds all four corners, the rim is built from a
 * light hairline on top, a dark one underneath and a shadow that falls away
 * from the seam, and each edge facing the conversation carries a short
 * gradient so the surface turns away instead of stopping dead.
 */
html[data-hdd-skin] .BynINW_sidebarCol {
  --hdd-frame-radius: 16px;
  position: relative;
  border-radius: var(--hdd-frame-radius) !important;
  background-clip: padding-box !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .13),
    inset 0 -1px 0 rgba(0, 0, 0, .40),
    inset 1px 0 0 rgba(255, 255, 255, .07),
    inset -1px 0 0 rgba(0, 0, 0, .32),
    0 12px 28px -16px rgba(0, 0, 0, .58) !important;
}
/* The rail is flush with the window edge, so its corners go back to square:
   rounding them only ate into the frame and left slivers of backdrop showing
   at the top-left and bottom-left. The composer keeps its radius. */
html[data-hdd-skin] .BynINW_sidebarCol {
  border-radius: 0 !important;
}
/* The composer's top seam: the picture hands over to the rail through a short
   falloff, and the rail's own top rim carries the highlight. */
html[data-hdd-skin] .RlGAzG_card {
  background: linear-gradient(180deg, rgba(10, 20, 40, .96), rgba(6, 12, 24, .97)) !important;
  border: 1px solid rgba(102, 138, 255, .27) !important;
  border-radius: 18px !important;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, .55),
    inset 0 1px 0 rgba(255, 255, 255, .06),
    0 0 38px rgba(60, 95, 255, .10) !important;
}
html[data-hdd-skin] .RlGAzG_card:focus-within {
  border-color: rgba(120, 154, 255, .62) !important;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, .62),
    0 0 0 1px rgba(103, 139, 255, .28),
    0 0 44px rgba(60, 95, 255, .16) !important;
}
/* Composer frame. The input bar's CSS-module hash moved to GRgSLq; both the
   current and the older RlGAzG names are carried so the frame survives a shell
   rebuild. Shape: a soft glass capsule, one hairline, no heavy outline. */
html[data-hdd-skin] :is(.GRgSLq_card, .RlGAzG_card) {
  position: relative;
  /* No overflow:hidden and no isolation here: both trap the composer's own
     popovers (the + menu is a fixed-position layer anchored to this card).
     The liquid layer below is kept inside the radius on its own. */
  overflow: visible;
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .12) 0%, rgba(255, 255, 255, .03) 22%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(160deg, rgba(57, 120, 237, .44) 0%, rgba(25, 52, 153, .54) 52%, rgba(9, 18, 52, .66) 100%) !important;
  /* No backdrop blur: it re-samples everything behind the capsule, and during a
     conversation switch that content repaints continuously — the single most
     expensive thing on this surface. The tint below carries the look instead. */
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid rgba(110, 150, 245, .22) !important;
  border-top-color: rgba(196, 214, 255, .38) !important;
  border-radius: 20px !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .14),
    inset 0 -16px 28px -24px rgba(0, 0, 0, .55),
    0 18px 44px rgba(0, 0, 0, .46),
    0 2px 8px rgba(0, 0, 0, .30),
    0 0 34px rgba(92, 132, 255, .10) !important;
  transition: border-color 200ms ease, box-shadow 240ms ease;
}
/* Same liquid as the rail cards, so the capsule and the sidebar are visibly
   one material. --hdd-liquid-* is shared, so dimming it once dims both. */
/*
 * The "+" menu (input-trigger) is rendered inside the conversation tree and is
 * clipped by the conversation frame and its scroller. A :has() rule could not
 * tell "menu mounted" from "menu actually open" — it stayed on and killed
 * scrolling — so the clip is released only while the guard in apply() has
 * measured a real popover on screen and set data-hdd-menu-open.
 */
html[data-hdd-skin][data-hdd-menu-open] [class*="_root"][data-phase="active"] {
  overflow: visible !important;
}
/*
 * These two used to be released unconditionally, which quietly disabled the
 * scrolling *inside* an approval or ask-me card: the card grew to full height
 * instead of scrolling, so its 拒绝 / 允许 row ended up below the window with
 * nothing able to reach it. They belong to the popover treatment, so they now
 * follow it.
 */
html[data-hdd-skin][data-hdd-menu-open] [class*="_composerStack"],
html[data-hdd-skin][data-hdd-menu-open] [class*="_composerSeat"] {
  overflow: visible !important;
}
/* The measured clipper: the popover's top edge lands exactly on the scroll
   body's frame, so that frame clips it. The 11px padding replaces the
   scrollbar gutter (our own ::-webkit-scrollbar width) that disappears with
   the overflow, so nothing changes width while the menu is open. */
html[data-hdd-skin][data-hdd-menu-open] [class*="_scrollBody"] {
  overflow: visible !important;
  padding-right: 11px !important;
}
/*
 * Tall cards: hands off. Capping their height and adding an inner scroller made
 * the shell's own scroll position (it sits at the newest part) hide the top of
 * the card — an ask-me card opened mid-sentence. The shell already knows how to
 * size these; the skin only has to stop clipping the popover of the "+" menu.
 */
html[data-hdd-skin] :is(.GRgSLq_card, .RlGAzG_card)::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(42% 58% at 24% 26%, var(--hdd-liquid-1), transparent 72%),
    radial-gradient(38% 50% at 76% 64%, var(--hdd-liquid-2), transparent 74%),
    radial-gradient(46% 62% at 52% 88%, var(--hdd-liquid-3), transparent 76%),
    radial-gradient(26% 34% at 62% 34%, var(--hdd-liquid-4), transparent 78%);
  /* Static: an animated layer here keeps the compositor busy for no visible
     gain, since the capsule is mostly covered by its own text and toolbar. */
  animation: none !important;
}
html[data-hdd-skin] :is(.GRgSLq_card, .RlGAzG_card):focus-within {
  border-color: rgba(160, 192, 255, .34) !important;
  border-top-color: rgba(236, 246, 255, .40) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .14),
    inset 0 -16px 28px -24px rgba(0, 0, 0, .50),
    0 20px 48px rgba(0, 0, 0, .48),
    0 0 0 1px rgba(124, 158, 255, .18),
    0 0 40px rgba(96, 138, 255, .16) !important;
}
html[data-hdd-skin] :is(.GRgSLq_input, .RlGAzG_input) { color: #e7efff !important; caret-color: #7d9cff !important; }
html[data-hdd-skin] :is(.GRgSLq_placeholder, .RlGAzG_placeholder) { color: #7389ad !important; }
/* Round controls inside the capsule. */
html[data-hdd-skin] :is(.GRgSLq_add, .GRgSLq_primary, .RlGAzG_add) {
  border-radius: 50% !important;
  corner-shape: round;
}
html[data-hdd-skin] .RlGAzG_placeholder { color: #6f84aa !important; }
html[data-hdd-skin] .RlGAzG_add { color: #93a8cd !important; }
html[data-hdd-skin] ._2WTFBq_bar { background: rgba(103, 139, 255, .12) !important; }
html[data-hdd-skin] ::selection { background: rgba(103, 139, 255, .30); color: #f4f8ff; }
/*
 * Scrollbars sit on top of the artwork now, so the old solid track (#060a12)
 * read as a painted stripe running the full height of the panel and collided
 * with the panel's own edge. The track is transparent, the thumb is a floating
 * pill inset 3px from every side (the transparent border plus background-clip
 * is what does the insetting), and the gutter is reserved so the bar appearing
 * never nudges the message column sideways.
 */
html[data-hdd-skin] ::-webkit-scrollbar { width: 11px; height: 11px; }
html[data-hdd-skin] ::-webkit-scrollbar-track { background: transparent; }
html[data-hdd-skin] ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(122, 152, 232, .46), rgba(74, 104, 190, .34));
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  min-height: 40px;
}
html[data-hdd-skin] ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(152, 180, 255, .66), rgba(96, 128, 220, .50));
  background-clip: padding-box;
}
html[data-hdd-skin] ::-webkit-scrollbar-thumb:active {
  background: linear-gradient(180deg, rgba(178, 200, 255, .78), rgba(112, 146, 236, .62));
  background-clip: padding-box;
}
html[data-hdd-skin] ::-webkit-scrollbar-corner { background: transparent; }
/* Reserve the gutter only where the conversation list lives, so the column does
   not jump a few pixels the moment a long answer makes the bar appear. */
html[data-hdd-skin] body:has(.V4vHZW_root) :is(.V4vHZW_scroll, .V4vHZW_scroll) {
  scrollbar-gutter: stable;
}

/* The console chrome shares the nameplate family at semibold. Body copy and
   conversation text keep their regular weight so long passages stay readable. */
html[data-hdd-skin] :is(button, [role="button"], [role="tab"], summary) {
  font-family: var(--hdd-display-font);
  font-weight: 600;
}
html[data-hdd-skin] :is(._2H3hWW_newSession, ._9lTDKa_sessionRow, ._2H3hWW_panelRow) {
  font-weight: 600;
}

/* Heavy rounded region outlines from the reference. The sidebar brand cell
   and the conversation trajectory stay unoutlined. */
html[data-hdd-skin] .BynINW_sidebarCol {
  border-right-width: 2px !important;
  border-right-color: var(--hdd-line) !important;
}
html[data-hdd-skin] ._2H3hWW_newSession {
  border-width: 2px !important;
  border-radius: 12px !important;
  border-color: var(--hdd-line) !important;
}
html[data-hdd-skin] ._9lTDKa_root {
  border-radius: 16px;
  box-shadow:
    inset 0 0 0 2px var(--hdd-line),
    inset 0 0 0 4px rgba(0, 0, 0, .12);
}
html[data-hdd-skin] ._2H3hWW_footArea {
  border-top: none !important;
}
html[data-hdd-skin] ._2WTFBq_panel {
  border-radius: 14px;
  box-shadow:
    inset 0 0 0 2px var(--hdd-line),
    inset 0 0 0 4px rgba(0, 0, 0, .10);
}
html[data-hdd-skin] .an3WzG_header {
  border-bottom: none !important;
}
html[data-hdd-skin] .an3WzG_tab {
  border-radius: 12px !important;
}
html[data-hdd-skin] .RlGAzG_card {
  border-width: 2px !important;
  border-radius: 22px !important;
  border-color: var(--hdd-line) !important;
}

/* Workspace only — same 2px gray line and rounded treatment as the other
   framed regions, so the sidebar does not use a one-off border style. */
html[data-hdd-skin] ._9lTDKa_root {
  padding-left: 2px !important;
  padding-right: 2px !important;
  box-shadow: none !important;
}
html[data-hdd-skin] ._9lTDKa_listArea {
  position: relative;
  margin-right: 0 !important;
  border: none !important;
  outline: none !important;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: none !important;
}
/* A single 2px line only: no glow, no second inner edge, no double frame. */
html[data-hdd-skin] ._9lTDKa_listArea::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 20;
  box-sizing: border-box;
  border: 2px solid var(--hdd-line);
  border-radius: inherit;
  pointer-events: none;
}
html[data-hdd-skin] ._9lTDKa_list :is(button, [role="button"])[aria-current="true"],
html[data-hdd-skin] ._9lTDKa_list :is(button, [role="button"])[aria-selected="true"],
html[data-hdd-skin] ._9lTDKa_list :is(button, [role="button"])[data-active="true"] {
  background: linear-gradient(180deg, rgba(56, 96, 190, .62), rgba(36, 64, 132, .68)) !important;
  border: 1px solid rgba(196, 205, 218, .38) !important;
  border-radius: 9px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06) !important;
}
.fs-root .fs-btn {
  font-family: var(--hdd-display-font);
  font-weight: 700;
}

/* ---- the real sidebar brand, replaced through its slots ---- */
.fs-brand-mark {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  filter: drop-shadow(0 0 9px rgba(88, 126, 255, .55));
}
.fs-brand-mark .fs-orb { width: 100%; height: 100%; }
.fs-brand-mark .fs-gear,
.fs-brand-mark .fs-iris-spin,
.fs-brand-mark .fs-iris,
.fs-brand-mark .fs-pupil,
.fs-brand-mark .fs-highlight { animation: none !important; }
.fs-brand-copy {
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0; line-height: 1;
  text-align: left;
}
.fs-brand-title {
  font-family: var(--hdd-display-font);
  font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: .012em;
  color: #f2f7ff;
}
.fs-brand-tag {
  font-family: var(--hdd-display-font);
  font-size: 8px; font-weight: 600; line-height: 1.2; letter-spacing: .12em;
  color: rgba(157, 181, 224, .70); white-space: nowrap;
  text-transform: uppercase;
}
html[data-hdd-skin] ._2H3hWW_brandName { height: auto !important; }

html[data-hdd-skin] ._2H3hWW_brandIdentity {
  height: 36px !important;
  overflow: visible !important;
}
/* Expanded sidebar: give the Fairy core more presence without changing the row. */
html[data-hdd-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandIdentity {
  height: 40px !important;
}
html[data-hdd-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandMark {
  width: 38px !important;
  height: 38px !important;
}

/* The shell owns the two brand single-slots, so the animated core is painted
   into the shipped cell: the whale stays in the tree but is hidden, and the
   core plus its halo replace it. */
html[data-hdd-skin] ._2H3hWW_brandMark {
  position: relative;
  width: 30px !important; height: 30px !important;
  flex: none;
  border-radius: 50%;
  corner-shape: round;
  overflow: visible;
  /* The static core doubles as the first paint and as the fallback when the
     live SVG cannot mount; the live core covers it pixel for pixel. */
  background: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjI3MCIgZmlsbD0iIzM5NzhlZCIgb3BhY2l0eT0iLjM1Ii8+PGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSIyNjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzM5NzhlZCIgc3Ryb2tlLXdpZHRoPSIxNCIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iMjY2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNiIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iMjIwIiBmaWxsPSIjMTkzNDk5Ii8+PHBhdGggZD0iTTMwMCA1MCAzMzggMTA1IDI2MiAxMDVaTTU1MCAzMDAgNDk1IDMzOCA0OTUgMjYyWk0zMDAgNTUwIDI2MiA0OTUgMzM4IDQ5NVpNNTAgMzAwIDEwNSAyNjIgMTA1IDMzOFoiIGZpbGw9IiMxOTM0OTkiLz48Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjE4MCIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iMTMyIiBmaWxsPSIjYjRjNGVlIi8+PGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSI5NiIgZmlsbD0iIzQyODVlOCIvPjxjaXJjbGUgY3g9IjMwMCIgY3k9IjMwMCIgcj0iNjAiIGZpbGw9IiMxNzMwODIiLz48Y2lyY2xlIGN4PSIzNzIiIGN5PSIzNzIiIHI9IjQyIiBmaWxsPSIjZmZmIi8+PC9zdmc+") center / contain no-repeat;
}
/* Only the static core needs a box glow; the live core carries a drop shadow
   that follows its own outline. */
html[data-hdd-skin] ._2H3hWW_brandMark:not(:has(> .fs-brand-live)) {
  box-shadow: 0 0 5px rgba(92, 130, 255, .36);
}
html[data-hdd-skin] ._2H3hWW_brandMark > :not(.fs-brand-live) { display: none !important; }
/* The logo row and its brand button clip their overflow, which used to slice
   the halo flat above and below the mark. Open the chain so the glow can fade
   naturally instead of ending on a straight edge. */
html[data-hdd-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_logoRow,
html[data-hdd-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brand,
html[data-hdd-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandIdentity {
  overflow: visible !important;
}
/* A drop shadow follows the orb's own alpha, so the halo is a clean circle
   instead of a box shadow squeezed into a square cell. */
.fs-brand-live {
  position: relative;
  display: block;
  width: 100%; height: 100%;
  filter: drop-shadow(0 0 4px rgba(126, 156, 255, .55));
}
/* The tiny cell gets rotation only: gear, iris and a slow pupil pulse. */
.fs-brand-live .fs-gear { animation: fs-gear-spin 18s linear infinite !important; }
.fs-brand-live .fs-iris-spin { animation: fs-iris-spin 24s linear infinite !important; }
.fs-brand-live .fs-iris { animation: fs-iris-pulse 8s ease-in-out infinite !important; }
.fs-brand-live .fs-orb { position: relative; display: block; width: 100%; height: 100%; overflow: visible; }
html[data-hdd-skin] ._2H3hWW_brandMark.has-live-core {
  background: none !important;
  box-shadow: none !important;
}

/* Keep the enlarged core winning over the 30px fallback above. */
html[data-hdd-skin] ._2H3hWW_root:not(._2H3hWW_collapsed) ._2H3hWW_brandMark {
  width: 38px !important;
  height: 38px !important;
}

html[data-hdd-skin] ._2H3hWW_brandName {
  display: flex !important;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  height: auto !important;
  overflow: visible !important;
}
html[data-hdd-skin] ._2H3hWW_brandName > [data-slot="sidebar.brand.name"] { display: none !important; }
html[data-hdd-skin] ._2H3hWW_brandName::before {
  content: "Fairy";
  font-family: var(--hdd-display-font);
  font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: .012em;
  color: #f2f7ff;
}
html[data-hdd-skin] ._2H3hWW_brandName::after {
  content: "空洞深潜系统";
  font-family: var(--hdd-display-font);
  font-size: 8px; font-weight: 600; line-height: 1.2; letter-spacing: .12em;
  color: rgba(157, 181, 224, .70);
  white-space: nowrap;
}

html[data-hdd-skin] body:has(.V4vHZW_root[data-phase="hero"]) .an3WzG_headerUtilities { opacity: 0; pointer-events: none; }

/* ---- HOLLOW DEEP DIVE SYSTEM hero, only in the no-session state ---- */
.fs-hero {
  position: fixed;
  /* The stage is glued to the conversation column, not to the window: opening
     the right task panel or collapsing the left sidebar moves it. client.js
     writes these two properties from better-sidebar's [data-dsh-center-col]. */
  left: var(--hdd-stage-left, var(--dsh-sidebar-width, 280px));
  right: var(--hdd-stage-right, 0px);
  top: var(--dsh-windows-titlebar-height, 0px);
  bottom: 0;
  z-index: 2147482100;
  display: none;
  overflow: hidden;
  pointer-events: none;
}
html[data-hdd-skin] body:has(.V4vHZW_root[data-phase="hero"]) .fs-hero { display: block; }
/* A real chat keeps the same large core as the new-conversation screen;
   only the caption copy is dropped. The chat viewport is shortened below the
   core instead of replacing it with a second, smaller icon. */
html[data-hdd-skin] body:has(.V4vHZW_root) .fs-hero {
  display: block !important;
}
html[data-hdd-skin] body:has(.V4vHZW_root) .fs-hero-copy {
  display: none !important;
}
/* A live chat gets a compact core that sits below the session header rather
   than the poster-sized one used on the new-conversation screen. The size is
   proportional to the window, so maximizing or restoring the window scales the
   icon with the console instead of leaving a fixed slab in the middle. */
html[data-hdd-skin] body:has(.V4vHZW_root) {
  --hdd-orb-size: clamp(150px, min(19vw, 25vh), 320px);
  /* The header (title row + 对话/轨迹 tabs) is 76px tall by default; start the
     core just under that rule instead of inside it. */
  --hdd-orb-top: 90px;
  /* The chat port starts 72px under the core, so the dissolve happens below
     the icon instead of disappearing behind it. */
  --hdd-chat-top: calc(var(--hdd-orb-size) + 86px);
  --hdd-chat-fade: 88px;
}
/* The band is a margin on the scrollport instead of padding inside the
   scrolled content: the chat engine measures that content and re-anchors the
   view when it is pushed from the inside. With the port itself shortened, the
   engine sees an ordinary, smaller viewport. */
html[data-hdd-skin] body:has(.V4vHZW_root) .V4vHZW_scroll {
  margin-top: var(--hdd-chat-top);
}
/*
 * The dissolve band is off. It was built for a flat black console; over the
 * artwork it read as a dirty smear across the middle of the conversation, so
 * the picture runs clean from top to bottom and the core simply floats above
 * it. Restore the old gradient if the flat console ever returns.
 */
html[data-hdd-skin] body:has(.V4vHZW_root) .V4vHZW_frame::after {
  content: none;
  display: none;
}
/* The app paints its own DeepSeek fish and headline copy on the new-session
   screen; the console already stands a Fairy core and its own caption in that
   spot. Match readable suffixes so the rules survive the nightly re-hash, and
   let :has() limit the hit to the headline that actually owns the fish — the
   workspace picker beside it stays untouched. */
html[data-hdd-skin] body:has([data-phase="hero"]) [class*="_fishHitbox"],
html[data-hdd-skin] body:has([data-phase="hero"]) [class*="_headline"]:has([class*="_fishHitbox"]) {
  display: none !important;
}
/* The ambient bloom is a single circle painted by .fs-orb-glow. A gradient
   that reaches transparent before its own box edge cannot show a square cut. */
/* One bloom, one circle, no blur filter: the gradient is already soft and
   fades to nothing well inside its own box, so nothing can crop it square. */
.fs-orb-glow {
  position: absolute;
  left: 50%;
  top: calc(var(--hdd-orb-top) + var(--hdd-orb-size) / 2);
  width: calc(var(--hdd-orb-size) * 3);
  height: calc(var(--hdd-orb-size) * 3);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  corner-shape: round;
  background: radial-gradient(circle closest-side,
    rgba(96, 152, 255, .30) 0%,
    rgba(58, 108, 235, .16) 34%,
    rgba(34, 74, 200, .06) 58%,
    transparent 86%);
  pointer-events: none;
}
.fs-hero-orb {
  position: absolute;
  left: 50%; top: var(--hdd-orb-top);
  width: var(--hdd-orb-size); height: var(--hdd-orb-size);
  transform: translateX(-50%);
  filter: drop-shadow(0 0 30px rgba(78, 150, 255, .72));
}

.fs-hero-orb .fs-orb { position: relative; width: 100%; height: 100%; }

/* The same core geometry, stacked into a main layer and two chromatic ghosts.
   Short clipped bursts reproduce the video's scan-tear/RGB-split glitch. */
.fs-core-anim {
  position: relative;
  width: 100%; height: 100%;
  isolation: isolate;
  --fs-glitch-shift: 6px;
}
.fs-core-layer { position: absolute; inset: 0; pointer-events: none; }
.fs-core-layer .fs-orb { width: 100%; height: 100%; }
.fs-core-main {
  z-index: 3;
  animation: fs-core-glitch-main 7.2s steps(1, end) infinite;
}
.fs-core-main .fs-orb { animation: fs-core-breathe 4.8s ease-in-out infinite; }
.fs-core-ghost { z-index: 2; opacity: 0; mix-blend-mode: screen; }
.fs-core-red {
  filter: saturate(1.8) hue-rotate(-45deg) brightness(1.12);
  animation: fs-core-ghost-red 7.2s steps(1, end) infinite;
}
.fs-core-cyan {
  filter: saturate(1.8) hue-rotate(45deg) brightness(1.12);
  animation: fs-core-ghost-cyan 7.2s steps(1, end) infinite;
}
.fs-core-scan {
  position: absolute; inset: -4%;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
  background: repeating-linear-gradient(0deg, rgba(198, 224, 255, .22) 0 1px, transparent 1px 4px);
  mix-blend-mode: screen;
  animation: fs-core-scan 7.2s steps(1, end) infinite;
}
/* Both the hero and the sidebar cell receive the same phase from the
   client-side epoch, so their bursts hit on the same frame. */
.fs-core-main,
.fs-core-red,
.fs-core-cyan,
.fs-core-scan {
  animation-delay: var(--fs-glitch-phase, 0ms);
}
/* The 38px sidebar cell reads as noise if it gets the full-size glitch.
   Keep its timing synced, but use a small shift and no scan overlay. */
.fs-brand-core {
  --fs-glitch-shift: 1.4px;
}
.fs-brand-core .fs-core-scan { display: none; }
@keyframes fs-core-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
@keyframes fs-core-glitch-main {
  0%, 7%, 12%, 35%, 40%, 63%, 68%, 100% { transform: none; clip-path: none; opacity: 1; }
  8% { transform: translate(calc(var(--fs-glitch-shift) * -1), 0) skewX(1.2deg); clip-path: inset(12% 0 54% 0); }
  8.8% { transform: translate(var(--fs-glitch-shift), -1px); clip-path: inset(37% 0 33% 0); }
  9.6% { transform: translate(calc(var(--fs-glitch-shift) * -.6), 0) skewX(-1deg); clip-path: inset(63% 0 12% 0); }
  10.4% { transform: translate(calc(var(--fs-glitch-shift) * .35), 0); clip-path: inset(80% 0 3% 0); }
  36% { transform: translate(calc(var(--fs-glitch-shift) * -.8), 1px); clip-path: inset(22% 0 42% 0); }
  37.2% { transform: translate(calc(var(--fs-glitch-shift) * .9), 0); clip-path: inset(52% 0 18% 0); }
  38.4% { transform: translate(calc(var(--fs-glitch-shift) * -.4), -1px); clip-path: inset(72% 0 6% 0); }
  64% { transform: translate(calc(var(--fs-glitch-shift) * -.5), 0) skewX(.8deg); clip-path: inset(8% 0 62% 0); }
  65.2% { transform: translate(calc(var(--fs-glitch-shift) * .7), 1px); clip-path: inset(44% 0 26% 0); }
  66.4% { transform: translate(calc(var(--fs-glitch-shift) * -.3), 0); clip-path: inset(68% 0 9% 0); }
}
@keyframes fs-core-ghost-red {
  0%, 7.4%, 11.6%, 35.2%, 40%, 63.2%, 68%, 100% { opacity: 0; transform: none; clip-path: none; }
  8%, 8.8%, 9.6%, 36.2%, 37.4%, 64.4%, 65.6% {
    opacity: .55;
    transform: translate(calc(var(--fs-glitch-shift) * -1.35), 0);
    clip-path: inset(16% 0 48% 0);
  }
  10.4%, 38.6%, 66.8% {
    opacity: .36;
    transform: translate(calc(var(--fs-glitch-shift) * .8), 0);
    clip-path: inset(58% 0 12% 0);
  }
}
@keyframes fs-core-ghost-cyan {
  0%, 7.4%, 11.6%, 35.2%, 40%, 63.2%, 68%, 100% { opacity: 0; transform: none; clip-path: none; }
  8%, 8.8%, 9.6%, 36.2%, 37.4%, 64.4%, 65.6% {
    opacity: .55;
    transform: translate(calc(var(--fs-glitch-shift) * 1.35), 0);
    clip-path: inset(28% 0 38% 0);
  }
  10.4%, 38.6%, 66.8% {
    opacity: .36;
    transform: translate(calc(var(--fs-glitch-shift) * -.8), 0);
    clip-path: inset(68% 0 6% 0);
  }
}
@keyframes fs-core-scan {
  0%, 7%, 12%, 35%, 40%, 63%, 68%, 100% { opacity: 0; }
  8%, 9.6%, 36.2%, 38.4%, 64.4%, 66.4% { opacity: .32; }
  10.4% { opacity: .16; }
}
.fs-hero-copy {
  position: absolute; left: 50%; top: 62%;
  width: min(980px, 86%);
  transform: translate(-50%, -50%);
  text-align: center;
}
/* H.D.D. nameplate: the boot screen sets the line in a heavy, tightly
   tracked grotesque (Segoe UI Black), not the earlier hairline heading.
   The reflection below is part of the mark, so it stays legible. */
.fs-hero-title,
.fs-hero-reflection {
  font-family: var(--hdd-display-font);
  font-size: clamp(34px, 4.3vw, 64px);
  font-weight: 900;
  letter-spacing: .004em;
  line-height: 1;
  white-space: nowrap;
  font-synthesis: none;
}
/* Thick, faintly rounded wordmark: a gradient face, a soft stroke that
   rounds the terminals, and a ten-step extrusion in navy for real depth. */
.fs-hero-title {
  font-weight: 800;
  color: transparent;
  background: linear-gradient(180deg, #ffffff 0%, #f2f7ff 40%, #d8e5ff 72%, #b6ccf3 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 1.2px rgba(238, 246, 255, .40);
  text-shadow:
    0 -1px 0 rgba(255, 255, 255, .40),
    0 1px 0 #2a3f78,
    0 2px 0 #263a6f,
    0 3px 0 #223464,
    0 4px 0 #1e2f5b,
    0 5px 0 #1a2a52,
    0 6px 0 #162449,
    0 7px 0 #121e3f,
    0 8px 0 #0f1936,
    0 9px 0 #0b142c,
    0 10px 0 #080f23,
    0 16px 26px rgba(0, 0, 0, .55);
}
.fs-hero-rule {
  display: flex; align-items: center; gap: 16px;
  /* clears the 10px extrusion under the wordmark */
  margin-top: 18px;
}
.fs-hero-rule span {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(178, 204, 255, .50) 9%, rgba(214, 230, 255, .76) 50%, rgba(178, 204, 255, .50) 91%, transparent);
  box-shadow: 0 0 9px rgba(90, 126, 255, .26);
}
.fs-hero-rule em {
  flex: none;
  font-style: normal;
  font-size: 12px; line-height: 1;
  letter-spacing: .5em;
  padding-left: .5em;
  color: rgba(203, 220, 250, .78);
  white-space: nowrap;
  text-shadow: 0 0 12px rgba(82, 122, 255, .22);
}
.fs-hero-reflection {
  position: absolute; left: 0; right: 0; top: 100%;
  margin-top: 5px;
  color: rgba(158, 188, 248, .22);
  transform: scaleY(-1);
  filter: blur(.7px);
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .92), rgba(0, 0, 0, .48) 30%, transparent 64%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .92), rgba(0, 0, 0, .48) 30%, transparent 64%);
}

/* A single small core above an open chat, independent of header slots. */
.fs-chat-orb {
  position: fixed;
  /* Same stage as the hero core: centre of the conversation column, not of
     the window, so the compact chat core tracks the right task panel too. */
  left: calc(
    var(--hdd-stage-left, var(--dsh-sidebar-width, 280px)) +
    (100vw - var(--hdd-stage-left, var(--dsh-sidebar-width, 280px)) - var(--hdd-stage-right, 0px)) / 2
  );
  top: calc(var(--dsh-windows-titlebar-height, 0px) + 8px);
  width: 32px; height: 32px;
  transform: translateX(-50%);
  z-index: 2147482100;
  display: none;
  pointer-events: none;
  filter: drop-shadow(0 0 8px rgba(88, 126, 255, .55));
}
html[data-hdd-skin] body:has(.V4vHZW_root) .fs-chat-orb {
  display: block;
}
.fs-chat-orb .fs-orb { width: 100%; height: 100%; }
.fs-chat-orb .fs-gear,
.fs-chat-orb .fs-iris-spin,
.fs-chat-orb .fs-iris,
.fs-chat-orb .fs-pupil,
.fs-chat-orb .fs-highlight { animation: none !important; }

/* Chat header: icon-only Fairy core, no H.D.D. wordmark. */
.fs-header-orb {
  display: inline-flex;
  width: 24px; height: 24px;
  flex: none;
  align-items: center; justify-content: center;
  align-self: center;
  margin-inline: 2px 4px;
  pointer-events: none;
  filter: drop-shadow(0 0 6px rgba(88, 126, 255, .48));
}
.fs-header-orb .fs-orb { width: 100%; height: 100%; }
.fs-header-orb .fs-gear,
.fs-header-orb .fs-iris-spin,
.fs-header-orb .fs-iris,
.fs-header-orb .fs-pupil,
.fs-header-orb .fs-highlight { animation: none !important; }
@keyframes fs-aura {
  0%, 100% { opacity: .72; transform: scale(.97); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes fs-halo {
  0%, 100% { opacity: .8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.03); }
}
@keyframes fs-core {
  0%, 100% { opacity: .92; }
  50% { opacity: 1; }
}
@keyframes fs-sweep {
  0% { transform: rotate(0); opacity: 0; }
  8% { opacity: .4; }
  68% { opacity: .18; }
  92%, 100% { opacity: 0; }
}
@keyframes fs-orbit { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes fs-gear-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes fs-iris-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes fs-iris-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .85; transform: scale(1.04); }
}
@keyframes fs-pupil-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
@keyframes fs-highlight-twinkle {
  0%, 100% { opacity: .9; }
  50% { opacity: 1; }
}
@keyframes fs-highlight-jump {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(4px, 4px); }
}
/*
 * The rail's liquid field. Four stops, run alternately, so the drift never
 * repeats on a short cycle and never snaps back to its origin.
 */
@keyframes fs-liquid-drift {
  0%   { transform: translate3d(-5%, -3%, 0) rotate(-7deg) scale(1.04); }
  30%  { transform: translate3d(6%, 4%, 0) rotate(5deg) scale(1.16); }
  55%  { transform: translate3d(-3%, 7%, 0) rotate(-4deg) scale(1.09); }
  78%  { transform: translate3d(4%, -6%, 0) rotate(6deg) scale(1.13); }
  100% { transform: translate3d(-2%, 2%, 0) rotate(-3deg) scale(1.06); }
}


@media (max-height: 820px) and (min-width: 861px) {
  .fs-hero-copy { top: 60%; }
  .fs-hero-title,
  .fs-hero-reflection { font-size: clamp(30px, 3.7vw, 52px); }
  .fs-hero-reflection { mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .42) 26%, transparent 58%); -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .42) 26%, transparent 58%); }
}
@media (max-width: 860px) {
  :root[data-hdd-skin] { --hdd-orb-size: 120px; --hdd-orb-top: 38px; }
  .fs-hero-copy { top: 60%; width: 94%; }
  .fs-hero-title,
  .fs-hero-reflection { font-size: clamp(22px, 4.6vw, 34px); }
  .fs-hero-rule { margin-top: 8px; gap: 10px; }
  .fs-hero-rule em { font-size: 9px; letter-spacing: .34em; padding-left: .34em; }
  .fs-hero-reflection { mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .4) 28%, transparent 60%); -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, .9), rgba(0, 0, 0, .4) 28%, transparent 60%); }
}
@media (prefers-reduced-motion: reduce) {
  .fs-aura, .fs-orb .fs-gear, .fs-orb .fs-iris-spin,
  .fs-orb .fs-iris, .fs-orb .fs-pupil, .fs-orb .fs-highlight, .fs-orb .fs-lid,
  .fs-halo::before, .fs-halo::after {
    animation: none !important;
  }
  /* The rail still keeps its soft light, it just stops moving. */
  html[data-hdd-skin] .BynINW_sidebarCol :is(
    .wtg9ga_newSession, ._2H3hWW_newSession,
    .wtg9ga_panelList, ._2H3hWW_panelList,
    .GAkraW_listArea, ._9lTDKa_listArea
  )::before,
  html[data-hdd-skin] .fs-rail-stats::before {
    animation: none !important;
  }
  .fs-cinema { transition-duration: 1ms !important; }
}

/* =====================================================================
   Soft-light glass, iOS / HyperOS register — new-session button and the
   workspace pane. Layers, top to bottom: frosted grain, specular wash,
   diagonal sheen, tinted body. Backdrop blur supplies the milkiness.
   ===================================================================== */
html[data-hdd-skin] {
  --hdd-glass-grain: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAD3klEQVR42gXBWyhzcQAA8P///M9t56y8efPqRQkP8qI2OoVEkhIpHlxePHmwM1kSc87cNdawnYXtQSSpzSIvynUzm4Ncm3WYYy57+/icj+/3Q3a7nZ6bm0PZ2dmkIAg/ubm55NLSEsmy7L/FxUU8IyPjd3l5WZ+Tk/PX7XaTWVlZlNfrJViWxYeGhnAQCoWA2WxGl5eXOp7n9Y+Pj4TdbtfJskxbrVbm+vqaMplMTDgcpkRRJFOpFBQEgbi4uKBtNhtAmZmZutraWrCysvKvtbX1y+FwUCUlJX8DgcB3S0sLXF9fB2VlZVCW5W+O4+Dc3BxsbGzUgsEgbTQaNXB5eclaLBZwfHxMORwOLJVKIbvdTsuyzPb19ZHxeBxOTk6S5+fnQBRF/dvbG87zPDo7OyPdbjeD8vPzteLiYmxrawtVVFRoOzs7uNFoBF6v96u6uhrs7+/TBoPh8+DggKisrIRra2taW1sbsb29rZWWlmognU5jw8PD6OPjAw0MDGDpdJoeGBhg4vE45Xa7YSKRABaLBR4dHdGCIKCHhwd8ampKl0wmcafTiSEcx2FtbS0RDAaJ5uZmNDo6qtXV1WmSJGlVVVVEIBAAJSUlP8FgEDQ0NBDb29taYWEh8Pl8qKamhoSqquocDgeoqKj4EwqFCI7jvt1ut667u/vT5/MBjuNwr9erVVZWkicnJz95eXmk3++HTU1NXx6PhwAzMzMwkUjoeZ6nXl9fgSRJTDweJ10uF3h/f4e9vb0wnU5DQRDIu7s70uVyUYqiULOzs1BVVT14fn4Gw8PDunA4TPE8jyKRCCVJEpNMJnGTyUTc3NxgkiQhVVWx0dFRRlEUamhoiHh4eGAEQUDA4/GQsiyjiYkJ9Pb2RgwODmKnp6fU2NgYCIVCeH9/P1QUhRJFESUSCdLj8dDJZJIZGRlhPz4+KHB7ewvNZjP+/v4ORFHU3d/f4/Pz8+D09JScnp5Gh4eHelEUUTQa1ff09DCRSISyWCzMy8sL4/F49GB8fBzKsoxmZmbws7Mz1mQy6Z+enmiz2YxdXFzgY2NjtKqqtCRJ+lgsRlqtVphIJNiJiQlMURQKyrLMLC0taV1dXWh1dRVxHPe9traGysvL/ywvL2P19fXI5/P9dHZ20gsLC5/FxcUwEoloBQUF5O7uLgRTU1P6q6sriud5FAqFSLPZjL28vBB9fX1UNBqlnU4noygK5XK52HA4rLdarZSqqrTNZmNTqRQDY7EYvbe3BwwGg7a5uUlwHPe9srKCd3R0aBsbG6ioqOh3b2/vu6qq6tfv95M5OTnY+vo6aG9vB1tbW1//AedZANPwv9nHAAAAAElFTkSuQmCC");
}
html[data-hdd-skin] :is(.wtg9ga_newSession, ._2H3hWW_newSession) {
  position: relative;
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .30) 0%, rgba(255, 255, 255, .07) 15%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(104deg, rgba(255, 255, 255, 0) 16%, rgba(226, 238, 255, .16) 24%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(116deg, rgba(180, 208, 255, .20) 0%, rgba(112, 152, 238, .06) 32%, rgba(255, 255, 255, 0) 54%),
    linear-gradient(180deg, rgba(104, 144, 236, .11) 0%, rgba(28, 48, 104, .16) 56%, rgba(7, 14, 30, .22) 100%) !important;
  backdrop-filter: blur(28px) saturate(190%) brightness(1.08);
  -webkit-backdrop-filter: blur(28px) saturate(190%) brightness(1.08);
  border: 1px solid rgba(122, 162, 255, .34) !important;
  border-top-color: rgba(206, 222, 255, .52) !important;
  border-radius: 14px !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .38),
    inset 0 -1px 0 rgba(255, 255, 255, .05),
    inset 0 -16px 26px -20px rgba(0, 0, 0, .55),
    inset 0 14px 26px -18px rgba(176, 210, 255, .42),
    0 14px 32px rgba(0, 0, 0, .46),
    0 2px 6px rgba(0, 0, 0, .34),
    0 0 34px rgba(110, 152, 255, .18) !important;
  transition: border-color 200ms ease, box-shadow 260ms ease, background 260ms ease, transform 200ms ease;
}
html[data-hdd-skin] :is(.wtg9ga_newSession, ._2H3hWW_newSession):hover {
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .38) 0%, rgba(255, 255, 255, .11) 16%, rgba(255, 255, 255, 0) 38%),
    linear-gradient(104deg, rgba(255, 255, 255, 0) 14%, rgba(238, 246, 255, .24) 24%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(116deg, rgba(198, 220, 255, .26) 0%, rgba(132, 172, 255, .10) 34%, rgba(255, 255, 255, 0) 56%),
    linear-gradient(180deg, rgba(126, 166, 250, .15) 0%, rgba(38, 62, 128, .20) 56%, rgba(10, 20, 42, .26) 100%) !important;
  border-color: rgba(214, 232, 255, .34) !important;
  border-top-color: rgba(248, 252, 255, .56) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .46),
    inset 0 -1px 0 rgba(255, 255, 255, .06),
    inset 0 -16px 26px -20px rgba(0, 0, 0, .50),
    inset 0 16px 28px -18px rgba(196, 222, 255, .50),
    0 18px 38px rgba(0, 0, 0, .48),
    0 2px 8px rgba(0, 0, 0, .36),
    0 0 44px rgba(126, 168, 255, .26) !important;
  transform: translateY(-1px);
}
html[data-hdd-skin] :is(.wtg9ga_newSession, ._2H3hWW_newSession):active {
  transform: translateY(0);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, .35),
    inset 0 1px 0 rgba(255, 255, 255, .18),
    0 6px 16px rgba(0, 0, 0, .40) !important;
}
html[data-hdd-skin] :is(.wtg9ga_newSession, ._2H3hWW_newSession):focus-visible {
  outline: 2px solid rgba(150, 186, 255, .55);
  outline-offset: 3px;
}

/* The four panel entries are one glass slab: the list itself is the pane and
   the rows inside stay clear, with hairlines between them and a soft hover. */
html[data-hdd-skin] :is(.wtg9ga_panelList, ._2H3hWW_panelList) {
  position: relative;
  padding: 4px !important;
  border-radius: 14px !important;
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .18) 0%, rgba(255, 255, 255, .04) 16%, rgba(255, 255, 255, 0) 40%),
    linear-gradient(146deg, rgba(168, 198, 255, .13) 0%, rgba(96, 134, 226, .04) 32%, rgba(255, 255, 255, 0) 56%),
    linear-gradient(180deg, rgba(88, 128, 224, .12) 0%, rgba(22, 40, 90, .16) 54%, rgba(6, 12, 28, .22) 100%) !important;
  backdrop-filter: blur(22px) saturate(175%) brightness(1.05);
  -webkit-backdrop-filter: blur(22px) saturate(175%) brightness(1.05);
  border: 1px solid rgba(110, 150, 245, .22) !important;
  border-top-color: rgba(196, 214, 255, .38) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .22),
    inset 0 -16px 26px -22px rgba(0, 0, 0, .50),
    inset 0 14px 26px -20px rgba(170, 204, 255, .22),
    0 12px 28px rgba(0, 0, 0, .30),
    0 0 26px rgba(96, 140, 255, .11) !important;
  overflow: hidden;
}
html[data-hdd-skin] :is(.wtg9ga_panelRow, ._2H3hWW_panelRow) {
  position: relative;
  margin: 0 !important;
  border: none !important;
  border-radius: 10px !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  transform: none !important;
  transition: background 180ms ease, box-shadow 180ms ease;
}
/* Hairline between every slot in the panel list — the "更多" entry ships inside
   its own anchor wrapper, so sibling-of-row selectors miss it. */
html[data-hdd-skin] :is(.wtg9ga_panelList, ._2H3hWW_panelList) > :not(:first-child) {
  position: relative;
}
/* "更多" can also arrive wrapped in its own anchor, outside the list slot; the
   same hairline is drawn there so the run of four reads continuous. */
html[data-hdd-skin] :is(.wtg9ga_moreAnchor, ._2H3hWW_moreAnchor) {
  position: relative;
}
html[data-hdd-skin] :is(.wtg9ga_moreAnchor, ._2H3hWW_moreAnchor)::before {
  content: "";
  position: absolute;
  left: 10px; right: 10px; top: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(200, 222, 255, 0), rgba(200, 222, 255, .14) 18%, rgba(200, 222, 255, .14) 82%, rgba(200, 222, 255, 0));
  pointer-events: none;
}
html[data-hdd-skin] :is(.wtg9ga_panelList, ._2H3hWW_panelList) > :not(:first-child)::before {
  content: "";
  position: absolute;
  left: 10px; right: 10px; top: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(200, 222, 255, 0), rgba(200, 222, 255, .14) 18%, rgba(200, 222, 255, .14) 82%, rgba(200, 222, 255, 0));
  pointer-events: none;
}
html[data-hdd-skin] :is(.wtg9ga_panelRow, ._2H3hWW_panelRow):hover {
  background:
    linear-gradient(180deg, rgba(176, 206, 255, .16) 0%, rgba(104, 144, 234, .06) 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12) !important;
  transform: none !important;
}
html[data-hdd-skin] :is(.wtg9ga_panelRow, ._2H3hWW_panelRow):active {
  background: rgba(90, 128, 220, .14) !important;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, .28) !important;
}

html[data-hdd-skin] :is(.GAkraW_listArea, ._9lTDKa_listArea) {
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .18) 0%, rgba(255, 255, 255, .04) 13%, rgba(255, 255, 255, 0) 32%),
    linear-gradient(146deg, rgba(168, 198, 255, .14) 0%, rgba(96, 134, 226, .05) 30%, rgba(255, 255, 255, 0) 56%),
    linear-gradient(180deg, rgba(86, 126, 222, .09) 0%, rgba(22, 40, 90, .14) 52%, rgba(6, 12, 28, .19) 100%) !important;
  backdrop-filter: blur(26px) saturate(175%) brightness(1.05);
  -webkit-backdrop-filter: blur(26px) saturate(175%) brightness(1.05);
  border-radius: 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .26),
    inset 0 -18px 32px -26px rgba(0, 0, 0, .55),
    inset 0 16px 30px -22px rgba(170, 204, 255, .30),
    0 16px 38px rgba(0, 0, 0, .40),
    0 0 32px rgba(96, 140, 255, .12) !important;
}
/* Hairline: brighter along the top edge, fading down the sides. */
html[data-hdd-skin] :is(.GAkraW_listArea, ._9lTDKa_listArea)::after {
  border: 1px solid rgba(196, 220, 255, .16) !important;
  border-top-color: rgba(240, 248, 255, .34) !important;
  border-radius: inherit;
  box-shadow:
    inset 0 0 26px rgba(130, 170, 255, .07),
    0 0 22px rgba(96, 140, 255, .07);
}
/* Inner surfaces stay clear so the frosted backdrop is what shows. */
html[data-hdd-skin] :is(.GAkraW_list, .GAkraW_treeBody, .GAkraW_flatList, ._9lTDKa_list) {
  background: transparent !important;
}
html[data-hdd-skin] :is(.GAkraW_root, ._9lTDKa_root) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
html[data-hdd-skin] :is(.wnFoaW_sessionRow, ._9lTDKa_sessionRow) {
  transition: background 180ms ease, box-shadow 180ms ease;
}
html[data-hdd-skin] :is(.wnFoaW_sessionRow, ._9lTDKa_sessionRow):hover {
  background:
    linear-gradient(180deg, rgba(176, 206, 255, .16) 0%, rgba(104, 144, 234, .06) 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12);
}

/* =====================================================================
   Gray-white rail. Only the column's own surface and its unboxed chrome go
   light; every glass card keeps the console's original dark treatment, so the
   frosted look is unchanged — the rail just sits on a pale ground.
   ===================================================================== */
html[data-hdd-skin] .BynINW_sidebarCol {
  --dsw-specific-sidebar-fill: #444952;
  --dsw-alias-bg-layer-1: #4b5058;
  --dsw-alias-bg-layer-2: #3f444c;
  --dsw-alias-bg-layer-3: #3b4048;
  --dsw-alias-label-primary: #eaf0f8;
  --dsw-alias-label-secondary: #c3ccd9;
  --dsw-alias-label-tertiary: #a6b0be;
  --dsw-alias-interactive-bg-hover: rgba(255, 255, 255, .08);
  --dsw-alias-border-l2: rgba(255, 255, 255, .14);
  --dsw-alias-border-l3: rgba(255, 255, 255, .10);
  background: linear-gradient(180deg, #4b5058 0%, #3b4048 100%) !important;
  border-right-color: rgba(0, 0, 0, .55) !important;
  color: #1a2438;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(._2H3hWW_brandName, .wtg9ga_brandName)::before {
  color: #f2f7ff !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(._2H3hWW_brandName, .wtg9ga_brandName)::after {
  color: rgba(226, 236, 250, .55) !important;
}
/*
 * Glass, opened up and tinted to the core's own palette. The icon in
 * icon.svg is #3978ed ring, #193499 deep core, #b4c4ee pale highlight over a
 * #05070e ground; the panes below are those three hues thinned into a body,
 * so the rail reads as a piece of the same object as the Fairy core instead of
 * a generic navy slab. Alphas sit around .5–.7: raise toward .80 for a heavier
 * pane, drop toward .45 for a thinner one.
 */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession) {
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .26) 0%, rgba(255, 255, 255, .06) 15%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(104deg, rgba(255, 255, 255, 0) 16%, rgba(226, 238, 255, .14) 24%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(160deg, rgba(57, 120, 237, .46) 0%, rgba(25, 52, 153, .56) 52%, rgba(9, 18, 52, .68) 100%) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession):hover {
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .34) 0%, rgba(255, 255, 255, .09) 16%, rgba(255, 255, 255, 0) 38%),
    linear-gradient(104deg, rgba(255, 255, 255, 0) 14%, rgba(238, 246, 255, .20) 24%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(160deg, rgba(74, 138, 250, .54) 0%, rgba(32, 64, 178, .64) 52%, rgba(11, 22, 60, .74) 100%) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList) {
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .16) 0%, rgba(255, 255, 255, .03) 16%, rgba(255, 255, 255, 0) 40%),
    linear-gradient(146deg, rgba(168, 198, 255, .10) 0%, rgba(96, 134, 226, .03) 32%, rgba(255, 255, 255, 0) 56%),
    linear-gradient(180deg, rgba(48, 104, 224, .42) 0%, rgba(24, 50, 148, .52) 54%, rgba(8, 16, 46, .64) 100%) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea) {
  background:
    var(--hdd-glass-grain) 0 0 / 46px 46px repeat,
    linear-gradient(180deg, rgba(255, 255, 255, .13) 0%, rgba(255, 255, 255, .03) 13%, rgba(255, 255, 255, 0) 32%),
    linear-gradient(150deg, rgba(152, 184, 255, .08) 0%, rgba(92, 130, 222, .03) 30%, rgba(255, 255, 255, 0) 54%),
    linear-gradient(180deg, rgba(44, 98, 216, .40) 0%, rgba(22, 46, 140, .50) 52%, rgba(7, 14, 42, .62) 100%) !important;
}
/* The list's scroll fade paints var(--dsw-specific-sidebar-fill), which is now
   pale — over the dark glass it drew a light band at the bottom. Fade it into
   the glass tone instead. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_fade, ._9lTDKa_fade) {
  display: none !important;
}
/* Against the pale rail the pane's bottom rim would read as a white shelf;
   keep the light rim on top only and let the base fall away dark. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea)::after {
  border: 1px solid rgba(112, 152, 248, .24) !important;
  border-top-color: rgba(200, 218, 255, .40) !important;
  box-shadow: none !important;
}
/* The console's deep inner bottom shadow reads as a black band on a pale rail.
   Replace the three card shadows with a single soft drop. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .34),
    inset 0 -1px 0 rgba(255, 255, 255, .05),
    0 10px 22px rgba(0, 0, 0, .20) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .22),
    0 8px 18px rgba(0, 0, 0, .18) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea) {
  /* No drop shadow under the pane: the rail below stays clean. */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .20) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession):hover {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .42),
    inset 0 -1px 0 rgba(255, 255, 255, .06),
    0 14px 28px rgba(0, 0, 0, .22) !important;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession):active {
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, .28),
    inset 0 1px 0 rgba(255, 255, 255, .16),
    0 6px 14px rgba(0, 0, 0, .18) !important;
}
/* The dark glass cards re-declare the console's ink for their own subtree. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession),
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList),
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea) {
  --dsw-alias-label-primary: #e8f0ff;
  --dsw-alias-label-secondary: #b6c8e8;
  --dsw-alias-label-tertiary: #8ea4c6;
  --dsw-alias-interactive-bg-hover: rgba(130, 168, 255, .12);
  --dsw-alias-border-l2: rgba(130, 168, 255, .20);
  --dsw-alias-border-l3: rgba(130, 168, 255, .14);
  color: #e8f0ff;
}

/*
 * One rail, one edge. The app ships the three glass cards with slightly
 * different horizontal margins, so their borders stepped in and out down the
 * rail. A single inset pins all three to the same left and right edge, and the
 * cards are told to take the full remaining width instead of their own.
 * Tune --hdd-rail-inset: 6px reads tighter, 14px roomier.
 */
html[data-hdd-skin] .BynINW_sidebarCol {
  --hdd-rail-inset: 10px;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession),
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList),
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea) {
  margin-left: var(--hdd-rail-inset) !important;
  margin-right: var(--hdd-rail-inset) !important;
  width: auto !important;
  max-width: none !important;
  min-width: 0 !important;
  align-self: stretch !important;
  box-sizing: border-box !important;
}
/* The new-session card is a call to action, so its label rides in the middle;
   the panel and session panes keep their rows flush left. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession) {
  justify-content: center !important;
  text-align: center !important;
}

/* =====================================================================
   Liquid light inside the rail glass. Every card carries one slow, blurred
   field *inside* itself — above its tint, below its content — and only
   transform animates, so the 900 px pane rasters once and the compositor
   moves it: no repaint, and no per-frame re-blur of the backdrop. That last
   part matters: animating the rail *behind* the cards would re-run every
   card's 22–28 px backdrop filter on each frame and stall the drag.

   z-index: -1 with isolation keeps the field under the text inside the
   card's own stacking context; overflow: hidden clips it to the rounded
   corners. Tune the read with opacity (density), filter blur (softness) and
   animation-duration (speed) — the four surfaces run out of phase on purpose.
   ===================================================================== */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession),
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList),
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea),
html[data-hdd-skin] .fs-rail-stats {
  position: relative !important;
  overflow: hidden !important;
  isolation: isolate;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession)::before,
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList)::before,
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea)::before,
html[data-hdd-skin] .fs-rail-stats::before {
  content: "";
  position: absolute;
  /* Oversized so the drift has room to travel before an edge shows. */
  inset: -42%;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(58% 46% at 32% 26%, rgba(132, 176, 255, .60), rgba(132, 176, 255, 0) 72%),
    radial-gradient(54% 42% at 70% 60%, rgba(96, 214, 238, .40), rgba(96, 214, 238, 0) 74%),
    radial-gradient(62% 48% at 44% 84%, rgba(166, 148, 255, .32), rgba(166, 148, 255, 0) 72%),
    linear-gradient(104deg, rgba(255, 255, 255, 0) 41%, rgba(214, 236, 255, .14) 47%, rgba(255, 255, 255, 0) 54%);
  filter: blur(24px) saturate(130%);
  mix-blend-mode: screen;
  opacity: .5;
  will-change: transform;
  animation: fs-liquid-drift 26s ease-in-out infinite alternate;
}
/* Call to action: the smallest surface, so it runs brightest and quickest. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_newSession, ._2H3hWW_newSession)::before {
  opacity: .62;
  filter: blur(20px) saturate(135%);
  animation-duration: 24s;
  animation-delay: -5s;
}
/* Panel card: mid-size, a touch calmer. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.wtg9ga_panelList, ._2H3hWW_panelList)::before {
  opacity: .46;
  filter: blur(28px) saturate(125%);
  animation-duration: 30s;
  animation-delay: -13s;
}
/* Session pane: the long one. Slowest drift keeps a tall sheet from looking
   like a rolling wallpaper. */
html[data-hdd-skin] .BynINW_sidebarCol :is(.GAkraW_listArea, ._9lTDKa_listArea)::before {
  opacity: .40;
  filter: blur(34px) saturate(120%);
  animation-duration: 38s;
  animation-delay: -21s;
}
html[data-hdd-skin] .fs-rail-stats::before {
  opacity: .50;
  filter: blur(22px) saturate(130%);
  animation-duration: 32s;
  animation-delay: -9s;
}

/*
 * Resize paint shield. The glass is expensive by design: every card runs a
 * 22-28px backdrop blur, a saturate/brightness pass and a multi-layer shadow.
 * Those are fine on a static frame and ruinous at 60fps while a rail is being
 * dragged, because the whole conversation relayouts underneath them each frame.
 * While html[data-hdd-resizing] is set the glass goes flat: no blur, no
 * shadow, no transition, and the core's drop-shadow is dropped too. Everything
 * comes back on pointerup.
 */
html[data-hdd-skin][data-hdd-resizing] :is(
  .wtg9ga_newSession, ._2H3hWW_newSession,
  .wtg9ga_panelList, ._2H3hWW_panelList,
  .GAkraW_listArea, ._9lTDKa_listArea,
  .wtg9ga_panelRow, ._2H3hWW_panelRow
) {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
  transition: none !important;
}
/* The liquid field is a compositor layer, but a drag relayouts the whole rail
   every frame — park it for the duration instead of feeding it new geometry. */
html[data-hdd-skin][data-hdd-resizing] :is(
  .wtg9ga_newSession, ._2H3hWW_newSession,
  .wtg9ga_panelList, ._2H3hWW_panelList,
  .GAkraW_listArea, ._9lTDKa_listArea,
  .fs-rail-stats
)::before {
  animation: none !important;
}
html[data-hdd-skin][data-hdd-resizing] :is(.fs-hero-orb, .fs-chat-orb, .fs-header-orb) {
  filter: none !important;
}
html[data-hdd-skin][data-hdd-resizing] .V4vHZW_root {
  transition: none !important;
}

/*
 * Liquid inside the glass. The four hues of the core — #3978ed ring, #4285e8
 * mid, #193499 deep, #b4c4ee highlight — are stacked as three wide radial
 * blobs on a pseudo-element that drifts and breathes on a 26s cycle. The card
 * gets isolation:isolate so the blob paints above the pane's own background
 * but below its label, and overflow:hidden keeps it inside the rounded rim.
 * Only transform is animated, so the layer is composited and no gradient is
 * re-rasterised per frame; the drift stops while a rail is being dragged and
 * for prefers-reduced-motion.
 */
html[data-hdd-skin] {
  --hdd-liquid-1: rgba(57, 120, 237, .28);
  --hdd-liquid-2: rgba(66, 133, 232, .20);
  --hdd-liquid-3: rgba(25, 52, 153, .32);
  --hdd-liquid-4: rgba(180, 196, 238, .18);
}
html[data-hdd-skin] .BynINW_sidebarCol :is(
  .wtg9ga_newSession, ._2H3hWW_newSession,
  .wtg9ga_panelList, ._2H3hWW_panelList,
  .GAkraW_listArea, ._9lTDKa_listArea
) {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
html[data-hdd-skin] .BynINW_sidebarCol :is(
  .wtg9ga_newSession, ._2H3hWW_newSession,
  .wtg9ga_panelList, ._2H3hWW_panelList,
  .GAkraW_listArea, ._9lTDKa_listArea
)::before {
  content: "";
  position: absolute;
  inset: -35%;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(42% 58% at 24% 26%, var(--hdd-liquid-1), transparent 72%),
    radial-gradient(38% 50% at 76% 64%, var(--hdd-liquid-2), transparent 74%),
    radial-gradient(46% 62% at 52% 88%, var(--hdd-liquid-3), transparent 76%),
    radial-gradient(26% 34% at 62% 34%, var(--hdd-liquid-4), transparent 78%);
  animation: fairy-liquid 26s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes fairy-liquid {
  0%   { transform: translate3d(-5%, -4%, 0) scale(1.06) rotate(-2deg); }
  33%  { transform: translate3d(4%, 3%, 0) scale(1.12) rotate(1.5deg); }
  66%  { transform: translate3d(-2%, 6%, 0) scale(1.08) rotate(-1deg); }
  100% { transform: translate3d(6%, -3%, 0) scale(1.14) rotate(2deg); }
}
/* Quiet while the rail is being resized, and for anyone who asked the system
   for less motion. */
html[data-hdd-skin][data-hdd-resizing] .BynINW_sidebarCol :is(
  .wtg9ga_newSession, ._2H3hWW_newSession,
  .wtg9ga_panelList, ._2H3hWW_panelList,
  .GAkraW_listArea, ._9lTDKa_listArea
)::before {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  html[data-hdd-skin] .BynINW_sidebarCol :is(
    .wtg9ga_newSession, ._2H3hWW_newSession,
    .wtg9ga_panelList, ._2H3hWW_panelList,
    .GAkraW_listArea, ._9lTDKa_listArea
  )::before {
    animation: none;
  }
}

/* ---- rail stats: balance + this conversation's tokens ---- */
.fs-rail-stats {
  margin: 8px 2px 2px;
  padding: 8px 10px 9px;
  border-radius: 14px;
  /* Flat, deeper, no glass: solid grey with a single 1px rim. The grain layer,
     the specular wash and the inner highlights are all gone, so the card reads
     as machined metal instead of frosted glass. */
  border: 1px solid rgba(255, 255, 255, .07);
  background: linear-gradient(180deg, #31363e 0%, #282d34 54%, #22262d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .05),
    0 6px 14px rgba(0, 0, 0, .26);
  color: #e6ecf5;
  font-size: 12px;
  line-height: 1.5;
  flex: none;
}
/* The blue liquid field would tint the grey; the voice card has none, so the
   balance card goes without as well. */
html[data-hdd-skin] .fs-rail-stats::before {
  display: none !important;
}
.fs-rs-head {
  font-size: 10px;
  letter-spacing: .18em;
  color: #8ea4c6;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.fs-rs-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.fs-rs-row span { color: #c9d3e0; }
.fs-rs-row b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #f2f7ff;
}
.fs-rs-raw {
  margin-top: 4px;
  font: 9px/1.35 Consolas, monospace;
  color: #7f96bb;
  word-break: break-all;
}
`

    /* ------------------------------------------------------------------
     * Every paint rule below is addressed by a compiled CSS-module class
     * name, and DSH re-hashes those on each release: 0.2.1-rc.2 shipped
     * ._2H3hWW_brandMark, 0.2.1-rc.3 ships .wtg9ga_brandMark. Rather than
     * bumping forty selectors by hand per update, resolve them at runtime:
     * read the live class inventory, match on the readable name suffix,
     * and vote by package so common names (root/header/column) stay in the
     * package they came from. Unresolvable selectors are left alone, which
     * only costs that one rule instead of the whole skin.
     * ------------------------------------------------------------------ */
    /* Six characters, optionally with the dash some builders emit: mP3x-q_frame. */
    const HASHED = /^[A-Za-z0-9-]{6}$/
    const SELECTOR_CLASS = /\._?([A-Za-z0-9-]{6})_([A-Za-z][A-Za-z0-9]*)/g
    const CLASS_TOKEN = /^([A-Za-z0-9-]{6})_([A-Za-z][A-Za-z0-9]*)$/
    const CLASS_TOKEN_INVERTED = /^_([A-Za-z][A-Za-z0-9]*)_([A-Za-z0-9]{4,10})_(\d+)$/
    /* A compiled prefix mixes letter case or letter and digit; plain words do not. */
    const isHashed = (prefix) => HASHED.test(prefix)
      && ((/[A-Z]/.test(prefix) && /[a-z]/.test(prefix)) || (/[0-9]/.test(prefix) && /[A-Za-z]/.test(prefix)))

    function splitToken(token) {
      const forward = CLASS_TOKEN.exec(token)
      if (forward !== null) return { prefix: forward[1], name: forward[2] }
      const inverted = CLASS_TOKEN_INVERTED.exec(token)
      if (inverted !== null) return { prefix: '', name: inverted[1] }
      return null
    }

    /* Every class the running app actually ships, read from its stylesheets. */
    function liveClassTokens() {
      const tokens = new Set()
      const visit = (rules) => {
        for (const rule of rules) {
          if (typeof rule.selectorText === 'string') {
            for (const match of rule.selectorText.matchAll(/\.(-?[_A-Za-z][_A-Za-z0-9-]*)/g)) tokens.add(match[1])
          }
          else if (rule.cssRules !== undefined) {
            try { visit(rule.cssRules) }
            catch { /* unreadable group */ }
          }
        }
      }
      for (const sheet of document.styleSheets) {
        try { visit(sheet.cssRules) }
        catch { /* cross-origin sheet */ }
      }
      if (tokens.size === 0) {
        for (const node of document.querySelectorAll('[class]')) for (const value of node.classList) tokens.add(value)
      }
      return tokens
    }

    function indexClasses(tokens) {
      const byName = new Map()
      for (const token of tokens) {
        const parts = splitToken(token)
        if (parts === null) continue
        let bucket = byName.get(parts.name)
        if (bucket === undefined) byName.set(parts.name, bucket = new Set())
        bucket.add(token)
      }
      return byName
    }

    function legacyGroups(css) {
      const groups = new Map()
      for (const match of css.matchAll(SELECTOR_CLASS)) {
        const prefix = match[1]
        if (!isHashed(prefix)) continue
        let bucket = groups.get(prefix)
        if (bucket === undefined) groups.set(prefix, bucket = new Set())
        bucket.add(match[2])
      }
      return groups
    }

    /* Current prefixes ranked by how many of this old package's names they host. */
    function rankedPrefixes(byName, groups, prefix) {
      const members = groups.get(prefix)
      if (members === undefined) return []
      const scores = new Map()
      for (const member of members) {
        const candidates = byName.get(member)
        if (candidates === undefined) continue
        for (const token of candidates) {
          const parts = splitToken(token)
          if (parts === null || parts.prefix === '') continue
          scores.set(parts.prefix, (scores.get(parts.prefix) ?? 0) + 1)
        }
      }
      return [...scores.entries()].sort((left, right) => right[1] - left[1]).map(([candidate]) => candidate)
    }

    function resolveClass(byName, groups, prefix, name) {
      const candidates = byName.get(name)
      if (candidates === undefined || candidates.size === 0) return null
      if (candidates.size === 1) return [...candidates][0]
      /*
       * Walk the package ranking instead of the single best prefix: a
       * package can be split across bundles (rc.3 moved the session rows
       * out of the rail), and a name that the top prefix no longer owns
       * usually belongs to the next one down.
       */
      for (const candidate of rankedPrefixes(byName, groups, prefix)) {
        for (const token of candidates) if (token.startsWith(candidate + '_')) return token
      }
      if (candidates.size > 4) return null
      return [...candidates][0]
    }

    function rewriteCss(css, byName, groups) {
      const body = css.replace(SELECTOR_CLASS, (match, prefix, name) => {
        if (!isHashed(prefix)) return match
        const token = resolveClass(byName, groups, prefix, name)
        return token === null ? match : '.' + token
      })
      /*
       * Fallback only: layout's frame and sidebar column usually resolve by
       * name, but if a release renames them the shell still paints.
       */
      const sidebarRoot = resolveClass(byName, groups, '2H3hWW', 'root')
      return body
        .replace(/\.BynINW_frame\b/g, ':is([data-slot="root"], #root)')
        .replace(/\.BynINW_sidebarCol\b/g, sidebarRoot === null ? '.fs-unmapped-sidebar-col' : '.' + sidebarRoot)
    }

    let skinIndex = { byName: new Map(), groups: new Map() }

    function refreshSkinIndex() {
      skinIndex = { byName: indexClasses(liveClassTokens()), groups: legacyGroups(CSS) }
      return skinIndex
    }

    function skinNode(prefix, name) {
      const token = resolveClass(skinIndex.byName, skinIndex.groups, prefix, name)
      if (token !== null) {
        const node = document.querySelector('.' + token)
        if (node !== null) return node
      }
      for (const node of document.querySelectorAll('[class]')) {
        for (const value of node.classList) if (value.endsWith('_' + name)) return node
      }
      return null
    }

    function skinNodes(prefix, name) {
      const token = resolveClass(skinIndex.byName, skinIndex.groups, prefix, name)
      return token === null ? [] : Array.from(document.querySelectorAll('.' + token))
    }

    /*
     * Fairy core geometry adapted from MaxiumZero/TZFairy (local personal use).
     * 600×600: blue/white outer eye, toothed gear ring, layered iris, dark pupil
     * and the offset highlight. The gear and iris rotate; the pupil and highlight
     * breathe, matching the reference instead of the earlier generic ring.
     */
    const FAIRY_SVG = h(
      'svg',
      {
        className: 'fs-orb',
        viewBox: '0 0 600 600',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
        focusable: 'false',
        shapeRendering: 'geometricPrecision',
      },
      h(
        'defs',
        null,
        h(
          'filter',
          { id: 'fairyCoreGlow', x: '-30%', y: '-30%', width: '160%', height: '160%' },
          h('feGaussianBlur', { stdDeviation: '10', result: 'blur' }),
          h('feComposite', { in: 'SourceGraphic', in2: 'blur', operator: 'over' }),
        ),
        h('clipPath', { id: 'fairyEyeClip' }, h('circle', { cx: '300', cy: '300', r: '180' })),
      ),
      h('circle', {
        className: 'fs-core-base',
        cx: '300',
        cy: '300',
        r: '270',
        fill: '#3978ed',
        opacity: '0.35',
      }),
      h(
        'g',
        { className: 'fs-gear' },
        h('circle', { cx: '300', cy: '300', r: '220', fill: '#193499' }),
        h('path', {
          d: 'M 300 50 L 338 105 L 262 105 Z M 550 300 L 495 338 L 495 262 Z M 300 550 L 262 495 L 338 495 Z M 50 300 L 105 262 L 105 338 Z',
          fill: '#193499',
        }),
      ),
      h('circle', {
        className: 'fs-ring-blue',
        cx: '300',
        cy: '300',
        r: '266',
        fill: 'none',
        stroke: '#3978ed',
        strokeWidth: '14',
      }),
      h('circle', {
        className: 'fs-ring-white',
        cx: '300',
        cy: '300',
        r: '266',
        fill: 'none',
        stroke: '#ffffff',
        strokeWidth: '6',
      }),
      h('circle', { cx: '300', cy: '300', r: '180', fill: '#ffffff' }),
      h('circle', { cx: '300', cy: '300', r: '132', fill: '#b4c4ee' }),
      h(
        'g',
        { className: 'fs-iris-spin' },
        h('circle', {
          className: 'fs-iris',
          cx: '300',
          cy: '300',
          r: '96',
          fill: '#4285e8',
        }),
      ),
      h('circle', {
        className: 'fs-pupil',
        cx: '300',
        cy: '300',
        r: '60',
        fill: '#173082',
      }),
      h('circle', {
        className: 'fs-highlight',
        cx: '372',
        cy: '372',
        r: '42',
        fill: '#ffffff',
        filter: 'url(#fairyCoreGlow)',
      }),
      h(
        'g',
        { clipPath: 'url(#fairyEyeClip)' },
        h(
          'g',
          { className: 'fs-lid', transform: 'translate(0 -380)' },
          h('path', { d: 'M 110 104 H 490 V 296 Q 402 346 300 330 Q 198 346 110 296 Z', fill: '#193499' }),
        ),
      ),
    )

    /*
     * The sidebar cell belongs to the official brand slot, so the core is
     * painted into that cell instead of registered as a second occupant. The
     * gear, iris and pupil keep the same animations as the hero orb.
     */
    const BRAND_ORB_SVG = '<svg class="fs-orb" viewBox="0 0 600 600" focusable="false" shape-rendering="geometricPrecision"><defs><clipPath id="fairyEyeClip"><circle cx="300" cy="300" r="180"></circle></clipPath></defs><circle cx="300" cy="300" r="270" fill="#3978ed" opacity="0.35"></circle><g class="fs-gear"><circle cx="300" cy="300" r="220" fill="#193499"></circle><path d="M 300 50 L 338 105 L 262 105 Z M 550 300 L 495 338 L 495 262 Z M 300 550 L 262 495 L 338 495 Z M 50 300 L 105 262 L 105 338 Z" fill="#193499"></path></g><circle cx="300" cy="300" r="266" fill="none" stroke="#3978ed" stroke-width="14"></circle><circle cx="300" cy="300" r="266" fill="none" stroke="#ffffff" stroke-width="6"></circle><circle cx="300" cy="300" r="180" fill="#ffffff"></circle><circle cx="300" cy="300" r="132" fill="#b4c4ee"></circle><g class="fs-iris-spin"><circle class="fs-iris" cx="300" cy="300" r="96" fill="#4285e8"></circle></g><circle class="fs-pupil" cx="300" cy="300" r="60" fill="#173082"></circle><circle class="fs-highlight" cx="372" cy="372" r="42" fill="#ffffff"></circle><g clip-path="url(#fairyEyeClip)"><g class="fs-lid" transform="translate(0 -380)"><path d="M 110 104 H 490 V 296 Q 402 346 300 330 Q 198 346 110 296 Z" fill="#193499"></path></g></g></svg>'

    const BRAND_ORB_LAYERS = '<span class="fs-core-anim fs-brand-core">'
      + '<span class="fs-core-layer fs-core-ghost fs-core-red">' + BRAND_ORB_SVG + '</span>'
      + '<span class="fs-core-layer fs-core-ghost fs-core-cyan">' + BRAND_ORB_SVG + '</span>'
      + '<span class="fs-core-layer fs-core-main">' + BRAND_ORB_SVG + '</span>'
      + '</span>'

    function paintBrandCore() {
      const mark = skinNode('2H3hWW', 'brandMark')
      if (mark === null || mark.querySelector(':scope > .fs-brand-live') !== null) return
      const live = document.createElement('span')
      live.className = 'fs-brand-live'
      live.setAttribute('aria-hidden', 'true')
      live.innerHTML = BRAND_ORB_SVG
      mark.classList.add('has-live-core')
      mark.appendChild(live)
    }

    function FairyBrandMark({ size }) {
      const edge = Math.max(18, Math.min(Number(size) || 28, 34))
      return h(
        'span',
        {
          className: 'fs-brand-mark',
          style: { width: `${edge}px`, height: `${edge}px` },
          'aria-hidden': 'true',
        },
        FAIRY_SVG,
      )
    }

    function FairyBrandName({ t }) {
      return h(
        'span',
        { className: 'fs-brand-copy' },
        h('span', { className: 'fs-brand-title' }, 'Fairy'),
        h('span', { className: 'fs-brand-tag' }, t('brandTag')),
      )
    }

    function FairyCoreAnimated() {
      const phase = React.useRef(null)
      if (phase.current === null) phase.current = coreGlitchPhase()
      return h(
        'div',
        {
          className: 'fs-core-anim',
          'aria-hidden': 'true',
          style: { '--fs-glitch-phase': phase.current },
        },
        h('div', { className: 'fs-core-layer fs-core-ghost fs-core-red' }, FAIRY_SVG),
        h('div', { className: 'fs-core-layer fs-core-ghost fs-core-cyan' }, FAIRY_SVG),
        h('div', { className: 'fs-core-layer fs-core-main' }, FAIRY_SVG),
        h('div', { className: 'fs-core-scan' }),
      )
    }

    function FairyHero({ t }) {
      return h(
        'div',
        { className: 'fs-hero', 'aria-hidden': 'true' },
        h('div', { className: 'fs-orb-glow', 'aria-hidden': 'true' }),
        h('div', { className: 'fs-halo', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'fs-hero-orb' },
          h(FairyCoreAnimated),
        ),
        h(
          'div',
          { className: 'fs-hero-copy' },
          h('div', { className: 'fs-hero-title' }, 'HOLLOW DEEP DIVE SYSTEM'),
          h(
            'div',
            { className: 'fs-hero-rule' },
            h('span'),
            h('em', null, t('heroSubtitle')),
            h('span'),
          ),
          h('div', { className: 'fs-hero-reflection' }, 'HOLLOW DEEP DIVE SYSTEM'),
        ),
      )
    }

    function FairyHeaderOrb() {
      return h(
        'span',
        {
          className: 'fs-header-orb',
          role: 'img',
          'aria-label': 'Fairy',
          title: 'Fairy',
        },
        FAIRY_SVG,
      )
    }

    function FairyChatOrb() {
      return h(
        'div',
        { className: 'fs-chat-orb', 'aria-hidden': 'true' },
        FAIRY_SVG,
      )
    }

    function FairySplash({ t, locale }) {
      const videoRef = React.useRef(null)
      const started = React.useRef(false)
      const timers = React.useRef([])
      const [phase, setPhase] = React.useState(SPLASH_ON_LAUNCH ? 'boot' : 'done')
      const [videoMounted, setVideoMounted] = React.useState(SPLASH_ON_LAUNCH)
      const [videoLeaving, setVideoLeaving] = React.useState(false)
      const [controlsReady, setControlsReady] = React.useState(false)
      const [muted, setMuted] = React.useState(false)
      const [soundBlocked, setSoundBlocked] = React.useState(false)
      const [replayToken, setReplayToken] = React.useState(0)
      const [, setLocaleRevision] = React.useState(0)
      const splashOver = phase === 'done'

      /*
       * The Windows caption buttons are native chrome painted by Electron, not
       * DOM. Their colors come from the Desktop preload, which measures these
       * two custom properties on <body> and forwards them over the
       * dsh-desktop:windows-appearance IPC. Override them for the splash so the
       * caption bar and the three buttons become transparent over the video,
       * then restore the exact prior inline values so the app keeps its own
       * theme afterwards.
       */
      React.useLayoutEffect(() => {
        if (splashOver) return undefined
        const body = document.body
        const read = (name) => ({
          value: body.style.getPropertyValue(name),
          priority: body.style.getPropertyPriority(name),
        })
        const previousFill = read('--dsw-specific-sidebar-fill')
        const previousLabel = read('--dsw-alias-label-primary')
        const previousSecondary = read('--dsw-alias-label-secondary')
        const root = document.documentElement
        root.setAttribute('data-hdd-splash-caption', '')
        body.style.setProperty('--dsw-specific-sidebar-fill', 'transparent', 'important')
        body.style.setProperty('--dsw-alias-label-primary', '#eaf1ff', 'important')
        body.style.setProperty('--dsw-alias-label-secondary', '#c7d6ff', 'important')
        return () => {
          root.removeAttribute('data-hdd-splash-caption')
          if (previousFill.value) body.style.setProperty('--dsw-specific-sidebar-fill', previousFill.value, previousFill.priority)
          else body.style.removeProperty('--dsw-specific-sidebar-fill')
          if (previousLabel.value) body.style.setProperty('--dsw-alias-label-primary', previousLabel.value, previousLabel.priority)
          else body.style.removeProperty('--dsw-alias-label-primary')
          if (previousSecondary.value) body.style.setProperty('--dsw-alias-label-secondary', previousSecondary.value, previousSecondary.priority)
          else body.style.removeProperty('--dsw-alias-label-secondary')
        }
      }, [splashOver])

      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => setLocaleRevision((value) => value + 1))
      }, [locale])

      const later = React.useCallback((fn, delay) => {
        const id = window.setTimeout(fn, delay)
        timers.current.push(id)
        return id
      }, [])

      /*
       * The film ends straight into the console: the intro choreography
       * (backdrop, greeting card, docking orb) is gone, so this only fades the
       * video out and unmounts it. The fade is short (BOOT_FADE_MS) and starts
       * while the picture is still dimming, so the console is already painted
       * when the film goes black — no dead frame in between.
       *
       * The cut now lands while the soundtrack is still running, so the volume
       * ramps down across the same window instead of stopping on a click.
       */
      const fadeSound = () => {
        const media = videoRef.current
        if (!media || media.muted) return
        const from = media.volume
        if (!(from > 0)) return
        const begin = performance.now()
        const step = () => {
          if (!videoRef.current) return
          const progress = Math.min(1, (performance.now() - begin) / BOOT_FADE_MS)
          media.volume = Math.max(0, from * (1 - progress))
          if (progress < 1) window.requestAnimationFrame(step)
        }
        window.requestAnimationFrame(step)
      }

      const finishBoot = React.useCallback(() => {
        if (started.current) return
        started.current = true
        fadeSound()
        setVideoLeaving(true)
        later(() => {
          setVideoMounted(false)
          setPhase('done')
        }, BOOT_FADE_MS + 20)
      }, [later])

      React.useEffect(() => () => {
        for (const id of timers.current) window.clearTimeout(id)
        timers.current = []
      }, [])

      React.useEffect(() => {
        const root = document.documentElement
        if (phase === 'done') root.setAttribute('data-hdd-splash-done', '')
        else root.removeAttribute('data-hdd-splash-done')
        return () => root.removeAttribute('data-hdd-splash-done')
      }, [phase])

      React.useEffect(() => {
        if (!SPLASH_ENABLED) return undefined
        const replay = () => {
          for (const id of timers.current) window.clearTimeout(id)
          timers.current = []
          started.current = false
          setPhase('boot')
          setVideoMounted(true)
          setVideoLeaving(false)
          setControlsReady(false)
          setMuted(false)
          setSoundBlocked(false)
          setReplayToken((value) => value + 1)
        }
        window.addEventListener('fairy-splash:replay', replay)
        return () => window.removeEventListener('fairy-splash:replay', replay)
      }, [])

      React.useEffect(() => {
        if (phase !== 'boot') return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') finishBoot()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [phase, finishBoot])

      React.useEffect(() => {
        if (!videoMounted) return undefined
        const video = videoRef.current
        if (!video) return undefined
        let disposed = false

        const controlsTimer = window.setTimeout(() => setControlsReady(true), 850)
        const watchdog = window.setTimeout(() => {
          if (!disposed) finishBoot()
        }, 30000)

        const onEnded = () => finishBoot()
        const onError = () => finishBoot()
        video.addEventListener('ended', onEnded)
        video.addEventListener('error', onError)

        /*
         * Hand over before the black hold instead of waiting for `ended`.
         * requestVideoFrameCallback is frame-accurate; `timeupdate` (~4 Hz) is
         * the fallback, and `ended`/the watchdog stay as the last resort if the
         * metadata never arrives.
         */
        let frameCallback = 0
        const nearEnd = () => {
          const duration = video.duration
          if (!Number.isFinite(duration) || duration <= 0) return false
          return duration - video.currentTime <= BOOT_HANDOFF_SECONDS
        }
        const onTimeUpdate = () => {
          if (nearEnd()) finishBoot()
        }
        const onFrame = () => {
          frameCallback = 0
          if (nearEnd()) {
            finishBoot()
            return
          }
          if (!disposed && typeof video.requestVideoFrameCallback === 'function') {
            frameCallback = video.requestVideoFrameCallback(onFrame)
          }
        }
        video.addEventListener('timeupdate', onTimeUpdate)
        if (typeof video.requestVideoFrameCallback === 'function') {
          frameCallback = video.requestVideoFrameCallback(onFrame)
        }

        const play = async () => {
          video.volume = 0.9
          try {
            await video.play()
          }
          catch {
            if (disposed) return
            video.muted = true
            setMuted(true)
            setSoundBlocked(true)
            try {
              await video.play()
            }
            catch {
              if (!disposed) finishBoot()
            }
          }
        }
        play()

        return () => {
          disposed = true
          window.clearTimeout(controlsTimer)
          window.clearTimeout(watchdog)
          if (frameCallback && typeof video.cancelVideoFrameCallback === 'function') {
            video.cancelVideoFrameCallback(frameCallback)
          }
          video.removeEventListener('ended', onEnded)
          video.removeEventListener('error', onError)
          video.removeEventListener('timeupdate', onTimeUpdate)
          video.pause()
        }
      }, [videoMounted, finishBoot, replayToken])

      const enableSound = () => {
        const video = videoRef.current
        if (!video) return
        video.muted = false
        video.volume = 0.9
        setMuted(false)
        setSoundBlocked(false)
        const played = video.play()
        if (played && typeof played.catch === 'function') {
          played.catch(() => {
            video.muted = true
            setMuted(true)
            setSoundBlocked(true)
          })
        }
      }

      return h(
        'div',
        { className: 'fs-root' },
        videoMounted && h(
          'div',
          { className: 'fs-cinema' + (videoLeaving ? ' is-leaving' : '') },
          h(
            'video',
            {
              key: replayToken,
              ref: videoRef,
              src: VIDEO_URL,
              poster: POSTER_URL,
              preload: 'auto',
              playsInline: true,
              autoPlay: true,
              muted: muted,
              'aria-label': t('videoLabel'),
            },
          ),
          h(
            'div',
            { className: 'fs-controls' + (controlsReady ? ' is-ready' : '') },
            soundBlocked && !videoLeaving && h(
              'button',
              { type: 'button', className: 'fs-btn', onClick: enableSound },
              t('sound'),
            ),
            !videoLeaving && h(
              'button',
              { type: 'button', className: 'fs-btn', onClick: finishBoot },
              t('skip'),
            ),
          ),
        ),

        h(FairyHero, { t }),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        let locale
        try { locale = ctx.get ? ctx.get('locale') : undefined } catch { locale = undefined }
        try {
        /*
         * A throwing effect takes the whole plugin down, and a failed client
         * entry aborts the web boot — a blank window instead of a lost skin.
         * Contain every effect so a future host change costs that one feature
         * and nothing else.
         */
        const effect = (fn, label) => ctx.effect(() => {
          try {
            return fn()
          }
          catch (error) {
            console.warn('[hdd] ' + label + ' failed', error)
          }
        }, label)

        effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-hdd-splash', '')
          let applied = ''
          const paint = () => {
            refreshSkinIndex()
            const next = rewriteCss(CSS, skinIndex.byName, skinIndex.groups)
            if (next === applied) return
            applied = next
            style.textContent = next
          }
          paint()
          document.head.appendChild(style)
          const timer = window.setInterval(paint, 1500)
          return () => {
            window.clearInterval(timer)
            style.remove()
          }
        }, 'hdd: skin stylesheet')

        effect(
          () => locale && locale.register('dsh-hdd', {
            zh: {
              greetingMorning: '早安，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              greetingNoon: '午安，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              greetingAfternoon: '下午好，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              greetingEvening: '晚上好，主人。H.D.D. 系统已就绪，Fairy 随时听你差遣。',
              online: '在线',
              sound: '开启声音',
              skip: '跳过',
              videoLabel: 'H.D.D. 开机动画',
              ariaFairy: 'Fairy 已上线，正在进入 H.D.D. 核心',
              brandTag: '空洞深潜系统',
              heroSubtitle: '空 洞 深 潜 系 统',
              replay: '重播开屏动画',
            },
            en: {
              greetingMorning: 'Good morning, Master. H.D.D. is online — Fairy is at your service.',
              greetingNoon: 'Good afternoon, Master. H.D.D. is online — Fairy is at your service.',
              greetingAfternoon: 'Good afternoon, Master. H.D.D. is online — Fairy is at your service.',
              greetingEvening: 'Good evening, Master. H.D.D. is online — Fairy is at your service.',
              online: 'Online',
              sound: 'Sound',
              skip: 'Skip',
              videoLabel: 'H.D.D. boot animation',
              ariaFairy: 'Fairy is online and entering the H.D.D. core',
              brandTag: 'HOLLOW DEEP DIVE',
              heroSubtitle: 'HOLLOW DEEP DIVE SYSTEM',
              replay: 'Replay boot animation',
            },
          }),
          'hdd: copy',
        )

        const t = locale ? locale.bind('dsh-hdd') : ((key) => key)

        effect(() => {
          if (!document.body) return undefined
          const root = document.documentElement
          const body = document.body
          const hadDark = body.hasAttribute('data-ds-dark-theme')
          root.setAttribute('data-hdd-skin', '')
          body.setAttribute('data-ds-dark-theme', '')
          const keepDark = new MutationObserver(() => {
            if (!body.hasAttribute('data-ds-dark-theme')) body.setAttribute('data-ds-dark-theme', '')
          })
          keepDark.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
          return () => {
            keepDark.disconnect()
            root.removeAttribute('data-hdd-skin')
            if (!hadDark) body.removeAttribute('data-ds-dark-theme')
          }
        }, 'hdd: dark H.D.D. skin')

        /*
         * The billing view belongs to the shell, not to us: its own header sits
         * a shade away from the native window buttons, and trying to paint that
         * gap from CSS only moved the seam around. Hand the whole window back to
         * the stock look while that view is open — the back link is its only
         * fixed landmark — and take the skin up again when it closes.
         */
        effect(() => {
          if (!document.body) return undefined
          const root = document.documentElement
          const body = document.body
          let last = null
          let raf = 0
const billingOpen = () => {
            /* The link may be wrapped in an extra node, so match on the visible
               text of any small element, not only on a leaf span. */
            for (const el of document.querySelectorAll('a, button, span, div')) {
              if (el.childElementCount > 2) continue
              const text = (el.textContent || '').trim()
              if (text !== '返回 DeepSeek Harness' && !text.endsWith('返回 DeepSeek Harness')) continue
              if (text.length > 40) continue
              const box = el.getBoundingClientRect()
              if (box.width > 0 && box.height > 0) return true
            }
            return false
          }
          let ticks = 0
          let absent = 0
          const sync = () => {
            raf = 0
            let open = billingOpen()
            /* Fallback signal, sampled instead of on every mutation: the billing
               page is the only view with both of these labels. */
            if (!open && ticks % 3 === 0) {
              const text = body.innerText || ''
              open = text.includes('对公汇款') && text.includes('在线充值')
            }
            /* Structural rule, independent of labels: the skin only belongs to the
               chat surface. No composer for two ticks in a row means the shell is
               showing one of its own pages (billing, settings, a task detail), and
               those all look better — and more consistent — without us. */
            const chat = document.querySelector('[class*="_composerSeat"], [class*="_composerStack"], [class*="_composer"]')
            if (chat === null) absent += 1
            else absent = 0
            if (absent >= 2) open = true
            ticks += 1
            if (open === last) return
            last = open
            if (open) {
              /* Skin off only. Flipping the theme as well made the shell repaint
                 its title bar in the light palette, and that repaint did not come
                 back when the page closed — the corner ended up on a third
                 colour. Leave the dark palette alone; the stock page has its own
                 white surface anyway. */
              root.removeAttribute('data-hdd-skin')
            } else {
              root.setAttribute('data-hdd-skin', '')
              if (!body.hasAttribute('data-ds-dark-theme')) body.setAttribute('data-ds-dark-theme', '')
            }
          }
          const schedule = () => { if (raf === 0) raf = window.requestAnimationFrame(sync) }
          const observer = new MutationObserver(schedule)
          observer.observe(body, { childList: true, subtree: true })
          const timer = window.setInterval(sync, 800)
          sync()
          return () => {
            window.clearInterval(timer)
            window.cancelAnimationFrame(raf)
            observer.disconnect()
          }
        }, 'hdd: stock look on the billing page')



        /*
         * Cross-build guard. The shell's CSS-module hashes (BynINW_sidebarCol,
         * GRgSLq_card, …) change between builds, and then every hashed selector
         * in this skin silently matches nothing. The marker below is set only
         * when NONE of the known hashes exist, and the structural fallback block
         * is scoped to that marker — so a build that already matches never sees
         * the broader selectors, and a build that does not still gets a surface.
         */
        effect(() => {
          const KNOWN = '[class*="GRgSLq_card"], [class*="RlGAzG_card"], [class*="BynINW_sidebarCol"], [class*="BynINW_frame"], [class*="V4vHZW_root"], [class*="V4vHZW_root"]'
          const LEGACY_CSS = `
html[data-hdd-skin-legacy] [class*="_sidebarCol"] {
  background:
    linear-gradient(rgba(92, 128, 255, .034) 1px, transparent 1px),
    linear-gradient(90deg, rgba(92, 128, 255, .034) 1px, transparent 1px),
    linear-gradient(180deg, rgba(7, 12, 24, .93), rgba(4, 7, 14, .97)) !important;
  background-size: 22px 22px, 22px 22px, auto !important;
  border-right: 1px solid rgba(91, 124, 220, .16) !important;
}
html[data-hdd-skin-legacy] [class*="_composerSeat"],
html[data-hdd-skin-legacy] [class*="_composerStack"] {
  background: linear-gradient(180deg, #4a4f57 0%, #3b4048 100%) !important;
  box-shadow: none !important;
}
html[data-hdd-skin-legacy] [class*="_composerSeat"] [class*="_card"],
html[data-hdd-skin-legacy] [class*="_composerStack"] [class*="_card"] {
  background: linear-gradient(160deg, rgba(57, 120, 237, .44) 0%, rgba(25, 52, 153, .54) 52%, rgba(9, 18, 52, .66) 100%) !important;
  border: 1px solid rgba(110, 150, 245, .22) !important;
  border-top-color: rgba(196, 214, 255, .38) !important;
  border-radius: 20px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .14), 0 18px 44px rgba(0, 0, 0, .46) !important;
}
html[data-hdd-skin-legacy] [class*="_scrollBody"] {
  background: transparent !important;
}
`
          const tag = document.createElement('style')
          tag.id = 'fairy-skin-legacy'
          tag.textContent = LEGACY_CSS
          document.head.appendChild(tag)

          let last = null
          let raf = 0
          const sync = () => {
            raf = 0
            const legacy = document.querySelector(KNOWN) === null
            if (legacy === last) return
            last = legacy
            if (legacy) document.documentElement.setAttribute('data-hdd-skin-legacy', '')
            else document.documentElement.removeAttribute('data-hdd-skin-legacy')
          }
          const schedule = () => { if (raf === 0) raf = window.requestAnimationFrame(sync) }
          const observer = new MutationObserver(schedule)
          observer.observe(document.body, { childList: true, subtree: true })
          const timer = window.setInterval(sync, 2000)
          sync()
          return () => {
            window.clearInterval(timer)
            window.cancelAnimationFrame(raf)
            observer.disconnect()
            tag.remove()
            document.documentElement.removeAttribute('data-hdd-skin-legacy')
          }
        }, 'hdd: legacy-build marker')

        /*
         * Popover clip guard. The composer's "+" menu is absolutely positioned
         * inside the card and is clipped by the conversation scroller; a :has()
         * rule cannot tell "menu mounted" from "menu actually open", and a rule
         * that stayed on killed scrolling. So the clip is released only while a
         * real popover is measured on screen, published as one attribute.
         */
        effect(() => {
          let raf = 0
          let last = null
          /*
           * Anything that lives in the composer and grows upward — the "+" menu,
           * an approval card, an ask-me card, a tall draft — is clipped by the
           * same scroller. Measure the composer stack itself: once it is taller
           * than a settled composer, whatever is inside it must be allowed to
           * paint past the frame. A menu elsewhere on the page also counts.
           */
          const visibleTall = (selector, minW, minH) => {
            for (const node of document.querySelectorAll(selector)) {
              const box = node.getBoundingClientRect()
              if (box.height > minH && box.width > minW) return true
            }
            return false
          }
          const sync = () => {
            raf = 0
            const menu = visibleTall('[class*="_menu"]', 180, 60)
            let card = false
            if (!menu) {
              card = visibleTall('[class*="_approval"], [class*="_question"], [class*="_planReview"]', 160, 80)
              /* A dialog or a tall card that took the composer's place is a card
                 too, whatever its class is called on this build. */
              if (!card) card = visibleTall('[role="dialog"], [aria-modal="true"]', 200, 120)
              if (!card) {
                const seat = document.querySelector('[class*="_composerSeat"]')
                if (seat !== null) {
                  for (const node of seat.querySelectorAll('[class*="_card"]')) {
                    const box = node.getBoundingClientRect()
                    if (box.width > 240 && box.height > 230) { card = true; break }
                  }
                }
              }
              if (!card) {
                const stack = document.querySelector('[class*="_composerStack"]')
                if (stack !== null) card = stack.getBoundingClientRect().height > 210
              }
            }
            /* Menus need the clip released; tall cards must instead be capped and
               scroll inside themselves, or their buttons end up below the window
               where nothing can reach them. */
            const next = (menu ? 'm' : '') + (card ? 'c' : '')
            if (next === last) return
            last = next
            const root = document.documentElement
            if (menu) root.setAttribute('data-hdd-menu-open', '')
            else root.removeAttribute('data-hdd-menu-open')
            if (card) root.setAttribute('data-hdd-card-open', '')
            else root.removeAttribute('data-hdd-card-open')
          }
          const schedule = () => { if (raf === 0) raf = window.requestAnimationFrame(sync) }
          const observer = new MutationObserver(schedule)
          observer.observe(document.body, { childList: true, subtree: true })
          window.addEventListener('resize', schedule)
          const timer = window.setInterval(schedule, 700)
          sync()
          return () => {
            window.clearInterval(timer)
            window.cancelAnimationFrame(raf)
            window.removeEventListener('resize', schedule)
            observer.disconnect()
            document.documentElement.removeAttribute('data-hdd-menu-open')
            document.documentElement.removeAttribute('data-hdd-card-open')
          }
        }, 'hdd: popover clip guard')

        effect(() => {
          /* Mounted lazily: a cold app start can run this effect before the
             sidebar or its workspace region exists, so the card is created on
             the first tick that finds both, and re-created if the shell
             throws the injected node away. */
          let card = null
          let balanceNode = null
          let tokenNode = null
          let alignTimer = 0
          let balanceTimer = 0
          let energyTimer = 0
          const parseTokens = () => {
            const composer = document.querySelector('[class*="GRgSLq_root"]')
              || document.querySelector('[class*="RlGAzG_root"]')
            if (composer === null) return null
            const match = (composer.textContent || '').match(/(\d[\d.,]*)\s*([KkMmBb])?\s*tok(?!\s*\/)/)
            if (match === null) return null
            const value = Number(match[1].replace(/,/g, ''))
            if (!Number.isFinite(value)) return null
            const scale = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] || '').toLowerCase()] || 1
            return value * scale
          }
          /* The dock reports tokens and the row keeps that unit, billed as
             H.D.D. power draw: one figure, millions of tokens. */
          const formatTokens = (value) => {
            const millions = value / 1e6
            const text = Number.isFinite(millions) ? String(Number(millions.toFixed(1))) : '0'
            return text + ' M tok'
          }
          /* Today's energy: each session's total is compared with the last
             total seen for that session, and only the increase is banked, so
             switching sessions never double counts. Only the day's total
             resets at local midnight; the baselines survive it, so a session
             left open overnight is not counted twice. */
          /* Today's energy. The dock's token figure is the session's running
             total, and it can dip and climb again, so deltas are unusable:
             we keep the highest value seen per session and subtract the value
             the session had when the day started. Only that baseline resets
             at local midnight, so a session left open overnight is not
             counted twice. */
          const ENERGY_KEY = 'fairy-splash:energy:v3'
          const todayKey = () => {
            const now = new Date()
            return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
          }
          const loadEnergy = () => {
            try {
              const parsed = JSON.parse(window.localStorage.getItem(ENERGY_KEY) || 'null')
              if (parsed && parsed.seen && typeof parsed.seen === 'object' && parsed.base && typeof parsed.base === 'object') return parsed
            }
            catch (error) { /* storage unavailable */ }
            return { date: todayKey(), seen: {}, base: {} }
          }
          const saveEnergy = (state) => {
            try { window.localStorage.setItem(ENERGY_KEY, JSON.stringify(state)) } catch (error) { /* ignore */ }
          }
          const sessionKey = () => {
            const row = document.querySelector('[class*="sessionRow"][aria-current="true"]')
              || document.querySelector('[class*="sessionRow"][data-active="true"]')
            const text = row === null ? '' : (row.textContent || '').trim().slice(0, 60)
            return text || 'session'
          }
          let energy = loadEnergy()
          const todayTotal = () => {
            let sum = 0
            for (const key of Object.keys(energy.seen)) {
              const base = energy.base[key]
              if (typeof base === 'number') sum += Math.max(0, energy.seen[key] - base)
            }
            return sum
          }
          /* Whatever conversation is open, its own running total is what the
             composer dock reports; bill that directly as H.D.D. power. */
          const accumulate = () => {
            if (tokenNode === null) return
            const value = parseTokens()
            const text = value === null ? '—' : formatTokens(value)
            // 10 Hz polling: only touch the DOM when the readout changes.
            if (tokenNode.textContent !== text) tokenNode.textContent = text
          }
          const resolveRemote = () => {
            const getter = typeof ctx.get === 'function' ? ctx.get : null
            if (getter !== null) {
              try {
                const hub = getter.call(ctx, 'remote')
                if (hub) return hub
              }
              catch (error) { /* not registered for this context */ }
            }
            try {
              if (ctx.remote) return ctx.remote
            }
            catch (error) { /* service guard */ }
            const global = typeof window !== 'undefined' ? window : undefined
            const bridge = global && global.__DSH__ ? global.__DSH__ : undefined
            if (bridge && bridge.remote) return bridge.remote
            return undefined
          }
          const pick = (obj, key) => {
            if (!obj) return undefined
            if (typeof obj.get === 'function') {
              try {
                const value = obj.get(key)
                if (value) return value
              }
              catch (error) { /* not registered */ }
            }
            const spaces = obj.namespaces
            if (spaces) {
              try {
                const value = typeof spaces.get === 'function' ? spaces.get(key) : spaces[key]
                if (value) return value
              }
              catch (error) { /* guarded */ }
            }
            try { return obj[key] } catch (error) { return undefined }
          }
          const readBalance = async () => {
            if (balanceNode === null) return
            try {
              const hub = resolveRemote()
              const entry = pick(hub, 'account')
              const remote = entry && entry.service ? entry.service : entry
              if (!remote || typeof remote.getBalance !== 'function') {
                balanceNode.textContent = '不可用'
                return
              }
              const active = locale && locale.getSnapshot ? locale.getSnapshot().active : 'zh-CN'
              const meta = {
                version: '0.2.1-rc.3',
                locale: active,
                timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
              }
              const result = await remote.getBalance(meta)
              const outcome = result && result.ok ? result.value : null
              if (!outcome || outcome.status !== 'ready') return
              const all = [].concat(
                Array.isArray(outcome.value) ? outcome.value : [],
                Array.isArray(outcome.bonusWallets) ? outcome.bonusWallets : [],
              ).filter((entry) => entry && typeof entry.balance === 'string')
              if (all.length === 0) return
              const preferred = all.find((entry) => entry.currency === 'CNY') || all[0]
              const sameCurrency = all.filter((entry) => entry.currency === preferred.currency)
              const total = sameCurrency.reduce((sum, entry) => sum + (Number(entry.balance) || 0), 0)
              const sign = preferred.currency === 'CNY' ? '\u00a5' : '$'
              const parts = Math.abs(total).toFixed(2).split('.')
              const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              balanceNode.textContent = (total < 0 ? '-' : '') + sign + grouped + '.' + parts[1]
            }
            catch (error) {
              if (balanceNode !== null && balanceNode.textContent === '—') balanceNode.textContent = '—'
            }
          }
          /* Today's energy across every conversation. The Host exposes each
             session's cumulative TokenUsage through session/projections; we sum
             the sessions that were active since local midnight and fall back to
             the local counter when that call is unavailable. */
          let energyFromHost = false
          const readHostEnergy = async () => {
            try {
              const hub = resolveRemote()
              const entry = pick(hub, 'session')
              const sessionService = entry && entry.service ? entry.service : entry
              if (!sessionService || typeof sessionService.list !== 'function') return
              const listed = await sessionService.list({})
              const items = listed && Array.isArray(listed.items) ? listed.items : []
              if (items.length === 0) return
              const midnight = new Date()
              midnight.setHours(0, 0, 0, 0)
              const since = midnight.getTime()
              let total = 0
              let counted = 0
              for (const item of items) {
                if (!item || typeof item.sessionId !== 'string') continue
                if (typeof item.updatedAt === 'number' && item.updatedAt < since) continue
                try {
                  const projection = await sessionService.projections({ sessionId: item.sessionId })
                  const values = projection && projection.values ? projection.values : projection
                  const usage = values && values.usage ? values.usage : null
                  if (!usage) continue
                  const sum = typeof usage.totalTokens === 'number'
                    ? usage.totalTokens
                    : (Number(usage.inputTokens) || 0) + (Number(usage.outputTokens) || 0)
                  if (Number.isFinite(sum) && sum > 0) { total += sum; counted += 1 }
                }
                catch (error) { /* one session unreadable, keep the rest */ }
              }
              if (counted === 0) return
              energyFromHost = true
              if (tokenNode !== null) tokenNode.textContent = formatTokens(total)
            }
            catch (error) { /* fall back to the local counter */ }
          }
          const alignCard = () => {
            if (card === null || !card.isConnected) return
            const button = document.querySelector('[class*="newSession"]')
            const parent = card.parentElement
            if (button === null || parent === null) return
            const target = button.getBoundingClientRect()
            const parentRect = parent.getBoundingClientRect()
            if (target.width < 80) return
            const style = getComputedStyle(parent)
            const padLeft = Number.parseFloat(style.paddingLeft) || 0
            const padRight = Number.parseFloat(style.paddingRight) || 0
            card.style.marginLeft = Math.max(0, Math.round(target.left - parentRect.left - padLeft)) + 'px'
            card.style.marginRight = Math.max(0, Math.round(parentRect.right - target.right - padRight)) + 'px'
          }
          const mount = () => {
            if (card !== null && card.isConnected) return true
            const column = document.querySelector('[class*="sidebarCol"]')
            if (column === null) return false
            const anchor = column.querySelector('[class*="regionArea"]')
            if (anchor === null) return false
            for (const stale of document.querySelectorAll('.fs-rail-stats')) stale.remove()
            card = document.createElement('div')
            card.className = 'fs-rail-stats'
            card.innerHTML = '<div class="fs-rs-head">H.D.D. 账户</div>'
              + '<div class="fs-rs-row"><span>余额</span><b data-fs-balance>—</b></div>'
              + '<div class="fs-rs-row"><span>本对话消耗电量</span><b data-fs-tokens>—</b></div>'
            if (anchor.parentElement !== null) anchor.insertAdjacentElement('afterend', card)
            else column.appendChild(card)
            balanceNode = card.querySelector('[data-fs-balance]')
            tokenNode = card.querySelector('[data-fs-tokens]')
            alignCard()
            window.addEventListener('resize', alignCard)
            window.clearInterval(alignTimer)
            alignTimer = window.setInterval(alignCard, 1200)
            window.clearInterval(balanceTimer)
            balanceTimer = window.setInterval(() => { void readBalance() }, 30000)
            void readBalance()
            return true
          }
          const tick = () => {
            if (!mount()) return
            const copies = document.querySelectorAll('.fs-rail-stats')
            for (let index = 1; index < copies.length; index += 1) copies[index].remove()
            accumulate()
          }
          tick()
          const timer = window.setInterval(tick, 100)
          return () => {
            window.clearInterval(timer)
            window.clearInterval(alignTimer)
            window.clearInterval(balanceTimer)
            window.clearInterval(energyTimer)
            window.removeEventListener('resize', alignCard)
            if (card !== null) card.remove()
            card = null
            balanceNode = null
            tokenNode = null
          }
        }, 'hdd: rail stats')

        effect(() => {
          // One crisp SVG in the shell's brand cell; only its gear and iris
          // rotate. No glitch layers, no RGB ghosts, no scanlines.
          let observer
          let watched
          const paint = () => {
            paintBrandCore()
            const mark = skinNode('2H3hWW', 'brandMark')
            if (mark === null || mark === watched) return
            observer?.disconnect()
            watched = mark
            observer = new MutationObserver(() => paintBrandCore())
            observer.observe(mark, { childList: true })
          }
          paint()
          const timer = window.setInterval(paint, 900)
          return () => {
            window.clearInterval(timer)
            observer?.disconnect()
            observer = undefined
            watched = undefined
            for (const node of document.querySelectorAll('.fs-brand-live')) node.remove()
            for (const mark of skinNodes('2H3hWW', 'brandMark')) mark.classList.remove('has-live-core')
          }
        }, 'hdd: rotating brand')

        effect(() => {
          // Align the workspace list's right edge to the New Session button's
          // right edge at runtime. The sidebar nests the two in different
          // containers, so a fixed margin drifts when the window is resized.
          let raf = 0
          let observer
          let buttonObserver
          let button
          const align = () => {
            const nextButton = skinNode('2H3hWW', 'newSession')
            const list = skinNode('9lTDKa', 'listArea')
            if (nextButton === null || list === null) return
            if (nextButton !== button) {
              buttonObserver?.disconnect()
              button = nextButton
              buttonObserver = new ResizeObserver(schedule)
              buttonObserver.observe(button)
            }
            const target = button.getBoundingClientRect()
            const current = list.getBoundingClientRect()
            if (target.width < 80 || current.width < 80) return
            const delta = current.right - target.right
            if (Math.abs(delta) < 0.5) return
            const margin = Number.parseFloat(list.style.getPropertyValue('margin-right')) || 0
            list.style.setProperty('margin-right', `${margin + delta}px`, 'important')
          }
          const schedule = () => {
            window.cancelAnimationFrame(raf)
            raf = window.requestAnimationFrame(align)
          }
          schedule()
          const sidebar = skinNode('2H3hWW', 'root')
          observer = new ResizeObserver(schedule)
          if (sidebar !== null) observer.observe(sidebar)
          window.addEventListener('resize', schedule)
          const timer = window.setInterval(schedule, 1200)
          return () => {
            window.clearInterval(timer)
            window.cancelAnimationFrame(raf)
            window.removeEventListener('resize', schedule)
            observer?.disconnect()
            buttonObserver?.disconnect()
            for (const list of skinNodes('9lTDKa', 'listArea')) list.style.removeProperty('margin-right')
          }
        }, 'hdd: align workspace to new session')

        effect(
          () => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
            name: 'shell.overlay',
            id: 'dsh-hdd',
            order: 80,
          }, (props) => h(FairySplash, { ...props, t, locale }))),
          'hdd: overlay',
        )


        // The sidebar brand is replaced visually through the scoped skin CSS:
        // the single-slot brand entries are owned by the shell and cannot be
        // re-registered safely from a bundle, so an additive attempt would
        // abort the whole plugin. CSS keeps the shell's own structure intact.
        }
        catch (error) {
          console.error('[hdd] apply failed', error)
        }
      },
    }
    }
    catch (error) {
      console.error('[hdd] factory failed', error)
      return { inject: [], apply() {} }
    }
    }

    const __splash = __createSplash(require)

    /* ================= HDD 自己的部分 ================= */
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    const PKG = 'dsh-hdd'
    const VERSION = '2.0.0'
    const KEY = 'hdd.state'
    const EVENT = 'hdd:changed'

    /* 皮肤原来的遮罩三段 alpha，乘以系数即为实际值 */
    const SCRIM = [0.88, 0.64, 0.82]
    const SCRIM_HERO = [0.92, 0.70, 0.90]

    const DEFAULTS = {
      source: 'default',
      path: '',
      url: '',
      scrim: 1,
      fixedBg: true,
      orbHero: true,
      orbChat: true,
      orbHeader: true,
      capsule: 'blue',
      rev: 1,
    }

    const zh = /^zh/i.test(String(navigator.language || 'zh'))
    const L = zh
      ? {
          nav: 'HDD',
          title: '对话区背景',
          intro: '背景图、遮罩、三颗全息核心、输入框外观。改动立即生效，不用重启。',
          source: '背景来源',
          sDefault: '跟随皮肤',
          sFile: '本地文件',
          sUrl: '网络 URL',
          sNone: '关闭背景',
          fileHint: '填图片的完整路径，例如 C:\\Users\\你\\Pictures\\bg.jpg。支持 jpg / png / webp / gif / avif / bmp，上限 12 MB。',
          urlHint: '填图片地址（http 或 https）。由本机 DSH 代取，浏览器直连被拦也不影响。',
          apply: '应用',
          scrim: '遮罩浓度',
          scrimHint: '压在背景上的那层黑。0% 完全不压、图最亮；100% 是皮肤原样。',
          fixedBg: '背景固定',
          fixedBgHint: '开启后背景贴着窗口，滚内容时图不动；关掉则随内容一起滚。',
          orbs: '全息核心',
          orbHero: '新会话页（屏幕正中）',
          orbChat: '对话区（顶部小眼睛）',
          orbHeader: '标题栏',
          composer: '输入区',
          capsule: '输入框背景',
          capsuleBlue: '蓝色亚克力',
          capsuleWhite: '白色亚克力',
          capsuleHint: '蓝色是皮肤原本的蓝玻璃（卡片尺寸与投影已收窄）；白色是磨砂白玻璃，文字自动反成深色。切换即时生效。',
          persona: '人格（AGENT.md）',
          personaHint: '直接编辑全局人格文件，保存后写入 ~/.dsh/AGENT.md；上一版会留成 .bak-hdd。',
          save: '保存',
          saved: '已保存',
          loading: '读取中…',
          saveFail: '保存失败：',
          reset: '全部恢复默认',
          applied: '已应用',
          resetDone: '已恢复默认',
          badPath: '先填一个图片的完整路径',
          badUrl: 'URL 需要以 http:// 或 https:// 开头',
        }
      : {
          nav: 'HDD',
          title: 'Conversation backdrop',
          intro: 'Backdrop, scrim, the three holographic cores and the composer capsule. Changes apply immediately.',
          source: 'Backdrop source',
          sDefault: 'Follow skin',
          sFile: 'Local file',
          sUrl: 'Web URL',
          sNone: 'Off',
          fileHint: 'Full path to an image, e.g. C:\\Users\\you\\Pictures\\bg.jpg. jpg / png / webp / gif / avif / bmp, up to 12 MB.',
          urlHint: 'Image URL (http or https). Fetched by this DSH host, so browser CORS does not matter.',
          apply: 'Apply',
          scrim: 'Scrim strength',
          scrimHint: 'The dark layer over the artwork. 0% keeps the image brightest; 100% is the skin default.',
          fixedBg: 'Pin the backdrop',
          fixedBgHint: 'On: the image stays put while content scrolls. Off: it scrolls with the content.',
          orbs: 'Holographic cores',
          orbHero: 'New-session page (screen centre)',
          orbChat: 'Conversation area (top eye)',
          orbHeader: 'Title bar',
          composer: 'Composer',
          capsule: 'Input background',
          capsuleBlue: 'Blue acrylic',
          capsuleWhite: 'White acrylic',
          capsuleHint: 'Blue is the skin’s own glass, now card-sized with a lighter shadow; white is frosted with dark text. Switching applies immediately.',
          persona: 'Persona (AGENT.md)',
          personaHint: 'Edits the global persona file; saving writes ~/.dsh/AGENT.md and keeps the previous version as .bak-hdd.',
          save: 'Save',
          saved: 'Saved',
          loading: 'Loading…',
          saveFail: 'Save failed: ',
          reset: 'Reset all',
          applied: 'Applied',
          resetDone: 'Reset to defaults',
          badPath: 'Enter a full image path first',
          badUrl: 'URL must start with http:// or https://',
        }

        /*
     * 输入区：座位只负责内边距与圆角，永不刷底。
     *
     * 座位是宿主自己的 [data-composer-seat]（稳定属性，不随构建哈希变），旧构建
     * 只有类名，所以两条都写。宿主给座位画一条 --dsw-alias-bg-base 的纵向渐变
     * （0px 透明 → 36px 实色），座位又被 margin-top:auto 撑到柱底，于是滚到底就
     * 露出一整块深色。清它必须清整个 background 简写，只清 background-color 会
     * 把那条渐变留下。
     */

    const COMPOSER_CSS = `
:root {
  --dsh-composer-gap-x: 12px;
  --dsh-composer-gap-top: 10px;
  --dsh-composer-gap-bottom: 6px;
  --dsh-composer-frame-radius: 26px;
}

/*
 * 输入区座位（composer seat）：内边距与圆角常驻，用来做四周留白与外框形状。
 * 座位是宿主自己的 [data-composer-seat]（稳定属性，不随构建哈希变），
 * 旧构建只有类名，两条都写。
 *
 * 底色只在「灰底外框」打开时才刷。默认关闭，此时一行不刷底——宿主自己会给
 * 座位画一条 --dsw-alias-bg-base 的竖向渐变（0px 透明 → 36px 实色），座位
 * 又被 margin-top:auto 撑到柱底，于是滚到底就露出一整块深色。清它必须清
 * 整个 background 简写（连 background-image 一起），只清 background-color
 * 会留下那条渐变。
 */
[data-composer-seat],
[class*="_composerSeat"] {
  padding:
    var(--dsh-composer-gap-top)
    var(--dsh-composer-gap-x)
    var(--dsh-composer-gap-bottom);
  border-radius: var(--dsh-composer-frame-radius);
}

/*
 * The seat itself never paints.
 *
 * The host draws a background-image gradient on the seat — transparent at 0px,
 * solid --dsw-alias-bg-base from 36px on — and pins the seat to the foot of the
 * column with margin-top:auto. When the conversation is scrolled to the bottom
 * that combination is exactly the dark block that used to appear around the
 * input card, and clearing only background-color left the gradient in place.
 * The shorthand clears both; nothing in this plugin puts either back.
 */
[data-composer-seat],
[class*="_composerSeat"],
[class*="_composerStack"] {
  background: none !important;
  box-shadow: none !important;
}




/*
 * 白色亚克力输入卡。两块要一起换：底色换成半透明白，文字必须反成深色，
 * 否则白底浅字看不见。磨砂靠 backdrop-filter，作用面只有这一颗胶囊，
 * 不像皮肤当初禁用整层模糊那样吃性能。
 */
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_card, .RlGAzG_card) {
  background: linear-gradient(180deg, rgba(255, 255, 255, .90) 0%, rgba(243, 247, 255, .84) 100%) !important;
  border: 1px solid rgba(255, 255, 255, .74) !important;
  border-top-color: rgba(255, 255, 255, .96) !important;
  backdrop-filter: blur(18px) saturate(1.12) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.12) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .92),
    0 18px 44px rgba(3, 8, 22, .40),
    0 2px 10px rgba(3, 8, 22, .24) !important;
  color: #16233d !important;
  text-shadow: none !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_card, .RlGAzG_card) :is(textarea, input) {
  color: #16233d !important;
  caret-color: #2456c4 !important;
  text-shadow: none !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_card, .RlGAzG_card) :is(textarea, input)::placeholder {
  color: rgba(22, 35, 61, .44) !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_card, .RlGAzG_card) :is(button, span, small) {
  color: #24395f !important;
  text-shadow: none !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_card, .RlGAzG_card) svg {
  color: #24395f !important;
}

/*
 * 反色补漏：皮肤里还有一批浅色规则直接压在胶囊内部的元素上（输入区、占位符、
 * "+" 与发送按钮、计数条），白底之后就成了白字白底。这批选择器比上面的卡级
 * 规则更具体，所以逐条点名，不做全局通配。
 */
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_input, .RlGAzG_input) {
  color: #1a2743 !important;
  caret-color: #2456c4 !important;
  text-shadow: none !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_placeholder, .RlGAzG_placeholder) {
  color: rgba(26, 39, 67, .46) !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] :is(.GRgSLq_add, .GRgSLq_primary, .RlGAzG_add) {
  color: #22304d !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] ._2WTFBq_bar {
  background: rgba(34, 48, 77, .08) !important;
  color: #3a4a6d !important;
}
html[data-hdd-skin][data-hdd-capsule="white"] ._2WTFBq_bar :is(span, div, p) {
  color: #3a4a6d !important;
}
/*
 * 蓝色亚克力：颜色仍是皮肤原本的蓝玻璃（渐变 + 颗粒 + 液体层），这里只改
 * 尺寸与投影 —— 把胶囊从「撑满整行」收成一颗居中卡片，和白色那版同宽同高，
 * 切换时布局不跳。投影取中性值：滚到底时压在浅色内容上也不会糊成一块黑。
 */
html[data-hdd-skin][data-hdd-capsule="blue"] .an3WzG_composerSeat,
html[data-hdd-skin][data-hdd-capsule="blue"] [class*="_composerSeat"] {
  padding-left: 12px !important;
  padding-right: 12px !important;
}
html[data-hdd-skin][data-hdd-capsule="blue"] :is(.GRgSLq_card, .RlGAzG_card) {
  width: min(100%, var(--hdd-capsule-max, 760px)) !important;
  margin-left: auto !important;
  margin-right: auto !important;
  border-radius: 22px !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .16),
    inset 0 -16px 28px -24px rgba(0, 0, 0, .42),
    0 12px 28px rgba(3, 8, 22, .34),
    0 2px 8px rgba(3, 8, 22, .20),
    0 0 26px rgba(92, 132, 255, .10) !important;
}

`

    function readState() {
      try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return { ...DEFAULTS }
        const parsed = JSON.parse(raw)
        const scrim = Number(parsed.scrim)
        return {
          source: ['default', 'file', 'url', 'none'].includes(parsed.source) ? parsed.source : 'default',
          path: typeof parsed.path === 'string' ? parsed.path : '',
          url: typeof parsed.url === 'string' ? parsed.url : '',
          scrim: Number.isFinite(scrim) ? Math.min(1, Math.max(0, scrim)) : 1,
          fixedBg: parsed.fixedBg !== false,
          orbHero: parsed.orbHero !== false,
          orbChat: parsed.orbChat !== false,
          orbHeader: parsed.orbHeader !== false,
          capsule: parsed.capsule === 'white' ? 'white' : ('blue' === parsed.capsule ? 'blue' : (parsed.acrylic === true ? 'white' : 'blue')),
          rev: Number.isFinite(parsed.rev) ? parsed.rev : 1,
        }
      }
      catch {
        return { ...DEFAULTS }
      }
    }

    function writeState(state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      }
      catch {}
      try {
        window.dispatchEvent(new CustomEvent(EVENT))
      } catch {}
    }

    function artValue(state) {
      if (state.source === 'none') return 'none'
      if (state.source === 'file' && state.path.trim() !== '') {
        return `url("/hdd/v1/file?p=${encodeURIComponent(state.path.trim())}&rev=${state.rev}")`
      }
      if (state.source === 'url' && state.url.trim() !== '') {
        return `url("/hdd/v1/proxy?u=${encodeURIComponent(state.url.trim())}&rev=${state.rev}")`
      }
      return null
    }

    function scrimGradient(stops, factor) {
      const pct = ['0%', '32%', '100%']
      return `linear-gradient(180deg, ${stops
        .map((alpha, i) => `rgba(5, 7, 14, calc(${alpha} * ${factor.toFixed(3)})) ${pct[i]}`)
        .join(', ')})`
    }

    /* 「跟随皮肤」时用的就是随包的那张图。 */
    const DEFAULT_ART = 'url("/hdd/v1/chat-bg.jpg")'

    /*
     * 背景画在对话栏本身：它是布局格子而不是滚动容器，盒子已经到窗口底边，
     * 所以图不会被列表裁掉。两个 slot 包装层都是 display:contents、没有盒子，
     * 真正有盒子的是它下面那个带 data-phase 的元素。
     * 「背景固定」关掉时改挂到对话内容上，图就随消息一起滚。
     */
    function buildCss(state) {
      const art = artValue(state)
      const factor = state.scrim
      const anchor = state.fixedBg
        ? '[data-slot="main.conversation"] > [data-phase]'
        : '[data-conversation-content]'
      const canvas = `html[data-hdd-skin][data-hdd] ${anchor}`
      /* 「关闭背景」只留遮罩，画布就是一块深色底。 */
      const picture = art === 'none' ? '' : `, ${art === null ? DEFAULT_ART : art}`

      const rules = [
        `${canvas} {`
        + ` background-image: ${scrimGradient(SCRIM, factor)}${picture} !important;`
        + ' background-size: cover !important;'
        + ' background-position: 50% 14% !important;'
        + ' background-repeat: no-repeat !important;'
        + ' background-color: #04060d !important; }',
        /* 新会话页把脸摆得更靠中间，遮罩略重、构图下移，和卡片让位。 */
        `${canvas}[data-phase="hero"] {`
        + ` background-image: ${scrimGradient(SCRIM_HERO, factor)}${picture} !important;`
        + ' background-position: 50% 22% !important; }',
      ]

      const parts = []
      if (!state.orbHero) parts.push('.fs-hero-orb', '.fs-halo', '.fs-orb-glow')
      if (!state.orbChat) parts.push('.fs-chat-orb')
      if (!state.orbHeader) parts.push('.fs-header-orb')
      if (parts.length > 0) {
        const scoped = parts.map((selector) => `html[data-hdd] ${selector}`)
        rules.push(`${scoped.join(', ')} { display: none !important; visibility: hidden !important; opacity: 0 !important; }`)
      }

      return rules.join('\n')
    }

    function syncRoot(state) {
      const root = document.documentElement
      root.setAttribute('data-hdd', '')
      root.setAttribute('data-hdd-version', VERSION)
      const hidden = []
      if (!state.orbHero) hidden.push('hero')
      if (!state.orbChat) hidden.push('chat')
      if (!state.orbHeader) hidden.push('header')
      root.setAttribute('data-hdd-orb', hidden.join(' '))
      root.setAttribute('data-hdd-capsule', state.capsule === 'white' ? 'white' : 'blue')
    }

    const rowStyle = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid rgba(127, 127, 127, .22)',
    }
    const labelStyle = { fontSize: '13px', lineHeight: '20px' }
    const hintStyle = { fontSize: '12px', lineHeight: '18px', opacity: .62, marginTop: '2px' }
    const fieldStyle = {
      flex: '1 1 260px',
      minWidth: 0,
      font: 'inherit',
      fontSize: '13px',
      color: 'inherit',
      background: 'transparent',
      border: '1px solid rgba(127, 127, 127, .38)',
      borderRadius: '6px',
      padding: '6px 8px',
    }
    const buttonStyle = {
      font: 'inherit',
      fontSize: '13px',
      color: 'inherit',
      background: 'rgba(127, 127, 127, .10)',
      border: '1px solid rgba(127, 127, 127, .38)',
      borderRadius: '6px',
      padding: '5px 10px',
      cursor: 'pointer',
    }
    const buttonOnStyle = { ...buttonStyle, background: 'rgba(103, 139, 255, .26)', borderColor: 'rgba(103, 139, 255, .62)' }
    const sectionTitleStyle = { fontSize: '15px', fontWeight: 600, margin: '22px 0 4px' }

    function Toggle({ on, label, onChange }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': on,
        'aria-label': label,
        onClick: onChange,
        style: {
          flex: 'none',
          width: '42px',
          height: '24px',
          borderRadius: '12px',
          border: '1px solid rgba(127, 127, 127, .38)',
          background: on ? 'rgba(103, 139, 255, .62)' : 'rgba(127, 127, 127, .18)',
          cursor: 'pointer',
          position: 'relative',
          padding: 0,
        },
      }, h('span', {
        style: {
          position: 'absolute',
          top: '2px',
          left: on ? '20px' : '2px',
          width: '18px',
          height: '18px',
          borderRadius: '9px',
          background: '#fff',
          transition: 'left 140ms ease',
        },
      }))
    }

    function HddPanel() {
      const [state, setState] = useState(readState)
      const [path, setPath] = useState(() => readState().path)
      const [url, setUrl] = useState(() => readState().url)
      const [notice, setNotice] = useState('')

      const [persona, setPersona] = useState('')
      const [personaPath, setPersonaPath] = useState('')
      const [personaState, setPersonaState] = useState('loading')
      const [personaNote, setPersonaNote] = useState('')

      useEffect(() => {
        let alive = true
        fetch('/hdd/v1/persona', { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
          .then((data) => {
            if (!alive) return
            setPersona(typeof data.text === 'string' ? data.text : '')
            setPersonaPath(typeof data.path === 'string' ? data.path : '')
            setPersonaState('ready')
          })
          .catch((error) => {
            if (!alive) return
            setPersonaState('error')
            setPersonaNote(String(error.message ?? error))
          })
        return () => { alive = false }
      }, [])

      const commit = useCallback((patch) => {
        const next = { ...readState(), ...patch, rev: Date.now() }
        writeState(next)
        setState(next)
        return next
      }, [])

      const pick = (source) => {
        commit({ source })
        setNotice('')
      }

      const applyInput = () => {
        const current = readState()
        if (current.source === 'file') {
          if (path.trim() === '') return setNotice(L.badPath)
          commit({ path: path.trim() })
          return setNotice(L.applied)
        }
        if (current.source === 'url') {
          if (!/^https?:\/\//i.test(url.trim())) return setNotice(L.badUrl)
          commit({ url: url.trim() })
          return setNotice(L.applied)
        }
        return setNotice('')
      }

      const savePersona = () => {
        setPersonaState('saving')
        setPersonaNote('')
        fetch('/hdd/v1/persona', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: persona }),
        })
          .then((response) => response.json().catch(() => null).then((data) => ({ ok: response.ok, data })))
          .then(({ ok, data }) => {
            if (!ok) throw new Error((data && data.error) || 'unknown')
            setPersonaState('ready')
            setPersonaNote(L.saved)
          })
          .catch((error) => {
            setPersonaState('error')
            setPersonaNote(L.saveFail + String(error.message ?? error))
          })
      }

      const reset = () => {
        writeState({ ...DEFAULTS, rev: Date.now() })
        setState(readState())
        setPath('')
        setUrl('')
        setNotice(L.resetDone)
      }

      const segButton = (source, label) => h('button', {
        type: 'button',
        onClick: () => pick(source),
        'aria-pressed': state.source === source,
        style: state.source === source ? buttonOnStyle : buttonStyle,
      }, label)

      const toggleRow = (label, hint, key) => h('div', { style: rowStyle },
        h('div', { style: { flex: '1 1 auto' } },
          h('div', { style: labelStyle }, label),
          hint ? h('div', { style: hintStyle }, hint) : null,
        ),
        h(Toggle, { on: state[key], label, onChange: () => commit({ [key]: !readState()[key] }) }),
      )

      const capsuleButton = (value, label) => h('button', {
        type: 'button',
        onClick: () => commit({ capsule: value }),
        'aria-pressed': state.capsule === value,
        style: state.capsule === value ? buttonOnStyle : buttonStyle,
      }, label)

      const resolved = artValue(state)
      return h('div', { style: { padding: '4px 0 24px', maxWidth: '720px' } },
        h('div', { style: { fontSize: '16px', fontWeight: 600, marginBottom: '4px' } }, 'HDD'),
        h('div', { style: hintStyle }, L.intro),

        h('div', { style: { ...rowStyle, marginTop: '10px' } },
          h('div', { style: { flex: '1 1 auto' } }, h('div', { style: labelStyle }, L.source)),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' } },
            segButton('default', L.sDefault),
            segButton('file', L.sFile),
            segButton('url', L.sUrl),
            segButton('none', L.sNone),
          ),
        ),

        state.source === 'file'
          ? h('div', { style: rowStyle },
              h('div', { style: { flex: '1 1 100%' } },
                h('input', {
                  value: path,
                  onChange: (event) => setPath(event.target.value),
                  placeholder: 'C:\\Users\\you\\Pictures\\bg.jpg',
                  spellCheck: false,
                  style: { ...fieldStyle, width: '100%', boxSizing: 'border-box' },
                }),
                h('div', { style: hintStyle }, L.fileHint),
                h('div', { style: { marginTop: '8px', display: 'flex', gap: '8px' } },
                  h('button', { type: 'button', onClick: applyInput, style: buttonOnStyle }, L.apply),
                ),
              ),
            )
          : null,

        state.source === 'url'
          ? h('div', { style: rowStyle },
              h('div', { style: { flex: '1 1 100%' } },
                h('input', {
                  value: url,
                  onChange: (event) => setUrl(event.target.value),
                  placeholder: 'https://example.com/bg.jpg',
                  spellCheck: false,
                  style: { ...fieldStyle, width: '100%', boxSizing: 'border-box' },
                }),
                h('div', { style: hintStyle }, L.urlHint),
                h('div', { style: { marginTop: '8px', display: 'flex', gap: '8px' } },
                  h('button', { type: 'button', onClick: applyInput, style: buttonOnStyle }, L.apply),
                ),
              ),
            )
          : null,

        h('div', { style: rowStyle },
          h('div', { style: { flex: '1 1 100%' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } },
              h('div', { style: labelStyle }, L.scrim),
              h('div', { style: { fontSize: '12px', opacity: .75, fontVariantNumeric: 'tabular-nums' } },
                `${Math.round(state.scrim * 100)}%`),
            ),
            h('input', {
              type: 'range',
              min: 0,
              max: 100,
              step: 5,
              value: Math.round(state.scrim * 100),
              onChange: (event) => commit({ scrim: Number(event.target.value) / 100 }),
              style: { width: '100%', marginTop: '8px', accentColor: '#678bff' },
            }),
            h('div', { style: hintStyle }, L.scrimHint),
          ),
        ),

        toggleRow(L.fixedBg, L.fixedBgHint, 'fixedBg'),

        h('div', { style: { ...rowStyle, borderBottom: 'none', paddingBottom: '0' } },
          h('div', { style: { flex: '1 1 auto' } }, h('div', { style: labelStyle }, L.orbs)),
        ),
        toggleRow(L.orbHero, null, 'orbHero'),
        toggleRow(L.orbChat, null, 'orbChat'),
        toggleRow(L.orbHeader, null, 'orbHeader'),

        h('div', { style: { ...rowStyle, borderBottom: 'none', paddingBottom: '0' } },
          h('div', { style: { flex: '1 1 auto' } }, h('div', { style: labelStyle }, L.composer)),
        ),

        h('div', { style: rowStyle },
          h('div', { style: { flex: '1 1 auto' } },
            h('div', { style: labelStyle }, L.capsule),
            h('div', { style: hintStyle }, L.capsuleHint),
          ),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' } },
            capsuleButton('blue', L.capsuleBlue),
            capsuleButton('white', L.capsuleWhite),
          ),
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '14px', flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: reset, style: buttonStyle }, L.reset),
          notice ? h('span', { style: { fontSize: '12px', opacity: .7 } }, notice) : null,
        ),

        resolved === null
          ? null
          : h('div', { style: { ...hintStyle, marginTop: '10px', wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace' } }, resolved),

        h('div', { style: sectionTitleStyle }, L.persona),
        h('div', { style: hintStyle }, L.personaHint),
        personaPath
          ? h('div', { style: { ...hintStyle, fontFamily: 'ui-monospace, monospace' } }, personaPath)
          : null,
        personaState === 'loading'
          ? h('div', { style: { ...hintStyle, marginTop: '10px' } }, L.loading)
          : h('textarea', {
              value: persona,
              onChange: (event) => setPersona(event.target.value),
              spellCheck: false,
              rows: 16,
              style: {
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '8px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '12px',
                lineHeight: '18px',
                color: 'inherit',
                background: 'transparent',
                border: '1px solid rgba(127, 127, 127, .38)',
                borderRadius: '6px',
                padding: '8px',
                resize: 'vertical',
              },
            }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' } },
          h('button', {
            type: 'button',
            onClick: savePersona,
            disabled: personaState === 'loading' || personaState === 'saving',
            style: personaState === 'loading' || personaState === 'saving' ? { ...buttonStyle, opacity: .5, cursor: 'default' } : buttonOnStyle,
          }, L.save),
          personaNote ? h('span', { style: { fontSize: '12px', opacity: .7 } }, personaNote) : null,
        ),
      )
    }

    /* 诊断：把输入区座位的元素链与计算样式回传宿主，落盘成 JSON。
       只有在仓库根目录存在 `.probe/ENABLED` 时宿主才会收（见 index.js），
       平时这个请求拿 404，页面里一行多余动静都没有。类名带构建哈希、
       宿主又不给开 F12，只能靠这条通道拿真实 DOM。 */
    function probeStyle(el) {
      const cs = window.getComputedStyle(el)
      const box = el.getBoundingClientRect()
      const attrs = []
      for (const attr of Array.prototype.slice.call(el.attributes).slice(0, 10)) {
        attrs.push(`${attr.name}="${attr.value}"`)
      }
      return {
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className : undefined,
        attrs,
        rect: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)],
        bgColor: cs.backgroundColor,
        bgImage: cs.backgroundImage === 'none' ? 'none' : cs.backgroundImage.slice(0, 240),
        shadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 160),
        padding: cs.padding,
        position: cs.position,
        zIndex: cs.zIndex,
        opacity: cs.opacity,
      }
    }

    function probeAt(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null
      const hits = document.elementsFromPoint(x, y)
      return {
        point: [Math.round(x), Math.round(y)],
        layers: hits.slice(0, 5).map(probeStyle),
      }
    }

    function reportComposerProbe() {
      try {
        const seat = document.querySelector('[data-composer-seat]')
          ?? document.querySelector('[class*="_composerSeat"]')
        const chain = []
        for (let node = seat; node !== null && chain.length < 10; node = node.parentElement) {
          chain.push(probeStyle(node))
        }
        const card = seat === null ? null : seat.querySelector('[class*="_card"]')
        const stack = seat === null ? null : seat.querySelector('[class*="_composerStack"]')
        const box = seat === null ? null : seat.getBoundingClientRect()
        const payload = {
          at: new Date().toISOString(),
          href: String(location.href),
          viewport: [window.innerWidth, window.innerHeight],
          dpr: window.devicePixelRatio,
          htmlAttrs: Array.prototype.slice.call(document.documentElement.attributes)
            .map(attr => `${attr.name}="${attr.value}"`),
          storedState: (() => {
            try {
              return localStorage.getItem('hdd.state')
            }
            catch {
              return null
            }
          })(),
          seatFound: seat !== null,
          /* 画布、body、主栏的计算样式：图到底挂在哪、body 有没有挡一层。 */
          canvas: probeStyle(document.documentElement),
          body: document.body === null ? null : probeStyle(document.body),
          main: (() => {
            const node = document.querySelector('[data-slot="main"]')
            return node === null ? null : probeStyle(node)
          })(),
          /* 背景真正的承载元素：有盒子的那个 data-phase，图在不在它身上一眼能看出来。 */
          backdrop: (() => {
            const node = document.querySelector('[data-slot="main.conversation"] > [data-phase]')
            return node === null ? null : probeStyle(node)
          })(),
          /* 滚到底时，窗口最底部那几点上究竟压着谁：探针跑在加载后 2.5 s，
             那时页面通常还在顶部，所以先自己滚到底再量，量完还原。 */
          foot: (() => {
            const scroller = document.querySelector('[data-conversation-scroll]')
            const saved = scroller === null ? 0 : scroller.scrollTop
            try {
              if (scroller !== null) scroller.scrollTop = scroller.scrollHeight
              const y = window.innerHeight - 3
              const left = Math.max(0, box === null ? 0 : box.left)
              const span = Math.max(1, window.innerWidth - left)
              return {
                scrollerFound: scroller !== null,
                scrollTop: scroller === null ? null : Math.round(scroller.scrollTop),
                scrollHeight: scroller === null ? null : Math.round(scroller.scrollHeight),
                clientHeight: scroller === null ? null : Math.round(scroller.clientHeight),
                seatBottom: box === null ? null : Math.round(box.bottom),
                footY: y,
                atBottomLeft: probeAt(left + 8, y),
                atBottomQuarter: probeAt(left + span * 0.25, y),
                atBottomMid: probeAt(left + span * 0.5, y),
                atBottomThreeQuarter: probeAt(left + span * 0.75, y),
                atBottomRight: probeAt(window.innerWidth - 8, y),
              }
            } finally {
              if (scroller !== null) scroller.scrollTop = saved
            }
          })(),
          card: card === null ? null : probeStyle(card),
          stack: stack === null ? null : probeStyle(stack),
          chain,
          probes: box === null
            ? []
            : [
                probeAt(box.left + 6, box.top + 30),
                probeAt(box.left + 6, Math.min(box.bottom - 6, window.innerHeight - 4)),
                probeAt(box.left + box.width / 2, Math.min(box.bottom - 4, window.innerHeight - 2)),
                probeAt(box.left + box.width / 2, box.top + 8),
              ].filter(Boolean),
        }
        fetch(`/hdd/v1/probe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {})
      }
      catch {}
    }

    /*
     * 开发期自动重载。宿主把 client.js 在页面加载时读一次，之后改文件不会自己生效，
     * 而这套桌面客户端里没有 Ctrl+R，重载要绕到开发者工具里去按 F5。
     * 这里每四秒问一次 /hdd/v1/stamp（宿主半身只在存在 .probe/ENABLED 时对外提供），
     * 指纹一变就让页面自己刷一次；npm 安装的包没有 .probe/，拿 404 后什么都不做。
     */
    let stampTimer = null
    function watchStamp() {
      let last = null
      const tick = () => {
        fetch('/hdd/v1/stamp', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data === null || typeof data.stamp !== 'string') return
            if (last === null) { last = data.stamp; return }
            if (data.stamp !== last) location.reload()
          })
          .catch(() => {})
      }
      tick()
      stampTimer = setInterval(tick, 4000)
    }

    return {
      inject: __splash.inject,
      apply(ctx) {
        try {
          __splash.apply(ctx)
        }
        catch (error) {
          console.error('[hdd] skin apply failed', error)
        }

        if (typeof document === 'undefined') return

        /* 输入区圆角：静态 CSS，一次性注入 */
        ctx.effect(() => {
          const tag = document.createElement('style')
          tag.dataset.plugin = PKG
          tag.dataset.pluginCss = `${PKG}/composer.css`
          tag.textContent = COMPOSER_CSS
          document.head.appendChild(tag)
          return () => { tag.remove() }
        }, 'hdd: composer band')

        /* 背景 / 遮罩 / 核心：随配置重建 */
        ctx.effect(() => {
          const tag = document.createElement('style')
          tag.dataset.plugin = PKG
          tag.dataset.pluginCss = `${PKG}/backdrop.css`
          document.head.appendChild(tag)

          const sync = () => {
            const state = readState()
            syncRoot(state)
            tag.textContent = buildCss(state)
          }
          sync()
          window.addEventListener(EVENT, sync)

          return () => {
            window.removeEventListener(EVENT, sync)
            tag.remove()
            const root = document.documentElement
            root.removeAttribute('data-hdd')
            root.removeAttribute('data-hdd-orb')
            root.removeAttribute('data-hdd-capsule')
          }
        }, 'hdd: backdrop, scrim and core visibility')

        /* 诊断探针：等页面把输入区渲染出来跑一次。宿主没开记录时拿 404，无副作用。 */
        const probeTimer = setTimeout(reportComposerProbe, 2500)
        ctx.effect(() => () => clearTimeout(probeTimer), 'hdd: composer probe')

        /* 开发期自动重载：改完 client.js，页面几秒后自己刷新。见 watchStamp 的说明。 */
        ctx.effect(() => {
          watchStamp()
          return () => {
            if (stampTimer !== null) clearInterval(stampTimer)
          }
        }, 'hdd: stamp watch')

        if (ctx.slots === undefined || typeof ctx.slots.inject !== 'function') return
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'hdd',
          order: 46,
          label: L.nav,
        }, HddPanel))
      },
    }
  },
})
