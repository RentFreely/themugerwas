/* ═══════════════════════════════════════════════════════════
   THE MUGERWAS — main.js
   Runs on every page: cursor, canvas, hearts, transitions,
   countdown, portal, preloader, WhatsApp share.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CUSTOM CURSOR ─────────────────────────────────────────── */
  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  (function cursorLoop() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(cursorLoop);
  })();

  /* Grow ring on interactive elements */
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .choice, .meal-card, .tap-enter')) {
      ring.style.width  = '50px';
      ring.style.height = '50px';
      ring.style.borderColor = 'rgba(201,168,76,0.7)';
    } else {
      ring.style.width  = '34px';
      ring.style.height = '34px';
      ring.style.borderColor = 'rgba(201,168,76,0.45)';
    }
  });

  /* ── FLOATING HEARTS ───────────────────────────────────────── */
  const GLYPHS = ['♥', '❤', '✦', '❧', '✿', '⁕', '❋', '✾'];

  function spawnHeart(x, y, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'float-heart';
    const sz   = opts.sz   || (10 + Math.random() * 18);
    const dur  = opts.dur  || (2.2 + Math.random() * 2.2);
    const rise = opts.rise || -(70 + Math.random() * 180);
    const r    = (Math.random() * 30 - 15);
    const r2   = r + (Math.random() * 20 - 10);
    const r3   = r + (Math.random() * 60 - 30);
    el.style.cssText = [
      'left:' + (x - 10 + Math.random() * 20) + 'px',
      'top:' + y + 'px',
      '--sz:' + sz + 'px',
      '--dur:' + dur + 's',
      '--rise:' + rise + 'px',
      '--r:' + r + 'deg',
      '--r2:' + r2 + 'deg',
      '--r3:' + r3 + 'deg',
    ].join(';');
    el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  /* Ambient hearts rising from bottom */
  const ambientCount = window.innerWidth < 780 ? 6 : 12;
  setInterval(() => {
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight + 10;
    spawnHeart(x, y, { dur: 4 + Math.random() * 3, rise: -(180 + Math.random() * 160) });
  }, 700);

  /* Hearts on mouse move (subtle) */
  let lastHeartTime = 0;
  document.addEventListener('mousemove', e => {
    const now = Date.now();
    if (now - lastHeartTime > 200 && Math.random() < 0.18) {
      lastHeartTime = now;
      spawnHeart(e.clientX, e.clientY, { sz: 8 + Math.random() * 10, dur: 1.8 + Math.random() });
    }
  });

  /* Hearts burst on click */
  document.addEventListener('click', e => {
    for (let i = 0; i < 7; i++) {
      spawnHeart(
        e.clientX + Math.random() * 50 - 25,
        e.clientY + Math.random() * 30 - 15,
        { sz: 8 + Math.random() * 14, dur: 1.5 + Math.random() * 1.5 }
      );
    }
  });

  /* Touch hearts */
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (Math.random() < 0.3) spawnHeart(t.clientX, t.clientY);
  }, { passive: true });

  /* Expose globally so rsvp.js can burst more */
  window.spawnHeart = spawnHeart;

  /* ── CANVAS PARTICLES + WREATH ─────────────────────────────── */
  const canvas = document.getElementById('fx-canvas');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    /* skip canvas on reduced-motion */
  } else {
    const ctx = canvas.getContext('2d');
    let W, H, dpr;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    class Particle {
      constructor() { this.reset(true); }
      reset(init) {
        this.x  = Math.random() * W;
        this.y  = init ? Math.random() * H : H + 8;
        this.r  = Math.random() * 1.6 + 0.3;
        this.sp = Math.random() * 0.45 + 0.12;
        this.op = Math.random() * 0.45 + 0.12;
        this.dx = (Math.random() - 0.5) * 0.28;
        this.gold = Math.random() > 0.45;
      }
      update() {
        this.y -= this.sp; this.x += this.dx; this.op -= 0.0007;
        if (this.y < -8 || this.op <= 0) this.reset(false);
      }
      draw() {
        ctx.save(); ctx.globalAlpha = this.op;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.gold ? '#C9A84C' : '#E8D5A3';
        ctx.fill(); ctx.restore();
      }
    }

    const N = window.innerWidth < 780 ? 50 : 100;
    let particles = [];
    let wreathAngle = 0;

    const seedParticles = () => {
      particles = Array.from({ length: N }, () => new Particle());
    };

    const drawWreath = () => {
      const cx = W / 2, cy = H / 2;
      const r = Math.min(W, H) * 0.24;
      for (let i = 0; i < 22; i++) {
        const a = i * (Math.PI * 2 / 22) + wreathAngle * 0.0003;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = 0.06 + Math.sin(i + wreathAngle * 0.002) * 0.025;
        ctx.scale(1, 2.1);
        ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#C9A84C'; ctx.fill();
        ctx.restore();
      }
    };

    let raf;
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      wreathAngle++;
      particles.forEach(p => { p.update(); p.draw(); });
      drawWreath();
      raf = requestAnimationFrame(loop);
    };

    resize(); seedParticles(); loop();
    window.addEventListener('resize', () => { resize(); seedParticles(); });
    window.addEventListener('beforeunload', () => cancelAnimationFrame(raf));
  }

  /* ── PRELOADER ─────────────────────────────────────────────── */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.setTimeout(() => preloader.classList.add('fade'), 1900);
  }

  /* ── WELCOME OVERLAY ───────────────────────────────────────── */
  const welcome      = document.getElementById('welcome-overlay');
  const welcomeEnter = document.getElementById('welcome-enter');
  const isHome       = document.body.dataset.page === 'home';

  if (isHome && welcome) {
    const seen = sessionStorage.getItem('mug_welcome') === '1';
    if (!seen) {
      setTimeout(() => welcome.classList.remove('hidden'), 2200);

      const dismiss = () => {
        welcome.classList.add('hidden');
        sessionStorage.setItem('mug_welcome', '1');
        /* burst hearts on dismiss */
        for (let i = 0; i < 14; i++) {
          setTimeout(() => {
            spawnHeart(
              Math.random() * window.innerWidth,
              Math.random() * window.innerHeight * 0.7,
              { sz: 10 + Math.random() * 16, dur: 2 + Math.random() * 2 }
            );
          }, i * 80);
        }
      };
      welcomeEnter && welcomeEnter.addEventListener('click', dismiss);
      welcome.addEventListener('click', e => { if (e.target === welcome) dismiss(); });
      setTimeout(dismiss, 7000);
    }
  }

  /* ── PORTAL TRANSITIONS ────────────────────────────────────── */
  const triggerPortal = href => {
    document.body.classList.add('portal-in');
    /* burst hearts at viewport centre */
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 10; i++) {
      spawnHeart(cx + Math.random() * 200 - 100, cy + Math.random() * 100 - 50);
    }
    setTimeout(() => { window.location.href = href; }, 480);
  };

  document.querySelectorAll("a[href$='.html'], a[href='./dashboard.html']").forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      triggerPortal(href);
    });
  });

  /* ── REVEAL ON SCROLL ──────────────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ── TIMELINE REVEAL ───────────────────────────────────────── */
  const tlStops = document.querySelectorAll('.tl-stop');
  if (tlStops.length) {
    const tio = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 100);
          tio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    tlStops.forEach(el => tio.observe(el));
  }

  /* ── COUNTDOWN ─────────────────────────────────────────────── */
  const countdown = document.getElementById('countdown');
  if (countdown) {
    const cfg    = window.WEDDING_CONFIG || {};
    const target = new Date(cfg.weddingDateIso || '2026-08-29T15:00:00+03:00');

    const render = () => {
      const diff = Math.max(0, target - new Date());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      countdown.innerHTML = [
        ['Days', d],
        ['Hours',    String(h).padStart(2, '0')],
        ['Minutes',  String(m).padStart(2, '0')],
        ['Seconds',  String(s).padStart(2, '0')],
      ].map(([label, val]) =>
        `<div class="countdown-card"><b>${val}</b><span>${label}</span></div>`
      ).join('');
    };
    render();
    setInterval(render, 1000);
  }

  /* ── WHATSAPP SHARE ────────────────────────────────────────── */
  const waBtn = document.getElementById('wa-share');
  if (waBtn) {
    waBtn.addEventListener('click', () => {
      const cfg  = window.WEDDING_CONFIG || {};
      const url  = cfg.siteUrl || window.location.origin;
      const msg  = encodeURIComponent(
        `You are warmly invited to Tim & Rebecca's wedding.\nRSVP here: ${url}/rsvp.html`
      );
      window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
    });
  }

  /* ── SOFT CLICK SOUND ──────────────────────────────────────── */
  window.playSoftClick = function (freq) {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o  = ac.createOscillator();
      const g  = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = freq || 528;
      g.gain.value = 0.000001;
      o.connect(g); g.connect(ac.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.018, ac.currentTime + 0.018);
      g.gain.exponentialRampToValueAtTime(0.000001, ac.currentTime + 0.1);
      o.stop(ac.currentTime + 0.1);
      setTimeout(() => ac.close(), 200);
    } catch (_) {}
  };

  /* ── CONFETTI BURST ────────────────────────────────────────── */
  window.launchConfetti = function () {
    const COLORS = ['#C9A84C', '#E8D5A3', '#F5F0E8', '#8B6914', '#fffbe6', '#d4af37'];
    for (let i = 0; i < 110; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const w = 6 + Math.random() * 6, h = 6 + Math.random() * 6;
      el.style.cssText = [
        'left:' + Math.random() * 100 + 'vw',
        'top:-10px',
        'width:' + w + 'px',
        'height:' + h + 'px',
        'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px'),
        'background:' + COLORS[Math.floor(Math.random() * COLORS.length)],
        '--cd:' + (2.2 + Math.random() * 2) + 's',
        '--delay:' + (Math.random() * 1.2) + 's',
        '--spin:' + (Math.random() * 720 - 360) + 'deg',
        '--dx:' + (Math.random() * 280 - 140) + 'px',
      ].join(';');
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
    /* accompanying hearts */
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        spawnHeart(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight * 0.5,
          { sz: 12 + Math.random() * 16, dur: 2.5 + Math.random() * 2 }
        );
      }, i * 130);
    }
  };

})();
