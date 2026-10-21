
/* ===========================================================
   天穹轨道站 / TIANQIONG ORBITAL STATION
   程序化近地轨道空间站 · 单文件离线 · 可拆解 / 可拼装
   text-to-3d-html · 原创设计
   =========================================================== */
(function () {
  'use strict';

  var W = window.innerWidth, H = window.innerHeight;
  var PR = Math.min(window.devicePixelRatio || 1, 1.5);

  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(PR);
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);
  ['ui', 'bar', 'editbar', 'label', 'hint'].forEach(function (id) {
    var e = document.getElementById(id); if (e) e.style.display = 'none';
  });

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(33, W / H, 0.4, 24000);
  camera.position.set(88, 82, 104);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.85;
  controls.minDistance = 24;
  controls.maxDistance = 560;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.18;

  /* ---------------- 基础工具 ---------------- */
  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  var seed = 89271;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function rr(a, b) { return a + (b - a) * rnd(); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var sunDir = new THREE.Vector3(0.54, 0.74, -0.40).normalize();

  /* ---------------- 后处理（bloom + ACES） ---------------- */
  var post = (function () {
    var ok = true, type = THREE.HalfFloatType;
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
      uniforms: { tD: { value: null }, uTh: { value: 0.94 } },
      vertexShader: vs,
      fragmentShader: [
        'uniform sampler2D tD; uniform float uTh; varying vec2 vUv;',
        'void main(){ vec3 c = texture2D(tD,vUv).rgb;',
        ' float l = dot(c, vec3(0.2126,0.7152,0.0722));',
        ' c *= smoothstep(uTh, uTh*2.4+0.05, l);',
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
        uExp: { value: 1.07 }, uBloom: { value: 0.62 }, uVig: { value: 0.62 },
        uGrain: { value: 0.006 }, uTime: { value: 0 }, uSat: { value: 1.04 }, uWarm: { value: 0.36 }
      },
      vertexShader: vs,
      fragmentShader: [
        'uniform sampler2D tScene,tBloom;',
        'uniform float uExp,uBloom,uVig,uGrain,uTime,uSat,uWarm;',
        'varying vec2 vUv;',
        'vec3 aces(vec3 x){ float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }',
        'void main(){',
        ' vec2 uv = vUv; vec2 d = uv-0.5; float r2 = dot(d,d);',
        ' vec2 ca = d*r2*0.009;',
        ' vec3 col;',
        ' col.r = texture2D(tScene, uv+ca).r;',
        ' col.g = texture2D(tScene, uv).g;',
        ' col.b = texture2D(tScene, uv-ca).b;',
        ' col += texture2D(tBloom, uv).rgb*uBloom;',
        ' col *= uExp;',
        ' col = aces(col*0.96);',
        ' float l = dot(col, vec3(0.2126,0.7152,0.0722));',
        ' col = mix(col, col*vec3(1.06,1.0,0.94), uWarm*smoothstep(0.35,1.0,l));',
        ' col = mix(col, col*vec3(0.92,0.98,1.09), (1.0-uWarm*0.6)*smoothstep(0.40,0.0,l));',
        ' col = mix(vec3(l), col, uSat);',
        ' col *= mix(1.0, smoothstep(1.34,0.28,length(d)*1.58), uVig);',
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
      ok: ok, rt: sceneRT, setSize: setSize, u: compositeMat.uniforms,
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
      }
    };
  })();

  /* ---------------- 程序化贴图 ---------------- */
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  // 舱体热控白毡：拼块 + 缝线 + 脏迹
  function hullTex(base, tint) {
    return canvasTex(512, 512, function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 220; i++) {
        var x = Math.random() * w, y = Math.random() * h;
        var ww = 20 + Math.random() * 90, hh = 16 + Math.random() * 70;
        g.fillStyle = Math.random() > 0.5
          ? 'rgba(255,255,255,' + (0.04 + Math.random() * 0.07) + ')'
          : 'rgba(' + tint + ',' + (0.03 + Math.random() * 0.06) + ')';
        g.fillRect(x, y, ww, hh);
      }
      // 细密缝线网格
      for (var x2 = 0; x2 < w; x2 += 32) {
        g.fillStyle = 'rgba(0,0,0,0.055)'; g.fillRect(x2, 0, 1.5, h);
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x2 + 2, 0, 1, h);
      }
      for (var y2 = 0; y2 < h; y2 += 32) {
        g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y2, w, 1.5);
      }
      // 铆点
      for (var k = 0; k < 2600; k++) {
        g.fillStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.12) + ')';
        g.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
      }
    });
  }

  // 金色多层隔热膜
  var foilTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#c79a45'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 340; i++) {
      var x = Math.random() * w, y = Math.random() * h;
      var s = 6 + Math.random() * 26;
      var v = Math.random();
      g.fillStyle = v > 0.55 ? 'rgba(255,224,150,' + (0.10 + v * 0.22) + ')' : 'rgba(96,66,24,' + (0.08 + (1 - v) * 0.20) + ')';
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.6, y + s); g.lineTo(x - s * 0.2, y + s * 0.7);
      g.closePath(); g.fill();
    }
    for (var j = 0; j < 220; j++) {
      g.strokeStyle = 'rgba(255,246,220,' + (0.05 + Math.random() * 0.16) + ')';
      g.lineWidth = 0.7;
      g.beginPath();
      var sx = Math.random() * w, sy = Math.random() * h;
      g.moveTo(sx, sy); g.lineTo(sx + (Math.random() - 0.5) * 30, sy + (Math.random() - 0.5) * 30);
      g.stroke();
    }
  });

  // 太阳电池阵：栅格电池片 + 汇流条
  var solarTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#0a1730'; g.fillRect(0, 0, w, h);
    var cols = 8, rows = 8, cw = w / cols, ch = h / rows;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var grd = g.createLinearGradient(x * cw, y * ch, (x + 1) * cw, (y + 1) * ch);
        var b = 0.72 + Math.random() * 0.28;
        grd.addColorStop(0, 'rgba(' + (28 * b) + ',' + (58 * b) + ',' + (118 * b) + ',1)');
        grd.addColorStop(0.5, 'rgba(' + (44 * b) + ',' + (86 * b) + ',' + (160 * b) + ',1)');
        grd.addColorStop(1, 'rgba(' + (18 * b) + ',' + (40 * b) + ',' + (88 * b) + ',1)');
        g.fillStyle = grd;
        g.fillRect(x * cw + 1.5, y * ch + 1.5, cw - 3, ch - 3);
        // 细栅线
        g.strokeStyle = 'rgba(190,205,230,0.18)';
        g.lineWidth = 0.6;
        for (var k = 1; k < 4; k++) {
          g.beginPath();
          g.moveTo(x * cw + 2 + (cw - 4) * k / 4, y * ch + 2);
          g.lineTo(x * cw + 2 + (cw - 4) * k / 4, (y + 1) * ch - 2);
          g.stroke();
        }
      }
    }
    // 银灰汇流条
    g.fillStyle = 'rgba(150,160,175,0.55)';
    for (var yy = 0; yy <= rows; yy++) g.fillRect(0, yy * ch - 1, w, 2);
  });
  solarTex.repeat.set(1, 9);

  // 散热板
  var radTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#dfe4e8'; g.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 14) {
      g.fillStyle = 'rgba(120,132,146,0.28)'; g.fillRect(0, y, w, 1.6);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, y + 2, w, 1);
    }
    for (var x = 0; x < w; x += 64) {
      g.fillStyle = 'rgba(120,132,146,0.20)'; g.fillRect(x, 0, 1.4, h);
    }
  });
  radTex.repeat.set(2, 2);

  var metalTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#a8b0b7'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 1800; i++) {
      g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(60,68,76,0.06)';
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 1 + Math.random() * 2);
    }
    g.fillStyle = 'rgba(70,80,90,0.16)';
    for (var y = 0; y < h; y += 20) g.fillRect(0, y, w, 1);
  });

  /* ---------------- 环境反射（金属质感关键） ---------------- */
  function makeEnv() {
    var imgs = [];
    for (var i = 0; i < 6; i++) {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d');
      var grd = g.createLinearGradient(0, 0, 0, 64);
      if (i === 3) { grd.addColorStop(0, '#1b4d7d'); grd.addColorStop(0.55, '#2f74ad'); grd.addColorStop(1, '#63a6d8'); }
      else if (i === 2) { grd.addColorStop(0, '#03060a'); grd.addColorStop(1, '#070c14'); }
      else { grd.addColorStop(0, '#070c14'); grd.addColorStop(1, '#173350'); }
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      if (i !== 2) {
        // 太阳高光块，给金属一点方向性反射
        var s = g.createRadialGradient(46, 22, 0, 46, 22, 26);
        s.addColorStop(0, 'rgba(255,250,236,0.95)');
        s.addColorStop(1, 'rgba(255,250,236,0)');
        g.fillStyle = s; g.fillRect(0, 0, 64, 64);
      }
      imgs.push(c);
    }
    var tex = new THREE.CubeTexture(imgs);
    tex.needsUpdate = true;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  var ENV = makeEnv();

  /* ---------------- 材质 ---------------- */
  function M(color, map, opt) {
    opt = opt || {};
    var m = new THREE.MeshStandardMaterial({
      color: C(color),
      roughness: opt.rough === undefined ? 0.68 : opt.rough,
      metalness: opt.metal === undefined ? 0.15 : opt.metal,
      envMap: ENV,
      envMapIntensity: opt.env === undefined ? 0.55 : opt.env
    });
    if (map) m.map = map;
    if (opt.emissive) { m.emissive = C(opt.emissive); m.emissiveIntensity = opt.ei || 1; }
    if (opt.side) m.side = opt.side;
    return m;
  }

  var MAT = {
    hull: M('#dfe3e6', hullTex('#dfe3e6', '120,130,140'), { rough: 0.66, metal: 0.14, env: 0.5 }),
    hull2: M('#cfd6da', hullTex('#cfd6da', '100,112,124'), { rough: 0.7, metal: 0.12, env: 0.45 }),
    hull3: M('#e8ebec', hullTex('#e8ebec', '130,140,150'), { rough: 0.6, metal: 0.16, env: 0.5 }),
    gold: M('#d8ab55', foilTex, { rough: 0.34, metal: 0.92, env: 1.0 }),
    goldDim: M('#b98f42', foilTex, { rough: 0.45, metal: 0.85, env: 0.9 }),
    metal: M('#b4bcc4', metalTex, { rough: 0.34, metal: 0.95, env: 1.0 }),
    darkMetal: M('#5b646d', metalTex, { rough: 0.44, metal: 0.9, env: 0.85 }),
    truss: M('#b9c1c8', metalTex, { rough: 0.3, metal: 0.97, env: 1.0 }),
    dark: M('#2b3036', null, { rough: 0.8, metal: 0.35, env: 0.4 }),
    black: M('#15181c', null, { rough: 0.55, metal: 0.5, env: 0.5 }),
    blanket: M('#6d757c', metalTex, { rough: 0.86, metal: 0.08, env: 0.25 }),
    white: M('#eef1f3', radTex, { rough: 0.52, metal: 0.1, env: 0.4 }),
    rad: M('#b6bdc4', radTex, { rough: 0.6, metal: 0.16, env: 0.3 }),
    gold2: M('#c99c4c', foilTex, { rough: 0.4, metal: 0.88, env: 0.95 }),
    solar: M('#c9d3df', solarTex, { rough: 0.88, metal: 0.0, env: 0.04 }),
    solarBack: new THREE.MeshBasicMaterial({ color: C('#3a4148') }),
    glass: M('#0d1a2a', null, { rough: 0.06, metal: 0.95, env: 1.0 }),
    glassLit: M('#16324a', null, { rough: 0.08, metal: 0.9, env: 1.0, emissive: '#3f7fb8', ei: 0.5 })
  };

  MAT.hull.map.repeat.set(3.2, 2.0);
  MAT.hull2.map.repeat.set(3.0, 2.2);
  MAT.hull3.map.repeat.set(3.4, 2.2);

  /* ---------------- 灯光 ---------------- */
  var sun = new THREE.DirectionalLight(0xfff3e2, 1.95);
  sun.position.copy(sunDir).multiplyScalar(420);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 900;
  sun.shadow.normalBias = 0.7;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // 地球反照：从下方打的冷蓝补光（ISS 照片的标志性冷调）
  var earthBounce = new THREE.DirectionalLight(0x4a86c4, 0.78);
  earthBounce.position.set(0.1, -1, 0.35);
  scene.add(earthBounce);

  scene.add(new THREE.HemisphereLight(0x2f4a66, 0x101c2a, 0.24));
  scene.add(new THREE.AmbientLight(0x18222e, 0.26));

  /* ---------------- 星空 ---------------- */
  (function stars() {
    var dotTex = canvasTex(32, 32, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    dotTex.wrapS = dotTex.wrapT = THREE.ClampToEdgeWrapping;

    var N = 22000;
    var pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N);
    var v = new THREE.Vector3();
    for (var i = 0; i < N; i++) {
      // 均匀球面 + 银河带聚集
      var u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
      var r = Math.sqrt(1 - u * u);
      v.set(r * Math.cos(th), u, r * Math.sin(th));
      if (i > N * 0.62) {
        // 沿一条倾斜平面聚集
        var a = rnd() * Math.PI * 2;
        var band = (rnd() + rnd() + rnd() - 1.5) * 0.16;
        v.set(Math.cos(a), band, Math.sin(a)).normalize();
        v.applyAxisAngle(new THREE.Vector3(0.4, 0.2, 0.85).normalize(), 0.9);
      }
      v.multiplyScalar(6000);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      var t = rnd();
      var c = t < 0.12 ? [0.72, 0.82, 1.0] : (t > 0.9 ? [1.0, 0.86, 0.72] : [1, 1, 1]);
      var b = 0.6 + rnd() * 0.95;
      col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b;
      siz[i] = 0.8 + Math.pow(rnd(), 2.6) * 3.6;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var m = new THREE.PointsMaterial({
      size: 2.7, sizeAttenuation: false, vertexColors: true,
      map: dotTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, alphaTest: 0.01, opacity: 0.95
    });
    var pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
  })();

  // 太阳
  (function sunSprite() {
    var tex = canvasTex(128, 128, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.08, 'rgba(255,250,235,1)');
      gr.addColorStop(0.22, 'rgba(255,226,180,0.45)');
      gr.addColorStop(0.55, 'rgba(255,200,150,0.10)');
      gr.addColorStop(1, 'rgba(255,180,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    s.position.copy(sunDir).multiplyScalar(9000);
    s.scale.set(1500, 1500, 1);
    s.frustumCulled = false;
    scene.add(s);
  })();

  /* ---------------- 地球 ---------------- */
  // 快速 3D 噪声（无 sin，够快）
  function h3(i, j, k) {
    var n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
    n = (n ^ (n >> 13)) * 1274126177 | 0;
    n = (n ^ (n >> 16)) >>> 0;
    return n / 4294967295;
  }
  function n3(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var c000 = h3(xi, yi, zi), c100 = h3(xi + 1, yi, zi), c010 = h3(xi, yi + 1, zi), c110 = h3(xi + 1, yi + 1, zi);
    var c001 = h3(xi, yi, zi + 1), c101 = h3(xi + 1, yi, zi + 1), c011 = h3(xi, yi + 1, zi + 1), c111 = h3(xi + 1, yi + 1, zi + 1);
    var a = c000 + (c100 - c000) * u, b = c010 + (c110 - c010) * u;
    var c = c001 + (c101 - c001) * u, d = c011 + (c111 - c011) * u;
    var e = a + (b - a) * v, f = c + (d - c) * v;
    return e + (f - e) * w;
  }
  function fbm3(x, y, z, oct) {
    var v = 0, a = 0.5;
    for (var i = 0; i < (oct || 4); i++) { v += a * n3(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; }
    return v;
  }

  var EARTH_R = 900, EARTH_Y = -(EARTH_R + 168);

  /* GPU 烘焙行星贴图（CPU 版要 5 秒，改走一遍离线渲染） */
  var BAKE_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }';
  var NOISE_GLSL = [
    'float hash13(vec3 p3){',
    '  p3 = fract(p3 * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    'float noise3(vec3 x){',
    '  vec3 i = floor(x), f = fract(x);',
    '  f = f*f*(3.0-2.0*f);',
    '  return mix(mix(mix(hash13(i+vec3(0.0,0.0,0.0)), hash13(i+vec3(1.0,0.0,0.0)), f.x),',
    '                 mix(hash13(i+vec3(0.0,1.0,0.0)), hash13(i+vec3(1.0,1.0,0.0)), f.x), f.y),',
    '             mix(mix(hash13(i+vec3(0.0,0.0,1.0)), hash13(i+vec3(1.0,0.0,1.0)), f.x),',
    '                 mix(hash13(i+vec3(0.0,1.0,1.0)), hash13(i+vec3(1.0,1.0,1.0)), f.x), f.y), f.z);',
    '}',
    'float fbm3(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise3(p); p*=2.03; a*=0.5; } return v; }'
  ].join('\n');

  function bakeRT(w, h, frag) {
    var rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      depthBuffer: false, stencilBuffer: false
    });
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    rt.texture.generateMipmaps = false;
    var sc = new THREE.Scene();
    var cm = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var mat = new THREE.ShaderMaterial({
      vertexShader: BAKE_VS, fragmentShader: frag,
      depthTest: false, depthWrite: false
    });
    var q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    sc.add(q);
    var prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(sc, cm);
    renderer.setRenderTarget(prev);
    q.geometry.dispose(); mat.dispose();
    return rt.texture;
  }

  var EARTH_R = 900, EARTH_Y = -(EARTH_R + 168);

  var earthMaps = (function () {
    var t0 = performance.now();
    var dayFrag = [
      'varying vec2 vUv;',
      NOISE_GLSL,
      'void main(){',
      '  float lon = vUv.x * 6.28318530718;',
      '  float lat = (vUv.y - 0.5) * 3.14159265359;',
      '  float cl = cos(lat);',
      '  vec3 p = vec3(cos(lon)*cl, sin(lat), sin(lon)*cl);',
      '  float w1 = fbm3(p*1.5 + vec3(3.3,1.7,8.1)) - 0.5;',
      '  float w2 = fbm3(p*2.7 + vec3(-4.2,6.6,-1.4)) - 0.5;',
      '  vec3 q = p*1.9 + vec3(w1*2.2+5.0, w2*2.2+2.0, w1*1.6+7.0);',
      '  float h = fbm3(q);',
      '  h += (fbm3(p*11.0) - 0.5) * 0.05;',
      '  float land = step(0.515, h);',
      '  float deep = clamp((0.515 - h) * 10.0, 0.0, 1.0);',
      '  float shallow = clamp((h - 0.487) * 14.0, 0.0, 1.0);',
      '  vec3 oceanCol = mix(vec3(0.016,0.050,0.130), vec3(0.035,0.115,0.215), shallow);',
      '  oceanCol = mix(oceanCol, vec3(0.008,0.022,0.062), deep*0.8);',
      '  float elev = clamp((h-0.515)*6.6, 0.0, 1.0);',
      '  float dz = (abs(lat)-0.42)/0.24;',
      '  float desert = exp(-dz*dz);',
      '  float green = clamp(1.0-abs(lat)/1.15, 0.0, 0.85) * (1.0-desert*0.85);',
      '  vec3 landCol = mix(vec3(0.37,0.44,0.24), vec3(0.66,0.56,0.37), desert);',
      '  landCol = mix(landCol, vec3(0.22,0.34,0.14), green*0.55);',
      '  landCol = mix(landCol, vec3(0.44,0.42,0.37), smoothstep(0.55,1.0,elev));',
      '  float biome = fbm3(p*3.4 + 21.0);',
      '  landCol = mix(landCol, vec3(0.56,0.50,0.36), smoothstep(0.52,0.78,biome)*0.5);',
      '  landCol *= 0.86 + 0.26*biome;',
      '  landCol = mix(landCol, vec3(0.86,0.88,0.90), smoothstep(0.82,0.99,elev));',
      '  vec3 col = mix(oceanCol, landCol, land);',
      '  float ice = smoothstep(1.20, 1.50, abs(lat));',
      '  col = mix(col, vec3(0.93,0.95,0.97), ice);',
      '  float oceanMask = (1.0-land) * (1.0-ice);',
      '  gl_FragColor = vec4(pow(col, vec3(2.2)), oceanMask);',
      '}'
    ].join('\n');

    var cloudFrag = [
      'varying vec2 vUv;',
      NOISE_GLSL,
      'void main(){',
      '  float lon = vUv.x * 6.28318530718;',
      '  float lat = (vUv.y - 0.5) * 3.14159265359;',
      '  float cl = cos(lat);',
      '  vec3 p = vec3(cos(lon)*cl, sin(lat), sin(lon)*cl);',
      '  float sw = fbm3(p*2.2 + 9.0) - 0.5;',
      '  float f1 = fbm3(p*7.4 + vec3(sw*1.6, sw*1.2, -sw*1.4));',
      '  float f2 = fbm3(p*22.0) - 0.5;',
      '  float d = f1 + f2*0.30;',
      '  float band = cos(lat*3.0);',
      '  d *= 0.40 + 0.34*band*band;',
      '  float v = clamp((d-0.63)*5.4, 0.0, 1.0);',
      '  gl_FragColor = vec4(v, v, v, 1.0);',
      '}'
    ].join('\n');

    var day = bakeRT(2048, 1024, dayFrag);
    var cloud = bakeRT(3072, 1536, cloudFrag);
    console.log('[earth] baked in', Math.round(performance.now() - t0), 'ms');
    return { day: day, cloud: cloud };
  })();

  var earth = (function () {
    var tex = earthMaps;
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: tex.day }, uCloud: { value: tex.cloud }, 
        uSun: { value: sunDir.clone() }, uTime: { value: 0 },
        uAtm: { value: C('#5aa8ff') }
      },
      vertexShader: [
        'varying vec2 vUv; varying vec3 vN; varying vec3 vW;',
        'void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal);',
        ' vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz;',
        ' gl_Position=projectionMatrix*viewMatrix*wp; }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uDay,uCloud; uniform vec3 uSun,uAtm; uniform float uTime;',
        'varying vec2 vUv; varying vec3 vN; varying vec3 vW;',
        'void main(){',
        ' vec4 d = texture2D(uDay, vUv);',
        ' vec3 base = d.rgb;',
        ' float ocean = d.a;',
        ' vec3 n = normalize(vN);',
        ' vec3 L = normalize(uSun);',
        ' float ndl = dot(n, L);',
        ' float day = smoothstep(-0.10, 0.32, ndl);',
        ' float cloud = texture2D(uCloud, vUv + vec2(uTime*0.0014, 0.0)).r;',
        ' cloud = smoothstep(0.16, 0.86, cloud);',
        ' vec3 col = mix(base, vec3(0.88,0.92,0.97), cloud*0.78);',
        ' vec3 V = normalize(cameraPosition - vW);',
        ' vec3 Hh = normalize(L + V);',
        ' float spec = pow(max(dot(n,Hh),0.0), 240.0) * ocean * (1.0-cloud) * 3.0;',
        ' vec3 lit = col * (0.015 + 0.94*max(ndl,0.0));',
        ' lit += vec3(1.0,0.96,0.90) * spec * day;',
        ' float night = smoothstep(0.05,-0.32,ndl);',
        ' vec3 lights = vec3(1.0,0.70,0.34) * pow(1.0-ocean,1.0) * smoothstep(0.35,0.75,base.g+base.r*0.5) * night * 0.45;',
        ' vec3 outc = lit + lights;',
        ' float fres = pow(1.0 - max(dot(n,V),0.0), 3.4);',
        ' outc += uAtm * fres * (0.02 + 0.40*day);',
        ' gl_FragColor = vec4(outc, 1.0);',
        '}'
      ].join('\n')
    });
    var geo = new THREE.SphereGeometry(EARTH_R, 128, 72);
    var m = new THREE.Mesh(geo, mat);
    m.position.set(0, EARTH_Y, 0);
    m.rotation.x = -1.02;
    m.rotation.y = 3.55;
    m.renderOrder = -1;
    scene.add(m);

    var atm = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_R * 1.0055, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: sunDir.clone() }, uCol: { value: C('#4f9cff') } },
        vertexShader: [
          'varying vec3 vN; varying vec3 vW;',
          'void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz;',
          ' gl_Position=projectionMatrix*viewMatrix*wp; }'
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 uSun,uCol; varying vec3 vN; varying vec3 vW;',
          'void main(){',
          ' vec3 n=normalize(vN); vec3 V=normalize(cameraPosition-vW);',
          ' float f = pow(1.0-abs(dot(n,V)), 7.5);',
          ' float day = smoothstep(-0.35,0.45,dot(n,normalize(uSun)));',
          ' float a = f * (0.02 + 0.42*day);',
          ' gl_FragColor = vec4(uCol * a * 0.55, a);',
          '}'
        ].join('\n'),
        transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.BackSide
      })
    );
    atm.position.copy(m.position);
    scene.add(atm);
    return { mesh: m, mat: mat, atm: atm };
  })();

  /* ---------------- 几何助手 ---------------- */
  var UBOX = new THREE.BoxGeometry(1, 1, 1);
  var USPH = new THREE.SphereGeometry(1, 20, 14);

  function box(p, mat, w, h, d, x, y, z) {
    var m = new THREE.Mesh(UBOX, mat);
    m.scale.set(w, h, d); m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    p.add(m); return m;
  }
  function cyl(p, mat, r, h, x, y, z, seg, open) {
    var g = new THREE.CylinderGeometry(r, r, h, seg || 24, 1, !!open);
    var m = new THREE.Mesh(g, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    p.add(m); return m;
  }
  function sph(p, mat, r, x, y, z, ws, hs) {
    var g = ws ? new THREE.SphereGeometry(r, ws, hs || ws) : USPH;
    var m = new THREE.Mesh(g, mat);
    if (!ws) m.scale.setScalar(r);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    p.add(m); return m;
  }
  function strut(p1, p2, r, mat, parent) {
    var d = new THREE.Vector3().subVectors(p2, p1), len = d.length();
    var g = new THREE.CylinderGeometry(r, r, len, 6, 1, false);
    var m = new THREE.Mesh(g, mat);
    m.position.copy(p1).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

  /* ---------------- 站体根节点 ---------------- */
  var root = new THREE.Group();
  scene.add(root);

  /* --- 加压舱段 --- */
  function mkModule(r, len, mat, opt) {
    opt = opt || {};
    var g = new THREE.Group();
    var geo = new THREE.CylinderGeometry(r, r, len, 30, 1, false);
    geo.rotateX(Math.PI / 2);
    var body = new THREE.Mesh(geo, mat);
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // 加强环
    var ringN = opt.rings === undefined ? 3 : opt.rings;
    var rg = new THREE.TorusGeometry(r * 1.008, 0.085, 6, 40);
    for (var i = 0; i < ringN; i++) {
      var t = ringN === 1 ? 0 : (i / (ringN - 1) - 0.5) * 0.86;
      var ring = new THREE.Mesh(rg, MAT.darkMetal);
      ring.position.z = t * len;
      ring.castShadow = true;
      g.add(ring);
    }
    // 端环
    [-1, 1].forEach(function (s) {
      var e = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 0.13, 6, 40), MAT.metal);
      e.position.z = s * len / 2;
      g.add(e);
    });

    // 暗色隔热毯拼块（打破整片白）
    var blankets = opt.blankets === undefined ? 3 : opt.blankets;
    for (var bi = 0; bi < blankets; bi++) {
      var ba = (bi / blankets) * Math.PI * 2 + rr(-0.3, 0.3);
      var panelW = len * rr(0.16, 0.26);
      var blk = new THREE.Mesh(new THREE.BoxGeometry(0.1, r * rr(1.1, 1.7), panelW), MAT.blanket);
      blk.position.set(Math.sin(ba) * (r + 0.02), Math.cos(ba) * (r + 0.02), rr(-0.22, 0.22) * len);
      blk.rotation.z = -ba;
      blk.castShadow = true;
      g.add(blk);
    }
    // 金色多层隔热
    if (opt.goldPatch) {
      for (var gi = 0; gi < 2; gi++) {
        var ga = gi * Math.PI + 0.7;
        var gp = new THREE.Mesh(new THREE.BoxGeometry(0.08, r * 1.05, len * 0.2), MAT.gold);
        gp.position.set(Math.sin(ga) * (r + 0.01), Math.cos(ga) * (r + 0.01), -len * 0.18 + gi * len * 0.3);
        gp.rotation.z = -ga;
        g.add(gp);
      }
    }

    // 侧壁细节：舱门 / 舷窗 / 设备盒 / 扶手
    var hatches = opt.hatches === undefined ? 1 : opt.hatches;
    for (var h = 0; h < hatches; h++) {
      var hz = (h - (hatches - 1) / 2) * len * 0.42;
      var hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.34, 18), MAT.hull3);
      hatch.rotation.x = Math.PI / 2;
      hatch.position.set(0, r - 0.2, hz);
      hatch.castShadow = true;
      g.add(hatch);
      var hc = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.075, 6, 22), MAT.darkMetal);
      hc.position.set(0, r - 0.34, hz);
      hc.rotation.x = Math.PI / 2;
      g.add(hc);
    }
    // 舷窗
    var wins = opt.windows === undefined ? 2 : opt.windows;
    for (var wi = 0; wi < wins; wi++) {
      var wz = (wi - (wins - 1) / 2) * len * 0.26 + len * 0.12;
      var wg = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16), MAT.glass);
      wg.rotation.x = Math.PI / 2;
      wg.position.set(-r * 0.55, r * 0.82, wz);
      g.add(wg);
      var wr = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.07, 5, 18), MAT.metal);
      wr.rotation.x = Math.PI / 2;
      wr.position.set(-r * 0.55, r * 0.84, wz);
      g.add(wr);
    }
    // 设备盒 + 扶手
    for (var b = 0; b < 10; b++) {
      var bx = rr(-0.7, 0.7) * r, bz = rr(-0.46, 0.46) * len;
      var ang = Math.atan2(bx, 0);
      var px = Math.sin(ang) * (r + 0.1), py = Math.cos(ang) * (r + 0.1);
      box(g, Math.random() > 0.6 ? MAT.gold : MAT.hull3, rr(0.3, 0.75), rr(0.22, 0.5), rr(0.3, 0.8), px * (bx >= 0 ? 1 : 1), py, bz);
    }
    for (var hh = 0; hh < 6; hh++) {
      var a2 = rr(-1.1, 1.1);
      var rx = Math.sin(a2) * (r + 0.16), ry = Math.cos(a2) * (r + 0.16);
      var rz = rr(-0.42, 0.42) * len;
      box(g, MAT.metal, 0.09, 0.09, 0.9, rx, ry, rz);
      box(g, MAT.metal, 0.09, 0.26, 0.09, rx, ry, rz - 0.42);
      box(g, MAT.metal, 0.09, 0.26, 0.09, rx, ry, rz + 0.42);
    }
    return g;
  }

  function mkNode(r, ports) {
    var g = new THREE.Group();
    var s = sph(g, MAT.hull2, r, 0, 0, 0, 28, 20);
    // 赤道加强带
    var belt = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.11, 6, 40), MAT.darkMetal);
    belt.rotation.x = Math.PI / 2;
    g.add(belt);
    // 端口
    (ports || []).forEach(function (p) {
      var dir = p.dir;
      var pg = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.55, 20, 1, true), MAT.metal);
      ring.rotation.x = Math.PI / 2;
      pg.add(ring);
      var inner = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 18), MAT.dark);
      inner.rotation.x = Math.PI / 2;
      inner.position.z = 0.02;
      pg.add(inner);
      var tr = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.07, 5, 22), MAT.darkMetal);
      tr.position.z = 0.26;
      pg.add(tr);
      pg.position.copy(dir).multiplyScalar(r * 0.98);
      pg.lookAt(dir.clone().multiplyScalar(r * 4));
      g.add(pg);
    });
    // 表面细节
    for (var i = 0; i < 12; i++) {
      var d = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
      box(g, Math.random() > 0.55 ? MAT.gold : MAT.hull3, rr(0.25, 0.6), 0.2, rr(0.25, 0.6),
        d.x * r * 1.02, d.y * r * 1.02, d.z * r * 1.02);
    }
    return g;
  }

  /* --- 桁架 --- */
  function trussSection(len, sq) {
    sq = sq || 1.65;
    var g = new THREE.Group();
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // 四根纵梁
    corners.forEach(function (c) {
      box(g, MAT.truss, len, 0.2, 0.2, -len / 2, c[0] * sq, c[1] * sq);
    });
    // 端框
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 4; i++) {
        var a = corners[i], b = corners[(i + 1) % 4];
        var p1 = V3(s * len / 2, a[0] * sq, a[1] * sq);
        var p2 = V3(s * len / 2, b[0] * sq, b[1] * sq);
        strut(p1, p2, 0.08, MAT.truss, g);
      }
    });
    // 斜撑（每 3.6m 一道）
    var bays = Math.max(2, Math.round(len / 3.6));
    for (var bi = 0; bi < bays; bi++) {
      var x0 = -len / 2 + (bi / bays) * len;
      var x1 = -len / 2 + ((bi + 1) / bays) * len;
      for (var f = 0; f < 4; f++) {
        var a2 = corners[f], b2 = corners[(f + 1) % 4];
        var A = V3(x0, a2[0] * sq, a2[1] * sq);
        var B = V3(x1, b2[0] * sq, b2[1] * sq);
        strut(A, B, 0.062, MAT.truss, g);
        var A2 = V3(x0, b2[0] * sq, b2[1] * sq);
        var B2 = V3(x1, a2[0] * sq, a2[1] * sq);
        strut(A2, B2, 0.062, MAT.truss, g);
      }
      // 中间加强框
      if (bi % 2 === 0 && bi > 0) {
        var xm = x0;
        for (var k = 0; k < 4; k++) {
          var c1 = corners[k], c2 = corners[(k + 1) % 4];
          strut(V3(xm, c1[0] * sq, c1[1] * sq), V3(xm, c2[0] * sq, c2[1] * sq), 0.055, MAT.truss, g);
        }
      }
    }
    return g;
  }

  /* --- 太阳翼 --- */
  var WING_GROUPS = [];
  function solarWing(parent, x, z0, dir, tilt) {
    var g = new THREE.Group();
    g.position.set(x, 0, z0);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    g.rotation.z = tilt || 0;
    parent.add(g);

    var L = 30, BW = 3.7, gap = 0.30;
    var mastLen = L + 2.4;
    // 中央桅杆
    box(g, MAT.metal, 0.26, 0.26, mastLen, 0, 0, -mastLen / 2 + 0.6);
    box(g, MAT.darkMetal, 0.5, 0.36, 1.6, 0, 0, 0.5);
    // 两组毯
    var planeGeo = new THREE.PlaneGeometry(BW, L, 2, 16);
    var posAttr = planeGeo.attributes.position;
    for (var i = 0; i < posAttr.count; i++) {
      var zz = posAttr.getY(i);
      posAttr.setZ(i, Math.sin((zz / L + 0.5) * 6.4) * 0.16 + Math.sin(zz * 0.42) * 0.05);
    }
    planeGeo.computeVertexNormals();

    for (var s = -1; s <= 1; s += 2) {
      var ox = s * (BW / 2 + gap / 2 + 0.16);
      var pg = planeGeo.clone();
      pg.rotateX(-Math.PI / 2);
      var m = new THREE.Mesh(pg, MAT.solar);
      m.position.set(ox, 0, -L / 2 - 0.6);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);

      var back = new THREE.Mesh(pg.clone(), MAT.solarBack);
      back.position.set(ox, -0.03, -L / 2 - 0.6);
      back.scale.set(0.985, -0.985, 1);
      g.add(back);
      for (var rb = 1; rb <= 4; rb++) {
        box(g, MAT.darkMetal, BW, 0.07, 0.1, ox, -0.05, -0.6 - rb * (L / 5));
      }
      box(g, MAT.darkMetal, 0.1, 0.07, L, ox, -0.05, -L / 2 - 0.6);

      // 边框
      box(g, MAT.metal, 0.1, 0.12, L, ox - BW / 2, 0.02, -L / 2 - 0.6);
      box(g, MAT.metal, 0.1, 0.12, L, ox + BW / 2, 0.02, -L / 2 - 0.6);
      box(g, MAT.metal, BW + 0.2, 0.12, 0.1, ox, 0.02, -L - 0.6);
      box(g, MAT.metal, BW + 0.2, 0.12, 0.1, ox, 0.02, -0.6);
      // 张紧索
      for (var c = 0; c < 3; c++) {
        var cz = -0.6 - (c + 1) * (L / 4);
        box(g, MAT.darkMetal, BW, 0.045, 0.045, ox, 0.03, cz);
      }
    }
    WING_GROUPS.push(g);
    return g;
  }

  /* --- 散热板 --- */
  function radiator(parent, x, z0, rot) {
    var g = new THREE.Group();
    g.position.set(x, 0, z0);
    g.rotation.z = rot || 0;
    parent.add(g);
    var H = 7.2, D = 8.4;
    var panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, D), MAT.rad);
    panel.position.set(0, H / 2 + 1.5, 0);
    panel.castShadow = true; panel.receiveShadow = true;
    g.add(panel);
    // 边框 + 横向肋条
    box(g, MAT.darkMetal, 0.26, 0.16, D + 0.1, 0, H + 1.56, 0);
    box(g, MAT.darkMetal, 0.26, 0.16, D + 0.1, 0, 1.44, 0);
    box(g, MAT.darkMetal, 0.26, H, 0.14, 0, H / 2 + 1.5, D / 2);
    box(g, MAT.darkMetal, 0.26, H, 0.14, 0, H / 2 + 1.5, -D / 2);
    for (var i = 1; i < 7; i++) {
      box(g, MAT.darkMetal, 0.22, 0.07, D, 0, 1.5 + i * (H / 7), 0);
    }
    // 根部铰链
    cyl(g, MAT.darkMetal, 0.19, 1.6, 0, 1.42, 0);
    return g;
  }

  /* --- 机械臂 --- */
  function roboticArm(parent, x, y, z) {
    var g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);

    cyl(g, MAT.darkMetal, 0.62, 0.7, 0, 0.3, 0, 20);
    var b1 = new THREE.Group();
    g.add(b1);
    b1.rotation.x = -0.9; b1.rotation.z = 0.5;
    cyl(b1, MAT.hull3, 0.36, 9.2, 0, 4.6, 0, 16);
    box(b1, MAT.dark, 0.5, 3.2, 0.55, 0, 2.6, 0);
    for (var i = 0; i < 5; i++) cyl(b1, MAT.metal, 0.42, 0.16, 0, 1.2 + i * 1.8, 0, 14);
    // 肘
    var elbow = new THREE.Group();
    elbow.position.set(0, 9.2, 0);
    b1.add(elbow);
    sph(elbow, MAT.darkMetal, 0.62, 0, 0, 0, 16);
    var b2 = new THREE.Group();
    elbow.add(b2);
    b2.rotation.x = 1.35; b2.rotation.z = -0.35;
    cyl(b2, MAT.hull3, 0.32, 7.4, 0, 3.7, 0, 16);
    for (var j = 0; j < 4; j++) cyl(b2, MAT.metal, 0.37, 0.14, 0, 1.0 + j * 1.7, 0, 14);
    // 末端执行器
    var ee = new THREE.Group();
    ee.position.set(0, 7.6, 0);
    b2.add(ee);
    cyl(ee, MAT.darkMetal, 0.46, 0.9, 0, 0.3, 0, 16);
    box(ee, MAT.metal, 0.9, 0.34, 0.34, 0, 0.95, 0);
    box(ee, MAT.metal, 0.34, 0.34, 0.9, 0, 0.95, 0);
    cyl(ee, MAT.dark, 0.2, 0.5, 0, 1.2, 0, 12);
    // 腕部相机
    box(ee, MAT.black, 0.22, 0.22, 0.28, 0.34, 0.7, 0.3);
    return g;
  }

  /* --- 抛物面天线 --- */
  function dish(parent, x, y, z, ry, r) {
    var g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    var dg = new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3.1);
    var d = new THREE.Mesh(dg, MAT.white);
    d.rotation.x = Math.PI;
    d.position.y = -r * 0.16;
    d.castShadow = true;
    g.add(d);
    strut(V3(0, 0, 0), V3(0, -r * 1.0, 0), 0.075, MAT.darkMetal, g);
    cyl(g, MAT.darkMetal, 0.2, 0.55, 0, 0.12, 0, 12);
    box(g, MAT.dark, 0.18, 0.18, 0.3, 0.4, 0.05, 0);
    return g;
  }

  /* --- 对接飞船 --- */
  function crewShip(scale) {
    var g = new THREE.Group();
    var s = scale || 1;
    // 服务舱
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.95 * s, 1.95 * s, 4.6 * s, 26), MAT.black);
    trunk.rotation.x = Math.PI / 2;
    trunk.position.z = -2.6 * s;
    trunk.castShadow = true;
    g.add(trunk);
    // 舱体
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.85 * s, 1.55 * s, 3.2 * s, 26), MAT.hull3);
    body.rotation.x = Math.PI / 2;
    body.position.z = 1.1 * s;
    body.castShadow = true;
    g.add(body);
    var nose = new THREE.Mesh(new THREE.CylinderGeometry(1.0 * s, 1.55 * s, 1.5 * s, 26), MAT.hull3);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 3.4 * s;
    g.add(nose);
    // 鼻锥
    var cone = new THREE.Mesh(new THREE.ConeGeometry(1.0 * s, 0.9 * s, 24), MAT.darkMetal);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 4.6 * s;
    g.add(cone);
    // 太阳能绷带
    for (var i = 0; i < 2; i++) {
      var p = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 2.4 * s, 3.4 * s), MAT.solar);
      p.position.set((i ? 1 : -1) * 1.98 * s, 0, -2.6 * s);
      g.add(p);
    }
    // 推进器
    for (var k = 0; k < 4; k++) {
      var a = k / 4 * Math.PI * 2 + 0.6;
      box(g, MAT.darkMetal, 0.5 * s, 0.5 * s, 0.6 * s, Math.cos(a) * 1.7 * s, Math.sin(a) * 1.7 * s, -0.2 * s);
    }
    // 对接环
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.85 * s, 0.1 * s, 6, 24), MAT.metal);
    ring.position.z = 5.0 * s;
    g.add(ring);
    return g;
  }

  function cargoShip() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 5.2, 26), MAT.goldDim);
    body.rotation.x = Math.PI / 2;
    body.position.z = -1.0;
    body.castShadow = true;
    g.add(body);
    var aft = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 1.5, 2.2, 26), MAT.hull2);
    aft.rotation.x = Math.PI / 2;
    aft.position.z = -4.6;
    g.add(aft);
    // 推进舱
    var eng = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.6, 18), MAT.darkMetal);
    eng.rotation.x = Math.PI / 2;
    eng.position.z = -6.0;
    g.add(eng);
    var bell = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.0, 1.2, 16), MAT.black);
    bell.rotation.x = Math.PI / 2;
    bell.position.z = -6.9;
    g.add(bell);
    // 侧推进剂箱
    for (var i = 0; i < 4; i++) {
      var a = i / 4 * Math.PI * 2 + 0.4;
      var t = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), MAT.hull3);
      t.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, -4.4);
      g.add(t);
    }
    // 对接机构
    var dr = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.6, 20, 1, true), MAT.metal);
    dr.rotation.x = Math.PI / 2;
    dr.position.z = 1.8;
    g.add(dr);
    // 天线
    strut(V3(0, 2.1, -1.2), V3(0, 3.1, -1.2), 0.06, MAT.metal, g);
    dish(g, 0, 3.2, -1.2, 0, 0.65);
    return g;
  }

  /* ---------------- 装配站体 ---------------- */
  var TRUSS_Y = 3.4, TRUSS_Z = -9;

  // 中央桁架 S0
  var gTrussC = new THREE.Group();
  gTrussC.position.set(0, TRUSS_Y, TRUSS_Z);
  root.add(gTrussC);
  (function () {
    var s0 = trussSection(20, 1.85);
    gTrussC.add(s0);
    // 与节点舱的立柱
    strut(V3(0, -1.9, -6), V3(0, -TRUSS_Y - 1.2, -6), 0.3, MAT.truss, gTrussC);
    // 散热板
    radiator(gTrussC, -19.5, 0, -0.95);
    radiator(gTrussC, 19.5, 0, 0.95);
    // 机械臂
    roboticArm(gTrussC, 15.5, 1.9, 2.5);
    // 天线
    dish(gTrussC, -16.2, 2.0, 1.5, 0.4, 1.5);
    // 设备箱
    for (var i = 0; i < 9; i++) {
      var bx = rr(-8, 8);
      box(gTrussC, Math.random() > 0.5 ? MAT.gold : MAT.hull3, rr(0.6, 1.3), rr(0.4, 0.8), rr(0.6, 1.4), bx, 2.1, rr(-0.6, 0.6));
    }
  })();

  // 左 / 右舷桁架
  function mkWingTruss(sign) {
    var g = new THREE.Group();
    g.position.set(sign * 10, TRUSS_Y, TRUSS_Z);
    root.add(g);
    var sec = trussSection(38, 1.85);
    sec.position.x = sign * 19;
    g.add(sec);
    // 太阳翼：3 组，交错了正反
    var ids = [14, 26, 36];
    for (var i = 0; i < ids.length; i++) {
      var dir = (i % 2 === 0) ? 1 : -1;
      solarWing(g, sign * ids[i], 0, dir, (sign > 0 ? 1 : -1) * (0.16 + i * 0.05));
    }
    // 桁架端部设备
    box(g, MAT.gold, 1.4, 1.0, 1.0, sign * 37.5, 1.9, 0);
    dish(g, sign * 36.5, 2.2, -2.2, sign > 0 ? 0.6 : -0.6, 1.2);
    for (var k = 0; k < 8; k++) {
      box(g, Math.random() > 0.5 ? MAT.gold : MAT.hull3, rr(0.5, 1.1), rr(0.3, 0.7), rr(0.5, 1.2),
        sign * rr(12, 36), 2.0, rr(-1.1, 1.1));
    }
    return g;
  }
  var gTrussL = mkWingTruss(-1), gTrussR = mkWingTruss(1);

  // 模块链
  var MOD_Y = -2.4;

  var gGarage = new THREE.Group(); // 服务舱
  gGarage.position.set(0, MOD_Y, -24);
  root.add(gGarage);
  (function () {
    var m = mkModule(2.6, 12, MAT.hull2, { rings: 3, hatches: 1, windows: 1 });
    gGarage.add(m);
    // 后段金箔 + 发动机
    var aft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.6, 2.4, 26), MAT.gold);
    aft.rotation.x = Math.PI / 2;
    aft.position.z = -6.9;
    gGarage.add(aft);
    var bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 1.4, 18), MAT.black);
    bell.rotation.x = Math.PI / 2;
    bell.position.z = -8.7;
    gGarage.add(bell);
    // 尾部推进剂箱
    for (var i = 0; i < 4; i++) {
      var a = i / 4 * Math.PI * 2 + 0.8;
      var t = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), MAT.hull3);
      t.position.set(Math.cos(a) * 2.0, Math.sin(a) * 2.0, -6.6);
      gGarage.add(t);
    }
    // 尾部对接锥
    var dc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 1.1, 22, 1, true), MAT.metal);
    dc.rotation.x = Math.PI / 2;
    dc.position.z = 6.4;
    gGarage.add(dc);
    // 外部散热片
    for (var k = 0; k < 2; k++) {
      box(gGarage, MAT.white, 0.14, 3.4, 5.2, (k ? 1 : -1) * 2.62, 0, -1.5);
    }
  })();

  // 节点舱 A
  var gNodeA = new THREE.Group();
  gNodeA.position.set(0, MOD_Y, -16.6);
  root.add(gNodeA);
  (function () {
    gNodeA.add(mkNode(2.5, [
      { dir: V3(0, 0, 1) }, { dir: V3(0, 0, -1) }, { dir: V3(1, 0, 0) }, { dir: V3(0, -1, 0) }
    ]));
    // 侧面充气舱接口
    var col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.0, 20), MAT.hull3);
    col.rotation.z = Math.PI / 2;
    col.position.set(4.0, 0, 0);
    gNodeA.add(col);
  })();

  // 核心舱
  var gCore = new THREE.Group();
  gCore.position.set(0, MOD_Y, -9.4);
  root.add(gCore);
  (function () {
    gCore.add(mkModule(2.55, 10.4, MAT.hull, { rings: 4, hatches: 2, windows: 2, blankets: 4, goldPatch: true }));
    // 侧挂设备
    box(gCore, MAT.gold, 1.2, 1.6, 3.0, 2.5, -0.6, 1.4);
    box(gCore, MAT.white, 0.2, 2.2, 4.2, -2.6, 0.4, -1.0);
    dish(gCore, 0, 2.7, -2.4, 0, 1.0);
  })();

  // 节点舱 B
  var gNodeB = new THREE.Group();
  gNodeB.position.set(0, MOD_Y, -3.4);
  root.add(gNodeB);
  (function () {
    gNodeB.add(mkNode(3.0, [
      { dir: V3(0, 0, 1) }, { dir: V3(0, 0, -1) }, { dir: V3(1, 0, 0) }, { dir: V3(-1, 0, 0) }, { dir: V3(0, 1, 0) }
    ]));
    // 顶部连接到桁架的短柱
    var col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 20), MAT.hull3);
    col.position.set(0, 3.6, 0);
    gNodeB.add(col);
  })();

  // 主实验舱
  var gLab = new THREE.Group();
  gLab.position.set(0, MOD_Y, 5.0);
  root.add(gLab);
  (function () {
    gLab.add(mkModule(2.75, 13.6, MAT.hull3, { rings: 3, hatches: 1, windows: 3, blankets: 4 }));
    // 外部载荷平台
    box(gLab, MAT.darkMetal, 2.2, 0.3, 4.4, 0, -2.85, 1.2);
    for (var i = 0; i < 4; i++) {
      box(gLab, Math.random() > 0.5 ? MAT.gold : MAT.white, rr(0.5, 1.0), rr(0.5, 1.2), rr(0.5, 1.0), rr(-0.8, 0.8), -2.3, 1.2 + rr(-1.6, 1.6));
    }
    // 实验舱侧舷窗组
    for (var w = 0; w < 3; w++) {
      var g2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 14), MAT.glassLit);
      g2.rotation.z = Math.PI / 2;
      g2.position.set(2.76, 0.6, -3.2 + w * 2.2);
      gLab.add(g2);
    }
    dish(gLab, 0, 3.0, -4.2, 0, 1.1);
  })();

  // 节点舱 C
  var gNodeC = new THREE.Group();
  gNodeC.position.set(0, MOD_Y, 13.4);
  root.add(gNodeC);
  (function () {
    gNodeC.add(mkNode(2.8, [
      { dir: V3(0, 0, 1) }, { dir: V3(0, 0, -1) }, { dir: V3(0, -1, 0) }, { dir: V3(-1, 0, 0) }
    ]));
    // 前向对接适配器
    var ida = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 1.8, 22), MAT.metal);
    ida.rotation.x = Math.PI / 2;
    ida.position.z = 3.3;
    gNodeC.add(ida);
  })();

  // 实验舱乙（径向 +X）
  var gLabB = new THREE.Group();
  gLabB.position.set(7.6, MOD_Y, -3.4);
  root.add(gLabB);
  (function () {
    var g = new THREE.Group();
    g.rotation.z = Math.PI / 2;   // 轴向转为 X
    gLabB.add(g);
    g.add(mkModule(2.3, 9.2, MAT.hull2, { rings: 3, hatches: 1, windows: 2 }));
    // 外部暴露平台
    box(g, MAT.darkMetal, 3.0, 2.4, 0.26, 0, 2.0, 2.2);
    for (var i = 0; i < 3; i++) box(g, MAT.gold, 0.8, 0.8, 0.5, rr(-1, 1), 1.6, 2.3);
    // 小型机械臂
    cyl(g, MAT.hull3, 0.16, 3.6, -1.9, 1.6, 2.0, 10).rotation.z = 0.9;
  })();

  // 气闸舱（径向 -X）
  var gAirlock = new THREE.Group();
  gAirlock.position.set(-6.4, MOD_Y, -3.4);
  root.add(gAirlock);
  (function () {
    var g = new THREE.Group();
    g.rotation.z = -Math.PI / 2;
    gAirlock.add(g);
    g.add(mkModule(2.05, 7.0, MAT.hull2, { rings: 2, hatches: 0, windows: 0 }));
    // 舱门
    var door = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.5, 20), MAT.dark);
    door.position.set(0, 3.5, 0);
    g.add(door);
    var dr = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.1, 6, 24), MAT.metal);
    dr.rotation.x = Math.PI / 2;
    dr.position.set(0, 3.7, 0);
    g.add(dr);
    // 高压气瓶
    for (var i = 0; i < 2; i++) {
      var t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14), MAT.white);
      t.rotation.x = Math.PI / 2;
      t.position.set((i ? 1 : -1) * 1.6, 0, -1.0);
      g.add(t);
    }
  })();

  // 观测穹顶（节点 C 天底）
  var gCupola = new THREE.Group();
  gCupola.position.set(0, MOD_Y - 3.2, 13.4);
  root.add(gCupola);
  (function () {
    var g = new THREE.Group();
    g.rotation.x = Math.PI;      // 朝下
    gCupola.add(g);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.5, 24), MAT.hull3);
    base.position.y = 0.0;
    g.add(base);
    // 七窗圆顶
    var domeR = 1.62;
    var dome = new THREE.Mesh(new THREE.SphereGeometry(domeR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.hull3);
    dome.position.y = 0.72;
    g.add(dome);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.12), MAT.glassLit);
      win.position.set(Math.cos(a) * 1.32, 1.12, Math.sin(a) * 1.32);
      win.rotation.y = -a + Math.PI / 2;
      win.rotation.x = -0.42;
      g.add(win);
      // 窗框
      var fr = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.92, 0.08), MAT.metal);
      fr.position.set(Math.cos(a) * 1.30, 1.10, Math.sin(a) * 1.30);
      fr.rotation.y = -a + Math.PI / 2;
      fr.rotation.x = -0.42;
      g.add(fr);
    }
    var top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 18), MAT.glassLit);
    top.position.y = 1.86;
    g.add(top);
    var tr = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.08, 6, 22), MAT.metal);
    tr.rotation.x = Math.PI / 2;
    tr.position.y = 1.92;
    g.add(tr);
  })();

  // 充气舱（节点 A 径向 +X）
  var gInflate = new THREE.Group();
  gInflate.position.set(7.0, MOD_Y, -16.6);
  root.add(gInflate);
  (function () {
    var g = new THREE.Group();
    g.rotation.z = Math.PI / 2;
    gInflate.add(g);
    var shell = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.6, 22), M('#b9bfc4', null, { rough: 0.9, metal: 0.03, env: 0.2 }));
    g.add(shell);
    // 充气褶皱
    for (var i = 0; i < 7; i++) {
      var r = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.07, 5, 26), MAT.hull3);
      r.rotation.x = Math.PI / 2;
      r.position.y = -2.1 + i * 0.7;
      g.add(r);
    }
    var hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.7, 18), MAT.metal);
    hatch.position.y = 2.5;
    g.add(hatch);
  })();

  // 货运飞船
  var gCargo = new THREE.Group();
  gCargo.position.set(0, MOD_Y, -32.4);
  root.add(gCargo);
  gCargo.add(cargoShip());

  // 乘员飞船
  var gCrew = new THREE.Group();
  gCrew.position.set(0, MOD_Y, 19.6);
  root.add(gCrew);
  gCrew.add(crewShip(1.0));

  /* ---------------- 拆解系统 ---------------- */
  var PARTS = [];
  function defPart(group, name, en, spec, off) {
    var p = {
      group: group, name: name, en: en, spec: spec,
      dock: group.position.clone(), off: off.clone().multiplyScalar(0.64),
      t: 0, target: 0, hover: false, sel: false, bbox: null,
      line: null
    };
    group.userData.part = p;
    // 拆解引导线
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    var lm = new THREE.LineBasicMaterial({ color: C('#69d2ff'), transparent: true, opacity: 0, depthWrite: false });
    var line = new THREE.Line(lg, lm);
    line.frustumCulled = false;
    root.add(line);
    p.line = line;
    PARTS.push(p);
    return p;
  }

  defPart(gTrussL, '左舷桁架', 'PORT TRUSS P1–P6', '38 m 复合桁架 · 3 组太阳翼 · 结构主梁', V3(-44, 0, 0));
  defPart(gTrussR, '右舷桁架', 'STARBOARD TRUSS S1–S6', '38 m 复合桁架 · 3 组太阳翼 · 散热回路', V3(44, 0, 0));
  defPart(gTrussC, '中央桁架', 'CORE TRUSS S0', '20 m 桁架 · 双散热板 · 遥控机械臂', V3(0, 34, 0));
  defPart(gGarage, '服务舱', 'SERVICE MODULE', '12 m 加压舱 · 主推进 · 姿控推进剂', V3(0, 0, -26));
  defPart(gCargo, '货运飞船', 'CARGO FREIGHTER', '推进剂补给 · 干货运送 · 自主对接', V3(0, 0, -30));
  defPart(gNodeA, '节点舱 A', 'NODE A', '六向节点 · 充气舱接口 · 过渡通道', V3(-30, -16, -14));
  defPart(gCore, '核心舱', 'CORE MODULE', '10.4 m 加压舱 · 生命保障 · 居住区', V3(26, 18, -6));
  defPart(gNodeB, '节点舱 B', 'NODE B', '四向节点 · 桁架连接 · 气闸通道', V3(0, 0, 4));
  defPart(gLab, '主实验舱', 'PRIMARY LABORATORY', '13.6 m 实验舱 · 外部载荷平台 · 3 舷窗', V3(0, 0, 18));
  defPart(gNodeC, '节点舱 C', 'NODE C', '前向对接口 · 天底观测穹顶 · 气闸侧口', V3(0, 0, 30));
  defPart(gLabB, '实验舱乙', 'LAB B · EXPOSED FACILITY', '9.2 m 径向舱 · 暴露实验平台', V3(30, 0, 0));
  defPart(gAirlock, '气闸舱', 'AIRLOCK', '7 m 出舱气闸 · 双高压气瓶', V3(-28, 0, 0));
  defPart(gCupola, '观测穹顶', 'CUPOLA', '七窗穹顶 · 对地观测 · 机械臂操作位', V3(0, -26, 6));
  defPart(gInflate, '充气舱', 'INFLATABLE HAB', '4.6 m 软壳舱 · 展开式居住空间', V3(30, 0, -14));
  defPart(gCrew, '乘员飞船', 'CREW VEHICLE', '4 人往返 · 应急撤离 · 前向对接', V3(0, 0, 34));

  // 计算包围盒（用于 HUD 取景框）
  PARTS.forEach(function (p) {
    p.bbox = new THREE.Box3().setFromObject(p.group);
  });

  /* ---------------- HUD ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    '#hud{position:fixed;inset:0;pointer-events:none;font-family:"Microsoft YaHei",system-ui,sans-serif;color:#dff1ff;}',
    '#hud .mono{font-family:Consolas,"SF Mono",monospace;}',
    '#brand{position:absolute;left:34px;top:30px;letter-spacing:0.5px;}',
    '#brand b{display:block;font-size:26px;font-weight:500;letter-spacing:14px;text-shadow:0 0 22px rgba(90,170,255,.45);}',
    '#brand i{display:block;margin-top:7px;font-style:normal;font-size:9px;letter-spacing:5px;opacity:.5;}',
    '#tele{position:absolute;left:34px;top:104px;font-size:10px;letter-spacing:2.4px;opacity:.55;line-height:2.1;}',
    '#tele em{font-style:normal;color:#7fd4ff;opacity:.95;}',
    '#idx{position:absolute;right:34px;top:30px;width:230px;text-align:right;pointer-events:auto;}',
    '#idx .hd{font-size:9px;letter-spacing:4px;opacity:.42;margin-bottom:10px;}',
    '#idx .it{position:relative;font-size:11.5px;letter-spacing:1.6px;opacity:.55;padding:4.5px 0;cursor:pointer;transition:.22s;display:grid;grid-template-columns:26px 1fr;column-gap:10px;align-items:baseline;}',
    '#idx .it b{font-weight:400;text-align:right;}',
    '#idx .it span{font-size:8.5px;letter-spacing:1px;opacity:.55;}',
    '#idx .it:before{content:"";position:absolute;right:-34px;top:50%;width:22px;height:1px;background:#7fd4ff;opacity:0;transition:.22s;}',
    '#idx .it:hover,#idx .it.on{opacity:1;}',
    '#idx .it:hover:before,#idx .it.on:before{opacity:.75;right:-14px;}',
    '#idx .it.on{color:#9fe2ff;}',
    '#info{position:absolute;left:34px;bottom:96px;max-width:330px;text-shadow:0 2px 14px rgba(0,0,0,.85),0 0 30px rgba(0,0,0,.6);opacity:0;transform:translateY(7px);transition:.32s;}',
    '#info.on{opacity:1;transform:none;}',
    '#info .n{font-size:19px;letter-spacing:3px;}',
    '#info .e{font-size:8.5px;letter-spacing:3px;opacity:.5;margin-top:5px;}',
    '#info .s{font-size:11px;letter-spacing:1.2px;opacity:.62;margin-top:9px;line-height:1.9;border-left:1px solid rgba(127,212,255,.35);padding-left:11px;}',
    '#info .st{font-size:9.5px;letter-spacing:2px;margin-top:9px;color:#7fd4ff;opacity:.85;}',
    '#foot{position:absolute;left:50%;transform:translateX(-50%);bottom:28px;font-size:10.5px;letter-spacing:2.6px;opacity:.4;white-space:nowrap;}',
    '#tools{position:absolute;right:34px;bottom:26px;display:flex;gap:22px;pointer-events:auto;}',
    '#tools div{font-size:10.5px;letter-spacing:2.4px;opacity:.45;cursor:pointer;transition:.2s;padding-bottom:4px;border-bottom:1px solid transparent;}',
    '#tools div:hover{opacity:1;border-bottom-color:rgba(127,212,255,.6);}',
    '#tools div.on{opacity:1;color:#9fe2ff;border-bottom-color:#7fd4ff;}',
    '#lbl{position:absolute;font-size:11px;letter-spacing:2px;color:#cdeeff;opacity:0;transition:opacity .16s;white-space:nowrap;transform:translate(-50%,-50%);text-shadow:0 0 14px rgba(0,0,0,.9),0 0 6px rgba(80,180,255,.5);}',
    '#lbl b{font-weight:400;}',
    '#lbl i{font-style:normal;font-size:8px;letter-spacing:1.6px;opacity:.55;margin-left:7px;}'
  ].join('');
  document.head.appendChild(css);

  var hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML =
    '<div id="brand"><b>天穹</b><i>TIANQIONG ORBITAL STATION</i></div>' +
    '<div id="tele" class="mono">ALT <em>408</em> KM &nbsp;/&nbsp; INC <em>51.6</em>&deg; &nbsp;/&nbsp; V <em>7.66</em> KM/S<br>' +
    'MASS <em>419</em> T &nbsp;/&nbsp; CREW <em>7</em> &nbsp;/&nbsp; PWR <em>84</em> KW</div>' +
    '<div id="idx"><div class="hd">STRUCTURE / 15 部件</div></div>' +
    '<div id="info"><div class="n"></div><div class="e"></div><div class="s"></div><div class="st"></div></div>' +
    '<div id="foot">拖拽环视 · 滚轮缩放 · 点击部件拆解 / 再点装回</div>' +
    '<div id="tools"><div id="tAll">展开结构</div><div id="tRot" class="on">自动旋转</div><div id="tGlb">导出 GLB</div></div>' +
    '<div id="lbl"></div>';
  document.body.appendChild(hud);

  var idxEl = document.getElementById('idx');
  var infoEl = document.getElementById('info');
  var lblEl = document.getElementById('lbl');

  PARTS.forEach(function (p, i) {
    var d = document.createElement('div');
    d.className = 'it';
    d.innerHTML = '<span class="mono">' + ('0' + (i + 1)).slice(-2) + '</span><b>' + p.name + '</b>';
    d.addEventListener('mouseenter', function () { p.hover = true; });
    d.addEventListener('mouseleave', function () { p.hover = false; });
    d.addEventListener('click', function () { togglePart(p); focusPart(p); });
    p.el = d;
    idxEl.appendChild(d);
  });

  /* ---------------- 交互 ---------------- */
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2(-2, -2);
  var hovering = null, pressed = null, needPick = false;
  var downX = 0, downY = 0, downT = 0;
  var camTween = null;
  var allOpen = false;

  function pointerToNDC(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function pick() {
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObject(root, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      while (o) { if (o.userData && o.userData.part) return o.userData.part; o = o.parent; }
    }
    return null;
  }

  renderer.domElement.addEventListener('pointermove', function (e) {
    pointerToNDC(e);
    needPick = true;
  });
  renderer.domElement.addEventListener('pointerdown', function (e) {
    downX = e.clientX; downY = e.clientY; downT = performance.now();
    pointerToNDC(e);
    pressed = pick();
  });
  renderer.domElement.addEventListener('pointerup', function (e) {
    var dx = e.clientX - downX, dy = e.clientY - downY;
    if (dx * dx + dy * dy < 42 && performance.now() - downT < 620) {
      pointerToNDC(e);
      var p = pick();
      if (p) { togglePart(p); if (p.target > 0) focusPart(p); }
      else if (pressed === null) { toggleAll(); }
    }
    pressed = null;
  });
  renderer.domElement.addEventListener('pointerleave', function () { pointer.set(-2, -2); needPick = true; });

  function togglePart(p) {
    p.target = p.target > 0.5 ? 0 : 1;
    PARTS.forEach(function (q) { if (q !== p) q.sel = false; });
    p.sel = p.target > 0.5;
    if (p.target > 0.5) { showInfo(p); markIndex(p); }
    else { hideInfo(); markIndex(null); }
    allOpen = PARTS.every(function (q) { return q.target > 0.5; });
    document.getElementById('tAll').classList.toggle('on', allOpen);
  }

  function toggleAll() {
    allOpen = !allOpen;
    PARTS.forEach(function (p, i) {
      p.target = allOpen ? 1 : 0;
      p.delay = i * 0.05;
    });
    document.getElementById('tAll').classList.toggle('on', allOpen);
    document.getElementById('tAll').textContent = allOpen ? '合拢结构' : '展开结构';
    if (!allOpen) { hideInfo(); markIndex(null); }
    fitAll(allOpen);
    autoRotate = !allOpen;
    document.getElementById('tRot').classList.toggle('on', autoRotate);
  }

  function showInfo(p) {
    infoEl.querySelector('.n').textContent = p.name;
    infoEl.querySelector('.e').textContent = p.en;
    infoEl.querySelector('.s').textContent = p.spec;
    infoEl.querySelector('.st').textContent = p.target > 0.5 ? '● 已分离 · 点击装回' : '● 已对接';
    infoEl.classList.add('on');
  }
  function hideInfo() { infoEl.classList.remove('on'); }
  function markIndex(p) {
    PARTS.forEach(function (q) { q.el.classList.toggle('on', q === p); });
  }

  function focusPart(p) {
    var c = p.bbox.getCenter(new THREE.Vector3());
    c.addScaledVector(p.off, p.target > 0.5 ? 1 : 0);
    var size = p.bbox.getSize(new THREE.Vector3()).length();
    var dist = clamp(size * 1.55, 34, 190);
    var dir = camera.position.clone().sub(controls.target).normalize();
    camTween = {
      start: performance.now(), dur: 1150,
      p0: camera.position.clone(), p1: c.clone().addScaledVector(dir, dist),
      t0: controls.target.clone(), t1: c
    };
  }

  function fitAll(open) {
    var box = new THREE.Box3();
    var tmpC = new THREE.Vector3(), tmpS = new THREE.Vector3();
    PARTS.forEach(function (p) {
      p.bbox.getCenter(tmpC); p.bbox.getSize(tmpS);
      tmpC.addScaledVector(p.off, open ? 1 : 0);
      tmpS.multiplyScalar(0.5);
      box.expandByPoint(tmpC.clone().sub(tmpS));
      box.expandByPoint(tmpC.clone().add(tmpS));
    });
    var center = box.getCenter(new THREE.Vector3());
    var radius = box.getSize(new THREE.Vector3()).length() * 0.5;
    var fovV = THREE.MathUtils.degToRad(camera.fov * 0.5);
    var fovH = Math.atan(Math.tan(fovV) * camera.aspect);
    var dist = radius / Math.sin(Math.min(fovV, fovH)) * 0.62;
    var dir = center.clone().sub(camera.position).normalize();
    camTween = {
      start: performance.now(), dur: 1500,
      p0: camera.position.clone(), p1: center.clone().addScaledVector(dir, -dist),
      t0: controls.target.clone(), t1: center
    };
  }

  // HUD 取景框
  var bracket = (function () {
    var g = new THREE.BufferGeometry();
    var v = [];
    var s = 1; // 单位立方体角部线段
    var c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    var segs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    segs.forEach(function (sg) {
      var a = c[sg[0]], b = c[sg[1]];
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var f = 0.26;
      v.push(a[0] * s, a[1] * s, a[2] * s);
      v.push(a[0] * s + dx * f, a[1] * s + dy * f, a[2] * s + dz * f);
      v.push(b[0] * s, b[1] * s, b[2] * s);
      v.push(b[0] * s - dx * f, b[1] * s - dy * f, b[2] * s - dz * f);
    });
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    var m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: C('#8fe4ff'), transparent: true, opacity: 0, depthTest: false, depthWrite: false
    }));
    m.frustumCulled = false;
    m.renderOrder = 999;
    scene.add(m);
    return m;
  })();

  /* ---------------- 动效 ---------------- */
  var clock = new THREE.Clock();
  var tAcc = 0;

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    tAcc += dt;

    // 相机缓动
    if (camTween) {
      var k = clamp((performance.now() - camTween.start) / camTween.dur, 0, 1);
      var e = easeInOut(k);
      camera.position.lerpVectors(camTween.p0, camTween.p1, e);
      controls.target.lerpVectors(camTween.t0, camTween.t1, e);
      if (k >= 1) camTween = null;
    }

    // 拆解 / 装配
    PARTS.forEach(function (p) {
      if (p.delay > 0) { p.delay -= dt; return; }
      var sp = p.target > p.t ? 3.2 : 4.2;
      p.t += (p.target - p.t) * Math.min(1, dt * sp);
      if (Math.abs(p.target - p.t) < 0.0015) p.t = p.target;
      var e = p.t * p.t * (3 - 2 * p.t);
      p.group.position.copy(p.dock).addScaledVector(p.off, e);
      // 分离后缓慢起伏，读起来像悬浮
      if (p.t > 0.02) {
        p.group.position.y += Math.sin(tAcc * 0.55 + p.off.x * 0.1) * 0.28 * p.t;
        p.group.rotation.y = Math.sin(tAcc * 0.18 + p.off.z * 0.05) * 0.05 * p.t;
      } else {
        p.group.rotation.y = 0;
      }
      // 引导线
      if (p.t > 0.02) {
        var arr = p.line.geometry.attributes.position.array;
        arr[0] = p.dock.x; arr[1] = p.dock.y; arr[2] = p.dock.z;
        arr[3] = p.group.position.x; arr[4] = p.group.position.y; arr[5] = p.group.position.z;
        p.line.geometry.attributes.position.needsUpdate = true;
        p.line.material.opacity = 0.10 * p.t;
        p.line.visible = true;
      } else { p.line.visible = false; }
    });

    // 太阳翼缓慢转动（β 万向节）
    WING_GROUPS.forEach(function (g, i) {
      g.rotation.x = Math.sin(tAcc * 0.045 + i * 1.7) * 0.55 + 0.1;
    });

    // 地球自转 + 云层
    earth.mesh.rotation.y += dt * 0.0035;
    earth.mat.uniforms.uTime.value = tAcc;

    // 悬停拾取（限频）
    if (needPick) {
      needPick = false;
      var hp = pick();
      hovering = hp;
      renderer.domElement.style.cursor = hp ? 'pointer' : 'grab';
      if (hp && hp.target < 0.5) showInfo(hp);
      else if (hp && hp.target > 0.5) showInfo(hp);
    }

    // 取景框 + 标签
    var focus = hovering || PARTS.find(function (p) { return p.sel; }) || null;
    if (focus) {
      var c = focus.bbox.getCenter(new THREE.Vector3()).addScaledVector(focus.off, focus.t);
      var s = focus.bbox.getSize(new THREE.Vector3());
      bracket.position.copy(c);
      bracket.scale.set(s.x * 0.6 + 0.6, s.y * 0.6 + 0.6, s.z * 0.6 + 0.6);
      bracket.material.opacity += ((hovering === focus ? 0.55 : 0.32) - bracket.material.opacity) * 0.15;
      // 标签
      var v = c.clone().project(camera);
      if (v.z < 1) {
        lblEl.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        lblEl.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight - 46) + 'px';
        lblEl.innerHTML = '<b>' + focus.name + '</b><i>' + focus.en + '</i>';
        lblEl.style.opacity = '0.92';
      } else lblEl.style.opacity = '0';
    } else {
      bracket.material.opacity += (0 - bracket.material.opacity) * 0.12;
      lblEl.style.opacity = '0';
    }

    // 索引高亮
    PARTS.forEach(function (p) {
      if (p.hover) { p.el.classList.add('on'); } else if (!p.sel) { p.el.classList.remove('on'); }
    });

    controls.autoRotate = autoRotate && !hovering && !camTween;
    controls.update();

    renderer.setRenderTarget(post.rt);
    renderer.clear();
    renderer.render(scene, camera);
    post.render(tAcc);
  }

  /* ---------------- 顶栏 / 按钮 ---------------- */
  var autoRotate = true;
  document.getElementById('tRot').addEventListener('click', function () {
    autoRotate = !autoRotate;
    this.classList.toggle('on', autoRotate);
  });
  document.getElementById('tAll').addEventListener('click', function () { toggleAll(); });

  document.getElementById('tGlb').addEventListener('click', function () {
    var el = this;
    var oldState = PARTS.map(function (p) { return [p.t, p.target, p.group.position.clone()]; });
    PARTS.forEach(function (p) {
      p.t = 0; p.target = 0; p.delay = 0;
      p.group.position.copy(p.dock);
      p.group.rotation.y = 0;
      p.line.visible = false;
    });
    el.textContent = '导出中…';
    try {
      var exporter = new THREE.GLTFExporter();
      exporter.parse(root, function (buf) {
        var blob = new Blob([buf], { type: 'model/gltf-binary' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tianqiong_station.glb';
        a.click();
        el.textContent = '导出 GLB';
        oldState.forEach(function (s, i) {
          PARTS[i].t = s[0]; PARTS[i].target = s[1];
          PARTS[i].group.position.copy(s[2]);
        });
      }, { binary: true, onlyVisible: true });
    } catch (err) {
      console.error(err);
      el.textContent = '导出失败';
    }
  });

  /* ---------------- 启动 ---------------- */
  function onResize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    post.setSize(W * PR, H * PR);
  }
  window.addEventListener('resize', onResize);
  onResize();
  post.setSize(W * PR, H * PR);

  var loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';

  animate();

  // 开场：从远处缓缓推近
  camera.position.set(210, 120, 250);
  camTween = {
    start: performance.now(), dur: 2600,
    p0: new THREE.Vector3(196, 176, 232), p1: new THREE.Vector3(88, 82, 104),
    t0: new THREE.Vector3(0, 0, 0), t1: new THREE.Vector3(0, 1, -5)
  };

  window.STATION = {
    parts: PARTS, camera: camera, controls: controls, scene: scene, earth: earth, maps: earthMaps,
    setView: function (px, py, pz, tx, ty, tz) {
      camera.position.set(px, py, pz);
      controls.target.set(tx || 0, ty || 0, tz || 0);
      controls.update();
    },
    toggleAll: function () { toggleAll(); }
  };
})();
