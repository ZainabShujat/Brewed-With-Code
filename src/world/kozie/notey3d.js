/* The page mascot in 3D: the logo's open notebook, come to life.
   Cream pages with ruled lines + a navy cover, a face inked across the two pages, the logo's gold-tipped pencil,
   its golden circuit traces as an antenna, and floating "…" dots ("thinking in progress…").
   It talks by opening and closing the book.

   import { makeMascot3D } from '../mascot/notey3d.js';
   const m = makeMascot3D(THREE, { RoundedBoxGeometry });  scene.add(m.group);
   m.update(t)        every frame: bob, blink, thought dots, talking flap
   m.pose('idle'|'wave'|'think'|'excited'|'oops')
   m.say(seconds)     the mouth moves (and the book flaps) while the voice talks
*/
export function makeMascot3D(THREE, { RoundedBoxGeometry }) {
  const C = { cream: 0xf3e3bb, creamD: 0xd9c493, line: 0xb7a777, margin: 0xd99a8a, navy: 0x3d3775, navyD: 0x2a2552, navyL: 0x5a539a, gold: 0xffc14d, ink: 0x1d1838, blush: 0xff9db5 };
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? .7, metalness: o.m ?? 0, emissive: o.e ?? 0, emissiveIntensity: o.ei ?? 1 });
  const glow = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: .4 });
  const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const group = new THREE.Group(), rig = new THREE.Group(); group.add(rig);
  // the book stands up, leaning back a little, pages facing you
  const book = new THREE.Group(); book.rotation.x = -.18; rig.add(book);
  const PW = 1.25, PH = 1.75;
  // height of the bowed top sheet at distance d from the spine (so the inked face sits right on the paper)
  const zAt = d => { const u = Math.min(1, Math.max(0, d / PW)); return .02 + .06 + Math.sin(u * Math.PI) * .07 + (1 - u) * .04; };
  const pageTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 360; const x = c.getContext('2d');
    x.fillStyle = '#f3e3bb'; x.fillRect(0, 0, 256, 360); x.fillStyle = '#b7a777'; for (let i = 0; i < 10; i++) x.fillRect(22, 58 + i * 30, 214, 3);
    x.fillStyle = '#d99a8a'; x.fillRect(46, 18, 3, 324); const g = x.createLinearGradient(0, 0, 40, 0); g.addColorStop(0, 'rgba(120,90,40,.28)'); g.addColorStop(1, 'rgba(120,90,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 40, 360);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();

  // one half of the open book, hinged at the spine (x = 0): cover slab + page stack + a bowed top sheet
  function half(side) {
    const g = new THREE.Group();
    const cover = sh(new THREE.Mesh(new RoundedBoxGeometry(PW + .1, PH + .14, .09, 3, .04), mat(C.navy, { r: .8 }))); cover.position.set(side * (PW + .1) / 2, 0, -.06); g.add(cover);
    const edge = new THREE.Mesh(new RoundedBoxGeometry(PW + .12, PH + .16, .03, 2, .015), mat(C.navyL, { r: .8 })); edge.position.set(side * (PW + .1) / 2, 0, -.11); g.add(edge);
    for (let i = 0; i < 3; i++) { const st = sh(new THREE.Mesh(new THREE.BoxGeometry(PW - .04 * i, PH - .04, .05), mat(i ? C.creamD : C.cream, { r: .95 }))); st.position.set(side * (PW / 2 - .02 * i), 0, -i * .02); g.add(st); }
    const geo = new THREE.PlaneGeometry(PW, PH, 24, 2), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + PW / 2) / PW; pos.setZ(i, .06 + Math.sin(u * Math.PI) * .07 + (1 - u) * .04); }
    geo.computeVertexNormals(); const top = sh(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: pageTex, roughness: .9 }))); top.position.set(side * PW / 2, 0, .02); top.scale.x = side; g.add(top);
    if (side < 0) top.material.side = THREE.DoubleSide; // mirrored geometry flips its faces
    [PH / 2 - .02, -PH / 2 + .02].forEach(y => { const k = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, .12), mat(C.gold, { m: .4, r: .35 })); k.position.set(side * (PW + .02), y, -.03); g.add(k); });
    return g;
  }
  const L = half(-1), R = half(1); book.add(L, R);
  const spine = sh(new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, PH + .14, 12), mat(C.navyD, { r: .7 }))); spine.position.z = -.07; book.add(spine);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.08, .5, .015), mat(0xe0605a, { r: .5 })); ribbon.geometry.translate(0, -.25, 0); ribbon.position.set(.03, -PH / 2 - .02, .05); book.add(ribbon);

  // the face, inked onto the pages so it moves with them
  const inkM = mat(C.ink, { r: .9 }), hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sides = [[-1, L], [1, R]];
  const eyes = sides.map(([s, g]) => { const e = new THREE.Group(); e.position.set(s * .42, .18, zAt(.42) + .012); g.add(e);
    const b = new THREE.Mesh(new THREE.CircleGeometry(.13, 20), inkM); b.scale.y = 1.25; e.add(b);
    const h = new THREE.Mesh(new THREE.CircleGeometry(.04, 12), hiM); h.position.set(.04, .06, .005); e.add(h); return e; });
  const happy = sides.map(([s, g]) => { const t = new THREE.Mesh(new THREE.TorusGeometry(.11, .028, 6, 14, Math.PI), inkM); t.position.set(s * .42, .14, zAt(.42) + .012); t.visible = false; g.add(t); return t; });
  const brows = sides.map(([s, g]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .035, .01), inkM); b.position.set(s * .42, .44, zAt(.42) + .012); g.add(b); return b; });
  sides.forEach(([s, g]) => { const b = new THREE.Mesh(new THREE.CircleGeometry(.1, 14), new THREE.MeshBasicMaterial({ color: C.blush, transparent: true, opacity: .55 })); b.scale.y = .55; b.position.set(s * .7, -.08, zAt(.7) + .01); g.add(b); });
  // the smile: one quarter-arc on each page, meeting at the spine
  sides.forEach(([s, g]) => { const t = new THREE.Mesh(new THREE.TorusGeometry(.16, .028, 6, 12, Math.PI / 2), inkM); t.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI; t.position.set(0, -.06, zAt(.08) + .014); g.add(t); });

  // the mouth: a dark half-ellipse on each page (meeting at the spine) with a pink tongue; it opens while the voice talks
  const mouths = sides.map(([s, g]) => { const m = new THREE.Group(); m.position.set(0, -.16, zAt(.1) + .016); g.add(m);
    const th = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.32, 22, th, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a0f22 })); m.add(hole);
    const tongue = new THREE.Mesh(new THREE.CircleGeometry(.17, 16, th, Math.PI), new THREE.MeshBasicMaterial({ color: 0xff6f8f })); tongue.position.set(0, -.15, .002); m.add(tongue);
    m.scale.y = .05; m.visible = false; return m; }); // the user asked to remove it (1 Nov): she talks with the book flap, the smile stays
  // arms + legs, navy, from the cover
  const limb = (r, h) => sh(new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 4, 10), mat(C.navyD)));
  const arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * (PW + .12), -.1, .12); book.add(p); const a = limb(.08, .45); a.rotation.z = Math.PI / 2; a.position.x = s * .28; p.add(a);
    const hand = sh(new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 10), mat(C.cream))); hand.position.x = s * .6; p.add(hand); p.userData.hand = hand; return p; });
  const legs = [-.38, .38].map(x => { const g = new THREE.Group(); g.position.set(x, -PH / 2 - .02, -.05); book.add(g); const l = limb(.09, .25); l.position.y = -.2; g.add(l);
    const f = sh(new THREE.Mesh(new RoundedBoxGeometry(.3, .14, .4, 3, .06), mat(C.navyD))); f.position.set(0, -.42, .1); g.add(f); return g; });

  // the logo's pencil: navy, gold band, gold tip
  const pencil = new THREE.Group(); arms[1].userData.hand.add(pencil); pencil.rotation.z = .3;
  const shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .8, 6), mat(C.navy, { r: .5 }))); shaft.position.y = .15; pencil.add(shaft);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .08, 12), mat(C.gold, { m: .6, r: .3 })); band.position.y = .56; pencil.add(band);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .08, 12), mat(C.gold, { r: .5 })); cap.position.y = .64; pencil.add(cap);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(.055, .18, 6), mat(C.gold)); wood.position.y = -.34; wood.rotation.x = Math.PI; pencil.add(wood);

  // the logo's golden circuit traces, sprouting from the top-left corner like an antenna
  const nodes = [];
  const trace = pts => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0); L.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, .022, 6), mat(C.gold, { m: .5, r: .3 })));
    const n = new THREE.Mesh(new THREE.SphereGeometry(.065, 14, 10), glow(C.gold)); n.position.copy(c.getPoint(1)); L.add(n); nodes.push(n); };
  trace([[-.95, PH / 2 + .05, -.04], [-.95, PH / 2 + .3, -.04], [-1.2, PH / 2 + .42, -.04]]);
  trace([[-.7, PH / 2 + .05, -.04], [-.7, PH / 2 + .48, -.04], [-.55, PH / 2 + .6, -.04]]);

  // "thinking in progress…": three gold dots above the head
  const dots = [0, 1, 2].map(i => { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), glow(C.gold)); d.position.set(.2 + i * .22, PH / 2 + .5, 0); rig.add(d); return d; });

  /* ---------- behaviour ---------- */
  const st = { pose: 'idle', t: 0, sayUntil: 0, flapUntil: 0, open: .32 };
  // arms: right raises with +z, left with -z; open = how far the book is folded toward you
  const POSES = { idle: { l: .9, r: -.9, open: .32, tilt: 0, dots: 1 }, wave: { l: .9, r: 1.3, open: .25, tilt: .08, dots: 0 },
    think: { l: .9, r: .2, open: .45, tilt: .14, dots: 1 }, excited: { l: -1.2, r: 1.2, open: .12, tilt: 0, dots: 0 }, oops: { l: -.4, r: .4, open: .6, tilt: -.1, dots: 0 } };
  function pose(n) { st.pose = n; const p = POSES[n] || POSES.idle; Object.assign(st, { tl: p.l, tr: p.r, topen: p.open, tilt: p.tilt, dotsOn: p.dots });
    const hp = n === 'excited' || n === 'wave'; eyes.forEach(e => e.visible = !hp); happy.forEach(h => h.visible = hp);
    brows.forEach((b, i) => b.rotation.z = (i ? 1 : -1) * (n === 'oops' ? -.35 : n === 'think' ? .3 : .12)); return api; }
  function say(sec) { st.sayUntil = st.t + sec; return api; }
  // flying: the pages beat like wings
  function flap(sec) { st.flapUntil = st.t + sec; return api; }
  function update(t) {
    const dt = Math.min(.1, Math.max(0, t - st.t)); st.t = t; const k = 1 - Math.pow(.0005, dt);
    rig.position.y = Math.sin(t * 2.1) * .05; rig.rotation.z += ((st.tilt || 0) + Math.sin(t * 1.2) * .03 - rig.rotation.z) * k;
    // talking: the book flaps open and shut like a mouth
    const talking = t < st.sayUntil, flying = t < st.flapUntil;
    const target = flying ? .25 + (Math.sin(t * 16) + 1) * .45 : (st.topen ?? .32) + (talking ? Math.abs(Math.sin(t * 11)) * .5 : 0);
    st.open += (target - st.open) * (talking || flying ? 1 : k);
    L.rotation.y = st.open; R.rotation.y = -st.open;
    // lip-sync-ish: syllable-rate wobble while talking, shut otherwise
    const mo = talking ? .3 + .8 * Math.abs(Math.sin(t * 13) * Math.sin(t * 5.3 + 1)) : .05; mouths.forEach(m => m.scale.y += (mo - m.scale.y) * (talking ? .6 : k));
    arms[0].rotation.z += ((st.tl ?? .9) + Math.sin(t * 2.1) * .05 - arms[0].rotation.z) * k;
    arms[1].rotation.z += ((st.tr ?? -.9) + (st.pose === 'wave' ? Math.sin(t * 12) * .35 : 0) + Math.sin(t * 2.1 + 1) * .05 - arms[1].rotation.z) * k;
    const blink = (t % 3.3) < .12; eyes.forEach(e => e.scale.y = blink ? .1 : 1);
    nodes.forEach((n, i) => n.scale.setScalar(1 + Math.sin(t * 4 + i * 1.4) * .2));
    dots.forEach((d, i) => { const ph = (t * 1.6 - i * .25) % 1.5, b = Math.max(0, Math.sin(ph * Math.PI)); d.visible = !!st.dotsOn; d.position.y = PH / 2 + .5 + b * .12; d.scale.setScalar(.7 + b * .5); });
    ribbon.rotation.z = Math.sin(t * 1.8) * .18;
  }
  const api = { group, update, pose, say, flap, book, arms, pencil, pages: sides.map(x => x[1]), eyeZ: zAt(.42), legs };
  pose('idle');
  return api;
}
