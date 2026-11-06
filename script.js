(() => {
  "use strict";
  gsap.registerPlugin(ScrollTrigger);

  const DEFAULT_PROFILE = {
    name: "CAPI CAPI",
    tagline: "Neural architect of light, sound & code.",
    role: "Creative Technologist",
    location: "Neo-Tokyo Sector 9",
    about: "I build systems where engineering meets atmosphere — real-time graphics, generative audio and interfaces that feel alive. Every pixel is computed, every sound is intentional.",
    email: "signal@capicapi.dev",
    socials: [
      { label: "GITHUB", url: "https://github.com" },
      { label: "X / TWITTER", url: "https://x.com" },
      { label: "SOUNDCLOUD", url: "https://soundcloud.com" }
    ],
    projects: [
      { title: "NEON CORTEX", desc: "Real-time neural visualizer rendering 2M particles via GPU compute shaders.", tags: ["WEBGL2", "GLSL", "COMPUTE"] },
      { title: "SIGNAL//DRIFT", desc: "Generative ambient engine synthesizing evolving soundscapes in the browser.", tags: ["WEB AUDIO", "DSP"] },
      { title: "GHOST PROTOCOL", desc: "Zero-trust interface system with encrypted, latency-free state sync.", tags: ["RUST", "WASM", "CRDT"] },
      { title: "CHROME HORIZON", desc: "Procedural cityscape explorer with volumetric fog and ray-marched lighting.", tags: ["THREE.JS", "RAYMARCH"] }
    ]
  };

  const DEFAULT_TRACKS = [
    { title: "Midnight Protocol", artist: "Capi Capi", synth: { root: 110, bpm: 92 } },
    { title: "Neon Rain", artist: "Capi Capi", synth: { root: 98, bpm: 80 } },
    { title: "Chrome Heart", artist: "Capi Capi", synth: { root: 123.47, bpm: 104 } }
  ];

  const $ = (s) => document.querySelector(s);
  const audioLevel = { v: 0 };

  /* ---------------- Content ---------------- */
  async function fetchJSON(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function loadProfile() {
    const data = await fetchJSON("info/profile.json");
    return Object.assign({}, DEFAULT_PROFILE, data || {});
  }

  function renderProfile(p) {
    $("#heroTitle").textContent = p.name;
    $("#heroTagline").textContent = p.tagline;
    $("#metaRole").textContent = p.role;
    $("#metaLoc").textContent = p.location;
    $("#aboutText").textContent = p.about;
    const mail = $("#contactMail");
    mail.textContent = p.email;
    mail.href = "mailto:" + p.email;
    $("#year").textContent = new Date().getFullYear();
    document.title = `${p.name} — ${p.role} // Portfolio`;

    const socials = $("#socials");
    socials.innerHTML = "";
    (p.socials || []).forEach((s) => {
      const a = document.createElement("a");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.label;
      a.setAttribute("data-scramble", "");
      socials.appendChild(a);
    });

    const wrap = $("#projects");
    wrap.innerHTML = "";
    (p.projects || []).forEach((pr, i) => {
      const el = document.createElement("article");
      el.className = "project glass";
      const num = document.createElement("span");
      num.className = "num"; num.textContent = "PRJ_" + String(i + 1).padStart(2, "0");
      const h = document.createElement("h3"); h.textContent = pr.title;
      const d = document.createElement("p"); d.textContent = pr.desc;
      const tags = document.createElement("div"); tags.className = "tags";
      (pr.tags || []).forEach((t) => { const s = document.createElement("span"); s.textContent = t; tags.appendChild(s); });
      el.append(num, h, d, tags);
      wrap.appendChild(el);
    });
  }

  function splitChars(el) {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    return [...text].map((c) => {
      const s = document.createElement("span");
      s.className = "ch" + (c === " " ? " space" : "");
      s.textContent = c === " " ? "\u00a0" : c;
      s.setAttribute("aria-hidden", "true");
      el.appendChild(s);
      return s;
    });
  }

  /* ---------------- WebGL ---------------- */
  function initWebGL() {
    const canvas = $("#bg");
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    } catch (e) {
      canvas.style.background = "radial-gradient(circle at 50% 70%, #0a2a2a, #030407)";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2() },
      uMouse: { value: new THREE.Vector2() },
      uAmp: { value: 0 },
      uScroll: { value: 0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      extensions: { derivatives: true },
      vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uAmp; uniform float uScroll;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
        }
        float fbm(vec2 p){
          float v = 0.0, a = 0.5;
          for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
          return v;
        }
        void main(){
          vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
          vec3 col = vec3(0.006, 0.008, 0.016);
          vec2 q = uv*1.6 + uMouse*0.15;
          float n = fbm(q + vec2(uTime*0.025, -uTime*0.018) + fbm(q*1.5 - uTime*0.02));
          vec3 neb = mix(vec3(0.0,0.83,1.0), vec3(1.0,0.0,0.33), smoothstep(0.3,0.8,fbm(q*0.8+3.0)));
          col += neb * pow(n, 3.2) * (0.55 + uAmp*0.6);
          float st = step(0.996, hash(floor(gl_FragCoord.xy*0.5)));
          col += st * 0.6 * (0.5+0.5*sin(uTime*2.0 + hash(floor(gl_FragCoord.xy))*20.0));
          float hor = -0.08 + uMouse.y*0.03 - uScroll*0.15;
          if (uv.y < hor) {
            float d = hor - uv.y;
            float z = 0.32 / d;
            vec2 g = vec2((uv.x - uMouse.x*0.05) * z * 1.4, z + uTime*0.9);
            vec2 gl = abs(fract(g) - 0.5) / fwidth(g);
            float line = 1.0 - min(min(gl.x, gl.y), 1.0);
            float fade = exp(-z*0.09);
            vec3 gc = mix(vec3(0.0,1.0,0.62), vec3(0.0,0.83,1.0), clamp(z*0.05,0.0,1.0));
            col = mix(col, vec3(0.0), 0.6*smoothstep(0.0,0.1,d));
            col += gc * line * fade * (0.75 + uAmp*1.4);
          }
          col += vec3(1.0,0.0,0.33) * exp(-abs(uv.y - hor)*38.0) * (0.45 + uAmp*0.8);
          float sun = length(uv - vec2(0.0, hor+0.22));
          float bands = step(0.0, sin((uv.y - hor)*120.0 - uTime*2.0) + (uv.y - hor)*14.0 - 1.2);
          col += mix(vec3(1.0,0.0,0.33), vec3(1.0,0.5,0.2), clamp((uv.y-hor)*3.0,0.0,1.0)) * smoothstep(0.22,0.21,sun) * bands * step(hor, uv.y) * 0.55;
          col *= 1.0 - 0.55*dot(uv*0.9, uv*0.9);
          col = pow(col, vec3(0.92));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(uniforms.uRes.value);
    }
    resize();
    window.addEventListener("resize", resize);

    const target = { x: 0, y: 0 };
    window.addEventListener("pointermove", (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    });

    const clock = new THREE.Clock();
    function frame() {
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.x += (target.x - uniforms.uMouse.value.x) * 0.04;
      uniforms.uMouse.value.y += (target.y - uniforms.uMouse.value.y) * 0.04;
      uniforms.uAmp.value += (audioLevel.v - uniforms.uAmp.value) * 0.15;
      const maxS = Math.max(1, document.body.scrollHeight - window.innerHeight);
      uniforms.uScroll.value = window.scrollY / maxS;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    frame();
  }

  /* ---------------- Audio ---------------- */
  class Player {
    constructor() {
      this.tracks = [];
      this.index = 0;
      this.ctx = null;
      this.buffer = null;
      this.source = null;
      this.offset = 0;
      this.startedAt = 0;
      this.playing = false;
      this.seeking = false;
      this.loadToken = 0;
      this.volume = 0.7;
      this.ui = {
        play: $("#playBtn"), prev: $("#prevBtn"), next: $("#nextBtn"),
        icon: $("#playIcon"), seek: $("#seek"), vol: $("#volume"),
        cur: $("#curTime"), dur: $("#durTime"), title: $("#trackTitle"), artist: $("#trackArtist"),
        viz: $("#viz")
      };
      this.bind();
      this.drawViz();
    }

    async loadManifest() {
      const data = await fetchJSON("tracks/manifest.json");
      const list = Array.isArray(data) ? data : (data && data.tracks) || [];
      this.tracks = list.length ? list.map((t) => ({ ...t })) : DEFAULT_TRACKS.map((t) => ({ ...t }));
      this.showMeta();
    }

    ensureCtx() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.gain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    async synthesize(spec, fallbackIdx) {
      const s = spec || DEFAULT_TRACKS[fallbackIdx % DEFAULT_TRACKS.length].synth;
      const sr = 44100, dur = 48;
      const off = new OfflineAudioContext(2, sr * dur, sr);
      const master = off.createGain(); master.gain.value = 0.5;
      const filt = off.createBiquadFilter(); filt.type = "lowpass"; filt.Q.value = 6;
      filt.frequency.setValueAtTime(400, 0);
      for (let t = 0; t < dur; t += 8) filt.frequency.linearRampToValueAtTime(t % 16 ? 2200 : 500, t + 8);
      filt.connect(master); master.connect(off.destination);
      const ratios = [1, 1.5, 2, 2.378, 3];
      ratios.forEach((r, i) => {
        const o = off.createOscillator(); o.type = i % 2 ? "sawtooth" : "triangle";
        o.frequency.value = s.root * r; o.detune.value = (i - 2) * 7;
        const g = off.createGain(); g.gain.value = 0.06;
        o.connect(g); g.connect(filt); o.start(0); o.stop(dur);
      });
      const beat = 60 / s.bpm;
      for (let t = 0; t < dur; t += beat) {
        const o = off.createOscillator(); const g = off.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
        g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32);
      }
      const notes = [1, 1.189, 1.335, 1.498, 1.782, 2];
      for (let t = 0, k = 0; t < dur; t += beat / 2, k++) {
        if ((k * 7) % 5 > 2) continue;
        const o = off.createOscillator(); o.type = "square";
        o.frequency.value = s.root * 4 * notes[(k * 3) % notes.length];
        const g = off.createGain();
        g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.45);
        o.connect(g); g.connect(filt); o.start(t); o.stop(t + beat * 0.5);
      }
      const buf = await off.startRendering();
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c), fade = sr * 2;
        for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[d.length - 1 - i] *= i / fade; }
      }
      return buf;
    }

    async loadBuffer(i) {
      const t = this.tracks[i];
      if (t.buffer) return t.buffer;
      if (t.file) {
        try {
          const r = await fetch("tracks/" + t.file);
          if (r.ok) {
            const ab = await r.arrayBuffer();
            t.buffer = await new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
            return t.buffer;
          }
        } catch (e) { /* fall through to synth */ }
        t.artist = (t.artist || "Capi Capi") + " · synth fallback";
      }
      t.buffer = await this.synthesize(t.synth, i);
      return t.buffer;
    }

    showMeta() {
      const t = this.tracks[this.index];
      if (!t) return;
      gsap.fromTo([this.ui.title, this.ui.artist], { y: 12, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out", stagger: 0.08 });
      this.ui.title.textContent = t.title;
      this.ui.artist.textContent = t.artist || "Capi Capi";
    }

    stopSource() {
      if (this.source) {
        this.source.onended = null;
        try { this.source.stop(); } catch (e) { /* already stopped */ }
        this.source.disconnect();
        this.source = null;
      }
    }

    startSource() {
      this.stopSource();
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer;
      src.connect(this.gain);
      src.onended = () => { if (this.source === src && this.playing) this.next(); };
      src.start(0, Math.min(this.offset, this.buffer.duration - 0.01));
      this.startedAt = this.ctx.currentTime - this.offset;
      this.source = src;
    }

    current() {
      if (!this.buffer) return 0;
      return this.playing ? Math.min(this.ctx.currentTime - this.startedAt, this.buffer.duration) : this.offset;
    }

    async select(i, autoplay) {
      const token = ++this.loadToken;
      this.ensureCtx();
      this.stopSource();
      this.index = (i + this.tracks.length) % this.tracks.length;
      this.offset = 0;
      this.buffer = null;
      this.showMeta();
      this.ui.dur.textContent = "…";
      const buf = await this.loadBuffer(this.index);
      if (token !== this.loadToken) return;
      this.buffer = buf;
      this.ui.artist.textContent = this.tracks[this.index].artist || "Capi Capi";
      this.ui.dur.textContent = fmt(buf.duration);
      if (autoplay) { this.playing = true; this.startSource(); this.setIcon(); }
    }

    async toggle() {
      this.ensureCtx();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (!this.buffer) { await this.select(this.index, true); return; }
      if (this.playing) {
        this.offset = this.current();
        this.playing = false;
        this.stopSource();
      } else {
        this.playing = true;
        this.startSource();
      }
      this.setIcon();
    }

    next() { this.select(this.index + 1, true); }
    prev() {
      if (this.current() > 3 && this.buffer) { this.offset = 0; if (this.playing) this.startSource(); return; }
      this.select(this.index - 1, true);
    }

    setIcon() {
      this.ui.icon.innerHTML = this.playing ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M7 4v16l13-8z"/>';
      this.ui.play.setAttribute("aria-label", this.playing ? "Pause" : "Play");
      gsap.fromTo(this.ui.play, { scale: 0.85 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    }

    bind() {
      this.ui.play.addEventListener("click", () => this.toggle());
      this.ui.next.addEventListener("click", () => { this.ensureCtx(); this.ctx.resume(); this.next(); });
      this.ui.prev.addEventListener("click", () => { this.ensureCtx(); this.ctx.resume(); this.prev(); });
      this.ui.seek.addEventListener("input", () => {
        this.seeking = true;
        if (this.buffer) this.ui.cur.textContent = fmt((this.ui.seek.value / 1000) * this.buffer.duration);
      });
      this.ui.seek.addEventListener("change", () => {
        this.seeking = false;
        if (!this.buffer) return;
        this.offset = (this.ui.seek.value / 1000) * this.buffer.duration;
        if (this.playing) this.startSource();
      });
      this.ui.vol.addEventListener("input", () => {
        this.volume = this.ui.vol.value / 100;
        if (this.gain) this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
      });
      document.addEventListener("keydown", (e) => {
        if (e.code === "Space" && e.target === document.body) { e.preventDefault(); this.toggle(); }
      });
    }

    drawViz() {
      const c = this.ui.viz, g = c.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio, 2);
      c.width = 300 * dpr; c.height = 48 * dpr;
      const loop = () => {
        g.clearRect(0, 0, c.width, c.height);
        const bars = 48, bw = c.width / bars;
        let sum = 0;
        if (this.analyser && this.playing) this.analyser.getByteFrequencyData(this.freq);
        for (let i = 0; i < bars; i++) {
          const v = this.analyser && this.playing ? this.freq[Math.floor(i * this.freq.length / bars)] / 255 : 0.04 + 0.03 * Math.sin(performance.now() / 400 + i * 0.4);
          sum += v;
          const h = Math.max(2, v * c.height);
          const grd = g.createLinearGradient(0, c.height, 0, 0);
          grd.addColorStop(0, "#ff0055"); grd.addColorStop(1, "#00d4ff");
          g.fillStyle = grd;
          g.fillRect(i * bw + 1, (c.height - h) / 2, bw - 2, h);
        }
        audioLevel.v = this.playing ? Math.min(1, (sum / bars) * 1.6) : 0;
        if (this.buffer && !this.seeking) {
          const t = this.current();
          this.ui.seek.value = Math.round((t / this.buffer.duration) * 1000);
          this.ui.cur.textContent = fmt(t);
        }
        requestAnimationFrame(loop);
      };
      loop();
    }
  }

  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  /* ---------------- Typography FX ---------------- */
  const GLYPHS = "!<>-_\\/[]{}—=+*^?#01";
  function scramble(el) {
    if (el._scr) return;
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    const state = { p: 0 };
    el._scr = gsap.to(state, {
      p: 1, duration: 0.7, ease: "power3.out",
      onUpdate() {
        const n = Math.floor(state.p * final.length);
        el.textContent = final.slice(0, n) + [...final.slice(n)].map((c) => (c === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      },
      onComplete() { el.textContent = final; el._scr = null; }
    });
  }

  function initFX() {
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest("[data-scramble]");
      if (el) scramble(el);
    });

    const heroChars = splitChars($("#heroTitle"));
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to("#loader .loader-bar i", { width: "100%", duration: 1.4, ease: "power2.inOut" })
      .to({ v: 0 }, {
        v: 100, duration: 1.4, ease: "power2.inOut",
        onUpdate() { $(".loader-pct").textContent = String(Math.round(this.targets()[0].v)).padStart(3, "0"); }
      }, 0)
      .to("#loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "+=0.15")
      .set("#loader", { display: "none" })
      .from(".nav", { y: -40, opacity: 0, duration: 1 }, "-=0.5")
      .from(heroChars, {
        yPercent: 120, rotateX: -90, opacity: 0, filter: "blur(12px)",
        duration: 1.4, stagger: { each: 0.05, from: "center" }
      }, "-=0.7")
      .from(".eyebrow", { x: -30, opacity: 0, duration: 0.9 }, "-=1.1")
      .from("#heroTagline", { y: 30, opacity: 0, filter: "blur(8px)", duration: 1 }, "-=0.9")
      .from(".hero-meta > div", { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, "-=0.8")
      .from(".cta", { scale: 0.8, opacity: 0, duration: 1, ease: "elastic.out(1, 0.5)" }, "-=0.7")
      .from("#player", { x: 80, opacity: 0, duration: 1.1 }, "-=0.9");

    heroChars.forEach((ch) => {
      ch.addEventListener("pointerenter", () => {
        gsap.fromTo(ch, { y: 0, color: "#ff0055" }, {
          y: -18, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1,
          onComplete() { gsap.to(ch, { color: "#ffffff", duration: 0.6, ease: "sine.out" }); }
        });
      });
    });

    window.addEventListener("pointermove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      gsap.to("#heroTitle", { x: nx * 30, y: ny * 18, skewX: nx * -4, duration: 1.2, ease: "power3.out" });
    });

    document.querySelectorAll(".section-title .split").forEach((el) => {
      const chars = splitChars(el);
      gsap.from(chars, {
        yPercent: 110, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.03,
        scrollTrigger: { trigger: el, start: "top 85%" }
      });
    });
    gsap.utils.toArray(".section-title .idx").forEach((el) => {
      gsap.from(el, { x: -20, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
    });

    gsap.utils.toArray(".reveal").forEach((el) => {
      gsap.from(el, {
        y: 60, opacity: 0, filter: "blur(10px)", duration: 1.3, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%", onEnter: () => el.classList.add("on") }
      });
    });

    gsap.from(".project", {
      y: 80, opacity: 0, rotateX: 12, duration: 1.2, ease: "expo.out", stagger: 0.12,
      scrollTrigger: { trigger: "#projects", start: "top 85%" }
    });

    document.querySelectorAll(".project").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        gsap.to(card, { rotateY: (px - 0.5) * 10, rotateX: (0.5 - py) * 10, transformPerspective: 900, duration: 0.6, ease: "power3.out" });
      });
      card.addEventListener("pointerleave", () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 1, ease: "elastic.out(1, 0.5)" });
      });
    });
  }

  /* ---------------- HUD ---------------- */
  function initHUD() {
    const t0 = performance.now();
    const tick = () => {
      const d = new Date();
      $("#clock").textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
      $("#uptime").textContent = ((performance.now() - t0) / 1000).toFixed(2) + "s";
    };
    tick();
    setInterval(tick, 100);
  }

  /* ---------------- Boot ---------------- */
  async function boot() {
    initWebGL();
    initHUD();
    const profile = await loadProfile();
    renderProfile(profile);
    const player = new Player();
    await player.loadManifest();
    initFX();
    window.__player = player;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
