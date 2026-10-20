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
camera.position.set(38,11,47);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputEncoding=THREE.sRGBEncoding;
container.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.06; controls.minDistance=0.6; controls.maxDistance=300; controls.maxPolarAngle=Math.PI*0.9; controls.target.set(0,-1,0);

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
(function(){ const h1=makeHouse(1.0); h1.position.set(-12,0.3,3.5); h1.rotation.y=0.5; gHouses.add(h1); const h2=makeHouse(0.85); h2.position.set(10.6,0.3,2.4); h2.rotation.y=-0.6; gHouses.add(h2);
  const w=new THREE.Group(); cyl(w,0.85,1.25,2.8,MAT.wood,0,1.4,0,8); cone(w,1.05,0.95,MAT.roof,0,3.28,0,8); const hub=new THREE.Group(); for(let i=0;i<4;i++){ const pv=new THREE.Group(); box(pv,0.22,1.6,0.05,MAT.plaster,0,0.8,0); pv.rotation.z=i*Math.PI/2; hub.add(pv); } hub.position.set(0,2.9,-1.05); hub.rotation.y=Math.PI; w.add(hub); w.position.set(-11.2,0.3,-1.6); w.rotation.y=-0.4; gHouses.add(w); gHouses.userData.hub=hub;
  [[-8.5,4.5],[8.8,1]].forEach(function(p){ for(let i=0;i<4;i++){ box(gHouses,0.1,0.7,0.1,MAT.woodDark,p[0]+i*0.55,0.55,p[1]); } box(gHouses,1.8,0.08,0.06,MAT.woodDark,p[0]+0.85,0.75,p[1]); });
})();

/* ===== 瀑布(真实化: 多股水帘+翻口+水花+雾气) ===== */
var INTERACT=[], TORCHES=[], WATER_MATS=[], MISTS=[], SPLASH=[], RIPPLES=[], RIPPLE_ATS=[];
const castleLights=[], flags=[];
var WATER_TICK=null, WELL=null, FIRE_L=null;
function reg(obj,label,fn){ obj.userData.interact={label:label,fn:fn}; INTERACT.push(obj); }
function setTorch(t,on){ t.on=on; if(t.flame)t.flame.visible=on; if(t.light)t.light.intensity=on?(t.max||1.1):0; }
function foamMat(speed,op){ const tx=foamTex(); tx.wrapS=tx.wrapT=THREE.RepeatWrapping; const m=M(0xffffff,tx,{roughness:0.25,transparent:true,opacity:op,depthWrite:false}); m.userData.speed=speed; WATER_MATS.push(m); return m; }
function mistAt(parent,x,y,z,s){ const m=new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:0.3,depthWrite:false,color:0xEAF4FF}); m.userData={my:y,ph:Math.random()*6.28,sp:0.22+Math.random()*0.18}; const sp=new THREE.Sprite(m); sp.position.set(x,y,z); sp.scale.set(s,s*0.62,1); parent.add(sp); MISTS.push(m); return sp; }
function splashAt(parent,x,y,z,n,spread){ for(let i=0;i<n;i++){ const m=new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:0.7,depthWrite:false,color:0xffffff}); const s=0.22+Math.random()*0.42; const sp=new THREE.Sprite(m); sp.scale.set(s,s,1); sp.position.set(x+(Math.random()-0.5)*spread,y+(Math.random()-0.5)*0.5,z+(Math.random()-0.5)*spread); sp.userData={by:sp.position.y,ph:Math.random()*6.28,sp2:0.9+Math.random()*1.3}; parent.add(sp); SPLASH.push(sp); } }
function spawnRipple(p,x,y,z,big){
  const geo=new THREE.RingGeometry(0.12,0.2,26);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xEAF6FF,transparent:true,opacity:0.55,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set(x,y,z);
  m.userData={t0:performance.now(),dur:big?2000:1500,grow:big?7:4.5};
  p.add(m); RIPPLES.push(m);
}
function makeWaterfall(x,z,ry){
  const g=new THREE.Group();
  const base=[new THREE.Vector3(0,0.2,0),new THREE.Vector3(0.5,-2.5,0.4),new THREE.Vector3(0.2,-6.5,0.6),new THREE.Vector3(0.9,-11,0.3),new THREE.Vector3(0.4,-16,0.6)];
  [[0,0.55,0.88,0.0048],[0.42,0.34,0.62,0.0062],[-0.4,0.3,0.55,0.0036]].forEach(function(s,i){
    const pts=base.map(function(p,j){ return new THREE.Vector3(p.x+s[0]*(0.4+j*0.25), p.y, p.z+s[0]*0.5); });
    const curve=new THREE.CatmullRomCurve3(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,26,s[1],8,false),foamMat(s[3],0.92-i*0.14)));
  });
  /* 翻口白沫 */
  box(g,1.5,0.16,0.6,M(0xF4FAFE,null,{roughness:0.2}),0.1,0.16,0);
  box(g,0.9,0.1,0.4,M(0xFFFFFF,null,{roughness:0.2,transparent:true,opacity:0.85}),0.35,0.3,0.1);
  /* 崖缘石 */
  [[0.85,0.35,0.5],[-0.6,0.25,-0.2,0.4]].forEach(function(p){ const r=new THREE.Mesh(new THREE.DodecahedronGeometry(p[3]||0.5,0),MAT.rockDark); r.position.set(p[0],0.2,p[1]); r.rotation.set(Math.random(),Math.random()*3,Math.random()); r.castShadow=true; g.add(r); });
  splashAt(g,0.4,-15.4,0.5,9,1.7);
  splashAt(g,-0.2,-13.6,0.2,5,1.0);
  mistAt(g,0.3,-15.2,0.4,5); mistAt(g,-0.3,-13.7,0.1,3.2); mistAt(g,0.1,-11.3,0.3,2.4);
  g.position.set(x,0.1,z); g.rotation.y=ry; return g;
}
gFalls.add(makeWaterfall(11.6,5.5,-0.42));
gFalls.add(makeWaterfall(-11.8,-4.5,2.72));

/* ===== 花园 ===== */
function makeTreeSmall(s){ s=s||1; const g=new THREE.Group(); cyl(g,0.08*s,0.14*s,1.1*s,MAT.trunk,0,0.55*s,0,8);
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; const bx=Math.cos(a)*0.35*s, bz=Math.sin(a)*0.35*s; tubeBetween(new THREE.Vector3(0,0.7*s,0), new THREE.Vector3(bx*2.2,1.3*s,bz*2.2), 0.05*s, 0.03*s, MAT.trunk, g);
    for(let j=0;j<7;j++){ const m=new THREE.SpriteMaterial({map:leafTexMap,transparent:true,alphaTest:0.35}); m.rotation=Math.random()*Math.PI*2; foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(0.9*s+Math.random()*0.5*s,0.9*s+Math.random()*0.5*s,1); sp.position.set(bx*2.2+(Math.random()-0.5)*0.8*s, 1.5*s+Math.random()*0.8*s, bz*2.2+(Math.random()-0.5)*0.8*s); g.add(sp); } }
  return g; }
function makeBush(){ const g=new THREE.Group(); for(let i=0;i<14;i++){ const m=new THREE.SpriteMaterial({map:leafTexMap,transparent:true,alphaTest:0.35}); m.rotation=Math.random()*Math.PI*2; foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(0.5+Math.random()*0.4,0.5+Math.random()*0.4,1); sp.position.set((Math.random()-0.5)*0.7,0.2+Math.random()*0.25,(Math.random()-0.5)*0.7); g.add(sp); } return g; }
function makeFlower(){ const g=new THREE.Group(); const cols=['#E86A6A','#F0D050','#E878B0','#F5F0E0']; for(let i=0;i<6;i++){ const x=(Math.random()-0.5)*0.7,z=(Math.random()-0.5)*0.7; cyl(g,0.013,0.018,0.2,M(0x3E6B34),x,0.1,z,5); const m=new THREE.SpriteMaterial({map:flowerTex(cols[i%4]),transparent:true,depthWrite:false}); foliageMats.push(m); const sp=new THREE.Sprite(m); sp.scale.set(0.2,0.2,1); sp.position.set(x,0.26,z); g.add(sp); } return g; }
function makeRock(s){ s=s||0.6; const g=new THREE.Group(); const geo=new THREE.IcosahedronGeometry(s,1); const pos=geo.attributes.position; for(let i=0;i<pos.count;i++){ const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i); const d=0.8+Math.sin(x*3.1+y*4.3)*0.13+Math.cos(z*4.1)*0.12; pos.setXYZ(i,x*d,y*d*0.75,z*d); } geo.computeVertexNormals(); const m=new THREE.Mesh(geo,MAT.rockDark); m.castShadow=m.receiveShadow=true; g.add(m); return g; }
(function(){ [[-1.4,1.4],[1.8,1.9],[8,4.6],[-9,0],[0,9.4],[7.2,1.6],[-6,6]].forEach(function(p){ const f=makeFlower(); f.position.set(p[0],0.3,p[1]); gGarden.add(f); }); [[7,2],[5.5,7.8],[-4.5,-6.6],[6.5,-8]].forEach(function(p){ const b=makeBush(); b.position.set(p[0],0.3,p[1]); gGarden.add(b); }); [[11,6,0.9],[-11,3,0.8],[7,-9,0.7],[-6,-10,0.6],[12,-1,0.7]].forEach(function(p){ const r=makeRock(p[2]); r.position.set(p[0],0.25,p[1]); gGarden.add(r); }); [[-1,7],[1.5,7.4]].forEach(function(p){ const t=makeTreeSmall(1.1); t.position.set(p[0],0.3,p[1]); gGarden.add(t); }); })();

function stoneBlockTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d'); x.fillStyle='#B8AE98'; x.fillRect(0,0,256,256); for(let i=0;i<4000;i++){ x.globalAlpha=Math.random()*0.3; x.fillStyle=Math.random()<0.5?'#8A8070':'#D0C8B8'; x.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*3,1+Math.random()*3); } x.globalAlpha=1; x.strokeStyle='#7A7264'; x.lineWidth=2; for(let y=0;y<256;y+=32){ x.beginPath(); x.moveTo(0,y); x.lineTo(256,y); x.stroke(); } for(let bx=0;bx<256;bx+=48){ const off=(bx/48)%2?16:0; for(let y=0;y<256;y+=32){ x.beginPath(); x.moveTo(bx+off,y); x.lineTo(bx+off,y+32); x.stroke(); } } return new THREE.CanvasTexture(c); }
/* ===== 城堡(精修版·石砌要塞+内部陈设) ===== */
const cs=M(0xffffff, stoneBlockTex(), {roughness:0.88});
const csLight=M(0xD9D2BE, null, {roughness:0.85});
const csDark=M(0x8E8672, null, {roughness:0.95});
const iron=M(0x3A3F46, null, {roughness:0.5, metalness:0.55});
const gateWood=M(0xffffff, woodTexMap, {roughness:0.82});
const bannerRed=M(0xA03A3A, null, {side:THREE.DoubleSide, roughness:0.9});
const bannerBlue=M(0x3A5A9E, null, {side:THREE.DoubleSide, roughness:0.9});
const paving=M(0xB4AA92);
const floorWood=M(0xffffff, woodTexMap, {roughness:0.85});
const ceilM=M(0xE3DACA);
const rugRed=M(0x9E4A44), woodD=M(0x6B4A2E,null,{roughness:0.7});
const goldM=M(0xC8A85A, null, {metalness:0.75, roughness:0.35});

/* 石框拱窗 */
function castleWin(parent,x,y,z,ry,w,h){
  const g=new THREE.Group();
  box(g,w+0.32,h+0.18,0.16,csLight,0,0.04,0);
  box(g,w,h,0.18,glowMat(),0,0,0);
  const ag=new THREE.CylinderGeometry(w/2,w/2,0.18,12,1,false,0,Math.PI);
  ag.rotateZ(Math.PI/2);
  const arc=new THREE.Mesh(ag,glowMat()); arc.position.y=h/2; g.add(arc);
  box(g,0.05,h,0.2,csLight,0,0,0.01);
  box(g,w+0.5,0.12,0.34,csLight,0,-h/2-0.18,0);
  g.position.set(x,y,z); g.rotation.y=ry||0; parent.add(g); return g;
}
/* 箭窗 */
function slit(parent,x,y,z,ry){ const g=new THREE.Group(); box(g,0.12,1.0,0.12,csDark,0,0,0); box(g,0.5,0.12,0.12,csDark,0,0.18,0.01); g.position.set(x,y,z); g.rotation.y=ry||0; parent.add(g); return g; }
/* 旗下摆 */
function pennant(parent,x,y,z,mat,w,h,ph){
  const pv=new THREE.Group(); pv.position.set(x,y,z);
  const geo=new THREE.BoxGeometry(w,h,0.03); geo.translate(w/2+0.03,0,0);
  const m=new THREE.Mesh(geo,mat); m.castShadow=true; pv.add(m);
  parent.add(pv); pv.userData.ph=ph||0; flags.push(pv); return pv;
}
/* 塔楼 */
function buildTower(parent,x,z,r,h,roofed,seg){
  const g=new THREE.Group(); g.position.set(x,0,z); const sg=seg||12;
  cyl(g,r*1.08,r*1.16,1.1,csDark,0,0.55,0,sg);
  cyl(g,r,r,h-1.1,cs,0,1.1+(h-1.1)/2,0,sg);
  const n=Math.max(8,Math.round(r*7));
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; box(g,0.36,0.28,0.52,csLight,Math.cos(a)*(r+0.12),h-0.5,Math.sin(a)*(r+0.12),-a); }
  cyl(g,r+0.2,r+0.2,0.5,csLight,0,h+0.05,0,sg);
  if(roofed){
    cone(g,r+0.55,3.1,MAT.roof,0,h+1.85,0,sg);
    cyl(g,0.05,0.05,1.5,MAT.woodDark,0,h+4.6,0,5);
    pennant(g,0,h+5.3,0,bannerRed,0.7,0.4,Math.random()*6.28);
  } else {
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; box(g,0.5,0.62,0.34,cs,Math.cos(a)*(r+0.12),h+0.85,Math.sin(a)*(r+0.12),-a); }
  }
  [[0.5,0.58],[0.78,0.42]].forEach(function(lv,li){
    [0.5,2.35].forEach(function(a){
      castleWin(g,Math.cos(a)*(r+0.02),1.1+h*lv[0],Math.sin(a)*(r+0.02),Math.PI/2-a,lv[1],li?0.7:0.95);
    });
  });
  slit(g,Math.cos(3.6)*(r+0.03),h*0.45,Math.sin(3.6)*(r+0.03),Math.PI/2-3.6);
  parent.add(g); return g;
}
/* 城墙顶 */
function buildWall(parent,len,x,y,z,ry){
  const g=new THREE.Group(); g.position.set(x,y,z); g.rotation.y=ry||0;
  box(g,len,0.28,1.5,csLight,0,0.14,0);
  const n=Math.max(2,Math.round(len/1.15));
  for(let i=0;i<n;i++){ box(g,0.62,0.72,0.4,cs,-len/2+0.5+i*(len-1)/(n-1),0.72,-0.55); }
  box(g,len,0.4,0.18,cs,0,0.35,0.66);
  parent.add(g); return g;
}
/* 扶壁 */
function buttress(parent,x,z,ry){
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry||0;
  box(g,1.0,2.9,0.7,csDark,0,1.45,0); box(g,1.0,1.5,0.5,csDark,0,3.6,0.12);
  parent.add(g); return g;
}
function gableTri(x,z,ry,w,y0,h){
  const s=new THREE.Shape(); s.moveTo(-w/2,y0); s.lineTo(w/2,y0); s.lineTo(0,y0+h); s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:0.3,bevelEnabled:false}); geo.translate(0,0,-0.15);
  const m=new THREE.Mesh(geo,cs); m.position.set(x,0,z); m.rotation.y=ry||0; m.castShadow=true; m.receiveShadow=true; return m;
}
/* 可开合木门(铰链在一侧, 点击开/关) */
function makeDoor(parent,x,y,z,baseRy,w,h,thick,mat,openAng,label){
  const pv=new THREE.Group(); pv.position.set(x,y,z); pv.rotation.y=baseRy;
  const geo=new THREE.BoxGeometry(w,h,thick); geo.translate(w/2,0,0);
  const leaf=new THREE.Mesh(geo,mat); leaf.castShadow=true; leaf.receiveShadow=true; pv.add(leaf);
  [h*0.28,-h*0.28].forEach(function(by){ const b=new THREE.Mesh(new THREE.BoxGeometry(w,0.14,thick+0.03),iron); b.position.set(w/2,by,0); pv.add(b); });
  for(let r=0;r<3;r++){ const st=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,thick+0.06),iron); st.position.set(w-0.14,-h*0.3+r*h*0.3,0); pv.add(st); }
  const hd=new THREE.Mesh(new THREE.TorusGeometry(0.09,0.025,8,14),iron); hd.position.set(w-0.16,0,thick/2+0.02); pv.add(hd);
  parent.add(pv);
  pv.userData.door={open:false,baseRy:baseRy,openAng:openAng};
  reg(pv,label,function(){
    pv.userData.door.open=!pv.userData.door.open;
    const to=pv.userData.door.open?openAng:0;
    addTween('door'+pv.id,function(k){ pv.rotation.y=baseRy+to*easeInOut(k); },900);
  });
  return pv;
}
/* 火盆(可点击点燃/熄灭) */
function brazier(parent,x,z){
  const b=new THREE.Group();
  cyl(b,0.06,0.09,0.5,iron,0,0.25,0,6);
  cyl(b,0.34,0.26,0.16,iron,0,0.58,0,10);
  const fm=sph(b,0.13,M(0xFFB050,null,{emissive:0xFF7A1E,emissiveIntensity:1.8}),0,0.72,0);
  const l=new THREE.PointLight(0xFF9A3C,1.15,9); l.position.set(0,1.1,0); b.add(l);
  const t={flame:fm,light:l,max:1.15,on:true}; TORCHES.push(t);
  b.position.set(x,0,z); parent.add(b);
  reg(b,'火盆 · 点击点燃/熄灭',function(){ setTorch(t,!t.on); });
  return b;
}
/* 壁 torch */
function wallTorch(parent,x,y,z,ry){
  const tg=new THREE.Group(); tg.position.set(x,y,z); tg.rotation.y=ry||0;
  box(tg,0.1,0.1,0.4,iron,0,0,0.05);
  cyl(tg,0.085,0.05,0.16,iron,0,0.15,0.18,8);
  const fm=sph(tg,0.075,M(0xFFB84A,null,{emissive:0xFF8A20,emissiveIntensity:1.8}),0,0.28,0.18);
  const l=new THREE.PointLight(0xFF9A3C,0.85,7); l.position.set(0,0.45,0.35); tg.add(l);
  const t={flame:fm,light:l,max:0.85,on:true}; TORCHES.push(t);
  parent.add(tg);
  reg(tg,'火把 · 点击点燃/熄灭',function(){ setTorch(t,!t.on); });
  return t;
}
function buildCastle(){
  const g=new THREE.Group();
  const W=17, D=13, hWall=4.6, t=0.7;
  /* -- 环形城墙 -- */
  box(g,W,hWall,t,cs,0,hWall/2,-D/2);
  box(g,t,hWall,D-2*t,cs,-W/2,hWall/2,0);
  box(g,t,hWall,D-2*t,cs,W/2,hWall/2,0);
  const segW=(W-4.6)/2;
  box(g,segW,hWall,t,cs,-(2.3+segW/2),hWall/2,D/2);
  box(g,segW,hWall,t,cs,(2.3+segW/2),hWall/2,D/2);
  buildWall(g,W-1.6,0,hWall,-D/2,0);
  buildWall(g,D-3.2,-W/2,hWall,0,Math.PI/2);
  buildWall(g,D-3.2,W/2,hWall,0,-Math.PI/2);
  buildWall(g,segW-0.6,-(2.3+segW/2),hWall,D/2,Math.PI);
  buildWall(g,segW-0.6,(2.3+segW/2),hWall,D/2,Math.PI);
  [-6.2,-2.1,2.1,6.2].forEach(function(bx){ buttress(g,bx,-D/2-t/2-0.3,0); });
  [-3.4,0,3.4].forEach(function(bz){ buttress(g,W/2+t/2+0.3,bz,-Math.PI/2); buttress(g,-W/2-t/2-0.3,bz,Math.PI/2); });
  /* -- 四角塔 -- */
  buildTower(g,-W/2,-D/2,1.6,9.2,false);
  buildTower(g,W/2,-D/2,1.6,9.2,false);
  buildTower(g,-W/2,D/2,1.6,8.2,true);
  buildTower(g,W/2,D/2,1.6,8.2,true);
  /* -- 城门楼 -- */
  const gt=new THREE.Group(); gt.position.set(0,0,D/2); g.add(gt);
  buildTower(gt,-2.9,0,1.15,7.4,true,10);
  buildTower(gt,2.9,0,1.15,7.4,true,10);
  box(gt,4.8,6.4,2.4,cs,0,3.2,0);
  buildWall(gt,3.6,0,6.4,-0.2,0);
  buildWall(gt,3.6,0,6.4,0.2,Math.PI);
  const ag1=new THREE.CylinderGeometry(1.5,1.5,0.3,14,1,false,0,Math.PI);
  ag1.rotateZ(Math.PI/2); ag1.rotateY(Math.PI/2);
  const archTrim=new THREE.Mesh(ag1,csLight); archTrim.position.set(0,3.0,1.3); archTrim.castShadow=true; gt.add(archTrim);
  box(gt,2.9,3.0,2.0,M(0x1E1A14),0,1.5,0);
  /* 双扇城门(可点击开合) */
  makeDoor(gt,-1.4,1.3,1.05,0,1.4,2.6,0.14,gateWood,-1.9,'城门 · 点击开/关');
  makeDoor(gt,1.4,1.3,1.05,0,1.4,2.6,0.14,gateWood,1.9,'城门 · 点击开/关');
  for(let i=0;i<5;i++){ cyl(gt,0.045,0.045,1.3,iron,-1.1+i*0.55,3.9,0.5,6); }
  box(gt,2.3,0.08,0.06,iron,0,4.1,0.5); box(gt,2.3,0.08,0.06,iron,0,3.6,0.5);
  castleWin(gt,0,5.5,1.21,0,0.6,0.85);
  [-1.35,1.35].forEach(function(tx){ wallTorch(gt,tx,3.4,1.28,0); });
  const br=new THREE.Group(); br.position.set(0,0.42,3.1);
  box(br,2.6,0.1,3.8,gateWood,0,0,0);
  for(let i=0;i<6;i++){ box(br,2.6,0.02,0.1,iron,0,0.06,-1.75+i*0.7); }
  br.rotation.x=0.06; gt.add(br);
  tubeBetween(new THREE.Vector3(1.2,0.5,4.8),new THREE.Vector3(1.25,4.4,1.3),0.035,0.035,iron,gt);
  tubeBetween(new THREE.Vector3(-1.2,0.5,4.8),new THREE.Vector3(-1.25,4.4,1.3),0.035,0.035,iron,gt);
  box(gt,2.9,0.3,0.7,csLight,0,0.15,1.55);
  /* -- 主堡(三层退台, 一层掏空=王座厅) -- */
  const K={x:0.3,z:-3.2};
  box(g,8.4,0.5,6.0,csDark,K.x,0.25,K.z);
  box(g,8.0,5.2,0.4,cs,K.x,3.1,K.z-2.6);
  box(g,3.2,5.2,0.4,cs,K.x-2.4,3.1,K.z+2.6);
  box(g,3.2,5.2,0.4,cs,K.x+2.4,3.1,K.z+2.6);
  box(g,0.4,5.2,4.8,cs,K.x+3.8,3.1,K.z);
  box(g,0.4,5.2,4.8,cs,K.x-3.8,3.1,K.z);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){
    for(let i=0;i<6;i++){ box(g,0.55,0.85,0.55,csLight,K.x+c[0]*4.05,0.9+i*0.85,K.z+c[1]*2.85); }
  });
  castleWin(g,K.x-1.6,3.4,K.z+2.83,0,0.85,1.5);
  castleWin(g,K.x+2.2,3.4,K.z+2.83,0,0.85,1.5);
  castleWin(g,K.x-1.6,3.4,K.z-2.83,Math.PI,0.85,1.5);
  castleWin(g,K.x+2.2,3.4,K.z-2.83,Math.PI,0.85,1.5);
  castleWin(g,K.x+4.03,3.2,K.z,Math.PI/2,0.8,1.4);
  castleWin(g,K.x-4.03,3.2,K.z,-Math.PI/2,0.8,1.4);
  slit(g,K.x+0.3,2.2,K.z+2.84,0); slit(g,K.x+0.3,2.2,K.z-2.84,Math.PI);
  box(g,8.5,0.28,6.1,csLight,K.x,5.78,K.z);
  /* --- 王座厅内部 --- */
  box(g,7.2,0.08,4.8,floorWood,K.x,0.54,K.z);
  box(g,7.2,0.2,4.8,ceilM,K.x,5.65,K.z);
  box(g,2.0,0.03,4.0,rugRed,K.x,0.60,K.z+0.4);
  box(g,3.0,0.22,1.6,csDark,K.x,0.69,K.z-1.85);
  box(g,2.4,0.22,1.2,csDark,K.x,0.91,K.z-2.0);
  (function(){ const ty=1.02, tz=K.z-2.15;
    box(g,0.9,0.14,0.8,woodD,K.x,ty+0.25,tz);
    box(g,0.78,0.1,0.66,rugRed,K.x,ty+0.37,tz);
    box(g,0.9,1.6,0.14,woodD,K.x,ty+1.0,tz-0.36);
    sph(g,0.13,goldM,K.x,ty+1.9,tz-0.36);
    box(g,0.12,0.55,0.7,woodD,K.x-0.5,ty+0.55,tz);
    box(g,0.12,0.55,0.7,woodD,K.x+0.5,ty+0.55,tz);
  })();
  [[-1.9],[1.9]].forEach(function(p){
    cyl(g,0.26,0.32,4.6,cs,K.x+p[0],2.9,K.z+0.4,10);
    box(g,0.75,0.18,0.75,csDark,K.x+p[0],0.65,K.z+0.4);
    box(g,0.72,0.16,0.72,csLight,K.x+p[0],5.25,K.z+0.4);
  });
  (function(){ const px=K.x+2.2, pz=K.z-1.6;
    cyl(g,0.09,0.11,4.6,woodD,px,2.85,pz,8);
    for(let i=0;i<12;i++){ const a=i*0.55;
      const st=box(g,0.85,0.09,0.3,woodD,px+Math.cos(a)*0.5,0.78+i*0.3,pz+Math.sin(a)*0.5);
      st.rotation.y=-a;
    }
  })();
  (function(){ const cx=K.x, cy=4.62, cz=K.z-0.6;
    cyl(g,0.025,0.025,0.9,iron,cx,5.15,cz,6);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.05,8,20),iron);
    ring.rotation.x=Math.PI/2; ring.position.set(cx,cy,cz); g.add(ring);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2;
      cyl(g,0.035,0.035,0.22,M(0xEDE4D0),cx+Math.cos(a)*0.55,cy+0.14,cz+Math.sin(a)*0.55,6);
      const gl=sph(g,0.06,glowMat(),cx+Math.cos(a)*0.55,cy+0.3,cz+Math.sin(a)*0.55);
    }
    const l=new THREE.PointLight(0xFFC964,0.8,9); l.position.set(cx,4.4,cz); g.add(l); castleLights.push(l);
  })();
  [[-1.3,bannerRed],[1.3,bannerBlue]].forEach(function(p){ box(g,0.7,1.9,0.04,p[1],K.x+p[0],3.5,K.z-2.36); });
  (function(){ const wx=K.x+3.55;
    box(g,0.06,1.7,1.8,woodD,wx,2.0,K.z-0.4);
    [-0.5,0,0.5].forEach(function(oz){
      const sp=cyl(g,0.03,0.03,1.9,MAT.woodDark,wx-0.05,2.1,K.z-0.4+oz,6);
      sp.rotation.z=-0.06;
      cone(g,0.06,0.22,iron,wx+0.09,3.12,K.z-0.4+oz,6);
    });
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.06,18),M(0x8A94A6,null,{metalness:0.6,roughness:0.4}));
    sh.rotation.z=Math.PI/2; sh.position.set(wx-0.1,1.3,K.z-1.5); sh.castShadow=true; g.add(sh);
    sph(g,0.09,goldM,wx-0.16,1.3,K.z-1.5);
  })();
  box(g,0.7,0.75,1.4,woodD,K.x-3.35,0.95,K.z-0.6);
  (function(){ const cx=K.x-3.3, cz=K.z-0.6;
    cyl(g,0.025,0.035,0.3,goldM,cx,1.25,cz,6);
    [-0.12,0,0.12].forEach(function(oz){ sph(g,0.05,glowMat(),cx,1.44,cz+oz); });
  })();
  wallTorch(g,K.x-2.6,2.9,K.z+2.32,Math.PI);
  wallTorch(g,K.x+2.6,2.9,K.z+2.32,Math.PI);
  /* 主堡大门(可点击, 开门并进入王座厅) */
  const ag2=new THREE.CylinderGeometry(0.85,0.85,0.4,12,1,false,0,Math.PI);
  ag2.rotateZ(Math.PI/2); ag2.rotateY(Math.PI/2);
  const dArch=new THREE.Mesh(ag2,csLight); dArch.position.set(K.x,2.15,K.z+2.8); g.add(dArch);
  const keepDoor=makeDoor(g,K.x-0.8,1.43,K.z+2.78,0,1.6,1.7,0.14,gateWood,1.7,'主堡大门 · 点击进入王座厅');
  reg(keepDoor,'主堡大门 · 点击进入王座厅',function(){
    const d=keepDoor.userData.door; d.open=!d.open;
    const to=d.open?1.7:0;
    addTween('keepDoor',function(k){ keepDoor.rotation.y=to*easeInOut(k); },900);
    if(typeof tweenCam==='function'){
      if(d.open) tweenCam([K.x+0.5,3.1,K.z+2.0],[K.x,1.9,K.z-2.3]);
      else tweenCam([11,8,11],[0.5,2.5,-2.5]);
    }
  });
  box(g,1.9,0.5,0.9,csLight,K.x,0.25,K.z+3.2);
  /* 二层 */
  box(g,6.4,3.6,4.4,cs,K.x,7.7,K.z);
  castleWin(g,K.x-1.4,7.4,K.z+2.23,0,0.8,1.3);
  castleWin(g,K.x+1.4,7.4,K.z+2.23,0,0.8,1.3);
  castleWin(g,K.x-1.4,7.4,K.z-2.23,Math.PI,0.8,1.3);
  castleWin(g,K.x+3.23,7.2,K.z,Math.PI/2,0.75,1.2);
  slit(g,K.x+3.24,6.4,K.z+0.9,Math.PI/2);
  box(g,6.9,0.24,4.9,csLight,K.x,9.62,K.z);
  for(let i=0;i<6;i++){ box(g,0.55,0.6,0.36,cs,K.x-2.9+i*1.16,9.98,K.z+2.25); box(g,0.55,0.6,0.36,cs,K.x-2.9+i*1.16,9.98,K.z-2.25); }
  [1,-1].forEach(function(sz){ for(let i=0;i<4;i++){ box(g,0.36,0.6,0.55,cs,K.x+sz*3.15,9.98,K.z-1.7+i*1.13); } });
  /* 三层塔楼 */
  box(g,3.4,3.2,3.0,cs,K.x,11.45,K.z);
  castleWin(g,K.x,11.8,K.z+1.53,0,0.7,1.1);
  castleWin(g,K.x+1.73,11.6,K.z,Math.PI/2,0.7,1.1);
  castleWin(g,K.x-1.73,11.6,K.z,-Math.PI/2,0.7,1.1);
  const kRoof=new THREE.Mesh(new THREE.ConeGeometry(2.7,2.6,4),MAT.roof);
  kRoof.position.set(K.x,14.35,K.z); kRoof.rotation.y=Math.PI/4; kRoof.castShadow=true; g.add(kRoof);
  cyl(g,0.05,0.05,1.6,MAT.woodDark,K.x,15.6,K.z,5);
  pennant(g,K.x,16.15,K.z,bannerRed,0.85,0.46,1.2);
  /* -- 大厅(西翼掏空=宴会厅) -- */
  const H={x:-5.7,z:-1.6};
  box(g,0.35,3.4,6.6,cs,H.x-2.125,2.2,H.z);
  box(g,0.35,3.4,2.7,cs,H.x+2.125,2.2,H.z+1.95);
  box(g,0.35,3.4,2.7,cs,H.x+2.125,2.2,H.z-1.95);
  box(g,4.25,3.4,0.35,cs,H.x,2.2,H.z+3.125);
  box(g,4.25,3.4,0.35,cs,H.x,2.2,H.z-3.125);
  /* --- 宴会厅内部 --- */
  box(g,3.9,0.08,5.9,M(0xBFB49A),H.x,0.54,H.z);
  box(g,3.9,0.16,5.9,ceilM,H.x,3.8,H.z);
  box(g,2.6,0.03,3.6,rugRed,H.x-0.3,0.60,H.z);
  /* 壁炉 */
  (function(){ const fx=H.x-1.83, fz=H.z+0.9;
    box(g,0.25,1.6,1.7,csDark,fx,1.35,fz);
    box(g,0.22,0.75,0.9,M(0x140F0A),fx+0.13,0.95,fz);
    box(g,0.35,0.12,1.9,csLight,fx+0.05,2.22,fz);
    cyl(g,0.07,0.07,0.55,MAT.woodDark,fx+0.15,0.72,fz-0.1,6).rotation.x=Math.PI/2;
    cyl(g,0.06,0.06,0.5,MAT.woodDark,fx+0.16,0.85,fz+0.05,6).rotation.x=Math.PI/2;
    [[0,0.78],[0.1,0.95],[-0.08,0.92]].forEach(function(p,i){
      cone(g,0.1-i*0.015,0.3,M(0xFFA040,null,{emissive:0xFF6A1E,emissiveIntensity:1.6}),fx+0.2,p[1],fz+p[0],6);
    });
    FIRE_L=new THREE.PointLight(0xFF8A3C,0.95,8); FIRE_L.position.set(fx+0.55,1.1,fz);
    FIRE_L.userData.base=0.95; g.add(FIRE_L);
  })();
  /* 长桌+长凳+餐具 */
  (function(){ const tx=H.x+0.5;
    box(g,1.0,0.08,3.6,woodD,tx,1.05,H.z);
    [[-1.5],[1.5]].forEach(function(p){
      box(g,0.08,0.72,0.08,woodD,tx-0.38,0.68,H.z+p[0]);
      box(g,0.08,0.72,0.08,woodD,tx+0.38,0.68,H.z+p[0]);
    });
    [[H.x-0.45],[H.x+1.45]].forEach(function(p){
      box(g,0.42,0.08,3.4,woodD,p[0],0.72,H.z);
      box(g,0.36,0.3,0.08,woodD,p[0],0.9,H.z-1.5);
      box(g,0.36,0.3,0.08,woodD,p[0],0.9,H.z+1.5);
    });
    [-1.2,0,1.2].forEach(function(oz){
      cyl(g,0.15,0.13,0.035,M(0xE8E4DC),tx,1.11,H.z+oz,12);
      cyl(g,0.05,0.06,0.1,M(0xC8B090),tx,1.13,H.z+oz+0.45,8);
    });
    [-0.6,0.6].forEach(function(oz){
      cyl(g,0.02,0.03,0.2,goldM,tx,1.2,H.z+oz,6);
      sph(g,0.055,glowMat(),tx,1.33,H.z+oz);
    });
  })();
  (function(){ const cx=H.x, cy=3.05, cz=H.z;
    cyl(g,0.02,0.02,0.55,iron,cx,3.5,cz,6);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.38,0.04,8,18),iron);
    ring.rotation.x=Math.PI/2; ring.position.set(cx,cy,cz); g.add(ring);
    for(let i=0;i<4;i++){ const a=i/4*Math.PI*2+0.4;
      cyl(g,0.03,0.03,0.18,M(0xEDE4D0),cx+Math.cos(a)*0.38,cy+0.11,cz+Math.sin(a)*0.38,6);
      sph(g,0.05,glowMat(),cx+Math.cos(a)*0.38,cy+0.24,cz+Math.sin(a)*0.38);
    }
  })();
  box(g,1.2,0.06,0.28,woodD,H.x,2.3,H.z-2.85);
  [-0.35,0,0.35].forEach(function(ox){ cyl(g,0.06,0.05,0.14,M(0xD8CBB0),H.x+ox,2.4,H.z-2.85,8); });
  /* 宴会厅门(可点击, 开门并进入) */
  const hallDoor=makeDoor(g,H.x+2.3,1.43,H.z+0.6,Math.PI/2,1.2,1.7,0.14,gateWood,1.8,'宴会厅 · 点击进入');
  reg(hallDoor,'宴会厅 · 点击进入',function(){
    const d=hallDoor.userData.door; d.open=!d.open;
    const to=d.open?1.8:0;
    addTween('hallDoor',function(k){ hallDoor.rotation.y=Math.PI/2+to*easeInOut(k); },900);
    if(typeof tweenCam==='function'){
      if(d.open) tweenCam([H.x+1.7,2.5,H.z+1.9],[H.x-1.6,1.3,H.z-0.6]);
      else tweenCam([11,8,11],[0.5,2.5,-2.5]);
    }
  });
  slit(g,H.x-2.32,2.4,H.z,-Math.PI/2);
  /* -- 马厩(东翼) -- */
  const S={x:6.2,z:-2.8};
  box(g,3.6,2.3,3.2,MAT.wood,S.x,1.65,S.z);
  const sr=new THREE.Mesh(new THREE.BoxGeometry(4.3,0.14,3.9),MAT.roof);
  sr.position.set(S.x,3.0,S.z); sr.rotation.z=0.16; sr.castShadow=true; g.add(sr);
  box(g,1.3,1.8,0.12,MAT.woodDark,S.x-0.6,1.4,S.z+1.62);
  box(g,0.7,0.6,0.1,MAT.woodDark,S.x+1.0,1.1,S.z+1.62);
  cyl(g,0.32,0.36,0.75,MAT.woodDark,S.x+2.2,0.88,S.z+2.1,10);
  cyl(g,0.32,0.36,0.75,MAT.woodDark,S.x+2.75,0.88,S.z+1.85,10);
  box(g,0.7,0.7,0.7,MAT.wood,S.x+2.4,0.85,S.z-2.1);
  /* -- 内院 -- */
  for(let ix=0;ix<6;ix++){ for(let iz=0;iz<4;iz++){
    const px=-5.2+ix*2.1, pz=-4.9+iz*2.2;
    if(px>K.x-4.7 && px<K.x+4.7 && pz<K.z+3.5) continue;
    if(px>H.x-2.9 && px<H.x+2.9 && pz>H.z-3.9 && pz<H.z+3.9) continue;
    if(px>S.x-2.4 && px<S.x+2.4 && pz>S.z-2.2 && pz<S.z+2.2) continue;
    box(g,1.95,0.06,1.95,paving,px,0.03,pz,((ix+iz)%2)*0.08);
  } }
  /* 水井(可点击打水) */
  const w2=new THREE.Group();
  cyl(w2,0.6,0.66,0.55,MAT.stone,0,0.28,0,10);
  cyl(w2,0.48,0.48,0.08,M(0x2E4A5C),0,0.48,0,10);
  box(w2,0.07,1.5,0.07,MAT.woodDark,-0.6,1.2,0); box(w2,0.07,1.5,0.07,MAT.woodDark,0.6,1.2,0);
  cyl(w2,0.03,0.03,1.3,MAT.woodDark,0,1.9,0,5);
  cone(w2,0.85,0.5,MAT.roof,0,2.55,0,4);
  const wind=cyl(w2,0.05,0.05,1.25,woodD,0,1.9,0,8); wind.rotation.z=Math.PI/2;
  const rope=cyl(w2,0.014,0.014,1.0,M(0x4A4038),0,1.38,0,5);
  const bucket=cyl(w2,0.13,0.10,0.22,woodD,0,0.82,0,10);
  w2.userData={bucket:bucket,rope:rope,wind:wind};
  w2.position.set(4.6,0,3.4); g.add(w2);
  reg(w2,'水井 · 点击打水',function(){
    if(WELL)return;
    WELL={t0:performance.now(),u:w2.userData};
  });
  [[-5.4,bannerRed],[5.4,bannerBlue]].forEach(function(p){
    const pg=new THREE.Group(); pg.position.set(p[0],0,4.6);
    cyl(pg,0.06,0.09,4.6,MAT.woodDark,0,2.3,0,6);
    cyl(pg,0.15,0.15,0.1,M(0xC8A85A,null,{metalness:0.7,roughness:0.4}),0,4.65,0,8);
    box(pg,1.15,0.06,0.06,MAT.woodDark,0,4.35,0);
    box(pg,0.85,1.5,0.03,p[1],0.12,3.55,0);
    g.add(pg);
  });
  brazier(g,-2.3,0.7); brazier(g,2.9,0.7);
  const t1=makeTreeSmall(0.8); t1.position.set(-6.3,0,-5.8); g.add(t1);
  const t2=makeTreeSmall(0.7); t2.position.set(7.3,0,-6.9); g.add(t2);
  const f1=makeFlower(); f1.position.set(-1.4,0,1.6); g.add(f1);
  const f2=makeFlower(); f2.position.set(1.8,0,1.9); g.add(f2);
  return g;
}
/* 大树挪到前院西侧(让位假山) */
gTree.position.set(-5.5, 0.3, 10.2);
/* -- 假山+池塘(前院西侧, 带跌水/涟漪/睡莲/芦苇) -- */
(function(){
  const R=new THREE.Group(); R.position.set(-9.5,0.3,8.0); gGarden.add(R);
  const basin=cyl(R,2.5,2.2,0.3,MAT.stone,0,0.15,0,24); basin.scale.x=1.35; basin.receiveShadow=true;
  const water=cyl(R,2.3,2.3,0.05,M(0x5E9EC4,null,{roughness:0.12,metalness:0.15}),0,0.31,0,24);
  water.scale.x=1.35; water.receiveShadow=true;
  const shim=new THREE.Mesh(new THREE.CircleGeometry(2.28,24),foamMat(0.0016,0.3));
  shim.rotation.x=-Math.PI/2; shim.scale.x=1.35; shim.position.y=0.345; R.add(shim);
  [[-0.4,0.9,0.6,1.5],[0.55,0.55,0.25,1.1],[-0.95,0.45,-0.25,0.9],[0.15,1.35,0.35,0.95],[-0.15,1.75,0.5,0.75],[0.85,0.85,-0.35,0.8],[-0.55,1.2,-0.35,0.65]].forEach(function(p){
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(p[3],0), p[1]>1?MAT.rockA:MAT.rockDark);
    m.position.set(p[0],0.3+p[1]*0.62,p[2]);
    m.scale.set(1,0.72+Math.random()*0.3,1);
    m.rotation.set(Math.random()*0.5,Math.random()*Math.PI,Math.random()*0.5);
    m.castShadow=true; m.receiveShadow=true; R.add(m);
  });
  [[-0.7,1.35,0.5],[0.3,1.8,0.45],[0.7,0.9,-0.3],[-0.4,0.6,0.75]].forEach(function(p){
    sph(R,0.14+Math.random()*0.1,M(0x4E7A3C),p[0],0.3+p[1]*0.62+0.35,p[2]);
  });
  /* 跌水: 假山顶跌入池塘 */
  (function(){
    const pts=[new THREE.Vector3(-0.1,2.35,0.45),new THREE.Vector3(0.0,1.7,0.7),new THREE.Vector3(0.1,1.0,0.9),new THREE.Vector3(0.12,0.42,1.05)];
    const curve=new THREE.CatmullRomCurve3(pts);
    R.add(new THREE.Mesh(new THREE.TubeGeometry(curve,20,0.15,8,false),foamMat(0.006,0.92)));
    box(R,0.5,0.1,0.35,M(0xF4FAFE,null,{roughness:0.2}),-0.1,2.32,0.45);
    RIPPLE_ATS.push({p:R,x:0.12,y:0.38,z:1.05});
    splashAt(R,0.12,0.45,1.05,4,0.7);
  })();
  /* 睡莲+芦苇 */
  [[-1.1,0.6],[0.9,-0.7],[-0.3,1.6]].forEach(function(p){
    const lp=cyl(R,0.22,0.22,0.02,M(0x3E6B34),p[0],0.335,p[1],12);
    const fm2=new THREE.SpriteMaterial({map:flowerTex('#F0A8C8'),transparent:true,depthWrite:false});
    const sp=new THREE.Sprite(fm2); sp.scale.set(0.18,0.18,1); sp.position.set(p[0]+0.05,0.42,p[1]); R.add(sp);
  });
  [[1.7,1.4],[1.9,1.1],[-1.8,-0.9]].forEach(function(p){
    for(let i=0;i<3;i++){ cyl(R,0.02,0.03,0.8+Math.random()*0.5,M(0x5A7A3A),p[0]+(Math.random()-0.5)*0.2,0.75,p[1]+(Math.random()-0.5)*0.2,5); }
  });
  mistAt(R,0,0.7,1.3,2.2);
  reg(water,'假山池塘 · 点击泛涟漪',function(){
    spawnRipple(R,0.12,0.4,1.05,true);
    setTimeout(function(){ spawnRipple(R,0.12,0.4,1.05,true); },260);
    setTimeout(function(){ spawnRipple(R,0.12,0.4,1.05,true); },520);
  });
})();
/* 少量点缀石 */
[[7.8,7.2,0.8],[10.0,6.2,0.7]].forEach(function(p){ const r=makeRock(p[2]); r.position.set(p[0],0.25,p[1]); gGarden.add(r); });
/* 城堡落位(主门朝南/正对视角) */
const castle=buildCastle(); castle.position.set(0.5,0.3,-4.0); gHouses.add(castle);

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
  for(let i=0;i<6;i++){ box(gGarden, 1.25, 0.06, 0.92, pathMat, -2.5, 0.33, 7.6+i*1.1, (Math.random()-0.5)*0.35); }
  // 菜园(田垄+作物+篱笆)
  const soil=M(0x6B4A2E);
  for(let r=0;r<4;r++){ box(gGarden, 3.6, 0.12, 0.8, soil, 12.8, 0.36, -0.6+r*1.35); for(let c=0;c<7;c++){ const crop=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.38,5), M(0x5A9440)); crop.position.set(11.4+c*0.44, 0.58, -0.6+r*1.35); crop.castShadow=true; gGarden.add(crop); } }
  for(let i=0;i<6;i++){ box(gGarden, 0.08, 0.55, 0.08, MAT.woodDark, 10.9, 0.55, -1.4+i*1.1); box(gGarden, 0.08, 0.55, 0.08, MAT.woodDark, 14.7, 0.55, -1.4+i*1.1); }
  box(gGarden, 3.9, 0.06, 0.06, MAT.woodDark, 12.8, 0.78, -1.45); box(gGarden, 3.9, 0.06, 0.06, MAT.woodDark, 12.8, 0.78, 2.0);
  // 水井
  const well=new THREE.Group(); cyl(well,0.7,0.78,0.5,MAT.stone,0,0.25,0,12); cyl(well,0.56,0.56,0.1,M(0x3A5A70),0,0.3,0,12); box(well,0.08,1.5,0.08,MAT.woodDark,-0.62,1.0,0); box(well,0.08,1.5,0.08,MAT.woodDark,0.62,1.0,0); cone(well,0.95,0.55,MAT.roof,0,2.0,0,4); well.position.set(-11.5,0.3,3.0); gGarden.add(well);
  // 灯柱(夜晚亮)
  function lantern(x,z){ const g=new THREE.Group(); cyl(g,0.06,0.09,1.7,MAT.woodDark,0,0.85,0,8); box(g,0.28,0.36,0.28,glowMat(),0,1.82,0); cone(g,0.27,0.26,MAT.roof,0,2.14,0,4); g.position.set(x,0.3,z); gGarden.add(g); }
  lantern(-2.6,5.6); lantern(2.4,7.0); lantern(7.4,-7.6); lantern(-9.8,3.2);
  // 更多树
  [[-9,3],[9,6],[-9.5,-7.5],[10,-6],[-4,9],[6,8],[12,2],[-9,-6]].forEach(function(p){ const t=makeTreeSmall(0.9+Math.random()*0.5); t.position.set(p[0],0.3,p[1]); gGarden.add(t); });
  // 花坛带
  for(let i=0;i<10;i++){ const f=makeFlower(); f.position.set(2+i*1.3, 0.3, 8.6+Math.sin(i*1.7)*0.9); gGarden.add(f); }
  // 长凳
  box(gGarden, 1.7, 0.1, 0.5, MAT.wood, -4.9, 0.55, 6.8); box(gGarden, 1.7, 0.1, 0.16, MAT.wood, -4.9, 0.82, 6.55); box(gGarden, 0.08, 0.5, 0.42, MAT.woodDark, -5.6, 0.3, 6.8); box(gGarden, 0.08, 0.5, 0.42, MAT.woodDark, -4.2, 0.3, 6.8);
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
function setNight(v){ night=v; sun.intensity=v?0.0:1.35; hemi.intensity=v?0.14:1.0; moonLight.intensity=v?0.5:0.0; skyDome.material.map=v?skyNightTex:skyDayTex; skyDome.material.needsUpdate=true; scene.fog.color.set(v?0x0A1424:0x8FC3E8); scene.background=new THREE.Color(v?0x04091A:0x8FC3E8); glowMats.forEach(function(m){ m.emissiveIntensity=v?1.1:0.0; }); cloudMats.forEach(function(m){ m.color=new THREE.Color(v?0x46536E:0xffffff); }); foliageMats.forEach(function(m){ m.color=new THREE.Color(v?0x3A5040:0xffffff); }); sunCore.visible=sunMid.visible=sunHalo.visible=!v; moonBall.visible=moonGlow.visible=v; starMat.opacity=v?0.95:0; fireflies.forEach(function(f){ f.visible=v; }); castleLights.forEach(function(l){ l.intensity=v?1.0:0.55; }); TORCHES.forEach(function(t){ setTorch(t,true); }); }
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
(function animate(){ requestAnimationFrame(animate); const t=performance.now()/1000; bobGroup.position.y=Math.sin(t*0.4)*0.35; miniIslands.forEach(function(m){ m.position.y=m.userData.baseY+Math.sin(t*0.5+m.userData.phase)*0.7; }); floatRocks.forEach(function(r){ r.position.y=r.userData.baseY+Math.sin(t*0.6+r.userData.phase)*0.4; }); const hub=gHouses.userData.hub; if(hub)hub.rotation.z=t*0.8; gCloudSea.position.x=Math.sin(t*0.05)*9; gCloudCum.position.x=Math.sin(t*0.07+1.3)*7; gCloudCum.position.z=Math.sin(t*0.05+0.7)*5; flags.forEach(function(f){ f.rotation.y=Math.sin(t*2.1+f.userData.ph)*0.45; }); if(WATER_TICK)WATER_TICK(t); birds.forEach(function(b){ const u=b.userData; b.position.set(Math.cos(t*u.sp+u.ph)*u.r, u.y+Math.sin(t*0.7+u.ph)*0.5, Math.sin(t*u.sp+u.ph)*u.r); b.rotation.y=-(t*u.sp+u.ph)+Math.PI/2; u.w1.rotation.z=Math.sin(t*9)*0.55; u.w2.rotation.z=-Math.sin(t*9)*0.55; }); skyDome.position.copy(camera.position); skyBits.position.copy(camera.position); fireflies.forEach(function(f){ const u=f.userData; f.position.set(Math.cos(t*u.sp+u.a)*u.r,u.y+Math.sin(t*u.sp*1.7+u.ph)*0.5,Math.sin(t*u.sp+u.a)*u.r); }); controls.update(); renderer.render(scene,camera); })();
document.getElementById('label').textContent='云中岛 · 静谧祥和';
document.getElementById('loading').style.display='none';


/* ===== 交互系统 + 视角导览 + 水面动态 ===== */
function easeInOut(k){ return k<0.5 ? 4*k*k*k : 1-Math.pow(-2*k+2,3)/2; }
var tweens=[];
function addTween(key,fn,dur){
  for(let i=tweens.length-1;i>=0;i--){ if(tweens[i].key===key) tweens.splice(i,1); }
  tweens.push({ key:key, t0:performance.now(), dur:dur||900, fn:fn });
}
function tweenVec(key,v,to,dur){
  const from=v.clone(); const toV=new THREE.Vector3(to[0],to[1],to[2]);
  addTween(key,function(k){ v.lerpVectors(from,toV,k); },dur);
}
function tweenCam(pos,tgt){
  tweenVec('camPos',camera.position,pos,1300);
  tweenVec('camTgt',controls.target,tgt,1300);
}
var lastRip=0;
WATER_TICK=function(t){
  WATER_MATS.forEach(function(m){ if(m.map) m.map.offset.y-=(m.userData.speed||0.004); });
  MISTS.forEach(function(m){ const u=m.userData; m.opacity=0.22+0.14*(0.5+0.5*Math.sin(t*u.sp*2+u.ph)); });
  SPLASH.forEach(function(sp){ const u=sp.userData; sp.position.y=u.by+Math.abs(Math.sin(t*u.sp2+u.ph))*0.55; sp.material.opacity=0.35+0.4*Math.abs(Math.sin(t*u.sp2*1.3+u.ph)); });
  RIPPLES.forEach(function(m){
    const e=(performance.now()-m.userData.t0)/m.userData.dur;
    if(e>=1){ m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); m.userData.dead=true; }
    else { const s=1+e*m.userData.grow; m.scale.set(s,s,1); m.material.opacity=0.55*(1-e); }
  });
  for(let i=RIPPLES.length-1;i>=0;i--){ if(RIPPLES[i].userData.dead) RIPPLES.splice(i,1); }
  if(t-lastRip>1.6){ lastRip=t; RIPPLE_ATS.forEach(function(a){ spawnRipple(a.p,a.x,a.y,a.z,false); }); }
  if(FIRE_L) FIRE_L.intensity=FIRE_L.userData.base*(0.88+0.24*Math.abs(Math.sin(t*11))+0.08*Math.sin(t*23));
  if(WELL){
    const e=(performance.now()-WELL.t0)/2600;
    const u=WELL.u;
    if(e>=1){ u.bucket.position.y=0.82; u.rope.position.y=1.38; u.rope.scale.y=1; WELL=null; }
    else { const k=Math.sin(e*Math.PI); u.bucket.position.y=0.82+k*1.0; u.rope.position.y=1.38-k*0.48; u.rope.scale.y=1-k*0.52; u.wind.rotation.x+=0.1; }
  }
  tweens.forEach(function(tw){
    const e=Math.min(1,(performance.now()-tw.t0)/tw.dur);
    tw.fn(easeInOut(e)); if(e>=1) tw.dead=true;
  });
  for(let i=tweens.length-1;i>=0;i--){ if(tweens[i].dead) tweens.splice(i,1); }
};
(function(){
  const st=document.createElement('style');
  st.textContent='#viewbar{position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:20}'+
    '#viewbar button{background:rgba(15,25,40,0.72);color:#EAF2FA;border:1px solid rgba(150,190,230,0.35);border-radius:16px;padding:5px 13px;font-size:12px;font-family:inherit;cursor:pointer}'+
    '#viewbar button:hover{background:rgba(40,70,110,0.85)} #viewbar button.on{background:#2E6FBF;border-color:#6FA8E0}'+
    '#tip{position:fixed;display:none;background:rgba(10,18,30,0.88);color:#FFE9B8;padding:4px 10px;border-radius:12px;font-size:12px;pointer-events:none;z-index:30;border:1px solid rgba(255,220,150,0.4);white-space:nowrap}';
  document.head.appendChild(st);
  const bar=document.createElement('div'); bar.id='viewbar';
  [['全景',[38,11,47],[0.5,2,-1]],
   ['城门',[3,5.5,25],[0.5,3.5,1]],
   ['内院',[11,8,11],[0.5,2.5,-2.5]],
   ['王座厅',[0.8,3.1,-5.2],[0.8,1.9,-9.4]],
   ['宴会厅',[-3.6,2.6,-5.6],[-7.0,1.7,-6.4]],
   ['塔顶',[13,22,13],[0.8,13,-7.2]]
  ].forEach(function(v){
    const b=document.createElement('button'); b.textContent=v[0];
    b.addEventListener('click',function(){
      tweenCam(v[1],v[2]);
      Array.prototype.forEach.call(bar.children,function(c){ c.classList.remove('on'); });
      b.classList.add('on');
      document.getElementById('label').textContent='云中岛 · '+v[0];
    });
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
  const tip=document.createElement('div'); tip.id='tip'; document.body.appendChild(tip);
})();
(function(){
  const ray=new THREE.Raycaster(); const ndc=new THREE.Vector2();
  const tip=document.getElementById('tip');
  function pick(e){
    ndc.set((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1);
    ray.setFromCamera(ndc,camera);
    const hits=ray.intersectObjects(INTERACT,true);
    if(!hits.length) return null;
    let o=hits[0].object;
    while(o && !(o.userData&&o.userData.interact)) o=o.parent;
    return o;
  }
  renderer.domElement.addEventListener('pointerdown',function(e){
    if(editMode||e.button!==0) return;
    const o=pick(e);
    if(o) o.userData.interact.fn();
  });
  let hov=null;
  renderer.domElement.addEventListener('pointermove',function(e){
    if(editMode){ tip.style.display='none'; return; }
    const o=pick(e);
    if(o!==hov){ hov=o; renderer.domElement.style.cursor=o?'pointer':''; }
    if(o){ tip.style.display='block'; tip.textContent=o.userData.interact.label; tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+10)+'px'; }
    else tip.style.display='none';
  });
})();
