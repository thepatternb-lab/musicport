/* CAPI CAPI — portfolio engine: WebGL background, GSAP typography, Web Audio player */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const hasGSAP = typeof gsap !== 'undefined';
  if (hasGSAP && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  /* ---------- Content (info/content.json with placeholder fallback) ---------- */
  const DEFAULT_CONTENT = {
    name: 'CAPI CAPI',
    tagline: 'Engineering signal from noise.',
    about: 'Capi Capi designs and builds immersive digital systems at the intersection of code, sound and light. This is placeholder copy — drop an info/content.json file to replace it.',
    skills: ['WebGL / GLSL', 'Creative Coding', 'Audio DSP', 'Systems Design', 'Interaction'],
    projects: [
      { title: 'Neon Lattice', description: 'Real-time shader grid reacting to sound and cursor.', tags: ['GLSL', 'Three.js'] },
      { title: 'Signal Garden', description: 'Generative audio instrument built on the Web Audio API.', tags: ['Web Audio', 'JS'] },
      { title: 'Ghost Protocol UI', description: 'Glassmorphic interface kit for dark-future dashboards.', tags: ['CSS', 'GSAP'] }
    ],
    contact: { text: 'Open to collaborations, commissions and strange ideas.', email: 'hello@example.com' }
  };

  async function fetchJSON(url) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  async function loadContent() {
    const remote = await fetchJSON('info/content.json');
    const c = Object.assign({}, DEFAULT_CONTENT, remote && typeof remote === 'object' ? remote : {});
    c.contact = Object.assign({}, DEFAULT_CONTENT.contact, (remote && remote.contact) || {});
    if (!Array.isArray(c.skills)) c.skills = DEFAULT_CONTENT.skills;
    if (!Array.isArray(c.projects) || !c.projects.length) c.projects = DEFAULT_CONTENT.projects;
    return { content: c, fromInfo: !!remote };
  }

  function renderContent(c) {
    const title = $('#title');
    title.textContent = (c.name || 'CAPI CAPI').toUpperCase();
    title.setAttribute('aria-label', c.name);
    $('#tagline').textContent = c.tagline;
    $('#about-text').textContent = c.about;
    $('#skills').innerHTML = '';
    c.skills.forEach(s => { const li = document.createElement('li'); li.textContent = s; $('#skills').appendChild(li); });
    const grid = $('#projects');
    grid.innerHTML = '';
    c.projects.forEach((p, i) => {
      const el = document.createElement('article');
      el.className = 'project glass';
      el.setAttribute('data-card', '');
      const idx = document.createElement('div'); idx.className = 'idx'; idx.textContent = String(i + 1).padStart(2, '0') + ' //';
      const h = document.createElement('h3'); h.textContent = p.title || 'Untitled';
      const d = document.createElement('p'); d.textContent = p.description || '';
      const t = document.createElement('div'); t.className = 'tags'; t.textContent = (p.tags || []).join(' · ');
      el.append(idx, h, d, t);
      grid.appendChild(el);
    });
    $('#contact-text').textContent = c.contact.text;
    $('#contact-link').href = 'mailto:' + c.contact.email;
    $('#year').textContent = new Date().getFullYear();
  }

  /* ---------- Text splitting ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    const out = [];
    for (const ch of text) {
      const s = document.createElement('span');
      if (ch === ' ') { s.className = 'sp'; } else { s.className = 'ch'; s.textContent = ch; out.push(s); }
      el.appendChild(s);
    }
    return out;
  }

  /* ---------- Shared audio-reactive state ---------- */
  const reactive = { level: 0, bass: 0 };
  const mouse = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };

  /* ---------- WebGL background ---------- */
  function initBackground() {
    const canvas = $('#bg');
    if (typeof THREE === 'undefined') { canvas.style.background = 'radial-gradient(circle at 50% 100%, #0a1a22, #02030a)'; return; }
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false }); }
    catch (e) { canvas.style.background = 'radial-gradient(circle at 50% 100%, #0a1a22, #02030a)'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAudio: { value: 0 },
      uBass: { value: 0 },
      uScroll: { value: 0 }
    };

    const frag = `
      precision highp float;
      uniform float uTime, uAudio, uBass, uScroll;
      uniform vec2 uRes, uMouse;
      varying vec2 vUv;

      const vec3 GREEN = vec3(0.0, 1.0, 0.62);
      const vec3 PINK  = vec3(1.0, 0.0, 0.333);
      const vec3 CYAN  = vec3(0.0, 0.831, 1.0);

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 uv = vUv;
        vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);
        vec2 m = (uMouse - 0.5) * vec2(uRes.x/uRes.y, 1.0);
        float t = uTime;

        // nebula (upper sky)
        vec2 q = p*1.4 + vec2(t*0.02, -t*0.015) + m*0.15;
        float n = fbm(q + fbm(q*1.5 + t*0.05));
        vec3 neb = mix(vec3(0.01,0.0,0.06), PINK*0.55, smoothstep(0.35, 0.85, n));
        neb = mix(neb, CYAN*0.5, smoothstep(0.5, 1.0, fbm(q*0.8 - 3.0))*0.55);
        neb *= 0.55 + uAudio*0.9;

        float horizon = -0.05 + m.y*0.05 + uScroll*0.12;
        vec3 col = neb * smoothstep(horizon - 0.25, horizon + 0.5, p.y);

        // stars
        vec2 sg = floor((p + 5.0) * 90.0);
        float star = step(0.9965, hash(sg)) * (0.5 + 0.5*sin(t*2.0 + hash(sg+3.0)*40.0));
        col += star * 0.8 * smoothstep(horizon, horizon+0.3, p.y);

        // perspective grid (floor)
        if (p.y < horizon) {
          float d = horizon - p.y;
          float z = 0.35 / (d + 0.001);
          float x = (p.x - m.x*0.4) * z;
          float zz = z + t*(0.8 + uAudio*1.5);
          vec2 g = vec2(x, zz);
          vec2 fw = fwidth(g) + 1e-4;
          vec2 grid = abs(fract(g - 0.5) - 0.5) / fw;
          float line = 1.0 - min(min(grid.x, grid.y), 1.0);
          float fade = exp(-d * 0.0) * smoothstep(0.0, 0.25, d) ;
          float pulse = 0.5 + 0.5*sin(zz*0.6 - t*2.0);
          vec3 lc = mix(GREEN, CYAN, pulse);
          lc = mix(lc, PINK, clamp(uBass*0.8, 0.0, 1.0));
          col += lc * line * fade * (0.55 + uAudio*1.6);
          col += GREEN * 0.05 * exp(-d*6.0);
        }
        // horizon glow
        col += mix(PINK, CYAN, 0.5+0.5*sin(t*0.3)) * exp(-abs(p.y - horizon)*18.0) * (0.45 + uBass*0.9);

        // cursor halo
        float md = length(p - m);
        col += GREEN * 0.07 * exp(-md*4.0);

        // chromatic grain
        col += (hash(uv*uRes + t) - 0.5) * 0.03;
        col = pow(col, vec3(0.95));
        gl_FragColor = vec4(col, 1.0);
      }`;
    const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, extensions: { derivatives: true } });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    // floating particles layer
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i*3] = (Math.random()*2-1); pos[i*3+1] = (Math.random()*2-1); pos[i*3+2] = Math.random(); }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pu = { uTime: uniforms.uTime, uAudio: uniforms.uAudio, uPx: { value: renderer.getPixelRatio() } };
    const pm = new THREE.ShaderMaterial({
      uniforms: pu, transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime, uAudio, uPx; varying float vA; varying float vH;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + 1.0 + uTime*0.02*(0.3+p.z) , 2.0) - 1.0;
          p.x += sin(uTime*0.3 + p.z*20.0)*0.02;
          vA = 0.25 + 0.75*p.z; vH = p.z;
          gl_Position = vec4(p.xy, 0.0, 1.0);
          gl_PointSize = (1.5 + p.z*3.0 + uAudio*4.0) * uPx;
        }`,
      fragmentShader: `
        varying float vA; varying float vH;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * 0.7;
          vec3 c = mix(vec3(0.0,1.0,0.62), vec3(1.0,0.0,0.333), step(0.8, vH));
          gl_FragColor = vec4(c, a);
        }`
    });
    scene.add(new THREE.Points(pg, pm));

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      const pr = renderer.getPixelRatio();
      uniforms.uRes.value.set(w * pr, h * pr);
      pu.uPx.value = pr;
    }
    window.addEventListener('resize', resize);
    resize();

    const clock = new THREE.Clock();
    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      mouse.sx += (mouse.x - mouse.sx) * 0.05;
      mouse.sy += (mouse.y - mouse.sy) * 0.05;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.set(mouse.sx, 1 - mouse.sy);
      uniforms.uAudio.value += (reactive.level - uniforms.uAudio.value) * 0.15;
      uniforms.uBass.value += (reactive.bass - uniforms.uBass.value) * 0.2;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      uniforms.uScroll.value = max > 0 ? window.scrollY / max : 0;
      renderer.render(scene, camera);
    })();
  }

  /* ---------- GSAP: typography + transitions ---------- */
  function initAnimations(chars) {
    if (!hasGSAP) { $$('[data-hero],[data-reveal],[data-card]').forEach(e => e.style.opacity = 1); return; }
    const ease = 'expo.out';

    // intro timeline
    const tl = gsap.timeline({ defaults: { ease } });
    tl.from('.topbar', { y: -80, opacity: 0, duration: 1.4 })
      .from(chars, {
        yPercent: 120, rotationX: -90, opacity: 0, filter: 'blur(14px)',
        duration: 1.6, stagger: { each: 0.06, from: 'center', ease: 'power2.in' }, transformOrigin: '50% 100%'
      }, 0.2)
      .from('[data-hero]', { y: 30, opacity: 0, duration: 1.2, stagger: 0.12 }, 0.9)
      .from('.player', { y: 60, opacity: 0, scale: 0.94, duration: 1.4, ease: 'back.out(1.4)' }, 1.2);

    // glitch flicker accent
    gsap.to('#title', {
      keyframes: [
        { textShadow: '3px 0 #ff0055, -3px 0 #00d4ff', duration: 0.06 },
        { textShadow: '0 0 30px rgba(0,255,159,.25)', duration: 0.1 },
        { textShadow: '-2px 0 #ff0055, 2px 0 #00d4ff', duration: 0.05 },
        { textShadow: '0 0 30px rgba(0,255,159,.25)', duration: 0.2 }
      ],
      repeat: -1, repeatDelay: 5, delay: 3
    });

    // mouse-reactive typography: characters repel/glow near cursor
    const title = $('#title');
    const setters = chars.map(c => ({
      el: c,
      x: gsap.quickTo(c, 'x', { duration: 0.6, ease: 'power3.out' }),
      y: gsap.quickTo(c, 'y', { duration: 0.6, ease: 'power3.out' }),
      r: gsap.quickTo(c, 'rotation', { duration: 0.8, ease: 'power3.out' }),
      s: gsap.quickTo(c, 'scale', { duration: 0.6, ease: 'power3.out' })
    }));
    window.addEventListener('pointermove', e => {
      const radius = 220;
      const tr = title.getBoundingClientRect();
      if (e.clientY > tr.bottom + 150 || e.clientY < tr.top - 150) {
        setters.forEach(s => { s.x(0); s.y(0); s.r(0); s.s(1); });
        return;
      }
      setters.forEach(s => {
        const b = s.el.getBoundingClientRect();
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const dx = cx - e.clientX, dy = cy - e.clientY;
        const dist = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - dist / radius);
        const k = f * f;
        s.x(dx / (dist || 1) * k * 40);
        s.y(dy / (dist || 1) * k * 40);
        s.r(dx / (dist || 1) * k * 14);
        s.s(1 + k * 0.25);
        gsap.to(s.el, { color: k > 0.15 ? (dx > 0 ? '#ff0055' : '#00d4ff') : '#ffffff', duration: 0.4, overwrite: 'auto' });
      });
    });

    // audio-reactive title scale pulse
    gsap.ticker.add(() => {
      gsap.set(title, { scale: 1 + reactive.bass * 0.015, transformOrigin: '0% 50%' });
    });

    // section titles & cards on scroll
    $$('[data-split]').forEach(el => {
      const cs = splitChars(el);
      gsap.from(cs, {
        yPercent: 110, opacity: 0, rotationZ: 6, duration: 1.2, ease: 'expo.out', stagger: 0.04,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
    $$('[data-card]').forEach((el, i) => {
      gsap.from(el, {
        y: 80, opacity: 0, rotationX: -12, transformPerspective: 900, duration: 1.4, ease: 'power4.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
    $$('.chips li').forEach((el, i) => {
      gsap.from(el, { scale: 0.6, opacity: 0, duration: 0.9, ease: 'elastic.out(1,0.6)', delay: i * 0.07,
        scrollTrigger: { trigger: '#skills', start: 'top 92%' } });
    });

    // project tilt + glow
    $$('.project').forEach(card => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      card.addEventListener('pointermove', e => {
        const b = card.getBoundingClientRect();
        const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
        ry((px - 0.5) * 14); rx(-(py - 0.5) * 14);
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });

    // parallax hero
    gsap.to('.hero > *:not(.scroll-hint)', {
      yPercent: -18, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
    });

    // smooth anchor scroll via GSAP
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href'));
      if (!t || !gsap.plugins || !gsap.plugins.scrollTo) return; // native smooth scroll fallback
      e.preventDefault();
    }));
  }

  /* ---------- Web Audio player ---------- */
  function Player() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const S = {
      ctx: null, gain: null, analyser: null, tracks: [], index: 0, buffer: null,
      source: null, startedAt: 0, offset: 0, playing: false, loading: false, token: 0,
      cache: new Map()
    };
    const el = {
      title: $('#p-title'), sub: $('#p-sub'), play: $('#play'), prev: $('#prev'), next: $('#next'),
      seek: $('#seek'), vol: $('#vol'), cur: $('#t-cur'), dur: $('#t-dur'), list: $('#playlist'),
      viz: $('#viz'), min: $('#p-min'), body: $('.p-body')
    };
    const vctx = el.viz.getContext('2d');
    let seeking = false, freq = null;

    const fmt = s => { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

    function ensureCtx() {
      if (S.ctx) return;
      S.ctx = new AC();
      S.gain = S.ctx.createGain();
      S.analyser = S.ctx.createAnalyser();
      S.analyser.fftSize = 256;
      S.analyser.smoothingTimeConstant = 0.82;
      S.gain.connect(S.analyser);
      S.analyser.connect(S.ctx.destination);
      freq = new Uint8Array(S.analyser.frequencyBinCount);
      applyVolume();
    }
    function applyVolume() { if (S.gain) S.gain.gain.value = Math.pow(el.vol.value / 100, 1.6); }

    /* Procedural fallback tracks, rendered into AudioBuffers (used when tracks/ has no files) */
    function synthTrack(ctx, spec) {
      const sr = ctx.sampleRate, dur = spec.dur;
      const buf = ctx.createBuffer(2, sr * dur, sr);
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const beat = 60 / spec.bpm, step = beat / 2;
      const midi = n => 440 * Math.pow(2, (n - 69) / 12);
      for (let i = 0; i < L.length; i++) {
        const t = i / sr;
        const si = Math.floor(t / step);
        const st = t - si * step;
        const chord = spec.prog[Math.floor(si / 16) % spec.prog.length];
        // bass
        const bf = midi(chord[0] - 24);
        const benv = Math.exp(-st * 5);
        let bass = Math.tanh(Math.sin(2 * Math.PI * bf * t) * 2.2) * benv * 0.35 * (si % 2 === 0 ? 1 : 0.5);
        // arpeggio
        const note = chord[spec.arp[si % spec.arp.length] % chord.length] + 12 * spec.oct;
        const af = midi(note), aenv = Math.exp(-st * 9);
        const ph = 2 * Math.PI * af * t;
        const arpL = (Math.sin(ph) + 0.4 * Math.sin(ph * 2.01) + 0.2 * Math.sin(ph * 3)) * aenv * 0.16;
        const arpR = (Math.sin(ph * 1.003) + 0.4 * Math.sin(ph * 2) + 0.2 * Math.sin(ph * 3.01)) * aenv * 0.16;
        // kick
        const kt = t % beat;
        const kick = Math.sin(2 * Math.PI * (45 + 120 * Math.exp(-kt * 30)) * kt) * Math.exp(-kt * 9) * 0.55;
        // hat
        const ht = (t + step) % beat;
        const hat = (Math.random() * 2 - 1) * Math.exp(-ht * 60) * 0.07;
        // pad
        let pad = 0;
        for (let k = 0; k < chord.length; k++) pad += Math.sin(2 * Math.PI * midi(chord[k]) * t + k);
        pad *= 0.025 * (0.6 + 0.4 * Math.sin(t * 0.4));
        const fade = Math.min(1, t / 0.5, (dur - t) / 1.5);
        L[i] = (bass + arpL + kick + hat + pad) * fade;
        R[i] = (bass + arpR + kick + hat * 0.8 + pad) * fade;
      }
      return buf;
    }

    const FALLBACK = [
      { title: 'Neon Drift', artist: 'Capi Capi · generated', synth: { bpm: 104, dur: 48, oct: 1, arp: [0, 1, 2, 1, 2, 1, 0, 2], prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] } },
      { title: 'Ghost Circuit', artist: 'Capi Capi · generated', synth: { bpm: 122, dur: 48, oct: 1, arp: [0, 2, 1, 2, 0, 1, 2, 1], prog: [[50, 53, 57], [58, 62, 65], [53, 57, 60], [48, 52, 55]] } },
      { title: 'Afterglow Protocol', artist: 'Capi Capi · generated', synth: { bpm: 88, dur: 48, oct: 2, arp: [2, 1, 0, 1, 2, 0, 1, 0], prog: [[52, 55, 59], [57, 60, 64], [55, 59, 62], [50, 54, 57]] } }
    ];

    async function loadManifest() {
      const AUDIO_RE = /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i;
      const m = await fetchJSON('tracks/manifest.json');
      let list = [];
      if (m) {
        const arr = Array.isArray(m) ? m : m.tracks;
        if (Array.isArray(arr)) {
          list = arr.map(t => typeof t === 'string' ? { file: t } : t)
            .filter(t => t && t.file && AUDIO_RE.test(t.file))
            .map(t => ({
              title: t.title || t.file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
              artist: t.artist || 'Capi Capi',
              url: /^(https?:)?\/\//.test(t.file) || t.file.startsWith('tracks/') ? t.file : 'tracks/' + encodeURIComponent(t.file)
            }));
        }
      }
      if (!list.length) {
        // try directory listing (works on simple static servers)
        try {
          const r = await fetch('tracks/');
          if (r.ok && /html/.test(r.headers.get('content-type') || '')) {
            const html = await r.text();
            const re = /href="([^"?#]+\.(?:mp3|wav|ogg|m4a|flac|aac|webm))"/gi;
            let x; const seen = new Set();
            while ((x = re.exec(html))) {
              const name = decodeURIComponent(x[1].split('/').pop());
              if (seen.has(name)) continue; seen.add(name);
              list.push({ title: name.replace(/\.[^.]+$/, '').replace(The cut-off also dropped the middle of `script.js`, so I can't safely stitch onto it. Below is the complete `script.js`, plus the `tracks/` and `info/` files. It is written as full files because partial blocks are rejected.

File: script.js
