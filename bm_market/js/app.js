// Простейшая логика клиента: инициализация демо-лотов, рендер каталога и страниц.
// Данные хранятся в localStorage под ключом 'bm_lots_v1'
(function(){
  const STORE = 'bm_lots_v1';
  const fmt = (v) => v.toLocaleString('ru-RU') + ' ₽';
  const demo = [
    {id:'lot-1', title:'Смарт‑наушники BM Pro', desc:'ANC, Bluetooth 5.3, 30ч', category:'electronics', minStep:100, startPrice:4500, endsAt: Date.now()+3*60*60*1000, bids:[{user:'demo', amount:4500, ts:Date.now()-60000}]},
    {id:'lot-2', title:'Робот‑пылесос CleanMax', desc:'Лазерная навигация, 120 мин', category:'home', minStep:200, startPrice:8900, endsAt: Date.now()+2*60*60*1000, bids:[{user:'demo', amount:8900, ts:Date.now()-360000}]},
    {id:'lot-3', title:'Куртка AirShell', desc:'Лёгкая ветровка', category:'fashion', minStep:50, startPrice:2100, endsAt: Date.now()+45*60*1000, bids:[{user:'demo', amount:2100, ts:Date.now()-120000}]}
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(STORE)) || demo }catch(e){ return demo } }
  function save(data){ localStorage.setItem(STORE, JSON.stringify(data)) }
  let lots = load();

  // Utilities
  function currentBid(lot){ return lot.bids && lot.bids.length ? Math.max(...lot.bids.map(b=>b.amount)) : lot.startPrice }
  function timeLeft(ms){
    const t = Math.max(0, ms - Date.now());
    const s = Math.floor(t/1000)%60, m = Math.floor(t/60000)%60, h = Math.floor(t/3600000);
    return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':');
  }

  // Renderers
  function renderGrid(targetId, list){
    const el = document.getElementById(targetId);
    if(!el) return;
    el.innerHTML = '';
    list.forEach(lot=>{
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<div class="img"><svg width="160" height="100" viewBox="0 0 24 14" fill="none"><rect width="24" height="14" rx="1" fill="#f3f4f6"/></svg></div>
        <h3>${lot.title}</h3>
        <div class="meta">${lot.desc}</div>
        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center">
          <div><div class="meta">Текущая ставка</div><strong>${fmt(currentBid(lot))}</strong></div>
          <div style="text-align:right"><div class="meta">Окончание</div><div class="badge" data-timer="${lot.id}">${timeLeft(lot.endsAt)}</div></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px">
          <a class="btn" href="lot.html?id=${encodeURIComponent(lot.id)}">Открыть</a>
          <button data-bid="${lot.id}" class="btn">Сделать ставку</button>
        </div>`;
      el.appendChild(card);
    });
  }

  // Single lot page render
  function renderLot(id){
    const el = document.getElementById('lotCard');
    if(!el) return;
    const lot = lots.find(l=>l.id===id);
    if(!lot){ el.innerHTML = '<p>Лот не найден</p>'; return; }
    el.innerHTML = `<div class="lot-card">
      <div class="img"><svg width="420" height="260" viewBox="0 0 24 14" fill="none"><rect width="24" height="14" rx="1" fill="#f3f4f6"/></svg></div>
      <h2>${lot.title}</h2>
      <p class="meta">${lot.desc}</p>
      <div style="display:flex; gap:12px; margin-top:10px">
        <div><div class="meta">Текущая ставка</div><div style="font-size:20px">${fmt(currentBid(lot))}</div></div>
        <div><div class="meta">Мин. шаг</div><div>${fmt(lot.minStep)}</div></div>
        <div><div class="meta">Окончание</div><div class="badge" data-timer="${lot.id}">${timeLeft(lot.endsAt)}</div></div>
      </div>
      <form id="bidForm" style="margin-top:14px; display:flex; gap:8px">
        <input id="bidValue" placeholder="Ваша ставка" type="number" min="0" style="padding:8px; border-radius:8px; border:1px solid #e5e7eb; flex:1">
        <button class="btn primary" type="submit">Ставка</button>
      </form>
      <div style="margin-top:12px">
        <button id="showHistory" class="btn">История ставок</button>
        <div id="history" class="history" style="margin-top:8px"></div>
      </div>
    </div>`;

    // handlers
    document.getElementById('bidForm').addEventListener('submit', function(e){
      e.preventDefault();
      const v = Number(document.getElementById('bidValue').value);
      const min = currentBid(lot) + lot.minStep;
      if(!Number.isFinite(v) || v < min){ alert('Недостаточная ставка. Мин.: ' + fmt(min)); return; }
      lot.bids.push({user:'guest', amount:Math.round(v), ts:Date.now()});
      save(lots);
      document.getElementById('bidValue').value = '';
      renderLot(id);
    });
    document.getElementById('showHistory').addEventListener('click', function(){
      const hist = lot.bids.slice().sort((a,b)=>b.ts-a.ts).map(b=>`<div>${new Date(b.ts).toLocaleString('ru-RU')} — ${b.user} — <strong>${fmt(b.amount)}</strong></div>`).join('');
      document.getElementById('history').innerHTML = hist || '<div>Нет ставок</div>';
    });
  }

  // Timers updater
  setInterval(function(){
    document.querySelectorAll('[data-timer]').forEach(el=>{
      const id = el.getAttribute('data-timer');
      const lot = lots.find(l=>l.id===id);
      if(!lot) return;
      const left = Math.max(0, lot.endsAt - Date.now());
      if(left<=0){ el.textContent = 'Завершён'; }
      else{ const s = timeLeft(lot.endsAt); el.textContent = s; }
    });
  }, 1000);

  // Global click handlers (for bid buttons on catalog)
  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-bid]');
    if(btn){
      const id = btn.getAttribute('data-bid');
      const lot = lots.find(l=>l.id===id);
      const amount = currentBid(lot) + lot.minStep;
      if(!confirm('Подтвердить ставку ' + fmt(amount) + ' на ' + lot.title + '?')) return;
      lot.bids.push({user:'guest', amount:amount, ts:Date.now()});
      save(lots);
      render(); // re-render
    }
  });

  // Routing & init
  function getParam(name){
    const q = new URLSearchParams(location.search);
    return q.get(name);
  }
  function render(){
    const path = location.pathname.split('/').pop();
    if(path === 'catalog.html' || path === '' || path==='index.html'){
      // index and catalog both show grid; index uses featuredGrid
      renderGrid('grid', lots);
      const fg = document.getElementById('featuredGrid');
      if(fg) renderGrid('featuredGrid', lots.slice(0,3));
    }
    if(path === 'lot.html'){
      const id = getParam('id');
      renderLot(id);
    }
  }

  // Filters on catalog
  const applyBtn = document.getElementById('apply');
  if(applyBtn){
    applyBtn.addEventListener('click', function(){
      const q = (document.getElementById('search')||{}).value || '';
      const cat = (document.getElementById('category')||{}).value || 'all';
      const sort = (document.getElementById('sort')||{}).value || 'ending';
      let res = lots.slice();
      if(cat !== 'all') res = res.filter(l=>l.category===cat);
      if(q) res = res.filter(l=> (l.title+' '+l.desc).toLowerCase().includes(q.toLowerCase()));
      if(sort === 'ending') res.sort((a,b)=>a.endsAt - b.endsAt);
      if(sort === 'price_desc') res.sort((a,b)=>Math.max(...b.bids.map(x=>x.amount)) - Math.max(...a.bids.map(x=>x.amount)));
      renderGrid('grid', res);
    });
  }

  // initial render
  render();

  // expose for console debugging
  window.BM = { lots, save };
})();
