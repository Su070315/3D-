---
name: "text-to-3d-html"
version: "1.1.0"
display_name: "文字生成3D模型(HTML)"
display_name_en: "Text-to-3D HTML Model Generator"
description: "根据用户的一段文字描述，生成一个可双击在浏览器打开的 3D 模型(程序化 Three.js 单文件 HTML)。支持环绕查看、楼层切换、日夜切换、可编辑(添加/移动/删除物体)、导出 GLB 进 Blender。适用于生成一个3D模型、做个房子/建筑/场景、帮我建个别墅/庭院/街区等请求。"
description_zh: "根据用户的一段文字描述，生成一个可双击在浏览器打开的 3D 模型(程序化 Three.js 单文件 HTML)。支持环绕查看、楼层切换、日夜切换、可编辑(添加/移动/删除物体)、导出 GLB 进 Blender。适用于生成一个3D模型、做个房子/建筑/场景、帮我建个别墅/庭院/街区等请求。"
description_en: "Generate a 3D model openable in the browser by double-clicking, from a text description (procedural Three.js single-file HTML). Supports orbit view, floor switching, day/night, editing, and GLB export to Blender."
---
# 文字生成 3D 模型（HTML）

根据用户描述，用程序化 Three.js 代码生成一个单文件 HTML，双击即在浏览器打开。这是复刻抖音月华墅那类作品的正确做法（DeepSeek 写 Three.js 代码），不需要 GPU、不需要 API key、离线可开。

## 完整工作流（严格按顺序）

1. **充分理解意图**：不要照字面执行。用户往往说不清，要主动补全 TA 脑海里的画面（氛围、尺度、元素密度、精细度）
2. **提示词优化（关键步骤，不可跳过）**：把用户的模糊描述扩写成一份「优化后的设计 brief」，必须包含——整体风格与氛围、元素清单（逐项列全）、布局与尺度、配色、光照氛围、**建模精度要求**（每类物体怎么做得精细）。把 brief 展示给用户确认，或至少在动手前自述 brief。用户说「说不出来」时，更要先给出一份具体想象再创作
3. 写 app.js：室内建筑以 templates/manor_app.js 为骨架，浮空岛/城堡场景以 templates/sky_island_v10_app.js 为骨架（含精修城堡、王座厅/宴会厅内部、可点开门、视角导览、多股瀑布、假山池塘），复用 references/design-guide.md 的几何助手；**每类物体都按设计指南的精细建模配方来做，不要用基础几何敷衍**
4. 组装 HTML：node scripts/assemble.js app.js 输出.html
5. 测试：用 playwright-cli 打开截图 + console 检查；对照 brief 逐项核对是否都做到了（云海铺满了吗、山有了吗、树是真实树形吗）
6. 交付：HTML 放桌面；如需进 Blender，页面点导出 GLB 再用 scripts/blender_import.py 转 .blend

## 交互功能骨架（manor_app.js 已内置，新模型直接沿用）

- 轨道控制、日夜切换、自动旋转
- 楼层切换：FLOOR_GROUPS + MODE_SLIDES 通用「上方楼层滑出」机制 + 相机缓动
- 编辑模式：点选/拖动/旋转/缩放/删除 + 面板添加物体
- 导出 GLB：复位所有楼层位置后 parse

## 交互增强骨架（sky_island_v10_app.js，用户要「多点交互/看内部」时沿用）

- 视角导览栏：JS 注入 #viewbar 按钮组 + tweenCam(pos,target) 相机缓动飞行（tweens 数组 + easeInOut）
- 点击交互：reg(obj,'提示文字',fn) 注册到 INTERACT → pointerdown 射线拾取（沿 parent 找 userData.interact）→ 悬停 #tip 提示 + cursor:pointer
- 可开合门：makeDoor(parent,x,y,z,baseRy,w,h,thick,mat,openAng,label)——几何 translate(w/2,0,0) 让铰链在组原点，addTween 转动开合；点大门可顺带 tweenCam 飞进室内
- 城堡内部：外墙用四块墙板围合（门洞处拆两段墙板）+ 地板/天花 slab + 王座/长桌/壁炉/吊灯等陈设，配「王座厅/宴会厅」视角按钮
- 火把/火盆：TORCHES 数组 {flame,light,max,on}，setTorch 开关，夜晚 setNight 全部重置为点燃
- 水系统：多股水帘(不同 speed 的 foamTex 滚动)+翻口白沫+底部水花粒子+雾气+池塘涟漪(RingGeometry 扩散)，统一 WATER_TICK(t) 在渲染循环里驱动
- 在成品 HTML 上迭代：node scripts/update_html.js <已有.html> <新app.js> 只替换最后的 app 脚本块，幂等

## 必守的坑

- 几何体先 geometry.rotateY 烘焙旋转、再 scale（否则菱形屋面）
- 俯视楼层平面：楼板/腰线用边框或墙板，不要用实心盒，否则盖住室内
- 工厂函数必须给默认参数（undefined 会产出 NaN 几何，导出 GLB 会被 Blender 拒绝）
- 导出前复位所有楼层位置
- 组装用 shell.html（含编辑栏），app.js 里可改 document.title 和 #modelTitle
- 楼层数不是 4 时隐藏多余楼层按钮
- Blender 渲染发灰：blender_import.py 已设 view_transform=Standard + 世界背景强度 0.25

## 建模质量总则（用户明确要求：不要简陋）

- 树木：树干(下粗上细) + 若干枝干 + 密集不规则树冠(几十个小球簇成穹形，多色调)，**禁止**只用 2-3 个大球
- 岩石/山体：用 Icosahedron/Cone 细分后对顶点做随机扰动，做出天然不规则轮廓，**禁止**光滑规则几何
- 云海/水/地：大面积铺满 + 远山穿透 + 雾化融合，做出纵深和铺满感
- 建筑：门窗要有框、屋顶有层次、墙面有装饰线，别只是光盒子
- 每个元素都要「打磨过」，贴近现实，而不是占位符

## 设计必须原创

参考他人作品只借鉴类型和技术手法，具体造型/配色/命名/布局必须原创（用户明确要求）。

## 交付物

- 桌面 HTML（双击开）+ 可选 GLB 和 .blend（Blender）
- 用一句话说明改了什么、怎么打开
