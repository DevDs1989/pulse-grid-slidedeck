/**
 * Pulse Grid — deck engine.
 *
 * Navigation, generated document furniture (masthead / folio / footer),
 * speaker notes, overview, and three interactions:
 *   1. Full-screen before/after comparison on the exhibit slides.
 *   2. A live pricing assumption toggle on the market-sizing slide.
 *   3. Spring slide transitions via Motion, loaded opportunistically.
 *
 * The furniture is generated rather than authored so slide count and section
 * names live in exactly one place — the data-title attribute on each section.
 */
(() => {
  'use strict';

  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const canvas   = $('#slideCanvas');
  const slides   = $$('.slide');
  const total    = slides.length;
  const curNum   = $('#currentSlideNum');
  const totNum   = $('#totalSlidesNum');
  const progFill = $('#topProgressBar');
  const titleEl  = $('#currentSlideTitle');

  const prevBtn          = $('#prevBtn');
  const nextBtn          = $('#nextBtn');
  const overviewBtn      = $('#overviewBtn');
  const closeOverviewBtn = $('#closeOverviewBtn');
  const overviewModal    = $('#overviewModal');
  const overviewGrid     = $('#overviewGrid');
  const fullscreenBtn    = $('#fullscreenBtn');
  const notesBtn         = $('#notesBtn');
  const notesDrawer      = $('#notesDrawer');
  const closeNotesBtn    = $('#closeNotesBtn');
  const notesBody        = $('#notesBody');
  const helpBtn          = $('#helpBtn');
  const helpModal        = $('#helpModal');
  const closeHelpBtn     = $('#closeHelpBtn');
  const slideCounterBtn  = $('#slideCounterBtn');

  const WORDMARK = 'Pulse Grid';
  const LOGO     = 'Pulse-grid_01.png';
  const ROUND    = 'Pre-seed · ₹1 Cr';
  const FOOTER_L = 'Confidential';
  const FOOTER_R = 'August 2026';

  let current = 0;
  let overviewOpen = false;
  let notesOpen = false;
  let helpOpen = false;

  /* --------------------------------------------------------------------
     Motion — the vanilla-JS animation engine behind Framer Motion.
     Framer Motion itself is React-only; this deck has no React and no build
     step, so we use the same team's DOM library instead. Loaded without
     await: if the CDN is blocked the CSS transition on .slide already gives
     a correct (if plainer) fade, so nothing breaks.
     -------------------------------------------------------------------- */
  let animate = null;
  import('https://cdn.jsdelivr.net/npm/motion@11.15.0/+esm')
    .then((m) => { animate = m.animate; })
    .catch(() => { /* CSS fallback */ });

  /* --------------------------------------------------------------------
     Document furniture
     -------------------------------------------------------------------- */

  const sectionName = (slide) => (slide.dataset.title || '').replace(/^\d+\s*/, '').trim();
  const pad = (n) => String(n).padStart(2, '0');

  function buildFurniture() {
    slides.forEach((slide, i) => {
      if (slide.classList.contains('hero-cover')) return; // cover has its own header

      const meta = (k, v) =>
        `<span class="rail-meta"><span class="rail-meta-k">${k}</span>` +
        `<span class="rail-meta-v">${v}</span></span>`;

      const rail = document.createElement('header');
      rail.className = 'slide-rail';
      rail.innerHTML =
        `<img class="rail-logo" src="${LOGO}" alt="${WORDMARK}">` +
        meta('Section', sectionName(slide)) +
        meta('Round', ROUND) +
        meta('Issued', FOOTER_R) +
        `<span class="rail-spacer"></span>` +
        `<span class="rail-page">${pad(i + 1)}</span>`;

      const foot = document.createElement('footer');
      foot.className = 'slide-foot';
      foot.innerHTML =
        `<span class="foot-mark">&#9679;</span>` +
        `<span>${sectionName(slide)}</span>` +
        `<span class="foot-rule"></span>` +
        `<span>${FOOTER_L}</span>` +
        `<span>P.${pad(i + 1)} / ${pad(total)}</span>`;

      slide.prepend(rail);
      slide.append(foot);
    });
  }

  /* --------------------------------------------------------------------
     Stage scaling — authored at a fixed 1440x810 and scaled to the viewport.
     -------------------------------------------------------------------- */

  function scaleCanvas() {
    const s = Math.min(window.innerWidth / 1440, (window.innerHeight - 56) / 810, 1.4);
    canvas.style.transform = `scale(${s})`;
  }

  /* --------------------------------------------------------------------
     Navigation
     -------------------------------------------------------------------- */

  function playTransition(to, dir) {
    if (!animate || !dir) return;
    // Always clear whatever we set, even if the animation is interrupted —
    // a stuck inline opacity:0 would leave a blank slide on screen.
    const clear = () => { to.style.transform = ''; to.style.opacity = ''; };
    try {
      const controls = animate(
        to,
        { opacity: [0, 1], transform: [`translateX(${20 * dir}px)`, 'translateX(0px)'] },
        { type: 'spring', stiffness: 280, damping: 32, mass: 0.7 }
      );
      controls?.finished?.then(clear).catch(clear);
    } catch { clear(); }
    setTimeout(clear, 800);
  }

  function go(idx, dir = 0) {
    const i = Math.max(0, Math.min(total - 1, idx));
    const moved = i !== current;
    const d = dir || (moved ? (i > current ? 1 : -1) : 0);

    slides.forEach((s, n) => s.classList.toggle('active', n === i));
    current = i;

    // Deep link, so a specific slide can be sent to someone directly.
    // replaceState rather than assigning hash, so Back leaves the deck
    // instead of walking every slide the presenter visited.
    history.replaceState(null, '', `#${i + 1}`);

    curNum.textContent = pad(i + 1);
    progFill.style.width = `${((i + 1) / total) * 100}%`;
    titleEl.textContent = slides[i].dataset.title || '';
    notesBody.textContent = slides[i].dataset.notes || 'No notes for this slide.';

    $$('.overview-thumbnail').forEach((t, n) => t.classList.toggle('is-active', n === i));
    if (moved) playTransition(slides[i], d);
  }

  const next = () => go(current + 1, 1);
  const prev = () => go(current - 1, -1);

  /* --------------------------------------------------------------------
     Overview, notes, help
     -------------------------------------------------------------------- */

  function buildOverview() {
    overviewGrid.innerHTML = '';
    slides.forEach((slide, i) => {
      const btn = document.createElement('button');
      btn.className = 'overview-thumbnail';
      btn.innerHTML =
        `<span class="thumb-index">${pad(i + 1)}</span>` +
        `<span class="thumb-label">${sectionName(slide)}</span>`;
      btn.addEventListener('click', () => { go(i); closeOverview(); });
      overviewGrid.append(btn);
    });
  }

  const openOverview = () => {
    overviewModal.classList.add('active'); overviewOpen = true;
    $$('.overview-thumbnail').forEach((t, n) => t.classList.toggle('is-active', n === current));
  };
  const closeOverview = () => { overviewModal.classList.remove('active'); overviewOpen = false; };

  function toggleNotes() {
    notesOpen = !notesOpen;
    notesDrawer.classList.toggle('active', notesOpen);
    notesBtn.classList.toggle('active-toggle', notesOpen);
  }

  const toggleHelp = () => { helpOpen = !helpOpen; helpModal.classList.toggle('active', helpOpen); };

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  /* --------------------------------------------------------------------
     INTERACTION 1 — full-screen before/after comparison
     Both crops in a pair share an aspect ratio, so they overlay exactly and
     one divider wipes between them.
     -------------------------------------------------------------------- */

  const lb        = $('#lightbox');
  const lbCompare = $('#lbCompare');
  const lbClip    = $('#lbClip');
  const lbHandle  = $('#lbHandle');
  const lbBefore  = $('#lbBefore');
  const lbAfter   = $('#lbAfter');
  const lbTitle   = $('#lbTitle');
  const lbTagL    = $('#lbTagL');
  const lbTagR    = $('#lbTagR');
  let lbOpen = false;
  let wipe = 50;

  function setWipe(p) {
    wipe = Math.max(0, Math.min(100, p));
    lbClip.style.width = `${wipe}%`;
    lbHandle.style.left = `${wipe}%`;
  }

  // The clipped image must stay stage-width, otherwise it squashes as the
  // divider narrows and the two screenshots fall out of register.
  const syncClipWidth = () =>
    lbCompare.style.setProperty('--lb-w', `${lbCompare.clientWidth}px`);

  function openCompare(section) {
    const cols = $$('.exhibit-col', section);
    if (cols.length < 2) return;
    const a = $('img', cols[0]);
    const b = $('img', cols[1]);
    if (!a || !b) return;

    lbBefore.src = a.currentSrc || a.src; lbBefore.alt = a.alt;
    lbAfter.src  = b.currentSrc || b.src; lbAfter.alt  = b.alt;
    lbTagL.textContent = ($('.t-label', cols[0])?.textContent || 'Before').trim();
    lbTagR.textContent = ($('.t-label', cols[1])?.textContent || 'After').trim();
    lbTitle.textContent = ($('h2', section)?.textContent || '').trim();

    lb.hidden = false;
    lbOpen = true;
    requestAnimationFrame(() => { syncClipWidth(); setWipe(50); });
  }

  const closeCompare = () => { lb.hidden = true; lbOpen = false; };

  function wipeFromPointer(e) {
    const r = lbCompare.getBoundingClientRect();
    setWipe(((e.clientX - r.left) / r.width) * 100);
  }

  let dragging = false;
  lbCompare?.addEventListener('pointerdown', (e) => {
    dragging = true;
    lbCompare.setPointerCapture?.(e.pointerId);
    wipeFromPointer(e);
  });
  lbCompare?.addEventListener('pointermove', (e) => { if (dragging) wipeFromPointer(e); });
  lbCompare?.addEventListener('pointerup', () => { dragging = false; });
  lbCompare?.addEventListener('pointercancel', () => { dragging = false; });
  $('#lbClose')?.addEventListener('click', closeCompare);
  window.addEventListener('resize', () => { if (lbOpen) syncClipWidth(); });

  $$('.L-exhibit').forEach((section) => {
    $$('.exhibit-frame', section).forEach((frame) => {
      frame.tabIndex = 0;
      frame.setAttribute('role', 'button');
      frame.setAttribute('aria-label', 'Open full-screen before and after comparison');
      frame.addEventListener('click', () => openCompare(section));
      frame.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCompare(section); }
      });
      const hint = document.createElement('span');
      hint.className = 'exhibit-zoom';
      hint.textContent = 'Click to compare full screen';
      frame.after(hint);
    });
  });

  /* --------------------------------------------------------------------
     INTERACTION 2 — live market-sizing assumption
     Answers the "what happens when pricing migrates to list?" question in
     the room instead of in a follow-up email.
     -------------------------------------------------------------------- */

  const fmtINR = (n) => `₹${n.toLocaleString('en-IN')}`;
  const fmtCr  = (v) => {
    const cr = v / 1e7;
    return `₹${cr >= 100 ? Math.round(cr).toLocaleString('en-IN') : cr.toFixed(1)} Cr`;
  };

  const arpaBtns = $$('.toggle-btn[data-arpa]');
  arpaBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const arpa = Number(btn.dataset.arpa);
      arpaBtns.forEach((b) => b.classList.toggle('is-on', b === btn));
      $$('#marketCalc .arpa-yr').forEach((el) => { el.textContent = fmtINR(arpa * 12); });
      $$('#marketCalc .calc-val').forEach((el) => {
        el.textContent = fmtCr(Number(el.dataset.count) * arpa * 12);
      });
      const note = $('#sizingNote');
      if (note) {
        note.textContent = arpa === 6000
          ? "Today's blended rate across all 22 live accounts."
          : 'List pricing, once the early accounts migrate up.';
      }
    });
  });

  /* --------------------------------------------------------------------
     Input
     -------------------------------------------------------------------- */

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lbOpen) closeCompare();
      if (overviewOpen) closeOverview();
      if (helpOpen) toggleHelp();
      if (notesOpen) toggleNotes();
      return;
    }
    // While comparing, the arrows drive the wipe rather than the deck.
    if (lbOpen) {
      if (e.key === 'ArrowRight') { e.preventDefault(); setWipe(wipe + 4); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setWipe(wipe - 4); }
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End':  e.preventDefault(); go(total - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'o': case 'O': case 'g': case 'G':
        overviewOpen ? closeOverview() : openOverview(); break;
      case 'n': case 'N': toggleNotes(); break;
      case '?': case 'h': case 'H': toggleHelp(); break;
    }
  });

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);
  overviewBtn?.addEventListener('click', () => (overviewOpen ? closeOverview() : openOverview()));
  closeOverviewBtn?.addEventListener('click', closeOverview);
  slideCounterBtn?.addEventListener('click', openOverview);
  notesBtn?.addEventListener('click', toggleNotes);
  closeNotesBtn?.addEventListener('click', toggleNotes);
  helpBtn?.addEventListener('click', toggleHelp);
  closeHelpBtn?.addEventListener('click', toggleHelp);
  fullscreenBtn?.addEventListener('click', toggleFullscreen);
  $$('[data-deck-next]').forEach((el) => el.addEventListener('click', next));

  // Touch swipe
  let touchX = 0;
  document.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (lbOpen) return;
    const dx = e.changedTouches[0].screenX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
  }, { passive: true });

  // Debounced wheel
  let wheelLock = false;
  document.addEventListener('wheel', (e) => {
    if (wheelLock || overviewOpen || lbOpen || Math.abs(e.deltaY) < 30) return;
    wheelLock = true;
    (e.deltaY > 0 ? next : prev)();
    setTimeout(() => { wheelLock = false; }, 600);
  }, { passive: true });

  window.addEventListener('resize', scaleCanvas);

  const slideFromHash = () => {
    const n = parseInt(String(location.hash).replace('#', ''), 10);
    return Number.isFinite(n) ? n - 1 : 0;
  };
  window.addEventListener('hashchange', () => {
    const i = slideFromHash();
    if (i !== current) go(i);
  });

  /* --------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------- */

  buildFurniture();
  buildOverview();
  totNum.textContent = pad(total);
  scaleCanvas();
  go(slideFromHash());
})();
