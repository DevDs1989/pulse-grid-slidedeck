/**
 * Pulse Grid — Neo-Brutalist Presentation Engine
 * Dark Mode, Audio FX, Speaker Notes, Overview & Touch Navigation
 */
(() => {
  'use strict';

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  const canvas = $('#slideCanvas');
  const slides = $$('.slide');
  const total  = slides.length;
  const curNum = $('#currentSlideNum');
  const totNum = $('#totalSlidesNum');
  const progFill = $('#topProgressBar');
  const titleEl = $('#currentSlideTitle');

  // Controls & Modals
  const prevBtn = $('#prevBtn');
  const nextBtn = $('#nextBtn');
  const overviewBtn = $('#overviewBtn');
  const closeOverviewBtn = $('#closeOverviewBtn');
  const overviewModal = $('#overviewModal');
  const overviewGrid = $('#overviewGrid');
  const fullscreenBtn = $('#fullscreenBtn');
  const notesBtn = $('#notesBtn');
  const notesDrawer = $('#notesDrawer');
  const closeNotesBtn = $('#closeNotesBtn');
  const notesBody = $('#notesBody');
  const helpBtn = $('#helpBtn');
  const helpModal = $('#helpModal');
  const closeHelpBtn = $('#closeHelpBtn');
  const soundBtn = $('#soundBtn');
  const slideCounterBtn = $('#slideCounterBtn');

  let current = 0;
  let overviewOpen = false;
  let notesOpen = false;
  let helpOpen = false;
  let soundEnabled = true;

  totNum.textContent = total;

  /* ─── Web Audio API Sound Synthesizer ─── */
  let audioCtx = null;
  function playSlideSound() {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    soundBtn.classList.toggle('active-toggle', soundEnabled);
    soundBtn.style.opacity = soundEnabled ? '1' : '0.4';
  }

  /* ─── Canvas Scale for 16:9 Responsive ─── */
  function scaleCanvas() {
    const W = 1440, H = 810;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = Math.min(vw / W, (vh - 56) / H, 1.4);
    canvas.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', scaleCanvas);
  scaleCanvas();

  /* ─── Navigation ─── */
  function go(idx, playSound = true) {
    idx = Math.max(0, Math.min(total - 1, idx));
    if (idx === current && slides[idx].classList.contains('active')) return;

    if (playSound) playSlideSound();

    slides.forEach((s, i) => {
      s.classList.remove('active', 'prev');
      if (i < idx) s.classList.add('prev');
    });
    slides[idx].classList.add('active');
    current = idx;

    curNum.textContent = idx + 1;
    progFill.style.width = `${((idx + 1) / total) * 100}%`;
    titleEl.textContent = slides[idx].dataset.title || `Slide ${idx + 1}`;

    // Update speaker notes
    const note = slides[idx].dataset.notes || 'No presenter notes for this slide.';
    notesBody.textContent = note;

    triggerAnimations(slides[idx]);
    updateOverviewHighlight();
  }

  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  /* ─── Dynamic Number Counting Animations ─── */
  function triggerAnimations(slide) {
    slide.querySelectorAll('.counter-up').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      if (isNaN(target)) return;
      let v = 0;
      const step = Math.max(1, target / 30);
      const tick = () => {
        v += step;
        if (v >= target) { el.textContent = target; return; }
        el.textContent = Math.floor(v);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    slide.querySelectorAll('.alloc-bar-fill, .h-bar-fill').forEach(fill => {
      const w = fill.dataset.width || fill.style.width;
      fill.style.width = '0%';
      requestAnimationFrame(() => { fill.style.width = w; });
    });
  }

  /* ─── Overview Grid Modal ─── */
  function buildOverview() {
    overviewGrid.innerHTML = '';
    slides.forEach((s, i) => {
      const title = s.dataset.title || `Slide ${i + 1}`;
      const btn = document.createElement('button');
      btn.className = `overview-thumbnail${i === current ? ' is-active' : ''}`;
      btn.innerHTML = `<span class="thumb-index">${String(i + 1).padStart(2, '0')}</span><span class="thumb-label">${title}</span>`;
      btn.addEventListener('click', () => { go(i); closeOverview(); });
      overviewGrid.appendChild(btn);
    });
  }

  function openOverview() {
    buildOverview();
    overviewModal.classList.add('active');
    overviewOpen = true;
  }

  function closeOverview() {
    overviewModal.classList.remove('active');
    overviewOpen = false;
  }

  function updateOverviewHighlight() {
    if (!overviewOpen) return;
    overviewGrid.querySelectorAll('.overview-thumbnail').forEach((t, i) => {
      t.classList.toggle('is-active', i === current);
    });
  }

  /* ─── Speaker Notes ─── */
  function toggleNotes() {
    notesOpen = !notesOpen;
    notesDrawer.classList.toggle('active', notesOpen);
    notesBtn.classList.toggle('active-toggle', notesOpen);
    if (notesOpen) {
      notesBody.textContent = slides[current].dataset.notes || 'No presenter notes.';
    }
  }

  /* ─── Keyboard Help Modal ─── */
  function toggleHelp() {
    helpOpen = !helpOpen;
    helpModal.classList.toggle('active', helpOpen);
    helpBtn.classList.toggle('active-toggle', helpOpen);
  }

  /* ─── Fullscreen ─── */
  function toggleFS() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  /* ─── Event Listeners ─── */
  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);
  overviewBtn?.addEventListener('click', openOverview);
  closeOverviewBtn?.addEventListener('click', closeOverview);
  fullscreenBtn?.addEventListener('click', toggleFS);
  notesBtn?.addEventListener('click', toggleNotes);
  closeNotesBtn?.addEventListener('click', () => { notesOpen = false; notesDrawer.classList.remove('active'); notesBtn.classList.remove('active-toggle'); });
  helpBtn?.addEventListener('click', toggleHelp);
  closeHelpBtn?.addEventListener('click', () => { helpOpen = false; helpModal.classList.remove('active'); helpBtn.classList.remove('active-toggle'); });
  soundBtn?.addEventListener('click', toggleSound);
  slideCounterBtn?.addEventListener('click', openOverview);

  // Top right slide numbers click -> open overview
  $$('.slide-top-right-num').forEach((el, idx) => {
    el.addEventListener('click', openOverview);
  });

  /* ─── Keyboard Navigation ─── */
  document.addEventListener('keydown', e => {
    if (helpOpen) {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'h' || e.key === 'H') toggleHelp();
      return;
    }
    if (overviewOpen) {
      if (e.key === 'Escape' || e.key === 'o' || e.key === 'O' || e.key === 'g' || e.key === 'G') closeOverview();
      if (e.key === 'ArrowRight') go(current + 1);
      if (e.key === 'ArrowLeft') go(current - 1);
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End':  e.preventDefault(); go(total - 1); break;
      case 'f': case 'F': e.preventDefault(); toggleFS(); break;
      case 'o': case 'O': case 'g': case 'G':
        e.preventDefault(); openOverview(); break;
      case 'n': case 'N':
        e.preventDefault(); toggleNotes(); break;
      case 'm': case 'M':
        e.preventDefault(); toggleSound(); break;
      case '?': case 'h': case 'H':
        e.preventDefault(); toggleHelp(); break;
      case 'Escape':
        if (notesOpen) toggleNotes();
        break;
    }
  });

  /* ─── Touch Swipe Navigation ─── */
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  }, { passive: true });

  /* ─── Mouse Wheel Navigation (Debounced) ─── */
  let lastWheelTime = 0;
  window.addEventListener('wheel', e => {
    if (overviewOpen || helpOpen) return;
    const now = Date.now();
    if (now - lastWheelTime < 600) return;
    if (Math.abs(e.deltaY) > 30) {
      lastWheelTime = now;
      if (e.deltaY > 0) next();
      else prev();
    }
  }, { passive: true });

  // Initialize
  go(0, false);
})();
