# 写实感设计指南（电影级场景）

低多边形风格靠"造型"打动人，写实风格靠**光、材质、色彩空间、镜头**打动人。
同样的几何体，做完这 8 件事就会从"玩具"变成"照片"。

本指南配套模板：`templates/sea_island_app.js`（海风小岛：黄昏海面 + 棕榈 + 木屋 + 月光柱）。

---

## 0. 先定风格档位，再动手

| 档位 | 判断依据 | 特征 |
|---|---|---|
| 卡通/低多边形 | 用户要"清爽""可爱""像月华墅" | 平光、纯色、无反射、无泛光 |
| 写实电影感 | 用户要"真实""有氛围""像实拍/短剧画面" | 强对比、太阳/月光路径、反射、雾、暗角、颗粒 |

不确定时按「写实电影感」做，再回退。写实档必须启用下面 1、2、3、4、7。

---

## 1. 色彩空间：最容易毁掉整张图的一步

Three.js r128 的 `renderer.outputEncoding` 决定输出，**颜色贴图与手写 shader 的色值空间必须一致**。

本项目管线：
1. `renderer.outputEncoding = THREE.LinearEncoding`（不做自动编码）
2. 场景渲染到 HalfFloat RT（线性空间）
3. 后处理里做 ACES 色调映射 → 线性转 sRGB（`pow(1/2.2)`）

因此**所有 hex 色值都要转线性**再喂给 shader / 材质：

```js
function C(hex){ return new THREE.Color(hex).convertSRGBToLinear(); }
```

- ✅ `new THREE.MeshStandardMaterial({ color: C('#6f8a3c') })`
- ✅ `uTop: { value: C('#2a2a52') }`
- ✅ 顶点色数组也用 `C()` 算好再写 BufferAttribute
- ❌ `new THREE.Color('#2a2a52')` 直接进 shader → 整体发灰发白（因为 0.5 被当成线性值，ACES+gamma 后约 0.73）
- 贴图：`tex.encoding = THREE.sRGBEncoding`（Canvas 贴图默认线性，显式设）

**症状对照**：整张图"像蒙了一层灰/奶白"、颜色饱和度上不去 → 十有八九是色彩空间错了，不是调色的事。

---

## 2. 天空：不要用纯色/渐变背景，写一个天空球 shader

写实天空 = 垂直三段渐变 + 太阳散射 + 地平线雾带 + 云层 + 星空。

```js
// 球体半径 2000+，side: BackSide, depthWrite:false, fog:false
// fragment 核心（逐段叠加）：
vec3 d = normalize(vWorld - cameraPosition);
float y = clamp(d.y, 0.0, 1.0);
float t = pow(y, 0.42);                        // 非线性，地平线附近压缩
vec3 col = mix(uHor, uMid, smoothstep(0.0,0.30,t));
col = mix(col, uTop, smoothstep(0.22,1.0,t));

float sdot = max(dot(d, normalize(uSunDir)), 0.0);
col += uSunCol * pow(sdot, 6.0)  * 0.30 * max(sd.y+0.35, 0.0) * uGlowK; // 大范围散射
col += uSunCol * pow(sdot, 70.0) * 0.75 * uGlowK;                        // 近日光晕
col += uSunCol * pow(sdot, 2.2)  * exp(-y*11.0) * 0.85 * uGlowK;         // 地平线逆光辉光（黄昏关键）
col += uSunCol * pow(sdot, 9000.0) * 14.0;                               // 日/月盘
col = mix(col, uHor, pow(1.0-y, 18.0) * 0.75);                           // 地平线雾带
```

要点：
- **夜晚必须衰减辉光**：`uGlowK = 1 - 0.82*night`，否则月亮会把整片天照亮成白天
- 云：`fbm2(方向投影)`，两张不同频率叠加 + 一条 `exp(-((y-0.05)*7)^2)` 的地平线云带，阈值取 `smoothstep(0.50, 1.02, dens)`（阈值设高到 0.6+ 云会完全不出现）
- 云的受光面用 `uSunCol`，背光面用 `uTop*0.55`，逆光时天然产生"暗云压边"
- 星空：`hash(floor(dir.xz/(dir.y+0.22)*26))`，`smoothstep(0.9972,0.9999,s)` 出点，加 twinkle
- 天空球要 `frustumCulled = false`

---

## 3. 水面：写实感的第一功臣

不要用 `MeshStandardMaterial` 平铺一块水——没有反射和光路，永远是"塑料板"。

### 3.1 结构
1. 大平面（4000+，200 段），只做轻微顶点位移（0.3~0.5 振幅）
2. **法线在片元里算**：多方向正弦叠加，用有限差分求导
3. **平面反射**：镜像相机渲染到半分辨率 RT，水面按世界坐标投影采样
4. 菲涅尔混合「水色 ↔ 反射」
5. 太阳/月亮高光 + 走向镜头的**光带**（这是参考画面里最抓眼的元素）

```glsl
// 法线：距离越远越平（避免摩尔纹）
float slopeK = 1.0/(1.0 + distC*0.012);
float eps    = 0.35 + distC*0.02;
vec3 N = normalize(vec3(-(hx-h0)/eps*0.55*slopeK, 1.0, -(hz-h0)/eps*0.55*slopeK));

float fres = mix(0.02, 1.0, pow(1.0 - max(dot(N,V),0.0), 5.0));
vec3 col = mix(base, refl, clamp(fres*1.15, 0.0, 0.92));

// 光带
vec3 H = normalize(L+V);
float spec     = pow(max(dot(N,H),0.0), 420.0);   // 硬高光
float glitter  = pow(max(dot(N,H),0.0), 26.0)*0.35; // 中间层
col += uSunCol*(spec*2.6 + glitter);
```

### 3.2 平面反射（简版 Reflector）
```js
reflCam.position.set(cam.x, -cam.y, cam.z);              // 水面 y=0
reflCam.up.set(0,1,0);
reflCam.lookAt(target.x, -target.y, target.z);
texMat.set(0.5,0,0,0.5, 0,0.5,0,0.5, 0,0,0.5,0.5, 0,0,0,1)
      .multiply(reflCam.projectionMatrix)
      .multiply(reflCam.matrixWorldInverse);
// 渲染前：water.visible = false; renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0,1,0), 0)]
// 渲染后复位。纹理矩阵要在 shader 里用 vWorld 投影取 uv。
```
扰动 `ruv += N.xz*0.02` 就够，加太多会出现"沙点"噪斑。

### 3.3 水深：用高度图，别用"到岛心距离"
把地形高度函数烘成 384×384 `DataTexture`（覆盖 ±170m），水面 shader 里采样得到真实水深：

```glsl
float depthAt(vec2 p){
  vec2 uv = p/uSpan + 0.5;
  if(uv.x<0.002||uv.x>0.998||uv.y<0.002||uv.y>0.998) return 40.0;
  return -(texture2D(uHeight, uv).r*40.0 - 24.0);
}
float shallow = exp(-depth*0.16);          // 浅滩系数
vec3 base = mix(uDeep, uShallow, shallow); // 深蓝 ↔ 青绿
float alpha = mix(0.42, 0.99, 1.0-shallow);// 浅处半透明，看得见沙
```
- 白沫只出现在 `depth < 1.1` 的窄带里，并用 `depth` 的正弦做"浪线" + 噪声打碎，
  **不要**做成等宽的一圈白环（那是浴缸，不是海）
- 远处水面必须收敛到「天空地平线色」，否则海天线会出现一条黑带：
  `uFog = p.hor * 0.94`，`uFogDen ≈ 0.00075`

---

## 4. 光照与阴影

- 主光 `DirectionalLight`：位置 = 太阳方向 × 250~300，`castShadow`
- `shadow.mapSize = 2048`，正交范围贴紧主体（±95），`normalBias ≈ 1.0`（小物体上 0.5 会有阴影痤疮/棋盘格）
- `HemisphereLight` 撑环境光：`color = 天空中间色`，`groundColor = 地面反射色`
- 逆光场景（黄昏）：主体天然是剪影，别指望它亮；靠**轮廓 + 反射 + 窗光**讲信息
- 室内/灯笼用 `PointLight` + `emissive` 材质，黄昏后自动点亮（`hour > 17.4`）

---

## 5. 后处理（不用 addons，自己写 4 个 pass）

r128 的 `three.min.js` 不含 postprocessing addon，但全屏 pass 只需 60 行：

1. 场景 → `sceneRT`（HalfFloat）
2. 亮部提取 → 1/2 分辨率（`smoothstep(th, th*2.2, luma)`）
3. 横向高斯 → 4. 纵向高斯（9 tap，可用 3 个采样近似）
5. 合成：`scene + bloom*strength` → 曝光 → **ACES** → 分级（暖高光/冷阴影）→ 暗角 → 颗粒 → `pow(1/2.2)`

```glsl
vec3 aces(vec3 x){ float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
col = mix(col, col*vec3(1.07,1.0,0.92), uWarm*smoothstep(0.32,1.0,luma));  // 暖高光
col = mix(col, col*vec3(0.90,0.97,1.10), (1.0-uWarm*0.6)*smoothstep(0.42,0.0,luma)); // 冷阴影
col *= mix(1.0, smoothstep(1.30,0.30,length(uv-0.5)*1.55), uVig);           // 暗角
```
颗粒 `0.010~0.015` 足够，超过 0.02 就成了噪点。色差只做边缘（`d*r2*0.010`）。

**降级**：HalfFloat RT 创建失败时直接 `renderer.render(scene, camera)`（模板里有 try/catch）。

---

## 6. 棕榈（最容易做成"扫把"的植物）

```
树干：9 段圆柱沿 CatmullRom 曲线串起来（正弦弯曲 + 略侧倾），半径 0.62 → 0.24
      纹理用"环纹"canvas（每 9px 一圈暗环 + 一圈亮边），repeat(2,1)
冠  ：20~25 片长叶 + 7 片内层新叶 + 6 片枯叶裙
叶片：自定义 BufferGeometry 3 顶点截面（左缘/中肋/右缘）× 14 段，
      长度 5.4，宽 0.82，沿 +X 生长、Y 向下垂（droop 0.62*t²）
贴图：羽状小叶画成**纯白不透明**多边形 + 中肋，alphaTest 0.42~0.5
      用半透明渐变画小叶会被 alphaTest 裁光（只剩零星点）
摆动：每片叶 rotation.z = base + sin(t*sp + phase)*amp（amp 0.03~0.1）
```

**踩坑**：alphaTest 阈值与贴图 alpha 必须匹配。如果叶子"整片消失"，先
`alphaTest = 0.02` 验证，再回去把贴图画实。

---

## 7. 地形与沙滩

- 高度场：`mound = H*exp(-(r/R)^p)`，p 取 2.5 左右最自然（p 太大 = 圆盘）
- 加 2~3 个方向性起伏（沙丘脊、礁石岬），用 `exp(-((r-r0)/w)^2) * max(0,cos(ang-a))`
- 顶点色按高度分段：水下沙 → 湿沙 → 干沙 → 草 → 岩，段间 `smoothstep` 过渡
- 湿沙带是写实关键：水线附近 1~2px 深褐色，比白沫更可信
- 草用 `InstancedMesh`（三面交叉平面 + alphaTest 贴图），900~1400 个，
  用 `fbm > 0.42` 打洞，露出沙斑，避免"草坪地毯"
- 岩石：Icosahedron 细分 1 次 + 顶点乘噪声 + `y*=0.72` 压扁 + flatShading
---

## 8. 远山 / 空气透视（最容易被看出"假"的地方）

远山是写实场景的照妖镜。三种做法，按可信度排序：

| 做法 | 结果 |
| --- | --- |
| 一堆圆锥/棱锥堆在远处 | 剪纸感，一眼假 |
| 一张 PlaneGeometry 挤出折线剪影 | 平顶台地，没有纵深 |
| **高度场条带**（推荐） | 有山脊、有前后斜面、有前后层次 |

高度场条带的做法：

~~~js
// 1D 山脊剖面：三级 fbm 叠加，两端收口
function ridgeProfile(t, seed) {
  var p = Math.pow(fbm(t * 4.2 + seed, 1.7), 1.5) * 1.55
        + 0.32 * fbm(t * 11 + seed * 2.3, 4.1)
        + 0.13 * fbm(t * 27 + seed * 3.7, 7.9);
  var edge = Math.min(1, Math.min(t, 1 - t) * 7);   // 两端收口，避免齐边
  return Math.max(0.03, p * (0.35 + 0.65 * edge));
}
// 2D：z 方向用 (1-|zz|)^0.62 让山体前后塌成斜面（这是体量感的来源）
var hh = h * ridgeProfile(u, seed) * Math.pow(1 - Math.abs(zz), 0.62);
~~~

颜色**必须逐时段重算**，不能写死。空气透视的规律：

- 山脚 = 当前地平线色（p.hor 与 p.mid 混合 0.2），只对最下面 15% 高度做这个渐变
  （smoothstep(t, 0, 0.15)；范围给大了整座山都会糊成天空色，远山直接消失）
- 山脊 = 本体冷紫灰，亮度正比于地平线色；越远越淡（layer 系数 0.30 / 0.40 / 0.52）
- **逆光时段要压暗成剪影**：darkK = 0.52 + 0.48 * clamp(sunY * 2.6)，再乘 (1 - 0.55 * night)。
  不加这一步，黄昏的山体颜色会恰好等于晚霞，直接消失
- 低太阳时给一点暖色 body.lerp(p.sun, 0.06 + 0.10 * wLow)，但别超过 0.16，否则变红烧肉
- 材质用 MeshBasicMaterial({ color: 0xffffff, vertexColors: true, fog: false })：
  颜色全在顶点色里（材质色若也染色会二次相乘变黑）；fog:false 是因为场景雾是橙色地平线色，
  会把整片远山染橙
- 摆放：6~8 条，跨 2600~4800 距离，**留出海面空白**，不要连成一道墙；
  每条都带一点 rotation.y，否则会看出是同一块板

---

## 9. 镜头（决定"像不像照片"）

- 机位压低：离水面 10~15m，距主体 100~130m，FOV 40~45
- `maxPolarAngle ≈ 88°`（不能钻到水下）
- 前景要有遮挡物（棕榈叶/岩石）形成层次，不要空荡荡的中景
- 预设视角按钮：全景 / 沙滩 / 椰林 / 木屋 / 海面，用 1.6s `easeInOut` 缓动飞行
- 时间滑块 0~24 连续调，色板用关键帧插值（PAL 数组 + `lerp`），比"白天/黑夜"两档真实得多

---

## 10. 写实自检清单（交付前逐项看）

- [ ] 全图有没有"蒙灰"？（色彩空间）
- [ ] 天空是 shader 还是纯色？（写实档必须 shader）
- [ ] 水里有反射吗？有太阳/月亮光带吗？
- [ ] 岸线是白沫窄带 + 湿沙，还是等宽白环？
- [ ] 海天线有没有黑边？（雾色 = 地平线色）
- [ ] 远处水面有没有摩尔纹/沙点？（法线随距离衰减）
- [ ] 棕榈叶是羽状还是"棒棒糖"？alphaTest 有没有裁光？
- [ ] 主体有阴影吗？有阴影痤疮吗？（normalBias）
- [ ] 远山是按当前时段算的色吗？黄昏时是剪影还是糊进晚霞了？
- [ ] 中景/近景还有大片空白吗？（灌木、乱石、碎石、杂物、鸟、烟）
- [ ] 夜晚辉光衰减了吗？（uGlowK）
- [ ] 有没有暗角 + 轻微颗粒，让画面"收"起来？
