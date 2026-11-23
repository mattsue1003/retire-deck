/* 共用簡報引擎：換頁、HUD、互動元件、霧中山稜場景
   每一份簡報的 <body> 可設定：
     data-brand / data-sub   左上角標題
     data-sky="r,g,b|r,g,b|r,g,b"   天空上、中、下三段顏色
     data-fx="snow|rise|stars"      粒子效果
   每一頁 <section class="slide"> 可設定：
     data-label  右上角章節名      data-tint  主色
     data-o="12:x,y,size[,alpha];13:..."  冰晶物件位置（12 多面體、13 菱形、14 方塊堆）
*/
(() => {
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const B = document.body.dataset;
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- 建立舞台外框 ---------- */
const stage = $('#stage');
document.body.insertAdjacentHTML('afterbegin', '<canvas id="scene" aria-hidden="true"></canvas><div class="veil"></div>');
stage.insertAdjacentHTML('afterbegin', `
  <div class="hud tl"><a class="brand" href="${B.home || 'index.html'}">${B.brand || '退休新旅程'}</a><div>${B.sub || ''}</div></div>
  <div class="hud tr"><b>//////</b> <span id="hudLabel"></span></div>
  <div class="hud bl">← → 換頁　·　F 全螢幕</div>
  <div id="ticks"></div>
  <div class="hud br">
    <button class="navbtn" id="prev" aria-label="上一頁">←</button>
    <span id="count"></span>
    <button class="navbtn" id="next" aria-label="下一頁">→</button>
  </div>`);
const slides = $$('.slide'), N = slides.length;
let cur = 0, K = 1, OX = 0, OY = 0;

function fit(){
  K = Math.min(innerWidth/1600, innerHeight/900);
  OX = (innerWidth-1600*K)/2; OY = (innerHeight-900*K)/2;
  stage.style.transform = `translate(${-800*K}px,${-450*K}px) scale(${K})`;
  resizeCanvas();
}

/* ---------- 文字解碼效果 ---------- */
const POOL = '/\\_-=+*#01<>';
function scramble(el, text){
  if (reduce){ el.textContent = text; return; }
  const t0 = performance.now(), dur = 550, id = (el._sid = (el._sid||0)+1);
  (function tick(now){
    if (el._sid !== id) return;
    const p = Math.min(1,(now-t0)/dur), n = Math.floor(p*text.length);
    let s = text.slice(0,n);
    for (let i=n;i<text.length;i++) s += text[i]===' ' ? ' ' : POOL[Math.random()*POOL.length|0];
    el.textContent = s;
    if (p<1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- 換頁 ---------- */
const ticks = $('#ticks');
slides.forEach((s,i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `第 ${i+1} 頁`);
  if (s.hasAttribute('data-ch') || i===0) b.classList.add('ch');
  b.onclick = () => go(i);
  ticks.append(b);
});
const pad = n => String(n).padStart(2,'0');
function go(i){
  i = Math.max(0, Math.min(N-1, i));
  slides[cur].classList.remove('on');
  cur = i;
  const s = slides[cur];
  s.classList.add('on');
  $$('button', ticks).forEach((b,j) => b.classList.toggle('on', j===cur));
  $('#count').textContent = `${pad(cur+1)} / ${pad(N)}`;
  scramble($('#hudLabel'), s.dataset.label || '');
  setTint(s.dataset.tint || B.tint || '#cfe0f5');
  setTargets(s.dataset.o || '');
  $$('.vid').forEach(v => { if (!s.contains(v) && v.querySelector('iframe')) poster(v); });
  try{ history.replaceState(null,'','#'+(cur+1)); }catch(e){}
}
$('#prev').onclick = () => go(cur-1);
$('#next').onclick = () => go(cur+1);
$$('[data-go]').forEach(b => b.onclick = () => go(+b.dataset.go));

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
  if (['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(e.key)){
    if ((e.key===' '||e.key==='Enter') && (e.target.tagName==='BUTTON' || e.target.tagName==='A')) return;
    e.preventDefault(); go(cur+1);
  } else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){ e.preventDefault(); go(cur-1); }
  else if (e.key==='Home') go(0);
  else if (e.key==='End') go(N-1);
  else if (e.key==='f' || e.key==='F'){
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  }
});
let wheelLock = 0;
addEventListener('wheel', e => {
  if (e.target.closest('.list ol')) return;
  const now = Date.now();
  if (now < wheelLock || Math.abs(e.deltaY) < 20) return;
  wheelLock = now + 900;
  go(cur + (e.deltaY>0 ? 1 : -1));
}, {passive:true});
let tx = null;
addEventListener('touchstart', e => tx = e.touches[0].clientX, {passive:true});
addEventListener('touchend', e => {
  if (tx===null) return;
  const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(dx) > 60) go(cur + (dx<0 ? 1 : -1));
}, {passive:true});

/* ---------- 影片：點封面才載入 YouTube；離開該頁就停止 ---------- */
function poster(v){
  v.innerHTML = '';
  const b = document.createElement('button');
  b.className = 'poster'; b.setAttribute('aria-label', '播放影片');
  b.style.backgroundImage = `url(https://i.ytimg.com/vi/${v.dataset.yt}/hqdefault.jpg)`;
  b.onclick = () => {
    v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0&start=${v.dataset.start||0}" title="YouTube 影片"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  };
  v.append(b);
}
$$('.vid').forEach(v => {
  poster(v);
  const m = v.closest('.vrow')?.querySelector('.vmeta');
  if (m) m.insertAdjacentHTML('beforeend', ` · <a href="https://www.youtube.com/watch?v=${v.dataset.yt}&t=${v.dataset.start||0}s" target="_blank" rel="noopener">在 YouTube 開啟 ↗</a>`);
});

/* ---------- 互動：選擇題（.quiz > .opt[data-ok]） ---------- */
$$('.quiz').forEach(q => $$('.opt', q).forEach(o => {
  o.classList.add(o.hasAttribute('data-ok') ? 'right' : 'wrong');
  o.onclick = () => { o.classList.add('picked'); q.classList.add('done'); };
}));
/* 沒有標準答案的投票題（.poll > .opt）：只標示選了哪個，顯示引導語 */
$$('.poll').forEach(q => $$('.opt', q).forEach(o => o.onclick = () => {
  $$('.opt', q).forEach(x => x.style.borderColor = ''); o.style.borderColor = 'var(--tint)';
  $('.ans', q)?.classList.add('show');
}));

/* 複選舉手題（.chips > .opt）：可點多個，再點一次取消 */
$$('.chips .opt').forEach(o => o.onclick = () => o.classList.toggle('sel'));

/* ---------- 互動：翻牌 ---------- */
$$('.flip').forEach(f => f.onclick = () => f.classList.toggle('on'));

/* ---------- 互動：點擊揭曉 ---------- */
$$('[data-reveal]').forEach(b => b.onclick = () => { $(b.dataset.reveal)?.classList.add('show'); b.style.visibility = 'hidden'; });

/* ---------- 互動：呼吸練習（吸 4 秒、吐 6 秒） ---------- */
$$('.breath').forEach(box => {
  const ring = $('.ring', box), btn = $('.btn', box), info = $('p', box);
  let timer = null, n = 0;
  const stop = () => { clearTimeout(timer); timer = null; box.classList.remove('in','out'); ring.textContent = '準備'; btn.textContent = '開始'; };
  const cycle = () => {
    n++; box.classList.remove('out'); box.classList.add('in'); ring.textContent = '吸氣'; info.textContent = `第 ${n} 次 · 鼻子慢慢吸`;
    timer = setTimeout(() => {
      box.classList.remove('in'); box.classList.add('out'); ring.textContent = '吐氣'; info.textContent = `第 ${n} 次 · 嘴巴慢慢吐`;
      timer = setTimeout(() => n >= 5 ? (stop(), info.textContent = '做完五次了，現在感覺如何？') : cycle(), 6000);
    }, 4000);
  };
  btn.onclick = () => { if (timer){ stop(); info.textContent = '吸氣 4 秒 · 吐氣 6 秒'; } else { n = 0; btn.textContent = '停止'; cycle(); } };
});

/* ---------- 互動：情緒色彩 ---------- */
$$('.sw').forEach(b => b.onclick = () => {
  $$('.sw').forEach(x => x.classList.remove('sel'));
  b.classList.add('sel');
  setTint(getComputedStyle(b).getPropertyValue('--c').trim());
  $('#moodWord').textContent = b.firstChild.textContent.trim();
  $('#moodSay').innerHTML = b.dataset.say + '<br>什麼時候，心裡會出現它？';
});

/* ---------- 互動：現場清單（.list） ---------- */
$$('.list').forEach(box => {
  const items = [], ol = $('ol', box), inp = $('input', box);
  $('form', box).onsubmit = e => {
    e.preventDefault();
    const v = inp.value.trim(); if (!v) return;
    items.push(v); inp.value = ''; ol.textContent = '';
    items.forEach((d,i) => { const li = document.createElement('li'), n = document.createElement('span'); n.textContent = pad(i+1); li.append(n, d); ol.append(li); });
    ol.scrollTop = ol.scrollHeight;
  };
});

/* ---------- 互動：時光機（window.DECADES = [[年代, 事件HTML, 提問HTML], ...]） ---------- */
if (window.DECADES && $('#decades')) window.DECADES.forEach(([y,ev,q]) => {
  const b = document.createElement('button');
  b.className = 'dec'; b.textContent = y;
  b.onclick = () => {
    $$('.dec').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    scramble($('#askNum'), `////// ${y} 年代`);
    $('#askEv').innerHTML = ev; $('#askQ').innerHTML = q;
  };
  $('#decades').append(b);
});

/* ---------- 互動：問卷示範（.scale[data-max][data-bands]） ---------- */
$$('.scale').forEach(sc => {
  const max = +sc.dataset.max, min = +(sc.dataset.min || 0), mult = +(sc.dataset.mult || 1);
  const bands = JSON.parse(sc.dataset.bands), lis = $$('ol li', sc), vals = lis.map(() => null);
  const out = $('.n', sc), msg = $('.msg', sc), total = lis.length*max*mult;
  const render = () => {
    const done = vals.filter(v => v !== null).length;
    if (done < lis.length){ out.innerHTML = `—<small> / ${total}</small>`; msg.textContent = `已作答 ${done} / ${lis.length} 題`; return; }
    const sum = vals.reduce((a,b) => a+b, 0)*mult;
    out.innerHTML = `${sum}<small> / ${total}</small>`;
    msg.textContent = (bands.find(([lo,hi]) => sum >= lo && sum <= hi) || [,, ''])[2];
  };
  lis.forEach((li,i) => {
    const p = document.createElement('div'); p.className = 'pts';
    for (let v=min; v<=max; v++){
      const b = document.createElement('button'); b.textContent = v;
      b.onclick = () => { vals[i] = v; $$('button', p).forEach(x => x.classList.toggle('sel', x===b)); render(); };
      p.append(b);
    }
    li.append(p);
  });
  $('.reset', sc)?.addEventListener('click', () => { vals.fill(null); $$('.pts button', sc).forEach(x => x.classList.remove('sel')); render(); });
  render();
});

/* =====================================================
   場景：霧中山稜 + 漂浮冰晶（Canvas 2D）
   ===================================================== */
const cv = $('#scene'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resizeCanvas(){
  DPR = Math.min(devicePixelRatio||1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W*DPR; cv.height = H*DPR;
}
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const SKY = (B.sky || '34,38,48|104,112,128|70,76,90').split('|').map(s => s.split(',').map(Number));
const FX = B.fx || 'snow';
let tint = [207,224,245], tintTo = [207,224,245];
function setTint(h){ tintTo = hex(h); document.documentElement.style.setProperty('--tint', h); }

const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm = a => { const l = Math.hypot(...a)||1; return [a[0]/l,a[1]/l,a[2]/l]; };
const centroid = f => f.reduce((s,v) => [s[0]+v[0],s[1]+v[1],s[2]+v[2]],[0,0,0]).map(x => x/f.length);
const outward = (faces, c) => faces.map(f => dot(cross(sub(f[1],f[0]),sub(f[2],f[0])), sub(centroid(f),c)) < 0 ? f.slice().reverse() : f);
function icosa(){
  const p = (1+Math.sqrt(5))/2, V = [];
  for (const a of [-1,1]) for (const b of [-p,p]) V.push([0,a,b],[a,b,0],[b,0,a]);
  const F = [], d = (a,b) => Math.hypot(...sub(V[a],V[b]));
  for (let i=0;i<12;i++) for (let j=i+1;j<12;j++) for (let k=j+1;k<12;k++)
    if (Math.abs(d(i,j)-2)<.01 && Math.abs(d(j,k)-2)<.01 && Math.abs(d(i,k)-2)<.01) F.push([V[i],V[j],V[k]]);
  const s = 1/Math.hypot(1,p);
  return outward(F,[0,0,0]).map(f => f.map(v => v.map(x => x*s)));
}
function diamond(){
  const F = [];
  for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1])
    F.push([[x*.62,0,0],[0,y*(y<0?1.25:.8),0],[0,0,z*.62]]);
  return outward(F,[0,0,0]);
}
function box(c, s, ry){
  const h = s/2, cs = Math.cos(ry), sn = Math.sin(ry);
  const P = (x,y,z) => [c[0]+x*cs+z*sn, c[1]+y, c[2]-x*sn+z*cs];
  const v = [P(-h,-h,-h),P(h,-h,-h),P(h,h,-h),P(-h,h,-h),P(-h,-h,h),P(h,-h,h),P(h,h,h),P(-h,h,h)];
  return outward([[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[0,3,7,4]].map(q => q.map(i => v[i])), c);
}
const blocks = () => [
  box([-1.12,1.05,0],1,.12), box([0,1.05,.05],1,-.08), box([1.12,1.05,0],1,.2),
  box([-.56,-.02,.05],1,-.18), box([.58,-.02,-.05],1,.1), box([.02,-1.1,0],1,.3),
].flat();
const mk = (faces, spin, ph) => ({faces, x:1200,y:420,s:0,a:0, tx:1200,ty:420,ts:0,ta:0, spin, ph});
const OBJ = {12:mk(icosa(),1,0), 13:mk(diamond(),1.5,2), 14:mk(blocks(),.7,4)};
function setTargets(str){
  for (const k in OBJ) OBJ[k].ta = 0;
  str.split(';').filter(Boolean).forEach(p => {
    const [k, rest] = p.split(':'), [x,y,s,a] = rest.split(',').map(Number), o = OBJ[k];
    if (o.a < .02){ o.x = x; o.y = y; o.s = s*.6; }
    o.tx = x; o.ty = y; o.ts = s; o.ta = a ?? 1;
  });
}

const mouse = {x:0,y:0,tx:0,ty:0};
addEventListener('pointermove', e => { mouse.tx = e.clientX/innerWidth-.5; mouse.ty = e.clientY/innerHeight-.5; });

const LIGHT = norm([-.45,-.75,-.5]);
function drawObj(o, t){
  if (o.a < .01) return;
  const ry = t*.00028*o.spin + mouse.x*.9, rx = .32 + mouse.y*.35;
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  const R = v => { const x = v[0]*cy+v[2]*sy, z = -v[0]*sy+v[2]*cy; return [x, v[1]*cx-z*sx, v[1]*sx+z*cx]; };
  const bob = reduce ? 0 : Math.sin(t*.0009+o.ph)*10;
  const out = [];
  for (const f of o.faces){
    const v = f.map(R), n = norm(cross(sub(v[1],v[0]),sub(v[2],v[0])));
    if (n[2] > .02) continue;
    out.push({v, b:Math.max(0,dot(n,LIGHT)), z:v.reduce((s,p) => s+p[2],0)/v.length});
  }
  out.sort((a,b) => b.z-a.z);
  const tc = tint.map(Math.round);
  const g = ctx.createRadialGradient(o.x,o.y+bob,0,o.x,o.y+bob,o.s*2.6);
  g.addColorStop(0,`rgba(${tc},${.34*o.a})`); g.addColorStop(1,`rgba(${tc},0)`);
  ctx.fillStyle = g; ctx.fillRect(o.x-o.s*2.6,o.y+bob-o.s*2.6,o.s*5.2,o.s*5.2);
  ctx.globalAlpha = o.a; ctx.lineJoin = 'round';
  for (const f of out){
    ctx.beginPath();
    f.v.forEach((p,i) => { const k = 5/(5+p[2]), X = o.x+p[0]*o.s*k, Y = o.y+bob+p[1]*o.s*k; i ? ctx.lineTo(X,Y) : ctx.moveTo(X,Y); });
    ctx.closePath();
    const m = .12+.88*f.b, c = [0,1,2].map(i => Math.round((52+(238-52)*m)*.8 + tint[i]*.2*(.35+.65*m)));
    ctx.fillStyle = `rgb(${c})`; ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${.18+.5*f.b})`; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

let cam = 0;
const mixT = (c,k) => `rgb(${c.map((v,i) => Math.round(v*(1-k)+tint[i]*k))})`;
const shade = (c,f) => c.map(v => v*f);
function ridge(y0, amp, depth, seed, top, base){
  const g = ctx.createLinearGradient(0,(y0-amp)*H,0,H);
  g.addColorStop(0,top); g.addColorStop(.55,base); g.addColorStop(1,base);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0;x<=W+10;x+=10){
    const w = x/W*3.2 + (cam + mouse.x*.25)*depth + seed;
    const h = .5*Math.sin(w*1.1)+.28*Math.sin(w*2.7+seed)+.14*Math.sin(w*6.3+seed*2)+.06*Math.sin(w*15.1);
    ctx.lineTo(x,(y0-amp*h)*H);
  }
  ctx.lineTo(W,H); ctx.fill();
}

const parts = Array.from({length:110}, () => ({x:Math.random(),y:Math.random(),r:.6+Math.random()*2,v:.00006+Math.random()*.00016,d:Math.random()*6.28}));

let last = performance.now();
function frame(t){
  const dt = Math.min(50,t-last); last = t;
  const e = 1-Math.pow(.004,dt/1000);
  mouse.x += (mouse.tx-mouse.x)*e; mouse.y += (mouse.ty-mouse.y)*e;
  cam += (cur*.42-cam)*e*.7;
  for (let i=0;i<3;i++) tint[i] += (tintTo[i]-tint[i])*e;
  for (const k in OBJ){ const o = OBJ[k]; o.x += (o.tx-o.x)*e; o.y += (o.ty-o.y)*e; o.s += (o.ts-o.s)*e; o.a += (o.ta-o.a)*e*1.4; }

  ctx.setTransform(DPR,0,0,DPR,0,0);
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,mixT(SKY[0],.06)); sky.addColorStop(.62,mixT(SKY[1],.16)); sky.addColorStop(1,mixT(SKY[2],.1));
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
  if (FX === 'rise'){            // 地平線上的晨光
    const g = ctx.createRadialGradient(W*.72,H*.66,0,W*.72,H*.66,H*.7);
    g.addColorStop(0,`rgba(${tint.map(Math.round)},.38)`); g.addColorStop(1,`rgba(${tint.map(Math.round)},0)`);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  }
  ridge(.60,.10,.25,1.3,mixT(shade(SKY[1],1.22),.18),mixT(shade(SKY[1],.88),.12));
  ridge(.70,.09,.5,4.1,mixT(SKY[1],.14),mixT(shade(SKY[1],.68),.1));

  ctx.setTransform(K*DPR,0,0,K*DPR,OX*DPR,OY*DPR);
  drawObj(OBJ[14],t); drawObj(OBJ[13],t); drawObj(OBJ[12],t);

  ctx.setTransform(DPR,0,0,DPR,0,0);
  ridge(.93,.06,1,7.7,mixT(shade(SKY[1],.82),.1),mixT(shade(SKY[0],1.15),.05));
  ctx.fillStyle = FX === 'rise' ? `rgba(${tint.map(Math.round)},.9)` : 'rgba(240,244,250,.7)';
  for (const s of parts){
    if (!reduce){
      if (FX === 'snow'){ s.y += s.v*dt; s.x += Math.sin(t*.0004+s.d)*.00004*dt; if (s.y>1.02){ s.y = -.02; s.x = Math.random(); } }
      else if (FX === 'rise'){ s.y -= s.v*dt*.6; s.x += Math.sin(t*.0005+s.d)*.00005*dt; if (s.y<-.02){ s.y = 1.02; s.x = Math.random(); } }
    }
    let a = .25+.5*(s.r/2.6);
    if (FX === 'stars'){ if (s.y > .6) continue; a *= .55+.45*Math.sin(t*.0012+s.d*3); }
    ctx.globalAlpha = Math.max(0,a);
    ctx.beginPath(); ctx.arc(s.x*W,s.y*H,FX==='stars' ? s.r*.75 : s.r,0,6.28); ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

addEventListener('resize', fit);
fit();
go(Math.max(0,(parseInt(location.hash.slice(1))||1)-1));
requestAnimationFrame(frame);
})();
