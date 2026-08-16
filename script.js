/**
 * Pulse Grid — Bento Slide Deck Engine
 * Clean. No ambient glow. No slop.
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

  let current = 0;
  let overviewOpen = false;

  totNum.textContent = total;

  /* ─── Canvas scale ─── */
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
  function go(idx) {
    idx = Math.max(0, Math.min(total - 1, idx));
    if (idx === current && slides[idx].classList.contains('active')) return;

    slides.forEach((s, i) => {
      s.classList.remove('active', 'prev');
      if (i < idx) s.classList.add('prev');
    });
    slides[idx].classList.add('active');
    current = idx;

    curNum.textContent = idx + 1;
    progFill.style.width = `${((idx + 1) / total) * 100}%`;
    titleEl.textContent = slides[idx].dataset.title || '';

    triggerAnimations(slides[idx]);
    updateOverviewHighlight();
  }

  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  /* ─── Animations ─── */
  function triggerAnimations(slide) {
    // Counter-up numbers
    slide.querySelectorAll('.counter-up').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      if (isNaN(target)) return;
      let v = 0;
      const step = Math.max(1, target / 35);
      const tick = () => {
        v += step;
        if (v >= target) { el.textContent = target; return; }
        el.textContent = Math.floor(v);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Bar chart pillars
    slide.querySelectorAll('.chart-bar-pillar').forEach(bar => {
      const h = bar.dataset.height;
      if (h) {
        bar.style.height = '0%';
        requestAnimationFrame(() => { bar.style.height = h; });
      }
    });

    // Horizontal bar fills
    slide.querySelectorAll('.h-bar-fill').forEach(fill => {
      const w = fill.style.width;
      fill.style.width = '0%';
      requestAnimationFrame(() => { fill.style.width = w; });
    });
  }

  /* ─── Overview ─── */
  const overviewModal = $('#overviewModal');
  const overviewGrid  = $('#overviewGrid');

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

  /* ─── Fullscreen ─── */
  function toggleFS() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  /* ─── Keyboard ─── */
  document.addEventListener('keydown', e => {
    if (overviewOpen) {
      if (e.key === 'Escape') closeOverview();
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
      case 'Escape': break;
    }
  });

  /* ─── Buttons ─── */
  $('#prevBtn').addEventListener('click', prev);
  $('#nextBtn').addEventListener('click', next);
  $('#overviewBtn').addEventListener('click', openOverview);
  $('#closeOverviewBtn').addEventListener('click', closeOverview);
  $('#fullscreenBtn').addEventListener('click', toggleFS);

  /* ─── Touch ─── */
  let tx = 0;
  document.addEventListener('touchstart', e => {
    tx = e.changedTouches[0].screenX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - tx;
    if (dx < -50) next();
    if (dx > 50) prev();
  }, { passive: true });
  /* ─── Interactivity ─── */
  const cards = $$('.arch-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -2.5;
      const rotateY = ((x - centerX) / centerX) * 2.5;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
    });
    
    card.addEventListener('mouseenter', () => {
      card.classList.add('is-hovered');
      card.style.transition = 'transform 0.1s ease-out';
    });
    
    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-hovered');
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });

  /* ─── Init ─── */
  go(0);
})();
