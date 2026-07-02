/*
 * Lógica ainda não migrada para o backend real (Fase 3 do plano Supabase):
 * dados mock do admin (Clientes/Feedbacks/Histórico/gráficos financeiros do Dashboard)
 * e microinterações decorativas. Serviços/Equipe/autenticação/Agendamentos já foram
 * migrados para módulos próprios (pages/public.js, pages/portal.js, pages/booking.js,
 * pages/admin/configuracoes.js, pages/admin/agenda.js, auth/auth.js) — por isso não
 * aparecem mais aqui.
 */

const AVAL=[
  {n:"João Paulo",t:"Melhor barbearia da cidade! Atendimento nota 10 e resultado impecável em todos os cortes.",q:"há 2 semanas"},
  {n:"Marcos Oliveira",t:"Sou cliente há 3 anos. O Carlos é incrível, nunca decepcionou. Recomendo de olhos fechados.",q:"há 1 mês"},
  {n:"Felipe Rocha",t:"Agendei pelo app e foi super fácil. Ambiente limpo, profissional e voltarei com certeza!",q:"há 3 semanas"},
  {n:"Bruno Lima",t:"Ambiente incrível, equipe top. Recomendo demais para quem busca qualidade e estilo.",q:"há 5 dias"},
  {n:"André Santos",t:"Primeiro corte aqui e já me conquistou. Voltei na semana seguinte e virei cliente fiel!",q:"há 2 meses"},
  {n:"Rodrigo Alves",t:"Rápido, preciso e com preço justo. Melhor custo-benefício da região, sem dúvida!",q:"há 1 semana"},
];
const GAL=[
  {l:"Degradê clássico",c:"giwide gitall",p:0},{l:"Barba & estilo",c:"",p:1},
  {l:"Corte moderno",c:"",p:2},{l:"Navalhado",c:"",p:3},
  {l:"Look completo",c:"gitall",p:4},{l:"Textura & volume",c:"giwide",p:5},{l:"Hidratação",c:"",p:6},
];
const PT=[
  "repeating-linear-gradient(45deg,rgba(230,195,100,.09) 0,rgba(230,195,100,.09) 1px,transparent 1px,transparent 12px)",
  "radial-gradient(circle at 30% 40%,rgba(230,195,100,.15) 0%,transparent 55%)",
  "repeating-linear-gradient(-45deg,rgba(230,195,100,.07) 0,rgba(230,195,100,.07) 1px,transparent 1px,transparent 10px)",
  "radial-gradient(ellipse at 70% 70%,rgba(230,195,100,.13) 0%,transparent 60%)",
  "repeating-linear-gradient(0deg,rgba(230,195,100,.06) 0,rgba(230,195,100,.06) 1px,transparent 1px,transparent 14px)",
  "radial-gradient(circle at 20% 60%,rgba(230,195,100,.11) 0%,transparent 50%)",
  "repeating-linear-gradient(90deg,rgba(230,195,100,.07) 0,rgba(230,195,100,.07) 1px,transparent 1px,transparent 16px)",
];
/* VIEW SYSTEM */
function showV(id){
  document.querySelectorAll('.view').forEach(v=>{v.style.display='none';v.classList.remove('on')});
  const t=document.getElementById(id);
  t.classList.add('on');
  t.style.display=(id==='vs')?'block':'flex';
  window.scrollTo(0,0);
}

/* SMOOTH SCROLL */
function sto(id){
  const el=document.getElementById(id);if(!el)return;
  const nh=document.getElementById('nav').offsetHeight;
  window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-nh+1,behavior:'smooth'});
  closeDrawer();
}

/* NAV CLICKS */
document.querySelectorAll('.ntab,.dtab').forEach(b=>{
  b.addEventListener('click',()=>sto(b.dataset.target));
});

/* SCROLLSPY */
const SECS=['home','services','team','gallery','reviews','contact'];
function setAct(id){
  document.querySelectorAll('.ntab').forEach(t=>t.classList.toggle('on',t.dataset.target===id));
  document.querySelectorAll('.dtab').forEach(t=>t.classList.toggle('on',t.dataset.target===id));
}
const spy=new IntersectionObserver(entries=>{
  let best=null;
  entries.forEach(e=>{
    if(e.isIntersecting){
      if(!best||Math.abs(e.boundingClientRect.top)<Math.abs(best.boundingClientRect.top))best=e;
    }
  });
  if(best)setAct(best.target.id);
},{rootMargin:'-65px 0px -55% 0px',threshold:0});
SECS.forEach(id=>{const el=document.getElementById(id);if(el)spy.observe(el);});

/* NAVBAR SCROLL */
window.addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('sc',window.scrollY>20);
},{passive:true});

/* MOBILE DRAWER */
let dOpen=false;
const burgr=document.getElementById('burgr');
const drawer=document.getElementById('drawer');
const bico=document.getElementById('burgrico');
function closeDrawer(){dOpen=false;drawer.classList.remove('on');burgr.setAttribute('aria-expanded','false');bico.textContent='menu';}
burgr.addEventListener('click',()=>{
  dOpen=!dOpen;drawer.classList.toggle('on',dOpen);
  burgr.setAttribute('aria-expanded',dOpen?'true':'false');
  bico.textContent=dOpen?'close':'menu';
});

/* REVEAL */
const rvObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rvObs.unobserve(e.target);}});
},{threshold:.1,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.rv').forEach(el=>rvObs.observe(el));

/* LOGIN — toggles de visibilidade de senha (autenticação real está em auth/auth.js) */
function togglePw(){
  const i=document.getElementById('lpw'),e=document.getElementById('lpweye');
  i.type=i.type==='password'?'text':'password';
  e.textContent=i.type==='password'?'visibility':'visibility_off';
}

/* PORTAL NAV */
let sbC=false;
function togSb(){
  sbC=!sbC;
  document.getElementById('sb').classList.toggle('col',sbC);
  document.getElementById('pmain').classList.toggle('col',sbC);
  document.getElementById('sbico').textContent=sbC?'chevron_right':'chevron_left';
}
const NIMAP={dashboard:'nid',agendamentos:'nia','novo-agendamento':'nino',servicos:'nis',perfil:'nip'};
function pGo(id){
  document.querySelectorAll('.psec').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  document.getElementById('psec-'+id)?.classList.add('on');
  document.getElementById(NIMAP[id])?.classList.add('on');
  window.scrollTo(0,0);
}

/* PORTAL TABS */
function pTab(id,btn){
  ['prox','hist'].forEach(t=>document.getElementById('ptc'+t)?.classList.remove('on'));
  document.getElementById('ptc'+id)?.classList.add('on');
  btn.closest('.ptabs').querySelectorAll('.ptab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}
function pPTab(id,btn){
  ['dados','pref','seg'].forEach(t=>document.getElementById('pptc'+t)?.classList.remove('on'));
  document.getElementById('pptc'+id)?.classList.add('on');
  btn.closest('.pptabs').querySelectorAll('.pptab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}
function selBar(el){document.querySelectorAll('.baropt').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');}

/* SITE RENDERS — Galeria e Avaliações (Serviços/Equipe migrados para pages/public.js) */
function renderGal(){
  document.getElementById('ggrid').innerHTML=GAL.map(g=>`
    <div class="gi ${g.c}">
      <div class="gibg" style="background:${PT[g.p]},linear-gradient(135deg,#1a1a1a,#0e0e0e)"></div>
      <div class="gigrad"></div>
      <div class="gilbl">${g.l} <i class="ti ti-arrow-up-right"></i></div>
    </div>`).join('');
}
let rp=0;
function renderRev(p=0){
  rp=p;
  const per=3,pgs=Math.ceil(AVAL.length/per),vis=AVAL.slice(p*per,p*per+per);
  document.getElementById('rgrid').innerHTML=vis.map(a=>`
    <div class="rcard">
      <div class="rquo">"</div>
      <div class="rstars">★★★★★</div>
      <p class="rtxt">${a.t}</p>
      <div class="rfoot">
        <div class="raut"><div class="rav">${a.n[0]}</div><span class="ranm">${a.n}</span></div>
        <span class="rawhen">${a.q}</span>
      </div>
    </div>`).join('');
  document.getElementById('rpag').innerHTML=[...Array(pgs)].map((_,i)=>`
    <button class="rdot ${i===p?'on':''}" onclick="renderRev(${i})" aria-label="Página ${i+1}"></button>`).join('');
}

/* INIT — Serviços/Equipe/Agendamentos agora são renderizados por pages/*.js (ver main.js) */
renderGal();renderRev(0);

/* ══ MICROINTERAÇÕES PREMIUM ══ */

// Ripple nos botões CTA
(function(){
  function addRipple(e){
    const btn=e.currentTarget;
    const r=btn.getBoundingClientRect();
    const rp=document.createElement('span');
    rp.className='rpl';
    rp.style.cssText='left:'+(e.clientX-r.left)+'px;top:'+(e.clientY-r.top)+'px';
    btn.style.position='relative';
    btn.style.overflow='hidden';
    btn.appendChild(rp);
    setTimeout(()=>rp.remove(),700);
  }
  document.querySelectorAll('.btng,.lbtnp,.sbnew,.nlogin,.pbtng').forEach(b=>{
    b.addEventListener('click',addRipple);
  });
})();

// 3D Card Tilt (sutil, elegante)
(function(){
  document.querySelectorAll('.srvc,.tcard').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      card.style.transform='perspective(900px) rotateX('+((-y*4).toFixed(1))+'deg) rotateY('+((x*4).toFixed(1))+'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave',()=>{
      card.style.transform='';
    });
  });
})();

// Magnetic hover nos botões principais
(function(){
  document.querySelectorAll('.btng,.nlogin').forEach(btn=>{
    btn.addEventListener('mousemove',e=>{
      const r=btn.getBoundingClientRect();
      const x=((e.clientX-r.left-r.width/2)*.22).toFixed(1);
      const y=((e.clientY-r.top-r.height/2)*.22).toFixed(1);
      btn.style.transform='translate('+x+'px,'+y+'px) translateY(-2px)';
      btn.style.boxShadow='0 8px 28px -4px rgba('+getComputedStyle(document.documentElement).getPropertyValue('--ar')+', .65)';
    });
    btn.addEventListener('mouseleave',()=>{
      btn.style.transform='';
      btn.style.boxShadow='';
    });
  });
})();

// Partículas decorativas no painel esquerdo do login
(function(){
  document.querySelectorAll('.ll').forEach(ll=>{
    const pts=[{x:'15%',y:'30%',s:4,d:0},{x:'75%',y:'25%',s:3,d:2},{x:'60%',y:'70%',s:5,d:4},{x:'25%',y:'65%',s:3,d:1}];
    pts.forEach(p=>{
      const el=document.createElement('div');
      el.className='ll-particle';
      el.style.cssText='left:'+p.x+';top:'+p.y+';width:'+p.s+'px;height:'+p.s+'px;animation-delay:'+p.d+'s;filter:blur(1px)';
      ll.appendChild(el);
    });
  });
})();

/* FUNÇÕES SIGNUP — toggles de visibilidade de senha */
function toggleCpw(){
  const i=document.getElementById('cpw'),e=document.getElementById('cpweye');
  if(!i)return;
  i.type=i.type==='password'?'text':'password';
  e.textContent=i.type==='password'?'visibility':'visibility_off';
}
function toggleCpw2(){
  const i=document.getElementById('cpw2'),e=document.getElementById('cpw2eye');
  if(!i)return;
  i.type=i.type==='password'?'text':'password';
  e.textContent=i.type==='password'?'visibility':'visibility_off';
}


/* ════════════════════════════════════════
   ADMIN — DADOS MOCK (Fase 3 substitui por payments/reviews/notifications/activity_log reais)
════════════════════════════════════════ */
const ADM_DATA={
  monthly:{
    labels:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    rev:[8400,9200,7800,10500,11200,9800,12100,11500,9900,13200,12800,11000],
    exp:[3200,3800,3100,4200,4800,3900,4900,4600,3800,5100,4700,4200]},
  weekly:{
    labels:['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
    rev:[580,920,760,1100,1350,1820,0]},
  svcs:[{l:'Corte Clássico',p:42,c:'#e6c364'},{l:'Corte + Barba',p:28,c:'#c9a84c'},{l:'Barba',p:18,c:'rgba(230,195,100,.5)'},{l:'Outros',p:12,c:'rgba(230,195,100,.25)'}],
  topCli:[{i:'RA',n:'Rodrigo Alves',v:20,b:'VIP'},{i:'BL',n:'Bruno Lima',v:15,b:'VIP'},{i:'JP',n:'João Paulo',v:12,b:'VIP'},{i:'MO',n:'Marcos Oliveira',v:8,b:'Regular'},{i:'FR',n:'Felipe Rocha',v:5,b:'Regular'}]
};
const CLIS_A=[
  {i:'JP',n:'João Paulo',e:'joao@email.com',v:12,sp:'R$ 480',l:'15 Jun',ly:10,b:'VIP'},
  {i:'MO',n:'Marcos Oliveira',e:'marcos@email.com',v:8,sp:'R$ 320',l:'10 Jun',ly:8,b:'Regular'},
  {i:'FR',n:'Felipe Rocha',e:'felipe@email.com',v:5,sp:'R$ 200',l:'08 Jun',ly:5,b:'Regular'},
  {i:'BL',n:'Bruno Lima',e:'bruno@email.com',v:15,sp:'R$ 675',l:'12 Jun',ly:10,b:'VIP'},
  {i:'AS',n:'André Santos',e:'andre@email.com',v:3,sp:'R$ 120',l:'01 Jun',ly:3,b:'Novo'},
  {i:'RA',n:'Rodrigo Alves',e:'rodrigo@email.com',v:20,sp:'R$ 860',l:'17 Jun',ly:10,b:'VIP'},
];
const FBS_A=[
  {i:'JP',n:'João Paulo',s:'Corte Degradê',b:'Carlos Silva',r:5,tx:'Melhor barbearia da cidade! Atendimento nota 10 e resultado impecável em todos os cortes.',d:'15 Jun',rep:false},
  {i:'MO',n:'Marcos Oliveira',s:'Barba Completa',b:'Rafael Mendes',r:5,tx:'Sou cliente há 3 anos. O Carlos é incrível, nunca decepcionou.',d:'10 Jun',rep:true},
  {i:'FR',n:'Felipe Rocha',s:'Corte + Barba',b:'Diego Costa',r:4,tx:'Ótimo atendimento, ambiente limpo e profissional. Voltarei com certeza!',d:'08 Jun',rep:false},
  {i:'BL',n:'Bruno Lima',s:'Hidratação',b:'Carlos Silva',r:5,tx:'Ambiente incrível, equipe top. Recomendo demais para quem busca qualidade.',d:'12 Jun',rep:true},
];
const HIST_A=[
  {a:'Agendamento confirmado — João Paulo / Corte Degradê',u:'Daniel',t:'Hoje, 14:32',ic:'check_circle',c:'ok'},
  {a:'Badge VIP atribuído — Rodrigo Alves',u:'Daniel',t:'Hoje, 11:20',ic:'person_add',c:'acc'},
  {a:'Preço atualizado: Hidratação R$ 40 → R$ 45',u:'Daniel',t:'Ontem, 17:45',ic:'edit',c:'mut'},
  {a:'Notificação "Promoção Semanal" enviada para 23 clientes',u:'Daniel',t:'Ontem, 10:00',ic:'notifications',c:'acc'},
  {a:'Agendamento cancelado — Rodrigo Alves / Sobrancelha',u:'Daniel',t:'17 Jun, 15:30',ic:'cancel',c:'err'},
  {a:'Resposta enviada à avaliação de João Paulo',u:'Daniel',t:'16 Jun, 09:15',ic:'star',c:'acc'},
  {a:'Serviço "Sobrancelha" adicionado ao cardápio',u:'Daniel',t:'15 Jun, 14:00',ic:'add_circle',c:'acc'},
  {a:'Backup automático do sistema realizado',u:'Sistema',t:'15 Jun, 00:00',ic:'backup',c:'mut'},
];

/* ADMIN NAV */
let adCol=false;
function togAdSb(){
  adCol=!adCol;
  document.getElementById('asb').classList.toggle('col',adCol);
  document.getElementById('apmain').classList.toggle('col',adCol);
  document.getElementById('asbico').textContent=adCol?'chevron_right':'chevron_left';
}
const ANIMAP={dash:'ani-dash',agenda:'ani-agenda',clientes:'ani-clientes',feedbacks:'ani-feedbacks',notif:'ani-notif',hist:'ani-hist',config:'ani-config'};
function aGo(id){
  document.querySelectorAll('.asec').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('#asb .ni').forEach(n=>n.classList.remove('on'));
  document.getElementById('asec-'+id)?.classList.add('on');
  document.getElementById(ANIMAP[id])?.classList.add('on');
  window.scrollTo(0,0);
}
function togApw(){
  const i=document.getElementById('apw'),e=document.getElementById('apweye');
  if(!i)return;i.type=i.type==='password'?'text':'password';
  e.textContent=i.type==='password'?'visibility':'visibility_off';
}

/* CLOCK */
function admClock(){
  const n=new Date();
  const hh=String(n.getHours()).padStart(2,'0');
  const mm=String(n.getMinutes()).padStart(2,'0');
  const days=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const eh=document.getElementById('admclk');
  const ed=document.getElementById('admdat');
  if(eh)eh.textContent=hh+':'+mm;
  if(ed)ed.textContent=days[n.getDay()]+', '+n.getDate()+' '+months[n.getMonth()]+' '+n.getFullYear();
}
setInterval(admClock,1000);

/* CHARTS */
function renderRevChart(period){
  const el=document.getElementById('chart-rev');if(!el)return;
  const D=period==='semanal'?ADM_DATA.weekly:ADM_DATA.monthly;
  const rv=D.rev,ex=period==='semanal'?[]:ADM_DATA.monthly.exp,lb=D.labels,n=lb.length;
  const maxV=Math.max(...rv,...(ex.length?ex:[0]))*1.12||1;
  const W=560,H=175,pX=18,pY=14,plotW=W-pX*2,plotH=H-pY*2-16;
  const tx=i=>pX+(i/(n-1))*plotW,ty=v=>pY+plotH-(v/maxV)*plotH;
  const rpts=rv.map((v,i)=>tx(i)+','+ty(v)).join(' ');
  const fX=tx(0),lX=tx(n-1),bY=pY+plotH;
  const rarea=fX+','+bY+' '+rpts+' '+lX+','+bY;
  let eSVG='';
  if(ex.length){
    const epts=ex.map((v,i)=>tx(i)+','+ty(v)).join(' ');
    const earea=fX+','+bY+' '+epts+' '+lX+','+bY;
    eSVG='<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(242,139,130,.28)"/><stop offset="100%" stop-color="rgba(242,139,130,.02)"/></linearGradient></defs><polygon points="'+earea+'" fill="url(#eg)"/><polyline points="'+epts+'" fill="none" stroke="#f28b82" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  const dots=rv.map((v,i)=>'<circle cx="'+tx(i)+'" cy="'+ty(v)+'" r="3" fill="#e6c364"/>').join('');
  const xlb=lb.map((l,i)=>'<text x="'+tx(i)+'" y="'+(H-3)+'" text-anchor="middle" fill="#99907e" font-size="9" font-family="Inter,sans-serif">'+l+'</text>').join('');
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" class="svg-chart"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(230,195,100,.32)"/><stop offset="100%" stop-color="rgba(230,195,100,.02)"/></linearGradient></defs>'+eSVG+'<polygon points="'+rarea+'" fill="url(#rg)"/><polyline points="'+rpts+'" fill="none" stroke="#e6c364" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+dots+xlb+'</svg>';
}
function swChartPeriod(p,btn){
  btn.closest('.ctabs').querySelectorAll('.ctab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');renderRevChart(p);
}
function renderDonut(){
  const el=document.getElementById('chart-donut'),lg=document.getElementById('chart-leg');
  if(!el||!lg)return;
  const R=45,CX=70,CY=70,SW=22,C=2*Math.PI*R;let cum=0;
  const segs=ADM_DATA.svcs.map(d=>{
    const da=(d.p/100)*C,doff=-(cum/100)*C;cum+=d.p;
    return '<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="'+d.c+'" stroke-width="'+SW+'" stroke-dasharray="'+da+' '+(C-da)+'" stroke-dashoffset="'+(C/4+doff)+'" transform="rotate(-90 '+CX+' '+CY+')"/>';
  }).join('');
  el.innerHTML='<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" class="svg-chart"><circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="'+SW+'"/>'+segs+'<text x="'+CX+'" y="'+(CY-5)+'" text-anchor="middle" fill="#e5e2e1" font-size="14" font-weight="800" font-family="Inter,sans-serif">42%</text><text x="'+CX+'" y="'+(CY+10)+'" text-anchor="middle" fill="#99907e" font-size="9" font-family="Inter,sans-serif">top serviço</text></svg>';
  lg.innerHTML=ADM_DATA.svcs.map(d=>'<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px"><div style="width:10px;height:10px;border-radius:3px;background:'+d.c+';flex-shrink:0"></div><span style="font-size:12px;color:var(--mut);flex:1">'+d.l+'</span><span style="font-size:12px;font-weight:700;color:var(--txt)">'+d.p+'%</span></div>').join('');
}
function renderWeekly(){
  const el=document.getElementById('chart-weekly');if(!el)return;
  const D=ADM_DATA.weekly,maxV=Math.max(...D.rev)*1.15||1;
  const W=320,H=155,pX=10,pY=12,bW=30,gap=(W-pX*2-7*bW)/6;
  const bars=D.rev.map((v,i)=>{
    const x=pX+i*(bW+gap),h=v>0?(v/maxV)*(H-pY*2-18):2,y=pY+(H-pY*2-18)-h;
    const col=i===5?'url(#bg)':'rgba(230,195,100,.28)';
    return '<rect x="'+x+'" y="'+y+'" width="'+bW+'" height="'+h+'" rx="7" fill="'+col+'"/>'+(v>0?'<text x="'+(x+bW/2)+'" y="'+(y-5)+'" text-anchor="middle" fill="#99907e" font-size="8" font-family="Inter,sans-serif">R$'+v+'</text>':'')+'<text x="'+(x+bW/2)+'" y="'+(H-3)+'" text-anchor="middle" fill="#99907e" font-size="9" font-family="Inter,sans-serif">'+D.labels[i]+'</text>';
  }).join('');
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" class="svg-chart"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f1d885"/><stop offset="100%" stop-color="#c9a84c"/></linearGradient></defs>'+bars+'</svg>';
}
function renderTopCli(){
  const el=document.getElementById('top-cli');if(!el)return;
  el.innerHTML=ADM_DATA.topCli.map((c,i)=>'<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:12px;font-weight:700;color:var(--mut);width:14px;text-align:center">'+(i+1)+'</span><div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,rgba(var(--ar),.2),rgba(var(--ar),.07));border:1.5px solid rgba(var(--ar),.25);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--acc)">'+c.i+'</div><div style="flex:1"><div style="font-size:13px;font-weight:600">'+c.n+'</div><div style="font-size:11px;color:var(--mut)">'+c.v+' visitas</div></div><span class="cbdg '+(c.b==='VIP'?'cbdg-vip':'cbdg-reg')+'">'+c.b+'</span></div>').join('');
}

/* CLIENTES */
function renderClis(){
  const sq=(document.getElementById('cli-s')?.value||'').toLowerCase();
  const bg=document.getElementById('cli-b')?.value||'';
  const f=CLIS_A.filter(c=>{
    if(sq&&!c.n.toLowerCase().includes(sq)&&!c.e.toLowerCase().includes(sq))return false;
    if(bg&&c.b!==bg)return false;return true;
  });
  const g=document.getElementById('cli-grid');if(!g)return;
  g.innerHTML=f.map(c=>'<div class="acli"><div class="acli-top"><div class="acli-av">'+c.i+'</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><div class="acli-nm">'+c.n+'</div><span class="cbdg '+(c.b==='VIP'?'cbdg-vip':c.b==='Novo'?'cbdg-new':'cbdg-reg')+'">'+c.b+'</span></div><div class="acli-em">'+c.e+'</div></div></div><div class="acli-stats"><div class="acli-st"><div class="acli-stv">'+c.v+'</div><div class="acli-stl">Visitas</div></div><div class="acli-st"><div class="acli-stv" style="font-size:12px">'+c.sp+'</div><div class="acli-stl">Total</div></div><div class="acli-st"><div class="acli-stv">'+c.ly+'/10</div><div class="acli-stl">Fidelidade</div></div></div><div style="padding-top:12px;margin-top:2px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:var(--mut)">Última visita: '+c.l+'</span><button class="abtn abtn-o" style="font-size:11px;padding:5px 12px;border-radius:8px">Ver histórico</button></div></div>').join('');
}

/* FEEDBACKS */
function renderFbs(){
  const el=document.getElementById('fb-list');if(!el)return;
  el.innerHTML=FBS_A.map(f=>'<div class="afb-card"><div class="afb-top"><div style="display:flex;align-items:center;gap:10px"><div class="afb-av">'+f.i+'</div><div><div class="afb-nm">'+f.n+'</div><div class="afb-srv">'+f.s+' · '+f.b+' · '+f.d+'</div></div></div><div style="text-align:right"><div style="color:var(--acc);font-size:13px;letter-spacing:2px">'+'★'.repeat(f.r)+'☆'.repeat(5-f.r)+'</div>'+(f.rep?'<div class="afb-replied"><span class="ms">check_circle</span>Respondido</div>':'')+'</div></div><div class="afb-txt">'+f.tx+'</div>'+(f.rep?'<div style="font-size:12px;color:var(--mut);padding:8px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.06)">✓ Resposta já enviada para este cliente.</div>':'<textarea class="afb-resp" rows="2" placeholder="Escreva uma resposta pública..."></textarea><button class="abtn abtn-g" style="padding:8px 18px;border-radius:999px;font-size:12px;display:inline-flex;align-items:center;gap:6px"><span class="ms" style="font-size:15px">reply</span>Responder</button>')+'</div>').join('');
}

/* HISTÓRICO */
function renderHist(){
  const el=document.getElementById('atl-list');if(!el)return;
  const cm={ok:'dot-ok',acc:'dot-acc',err:'dot-err',mut:'dot-mut'};
  el.innerHTML=HIST_A.map(h=>'<div class="atl-item"><div class="atl-dot '+cm[h.c]+'"><span class="ms">'+h.ic+'</span></div><div class="atl-act">'+h.a+'</div><div class="atl-meta"><span><span class="ms">person</span>'+h.u+'</span><span><span class="ms">schedule</span>'+h.t+'</span></div></div>').join('');
}

/* CONFIG — troca de aba (as listas de Serviços/Equipe são reais, ver pages/admin/configuracoes.js) */
function cfgT(id,btn){
  document.querySelectorAll('.acfg-tc').forEach(t=>t.classList.remove('on'));
  document.getElementById('cfg-'+id)?.classList.add('on');
  btn.closest('.acfg-tabs').querySelectorAll('.acfg-tab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}

/* NOTIF */
function selTpl(el,nome){
  document.querySelectorAll('.atpl').forEach(t=>t.classList.remove('sel'));
  el.classList.add('sel');
  const ns=document.getElementById('tpl-sel');
  if(ns)ns.textContent=nome;
  ns.style.color='var(--acc)';
  ns.style.fontStyle='normal';
  ns.style.fontWeight='600';
}

/* ADMIN INIT (parte mock) — chamado ao entrar no painel; Serviços/Equipe/Agenda reais são
   disparados separadamente por main.js junto com esta função. */
function adminInit(){
  admClock();
  renderRevChart('mensal');
  renderDonut();
  renderWeekly();
  renderTopCli();
  renderClis();
  renderFbs();
  renderHist();
}

/* Expõe no escopo global as funções referenciadas via onclick="..." no HTML
   (necessário porque este arquivo agora é um ES module — módulos não vazam
   suas declarações para `window` automaticamente). */
Object.assign(window, {
  showV, sto, togglePw,
  toggleCpw, toggleCpw2, togSb, pGo, pTab, pPTab, selBar, togAdSb, aGo,
  togApw, swChartPeriod, selTpl, cfgT, renderRev, adminInit,
});

export { rvObs, showV, pGo, aGo, adminInit };
