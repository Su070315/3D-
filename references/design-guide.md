# 程序化 3D 模型设计指南

从文字描述生成新模型时，按本指南组织代码。骨架参考 templates/manor_app.js。

## 1. 场景骨架（照抄，改名称即可）

- renderer/camera/OrbitControls/shadowMap
- 灯光：hemi(天光) + sun(主光带阴影) + moon(夜景)
- 材质工厂 M(color, opts)，玻璃数组 glassMats（夜景点亮用）
- 分组：gRoof / gF1..gF4 / gSite，统一挂到根组（导出用）
- 日夜 setNight(v)：切 sun/moon/hemi 强度、背景色、玻璃 emissive、路灯 lampLights
- 楼层切换：FLOOR_GROUPS + MODE_SLIDES（上方楼层滑出）+ tweenVec 缓动
- 编辑模式：点选/拖动（groundPlane 射线）+ FACTORIES 面板
- 导出 GLB：exportBtn 复位所有楼层位置后 exporter.parse

## 2. 几何助手（直接复用）

- box(parent, w,h,d, mat, x,y,z, ry)：长方体
- cyl(parent, rt,rb,h, mat, x,y,z, seg)：圆柱/棱柱
- sph(parent, r, mat, x,y,z)：球
- wallsBox(parent, w,h,d, y, mat, t)：四面墙板（俯视能看到室内，关键！）
- frameBox(parent, w,h,d, y, mat)：四条边框（腰线/檐口用，不盖室内）
- gableRoof(parent, w,d, y0, h, overhang, mat)：山墙屋顶（返回 group 可旋转）
- gableWall(parent, w, y0, h, z, mat, depth)：山墙三角（ExtrudeGeometry）
- windowAt(parent, x,y,z, ry, w,h, arched)：带分格和窗台的窗

## 3. 建筑参数化套路

- 先定楼层高度：Y1、H1..Hn、Y2=Y1+H1、...、YT、EAVE
- 每层：wallsBox 建墙 + 窗口循环 + 层间线(frameBox)
- 屋顶：gableRoof（山墙）/ 孟莎顶(CylinderGeometry 4段 + rotateY 烘焙)
- 凸体/翼楼：单独 wallsBox 时手动给 cx/cz（wallsBox 不支持偏移，别忘！）

## 4. 家具工厂（按需）

bed/wardrobe/nightstand/sofa/chair/desk/rug/pendant 等，都接受楼层 Y 参数。每层布局不同：一层生活区、二层卧室、三层套房、四层娱乐（可自由发挥）。

## 5. 外景

树(makeTree)/灌木/花/石头/长椅/路灯/车/亭子/喷泉工厂 + 花园、池塘、假山、停车场、秋千等。

## 6. 高频坑（务必检查）

1. 屋面棱柱：geometry.rotateY(PI/4) 再 mesh.scale，不要 mesh.rotation.y（菱形屋面）
2. 实心盒盖室内：楼板/腰线/翼楼墙体必须用墙板或边框
3. 工厂函数默认参数：s = s || 1（undefined 会 NaN，导出 GLB 报错）
4. wallsBox 不支持偏移：偏移位置要手动写 4 面墙
5. 导出前复位所有楼层位置
6. 测试用 playwright-cli（file:// 被拦，走本地 http.server）

## 7. 交付检查单

- 双击 HTML 能开、无 console 报错
- 每个楼层俯视能看进室内、有内容
- 屋顶贴合建筑、无漂浮/菱形
- 日夜切换正常、导出 GLB 正常
- 命名/设计原创，不抄别人


## 8. 精细建模配方（避免简陋）

### 真实树（树干+枝干+密集树冠）
- 树干：CylinderGeometry(上细 0.1s / 下粗 0.24s)
- 3-4 根枝干：细圆柱，带倾斜 rotation
- 树冠：约 30 个小球（0.25-0.5s，2-3 种绿色）按穹形分布，越往上越窄，scale.y 压扁 0.85
- 禁止只用 2-3 个大球

### 天然岩石/山体（顶点扰动）
- IcosahedronGeometry(s, 1) 细分一次，遍历 position 顶点按伪随机噪声 multiplyScalar 扰动，computeVertexNormals
- 远山：ConeGeometry(7-9 段) 做不规则山峰，蓝灰色(雾化色)，底部埋进云海

### 铺满的云海 + 远山
- 底层：CircleGeometry(大半径 150+) 平放作海面 + 密集云簇(150+ 簇，每簇 4-8 个压扁球)铺满
- 远山从海面下穿透出来(顶部露出)
- fog 把远景融进天光

### 材质助手签名一致性
- 材质助手 M(color, map, opts) 三个参数：改签名后，所有旧式调用 M(color, opts) 会把参数对象当成贴图 → 渲染时 uvTransform.copy 崩溃 → **整个透明渲染队列中断（所有精灵消失）**
- 排查技巧：夜晚/某视角下精灵全部消失但 console 有 TypeError 时，就是某个材质的 map 坏了

### 建筑细节
- 窗要窗框+窗台、门要门套、屋顶要有层次(锥/坡+檐)、墙顶加城齿/檐线

## 9. 浮空岛/城堡场景配方（sky_island_v10_app.js）

### 真实感瀑布
- 一条 CatmullRomCurve3 落水曲线 + TubeGeometry，**复制 3 股**：横向偏移/半径/透明度/滚动速度各不同（0.0036~0.0062），叠出层次
- 顶部翻口：白色薄盒 + 半透明白盒制造涌出感；崖缘嵌 1-2 块石
- 底部：水花精灵池（10 个小 sprite，|sin| 上下跳 + 透明度脉动）+ 雾气精灵（缓慢上升 + opacity 呼吸）
- 所有水材质 push 进 WATER_MATS，userData.speed 存各自滚动速度，统一 WATER_TICK(t) 里 offset.y -= speed

### 假山 + 池塘（带跌水/涟漪/生态）
- 池：石砌盆(cyl 压 scale.x 变椭圆) + 水面盘 + 一层缓慢滚动的泡沫叠层(shim) 制造波光
- 山：6-8 块 Dodecahedron 石按两三层堆叠（y 越高块越小），压 y 轴 0.72~1.0，随机旋转；石面点缀绿球苔藓
- 跌水：短曲线 Tube + 翻口白沫；落点 RIPPLE_ATS 注册，每 1.6s 自动 spawnRipple（RingGeometry 扩散+淡出，geometry/material 要 dispose）
- 睡莲(扁圆柱+花精灵)、芦苇(细圆柱簇)、岸边雾各一小撮即可

### 城堡内部（掏空法）
- 主堡一层不用实心盒：四块墙板围合（南墙在门洞处拆成左右两段）+ 地板/天花 slab
- 陈设按主题配：王座厅=台基+王座+红毯+石柱+烛台吊灯+旋转楼梯+武器架+挂毯；宴会厅=壁炉(火光 PointLight 持续闪烁)+长桌长凳+餐具+吊灯
- 内部暖光 PointLight 常亮(白天 0.55 夜晚 1.0，挂 castleLights)；透明玻璃窗用 glowMat 夜晚透光
- 配套视角按钮飞入室内；相机在室内 OrbitControls 的 minDistance 要调小(0.6)，否则被弹出去

### 点击交互系统
- reg(obj, '提示', fn) → INTERACT 数组；pointerdown 射线命中后沿 parent 链找 userData.interact
- 悬停 #tip 金字提示 + cursor:pointer（pointermove 里节流raycast）
- 共享状态必须用 var 声明（不用 const/let）：setNight 在交互块之前执行，var 有提升不报 TDZ；同时便于调试台访问

## 10. 增量组装与高频坑补充

- 在成品 HTML 上迭代：scripts/update_html.js 只替换最后一个 <script> 块（app 代码），幂等可反复跑
- sky 版 gableRoof **不返回对象**（manor 版返回 group）——要旋转/平移就自己外包 new THREE.Group() 再调它
- 拱券几何烘焙两步：geometry.rotateZ(PI/2) 变上半圆拱，再 geometry.rotateY(PI/2) 让轴向对准门洞深度；直接 mesh.rotation 组合欧拉角会得到竖直半管（不可见）
- M(color, map, opts) 三参签名，第二参必须是纹理或 null（见第 8 节材质坑）
- 双扇门开合方向：几何 translate(w/2,0,0) 铰链在组原点，左扇 openAng 取负右扇取正；门上铁箍/门钉作为门的子节点随动
- 水井交互：吊桶+绳+辘轳存 userData，WELL 动画期间 bucket 上升/rope.scale.y 缩短/辘轳 rotation.x 累加，结束复位
