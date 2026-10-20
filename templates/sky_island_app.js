/* 云中岛 v6 —— 真实树形+嶙峋岛体 */
'use strict';
document.title = '云中岛 · Sky Island';
document.getElementById('modelTitle').textContent = '云 中 岛';
document.getElementById('modelSub').textContent = 'SKY ISLAND';
Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function(b){ b.style.display='none'; });
['bench','lamp','pavilion','fountain'].forEach(function(k){ const b=document.querySelector('[data-add='+k+']'); if(b) b.style.display='none'; });

/* ===== 基础 ===== */
const container=document.getElementById('app');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(34,8,42);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputEncoding=THREE.sRGBEncoding;
container.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.06; controls.minDistance=10; controls.maxDistance=300; controls.maxPolarAngle=Math.PI*0.9; controls.target.set(0,-2,0);

/* ===== 灯光 ===== */
const hemi=new THREE.HemisphereLight(0xd8ecff,0x8a94a6,0.72); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffedd0,1.18); sun.position.set(25,40,18); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-45; sun.shadow.camera.right=45; sun.shadow.camera.top=45; sun.shadow.camera.bottom=-45; sun.shadow.camera.far=200; sun.shadow.bias=-0.0003; scene.add(sun);
const moonLight=new THREE.DirectionalLight(0x9fb6ff,0.0); moonLight.position.set(-25,35,-18); scene.add(moonLight);

/* ===== 纹理 ===== */
function radialTex(stops,size){ const c=document.createElement('canvas'); c.width=c.height=size; const x=c.getContext('2d'); const g=x.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2); stops.forEach(function(s){ g.addColorStop(s[0],s[1]); }); x.fillStyle=g; x.fillRect(0,0,size,size); return new THREE.CanvasTexture(c); }
function skyTex(colors){ const c=document.createElement('canvas'); c.width=16; c.height=512; const x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,512); colors.forEach(function(s){ g.addColorStop(s[0],s[1]); }); x.fillStyle=g; x.fillRect(0,0,16,512); return new THREE.CanvasTexture(c); }
function moonTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d'); x.fillStyle='#D8DCE0'; x.fillRect(0,0,256,256); for(let i=0;i<46;i++){ const px=Math.random()*256,py=Math.random()*256,r=3+Math.random()*16; const g=x.createRadialGradient(px,py,r*0.15,px,py,r); g.addColorStop(0,'rgba(110,120,130,0.55)'); g.addColorStop(0.6,'rgba(140,150,160,0.28)'); g.addColorStop(1,'rgba(220,225,230,0)'); x.fillStyle=g; x.beginPath(); x.arc(px,py,r,0,7); x.fill(); } return new THREE.CanvasTexture(c); }
function barkTex(){ const c=document.createElement('canvas'); c.width=128; c.height=256; const x=c.getContext('2d'); x.fillStyle='#6B4A2E'; x.fillRect(0,0,128,256); for(let px=0;px<128;px+=3){ const s=45+Math.random()*45; x.fillStyle='rgba('+Math.floor(s)+','+Math.floor(s*0.7)+','+Math.floor(s*0.45)+','+(0.25+Math.random()*0.4)+')'; x.fillRect(px,0,2+Math.random()*3,256); } for(let i=0;i<70;i++){ x.fillStyle='rgba(35,24,14,'+(0.15+Math.random()*0.3)+')'; x.fillRect(Math.random()*128,Math.random()*256,1+Math.random()*2,5+Math.random()*14); } return new THREE.CanvasTexture(c); }
function woodTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d'); x.fillStyle='#A87B48'; x.fillRect(0,0,256,256); for(let y=0;y<256;y+=32){ x.fillStyle='rgba(60,40,20,0.35)'; x.fillRect(0,y,256,2); for(let i=0;i<16;i++){ x.strokeStyle='rgba(90,60,32,'+(0.08+Math.random()*0.2)+')'; x.beginPath(); const yy=y+Math.random()*28; x.moveTo(0,yy); x.bezierCurveTo(80,yy+Math.random()*6,160,yy-Math.random()*6,256,yy); x.stroke(); } } return new THREE.CanvasTexture(c); }
function rockTex(base,dark,light){ const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d'); x.fillStyle=base; x.fillRect(0,0,512,512); for(let i=0;i<9000;i++){ x.globalAlpha=Math.random()*0.4; x.fillStyle=Math.random()<0.5?dark:light; const r=1+Math.random()*4; x.fillRect(Math.random()*512,Math.random()*512,r,r); } x.globalAlpha=1; for(let i=0;i<14;i++){ x.globalAlpha=0.12+Math.random()*0.15; x.strokeStyle='#3A2C1C'; x.lineWidth=1+Math.random()*3; x.beginPath(); x.moveTo(0,Math.random()*512); x.bezierCurveTo(128,Math.random()*512,384,Math.random()*512,512,Math.random()*512); x.stroke(); } x.globalAlpha=1; return new THREE.CanvasTexture(c); }
function roofTex(){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); x.fillStyle='#4A5560'; x.fillRect(0,0,128,128); for(let y=0;y<128;y+=16){ const off=(y/16)%2?8:0; for(let px=-8;px<128;px+=16){ x.fillStyle='rgba(58,68,76,0.55)'; x.fillRect(px+off,y,14,14); x.fillStyle='rgba(82,94,102,0.4)'; x.fillRect(px+off+1,y+1,12,12); } } return new THREE.CanvasTexture(c); }
function grassTex(){ const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d'); x.fillStyle='#5E9440'; x.fillRect(0,0,512,512); for(let i=0;i<9000;i++){ x.fillStyle='rgba('+(55+Math.random()*55)+','+(115+Math.random()*70)+','+(30+Math.random()*45)+','+(0.25+Math.random()*0.45)+')'; x.fillRect(Math.random()*512,Math.random()*512,1,2+Math.random()*5); } for(let i=0;i<60;i++){ x.fillStyle='rgba(85,140,60,'+(0.1+Math.random()*0.2)+')'; x.beginPath(); x.arc(Math.random()*512,Math.random()*512,8+Math.random()*22,0,7); x.fill(); } return new THREE.CanvasTexture(c); }
/* 硬边叶片簇(小椭圆叶片, alphaTest 用) */
function leafClusterTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d'); for(let i=0;i<260;i++){ const a=Math.random()*Math.PI*2; const rr=Math.sqrt(Math.random())*112; const px=128+Math.cos(a)*rr, py=128+Math.sin(a)*rr*0.9; const rot=Math.random()*Math.PI; const s=5+Math.random()*11; const sh=35+Math.random()*70; x.save(); x.translate(px,py); x.rotate(rot); x.fillStyle='rgb('+Math.floor(sh*0.45)+','+Math.floor(85+sh)+','+Math.floor(sh*0.55)+')'; x.beginPath(); x.ellipse(0,0,s,s*0.42,0,0,7); x.fill(); x.fillStyle='rgba(150,200,120,'+(0.15+Math.random()*0.25)+')'; x.beginPath(); x.ellipse(0,-s*0.15,s*0.5,s*0.18,0,0,7); x.fill(); x.restore(); } return new THREE.CanvasTexture(c); }
function foamTex(){ const c=document.createElement('canvas'); c.width=64; c.height=256; const x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,256); g.addColorStop(0,'rgba(255,255,255,0.9)'); g.addColorStop(0.5,'rgba(235,245,255,0.6)'); g.addColorStop(1,'rgba(220,235,250,0.2)'); x.fillStyle=g; x.fillRect(0,0,64,256); for(let i=0;i<600;i++){ x.fillStyle='rgba(255,255,255,'+(0.1+Math.random()*0.4)+')'; x.fillRect(Math.random()*64,Math.random()*256,1+Math.random()*2,2+Math.random()*6); } return new THREE.CanvasTexture(c); }
function flowerTex(col){ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); const g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'#FFF6C8'); g.addColorStop(0.4,col); g.addColorStop(0.75,col); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }

/* ===== 材质 ===== */
const barkTexMap=barkTex(), woodTexMap=woodTex(), roofTexMap=roofTex(), grassTexMap=grassTex(), leafTexMap=leafClusterTex(), foamTexMap=foamTex();
const rockATex=rockTex('#8A6840','#4A3420','#B09060'), rockBTex=rockTex('#7A5C38','#422E1C','#A88050'), rockDarkTex=rockTex('#6E5238','#46321E','#94704A');
function M(col,map,opts){ const o=Object.assign({color:col,roughness:0.9,metalness:0.0},opts||{}); if(map)o.map=map; return new THREE.MeshStandardMaterial(o); }
const MAT={ rockA:M(0xffffff,rockATex,{roughness:1}), rockB:M(0xffffff,rockBTex,{roughness:1}), rockDark:M(0xffffff,rockDarkTex,{roughness:1}), dirt:M(0x8A6A48), grass:M(0xffffff,grassTexMap), trunk:M(0xffffff,barkTexMap,{roughness:0.95}), wood:M(0xffffff,woodTexMap), woodDark:M(0x6A4A2A), roof:M(0xffffff,roofTexMap,{roughness:0.75}), plaster:M(0xE8DCC0), stone:M(0xC9BFA8), waterfall:M(0xffffff,foamTex(),{roughness:0.2,transparent:true,opacity:0.8}), windowGlow:M(0xFFE3A1,null,{emissive:0xFFC964,emissiveIntensity:0}) };
const glowMats=[]; function glowMat(){ const g=MAT.windowGlow.clone(); glowMats.push(g); return g; }

/* ===== 几何助手 ===== */
function box(parent,w,h,d,mat,x,y,z,ry){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); if(ry)m.rotation.y=ry; m.castShadow=true; m.receiveShadow=true; parent.add(m); return m; }
function cyl(parent,rt,rb,h,mat,x,y,z,seg){ const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16),mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m; }
function sph(parent,r,mat,x,y,z){ const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),mat); m.position.set(x,y,z); m.castShadow=true; parent.add(m); return m; }
function cone(parent,r,h,mat,x,y,z,seg){ const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg||8),mat); m.position.set(x,y,z); m.castShadow=true; parent.add(m); return m; }
function tubeBetween(a,b,r1,r2,mat,parent){ const dir=new THREE.Vector3().subVectors(b,a); const len=dir.length(); const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,len,10),mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize()); m.castShadow=true; parent.add(m); return m; }
function gableRoof(parent,w,d,y0,h,overhang,mat){ const span=d/2+overhang; const L=Math.sqrt(span*span+h*h); const a=Math.atan2(h,span); for(const s of [1,-1]){ const p=new THREE.Mesh(new THREE.BoxGeometry(w+overhang*2,0.12,L),mat); p.position.set(0,y0+h/2,s*span/2); p.rotation.x=s*a; p.castShadow=true; p.receiveShadow=true; parent.add(p); } const s2=new THREE.Shape(); s2.moveTo(-w/2-overhang*0.5,y0); s2.lineTo(w/2+overhang*0.5,y0); s2.lineTo(0,y0+h); s2.closePath(); const geo=new THREE.ExtrudeGeometry(s2,{depth:0.14,bevelEnabled:false}); geo.translate(0,0,-0.07); const tri=new THREE.Mesh(geo,MAT.plaster); tri.position.z=-d/2-overhang*0.5; tri.castShadow=true; parent.add(tri); }
function dirv(x,y,z){ return new THREE.Vector3(x,y,z).normalize(); }

/* ===== 天空(同 v4/v5) ===== */
const skyDayTex=skyTex([[0,'#2E6FBF'],[0.45,'#6FA8E0'],[0.75,'#B8D8EE'],[0.92,'#E2F0F6'],[1,'#F0F6F8']]);
const skyNightTex=skyTex([[0,'#04091A'],[0.4,'#081430'],[0.75,'#132448'],[0.92,'#20345E'],[1,'#2A3F66']]);
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(460,40,20),new THREE.MeshBasicMaterial({map:skyDayTex,side:THREE.BackSide,fog:false,depthWrite:false})); scene.add(skyDome);
const skyBits=new THREE.Group(); scene.add(skyBits);
const sunTex=radialTex([[0,'rgba(255,255,250,1)'],[0.18,'rgba(255,250,220,0.95)'],[0.4,'rgba(255,238,180,0.5)'],[0.7,'rgba(255,228,150,0.12)'],[1,'rgba(255,220,140,0)']],256);
function glowSprite(tex,scale,opacity){ const m=new THREE.SpriteMaterial({map:tex,transparent:true,opacity:opacity,depthWrite:false,fog:false}); const s=new THREE.Sprite(m); s.scale.set(scale,scale,1); return s; }
const sunPos=new THREE.Vector3(-210,67,-99);
const sunCore=glowSprite(sunTex,22,1); sunCore.position.copy(sunPos);
const sunMid=glowSprite(sunTex,70,0.5); sunMid.position.copy(sunPos);
const sunHalo=glowSprite(sunTex,200,0.22); sunHalo.position.copy(sunPos);
skyBits.add(sunCore,sunMid,sunHalo);
const moonBall=new THREE.Mesh(new THREE.SphereGeometry(3.6,32,24),new THREE.MeshBasicMaterial({map:moonTex(),fog:false})); moonBall.position.copy(sunPos); moonBall.visible=false; skyBits.add(moonBall);
const moonGlow=glowSprite(radialTex([[0,'rgba(220,230,255,0.9)'],[0.4,'rgba(200,215,250,0.25)'],[1,'rgba(200,215,250,0)']],256),40,0.7); moonGlow.position.copy(sunPos); moonGlow.visible=false; skyBits.add(moonGlow);
const starMat=new THREE.PointsMaterial({color:0xffffff,size:1.7,transparent:true,opacity:0,fog:false});
(function(){ const v=[]; for(let i=0;i<500;i++){ const th=Math.random()*Math.PI*2,ph=Math.acos(Math.random()*0.95),R=430; v.push(R*Math.sin(ph)*Math.cos(th),R*Math.cos(ph)+5,R*Math.sin(ph)*Math.sin(th)); } const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); skyBits.add(new THREE.Points(geo,starMat)); })();

/* ===== 分组 ===== */
const bobGroup=new THREE.Group(); scene.add(bobGroup);
const skyRoot=new THREE.Group(); bobGroup.add(skyRoot);
const gIsland=new THREE.Group(),gTree=new THREE.Group(),gHouses=new THREE.Group(),gGarden=new THREE.Group(),gFalls=new THREE.Group(),gMini=new THREE.Group(),gClouds=new THREE.Group();
skyRoot.add(gIsland,gTree,gHouses,gGarden,gFalls,gMini,gClouds);

/* ===== 粒子云 ===== */
const cloudTex=radialTex([[0,'rgba(255,255,255,0.95)'],[0.4,'rgba(255,255,255,0.6)'],[0.7,'rgba(255,255,255,0.18)'],[1,'rgba(255,255,255,0)']],256);
const cloudMats=[]; const foliageMats=[];
function cloudSprite(size,x,y,z,opacity){ const m=new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:opacity,depthWrite:false,color:0xffffff}); cloudMats.push(m); const s=new THREE.Sprite(m); s.scale.set(size,size*0.55,1); s.position.set(x,y,z); return s; }
const gCloudSea=new THREE.Group(); const gCloudCum=new THREE.Group(); gClouds.add(gCloudSea,gCloudCum);
(function(){ for(let layer=0;layer<3;layer++){ const yy=-21-layer*1.6; for(let i=0;i<160;i++){ const a=Math.random()*Math.PI*2; const rad=16+Math.sqrt(Math.random())*135; gCloudSea.add(cloudSprite(20+Math.random()*30,Math.cos(a)*rad,yy+(Math.random()-0.5)*1.4,Math.sin(a)*rad,0.5+Math.random()*0.35)); } } for(let k=0;k<46;k++){ const cx=(Math.random()-0.5)*170,cy=-15+Math.random()*16,cz=(Math.random()-0.5)*170; const n=6+Math.floor(Math.random()*6); for(let j=0;j<n;j++){ gCloudCum.add(cloudSprite(7+Math.random()*11,cx+(Math.random()-0.5)*9,cy+(Math.random()-0.5)*3,cz+(Math.random()-0.5)*9,0.45+Math.random()*0.35)); } } })();

/* ===== 嶙峋岛体(顶点扰动) ===== */
(function(){
  const geo=new THREE.CylinderGeometry(16, 2.6, 18, 26, 12);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
    const a=Math.atan2(z,x);
    const d=Math.sqrt(x*x+z*z);
    if(d>1.5 && Math.abs(y)<8.7){
      const k=1 + Math.sin(a*4.7+y*0.9)*0.13 + Math.sin(a*9.3+y*1.7)*0.07 + Math.sin(a*17+y*2.3)*0.045 + Math.sin(y*2.1)*0.04;
      pos.setXYZ(i, x*k, y, z*k);
    }
  }
  geo.computeVertexNormals();
  const rock=new THREE.Mesh(geo, MAT.rockA);
  rock.position.y=-9.0; rock.castShadow=true; rock.receiveShadow=true; gIsland.add(rock);
  const grass=new THREE.Mesh(new THREE.CylinderGeometry(17.0, 16.6, 0.32, 26), MAT.grass);
  grass.position.y=0.16; grass.receiveShadow=true; gIsland.add(grass);
  // 岛缘垂土
  const dirt=new THREE.Mesh(new THREE.CylinderGeometry(17.2, 16.0, 1.2, 26), MAT.dirt);
  dirt.position.y=-0.42; dirt.receiveShadow=true; gIsland.add(dirt);
  // 侧面嵌入碎石
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2+Math.random()*0.4;
    const rr=8+Math.random()*6;
    const y=-3-Math.random()*10;
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(0.8+Math.random()*0.9,0), MAT.rockDark);
    m.position.set(Math.cos(a)*rr, y, Math.sin(a)*rr);
    m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
    m.castShadow=true; gIsland.add(m);
  }
})();

/* ===== 真实树(递归枝干+硬边叶簇精灵) ===== */
function foliageSprite(x,y,z,s){ const m=new THREE.SpriteMaterial({map:leafTexMap,transparent:true,alphaTest:0.35,side:THREE.DoubleSide}); m.rotation=Math.random()*Math.PI*2; foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(s,s,1); sp.position.set(x,y,z); gTree.add(sp); return sp; }
function branch(parent, from, dirV, len, r0, depth){
  const to=from.clone().add(dirV.clone().multiplyScalar(len));
  tubeBetween(from,to, r0, r0*0.62, MAT.trunk, parent);
  if(depth<=0){ foliageSprite(to.x,to.y,to.z, 1.6+Math.random()*1.4); return; }
  const n= depth>=2 ? 3 : 2;
  for(let i=0;i<n;i++){
    const nd=dirV.clone()
      .applyAxisAngle(new THREE.Vector3(0,1,0), (Math.random()-0.5)*1.7)
      .applyAxisAngle(new THREE.Vector3(1,0,0), (Math.random()-0.35)*0.9)
      .normalize();
    branch(parent, to, nd, len*0.68, r0*0.62, depth-1);
  }
  if(Math.random()<0.6) foliageSprite(to.x+dirV.x*len*0.3, to.y+dirV.y*len*0.3, to.z+dirV.z*len*0.3, 1.4+Math.random()*1.2);
}
(function(){
  const s=1.0;
  const p0=new THREE.Vector3(0,0,0);
  const p1=new THREE.Vector3(0.3*s,1.5*s,0.1*s);
  const p2=new THREE.Vector3(-0.2*s,3.0*s,0.2*s);
  const p3=new THREE.Vector3(0.15*s,4.6*s,-0.1*s);
  tubeBetween(p0,p1,0.55*s,0.42*s,MAT.trunk,gTree);
  tubeBetween(p1,p2,0.42*s,0.30*s,MAT.trunk,gTree);
  tubeBetween(p2,p3,0.30*s,0.22*s,MAT.trunk,gTree);
  const mains=[
    [p3, dirv(0.85,0.6,0.35), 2.0, 0.26],
    [p3, dirv(-0.8,0.65,-0.3), 1.9, 0.25],
    [p2, dirv(-0.95,0.55,0.25), 1.8, 0.22],
    [p2, dirv(0.45,0.75,-0.55), 1.7, 0.21],
    [p1, dirv(-0.85,0.7,-0.25), 1.5, 0.18],
    [p1, dirv(0.7,0.65,0.5), 1.4, 0.17]
  ];
  mains.forEach(function(b){ branch(gTree, b[0], b[1], b[2], b[3], 1); });
  foliageSprite(p3.x, p3.y+1.2, p3.z, 2.0);
})();

/* ===== 木屋+风车 ===== */
function makeHouse(s){ const g=new THREE.Group(); box(g,3.0*s,1.5*s,2.4*s,MAT.wood,0,0.75*s,0); box(g,3.06*s,0.12*s,2.46*s,MAT.woodDark,0,1.44*s,0); gableRoof(g,3.2*s,2.6*s,1.5*s,1.1*s,0.35*s,MAT.roof); box(g,0.62*s,1.05*s,0.1*s,MAT.door,0.55*s,0.55*s,1.2*s+0.02); box(g,0.55*s,0.55*s,0.08*s,glowMat(),-0.7*s,0.95*s,1.2*s+0.02); box(g,0.5*s,0.5*s,0.08*s,glowMat(),0,0.9*s,-1.2*s-0.02); box(g,0.35*s,0.9*s,0.35*s,MAT.stone,-1.0*s,2.0*s,-0.4*s); return g; }
(function(){ const h1=makeHouse(1.0); h1.position.set(-4.6,0.3,2.2); h1.rotation.y=0.5; gHouses.add(h1); const h2=makeHouse(0.85); h2.position.set(4.2,0.3,3.4); h2.rotation.y=-0.6; gHouses.add(h2);
  const w=new THREE.Group(); cyl(w,0.85,1.25,2.8,MAT.wood,0,1.4,0,8); cone(w,1.05,0.95,MAT.roof,0,3.28,0,8); const hub=new THREE.Group(); for(let i=0;i<4;i++){ const pv=new THREE.Group(); box(pv,0.22,1.6,0.05,MAT.plaster,0,0.8,0); pv.rotation.z=i*Math.PI/2; hub.add(pv); } hub.position.set(0,2.9,-1.05); hub.rotation.y=Math.PI; w.add(hub); w.position.set(6.8,0.3,-3.2); w.rotation.y=-0.4; gHouses.add(w); gHouses.userData.hub=hub;
  [[-8.5,4.5],[8.8,1]].forEach(function(p){ for(let i=0;i<4;i++){ box(gHouses,0.1,0.7,0.1,MAT.woodDark,p[0]+i*0.55,0.55,p[1]); } box(gHouses,1.8,0.08,0.06,MAT.woodDark,p[0]+0.85,0.75,p[1]); });
})();

/* ===== 瀑布 ===== */
function makeWaterfall(x,z,ry){ const g=new THREE.Group(); const pts=[new THREE.Vector3(0,0.2,0),new THREE.Vector3(0.5,-2.5,0.4),new THREE.Vector3(0.2,-6.5,0.6),new THREE.Vector3(0.9,-11,0.3),new THREE.Vector3(0.4,-16,0.6)]; const curve=new THREE.CatmullRomCurve3(pts); const geo=new THREE.TubeGeometry(curve,26,0.5,8,false); const m=new THREE.Mesh(geo,MAT.waterfall); g.add(m); g.position.set(x,0.1,z); g.rotation.y=ry; g.userData.fallMat=MAT.waterfall; return g; }
gFalls.add(makeWaterfall(11.6,5.5,-0.42)); gFalls.add(makeWaterfall(-11.8,-4.5,2.72));

/* ===== 花园 ===== */
function makeTreeSmall(s){ s=s||1; const g=new THREE.Group(); cyl(g,0.08*s,0.14*s,1.1*s,MAT.trunk,0,0.55*s,0,8);
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; const bx=Math.cos(a)*0.35*s, bz=Math.sin(a)*0.35*s; tubeBetween(new THREE.Vector3(0,0.7*s,0), new THREE.Vector3(bx*2.2,1.3*s,bz*2.2), 0.05*s, 0.03*s, MAT.trunk, g);
    for(let j=0;j<7;j++){ const m=new THREE.SpriteMaterial({map:leafTexMap,transparent:true,alphaTest:0.35}); m.rotation=Math.random()*Math.PI*2; foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(0.9*s+Math.random()*0.5*s,0.9*s+Math.random()*0.5*s,1); sp.position.set(bx*2.2+(Math.random()-0.5)*0.8*s, 1.5*s+Math.random()*0.8*s, bz*2.2+(Math.random()-0.5)*0.8*s); g.add(sp); } }
  return g; }
function makeBush(){ const g=new THREE.Group(); for(let i=0;i<14;i++){ const m=new THREE.SpriteMaterial({map:leafTexMap,transparent:true,alphaTest:0.35}); m.rotation=Math.random()*Math.PI*2; foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(0.5+Math.random()*0.4,0.5+Math.random()*0.4,1); sp.position.set((Math.random()-0.5)*0.7,0.2+Math.random()*0.25,(Math.random()-0.5)*0.7); g.add(sp); } return g; }
function makeFlower(){ const g=new THREE.Group(); const cols=['#E86A6A','#F0D050','#E878B0','#F5F0E0']; for(let i=0;i<6;i++){ const x=(Math.random()-0.5)*0.7,z=(Math.random()-0.5)*0.7; cyl(g,0.013,0.018,0.2,M(0x3E6B34),x,0.1,z,5); const m=new THREE.SpriteMaterial({map:flowerTex(cols[i%4]),transparent:true,depthWrite:false}); foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(0.2,0.2,1); sp.position.set(x,0.26,z); g.add(sp); } return g; }
function makeRock(s){ s=s||0.6; const g=new THREE.Group(); const geo=new THREE.IcosahedronGeometry(s,1); const pos=geo.attributes.position; for(let i=0;i<pos.count;i++){ const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i); const d=0.8+Math.sin(x*3.1+y*4.3)*0.13+Math.cos(z*4.1)*0.12; pos.setXYZ(i,x*d,y*d*0.75,z*d); } geo.computeVertexNormals(); const m=new THREE.Mesh(geo,MAT.rockDark); m.castShadow=m.receiveShadow=true; g.add(m); return g; }
(function(){ [[-3,-6],[2,-7],[8,4],[-9,0],[0,9],[6,-2],[-6,6]].forEach(function(p){ const f=makeFlower(); f.position.set(p[0],0.3,p[1]); gGarden.add(f); }); [[-7,2],[5,6],[-2,-8],[9,-4]].forEach(function(p){ const b=makeBush(); b.position.set(p[0],0.3,p[1]); gGarden.add(b); }); [[11,6,0.9],[-11,3,0.8],[7,-9,0.7],[-6,-10,0.6],[12,-1,0.7]].forEach(function(p){ const r=makeRock(p[2]); r.position.set(p[0],0.25,p[1]); gGarden.add(r); }); [[-1,7],[1.5,7.4]].forEach(function(p){ const t=makeTreeSmall(1.1); t.position.set(p[0],0.3,p[1]); gGarden.add(t); }); })();

/* ===== 城堡(石砌) ===== */
function stoneBlockTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d'); x.fillStyle='#B8AE98'; x.fillRect(0,0,256,256); for(let i=0;i<4000;i++){ x.globalAlpha=Math.random()*0.3; x.fillStyle=Math.random()<0.5?'#8A8070':'#D0C8B8'; x.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*3,1+Math.random()*3); } x.globalAlpha=1; x.strokeStyle='#7A7264'; x.lineWidth=2; for(let y=0;y<256;y+=32){ x.beginPath(); x.moveTo(0,y); x.lineTo(256,y); x.stroke(); } for(let bx=0;bx<256;bx+=48){ const off=(bx/48)%2?16:0; for(let y=0;y<256;y+=32){ x.beginPath(); x.moveTo(bx+off,y); x.lineTo(bx+off,y+32); x.stroke(); } } return new THREE.CanvasTexture(c); }
function buildCastle(){
  const g=new THREE.Group();
  const cs=M(0xffffff, stoneBlockTex(), {roughness:0.85});
  const Y=0;
  box(g,3.4,4.8,3.4,cs,0,Y+2.4,0);
  (function(){ const len=3.6,n=6; box(g,len,0.2,0.5,cs,0,Y+4.8,0); for(let i=0;i<n;i++){ box(g,0.44,0.5,0.5,cs,-len/2+0.22+i*(len/n),Y+5.15,0); } })();
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.8,2.6,4),MAT.roof); roof.position.y=Y+4.8+1.3; roof.rotation.y=Math.PI/4; roof.castShadow=true; g.add(roof);
  cyl(g,0.04,0.04,1.3,MAT.timber,0,Y+4.8+2.6+0.65,0,5); box(g,0.8,0.45,0.04,MAT.flag,0.42,Y+4.8+2.6+1.15,0);
  [[-2.9,-2.9],[2.9,-2.9],[-2.9,2.9],[2.9,2.9]].forEach(function(p){ cyl(g,0.95,1.1,5.2,cs,p[0],Y+2.6,p[1],10); const tr=new THREE.Mesh(new THREE.ConeGeometry(1.3,1.8,8),MAT.roof); tr.position.set(p[0],Y+5.2+0.9,p[1]); tr.castShadow=true; g.add(tr); cyl(g,0.03,0.03,0.8,MAT.timber,p[0],Y+5.2+1.8+0.4,p[1],4); box(g,0.5,0.3,0.03,MAT.flag,p[0]+0.25,Y+5.2+1.8+0.7,p[1]); });
  box(g,6.4,2.3,0.55,cs,0,Y+1.15,-3.15); box(g,6.4,2.3,0.55,cs,0,Y+1.15,3.15); box(g,0.55,2.3,6.4,cs,-3.15,Y+1.15,0); box(g,0.55,2.3,6.4,cs,3.15,Y+1.15,0);
  (function(){ const L=6.4,n=8; [[0,-3.15,0],[0,3.15,0],[-3.15,0,Math.PI/2],[3.15,0,Math.PI/2]].forEach(function(w){ const gg=new THREE.Group(); box(gg,L,0.2,0.5,cs,0,0.1,0); for(let i=0;i<n;i++){ box(gg,0.44,0.5,0.5,cs,-L/2+0.22+i*(L/n),0.45,0); } gg.position.set(w[0],Y+2.3,w[1]); gg.rotation.y=w[2]; g.add(gg); }); })();
  const arch=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.6,12,1,false,0,Math.PI),cs); arch.rotation.z=Math.PI; arch.position.set(0,Y+1.5,3.15); g.add(arch);
  box(g,1.5,1.5,0.6,MAT.door,0,Y+0.75,3.2);
  [[0,2.2,1.72],[0,3.6,1.72],[-1,2.9,1.72],[1,2.9,1.72]].forEach(function(w){ box(g,0.45,0.85,0.12,glowMat(),w[0],Y+w[1],w[2]); });
  [[-2.9,-2.9],[2.9,-2.9],[-2.9,2.9],[2.9,2.9]].forEach(function(p){ box(g,0.15,0.7,0.1,glowMat(),p[0],Y+3.4,p[1]); });
  g.position.set(0.5,0.3,-4.2);
  return g;
}
gHouses.add(buildCastle());
/* 大树挪到前侧 */
gTree.position.set(-5.5, 0.3, 4.8);
/* 假山(显眼岩石群) */
[[8.6,5.8,1.4],[7.2,6.4,1.0],[9.4,5.0,1.2],[7.8,7.2,0.9],[10.0,6.2,1.1],[8.2,7.8,0.8]].forEach(function(p){ const r=makeRock(p[2]); r.position.set(p[0],0.25,p[1]); gGarden.add(r); });


/* ===== 小浮岛 + 碎石 ===== */
const miniIslands=[]; const floatRocks=[];
function makeMiniIsland(s,x,y,z,phase){ const g=new THREE.Group(); cyl(g,1.5*s,1.35*s,0.28*s,MAT.grass,0,0.14*s,0,8); cyl(g,1.35*s,0.55*s,1.1*s,MAT.dirt,0,-0.5*s,0,8); cyl(g,0.55*s,0.12*s,1.0*s,MAT.rockDark,0,-1.5*s,0,8); const t=makeTreeSmall(0.7*s); t.position.set(0,0.28*s,0); g.add(t); g.position.set(x,y,z); g.userData.phase=phase; g.userData.baseY=y; gMini.add(g); miniIslands.push(g); }
makeMiniIsland(1.0,-20,-4,-12,0); makeMiniIsland(0.8,19,-7,-14,1.7); makeMiniIsland(0.7,24,-2,10,3.1); makeMiniIsland(0.9,-24,-8,8,4.4);
[[3.5,-19,0.5],[-4,-17,0.4],[1.5,-22,0.35],[-2.5,-21,0.45]].forEach(function(p,i){ const r=makeRock(p[2]); r.position.set(p[0],p[1],p[0]*0.4); r.userData.phase=i*1.3; r.userData.baseY=p[1]; gMini.add(r); floatRocks.push(r); });

/* ===== 萤火虫 ===== */
const fireflies=[];
(function(){ for(let i=0;i<16;i++){ const f=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),M(0xD8F0A0,null,{emissive:0xC8F060,emissiveIntensity:1.2})); f.userData={a:Math.random()*Math.PI*2,r:3+Math.random()*9,sp:0.3+Math.random()*0.5,y:0.5+Math.random()*3,ph:Math.random()*Math.PI*2}; bobGroup.add(f); fireflies.push(f); } })();

/* ===== 场景丰富化 ===== */
(function(){
  // 石板小径
  const pathMat=M(0xBFB49A);
  for(let i=0;i<8;i++){ box(gGarden, 1.25, 0.06, 0.92, pathMat, -2.5, 0.33, 3.6+i*1.22, (Math.random()-0.5)*0.35); }
  // 菜园(田垄+作物+篱笆)
  const soil=M(0x6B4A2E);
  for(let r=0;r<4;r++){ box(gGarden, 3.6, 0.12, 0.8, soil, 8.6, 0.36, -0.6+r*1.35); for(let c=0;c<7;c++){ const crop=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.38,5), M(0x5A9440)); crop.position.set(7.2+c*0.44, 0.58, -0.6+r*1.35); crop.castShadow=true; gGarden.add(crop); } }
  for(let i=0;i<6;i++){ box(gGarden, 0.08, 0.55, 0.08, MAT.woodDark, 6.7, 0.55, -1.4+i*1.1); box(gGarden, 0.08, 0.55, 0.08, MAT.woodDark, 10.5, 0.55, -1.4+i*1.1); }
  box(gGarden, 3.9, 0.06, 0.06, MAT.woodDark, 8.6, 0.78, -1.45); box(gGarden, 3.9, 0.06, 0.06, MAT.woodDark, 8.6, 0.78, 2.0);
  // 水井
  const well=new THREE.Group(); cyl(well,0.7,0.78,0.5,MAT.stone,0,0.25,0,12); cyl(well,0.56,0.56,0.1,M(0x3A5A70),0,0.3,0,12); box(well,0.08,1.5,0.08,MAT.woodDark,-0.62,1.0,0); box(well,0.08,1.5,0.08,MAT.woodDark,0.62,1.0,0); cone(well,0.95,0.55,MAT.roof,0,2.0,0,4); well.position.set(-7.6,0.3,-5.2); gGarden.add(well);
  // 灯柱(夜晚亮)
  function lantern(x,z){ const g=new THREE.Group(); cyl(g,0.06,0.09,1.7,MAT.woodDark,0,0.85,0,8); box(g,0.28,0.36,0.28,glowMat(),0,1.82,0); cone(g,0.27,0.26,MAT.roof,0,2.14,0,4); g.position.set(x,0.3,z); gGarden.add(g); }
  lantern(-2.6,5.6); lantern(2.4,7.0); lantern(9.0,-3.6); lantern(-8.2,3.0);
  // 更多树
  [[-9,3],[9,6],[-10,-3],[10,-6],[-4,9],[6,8],[12,2],[-9,-6]].forEach(function(p){ const t=makeTreeSmall(0.9+Math.random()*0.5); t.position.set(p[0],0.3,p[1]); gGarden.add(t); });
  // 花坛带
  for(let i=0;i<10;i++){ const f=makeFlower(); f.position.set(-9+i*2, 0.3, 8.6+Math.sin(i*1.7)*0.9); gGarden.add(f); }
  // 长凳
  box(gGarden, 1.7, 0.1, 0.5, MAT.wood, -2.5, 0.55, 6.8); box(gGarden, 1.7, 0.1, 0.16, MAT.wood, -2.5, 0.82, 6.55); box(gGarden, 0.08, 0.5, 0.42, MAT.woodDark, -3.2, 0.3, 6.8); box(gGarden, 0.08, 0.5, 0.42, MAT.woodDark, -1.8, 0.3, 6.8);
  // 岛底垂藤 + 根须
  for(let i=0;i<18;i++){ const a=Math.random()*Math.PI*2; const ySurf=-2.5-Math.random()*7.5; const rr=16+(ySurf)*0.744-0.1; const len=1.4+Math.random()*2.6; const v=new THREE.Mesh(new THREE.ConeGeometry(0.06+Math.random()*0.05, len, 5), M(0x4E7A3C)); v.position.set(Math.cos(a)*rr, ySurf-len/2, Math.sin(a)*rr); v.rotation.x=Math.PI; gIsland.add(v); }
  for(let i=0;i<8;i++){ const a=Math.random()*Math.PI*2; const ySurf=-9-Math.random()*4; const rr=16+(ySurf)*0.744-0.05; const len=0.8+Math.random()*1.6; const r=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.1,len,5), MAT.dirt); r.position.set(Math.cos(a)*rr, ySurf-len/2, Math.sin(a)*rr); r.rotation.x=Math.PI; r.rotation.z=(Math.random()-0.5)*0.6; gIsland.add(r); }
  // 岛底更暗的底色层(丰富层次)
  const under=new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 10), M(0x5A4A38)); under.position.y=-16.6; under.rotation.y=0.4; under.castShadow=true; gIsland.add(under);
})();

/* ===== 远处小浮岛 + 额外云 + 鸟群 ===== */
(function(){
  makeMiniIsland(0.55, -52, -10, -34, 5.2);
  makeMiniIsland(0.65, 50, -14, 30, 2.6);
  for(let k=0;k<22;k++){ const cx=(Math.random()-0.5)*150, cy=-14+Math.random()*10, cz=(Math.random()-0.5)*150; const n=5+Math.floor(Math.random()*5); for(let j=0;j<n;j++){ const m=new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:0.4+Math.random()*0.3,depthWrite:false,color:0xffffff}); cloudMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(6+Math.random()*9,(6+Math.random()*9)*0.6,1); sp.position.set(cx+(Math.random()-0.5)*8, cy+(Math.random()-0.5)*2.5, cz+(Math.random()-0.5)*8); gCloudCum.add(sp); } }
})();

/* ===== 鸟群 ===== */
const birds=[];
(function(){ for(let i=0;i<5;i++){ const g=new THREE.Group(); const m=M(0x2A3038); const w1=box(g,0.55,0.04,0.16,m,-0.26,0,0); const w2=box(g,0.55,0.04,0.16,m,0.26,0,0); box(g,0.16,0.06,0.14,m,0,0.02,0); g.userData={w1:w1,w2:w2,r:13+Math.random()*10,sp:0.12+Math.random()*0.15,ph:Math.random()*6.28,y:6+Math.random()*8}; birds.push(g); bobGroup.add(g); } })();


/* ===== 日夜 ===== */
let night=false;
function setNight(v){ night=v; sun.intensity=v?0.0:1.35; hemi.intensity=v?0.14:1.0; moonLight.intensity=v?0.5:0.0; skyDome.material.map=v?skyNightTex:skyDayTex; skyDome.material.needsUpdate=true; scene.fog.color.set(v?0x0A1424:0x8FC3E8); scene.background=new THREE.Color(v?0x04091A:0x8FC3E8); glowMats.forEach(function(m){ m.emissiveIntensity=v?1.1:0.0; }); cloudMats.forEach(function(m){ m.color=new THREE.Color(v?0x46536E:0xffffff); }); foliageMats.forEach(function(m){ m.color=new THREE.Color(v?0x3A5040:0xffffff); }); sunCore.visible=sunMid.visible=sunHalo.visible=!v; moonBall.visible=moonGlow.visible=v; starMat.opacity=v?0.95:0; fireflies.forEach(function(f){ f.visible=v; }); }
scene.fog=new THREE.Fog(0x8FC3E8,90,420); setNight(false);

/* ===== 编辑 ===== */
let editMode=false,selected=null,dragging=false,selRing=null;
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-0.3); const editRay=new THREE.Raycaster();
const FACTORIES={tree:function(){ return makeTreeSmall(1.1); },bush:makeBush,flower:makeFlower,rock:function(){ return makeRock(0.6); }};
function initSelRing(){ selRing=new THREE.Mesh(new THREE.RingGeometry(0.5,0.62,32),new THREE.MeshBasicMaterial({color:0xFFD24A,side:THREE.DoubleSide,transparent:true,opacity:0.9})); selRing.rotation.x=-Math.PI/2; selRing.visible=false; bobGroup.add(selRing); }
function updateRing(){ if(selected){ const wp=new THREE.Vector3(); selected.getWorldPosition(wp); selRing.position.set(wp.x,0.35,wp.z); } }
function select(o){ selected=o; selRing.visible=true; updateRing(); document.getElementById('seltools').style.display='flex'; }
function deselect(){ selected=null; if(selRing)selRing.visible=false; document.getElementById('seltools').style.display='none'; }
function toRoot(o){ let p=o; while(p&&p.parent&&p.parent!==gGarden){ p=p.parent; } return (p&&p.parent===gGarden)?p:o; }
function pickObj(e){ const ndc=new THREE.Vector2((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1); editRay.setFromCamera(ndc,camera); const hits=editRay.intersectObjects(gGarden.children,true); return hits.length?toRoot(hits[0].object):null; }
renderer.domElement.addEventListener('pointerdown',function(e){ if(!editMode||e.button!==0)return; const o=pickObj(e); if(o){ select(o); dragging=true; controls.enabled=false; } else deselect(); });
renderer.domElement.addEventListener('pointermove',function(e){ if(!editMode||!dragging||!selected)return; const ndc=new THREE.Vector2((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1); editRay.setFromCamera(ndc,camera); const pt=new THREE.Vector3(); if(editRay.ray.intersectPlane(groundPlane,pt)){ selected.position.x=pt.x; selected.position.z=pt.z; updateRing(); } });
addEventListener('pointerup',function(){ dragging=false; controls.enabled=true; });
addEventListener('keydown',function(e){ if(!editMode||!selected)return; if(e.key==='Delete'||e.key==='Backspace'){ gGarden.remove(selected); deselect(); } if(e.key==='Escape')deselect(); });
document.getElementById('editBtn').addEventListener('click',function(){ editMode=!editMode; this.classList.toggle('on',editMode); document.getElementById('editbar').style.display=editMode?'flex':'none'; controls.mouseButtons=editMode?{LEFT:null,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE}:{LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}; document.getElementById('hint').textContent=editMode?'点击选中并拖动 · 右键旋转 · 滚轮缩放 · Delete删除':'左键旋转 · 滚轮缩放 · 右键平移'; if(!editMode)deselect(); });
Array.prototype.forEach.call(document.querySelectorAll('[data-add]'),function(b){ b.addEventListener('click',function(){ const f=FACTORIES[b.getAttribute('data-add')]; if(!f)return; const obj=f(); gGarden.add(obj); obj.position.set((Math.random()-0.5)*14,0.3,(Math.random()-0.5)*14); select(obj); }); });
document.getElementById('rotL').addEventListener('click',function(){ if(selected)selected.rotation.y-=Math.PI/8; });
document.getElementById('rotR').addEventListener('click',function(){ if(selected)selected.rotation.y+=Math.PI/8; });
document.getElementById('scUp').addEventListener('click',function(){ if(selected)selected.scale.multiplyScalar(1.15); });
document.getElementById('scDn').addEventListener('click',function(){ if(selected)selected.scale.multiplyScalar(0.87); });
document.getElementById('del').addEventListener('click',function(){ if(selected){ gGarden.remove(selected); deselect(); } });
initSelRing();

/* ===== 按钮 ===== */
document.getElementById('nightBtn').addEventListener('click',function(){ setNight(!night); this.textContent=night?'☀ 白天':'☾ 夜晚'; });
document.getElementById('rotBtn').addEventListener('click',function(){ controls.autoRotate=!controls.autoRotate; controls.autoRotateSpeed=0.5; this.classList.toggle('on',controls.autoRotate); });
document.getElementById('exportBtn').addEventListener('click',function(){ const exporter=new THREE.GLTFExporter(); const kn=night; setNight(false); exporter.parse(skyRoot,function(result){ const blob=new Blob([result],{type:'model/gltf-binary'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sky_island.glb'; a.click(); URL.revokeObjectURL(a.href); setNight(kn); },{binary:true}); });

/* ===== 动画 ===== */
addEventListener('resize',function(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
(function animate(){ requestAnimationFrame(animate); const t=performance.now()/1000; bobGroup.position.y=Math.sin(t*0.4)*0.35; miniIslands.forEach(function(m){ m.position.y=m.userData.baseY+Math.sin(t*0.5+m.userData.phase)*0.7; }); floatRocks.forEach(function(r){ r.position.y=r.userData.baseY+Math.sin(t*0.6+r.userData.phase)*0.4; }); const hub=gHouses.userData.hub; if(hub)hub.rotation.z=t*0.8; gCloudSea.position.x=Math.sin(t*0.05)*9; gCloudCum.position.x=Math.sin(t*0.07+1.3)*7; gCloudCum.position.z=Math.sin(t*0.05+0.7)*5; if(MAT.waterfall.map) MAT.waterfall.map.offset.y-=0.006; birds.forEach(function(b){ const u=b.userData; b.position.set(Math.cos(t*u.sp+u.ph)*u.r, u.y+Math.sin(t*0.7+u.ph)*0.5, Math.sin(t*u.sp+u.ph)*u.r); b.rotation.y=-(t*u.sp+u.ph)+Math.PI/2; u.w1.rotation.z=Math.sin(t*9)*0.55; u.w2.rotation.z=-Math.sin(t*9)*0.55; }); skyDome.position.copy(camera.position); skyBits.position.copy(camera.position); fireflies.forEach(function(f){ const u=f.userData; f.position.set(Math.cos(t*u.sp+u.a)*u.r,u.y+Math.sin(t*u.sp*1.7+u.ph)*0.5,Math.sin(t*u.sp+u.a)*u.r); }); controls.update(); renderer.render(scene,camera); })();
document.getElementById('label').textContent='云中岛 · 静谧祥和';
document.getElementById('loading').style.display='none';
