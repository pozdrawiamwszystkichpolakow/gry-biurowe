window.EmpireGame = {
  name: 'Imperia (4X turowa)',
  desc: 'Strategiczna gra turowa 2-4 graczy na mapie. Ruchy przesyłane kodem (Teams/mail) — bez serwera.',
  init: function(container){
    const root = container;
    root.innerHTML = `
    <style>
      .emp { display:flex; flex-wrap:wrap; gap:12px; }
      .map { display:grid; grid-template-columns:repeat(11,1fr); gap:2px; width:min(88vw,620px); }
      .tile { aspect-ratio:1; border:1px solid #333; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; user-select:none; position:relative; }
      .tile.water{background:#1e3a5f;color:#9cf;}
      .tile.plains{background:#4a7c3f;color:#efe;}
      .tile.forest{background:#2f5d2f;color:#cfc;}
      .tile.hill{background:#7a6a4f;color:#fff;}
      .tile.mountain{background:#555;color:#ddd;}
      .tile.city{box-shadow:inset 0 0 0 2px #ffd700;}
      .tile.sel{outline:3px solid #ffeb3b;}
      .tile.move{box-shadow:inset 0 0 0 2px #4caf50;}
      .panel{background:#2a2a3c;border-radius:12px;padding:12px;min-width:280px;flex:1;color:#e6e6e6;}
      .panel h3{margin:0 0 6px;}
      .row{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;align-items:center;}
      button{background:#4f8cff;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:13px;}
      button.secondary{background:#444;}
      button.danger{background:#c44;}
      select,textarea,input{background:#333;color:#fff;border:1px solid #555;border-radius:6px;padding:4px;}
      textarea{width:100%;height:90px;font-family:monospace;font-size:11px;}
      .status{font-size:14px;font-weight:600;margin:6px 0;}
      .log{height:120px;overflow:auto;background:#181824;border-radius:6px;padding:6px;font-size:12px;}
      .legend{font-size:11px;color:#9aa0a6;}
      .codebox{background:#181824;border-radius:6px;padding:6px;}
    </style>
    <div class="emp">
      <div>
        <div class="map" id="empMap"></div>
        <div class="legend">Woda ~ równina . las ▲ wzgórze △ góra 🏔 miasto 🏰 jednostka: I piechota A łucznik C kawaleria</div>
      </div>
      <div class="panel">
        <h3>Imperia</h3>
        <div class="status" id="empStatus">Nowa gra</div>
        <div id="empPlayer"></div>
        <div class="row" id="empSetup">
          <label>Gracze:</label>
          <select id="empPlayers"><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select>
          <button id="empNew">Nowa gra</button>
        </div>
        <div id="empActions"></div>
        <div class="row">
          <button id="empEndTurn">Zakończ turę</button>
          <button class="secondary" id="empCopy">Kopiuj stan</button>
        </div>
        <div class="codebox">
          <textarea id="empCode" placeholder="Wklej kod stanu (od poprzedniego gracza)"></textarea>
          <div class="row"><button id="empLoad">Wczytaj stan</button></div>
        </div>
        <div class="log" id="empLog"></div>
      </div>
    </div>
    `;

    const W=11,H=11;
    const TERRAIN=['water','plains','forest','hill','mountain'];
    const TERRAIN_GLYPH={water:'~',plains:'.',forest:'♣',hill:'^',mountain:'▲'};
    const UNIT_TYPES={
      infantry:{name:'Piechota',cost:10,hp:10,atk:3,def:2,move:2,range:1,glyph:'I'},
      archer:{name:'Łucznik',cost:15,hp:8,atk:2,def:1,move:2,range:2,glyph:'A'},
      cavalry:{name:'Kawaleria',cost:20,hp:10,atk:4,def:2,move:3,range:1,glyph:'C'}
    };
    const COLORS=['#e53935','#1e88e5','#43a047','#fdd835'];
    let state=null;
    let selected=null; // {type:'unit',id} or {type:'city',x,y}
    let moveTargets=[];

    function idx(x,y){ return y*W+x; }
    function inBounds(x,y){ return x>=0&&x<W&&y>=0&&y<H; }
    function neighbors(x,y){ const res=[]; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(dx===0&&dy===0) continue; if(Math.abs(dx)+Math.abs(dy)>2) continue; const nx=x+dx,ny=y+dy; if(inBounds(nx,ny)) res.push([nx,ny]); } return res; }

    function genMap(){
      // deterministic terrain
      const t=[];
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const d=Math.min(x,y,W-1-x,H-1-y);
        let v='plains';
        if((x+y)%7===0) v='water';
        else if((x*3+y*5)%11===0) v='mountain';
        else if((x+y)%3===0) v='forest';
        else if((x*y)%5===0) v='hill';
        if(d===0) v='water';
        t.push(v);
      }
      // cities positions
      const cityPos=[[1,1],[W-2,1],[1,H-2],[W-2,H-2]];
      const cities=cityPos.map((p,i)=>({x:p[0],y:p[1],owner:i}));
      // ensure city tiles not water
      cities.forEach(c=>{ t[idx(c.x,c.y)]='plains'; });
      return {tiles:t,cities};
    }

    function newState(nPlayers){
      const m=genMap();
      const players=Array.from({length:nPlayers},(_,i)=>({id:i,color:COLORS[i],gold:20,tech:0}));
      const cities=m.cities.slice(0,nPlayers).map(c=>({...c}));
      // units: one infantry per city
      const units=cities.map((c,i)=>({id:i+'-0',owner:i,type:'infantry',x:c.x+1,y:c.y,hp:10}));
      // fix unit tile if water
      units.forEach(u=>{ if(m.tiles[idx(u.x,u.y)]==='water'){ u.x=Math.max(0,u.x-1);} });
      return {version:1,turn:0,players,map:m.tiles,cities,units,nextUnitId:nPlayers,log:['Gra rozpoczęta.']};
    }

    function terrainDef(t){ return t==='forest'?1 : t==='hill'?1 : t==='mountain'?2 : 0; }

    function render(){
      const mapEl=document.getElementById('empMap');
      mapEl.innerHTML='';
      const S=state;
      for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
          const tile=document.createElement('div');
          const t=S.map[idx(x,y)];
          tile.className='tile '+t;
          let content=TERRAIN_GLYPH[t];
          // city
          const city=S.cities.find(c=>c.x===x&&c.y===y);
          if(city){ tile.classList.add('city'); content='🏰'; tile.title='Miasto gracza '+(city.owner+1); }
          // unit
          const unit=S.units.find(u=>u.x===x&&u.y===y);
          if(unit){ content=UNIT_TYPES[unit.type].glyph; tile.style.color=COLORS[unit.owner]; tile.title=UNIT_TYPES[unit.type].name+' HP'+unit.hp; }
          tile.textContent=content;
          if(selected && selected.type==='unit' && selected.id=== (unit&&unit.id)){ tile.classList.add('sel'); }
          if(selected && selected.type==='city' && selected.x===x && selected.y===y){ tile.classList.add('sel'); }
          if(moveTargets.some(m=>m.x===x&&m.y===y)){ tile.classList.add('move'); }
          tile.addEventListener('click',()=>onTileClick(x,y));
          mapEl.appendChild(tile);
        }
      }
      // player info
      const p=S.players[S.turn];
      document.getElementById('empPlayer').innerHTML = `<b>Tura gracza ${S.turn+1}</b> (${COLORS[S.turn]})<br>Złoto: ${p.gold} | Tech: ${p.tech}<br>Miasta: ${S.cities.filter(c=>c.owner===S.turn).length}`;
      document.getElementById('empStatus').textContent = `Gracz ${S.turn+1} na ruchu`;
      // actions
      const act=document.getElementById('empActions'); act.innerHTML='';
      if(selected && selected.type==='city'){
        const city=S.cities.find(c=>c.x===selected.x&&c.y===selected.y);
        if(city && city.owner===S.turn){
          // recruit
          Object.keys(UNIT_TYPES).forEach(type=>{
            const ut=UNIT_TYPES[type];
            const techReq = type==='archer'?1 : type==='cavalry'?2 : 0;
            if(S.players[S.turn].tech>=techReq){
              const b=document.createElement('button'); b.textContent=`Rekrutuj ${ut.name} (${ut.cost})`;
              b.onclick=()=>recruit(city,type); act.appendChild(b);
            }
          });
          // build
          const b1=document.createElement('button'); b1.textContent='Farma (15)'; b1.onclick=()=>build(city,'farm'); act.appendChild(b1);
          const b2=document.createElement('button'); b2.textContent='Kopalnia (25)'; b2.onclick=()=>build(city,'mine'); act.appendChild(b2);
        }
      }
      if(selected && selected.type==='unit'){
        const u=S.units.find(x=>x.id===selected.id);
        if(u && u.owner===S.turn){
          const b=document.createElement('button'); b.textContent='Badania (30)'; b.onclick=()=>research(); act.appendChild(b);
        }
      }
      // log
      const log=document.getElementById('empLog'); log.innerHTML=S.log.slice(-20).map(l=>'<div>'+l+'</div>').join('');
      log.scrollTop=log.scrollHeight;
    }

    function log(msg){ state.log.push(msg); }

    function onTileClick(x,y){
      const S=state;
      const unit=S.units.find(u=>u.x===x&&u.y===y);
      const city=S.cities.find(c=>c.x===x&&c.y===y);
      // if move target
      if(selected && selected.type==='unit' && moveTargets.some(m=>m.x===x&&m.y===y)){
        moveUnit(selected.id,x,y); selected=null; moveTargets=[]; render(); return;
      }
      moveTargets=[];
      if(unit && unit.owner===S.turn){ selected={type:'unit',id:unit.id}; computeMoves(unit); }
      else if(city){ selected={type:'city',x,y}; }
      else { selected=null; }
      render();
    }

    function computeMoves(unit){
      const S=state; const ut=UNIT_TYPES[unit.type];
      moveTargets=[];
      // BFS up to move range, avoid water and own units
      const visited=new Set(); const q=[{x:unit.x,y:unit.y,d:0}];
      visited.add(unit.x+','+unit.y);
      while(q.length){
        const cur=q.shift();
        if(cur.d>=ut.move) continue;
        for(const [nx,ny] of neighbors(cur.x,cur.y)){
          const key=nx+','+ny;
          if(visited.has(key)) continue;
          const t=S.map[idx(nx,ny)];
          if(t==='water') continue;
          const occ=S.units.find(u=>u.x===nx&&u.y===ny);
          if(occ && occ.owner===unit.owner) continue;
          visited.add(key);
          moveTargets.push({x:nx,y:ny});
          q.push({x:nx,y:ny,d:cur.d+1});
        }
      }
    }

    function moveUnit(id,tx,ty){
      const S=state; const u=S.units.find(x=>x.id===id);
      if(!u) return;
      const targetUnit=S.units.find(x=>x.x===tx&&x.y===ty);
      const targetCity=S.cities.find(c=>c.x===tx&&c.y===ty);
      if(targetUnit && targetUnit.owner!==u.owner){
        // combat
        const ut=UNIT_TYPES[u.type];
        const dt=UNIT_TYPES[targetUnit.type];
        const terrain=S.map[idx(tx,ty)];
        const atk=ut.atk + Math.floor(Math.random()*3);
        const def=dt.def + terrainDef(terrain) + Math.floor(Math.random()*2);
        targetUnit.hp -= atk;
        u.hp -= Math.max(0, def-2);
        log(`${ut.name} atakuje ${dt.name}: -${atk} HP (obrońca ${Math.max(0,targetUnit.hp)} HP).`);
        if(targetUnit.hp<=0){
          S.units=S.units.filter(x=>x.id!==targetUnit.id);
          u.x=tx; u.y=ty;
          log(`${dt.name} zniszczony.`);
        } else {
          // attacker may die from counter
          if(u.hp<=0){ S.units=S.units.filter(x=>x.id!==u.id); log(`${ut.name} poległ.`); }
        }
      } else if(targetCity && targetCity.owner!==u.owner){
        // attack city garrison (defense 5)
        const ut=UNIT_TYPES[u.type];
        const atk=ut.atk + Math.floor(Math.random()*3);
        targetCity._hp = (targetCity._hp||8) - atk;
        log(`${ut.name} atakuje miasto: -${atk} HP (miasto ${Math.max(0,targetCity._hp)}).`);
        if(targetCity._hp<=0){
          targetCity.owner=u.owner; targetCity._hp=8;
          u.x=tx; u.y=ty;
          S.players[u.owner].gold+=5;
          log(`Miasto zdobyte przez gracza ${u.owner+1}!`);
        } else {
          if(u.hp<=0){ S.units=S.units.filter(x=>x.id!==u.id); log(`${ut.name} poległ.`); }
        }
      } else {
        u.x=tx; u.y=ty;
      }
      // cleanup dead
      S.units=S.units.filter(u=>u.hp>0);
    }

    function recruit(city,type){
      const S=state; const p=S.players[S.turn];
      const ut=UNIT_TYPES[type];
      const techReq = type==='archer'?1 : type==='cavalry'?2 : 0;
      if(p.tech<techReq){ log('Za niski poziom technologii.'); render(); return; }
      if(p.gold<ut.cost){ log('Za mało złota.'); render(); return; }
      p.gold-=ut.cost;
      const id=S.nextUnitId++;
      // place near city
      let px=city.x+1, py=city.y;
      if(!inBounds(px,py) || S.map[idx(px,py)]==='water') { px=city.x; py=city.y+1; }
      S.units.push({id:String(id),owner:S.turn,type,hp:ut.hp,x:px,y:py});
      log(`Zrekrutowano ${ut.name}.`);
      render();
    }

    function build(city,type){
      const S=state; const p=S.players[S.turn];
      const cost = type==='farm'?15:25;
      if(p.gold<cost){ log('Za mało złota.'); render(); return; }
      p.gold-=cost;
      city.building=type;
      log(`Zbudowano ${type} w mieście.`);
      render();
    }

    function research(){
      const S=state; const p=S.players[S.turn];
      if(p.gold<30){ log('Za mało złota (30).'); render(); return; }
      p.gold-=30; p.tech=Math.min(2,p.tech+1);
      log(`Badania: poziom ${p.tech}.`);
      render();
    }

    function endTurn(){
      const S=state;
      // income
      S.cities.forEach(c=>{
        const owner=c.owner;
        if(owner<0) return;
        let inc=5;
        // buildings
        if(c.building==='farm') inc+=3;
        if(c.building==='mine') inc+=5;
        // adjacent improvements
        neighbors(c.x,c.y).forEach(([nx,ny])=>{
          const t=S.map[idx(nx,ny)];
          if(t==='forest') inc+=1;
        });
        S.players[owner].gold+=inc;
      });
      // reset city hp
      S.cities.forEach(c=>{ c._hp=8; });
      S.turn=(S.turn+1)%S.players.length;
      // check victory
      const counts=S.players.map((_,i)=>S.cities.filter(c=>c.owner===i).length);
      const alive=S.players.filter((_,i)=>counts[i]>0||S.units.some(u=>u.owner===i));
      if(alive.length<=1){
        const winner=counts.indexOf(Math.max(...counts));
        log(`Koniec gry! Wygrywa gracz ${winner+1}.`);
      }
      log(`Tura gracza ${S.turn+1}.`);
      selected=null; moveTargets=[];
      render();
    }

    function encode(){ return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
    function decode(str){ return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); }

    document.getElementById('empNew').addEventListener('click',()=>{
      const n=parseInt(document.getElementById('empPlayers').value);
      state=newState(n);
      selected=null; moveTargets=[];
      render();
    });
    document.getElementById('empEndTurn').addEventListener('click',()=>{ if(state) endTurn(); });
    document.getElementById('empCopy').addEventListener('click',()=>{
      const code=encode();
      document.getElementById('empCode').value=code;
      navigator.clipboard.writeText(code).catch(()=>{});
    });
    document.getElementById('empLoad').addEventListener('click',()=>{
      const v=document.getElementById('empCode').value;
      if(!v.trim()) return;
      try { state=decode(v); selected=null; moveTargets=[]; render(); }
      catch(e){ alert('Błędny kod stanu'); }
    });

    // init
    state=newState(4);
    render();
  }
};
