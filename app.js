// Dra. Inês Napoli — prévia conceitual (Bruno Luque). Ideia central: "Sob medida" (linguagem de ateliê).
// O conteúdo funciona sem este arquivo: estados escondidos só existem depois de `motion-ready`.
//
// Motion em 3 camadas
//  ASSINATURA  hero (alinhavo desenhado sobre o retrato + fita métrica) e a cena presa "As quatro provas"
//              (scroll scrubbing com detentes: fita, marcas de giz/alinhavo e alfinete).        [path--sereno, image-zoom--sereno]
//  NARRATIVA   fita que vira divisor entre seções e fio (alinhavo) que conduz do hero ao texto.   [path--sereno]
//  INTERFACE   CTA com alfinete magnético, chips de dúvida, títulos em máscara de linhas.         [magnetic--preciso, line-mask--editorial]

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const wideMQ = matchMedia('(min-width: 900px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

// ---- tokens de motion (espelham o CSS) ----
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.13, ctl: 0.2, panel: 0.32 };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const WA = 'https://wa.me/5548988295128';

const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');
const animated = !!M && !reduce;
const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

/* ------------------------------------------------------------------ */
/* SVG: traços que se desenham (máscara com traço sólido por baixo)     */
/* ------------------------------------------------------------------ */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
let uid = 0;
// cria um traço; `set(v)` desenha de 0 a 1 quando animado
function stroke(svg, parent, cls, d, defs) {
  const p = el('path', { class: cls, d }, parent);
  if (!animated) return { el: p, set() {} };
  const id = 'mk' + ++uid;
  const mask = el('mask', { id, maskUnits: 'userSpaceOnUse', x: -60, y: -60, width: 700, height: 700 }, defs);
  const c = el('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 10, 'stroke-linecap': 'butt', pathLength: 1 }, mask);
  c.style.strokeDasharray = '1 1';
  c.style.strokeDashoffset = '1';
  p.setAttribute('mask', `url(#${id})`);
  let last = -1;
  return { el: p, set(v) { v = clamp(v); const s = v.toFixed(3); if (s !== last) { last = s; c.style.strokeDashoffset = String(1 - v); } } };
}
function tween(dur, delay, ease, fn) {
  return M.animate(0, 1, { duration: dur, delay, ease, onUpdate: fn });
}

/* ------------------------------------------------------------------ */
/* Fita métrica: numerais e deslocamento ligado à rolagem               */
/* ------------------------------------------------------------------ */
const tapeNums = $('[data-tape-nums]');
if (tapeNums) {
  const n = Math.ceil((screen.width || 1440) / 100) + 4;
  tapeNums.innerHTML = Array.from({ length: Math.max(18, n) }, (_, i) => `<i>${i * 10}</i>`).join('');
}
const tapeEls = $$('[data-tape]');

/* ------------------------------------------------------------------ */
/* Marcas do hero: molde e alinhavo sobre o retrato                     */
/* ------------------------------------------------------------------ */
function buildHeroMarks(svg) {
  if (!svg) return null;
  const defs = el('defs', {}, svg);
  const items = [];
  const add = (cls, d) => { const s = stroke(svg, svg, cls, d, defs); items.push(s); return s; };
  const outline = add('st', 'M16 16 H442 L504 66 V537 H16 Z');
  const ticks = add('sl', Array.from({ length: 14 }, (_, i) => `M16 ${300 + i * 16} h${i % 5 === 0 ? 14 : 8}`).join(' '));
  const notches = add('sl', 'M16 252 L30 262 L16 272 M504 292 L490 302 L504 312 M250 537 L260 523 L270 537');
  const gl = add('st', 'M52 430 H132');
  const gr = add('st', 'M388 410 H468');
  const pins = [[16, 16], [504, 66], [16, 537]].map(([x, y]) => {
    const g = el('g', {}, svg);
    el('path', { class: 'sl', d: `M${x} ${y} l12 -14` }, g);
    el('circle', { class: 'pn', cx: x, cy: y, r: 5.5 }, g);
    g.style.transformOrigin = `${x}px ${y}px`;
    return g;
  });
  return { items: [outline, ticks, notches, gl, gr], pins };
}

/* ------------------------------------------------------------------ */
/* Marcas das provas (400 x 320)                                        */
/* pos 0..3: 0 escuta · 1 planejamento · 2 proposta · 3 acompanhamento   */
/* ------------------------------------------------------------------ */
const HEAD = 'M160 36 C240 36 288 100 288 178 C288 256 232 316 160 316 C88 316 32 256 32 178 C32 100 80 36 160 36 Z';
function buildProva(svg) {
  const defs = el('defs', {}, svg);
  const gGuide = el('g', {}, svg);
  const gHead = el('g', {}, svg);
  const gCorner = el('g', {}, svg);
  const gSolid = el('g', {}, svg);
  const corners = [
    ['M26 52 V26 H52', 1, 1], ['M374 52 V26 H348', -1, 1], ['M26 268 V294 H52', 1, -1], ['M374 268 V294 H348', -1, -1],
  ].map(([d, sx, sy]) => ({ s: stroke(svg, gCorner, 'mk-sl', d, defs), sx, sy }));
  const gl = ['M16 96 H58 M16 190 H58 M16 268 H58'].map((d) => stroke(svg, gGuide, 'mk-st', d, defs))[0];
  const gr = stroke(svg, gGuide, 'mk-st', 'M262 96 H384 M262 268 H384', defs);
  const ruler = stroke(svg, gGuide, 'mk-sl', Array.from({ length: 11 }, (_, i) => `M0 ${40 + i * 24} h${i % 2 ? 7 : 12}`).join(' '), defs);
  const head = stroke(svg, gHead, 'mk-st', HEAD, defs);
  const pins = [[32, 178], [160, 36], [288, 178]].map(([x, y]) => {
    const g = el('g', {}, gHead);
    el('path', { class: 'mk-sl', d: `M${x} ${y} l11 -13` }, g);
    el('circle', { class: 'mk-pn', cx: x, cy: y, r: 5.5 }, g);
    g.style.transformOrigin = `${x}px ${y}px`;
    return g;
  });
  const solid = stroke(svg, gSolid, 'mk-sl', HEAD, defs);
  const arc = stroke(svg, gSolid, 'mk-sl', 'M356 46 A22 22 0 1 0 334 68 M334 68 L331 59 M334 68 L343 66', defs);
  gHead.style.transformOrigin = '160px 176px';
  const set = (g, o, t) => { g.style.opacity = o.toFixed(3); if (t !== undefined) g.style.transform = t; };
  return function render(pos) {
    const k = 16 * clamp(pos) - 16 * clamp(pos - 2);
    corners.forEach(({ s, sx, sy }) => { s.el.style.transform = `translate(${(sx * k).toFixed(2)}px, ${(sy * k).toFixed(2)}px)`; s.set(1); });
    set(gCorner, 1 - 0.4 * clamp(pos));
    const d2 = clamp(pos);
    gl.set(d2); gr.set(d2); ruler.set(d2);
    const slide = clamp(pos - 1) * 12;
    gl.el.style.transform = `translateY(${slide.toFixed(2)}px)`;
    gr.el.style.transform = `translateY(${(-slide).toFixed(2)}px)`;
    set(gGuide, 1 - 0.7 * clamp(pos - 2));
    const d3 = clamp(pos - 1), d4 = clamp(pos - 2);
    head.set(d3);
    gHead.style.transform = `scale(${(1.06 - 0.06 * smooth(d3)).toFixed(4)})`;
    pins.forEach((g, i) => { const v = clamp((pos - 1.65 - i * 0.12) / 0.3); g.style.transform = `scale(${v.toFixed(3)})`; g.style.opacity = v > 0 ? 1 : 0; });
    gHead.style.opacity = (1 - 0.35 * d4).toFixed(3);
    solid.set(d4); arc.set(d4);
  };
}

/* ------------------------------------------------------------------ */
/* Mola simples com velocidade preservada (interrompível)              */
/* ------------------------------------------------------------------ */
function springVec(apply, { stiffness = 170, damping = 20 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      s[v] += (-stiffness * (s[k] - s[tk]) - damping * s[v]) * dt; s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.01 && !document.hidden) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; }
  };
  return (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
}

/* ------------------------------------------------------------------ */
/* Topo, rolagem contínua (só roda do mouse) e âncoras                  */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const onScrollTop = () => top.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScrollTop, { passive: true }); onScrollTop();

let lenis = null;
function startLenis() {
  if (reduce || !window.Lenis || lenis || !fineMQ.matches) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });
const goTo = (y, instant) => {
  if (lenis) lenis.scrollTo(y, { duration: instant ? 0 : 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce || instant ? 'auto' : 'smooth' });
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const y = id === '#inicio' ? 0 : target.getBoundingClientRect().top + scrollY - (id === '#provas' ? 0 : top.offsetHeight + 8);
  goTo(y);
  if (id !== '#inicio') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ------------------------------------------------------------------ */
/* Construção das marcas (existem sem Motion; só desenham com ele)      */
/* ------------------------------------------------------------------ */
const hero = buildHeroMarks($('[data-hero-marks]'));
const proveSvg = $('[data-prova-marks]');
const renderProva = proveSvg ? buildProva(proveSvg) : () => {};
const minis = $$('[data-mini]').map((svg) => [Number(svg.dataset.mini), buildProva(svg)]);
minis.forEach(([i, r]) => r(i));   // sequência vertical (celular): cada prova já desenhada
renderProva(3);                    // estado final por padrão (sem JS de cena, reduced-motion)
if (hero) hero.pins.forEach((g) => (g.style.transform = 'scale(1)'));

/* ------------------------------------------------------------------ */
/* Chips de dúvida (tablist com teclado; funciona sem Motion)           */
/* ------------------------------------------------------------------ */
const chipsBox = $('[data-chips]');
if (chipsBox) {
  const tabs = $$('.chip', chipsBox);
  const panels = tabs.map((t) => $('#' + t.getAttribute('aria-controls')));
  let cur = 0, anim = null;
  panels.forEach((p, i) => { p.hidden = i !== 0; });
  const select = (i, focus) => {
    if (i === cur && !focus) return;
    const prev = panels[cur];
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    if (anim) anim.stop();
    prev.hidden = true;
    panels[i].hidden = false;
    cur = i;
    if (animated) anim = M.animate(panels[i], { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: DUR.panel, ease: EASE_OUT });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  chipsBox.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); select((cur + k + tabs.length) % tabs.length, true); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
  });
}

/* ------------------------------------------------------------------ */
/* Contato: mensagem pré-preenchida, WhatsApp e copiar                  */
/* ------------------------------------------------------------------ */
const composer = $('[data-composer]');
if (composer) {
  const ta = $('textarea', composer), ok = $('[data-copy-ok]', composer);
  let t = 0;
  const say = (m) => { ok.textContent = m; clearTimeout(t); t = setTimeout(() => (ok.textContent = ''), 2600); };
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = ta.value.trim();
    if (!v) { say('Escreva uma mensagem curta.'); ta.focus(); return; }
    window.open(`${WA}?text=${encodeURIComponent(v)}`, '_blank', 'noopener');
  });
  $('[data-copy]', composer).addEventListener('click', async () => {
    const v = ta.value.trim();
    if (!v) { say('Escreva uma mensagem curta.'); ta.focus(); return; }
    try { await navigator.clipboard.writeText(v); say('Mensagem copiada.'); }
    catch { ta.select(); try { document.execCommand('copy'); say('Mensagem copiada.'); } catch { say('Selecione e copie o texto.'); } }
  });
}

/* ------------------------------------------------------------------ */
/* CTA fixo no celular: aparece depois do hero, some no contato         */
/* ------------------------------------------------------------------ */
const sticky = $('[data-sticky]');
if (sticky) {
  let pastHero = false, inContact = false;
  const upd = () => sticky.classList.toggle('is-on', pastHero && !inContact);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; upd(); }, { threshold: 0.2 }).observe($('[data-hero]'));
  new IntersectionObserver(([e]) => { inContact = e.isIntersecting; upd(); }, { threshold: 0.15 }).observe($('[data-contato]'));
}

/* ------------------------------------------------------------------ */
/* CTA magnético: o alfinete (só ponteiro fino; usa `translate`)        */
/* ------------------------------------------------------------------ */
if (animated && fineMQ.matches) {
  $$('[data-magnetic]').forEach((b) => {
    const set = springVec((x, y) => { b.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; }, { stiffness: 230, damping: 19 });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      set((e.clientX - r.left - r.width / 2) * 0.16, (e.clientY - r.top - r.height / 2) * 0.28);
    });
    b.addEventListener('pointerleave', () => set(0, 0));
  });
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */
if (M && reduce) root.classList.add('motion-ready');

if (animated) {
  const { animate, scroll, inView, stagger } = M;

  // estados iniciais antes de exibir
  hero.items.forEach((s) => s.set(0));
  hero.pins.forEach((g) => { g.style.transform = 'scale(0)'; });
  root.classList.add('motion-ready');

  /* ---- ASSINATURA 1 · HERO: título em máscara, retrato que se desenrola, alinhavo que marca o molde ---- */
  animate('.hero__title .line > span', { transform: ['translateY(112%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.09), ease: EASE_OUT });
  animate('.hero__lead, .hero__actions', { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0)'] }, { duration: 0.8, delay: stagger(0.1, { startDelay: 0.4 }), ease: EASE_OUT });
  animate('.hero__photo img', { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] }, { duration: 1.25, delay: 0.1, ease: EASE_IN_OUT });
  animate('.tape--hero', { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] }, { duration: 1.3, delay: 0.35, ease: EASE_OUT });
  hero.items.forEach((s, i) => tween(1.05, 0.9 + i * 0.16, EASE_OUT, (v) => s.set(v)));
  hero.pins.forEach((g, i) => tween(0.5, 1.5 + i * 0.14, EASE_OUT, (v) => { g.style.transform = `scale(${(v * (1 + 0.12 * Math.sin(v * Math.PI))).toFixed(3)})`; }));

  /* ---- NARRATIVA 1 · a fita desliza com a rolagem e vira divisor ---- */
  tapeEls.forEach((t) => {
    const host = t.dataset.tape === 'hero' ? $('[data-hero]') : t;
    const k = t.dataset.tape === 'hero' ? -520 : t.dataset.tape === 'div1' ? -380 : 380;
    const off = t.dataset.tape === 'hero' ? ['start start', 'end start'] : ['start end', 'end start'];
    scroll((p) => t.style.setProperty('--tx', `${(prog(p) * k).toFixed(1)}px`), { target: host, offset: off });
  });

  /* ---- NARRATIVA 2 · o alinhavo conduz o olhar do hero ao texto ---- */
  const thread = $('[data-thread]');
  if (thread) {
    const svg = $('svg', thread), path = $('.thread__path', svg), needle = $('.thread__needle', thread);
    const defs = el('defs', {}, svg);
    const d = path.getAttribute('d'); path.remove();
    const th = stroke(svg, svg, 'thread__path', d, defs);
    th.set(0);
    const len = th.el.getTotalLength();
    scroll((p) => {
      const t = prog(p);
      th.set(t);
      const pt = th.el.getPointAtLength(len * clamp(t));
      const r = svg.getBoundingClientRect();
      needle.style.transform = `translate(${(pt.x / 200 * r.width).toFixed(1)}px, ${(pt.y / 220 * r.height).toFixed(1)}px)`;
    }, { target: thread, offset: ['start 0.92', 'end 0.45'] });
  }

  /* ---- Retrato-amostra assenta ao entrar (enquadramento com profundidade) ---- */
  const sw = $('[data-swatch]');
  if (sw) {
    const img = $('.swatch__frame img', sw);
    scroll((p) => { const t = prog(p); img.style.transform = `translate(-25%, -45%) scale(${(1.14 - 0.14 * smooth(clamp(t * 1.5))).toFixed(4)})`; }, { target: sw, offset: ['start end', 'center 0.55'] });
  }

  /* ---- INTERFACE · títulos em máscara de linhas ---- */
  $$('[data-mask]').forEach((h) => {
    const spans = $$('.line > span', h);
    inView(h, () => { animate(spans, { transform: ['translateY(112%)', 'translateY(0%)'] }, { duration: 0.95, delay: stagger(0.09), ease: EASE_OUT }); }, { amount: 0.4 });
  });

  /* ---- ASSINATURA 2 · AS QUATRO PROVAS (cena presa, desktop) ---- */
  const scene = $('[data-scene]');
  const steps = $$('[data-step]');
  const rule = $('[data-rule]');
  const fill = $('[data-rule-fill]');
  const rulePin = $('[data-rule-pin]');
  const stepsBox = $('[data-steps]');
  let cancelScene = null, active = 0, ruleW = 0, anim = null, pinEl = null;

  const measure = () => { ruleW = rule ? rule.querySelector('.tape').clientWidth : 0; };
  const mkPin = () => {
    pinEl = document.createElement('span');
    pinEl.className = 'step__pin'; pinEl.setAttribute('aria-hidden', 'true');
    pinEl.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="17" cy="7" r="4.2"/><path d="M14 10 4 20"/></svg>';
    steps[active].appendChild(pinEl);
  };
  // o alfinete migra para a etapa ativa (FLIP, interrompível)
  const setActive = (i) => {
    if (i === active) return;
    const first = pinEl.getBoundingClientRect();
    steps[active].classList.remove('is-active'); $('.step__btn', steps[active]).removeAttribute('aria-current');
    active = i;
    steps[i].classList.add('is-active'); $('.step__btn', steps[i]).setAttribute('aria-current', 'step');
    if (anim) anim.stop();
    steps[i].appendChild(pinEl);
    const last = pinEl.getBoundingClientRect();
    anim = animate(pinEl, { transform: [`translate(${first.left - last.left}px, ${first.top - last.top}px) rotate(-18deg)`, 'translate(0px, 0px) rotate(0deg)'] }, { duration: 0.5, ease: EASE_OUT });
  };
  let lastPos = -1;
  const renderScene = (p) => {
    // quatro zonas: dentro de cada uma a cena "assenta" no detente e só avança no fim
    const s = clamp(p) * 4, i = Math.min(3, Math.floor(s)), l = s - i;
    const pos = i < 3 ? i + smooth(clamp((l - 0.55) / 0.45)) : 3;
    if (Math.abs(pos - lastPos) < 0.002) return;
    lastPos = pos;
    renderProva(pos);
    fill.style.transform = `scaleX(${(pos / 3).toFixed(4)})`;
    rulePin.style.transform = `translateX(${(pos / 3 * ruleW).toFixed(1)}px)`;
    setActive(Math.round(pos));
  };
  const pinOn = () => {
    if (cancelScene) return;
    root.classList.add('pinned');
    measure(); mkPin(); lastPos = -1;
    cancelScene = scroll((p) => renderScene(prog(p)), { target: scene, offset: ['start start', 'end end'] });
    renderScene(0);
  };
  const pinOff = () => {
    if (!cancelScene) return;
    cancelScene(); cancelScene = null;
    root.classList.remove('pinned');
    pinEl && pinEl.remove();
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === 0); });
    active = 0; renderProva(3);
  };
  const applyMode = () => { (wideMQ.matches && innerHeight >= 560 ? pinOn : pinOff)(); };
  wideMQ.addEventListener('change', applyMode);
  addEventListener('resize', () => { measure(); applyMode(); });
  applyMode();

  // índice com teclado: cada título leva ao detente da sua prova
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    if (!cancelScene) return;
    const i = Number(b.dataset.goto);
    const p = i < 3 ? (i + 0.2) / 4 : 0.88;
    const y = scene.getBoundingClientRect().top + scrollY + p * (scene.offsetHeight - innerHeight);
    goTo(y);
  }));
}
