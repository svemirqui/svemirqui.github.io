// Intro: a fireball streaks in and slams the centre; the black cover shatters to reveal the site
const introEl = document.getElementById('intro');
const introQueue = [];
let introOver = !introEl || document.documentElement.classList.contains('skip-intro');
function afterIntro(fn) { introOver ? fn() : introQueue.push(fn); }
if (introEl && !introOver) {
  const root0 = document.documentElement;
  const cv2 = document.getElementById('inCanvas'), c = cv2.getContext('2d');
  const d = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  cv2.width = W * d; cv2.height = H * d; c.setTransform(d, 0, 0, d, 0, 0);
  const CX = W / 2, CY = H / 2, R = Math.hypot(W, H) / 2, K = Math.min(W, H) / 720;
  const T_START = .35;
  let tHit = 1.55;

  // black cover, pre-cut into jittered ring/sector shards around the impact point
  const RINGS = [0, .1, .22, .4, .68, 1.12], S = 16, last = RINGS.length - 1;
  const verts = RINGS.map((rf, i) => Array.from({ length: S }, (_, k) => {
    if (i === 0) return [CX, CY];
    const edge = i === last;
    const a = (k + (edge ? 0 : (Math.random() - .5) * .55)) / S * Math.PI * 2;
    const rr = rf * R * (edge ? 1 : 1 + (Math.random() - .5) * .18);
    return [CX + Math.cos(a) * rr, CY + Math.sin(a) * rr];
  }));
  const shards = [];
  for (let i = 0; i < last; i++) for (let k = 0; k < S; k++) {
    const k2 = (k + 1) % S, poly = [verts[i][k], verts[i][k2], verts[i + 1][k2], verts[i + 1][k]];
    const mx = poly.reduce((s, p) => s + p[0], 0) / 4, my = poly.reduce((s, p) => s + p[1], 0) / 4;
    const ang = Math.atan2(my - CY, mx - CX), sp = (380 + Math.random() * 520) * (1 + i * .15) * K;
    shards.push({ poly, mx, my, rel: .12 + i * .1 + Math.random() * .06, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 150 * K, vr: (Math.random() - .5) * 6 });
  }

  let t0 = performance.now(), prev = t0, raf = 0, impacted = false, tI = 0, released = false, trailAcc = 0;
  let trail = [], sparks = [];
  const rings = [{ delay: 0, sp: 1500 }, { delay: .08, sp: 1100 }, { delay: .18, sp: 800 }];
  const DX = CX + .1 * W, DY = CY - .12 * H, DL = Math.hypot(DX, DY);

  function ball(x, y, r) {
    c.globalCompositeOperation = 'lighter';
    let g = c.createRadialGradient(x, y, 0, x, y, r * 2.6);
    g.addColorStop(0, 'rgba(255,150,40,.55)'); g.addColorStop(1, 'rgba(255,80,10,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.6, 0, 7); c.fill();
    for (let n = 0; n < 6; n++) {  // ragged, flickering edge
      const a = Math.random() * 6.28, rr = r * (.55 + Math.random() * .3);
      const bx = x + Math.cos(a) * r * .35, by = y + Math.sin(a) * r * .35;
      g = c.createRadialGradient(bx, by, 0, bx, by, rr);
      g.addColorStop(0, 'rgba(255,170,60,.7)'); g.addColorStop(1, 'rgba(255,60,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, rr, 0, 7); c.fill();
    }
    g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#fff8dc'); g.addColorStop(.35, '#ffd25a'); g.addColorStop(.7, '#ff7a1a'); g.addColorStop(1, 'rgba(220,50,10,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * (.95 + Math.random() * .1), 0, 7); c.fill();
    c.globalCompositeOperation = 'source-over';
  }

  function drawBall(t, dt) {
    if (t < T_START) return;
    const p = Math.min(1, (t - T_START) / (tHit - T_START)), e = Math.pow(p, 2.4);
    const x = -.1 * W + DX * e, y = .12 * H + (CY - .12 * H) * e - Math.sin(Math.PI * e) * H * .1;
    const r = (7 + 150 * Math.pow(e, 1.1)) * K;
    trailAcc += dt * (180 + 500 * e);
    while (trailAcc >= 1) {
      trailAcc--;
      trail.push({ x: x + (Math.random() - .5) * r * .5, y: y + (Math.random() - .5) * r * .5,
        vx: -DX / DL * 70 + (Math.random() - .5) * 70, vy: -DY / DL * 70 + (Math.random() - .5) * 70,
        age: 0, max: .45 + Math.random() * .5, size: (.35 + Math.random() * .5) * r });
    }
    c.globalCompositeOperation = 'lighter';
    trail = trail.filter(q => q.age < q.max);
    for (const q of trail) {
      q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const k = 1 - q.age / q.max;
      c.fillStyle = `rgba(255,${Math.round(70 + 170 * k)},20,${.5 * k})`;
      c.beginPath(); c.arc(q.x, q.y, Math.max(.5, q.size * k), 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    ball(x, y, r);
  }

  function impact(t) {
    impacted = true; tI = t;
    introEl.classList.add('shattered');
    try { sessionStorage.setItem('intro', '1'); } catch (e) {}
    for (let n = 0; n < 220; n++) {
      const a = Math.random() * 6.28, sp = (200 + Math.random() * 1100) * K;
      sparks.push({ x: CX, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, max: .5 + Math.random() * .9 });
    }
  }

  function drawImpact(t, dt) {
    const s = t - tI;
    // shards: held in place with glowing cracks, then blasted outward from the centre
    c.shadowColor = '#ff7a1a'; c.shadowBlur = 10 * K + 4;
    for (const sh of shards) {
      const u = s - sh.rel;
      let a = 1, dx = 0, dy = 0, rot = 0;
      if (u > 0) { dx = sh.vx * u; dy = sh.vy * u + 550 * u * u; rot = sh.vr * u; a = Math.max(0, 1 - u / .9); }
      if (a <= 0) continue;
      c.save(); c.translate(sh.mx + dx, sh.my + dy); c.rotate(rot); c.translate(-sh.mx, -sh.my);
      c.beginPath(); c.moveTo(sh.poly[0][0], sh.poly[0][1]);
      for (let n = 1; n < 4; n++) c.lineTo(sh.poly[n][0], sh.poly[n][1]);
      c.closePath();
      c.fillStyle = `rgba(0,0,0,${a})`; c.fill();
      c.strokeStyle = `rgba(255,170,60,${a})`; c.lineWidth = 2; c.stroke();
      c.restore();
    }
    c.shadowBlur = 0;
    c.globalCompositeOperation = 'lighter';
    for (const rg of rings) {
      const r = (s - rg.delay) * rg.sp * K;
      if (r <= 0) continue;
      const al = Math.max(0, 1 - r / (R * 1.1));
      c.strokeStyle = `rgba(255,190,100,${al * .8})`; c.lineWidth = 3 + 16 * al * K;
      c.beginPath(); c.arc(CX, CY, r, 0, 7); c.stroke();
    }
    sparks = sparks.filter(q => q.age < q.max);
    for (const q of sparks) {
      q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; q.vx *= .99;
      c.fillStyle = `rgba(255,${Math.round(120 + 100 * (1 - q.age / q.max))},40,${1 - q.age / q.max})`;
      c.fillRect(q.x, q.y, 2.5 * K + 1, 2.5 * K + 1);
    }
    c.globalCompositeOperation = 'source-over';
    const fa = Math.pow(Math.max(0, 1 - s / .45), 1.5);
    if (fa > 0) { c.fillStyle = `rgba(255,244,220,${fa})`; c.fillRect(0, 0, W, H); }
    const amp = 22 * K * Math.max(0, 1 - s / .55);
    introEl.style.transform = amp > .4 ? `translate(${(Math.random() - .5) * amp}px,${(Math.random() - .5) * amp}px) scale(1.02)` : '';
    if (!released && s > .7) {
      released = true;
      root0.classList.remove('intro-lock');
      introOver = true; introQueue.splice(0).forEach(fn => fn());
    }
  }

  function frame(now) {
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - prev) / 1000); prev = now;
    c.clearRect(0, 0, W, H);
    if (!impacted) { if (t >= tHit) impact(t); else drawBall(t, dt); }
    if (impacted) {
      drawImpact(t, dt);
      if (t - tI > 2.7) { introEl.remove(); return; }
    }
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (!impacted) tHit = 0;            // skip straight to the slam
    else tI -= 1.8;                     // already shattering: wrap it up fast
  }
  introEl.addEventListener('click', finish);
  addEventListener('keydown', finish, { once: true });
  raf = requestAnimationFrame(frame);
}

// Project links: fill in your real URLs here.
const LINKS = {
  linkedin: 'https://www.linkedin.com/in/sunny-bhatkar-75793828a',
  github: 'https://github.com/Sunny-sketchs',
  leetcode: 'https://leetcode.com/u/HN06kwVLTb/',
  'sql-rag': '#',
  gateway: '#',
  histo: '#',
  docintel: '#',
};
document.querySelectorAll('[data-link]').forEach(a => {
  const url = LINKS[a.dataset.link];
  if (url && url !== '#') { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  else a.addEventListener('click', e => e.preventDefault());
});

// Theme toggle (initial theme is set by the inline script in <head>)
const root = document.documentElement;
let dotRGB, lnRGB;
function readColors() {
  const cs = getComputedStyle(root);
  const g = n => cs.getPropertyValue(n).trim().replace(/'/g, '');
  dotRGB = g('--dot'); lnRGB = g('--ln');
}
document.getElementById('theme').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
  readColors();
});

// Typing effect
const phrases = [
  'ship with an eval harness.',
  'route questions to SQL or RAG.',
  'block prompt injection and PII.',
  'catch bugs in the logs.',
  'run hot and never burn out.',
  'survive production with no regrets.',
];
const typeEl = document.getElementById('type');
let pi = 0, ci = 0, del = false;
(function tick() {
  const p = phrases[pi];
  ci += del ? -1 : 1;
  typeEl.textContent = p.slice(0, ci);
  let wait = del ? 28 : 55;
  if (!del && ci === p.length) { del = true; wait = 1600; }
  else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 350; }
  setTimeout(tick, wait);
})();

// Scroll reveal + counters + bars
const counted = new WeakSet();
function count(el) {
  if (counted.has(el)) return;
  counted.add(el);
  const target = +el.dataset.count, suf = el.dataset.suffix || '', comma = el.dataset.comma;
  const t0 = performance.now(), dur = comma ? 2200 : 1400;
  (function step(t) {
    const k = Math.min((t - t0) / dur, 1);
    const v = Math.round(target * (1 - Math.pow(1 - k, 3)));
    el.textContent = (comma ? v.toLocaleString('en-US') : v) + suf;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
document.querySelectorAll('.card, .stat, .skill-group, .sec-head, .contact > *').forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach(count);
    if (e.target.matches('[data-count]')) count(e.target);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
afterIntro(() => document.querySelectorAll('.reveal').forEach(el => io.observe(el)));

// Pipeline animation: light up each node then connector in order
document.querySelectorAll('[data-flow]').forEach(card => {
  const flow = card.querySelector('.flow');
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    for (const el of [...flow.children]) {
      const group = el.classList.contains('branch') ? [...el.children] : [el];
      group.forEach(n => n.classList.add('lit'));
      await new Promise(r => setTimeout(r, 420));
      group.forEach(n => n.classList.remove('lit'));
      const next = el.nextElementSibling;
      if (next && next.tagName === 'I') {
        next.classList.add('lit');
        await new Promise(r => setTimeout(r, 300));
        next.classList.remove('lit');
      }
    }
    running = false;
  }
  card.addEventListener('mouseenter', run);
  card.addEventListener('click', run);
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { setTimeout(run, 600); o.disconnect(); } }, { threshold: .5 }).observe(flow);
});

// Card tilt + spotlight
const fine = matchMedia('(pointer:fine)').matches;
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty('--mx', x + 'px');
    card.style.setProperty('--my', y + 'px');
    if (fine) {
      const rx = ((y / r.height) - .5) * -4, ry = ((x / r.width) - .5) * 4;
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// Back-to-top flame: ring fills as you scroll
const ring = document.getElementById('lpring');
function aim() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
  ring.style.strokeDashoffset = 157.08 * (1 - p);
}
addEventListener('scroll', aim, { passive: true }); aim();
document.getElementById('logpose').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

// Cursor glow
const glow = document.getElementById('glow');
addEventListener('mousemove', e => { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; });

// Rising embers (colors follow the theme); the cursor sheds sparks
const cv = document.getElementById('bg'), ctx = cv.getContext('2d');
let embers = [];
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
function spawn(x, y, burst) {
  embers.push({
    x, y,
    vx: (Math.random() - .5) * (burst ? 1.6 : .6),
    vy: -(burst ? .6 + Math.random() * 1.4 : .35 + Math.random() * .9),
    r: .8 + Math.random() * (burst ? 1.6 : 2.2),
    life: 0, max: 140 + Math.random() * 160,
    ph: Math.random() * 6.28, hot: Math.random() < .35,
  });
}
addEventListener('mousemove', e => {
  if (!reduce && Math.random() < .5) spawn(e.clientX, e.clientY, true);
});
function resize() {
  const d = devicePixelRatio || 1;
  cv.width = innerWidth * d; cv.height = innerHeight * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', resize); resize(); readColors();
(function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (!reduce && embers.length < Math.min(140, innerWidth / 8) && Math.random() < .6) spawn(Math.random() * innerWidth, innerHeight + 10);
  embers = embers.filter(p => p.life < p.max && p.y > -20);
  for (const p of embers) {
    p.life++; p.ph += .05;
    p.x += p.vx + Math.sin(p.ph) * .35; p.y += p.vy;
    const k = 1 - p.life / p.max;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.5 + k), 0, 7);
    ctx.fillStyle = `rgba(${p.hot ? lnRGB : dotRGB},${.75 * k})`;
    ctx.shadowColor = `rgb(${dotRGB})`; ctx.shadowBlur = 8;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  requestAnimationFrame(draw);
})();
