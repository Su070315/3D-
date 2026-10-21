/* ===========================================================
   海风小岛 · 写实电影感模板  (sea_island_app.js)
   text-to-3d-html skill v1.2.0
   核心：自定义天空 shader + 平面反射水面 + 双 pass bloom/ACES 后处理
   =========================================================== */
(function () {
  'use strict';

  var W = window.innerWidth, H = window.innerHeight;
  var PR = Math.min(window.devicePixelRatio || 1, 1.5);

  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(PR);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.LinearEncoding;   // 色调映射在后处理里做
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.localClippingEnabled = true;
  renderer.physicallyCorrectLights = false;
  document.getElementById('app').appendChild(renderer.domElement);
  if (document.getElementById('bar')) document.getElementById('bar').style.display = 'none';
  if (document.getElementById('editbar')) document.getElementById('editbar').style.display = 'none';

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a2438, 480, 4300);

  var camera = new THREE.PerspectiveCamera(42, W / H, 0.5, 5000);
  camera.position.set(14, 14, 122);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 26;
  controls.maxDistance = 460;
  controls.maxPolarAngle = Math.PI * 0.497;
  controls.autoRotateSpeed = 0.25;

  /* ---------------- 随机 / 噪声 ---------------- */
  // sRGB 十六进制 → 线性空间颜色（后处理里再做 ACES + gamma）
  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  function hash2(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }
  function fbm(x, y) { var v = 0, a = 0.5; for (var i = 0; i < 4; i++) { v += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return v; }
  var seed = 20261021;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function rr(a, b) { return a + (b - a) * rnd(); }

  /* ---------------- 程序化贴图 ---------------- */
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  // 沙地：细颗粒 + 波纹
  var sandTex = canvasTex(512, 512, function (g, w, h) {
    g.fillStyle = '#cfbb95'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 26000; i++) {
      var x = Math.random() * w, y = Math.random() * h, r = Math.random() * 1.6 + 0.3;
      var v = Math.random();
      g.fillStyle = v > 0.5 ? 'rgba(255,246,224,' + (0.10 + v * 0.16) + ')' : 'rgba(120,102,76,' + (0.06 + (1 - v) * 0.12) + ')';
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    for (var k = 0; k < 90; k++) {
      g.strokeStyle = 'rgba(150,132,102,' + (0.05 + Math.random() * 0.08) + ')';
      g.lineWidth = 0.8 + Math.random() * 2;
      g.beginPath();
      var yy = Math.random() * h;
      g.moveTo(0, yy);
      for (var x2 = 0; x2 < w; x2 += 24) g.lineTo(x2, yy + Math.sin(x2 * 0.02 + k) * 5);
      g.stroke();
    }
  });
  sandTex.encoding = THREE.sRGBEncoding;
  sandTex.repeat.set(26, 26);

  // 木纹
  var woodTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#8b6a44'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 60; i++) {
      g.strokeStyle = 'rgba(60,40,22,' + (0.06 + Math.random() * 0.2) + ')';
      g.lineWidth = Math.random() * 2.4 + 0.4;
      g.beginPath();
      var x = Math.random() * w;
      g.moveTo(x, 0);
      for (var y = 0; y < h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 3, y);
      g.stroke();
    }
    for (var j = 0; j < 8; j++) {
      g.fillStyle = 'rgba(40,26,14,0.18)';
      g.fillRect(0, j * 32 + 14, w, 2);
    }
  });
  woodTex.encoding = THREE.sRGBEncoding;

  // 棕榈树干环纹
  var barkTex = canvasTex(128, 256, function (g, w, h) {
    g.fillStyle = '#6d5334'; g.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 9) {
      g.fillStyle = 'rgba(30,20,10,' + (0.12 + Math.random() * 0.28) + ')';
      g.fillRect(0, y + Math.random() * 3, w, 3 + Math.random() * 3);
      g.fillStyle = 'rgba(210,180,130,' + (0.05 + Math.random() * 0.1) + ')';
      g.fillRect(0, y + 6, w, 1.5);
    }
  });
  barkTex.encoding = THREE.sRGBEncoding;
  barkTex.repeat.set(2, 1);

  // 棕榈叶：中肋 + 两侧羽状小叶（alpha）
  var frondTex = canvasTex(512, 256, function (g, w, h) {
    g.clearRect(0, 0, w, h);
    var cy = h / 2;
    // 小叶：纯白不透明，边缘锐利（alphaTest 才能裁出羽状轮廓）
    g.fillStyle = '#ffffff';
    for (var i = 0; i < 54; i++) {
      var t = i / 54;
      var x = 10 + t * (w - 26);
      var len = (h * 0.47) * Math.sin(Math.pow(t, 0.5) * Math.PI) * (1 - 0.18 * t) + 4;
      for (var s = -1; s <= 1; s += 2) {
        var spread = 0.42 + 0.18 * t;
        g.beginPath();
        g.moveTo(x - 3, cy);
        g.lineTo(x + 6 + len * spread, cy + s * len);
        g.lineTo(x + 13 + len * spread * 0.9, cy + s * len * 0.96);
        g.lineTo(x + 4, cy);
        g.closePath(); g.fill();
      }
    }
    // 中肋
    g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, cy);
    g.quadraticCurveTo(w * 0.55, cy - 4, w, cy + 3);
    g.stroke();
  });
  frondTex.wrapS = frondTex.wrapT = THREE.ClampToEdgeWrapping;

  // 草叶
  var grassTex = canvasTex(128, 128, function (g, w, h) {
    g.clearRect(0, 0, w, h);
    for (var i = 0; i < 10; i++) {
      var x = 8 + Math.random() * (w - 16);
      var hh = h * (0.45 + Math.random() * 0.55);
      var grad = g.createLinearGradient(0, h, 0, h - hh);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      g.strokeStyle = grad;
      g.lineWidth = 3 + Math.random() * 5;
      g.beginPath(); g.moveTo(x, h);
      g.quadraticCurveTo(x + (Math.random() - 0.5) * 22, h - hh * 0.6, x + (Math.random() - 0.5) * 40, h - hh);
      g.stroke();
    }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.ClampToEdgeWrapping;

  // 光斑 / 柔和圆点（粒子用）
  var glowTex = canvasTex(64, 64, function (g, w, h) {
    var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,236,200,0.55)');
    gr.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  /* ---------------- 时间调色板 ---------------- */
  var PAL = [
    { h: 0.0, top: '#01030a', mid: '#060c1a', hor: '#101a30', sun: '#b9cdf0', deep: '#01060c', shallow: '#08222c', fog: '#080f1c', si: 0.28, amb: 0.17, night: 1.0, exp: 1.05, bloom: 0.7, sat: 1.05 },
    { h: 4.6, top: '#0a1020', mid: '#2a2036', hor: '#7a4a52', sun: '#b98a86', deep: '#0c1420', shallow: '#24414a', fog: '#1a1a28', si: 0.5, amb: 0.34, night: 0.85, exp: 1.2, bloom: 0.6, sat: 1.05 },
    { h: 5.8, top: '#243a63', mid: '#7a5d78', hor: '#e0886e', sun: '#ffb27a', deep: '#12222e', shallow: '#2f6270', fog: '#4a3a4e', si: 1.5, amb: 0.42, night: 0.25, exp: 1.12, bloom: 0.85, sat: 1.08 },
    { h: 7.5, top: '#3f74ad', mid: '#9fc0d8', hor: '#f2d0b0', sun: '#ffe6c4', deep: '#0d3f52', shallow: '#3fa5b5', fog: '#b8c7d2', si: 2.6, amb: 0.55, night: 0.0, exp: 1.0, bloom: 0.5, sat: 1.02 },
    { h: 12.0, top: '#2762a6', mid: '#84b8dc', hor: '#d8e8f0', sun: '#fff6e6', deep: '#0a4f60', shallow: '#54c6d2', fog: '#a9c4d2', si: 3.1, amb: 0.48, night: 0.0, exp: 0.88, bloom: 0.40, sat: 1.02 },
    { h: 16.0, top: '#33639c', mid: '#9fb4c2', hor: '#f2d3a8', sun: '#ffdca6', deep: '#0b4353', shallow: '#46b0bf', fog: '#bcccd2', si: 2.9, amb: 0.55, night: 0.0, exp: 1.0, bloom: 0.5, sat: 1.04 },
    { h: 18.1, top: '#2b3568', mid: '#6d4470', hor: '#ff9a63', sun: '#ff9245', deep: '#151a2e', shallow: '#35525f', fog: '#6a4a58', si: 2.3, amb: 0.46, night: 0.04, exp: 1.02, bloom: 1.05, sat: 1.16 },
    { h: 19.1, top: '#191f47', mid: '#573060', hor: '#ff6a3c', sun: '#ff5a25', deep: '#0d1124', shallow: '#24384c', fog: '#402a3c', si: 1.0, amb: 0.38, night: 0.22, exp: 1.10, bloom: 1.15, sat: 1.16 },
    { h: 20.4, top: '#101a34', mid: '#3e2d4c', hor: '#a5505a', sun: '#c06a5a', deep: '#0a1220', shallow: '#1c3a46', fog: '#241c2e', si: 0.42, amb: 0.32, night: 0.8, exp: 1.2, bloom: 0.7, sat: 1.05 },
    { h: 22.0, top: '#01030a', mid: '#060c1a', hor: '#101a30', sun: '#b9cdf0', deep: '#01060c', shallow: '#08222c', fog: '#080f1c', si: 0.28, amb: 0.17, night: 1.0, exp: 1.05, bloom: 0.7, sat: 1.05 },
    { h: 24.0, top: '#01030a', mid: '#060c1a', hor: '#101a30', sun: '#b9cdf0', deep: '#01060c', shallow: '#08222c', fog: '#080f1c', si: 0.28, amb: 0.17, night: 1.0, exp: 1.05, bloom: 0.7, sat: 1.05 }
  ];
  function palAt(h) {
    h = ((h % 24) + 24) % 24;
    var a = PAL[0], b = PAL[PAL.length - 1];
    for (var i = 0; i < PAL.length - 1; i++) { if (h >= PAL[i].h && h <= PAL[i + 1].h) { a = PAL[i]; b = PAL[i + 1]; break; } }
    var t = (h - a.h) / Math.max(0.0001, b.h - a.h);
    t = t * t * (3 - 2 * t);
    var o = {};
    ['top', 'mid', 'hor', 'sun', 'deep', 'shallow', 'fog'].forEach(function (k) {
      o[k] = C(a[k]).lerp(C(b[k]), t);
    });
    ['si', 'amb', 'night', 'exp', 'bloom', 'sat'].forEach(function (k) { o[k] = a[k] + (b[k] - a[k]) * t; });
    return o;
  }

  // 太阳/月亮方向（方位角自 -Z 起算，向 +X 为正）
  function sunDirAt(h) {
    var el, az;
    if (h >= 6 && h <= 18.6) {
      var a = (h - 6) / 12.6 * Math.PI;
      el = Math.sin(a) * 0.95;                  // 最高约 54°
      az = (-40 + (h - 6) / 12.6 * 70) * Math.PI / 180;   // 日落停在画面右侧约 28°
    } else {
      var hn = h < 6 ? h + 24 : h;
      var b = (hn - 18.6) / 11.4 * Math.PI;
      el = Math.sin(b) * 0.20;
      az = (30 - (hn - 18.6) / 11.4 * 46) * Math.PI / 180;
    }
    var ce = Math.sqrt(Math.max(0, 1 - el * el));
    return new THREE.Vector3(Math.sin(az) * ce, el, -Math.cos(az) * ce).normalize();
  }

  /* ---------------- 天空 ---------------- */
  var SKYU = {
    uTop: { value: C('#2a2a52') },
    uMid: { value: C('#8c4c6e') },
    uHor: { value: C('#ff7a4a') },
    uSunCol: { value: C('#ff6a34') },
    uSunDir: { value: new THREE.Vector3(0.6, 0.1, -0.8) },
    uNight: { value: 0.25 },
    uCloud: { value: 0.55 },
    uTime: { value: 0 },
    uHaze: { value: 1.0 },
    uGlowK: { value: 1.0 }
  };

  var skyMat = new THREE.ShaderMaterial({
    uniforms: SKYU,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: [
      'varying vec3 vWorld;',
      'void main(){',
      '  vec4 wp = modelMatrix * vec4(position,1.0);',
      '  vWorld = wp.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uTop,uMid,uHor,uSunCol,uSunDir;',
      'uniform float uNight,uCloud,uTime,uHaze,uGlowK;',
      'varying vec3 vWorld;',
      'float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);',
      '  float a=h21(i),b=h21(i+vec2(1.0,0.0)),c=h21(i+vec2(0.0,1.0)),d=h21(i+vec2(1.0,1.0));',
      '  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
      'float fbm2(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n2(p); p*=2.04; a*=0.5; } return v; }',
      'void main(){',
      '  vec3 d = normalize(vWorld - cameraPosition);',
      '  float y = clamp(d.y,0.0,1.0);',
      '  float t = pow(y,0.42);',
      '  vec3 col = mix(uHor,uMid,smoothstep(0.0,0.30,t));',
      '  col = mix(col,uTop,smoothstep(0.22,1.0,t));',
      '  vec3 sd = normalize(uSunDir);',
      '  float sdot = max(dot(d,sd),0.0);',
      // 大气散射光晕
      '  col += uSunCol*pow(sdot,6.0)*0.30*max(sd.y+0.35,0.0)*uGlowK;',
      '  col += uSunCol*pow(sdot,70.0)*0.75*uGlowK;',
      // 地平线附近的强散射（逆光黄昏的关键）
      '  col += uSunCol*pow(sdot,2.2)*exp(-y*11.0)*0.85*uGlowK;',
      // 日/月盘
      '  col += uSunCol*pow(sdot,9000.0)*14.0*(0.35+0.65*uGlowK);',
      // 地平线雾带
      '  col = mix(col,uHor,pow(1.0-y,18.0)*0.75*uHaze);',
      // 星空
      '  if(uNight>0.02 && d.y>0.02){',
      '    vec2 sp = d.xz/(d.y+0.22)*26.0;',
      '    float s = h21(floor(sp));',
      '    float tw = 0.55+0.45*sin(uTime*1.7+s*90.0);',
      '    float star = smoothstep(0.9972,0.9999,s)*tw;',
      '    vec3 sc = mix(vec3(0.75,0.82,1.0), vec3(1.0,0.92,0.8), h21(floor(sp)+3.3));',
      '    col += sc*star*uNight*2.2*smoothstep(0.0,0.30,d.y);',
      '  }',
      // 层云
      '  if(d.y>0.004){',
      '    vec2 cp = d.xz/(d.y+0.055);',
      '    vec2 q = cp*0.55 + vec2(uTime*0.006, uTime*0.0015);',
      '    float c1 = fbm2(q*0.85);',
      '    float c2 = fbm2(q*2.1+vec2(11.0,5.0));',
      '    float band = exp(-pow((d.y-0.055)*7.0,2.0));',
      '    float streak = fbm2(vec2(atan(d.z,d.x)*2.6 + uTime*0.012, d.y*42.0));',
      '    float dens = c1*0.80 + c2*0.45 + band*streak*1.35;',
      '    float c = smoothstep(0.50, 1.02, dens);',
      // 越靠近地平线越成带状
      '    c *= smoothstep(0.0,0.10,d.y)*(1.0-smoothstep(0.40,1.0,d.y)*0.45);',
      '    c *= uCloud;',
      '    vec3 lit = mix(uMid*1.20+vec3(0.03), uSunCol*1.35*uGlowK, 0.60*pow(sdot,3.0)+0.16);',
      '    vec3 shade = mix(uTop*0.55, uMid*0.42, 0.45);',
      '    col = mix(col, mix(shade,lit,smoothstep(0.35,0.95,c)), clamp(c,0.0,0.92));',
      '  }',
      '  gl_FragColor = vec4(max(col,vec3(0.0)),1.0);',
      '}'
    ].join('\n')
  });
  var sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 32), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  /* ---------------- 地形 ---------------- */
  function heightAt(x, z) {
    var r = Math.sqrt(x * x + z * z);
    var ang = Math.atan2(z, x);
    var rr2 = r * (1.0 + 0.10 * Math.sin(ang * 3.0 + 1.1) + 0.05 * Math.sin(ang * 6.0 + 2.2));
    var mound = 9.4 * Math.exp(-Math.pow(rr2 / 54.0, 2.55));
    var shelf = -15.0 / (1.0 + Math.exp(-(r - 62.0) / 12.0));   // 出海后快速下沉
    var h = mound + shelf - 0.8;
    h += (fbm(x * 0.055 + 13.0, z * 0.055 + 7.0) - 0.5) * 2.6 * Math.max(0, 1 - rr2 / 48);
    // 背风侧沙丘脊（打破圆盘感）
    var dune = Math.exp(-Math.pow((r - 40.0) / 11.0, 2.0)) * Math.max(0, Math.cos(ang - 2.35));
    h += dune * 2.4;
    // 一侧礁石岬
    h += Math.exp(-Math.pow((r - 52.0) / 9.0, 2.0)) * Math.max(0, Math.cos(ang + 0.6)) * 2.0;
    h += (fbm(x * 0.19 + 3.0, z * 0.19 + 9.0) - 0.5) * 0.55 * Math.max(0, 1 - rr2 / 46);
    return h;
  }

  // 海底/地形高度图：水面据此算真实水深、浅滩色与岸线白沫
  var HM_SIZE = 384, HM_SPAN = 340;   // 米
  var hmData = new Uint8Array(HM_SIZE * HM_SIZE * 4);
  for (var hz = 0; hz < HM_SIZE; hz++) {
    for (var hx = 0; hx < HM_SIZE; hx++) {
      var wx = (hx / (HM_SIZE - 1) - 0.5) * HM_SPAN;
      var wz = (hz / (HM_SIZE - 1) - 0.5) * HM_SPAN;
      var hv = heightAt(wx, wz);
      var i4 = (hz * HM_SIZE + hx) * 4;
      var enc = Math.max(0, Math.min(255, Math.round((hv + 24) / 40 * 255)));
      hmData[i4] = enc; hmData[i4 + 1] = enc; hmData[i4 + 2] = enc; hmData[i4 + 3] = 255;
    }
  }
  var heightTex = new THREE.DataTexture(hmData, HM_SIZE, HM_SIZE, THREE.RGBAFormat);
  heightTex.needsUpdate = true;
  heightTex.minFilter = THREE.LinearFilter;
  heightTex.magFilter = THREE.LinearFilter;
  heightTex.wrapS = heightTex.wrapT = THREE.ClampToEdgeWrapping;

  var TER_SEG = 220, TER_SIZE = 700;
  var terGeo = new THREE.PlaneGeometry(TER_SIZE, TER_SIZE, TER_SEG, TER_SEG);
  terGeo.rotateX(-Math.PI / 2);
  var pos = terGeo.attributes.position;
  var colors = new Float32Array(pos.count * 3);
  var cSandDry = C('#e0c9a0'), cSandWet = C('#9c8a6d');
  var cGrass = C('#5f7038'), cGrass2 = C('#7d8c46'), cDry = C('#9c975a'), cSoil = C('#6b5334');
  var cRock = C('#6a655c'), cUnder = C('#a89674');
  var tmpC = new THREE.Color();
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), z = pos.getZ(i);
    var y = heightAt(x, z);
    pos.setY(i, y);
    var n = fbm(x * 0.08, z * 0.08);
    if (y < -0.4) tmpC.copy(cUnder).lerp(cSandWet, 0.35);
    else if (y < 2.0) tmpC.copy(cSandWet).lerp(cSandDry, THREE.MathUtils.smoothstep(y, -0.4, 4.2));
    else if (y < 3.2) tmpC.copy(cSandDry).lerp(cGrass, THREE.MathUtils.smoothstep(y, 2.6, 4.4));
    else tmpC.copy(cGrass).lerp(cGrass2, n);
    tmpC.lerp(cRock, THREE.MathUtils.smoothstep(n, 0.72, 0.95) * 0.5 * (y > 2 ? 1 : 0));
    if (y > 2.2) {
      var dry = fbm(x * 0.034 + 21.0, z * 0.034 + 5.0);
      tmpC.lerp(cDry, THREE.MathUtils.smoothstep(dry, 0.50, 0.80) * 0.55);
    }
    colors[i * 3] = tmpC.r; colors[i * 3 + 1] = tmpC.g; colors[i * 3 + 2] = tmpC.b;
  }
  terGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terGeo.computeVertexNormals();
  var terMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: sandTex, roughness: 0.96, metalness: 0.0 });
  var terrain = new THREE.Mesh(terGeo, terMat);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);

  /* ---------------- 水面 ---------------- */
  var reflRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  var reflCam = new THREE.PerspectiveCamera();
  var texMat = new THREE.Matrix4();

  var WATERU = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.6, 0.1, -0.8) },
    uSunCol: { value: C('#ff9d5c') },
    uSkyTop: { value: C('#2a2a52') },
    uSkyMid: { value: C('#8c4c6e') },
    uSkyHor: { value: C('#ff7a4a') },
    uDeep: { value: C('#121528') },
    uShallow: { value: C('#2b4356') },
    uFog: { value: C('#4a3444') },
    uFogDen: { value: 0.00055 },
    uRefl: { value: reflRT.texture },
    uTexMat: { value: texMat },
    uNight: { value: 0.3 },
    uReflOn: { value: 1.0 },
    uHeight: { value: heightTex },
    uSpan: { value: HM_SPAN }
  };

  var waterMat = new THREE.ShaderMaterial({
    uniforms: WATERU,
    transparent: true,
    side: THREE.FrontSide,
    vertexShader: [
      'uniform float uTime;',
      'varying vec3 vWorld; varying vec3 vN;',
      'vec3 waveDisp(vec2 p, float t){',
      '  float h = 0.0; vec2 g = vec2(0.0);',
      '  h += 0.42*sin(dot(p,vec2(0.031,0.019))*2.0 + t*0.9);',
      '  h += 0.26*sin(dot(p,vec2(-0.026,0.041))*2.0 + t*1.25);',
      '  h += 0.14*sin(dot(p,vec2(0.075,-0.061))*2.0 + t*1.9);',
      '  h += 0.07*sin(dot(p,vec2(-0.13,-0.09))*2.0 + t*2.6);',
      '  return vec3(h);',
      '}',
      'void main(){',
      '  vec4 wp = modelMatrix*vec4(position,1.0);',
      '  float d = length(wp.xz);',
      '  float att = 1.0 - smoothstep(120.0, 620.0, d);',
      '  float h = waveDisp(wp.xz, uTime).x*att;',
      '  wp.y += h;',
      '  vWorld = wp.xyz; vN = vec3(0.0,1.0,0.0);',
      '  gl_Position = projectionMatrix*viewMatrix*wp;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime,uNight,uFogDen,uReflOn,uSpan;',
      'uniform vec3 uSunDir,uSunCol,uSkyTop,uSkyMid,uSkyHor,uDeep,uShallow,uFog;',
      'uniform sampler2D uRefl;',
      'uniform sampler2D uHeight;',
      'uniform mat4 uTexMat;',
      'varying vec3 vWorld; varying vec3 vN;',
      'float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);',
      '  float a=h21(i),b=h21(i+vec2(1.0,0.0)),c=h21(i+vec2(0.0,1.0)),d=h21(i+vec2(1.0,1.0));',
      '  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
      'vec3 skyCol(vec3 d){',
      '  float y = clamp(d.y,0.0,1.0);',
      '  float t = pow(y,0.42);',
      '  vec3 c = mix(uSkyHor,uSkyMid,smoothstep(0.0,0.30,t));',
      '  c = mix(c,uSkyTop,smoothstep(0.22,1.0,t));',
      '  return c;',
      '}',
      'float depthAt(vec2 p){',
      '  vec2 uv = p/uSpan + 0.5;',
      '  if(uv.x<0.002||uv.x>0.998||uv.y<0.002||uv.y>0.998) return 40.0;',
      '  float h = texture2D(uHeight, uv).r*40.0 - 24.0;',
      '  return -h;',
      '}',
      'float wav(vec2 p, float t){',
      '  float h = 0.0;',
      '  h += sin(dot(p, vec2(0.075,0.028)) + t*1.05)*0.50;',
      '  h += sin(dot(p, vec2(-0.048,0.104)) + t*0.85)*0.34;',
      '  h += sin(dot(p, vec2(0.185,-0.152)) + t*1.65)*0.17;',
      '  h += sin(dot(p, vec2(-0.290,-0.245)) + t*2.20)*0.085;',
      '  h += sin(dot(p, vec2(0.520,0.610)) + t*3.05)*0.042;',
      '  h += sin(dot(p, vec2(-0.760,0.430)) + t*3.80)*0.022;',
      '  return h;',
      '}',
      'void main(){',
      '  vec3 V = normalize(cameraPosition - vWorld);',
      '  vec2 p = vWorld.xz;',
      '  float distC = length(cameraPosition - vWorld);',
      // 远处水面趋于镜面（避免摩尔纹）
      '  float slopeK = 1.0/(1.0 + distC*0.012);',
      '  float eps = 0.35 + distC*0.02;',
      '  float h0 = wav(p, uTime);',
      '  float hx = wav(p+vec2(eps,0.0), uTime);',
      '  float hz = wav(p+vec2(0.0,eps), uTime);',
      '  vec3 N = normalize(vec3(-(hx-h0)/eps*0.55*slopeK, 1.0, -(hz-h0)/eps*0.55*slopeK));',
      '  float w1 = n2(p*1.9 + vec2(uTime*0.30, uTime*0.14));',
      '  float w2 = n2(p*4.7 - vec2(uTime*0.44, uTime*0.36));',
      '  N = normalize(N + vec3((w1-0.5)*0.06*slopeK, 0.0, (w2-0.5)*0.06*slopeK));',
      '  float fres = pow(1.0 - max(dot(N,V),0.0), 5.0);',
      '  fres = mix(0.02, 1.0, fres);',
      // 平面反射
      '  vec3 refl;',
      '  if(uReflOn > 0.5){',
      '    vec4 tp = uTexMat * vec4(vWorld,1.0);',
      '    vec2 ruv = tp.xy/tp.w;',
      '    ruv += N.xz*0.018 + vec2(w1-0.5,w2-0.5)*0.005;',
      '    ruv = clamp(ruv, vec2(0.002), vec2(0.998));',
      '    refl = texture2D(uRefl, ruv).rgb;',
      '  } else {',
      '    refl = skyCol(reflect(-V,N));',
      '  }',
      // 水体本色（近岸浅色 + 远处深色）
      '  float depth = max(depthAt(p), 0.0);',
      '  float shallow = exp(-depth*0.16);',
      '  vec3 base = mix(uDeep, uShallow, clamp(shallow,0.0,1.0));',
      '  vec3 col = mix(base, refl, clamp(fres*1.15, 0.0, 0.92));',
      // 太阳/月亮高光 + 走向观者的光带
      '  vec3 L = normalize(uSunDir);',
      '  vec3 H = normalize(L+V);',
      '  float spec = pow(max(dot(N,H),0.0), 420.0);',
      '  float glitter = pow(max(dot(N,H),0.0), 26.0)*0.35;',
      '  float path = pow(max(dot(N,H),0.0), 5.0);',
      // 光带：法线朝向太阳的方向上叠加
      '  vec2 toSun = normalize(-L.xz + 1e-4);',
      '  float along = max(dot(normalize(-V.xz+1e-4), toSun), 0.0);',
      '  float sparkle = smoothstep(0.86,1.0, n2(p*26.0 + vec2(uTime*3.0,-uTime*2.0)));',
      '  sparkle *= 1.0 - smoothstep(25.0, 130.0, distC);',
      '  col += uSunCol*(spec*2.6 + glitter + path*0.10*along);',
      '  col += uSunCol*sparkle*0.55*glitter*3.0;',
      // 岸线白沫
      '  float surf = 1.0 - smoothstep(0.0, 1.1, depth);',
      '  float band = sin(depth*9.0 - uTime*1.2)*0.5+0.5;',
      '  float broken = n2(p*0.55 + vec2(uTime*0.10, -uTime*0.06));',
      '  float foam = smoothstep(0.30, 0.95, surf*(0.55+0.45*band)*broken*1.7);',
      '  foam = clamp(foam,0.0,1.0);',
      '  col = mix(col, vec3(0.86,0.90,0.92)*(0.30+uSunCol.g*0.55), foam*0.55);',
      // 雾
      '  float dist = length(cameraPosition - vWorld);',
      '  float fogF = 1.0 - exp(-dist*uFogDen);',
      '  col = mix(col, uFog, clamp(fogF,0.0,0.92));',
      '  float alpha = mix(0.42, 0.99, 1.0-clamp(shallow,0.0,1.0));',
      '  alpha = max(alpha, fres*0.9);',
      '  alpha = max(alpha, foam);',
      '  alpha = mix(alpha, 1.0, fogF);',
      '  gl_FragColor = vec4(col, alpha);',
      '}'
    ].join('\n')
  });

  var waterGeo = new THREE.PlaneGeometry(16000, 16000, 240, 240);
  waterGeo.rotateX(-Math.PI / 2);
  var water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0;
  water.renderOrder = 2;
  scene.add(water);

  /* ---------------- 光 ---------------- */
  var hemi = new THREE.HemisphereLight(0xbdd2e8, 0x6b5a44, 0.55);
  scene.add(hemi);
  var sunLight = new THREE.DirectionalLight(0xffe6c4, 3.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -95;
  sunLight.shadow.camera.right = 95;
  sunLight.shadow.camera.top = 95;
  sunLight.shadow.camera.bottom = -95;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 520;
  sunLight.shadow.bias = -0.00025;
  sunLight.shadow.normalBias = 1.1;
  scene.add(sunLight);
  scene.add(sunLight.target);
  var amb = new THREE.AmbientLight(0x8fa6c4, 0.22);
  scene.add(amb);

  /* ---------------- 棕榈 ---------------- */
  var palms = new THREE.Group(); scene.add(palms);
  var FRONDS = [];
  var trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, color: C('#8d6a42'), roughness: 0.92, metalness: 0 });
  var frondMat = new THREE.MeshStandardMaterial({
    map: frondTex, alphaMap: frondTex, transparent: false, alphaTest: 0.42,
    color: C('#6f8a3c'), roughness: 0.78, metalness: 0, side: THREE.DoubleSide
  });
  var frondMatBack = frondMat.clone(); frondMatBack.color = C('#54702f');

  function frondGeometry(len, wid, droop, segs) {
    segs = segs || 10;
    var posA = [], uvA = [], idxA = [];
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      var x = t * len;
      var y = -droop * t * t * len;
      var w = Math.sin(Math.pow(t, 0.62) * Math.PI) * wid * (1 - 0.2 * t) + 0.015;
      var rib = 0.05 * w;
      posA.push(x, y - rib, -w, x, y + rib, 0, x, y - rib * 0.4, w);
      uvA.push(t, 0, t, 0.5, t, 1);
    }
    for (var s = 0; s < segs; s++) {
      var a = s * 3, b = (s + 1) * 3;
      idxA.push(a, b, a + 1, b, b + 1, a + 1);
      idxA.push(a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
    g.setIndex(idxA);
    g.computeVertexNormals();
    return g;
  }
  var FROND_GEO = frondGeometry(5.4, 0.82, 0.62, 14);
  var FROND_GEO_UP = frondGeometry(4.2, 0.72, 0.30, 12);
  var deadMat = new THREE.MeshStandardMaterial({
    map: frondTex, alphaMap: frondTex, alphaTest: 0.45, side: THREE.DoubleSide,
    color: C('#7a5c2e'), roughness: 0.95, metalness: 0
  });

  function makePalm(cfg) {
    cfg = cfg || {};
    var h = cfg.h || 11, lean = cfg.lean === undefined ? 0.5 : cfg.lean;
    var g = new THREE.Group();
    var segs = 9, pts = [];
    for (var i = 0; i <= segs; i++) {
      var t = i / segs;
      pts.push(new THREE.Vector3(
        Math.sin(t * 1.25) * lean * h * 0.32 + Math.sin(t * 4.2) * 0.06,
        t * h,
        Math.sin(t * 1.7 + 1.0) * lean * h * 0.12
      ));
    }
    for (var s = 0; s < segs; s++) {
      var p0 = pts[s], p1 = pts[s + 1];
      var dir = p1.clone().sub(p0);
      var lenS = dir.length();
      var r0 = THREE.MathUtils.lerp(0.62, 0.24, Math.pow(s / segs, 0.75)) * (cfg.thick || 1);
      var r1 = THREE.MathUtils.lerp(0.62, 0.24, Math.pow((s + 1) / segs, 0.75)) * (cfg.thick || 1);
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, lenS * 1.02, 8, 1, false), trunkMat);
      cyl.position.copy(p0).lerp(p1, 0.5);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      cyl.castShadow = true; cyl.receiveShadow = true;
      g.add(cyl);
    }
    var crown = new THREE.Group();
    crown.position.copy(pts[segs]);
    crown.rotation.y = rr(0, 6.28);
    g.add(crown);
    // 外层长叶（下垂）+ 内层新叶（上扬）
    var nF = 20 + Math.floor(rnd() * 5);
    for (var f = 0; f < nF; f++) {
      var ang = (f / nF) * Math.PI * 2 + rr(-0.12, 0.12);
      var pitch = rr(-0.20, 0.30);
      var fm = new THREE.Mesh(FROND_GEO, f % 3 === 0 ? frondMatBack : frondMat);
      var fg = new THREE.Group();
      fg.rotation.y = ang;
      fg.rotation.z = pitch;
      var sc = rr(0.85, 1.2);
      fm.scale.set(sc, sc, sc);
      fm.castShadow = true;
      fg.add(fm);
      crown.add(fg);
      FRONDS.push({ g: fg, base: pitch, phase: rr(0, 6.28), amp: rr(0.035, 0.10), sp: rr(0.7, 1.5) });
    }
    for (var f2 = 0; f2 < 7; f2++) {
      var ang2 = (f2 / 7) * Math.PI * 2 + 0.4;
      var fm2 = new THREE.Mesh(FROND_GEO_UP, frondMat);
      var fg2 = new THREE.Group();
      fg2.rotation.y = ang2;
      fg2.rotation.z = rr(0.55, 1.0);
      fm2.scale.setScalar(rr(0.6, 0.85));
      fm2.castShadow = true;
      fg2.add(fm2);
      crown.add(fg2);
      FRONDS.push({ g: fg2, base: fg2.rotation.z, phase: rr(0, 6.28), amp: rr(0.05, 0.12), sp: rr(0.9, 1.8) });
    }
    // 枯叶裙
    for (var f3 = 0; f3 < 6; f3++) {
      var fm3 = new THREE.Mesh(FROND_GEO, deadMat);
      var fg3 = new THREE.Group();
      fg3.rotation.y = rr(0, 6.28);
      fg3.rotation.z = rr(0.85, 1.25);
      fm3.scale.setScalar(rr(0.35, 0.55));
      fg3.position.y = -0.2;
      fg3.add(fm3);
      crown.add(fg3);
    }
    // 椰子
    for (var c = 0; c < 4; c++) {
      var co = new THREE.Mesh(new THREE.SphereGeometry(rr(0.22, 0.3), 10, 8),
        new THREE.MeshStandardMaterial({ color: C('#5c4526'), roughness: 0.85 }));
      co.position.set(rr(-0.5, 0.5), rr(-0.55, -0.2), rr(-0.5, 0.5));
      co.castShadow = true;
      crown.add(co);
    }
    return g;
  }

  var PALM_SPOTS = [
    // 木屋旁主簇
    [6, 20, 15.5], [1.5, 24.5, 13.4], [11, 24, 12.2], [-3, 15, 12.8], [9, 13, 11.0],
    // 西侧椰林
    [-16, 6, 13.0], [-22, 2, 12.2], [-27, -12, 12.0], [-19, -16, 10.6],
    // 北侧沙丘后
    [18, -22, 11.2], [24, -26, 9.8], [-4, -34, 10.4], [-12, -30, 9.2],
    // 东西两端
    [30, 12, 9.6], [37, 8, 8.4], [38, -6, 8.0], [-34, 10, 9.0], [-40, 4, 7.8],
    // 沙滩边缘零散
    [10, 34, 8.6], [-24, 26, 8.2], [26, 30, 5.8], [-44, -4, 6.6], [33, 22, 6.2]
  ];
  PALM_SPOTS.forEach(function (s, i) {
    var x = s[0], z = s[1], h = s[2];
    var y = heightAt(x, z);
    if (y < 0.6) y = 0.6;
    var p = makePalm({ h: h * 1.08, lean: rr(0.35, 0.8), thick: 1.15 + h / 26 });
    p.position.set(x, y - 0.35, z);
    p.rotation.y = Math.atan2(x, z) + rr(-0.4, 0.4);
    palms.add(p);
  });

  /* ---------------- 草 ---------------- */
  function crossGeo() {
    var g = new THREE.BufferGeometry(), p = [], uv = [], id = [];
    for (var k = 0; k < 3; k++) {
      var a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a), o = k * 4;
      p.push(-0.5 * ca, 0, -0.5 * sa, 0.5 * ca, 0, 0.5 * sa, 0.5 * ca, 1, 0.5 * sa, -0.5 * ca, 1, -0.5 * sa);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      id.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(id);
    g.computeVertexNormals();
    return g;
  }
  var grassMat = new THREE.MeshStandardMaterial({
    map: grassTex, alphaMap: grassTex, alphaTest: 0.4, side: THREE.DoubleSide,
    color: C('#67793a'), roughness: 0.95, metalness: 0
  });
  var grassCount = 1100;
  var grass = new THREE.InstancedMesh(crossGeo(), grassMat, grassCount);
  grass.receiveShadow = true;
  var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  var gi = 0, guard = 0;
  while (gi < grassCount && guard < grassCount * 40) {
    guard++;
    var gx = rr(-46, 46), gz = rr(-46, 46);
    var gy = heightAt(gx, gz);
    if (gy < 2.7) continue;
    if (fbm(gx * 0.09 + 3.0, gz * 0.09 + 8.0) < 0.42) continue;
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr(0, 6.28));
    var gs = rr(0.7, 1.9);
    v3.set(gx, gy - 0.06, gz); s3.set(gs * 1.2, gs * rr(0.55, 1.05), gs * 1.2);
    m4.compose(v3, q4, s3);
    grass.setMatrixAt(gi++, m4);
  }
  grass.count = gi;
  scene.add(grass);

  /* ---------------- 岩石 ---------------- */
  var rockMat = new THREE.MeshStandardMaterial({ color: C('#6f675c'), roughness: 0.95, metalness: 0.02, flatShading: true });
  function makeRock(size) {
    var g = new THREE.IcosahedronGeometry(size, 1);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      var n = 0.62 + fbm(v.x * 1.7 + 5, v.z * 1.7 + 9) * 0.75;
      v.multiplyScalar(n);
      v.y *= 0.72;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    var m = new THREE.Mesh(g, rockMat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  [[-52, 18, 4.4], [44, -26, 3.6], [-38, -34, 2.8], [56, 8, 3.0], [-30, 42, 2.2], [22, -44, 2.6],
   [64, -14, 2.0], [-58, -12, 2.4], [8, 52, 1.8], [-12, -50, 1.6]].forEach(function (r) {
    var m = makeRock(r[2]);
    var y = heightAt(r[0], r[1]);
    m.position.set(r[0], Math.max(y, -0.6) + r[2] * 0.35, r[1]);
    m.rotation.set(rr(-0.3, 0.3), rr(0, 6.28), rr(-0.3, 0.3));
    scene.add(m);
  });

  /* ---------------- 木屋 / 栈桥 / 小船 ---------------- */
  var islandRoot = new THREE.Group();
  scene.add(islandRoot);

  var hutMats = {
    wood: new THREE.MeshStandardMaterial({ map: woodTex, color: C('#9c7748'), roughness: 0.88 }),
    woodDark: new THREE.MeshStandardMaterial({ map: woodTex, color: C('#6a4c2c'), roughness: 0.9 }),
    thatch: new THREE.MeshStandardMaterial({ color: C('#a08a53'), roughness: 1.0, flatShading: true }),
    window: new THREE.MeshStandardMaterial({ color: C('#2a2018'), roughness: 0.35, emissive: C('#ffb45e'), emissiveIntensity: 0.0 })
  };
  var frameM = new THREE.MeshStandardMaterial({ color: C('#4c3823'), roughness: 0.9 });

  var hut = new THREE.Group();
  (function buildHut() {
    var hx = 14, hz = 12;
    var hy = heightAt(hx, hz);
    hut.position.set(hx, hy, hz);
    hut.rotation.y = -0.62;

    var W2 = 5.6, D2 = 4.6, DECK = 1.45, WALL_H = 2.9;

    // 高脚柱
    for (var i = 0; i < 6; i++) {
      var px = (i % 3 - 1) * (W2 / 2 - 0.35), pz = (i < 3 ? 1 : -1) * (D2 / 2 - 0.35);
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, DECK + 0.6, 8), hutMats.woodDark);
      post.position.set(px, (DECK + 0.6) / 2 - 0.5, pz);
      post.castShadow = true; post.receiveShadow = true; hut.add(post);
    }
    // 地台 + 地板缝
    var deck = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.2, D2), hutMats.wood);
    deck.position.y = DECK; deck.castShadow = true; deck.receiveShadow = true; hut.add(deck);

    // 主体墙
    var body = new THREE.Mesh(new THREE.BoxGeometry(W2 - 0.5, WALL_H, D2 - 0.5), hutMats.wood);
    body.position.y = DECK + WALL_H / 2;
    body.castShadow = true; body.receiveShadow = true; hut.add(body);

    // 墙角立柱（细节）
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      var col = new THREE.Mesh(new THREE.BoxGeometry(0.22, WALL_H, 0.22), hutMats.woodDark);
      col.position.set(c[0] * (W2 / 2 - 0.3), DECK + WALL_H / 2, c[1] * (D2 / 2 - 0.3));
      col.castShadow = true; hut.add(col);
    });

    // 门（带门框 + 门楣）
    var doorW = 1.0, doorH = 2.0;
    var doorZ = (D2 - 0.5) / 2 + 0.02;
    var door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), hutMats.woodDark);
    door.position.set(-0.9, DECK + doorH / 2, doorZ); hut.add(door);
    [[-1, 0], [1, 0]].forEach(function (s) {
      var jamb = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH + 0.1, 0.1), frameM);
      jamb.position.set(-0.9 + s[0] * (doorW / 2 + 0.05), DECK + doorH / 2, doorZ + 0.03);
      hut.add(jamb);
    });
    var lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, 0.12, 0.12), frameM);
    lintel.position.set(-0.9, DECK + doorH + 0.06, doorZ + 0.03); hut.add(lintel);

    // 窗（框 + 玻璃 + 窗台）
    function addWindow(wx, wz, ry, ww, wh) {
      var g = new THREE.Group();
      g.position.set(wx, DECK + 1.85, wz);
      g.rotation.y = ry;
      var fr = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.16, wh + 0.16, 0.1), frameM);
      g.add(fr);
      var glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), hutMats.window);
      glass.position.z = 0.06; g.add(glass);
      var sill = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.3, 0.08, 0.18), hutMats.woodDark);
      sill.position.y = -wh / 2 - 0.09; sill.position.z = 0.05; g.add(sill);
      // 窗棂
      var mull = new THREE.Mesh(new THREE.BoxGeometry(0.05, wh, 0.09), frameM);
      mull.position.z = 0.07; g.add(mull);
      hut.add(g);
    }
    addWindow(1.1, doorZ, 0, 1.1, 0.9);
    addWindow((W2 - 0.5) / 2 + 0.02, 0.4, Math.PI / 2, 1.2, 0.95);
    addWindow(-(W2 - 0.5) / 2 - 0.02, -0.3, -Math.PI / 2, 1.2, 0.95);

    // 四坡茅草屋顶（带出檐 + 脊）
    var roofY = DECK + WALL_H;
    var eave = 0.75;
    var roof = new THREE.Mesh(new THREE.ConeGeometry((W2 + eave * 2) * 0.5 * Math.SQRT2, 2.1, 4, 3, false), hutMats.thatch);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = roofY + 1.05;
    roof.castShadow = true; roof.receiveShadow = true; hut.add(roof);
    // 檐口厚度
    var eaveBand = new THREE.Mesh(new THREE.BoxGeometry(W2 + eave * 2, 0.16, D2 + eave * 2), hutMats.thatch);
    eaveBand.position.y = roofY + 0.02; eaveBand.castShadow = true; hut.add(eaveBand);
    // 脊帽
    var cap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.45, 4), hutMats.thatch);
    cap.position.y = roofY + 2.2; cap.rotation.y = Math.PI / 4; hut.add(cap);

    // 门廊栏杆 + 台阶
    var rail = new THREE.Mesh(new THREE.BoxGeometry(W2 - 0.6, 0.1, 0.1), hutMats.woodDark);
    rail.position.set(-0.6, DECK + 0.95, D2 / 2 + 0.35); hut.add(rail);
    for (var rp = 0; rp < 4; rp++) {
      var rpost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), hutMats.woodDark);
      rpost.position.set(-2.6 + rp * 1.45, DECK + 0.5, D2 / 2 + 0.35);
      rpost.castShadow = true; hut.add(rpost);
    }
    for (var st = 0; st < 3; st++) {
      var step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.55), hutMats.wood);
      step.position.set(-0.9, DECK - 0.1 - st * 0.42, D2 / 2 + 0.6 + st * 0.55);
      step.castShadow = true; step.receiveShadow = true; hut.add(step);
    }

    // 屋内暖光 + 灯笼
    var lamp = new THREE.PointLight(0xffb060, 0.0, 30, 2);
    lamp.position.set(0, DECK + 1.9, 0);
    hut.add(lamp);
    hut.userData.lamp = lamp;

    var lanternMat = new THREE.MeshStandardMaterial({
      color: C('#ffd79a'), emissive: C('#ffa444'), emissiveIntensity: 0.2, roughness: 0.45
    });
    var lantern = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), lanternMat);
    lantern.position.set(1.9, DECK + 2.0, D2 / 2 + 0.2);
    hut.add(lantern);
    hut.userData.lantern = lantern;
    var chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), frameM);
    chain.position.set(1.9, DECK + 2.35, D2 / 2 + 0.2); hut.add(chain);
  })();
  islandRoot.add(hut);

  // 栈桥
  (function buildPier() {
    var g = new THREE.Group();
    var y0 = 0.65;
    for (var i = 0; i < 11; i++) {
      var plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 1.5), hutMats.wood);
      plank.position.set(0, y0, -i * 1.55);
      plank.rotation.y = rr(-0.02, 0.02);
      plank.castShadow = true; plank.receiveShadow = true;
      g.add(plank);
      if (i % 2 === 0) {
        [-0.6, 0.6].forEach(function (sx) {
          var pile = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.2, 7), hutMats.woodDark);
          pile.position.set(sx, y0 - 1.0, -i * 1.55);
          pile.castShadow = true; g.add(pile);
        });
      }
    }
    g.position.set(46, 0, -12);
    g.rotation.y = 0.7;
    g.rotation.z = -0.01;
    islandRoot.add(g);
  })();

  // 小船
  (function buildBoat() {
    var g = new THREE.Group();
    var hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hutMats.woodDark);
    hull.scale.set(0.9, 0.55, 2.2);
    hull.rotation.x = Math.PI;
    hull.position.y = 0.28;
    hull.castShadow = true;
    g.add(hull);
    var seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.4), hutMats.wood);
    seat.position.y = 0.32; g.add(seat);
    g.position.set(56, 0.12, -6);
    g.rotation.y = 1.2;
    islandRoot.add(g);
    // 系泊绳
    var rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x9b8b6a, roughness: 1 }));
    rope.position.set(52, 0.45, -8);
    rope.rotation.z = Math.PI / 2.2;
    rope.rotation.y = 0.4;
    islandRoot.add(rope);
  })();

  /* ---------------- 远景岛 ---------------- */
  // 远景岛：多峰山脊（不是单个锥体），靠雾融进地平线
  /* ---------------- 岛上细节：植被层次 + 生活痕迹 ---------------- */
  var propRoot = new THREE.Group();
  islandRoot.add(propRoot);
  var FIRE = null, BIRDS = [], SMOKE = [];

  var bushMats = [
    new THREE.MeshStandardMaterial({ color: C('#4a6430'), roughness: 0.96, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: C('#5f7637'), roughness: 0.96, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: C('#3d5527'), roughness: 0.96, flatShading: true })
  ];
  var fernMat = new THREE.MeshStandardMaterial({
    map: frondTex, alphaMap: frondTex, alphaTest: 0.45, side: THREE.DoubleSide,
    color: C('#40592a'), roughness: 0.9
  });

  function makeBush(x, z, s) {
    var g = new THREE.Group(), lumps = 7 + Math.floor(rnd() * 5);
    for (var i = 0; i < lumps; i++) {
      var r = rr(0.32, 0.72) * s;
      var m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), bushMats[i % 3]);
      var a = rr(0, 6.28), rad = rr(0, 0.8) * s;
      m.position.set(Math.cos(a) * rad, rr(0.1, 0.55) * s, Math.sin(a) * rad);
      m.scale.y = rr(0.55, 0.95);
      m.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3));
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    g.position.set(x, heightAt(x, z) - 0.12, z);
    propRoot.add(g);
  }

  function makeFern(x, z, s) {
    var g = new THREE.Group(), n = 5 + Math.floor(rnd() * 3);
    for (var i = 0; i < n; i++) {
      var m = new THREE.Mesh(FROND_GEO, fernMat);
      var fg = new THREE.Group();
      fg.rotation.y = (i / n) * 6.283 + rr(-0.25, 0.25);
      fg.rotation.z = rr(0.75, 1.15);
      m.scale.setScalar(s * rr(0.75, 1.05));
      m.castShadow = true;
      fg.add(m); g.add(fg);
    }
    g.position.set(x, heightAt(x, z) - 0.05, z);
    propRoot.add(g);
  }

  var driftMat = new THREE.MeshStandardMaterial({ color: C('#9d8d78'), roughness: 0.95, flatShading: true });
  function makeDriftwood(x, z, len, ry) {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, len, 7), driftMat);
    trunk.rotation.z = Math.PI / 2;
    trunk.castShadow = true; g.add(trunk);
    for (var i = 0; i < 3; i++) {
      var br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, rr(0.9, 1.8), 5), driftMat);
      br.position.set(rr(-len * 0.35, len * 0.35), rr(-0.1, 0.25), rr(-0.2, 0.2));
      br.rotation.set(rr(-0.5, 0.5), rr(0, 3), rr(0.7, 1.3));
      br.castShadow = true; g.add(br);
    }
    g.position.set(x, heightAt(x, z) + 0.18, z);
    g.rotation.y = ry;
    propRoot.add(g);
  }

  function makeCrate(x, z, s, ry) {
    var g = new THREE.Group();
    var box = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.85, s), hutMats.wood);
    box.castShadow = true; box.receiveShadow = true; g.add(box);
    [[0, 0, s / 2 + 0.01], [0, 0, -s / 2 - 0.01]].forEach(function (o) {
      var band = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, 0.07, 0.03), hutMats.woodDark);
      band.position.set(o[0], s * 0.22, o[2]); g.add(band);
    });
    g.position.set(x, heightAt(x, z) + s * 0.42, z);
    g.rotation.y = ry;
    propRoot.add(g);
  }

  function makeBarrel(x, z) {
    var g = new THREE.Group();
    var b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.0, 14), hutMats.woodDark);
    b.castShadow = true; b.receiveShadow = true; g.add(b);
    [0.32, -0.32].forEach(function (yy) {
      var hoop = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.028, 6, 18), frameM);
      hoop.rotation.x = Math.PI / 2; hoop.position.y = yy; g.add(hoop);
    });
    g.position.set(x, heightAt(x, z) + 0.5, z);
    propRoot.add(g);
  }

  // 石径：从沙滩通到木屋
  function stonePath(p0, p1, n) {
    var stoneMat = new THREE.MeshStandardMaterial({ color: C('#8d8578'), roughness: 0.95, flatShading: true });
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var x = p0[0] + (p1[0] - p0[0]) * t + Math.sin(i * 2.1) * 1.1;
      var z = p0[1] + (p1[1] - p0[1]) * t + Math.cos(i * 1.7) * 1.1;
      var y = heightAt(x, z);
      if (y < 0.2) continue;
      var st = new THREE.Mesh(new THREE.CylinderGeometry(rr(0.45, 0.7), rr(0.5, 0.75), 0.16, 7), stoneMat);
      st.position.set(x, y + 0.02, z);
      st.scale.z = rr(0.7, 1.1);
      st.rotation.y = rr(0, 3);
      st.receiveShadow = true; st.castShadow = true;
      propRoot.add(st);
    }
  }

  // 篝火：石圈 + 交叉木柴 + 火光 + 烟
  function makeCampfire(x, z) {
    var g = new THREE.Group();
    var y = heightAt(x, z);
    var stoneMat = new THREE.MeshStandardMaterial({ color: C('#726a5e'), roughness: 0.95, flatShading: true });
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * 6.283;
      var st = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(0.16, 0.3), 0), stoneMat);
      st.position.set(Math.cos(a) * 0.95, 0.08, Math.sin(a) * 0.95);
      st.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3));
      st.castShadow = true; st.receiveShadow = true;
      g.add(st);
    }
    for (var k = 0; k < 4; k++) {
      var log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.5, 6), hutMats.woodDark);
      log.position.y = 0.22;
      log.rotation.set(Math.PI / 2 - 0.35, k * 0.8, 0);
      log.castShadow = true; g.add(log);
    }
    // 火焰（交叉 additive 面片）
    var flameMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff8a3a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    var flame = new THREE.Sprite(flameMat);
    flame.scale.set(1.5, 2.1, 1);
    flame.position.y = 0.95;
    g.add(flame);
    var light = new THREE.PointLight(0xff7a2e, 0.0, 22, 2);
    light.position.set(0, 1.2, 0);
    g.add(light);
    // 烟
    for (var s = 0; s < 4; s++) {
      var sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x8a8478, transparent: true, opacity: 0, depthWrite: false }));
      sm.scale.set(1.4, 1.4, 1);
      sm.position.set(rr(-0.2, 0.2), 1.4, rr(-0.2, 0.2));
      g.add(sm);
      SMOKE.push({ s: sm, t: s / 4 });
    }
    g.position.set(x, y - 0.05, z);
    propRoot.add(g);
    FIRE = { g: g, light: light, flame: flame };
  }

  // 吊床（两根木桩 + 织物）
  function makeHammock(x, z, ry) {
    var g = new THREE.Group();
    var hMat = new THREE.MeshStandardMaterial({ color: C('#c8b78e'), roughness: 0.95, side: THREE.DoubleSide });
    var geo = new THREE.PlaneGeometry(1.1, 3.2, 6, 10);
    var pa = geo.attributes.position;
    for (var i = 0; i < pa.count; i++) {
      var px = pa.getX(i), py = pa.getY(i);
      var bend = Math.cos((py / 1.6) * 1.57);
      pa.setZ(i, -bend * 0.55);
    }
    geo.computeVertexNormals();
    var ham = new THREE.Mesh(geo, hMat);
    ham.rotation.x = -Math.PI / 2;
    ham.position.y = 1.35;
    ham.castShadow = true;
    g.add(ham);
    [-1, 1].forEach(function (s) {
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8), hutMats.woodDark);
      post.position.set(0, 1.1, s * 1.85);
      post.castShadow = true; g.add(post);
      var rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), driftMat);
      rope.position.set(0, 1.75, s * 1.4);
      rope.rotation.x = s * 0.55; g.add(rope);
    });
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = ry;
    propRoot.add(g);
  }

  // 晒鱼架
  function makeRack(x, z, ry) {
    var g = new THREE.Group();
    [-1, 1].forEach(function (s) {
      var p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 6), hutMats.woodDark);
      p.position.set(s * 1.1, 0.95, 0); p.castShadow = true; g.add(p);
    });
    var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), hutMats.woodDark);
    bar.rotation.z = Math.PI / 2; bar.position.y = 1.75; g.add(bar);
    for (var i = 0; i < 4; i++) {
      var fish = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5),
        new THREE.MeshStandardMaterial({ color: C('#b9b0a0'), roughness: 0.7 }));
      fish.scale.set(2.0, 0.55, 0.5);
      fish.position.set(-0.85 + i * 0.56, 1.55, 0);
      fish.castShadow = true; g.add(fish);
    }
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = ry;
    propRoot.add(g);
  }

  // 飞鸟（V 形剪影，绕岛盘旋）
  function makeBird(r, y, a0, sp, sc) {
    var g = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ color: C('#1a1b22') });
    [-1, 1].forEach(function (s) {
      var w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.16), mat);
      w.position.x = s * 0.45;
      w.rotation.z = s * 0.28;
      g.add(w);
    });
    g.scale.setScalar(sc);
    scene.add(g);
    BIRDS.push({ g: g, r: r, y: y, a: a0, sp: sp });
  }

  // —— 布置 ——
  stonePath([6, 46], [12.6, 22], 16);
  makeCampfire(34, 26);
  makeCrate(20.6, 16.4, 1.0, 0.4);
  makeCrate(19.4, 17.6, 0.8, -0.3);
  makeBarrel(22.4, 17.2);
  makeRack(9.6, 20.6, -0.7);
  makeHammock(-6, 28, 0.9);
  makeDriftwood(-22, 44, 3.4, 0.6);
  makeDriftwood(30, 41, 2.6, -0.9);
  makeDriftwood(-34, 30, 2.2, 1.7);
  makeDriftwood(44, 18, 1.9, 0.2);

  [[-14, 24, 2.3], [4, 30, 1.9], [26, 6, 2.1], [-30, -6, 2.0], [-2, -18, 2.4],
   [16, -10, 1.7], [-20, 12, 1.6], [36, -14, 1.9], [8, 8, 1.4], [-40, 14, 1.7],
   [24, 32, 2.0], [-10, -34, 1.9], [40, 4, 1.4], [2, 18, 1.3], [-26, 34, 1.9],
   [12, 4, 1.6], [-6, -4, 1.5], [20, 14, 1.4], [-13, -12, 1.7], [30, -2, 1.5],
   [6, -26, 1.6], [-22, -24, 1.5], [18, 34, 1.4], [-18, 36, 1.3], [34, 30, 1.2],
   [-4, 40, 1.4], [44, 10, 1.3], [-38, -20, 1.3]].forEach(function (b) {
    makeBush(b[0], b[1], b[2]);
  });

  // 内陆巨石
  [[10, -2, 2.3], [-16, 20, 1.9], [26, 20, 1.7]].forEach(function (r) {
    var m = makeRock(r[2]);
    m.position.set(r[0], heightAt(r[0], r[1]) + r[2] * 0.18, r[1]);
    m.rotation.set(rr(-0.2, 0.2), rr(0, 6.28), rr(-0.2, 0.2));
    propRoot.add(m);
  });

  // 散落的枯棕榈叶
  (function deadFronds() {
    for (var i = 0; i < 22; i++) {
      var a = rr(0, 6.28), r = rr(6, 42);
      var x = Math.cos(a) * r, z = Math.sin(a) * r, y = heightAt(x, z);
      if (y < 1.6) continue;
      var m = new THREE.Mesh(FROND_GEO, deadMat);
      m.scale.setScalar(rr(0.35, 0.55));
      m.rotation.set(-Math.PI / 2 + rr(-0.15, 0.15), rr(0, 6.28), 0);
      m.position.set(x, y + 0.08, z);
      m.receiveShadow = true;
      propRoot.add(m);
    }
  })();

  // 草地碎石
  (function pebbles() {
    var geo = new THREE.IcosahedronGeometry(1, 0);
    var im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: C('#8a8274'), roughness: 0.95, flatShading: true }), 90);
    var mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), vv = new THREE.Vector3(), ss = new THREE.Vector3();
    var n = 0, guard2 = 0;
    while (n < 90 && guard2 < 900) {
      guard2++;
      var a2 = rr(0, 6.28), r2 = rr(4, 56);
      var x2 = Math.cos(a2) * r2, z2 = Math.sin(a2) * r2, y2 = heightAt(x2, z2);
      if (y2 < 0.4) continue;
      var s2 = rr(0.10, 0.32);
      qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr(0, 6.28));
      vv.set(x2, y2 + s2 * 0.35, z2); ss.set(s2, s2 * rr(0.5, 0.8), s2);
      mm.compose(vv, qq, ss);
      im.setMatrixAt(n++, mm);
    }
    im.count = n;
    im.castShadow = true; im.receiveShadow = true;
    propRoot.add(im);
  })();

  // 背风侧的矮岩脊（打破草坡的单调）
  (function ridgeInland() {
    for (var i = 0; i < 7; i++) {
      var a = 1.15 + i * 0.16;
      var rx = Math.cos(a) * (30 + i * 1.6), rz = Math.sin(a) * (30 + i * 1.6);
      var s = rr(1.1, 1.9);
      var m = makeRock(s);
      m.position.set(rx, heightAt(rx, rz) + s * 0.12, rz);
      m.rotation.set(rr(-0.2, 0.2), rr(0, 6.28), rr(-0.2, 0.2));
      m.scale.y = 0.8;
      propRoot.add(m);
    }
  })();

  // 菜圃（深色土 + 成行的小苗）
  (function garden() {
    var gx = 22.5, gz = 8.5, gy = heightAt(gx, gz);
    var soil = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.1, 0.28, 12), new THREE.MeshStandardMaterial({ color: cSoil, roughness: 1 }));
    soil.scale.z = 0.62;
    soil.position.set(gx, gy + 0.02, gz);
    soil.receiveShadow = true;
    propRoot.add(soil);
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 6; c++) {
        var px = gx - 2.1 + c * 0.85, pz = gz - 1.0 + r * 0.66;
        var leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.16, 0.24), 1), bushMats[1]);
        leaf.scale.y = 0.8;
        leaf.position.set(px, heightAt(px, pz) + 0.22, pz);
        leaf.castShadow = true;
        propRoot.add(leaf);
      }
    }
  })();

  // 倒木 + 树桩
  (function fallenLog() {
    var lx = -6, lz = 12, ly = heightAt(lx, lz);
    var log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 6.4, 9), trunkMat);
    log.rotation.set(0, 0.7, Math.PI / 2 - 0.06);
    log.position.set(lx, ly + 0.42, lz);
    log.castShadow = true; log.receiveShadow = true;
    propRoot.add(log);
    var stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.75, 9), trunkMat);
    stump.position.set(5, heightAt(5, 26) + 0.3, 26);
    stump.castShadow = true;
    propRoot.add(stump);
  })();
  [[8, 24, 0.9], [-8, 16, 1.0], [22, -6, 0.9], [-18, -2, 0.95], [-4, 30, 0.8],
   [14, 30, 0.85], [-24, 22, 0.9], [30, 16, 0.8], [0, -8, 1.0], [-34, -16, 0.9],
   [14, 6, 0.85], [-10, 4, 0.9], [26, 26, 0.8], [-28, 4, 0.85], [4, -14, 0.9],
   [-16, 30, 0.8], [32, -20, 0.85], [-36, 24, 0.8]].forEach(function (f) {
    makeFern(f[0], f[1], f[2]);
  });
  makeBird(120, 62, 0.4, 0.055, 2.4);
  makeBird(138, 68, 2.1, 0.048, 2.0);
  makeBird(108, 56, 4.0, 0.062, 1.8);
  makeBird(150, 74, 5.2, 0.042, 2.6);

  // 山脊剖面：几座主峰 + 两级分形起伏（1D）
  function ridgeProfile(t, so) {
    var n1 = fbm(t * 4.2 + so, 1.7);          // 主脊
    var n2 = fbm(t * 11.0 + so * 2.3, 4.1);   // 次级峰
    var n3 = fbm(t * 27.0 + so * 3.7, 7.9);   // 细节
    var p = Math.pow(n1, 1.5) * 1.55 + 0.32 * n2 + 0.13 * n3;
    // 两端收口，避免出现齐边
    var edge = Math.min(1, Math.min(t, 1 - t) * 7.0);
    return Math.max(0.03, p * (0.35 + 0.65 * edge));
  }

  // 远山：真正的高度场地形条带（有体量、有纵深），不是堆锥体
  // 空气透视：远山不用场景雾（会被橙色地平线染色），自己带淡紫灰的层次色
  // 逐时段重算顶点色：mountain 山脚永远贴合当前地平线色，正午不发紫、夜里不发亮
  var RANGES = [];                                  // {geo, layer, n, ka, kb, kc}
  var RANGE_DEPTH = [0.30, 0.40, 0.52];             // 近层更暗，远层更融化在雾里
  var SLATE_C = C('#3b3450');                       // 山体本色（偏冷紫灰）
  var RANGE_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, vertexColors: true });

  function tintRanges(p, d) {
    var hz = p.hor.clone().lerp(p.mid, 0.18);       // 山脚要融进的地平线色
    var wLow = 1 - THREE.MathUtils.smoothstep(d.y, 0.05, 0.42);   // 太阳越低越暖
    var warmK = wLow * (1 - p.night * 0.80) * (0.06 + 0.10 * wLow);
    // 逆光时段山体是剪影：太阳越低越压暗，否则会直接糊进晚霞里看不见
    var darkK = 0.52 + 0.48 * Math.min(1, Math.max(0, d.y * 2.6));
    darkK *= 1 - 0.55 * p.night;
    for (var i = 0; i < RANGES.length; i++) {
      var R = RANGES[i];
      var body = hz.clone().lerp(SLATE_C, 0.62).multiplyScalar(RANGE_DEPTH[R.layer] * darkK);
      body.lerp(p.sun, warmK);
      var lo = body.clone().multiplyScalar(0.82), hi = body.clone().multiplyScalar(1.20);
      var c = R.geo.attributes.color.array, ka = R.ka, kb = R.kb, kc = R.kc;
      for (var v = 0; v < R.n; v++) {
        var o = v * 3, a = ka[v], b1 = kb[v], c1 = kc[v];
        c[o] = hz.r * a + lo.r * b1 + hi.r * c1;
        c[o + 1] = hz.g * a + lo.g * b1 + hi.g * c1;
        c[o + 2] = hz.b * a + lo.b * b1 + hi.b * c1;
      }
      R.geo.attributes.color.needsUpdate = true;
    }
  }

  function makeRange(cfg) {
    var segX = cfg.segX || 150, segZ = cfg.segZ || 14;
    var pos = [], idx = [], col = [];
    var nv = (segX + 1) * (segZ + 1);
    var ka = new Float32Array(nv), kb = new Float32Array(nv), kc = new Float32Array(nv);
    var maxH = cfg.h * 1.85;
    for (var j = 0; j <= segZ; j++) {
      var zz = (j / segZ - 0.5) * 2;
      var fall = Math.pow(Math.max(0, 1 - Math.abs(zz)), 0.62);   // 前后渐低，形成山体斜面
      for (var i = 0; i <= segX; i++) {
        var u = i / segX;
        var x = (u - 0.5) * cfg.w;
        var hh = cfg.h * ridgeProfile(u, cfg.seed) * fall;
        hh *= 0.78 + 0.46 * fbm(x * cfg.freq + cfg.seed, zz * 2.2 + 3.0);
        hh += cfg.h * 0.05 * fbm(x * cfg.freq * 3.4, zz * 4.6 + 7.0);
        pos.push(x, hh, zz * cfg.d);
        var t = Math.min(1, Math.max(0, hh / maxH));
        var fade = THREE.MathUtils.smoothstep(t, 0.0, 0.15);       // 只有山脚一线融进雾，山脊保持剪影
        var vi = j * (segX + 1) + i;
        ka[vi] = 1 - fade; kb[vi] = fade * (1 - t); kc[vi] = fade * t;
        col.push(0, 0, 0);                                         // 颜色由 tintRanges() 填写
      }
    }
    for (var j2 = 0; j2 < segZ; j2++) {
      for (var i2 = 0; i2 < segX; i2++) {
        var a = j2 * (segX + 1) + i2, b = a + segX + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    var m = new THREE.Mesh(g, RANGE_MAT);
    m.position.set(cfg.x, -cfg.h * 0.09, cfg.z);
    m.rotation.y = cfg.rot || 0;
    m.frustumCulled = false;
    scene.add(m);
    RANGES.push({ geo: g, layer: cfg.layer || 0, n: nv, ka: ka, kb: kb, kc: kc });
  }

  // 远 → 中 → 近三层，越远越淡（靠雾+更浅的山色）
  // 离散岛屿：海面要留白，不能让山连成一道墙
  makeRange({ x: -2200, z: -3400, w: 780, h: 165, d: 180, seed: 4.4, freq: 0.02, rot: 0.16, layer: 0 });
  makeRange({ x: -1420, z: -2700, w: 460, h: 96, d: 130, seed: 17.6, freq: 0.034, rot: 0.22, layer: 0 });
  makeRange({ x: -420, z: -4000, w: 620, h: 120, d: 150, seed: 9.2, freq: 0.03, rot: -0.1, layer: 1 });
  makeRange({ x: 1080, z: -3050, w: 700, h: 135, d: 160, seed: 6.1, freq: 0.026, rot: -0.18, layer: 0 });
  makeRange({ x: 2380, z: -4200, w: 1050, h: 210, d: 220, seed: 13.7, freq: 0.016, rot: -0.3, layer: 2 });
  makeRange({ x: -3700, z: -4500, w: 1100, h: 220, d: 240, seed: 21.3, freq: 0.014, rot: 0.3, layer: 2 });
  makeRange({ x: 3350, z: -4750, w: 1300, h: 240, d: 260, seed: 33.1, freq: 0.012, rot: -0.2, layer: 2 });

  /* ---------------- 粒子：水花 / 萤火 ---------------- */
  var fireflies = (function () {
    var n = 90, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var a = rr(0, 6.28), r = rr(4, 40);
      p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = rr(1.2, 6.5); p[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    var m = new THREE.PointsMaterial({
      size: 0.7, map: glowTex, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xffd27a
    });
    var pts = new THREE.Points(g, m);
    scene.add(pts);
    return pts;
  })();

  /* ---------------- 后处理 ---------------- */
  var post = (function () {
    var ok = true;
    var type = THREE.HalfFloatType;
    var sceneRT, brightRT, blurRT1, blurRT2;
    try {
      sceneRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: type });
      brightRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: type });
      blurRT1 = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: type });
      blurRT2 = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: type });
    } catch (e) { ok = false; }

    var quadScene = new THREE.Scene();
    var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quadScene.add(quad);

    var vs = ['varying vec2 vUv;', 'void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }'].join('\n');

    var brightMat = new THREE.ShaderMaterial({
      uniforms: { tD: { value: null }, uTh: { value: 0.92 } },
      vertexShader: vs,
      fragmentShader: [
        'uniform sampler2D tD; uniform float uTh; varying vec2 vUv;',
        'void main(){ vec3 c = texture2D(tD,vUv).rgb;',
        ' float l = dot(c, vec3(0.2126,0.7152,0.0722));',
        ' c *= smoothstep(uTh, uTh*2.2+0.05, l);',
        ' gl_FragColor = vec4(c,1.0); }'
      ].join('\n')
    });

    var blurMat = new THREE.ShaderMaterial({
      uniforms: { tD: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: vs,
      fragmentShader: [
        'uniform sampler2D tD; uniform vec2 uDir,uRes; varying vec2 vUv;',
        'void main(){',
        ' vec2 px = uDir/uRes;',
        ' vec3 s = texture2D(tD,vUv).rgb*0.227;',
        ' s += (texture2D(tD,vUv+px*1.4).rgb + texture2D(tD,vUv-px*1.4).rgb)*0.316;',
        ' s += (texture2D(tD,vUv+px*3.1).rgb + texture2D(tD,vUv-px*3.1).rgb)*0.070;',
        ' gl_FragColor = vec4(s,1.0); }'
      ].join('\n')
    });

    var compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        uExp: { value: 1.0 }, uBloom: { value: 0.6 }, uVig: { value: 0.55 },
        uGrain: { value: 0.013 }, uTime: { value: 0 }, uSat: { value: 1.05 }, uWarm: { value: 0.6 }
      },
      vertexShader: vs,
      fragmentShader: [
        'uniform sampler2D tScene,tBloom;',
        'uniform float uExp,uBloom,uVig,uGrain,uTime,uSat,uWarm;',
        'varying vec2 vUv;',
        'vec3 aces(vec3 x){ float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }',
        'void main(){',
        ' vec2 uv = vUv; vec2 d = uv-0.5; float r2 = dot(d,d);',
        ' vec2 ca = d*r2*0.010;',
        ' vec3 col;',
        ' col.r = texture2D(tScene, uv+ca).r;',
        ' col.g = texture2D(tScene, uv).g;',
        ' col.b = texture2D(tScene, uv-ca).b;',
        ' col += texture2D(tBloom, uv).rgb*uBloom;',
        ' col *= uExp;',
        ' col = aces(col*0.92);',
        ' float l = dot(col, vec3(0.2126,0.7152,0.0722));',
        ' col = mix(col, col*vec3(1.07,1.0,0.92), uWarm*smoothstep(0.32,1.0,l));',
        ' col = mix(col, col*vec3(0.90,0.97,1.10), (1.0-uWarm*0.6)*smoothstep(0.42,0.0,l));',
        ' col = mix(vec3(l), col, uSat);',
        ' col *= mix(1.0, smoothstep(1.30,0.30,length(d)*1.55), uVig);',
        ' float g = fract(sin(dot(uv*vec2(1234.0,8765.0)+uTime, vec2(12.9898,78.233)))*43758.5453);',
        ' col += (g-0.5)*uGrain;',
        ' col = pow(max(col,0.0), vec3(1.0/2.2));',
        ' gl_FragColor = vec4(col,1.0);',
        '}'
      ].join('\n')
    });

    function setSize(w, h) {
      if (!ok) return;
      var pw = Math.floor(w), ph = Math.floor(h);
      sceneRT.setSize(pw, ph);
      brightRT.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1));
      blurRT1.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1));
      blurRT2.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1));
      blurMat.uniforms.uRes.value.set(Math.max(1, pw >> 1), Math.max(1, ph >> 1));
    }

    function pass(mat, target) {
      quad.material = mat;
      renderer.setRenderTarget(target || null);
      renderer.clear();
      renderer.render(quadScene, quadCam);
    }

    return {
      ok: ok, rt: sceneRT, setSize: setSize,
      render: function (t) {
        if (!ok) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
        brightMat.uniforms.tD.value = sceneRT.texture;
        pass(brightMat, brightRT);
        blurMat.uniforms.tD.value = brightRT.texture;
        blurMat.uniforms.uDir.value.set(1, 0);
        pass(blurMat, blurRT1);
        blurMat.uniforms.tD.value = blurRT1.texture;
        blurMat.uniforms.uDir.value.set(0, 1);
        pass(blurMat, blurRT2);
        compositeMat.uniforms.tScene.value = sceneRT.texture;
        compositeMat.uniforms.tBloom.value = blurRT2.texture;
        compositeMat.uniforms.uTime.value = t;
        pass(compositeMat, null);
      },
      u: compositeMat.uniforms
    };
  })();

  /* ---------------- 反射 ---------------- */
  var clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function renderReflection() {
    camera.updateMatrixWorld();
    reflCam.fov = camera.fov; reflCam.aspect = camera.aspect; reflCam.near = 0.5; reflCam.far = camera.far;
    reflCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
    reflCam.up.set(0, 1, 0);
    reflCam.lookAt(controls.target.x, -controls.target.y, controls.target.z);
    reflCam.updateProjectionMatrix();
    reflCam.updateMatrixWorld();
    texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    texMat.multiply(reflCam.projectionMatrix);
    texMat.multiply(reflCam.matrixWorldInverse);

    water.visible = false;
    sky.visible = true;
    renderer.clippingPlanes = [clipPlane];
    var oldTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(reflRT);
    renderer.clear();
    renderer.render(scene, reflCam);
    renderer.clippingPlanes = [];
    renderer.setRenderTarget(oldTarget);
    water.visible = true;
  }

  /* ---------------- 时间系统 ---------------- */
  var HOUR = 18.25;
  var sunDir = sunDirAt(HOUR);
  var PAL_CUR = palAt(HOUR);
  var LAMP_ON = false;

  function applyTime(h) {
    HOUR = h;
    var p = PAL_CUR = palAt(h);
    var d = sunDirAt(h);
    sunDir.copy(d);
    SKYU.uTop.value.copy(p.top);
    SKYU.uMid.value.copy(p.mid);
    SKYU.uHor.value.copy(p.hor);
    SKYU.uSunCol.value.copy(p.sun);
    SKYU.uSunDir.value.copy(d);
    SKYU.uNight.value = p.night;
    SKYU.uCloud.value = 0.62 + 0.55 * p.night;
    SKYU.uGlowK.value = 1.0 - 0.82 * p.night;

    WATERU.uSunDir.value.copy(d);
    WATERU.uSunCol.value.copy(p.sun);
    WATERU.uSkyTop.value.copy(p.top);
    WATERU.uSkyMid.value.copy(p.mid);
    WATERU.uSkyHor.value.copy(p.hor);
    WATERU.uDeep.value.copy(p.deep);
    WATERU.uShallow.value.copy(p.shallow);
    WATERU.uFog.value.copy(p.hor);
    WATERU.uNight.value = p.night;

    scene.fog.color.copy(p.hor).multiplyScalar(0.96);
    scene.fog.near = 480;
    scene.fog.far = 4300;

    tintRanges(p, d);

    sunLight.position.copy(d).multiplyScalar(280);
    sunLight.target.position.set(0, 4, 0);
    sunLight.color.copy(p.sun);
    sunLight.intensity = p.si;
    sunLight.castShadow = p.si > 0.4;

    hemi.color.copy(p.mid).lerp(new THREE.Color(0xffffff), 0.25);
    hemi.groundColor.copy(new THREE.Color('#6b5a44')).lerp(p.deep, 0.35);
    hemi.intensity = p.amb;

    if (post.ok) {
      post.u.uExp.value = p.exp;
      post.u.uBloom.value = p.bloom;
      post.u.uSat.value = p.sat;
      post.u.uWarm.value = h > 15.5 || h < 7.5 ? 0.85 : 0.35;
    }

    var lampI = (p.night > 0.05 || HOUR > 17.4 || HOUR < 7.0 || LAMP_ON) ? 1.0 : 0.0;
    if (hut.userData.lamp) hut.userData.lamp.intensity = lampI * (LAMP_ON ? 2.6 : 1.5);
    if (hut.userData.lantern) hut.userData.lantern.material.emissiveIntensity = 0.15 + lampI * 2.2;
    hutMats.window.emissiveIntensity = lampI * 0.9;

    fireflies.material.opacity = Math.max(0, p.night - 0.25) * 0.9;

    updateHud();
  }

  /* ---------------- UI ---------------- */
  function $(id) { return document.getElementById(id); }
  var hudTime;

  function buildUI() {
    var css = document.createElement('style');
    css.textContent =
      '#topbar{position:fixed;top:18px;right:20px;display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;max-width:62vw;z-index:6}' +
      '#tpanel{position:fixed;left:20px;bottom:20px;z-index:6;background:rgba(8,14,24,.42);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:11px 14px 9px;color:#fff;font-size:12px;letter-spacing:1px;width:230px}' +
      '#tpanel .row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}' +
      '#tpanel .big{font-size:17px;letter-spacing:2px;font-variant-numeric:tabular-nums}' +
      '#tpanel .muted{opacity:.55;font-size:10px;letter-spacing:2px}' +
      '#tslider{width:100%;-webkit-appearance:none;height:3px;border-radius:2px;background:linear-gradient(90deg,#1a2740,#e0886e,#8dc0e2,#ff8a50,#101a34);outline:none}' +
      '#tslider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.8);cursor:pointer}' +
      '.pbt{cursor:pointer;border:1px solid rgba(255,255,255,.28);color:#fff;background:rgba(8,14,24,.42);backdrop-filter:blur(6px);padding:6px 12px;border-radius:16px;font-size:12px;letter-spacing:1px}' +
      '.pbt:hover{background:rgba(255,255,255,.2)}' +
      '.pbt.on{background:#e8c48a;border-color:#e8c48a;color:#20180c}';
    document.head.appendChild(css);

    var top = document.createElement('div');
    top.id = 'topbar';
    var views = [['全景', [12, 30, 168], [0, 7, 0]], ['沙滩', [-6, 8, 96], [10, 6, 10]], ['椰林', [-30, 12, 42], [10, 12, 0]], ['木屋', [16, 12, 40], [16, 6, 14]], ['海面', [40, 4, 130], [0, 3, 0]]];
    views.forEach(function (v, i) {
      var b = document.createElement('button');
      b.className = 'pbt' + (i === 0 ? ' on' : '');
      b.textContent = v[0];
      b.onclick = function () {
        tweenCam(v[1], v[2], 1.8);
        Array.prototype.forEach.call(top.querySelectorAll('.pbt'), function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
      top.appendChild(b);
    });
    var rot = document.createElement('button');
    rot.className = 'pbt'; rot.textContent = '自动旋转';
    rot.onclick = function () { controls.autoRotate = !controls.autoRotate; rot.classList.toggle('on', controls.autoRotate); };
    top.appendChild(rot);
    var exp = document.createElement('button');
    exp.className = 'pbt'; exp.textContent = '导出 GLB';
    exp.onclick = exportGLB;
    top.appendChild(exp);
    document.body.appendChild(top);

    var pad = document.createElement('div');
    pad.id = 'tpanel';
    pad.innerHTML = '<div class="row"><div><div class="muted">TIME OF DAY</div><div class="big" id="hudTime">18:36</div></div>' +
      '<div class="muted" id="hudPhase">日落 · 逆光</div></div>' +
      '<input id="tslider" type="range" min="0" max="24" step="0.05" value="18.25">';
    document.body.appendChild(pad);
    hudTime = $('hudTime');
    var slider = $('tslider');
    slider.oninput = function () { applyTime(parseFloat(slider.value)); };
    phaseBtn(pad);
    $('label').textContent = '海风小岛 · 写实电影感';
    $('hint').textContent = '左键旋转 · 滚轮缩放 · 右键平移 · 点木屋开灯';
  }

  function phaseBtn(pad) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:5px;margin-top:8px';
    [['日出', 5.9], ['正午', 12], ['日落', 18.3], ['月夜', 22.4]].forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'pbt'; b.style.padding = '4px 9px'; b.style.fontSize = '11px'; b.textContent = p[0];
      b.onclick = function () { tweenTime(p[1]); };
      wrap.appendChild(b);
    });
    pad.appendChild(wrap);
  }

  function updateHud() {
    if (!hudTime) return;
    var hh = Math.floor(HOUR), mm = Math.floor((HOUR - hh) * 60);
    hudTime.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    var ph = HOUR < 6 ? '深夜 · 月光' : HOUR < 8 ? '清晨 · 薄雾' : HOUR < 16 ? '白昼 · 强光' : HOUR < 19 ? '日落 · 逆光' : HOUR < 21 ? '黄昏 · 霞光' : '月夜 · 静谧';
    var el = $('hudPhase'); if (el) el.textContent = ph;
    var s = $('tslider'); if (s) s.value = HOUR;
  }

  /* ---------------- 相机缓动 ---------------- */
  var tweens = [], timeTween = null;
  function tweenCam(p, t, dur) {
    tweens.push({
      t: 0, dur: dur || 1.8,
      p0: camera.position.clone(), t0: controls.target.clone(),
      p1: new THREE.Vector3(p[0], p[1], p[2]), t1: new THREE.Vector3(t[0], t[1], t[2])
    });
  }
  function tweenTime(to) { timeTween = { t: 0, dur: 1.6, from: HOUR, to: to }; }
  function easeIO(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function updateTweens(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var w = tweens[i]; w.t += dt;
      var k = easeIO(Math.min(1, w.t / w.dur));
      camera.position.lerpVectors(w.p0, w.p1, k);
      controls.target.lerpVectors(w.t0, w.t1, k);
      if (k >= 1) tweens.splice(i, 1);
    }
    if (timeTween) {
      timeTween.t += dt;
      var kk = easeIO(Math.min(1, timeTween.t / timeTween.dur));
      applyTime(timeTween.from + (timeTween.to - timeTween.from) * kk);
      if (kk >= 1) timeTween = null;
    }
  }

  /* ---------------- 交互：点木屋开灯 ---------------- */
  var ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    var hit = ray.intersectObject(hut, true);
    if (hit.length) {
      LAMP_ON = !LAMP_ON;
      applyTime(HOUR);
      if (LAMP_ON) tweenCam([16, 9, 32], [16, 5, 14], 1.0);
    }
  });

  /* ---------------- 细节动画 ---------------- */
  function updateDetails(t, night) {
    if (FIRE) {
      var lit = night > 0.12 || HOUR > 17.6 || HOUR < 6.4;
      var fl = lit ? 1.0 : 0.16;
      FIRE.light.intensity = fl * (1.9 + 0.35 * Math.sin(t * 11.0) + 0.2 * Math.sin(t * 23.0 + 1.3));
      FIRE.flame.material.opacity = fl * (0.75 + 0.2 * Math.sin(t * 9.0));
      FIRE.flame.scale.set(1.4 + 0.12 * Math.sin(t * 12.0), 2.0 + 0.28 * Math.sin(t * 8.4), 1);
      for (var i = 0; i < SMOKE.length; i++) {
        var s = SMOKE[i];
        s.t += 0.0022;
        if (s.t > 1) s.t -= 1;
        s.s.position.y = 1.3 + s.t * 5.5;
        s.s.position.x = Math.sin(s.t * 6.0 + i) * 0.5;
        s.s.material.opacity = 0.16 * Math.sin(s.t * Math.PI) * (0.35 + night * 0.65);
        s.s.scale.setScalar(1.0 + s.t * 2.6);
      }
    }
    for (var b = 0; b < BIRDS.length; b++) {
      var bd = BIRDS[b];
      bd.a += bd.sp * 0.01;
      bd.g.position.set(Math.cos(bd.a) * bd.r, bd.y + Math.sin(t * 0.6 + b) * 1.4, Math.sin(bd.a) * bd.r);
      bd.g.rotation.y = -bd.a + Math.PI / 2;
      var flap = Math.sin(t * 4.2 + b * 1.7) * 0.35;
      bd.g.children[0].rotation.z = 0.28 + flap;
      bd.g.children[1].rotation.z = -0.28 - flap;
      bd.g.visible = night < 0.55;
    }
  }

  /* ---------------- 导出 GLB ---------------- */
  function exportGLB() {
    try {
      var exporter = new THREE.GLTFExporter();
      var group = new THREE.Group();
      islandRoot.updateMatrixWorld(true);
      var clone = islandRoot.clone(true);
      group.add(clone);
      exporter.parse(group, function (buf) {
        var blob = new Blob([buf], { type: 'model/gltf-binary' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sea_isle.glb';
        a.click();
      }, { binary: true });
    } catch (err) { console.warn('GLB 导出失败', err); }
  }

  /* ---------------- 尺寸 ---------------- */
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    var dw = Math.floor(W * PR), dh = Math.floor(H * PR);
    reflRT.setSize(Math.max(1, dw >> 1), Math.max(1, dh >> 1));
    if (post.ok) post.setSize(dw, dh);
  }
  window.addEventListener('resize', resize);

  /* ---------------- 主循环 ---------------- */
  var clock = new THREE.Clock();
  var T0 = 0;
  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    T0 += dt;
    controls.update();
    updateTweens(dt);

    SKYU.uTime.value = T0;
    WATERU.uTime.value = T0;

    for (var i = 0; i < FRONDS.length; i++) {
      var f = FRONDS[i];
      f.g.rotation.z = f.base + Math.sin(T0 * f.sp + f.phase) * f.amp;
      f.g.rotation.x = Math.cos(T0 * f.sp * 0.8 + f.phase) * f.amp * 0.6;
    }

    if (fireflies.material.opacity > 0.01) {
      fireflies.rotation.y = T0 * 0.02;
      fireflies.position.y = Math.sin(T0 * 0.6) * 0.3;
    }

    updateDetails(T0, PAL_CUR.night);
    renderReflection();
    if (post.ok) {
      renderer.setRenderTarget(post.rt);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      post.render(T0);
    } else {
      renderer.render(scene, camera);
    }
  }

  /* ---------------- 启动 ---------------- */
  buildUI();
  resize();
  applyTime(HOUR);
  animate();
  var ld = document.getElementById('loading');
  if (ld) ld.style.display = 'none';
  window.__isle = { scene: scene, camera: camera, controls: controls, applyTime: applyTime, tweenCam: tweenCam, water: water, sunLight: sunLight, renderer: renderer };
})();
