window.WormsGame = {
  name: 'Worms (artyleryjska, mobile)',
  desc: 'Turowa gra artyleryjska 2-4 graczy na niszczalnym terenie, z bronią, skrzynkami, wodą i upadkami. Hot-seat lub asynchronicznie kodem (Teams/mail).',
  init: function(container){
    const root = container;
    root.innerHTML = `
    <style>
      .w { display:flex; flex-wrap:wrap; gap:12px; }
      .cw { background:#0b1220; border-radius:12px; padding:8px; flex:1; min-width:0; }
      canvas { border:1px solid #333; border-radius:8px; display:block; width:100%; height:auto; touch-action:none; }
      .panel { background:#2a2a3c; border-radius:12px; padding:12px; min-width:260px; flex:1; color:#e6e6e6; }
      .row { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; align-items:center; }
      button { background:#4f8cff; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:14px; min-height:40px; }
      button.secondary { background:#444; }
      button.danger { background:#c44; }
      button.ghost { background:#333; }
      select,textarea,input { background:#333; color:#fff; border:1px solid #555; border-radius:6px; padding:6px; font-size:14px; }
      textarea { width:100%; height:90px; font-family:monospace; font-size:11px; }
      .status { font-size:14px; font-weight:600; margin:6px 0; }
      .log { height:110px; overflow:auto; background:#181824; border-radius:6px; padding:6px; font-size:12px; }
      .mobile-controls { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
      .mobile-controls button { flex:1; min-width:80px; }
      .hud { display:flex; justify-content:space-between; font-size:12px; color:#9aa0a6; margin-bottom:4px; }
    </style>
    <div class="w">
      <div class="cw">
        <div class="hud"><span id="wTurnHud">-</span><span id="wWindHud">Wiatr: 0</span></div>
        <canvas id="wormCanvas" width="720" height="360"></canvas>
        <div class="row">
          <button id="wLeft">◀</button>
          <button id="wRight">▶</button>
          <label>Kąt <span id="wAngleV">45</span></label>
          <input type="range" id="wAngle" min="0" max="180" value="45" style="flex:1;min-width:120px;">
          <label>Moc <span id="wPowerV">60</span></label>
          <input type="range" id="wPower" min="10" max="100" value="60" style="flex:1;min-width:120px;">
        </div>
        <div class="row">
          <select id="wWeapon" style="flex:1;min-width:140px;"></select>
          <button id="wFire" class="danger">Ognia!</button>
          <button class="secondary" id="wEndTurn">Koniec tury</button>
        </div>
        <div class="mobile-controls">
          <button class="ghost" id="mJump">Skok</button>
          <button class="ghost" id="mBackflip">Salto</button>
          <button class="ghost" id="mSelect">Zmień robaka</button>
        </div>
      </div>
      <div class="panel">
        <h3>Worms</h3>
        <div class="status" id="wStatus">Nowa gra</div>
        <div class="row">
          <label>Gracze:</label>
          <select id="wPlayers"><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select>
          <label>Robaki/gracz:</label>
          <select id="wPerTeam"><option value="2">2</option><option value="3" selected>3</option></select>
          <button id="wNew">Nowa gra</button>
        </div>
        <div id="wInfo"></div>
        <div id="wAmmo"></div>
        <div class="row">
          <button class="secondary" id="wCopy">Kopiuj stan</button>
        </div>
        <textarea id="wCode" placeholder="Wklej kod stanu (od poprzedniego gracza)"></textarea>
        <div class="row"><button id="wLoad">Wczytaj stan</button></div>
        <div class="log" id="wLog"></div>
      </div>
    </div>
    `;

    const canvas=document.getElementById('wormCanvas');
    const ctx=canvas.getContext('2d');
    const W=canvas.width, H=canvas.height;
    const COLORS=['#e53935','#1e88e5','#43a047','#fdd835','#8e24aa','#fb8c00'];
    const WATER_LEVEL=H-28;
    const WEAPONS={
      bazooka:{name:'Bazooka',ammo:Infinity,dmg:50,rad:30,type:'proj'},
      grenade:{name:'Granat',ammo:4,dmg:45,rad:28,type:'gren',timer:110},
      shotgun:{name:'Strzelba',ammo:6,dmg:12,rad:0,type:'shot',pellets:6},
      airstrike:{name:'Nalot',ammo:2,dmg:35,rad:22,type:'air',count:6},
      banana:{name:'Bananobomba',ammo:1,dmg:65,rad:42,type:'gren',timer:150,bouncy:true},
      holy:{name:'Święty granat',ammo:1,dmg:85,rad:55,type:'gren',timer:180},
      dynamite:{name:'Dynamit',ammo:2,dmg:55,rad:30,type:'dynamite',timer:120},
      minigun:{name:'Minigun',ammo:2,dmg:9,rad:0,type:'mini',shots:12},
      firepunch:{name:'Ognisty cios',ammo:Infinity,dmg:32,rad:0,type:'melee',range:28},
      bat:{name:'Kij',ammo:Infinity,dmg:22,rad:0,type:'melee',range:28,knock:3}
    };

    let state=null;
    let animating=false;
    let aimAngle=45, aimPower=60;

    function genTerrain(){
      const h=new Array(W).fill(0);
      for(let x=0;x<W;x++){
        let base=H*0.62 + Math.sin(x*0.008)*50 + Math.sin(x*0.031)*25 + Math.sin(x*0.07)*12;
        if(Math.sin(x*0.02)>0.7) base=H*0.78;
        h[x]=Math.max(60, Math.min(WATER_LEVEL-10, base));
      }
      return h;
    }

    function spawnCrate(terrain){
      const x=40+Math.floor(Math.random()*(W-80));
      return {x, y:0, type: Math.random()<0.5?'health':'ammo', vy:0, collected:false};
    }

    function newState(nPlayers, perTeam){
      const terrain=genTerrain();
      const worms=[];
      let id=0;
      for(let t=0;t<nPlayers;t++){
        for(let i=0;i<perTeam;i++){
          const x=Math.floor(W/(nPlayers+1)*(t+1) + (i- (perTeam-1)/2)*26);
          const y=terrain[x]-12;
          worms.push({id:id++, team:t, x, y, hp:100, alive:true, dir: t<nPlayers/2?1:-1, moved:0, vy:0});
        }
      }
      const ammo={};
      for(let t=0;t<nPlayers;t++){ ammo[t]={}; Object.keys(WEAPONS).forEach(w=>{ ammo[t][w]= (WEAPONS[w].ammo===Infinity?999:WEAPONS[w].ammo); }); }
      const crates=[];
      for(let i=0;i<6;i++) crates.push(spawnCrate(terrain));
      return {version:2, players:nPlayers, perTeam, terrain, worms, crates, ammo, current:0, wind:(Math.random()*4-2), log:['Bitwa rozpoczęta!'], waterLevel:WATER_LEVEL};
    }

    function normalizeState(s){
      if(!s.ammo){ s.ammo={}; for(let t=0;t<s.players;t++){ s.ammo[t]={}; Object.keys(WEAPONS).forEach(w=>{ s.ammo[t][w]= (WEAPONS[w].ammo===Infinity?999:WEAPONS[w].ammo); }); } }
      if(!s.crates) s.crates=[];
      if(!s.waterLevel) s.waterLevel=WATER_LEVEL;
      s.worms.forEach(w=>{ if(w.dir===undefined) w.dir=1; if(w.vy===undefined) w.vy=0; if(w.moved===undefined) w.moved=0; });
      if(!s.version) s.version=2;
      return s;
    }

    function terrainY(x){ if(x<0||x>=W) return H; return state.terrain[Math.round(Math.max(0,Math.min(W-1,x)))]; }

    function applyGravity(w){
      const gy=terrainY(w.x);
      if(w.y < gy-1){ w.y+=3; if(w.y>gy-1) w.y=gy-1; }
      else if(w.y > gy-1){ w.y=gy-1; }
    }

    function log(msg){ state.log.push(msg); if(state.log.length>60) state.log.shift(); }

    function aliveTeams(){ return new Set(state.worms.filter(w=>w.alive).map(w=>w.team)); }

    function nextTurn(){
      const curTeam = state.worms[state.current].team;
      const teams = [...aliveTeams()].sort();
      const nextTeam = teams.length ? teams[(teams.indexOf(curTeam)+1)%teams.length] : curTeam;
      const idx = state.worms.findIndex(w=>w.alive && w.team===nextTeam);
      if(idx>=0) state.current = idx;
      const w=state.worms[state.current];
      w.moved=0;
      state.wind += (Math.random()*1.6-0.8); state.wind=Math.max(-6,Math.min(6,state.wind));
      if(Math.random()<0.35) state.crates.push(spawnCrate(state.terrain));
      state.worms.forEach(ww=>{
        if(!ww.alive) return;
        if(ww.y >= state.waterLevel-2){ ww.hp -= 15; log(`Gracz ${ww.team+1} tonie (-15 HP).`); if(ww.hp<=0){ ww.alive=false; log(`Robak gracza ${ww.team+1} utonął.`); } }
      });
      state.crates.forEach(c=>{
        if(c.collected) return;
        const gy=terrainY(c.x);
        if(c.y < gy-8){ c.y+=3; if(c.y>gy-8) c.y=gy-8; }
        const w2=state.worms.find(ww=>ww.alive && Math.hypot(ww.x-c.x, ww.y-c.y)<14);
        if(w2){
          c.collected=true;
          if(c.type==='health'){ w2.hp=Math.min(100,w2.hp+25); log(`Gracz ${w2.team+1} zbiera apteczkę (+25 HP).`); }
          else {
            const ws=Object.keys(WEAPONS); const rw=ws[Math.floor(Math.random()*ws.length)];
            state.ammo[w2.team][rw]+= (WEAPONS[rw].ammo===Infinity?0:1);
            log(`Gracz ${w2.team+1} zbiera skrzynkę (${WEAPONS[rw].name}).`);
          }
        }
      });
      state.crates=state.crates.filter(c=>!c.collected);
      log(`Tura: Gracz ${w.team+1} / robak ${w.id%100+1}. Wiatr: ${state.wind.toFixed(1)}`);
      updateUI();
      render();
      const at=aliveTeams();
      if(at.size<=1 && state.worms.some(x=>x.alive)){
        const winner=[...at][0];
        log(`🏆 Wygrywa gracz ${winner+1}!`);
        updateUI();
      }
    }

    function explode(cx,cy,radius,damage,sourceTeam){
      for(let x=Math.max(0,Math.floor(cx-radius)); x<=Math.min(W-1,Math.ceil(cx+radius)); x++){
        const dx=x-cx;
        const dyMax=Math.sqrt(Math.max(0,radius*radius-dx*dx));
        state.terrain[x]=Math.min(state.waterLevel, state.terrain[x]+dyMax*0.7);
      }
      state.worms.forEach(w=>{
        if(!w.alive) return;
        const d=Math.hypot(w.x-cx, w.y-cy);
        if(d<=radius+6){
          const dmg=Math.round(damage*(1-d/(radius+6)));
          w.hp-=dmg;
          const ang=Math.atan2(w.y-cy, w.x-cx);
          const kb=Math.min(40, dmg*0.5);
          w.x += Math.cos(ang)*kb*0.4;
          w.y -= Math.abs(Math.sin(ang))*kb*0.4;
          applyGravity(w);
          if(dmg>0) log(`Gracz ${w.team+1} otrzymuje ${dmg} obrażeń.`);
          if(w.hp<=0){ w.alive=false; log(`Robak gracza ${w.team+1} zginął.`); }
        }
      });
      state.crates.forEach(c=>{
        if(c.collected) return;
        if(Math.hypot(c.x-cx,c.y-cy)<=radius) c.collected=true;
      });
      state.crates=state.crates.filter(c=>!c.collected);
    }

    function fireWeapon(){
      if(animating) return;
      const w=state.worms[state.current];
      const weaponKey=document.getElementById('wWeapon').value;
      const weapon=WEAPONS[weaponKey];
      if(state.ammo[w.team][weaponKey]<=0 && weapon.ammo!==Infinity){ log('Brak amunicji.'); updateUI(); return; }
      if(weapon.ammo!==Infinity) state.ammo[w.team][weaponKey]-=1;

      const angle=aimAngle*Math.PI/180;
      const power=aimPower;
      const dir=w.dir||1;

      if(weapon.type==='melee'){
        animating=true;
        const tx=w.x + dir*weapon.range;
        const ty=terrainY(tx)-8;
        const target=state.worms.find(ww=>ww.alive && ww.id!==w.id && Math.hypot(ww.x-tx, ww.y-ty)<20);
        if(target){
          target.hp -= weapon.dmg;
          const kb=(weapon.knock||1)*12;
          target.x += dir*kb; target.y -= kb*0.6; applyGravity(target);
          log(`${weapon.name}: trafienie ${weapon.dmg} DMG.`);
          if(target.hp<=0){ target.alive=false; log(`Robak gracza ${target.team+1} zginął.`); }
        } else {
          log(`${weapon.name}: pudło.`);
        }
        applyGravity(w);
        setTimeout(()=>{ animating=false; checkVictory(); nextTurn(); }, 500);
        render(); return;
      }

      if(weapon.type==='dynamite'){
        animating=true;
        const bx=w.x; const by=terrainY(w.x)-6;
        let frames=0;
        function step(){
          frames++;
          render();
          ctx.fillStyle='#444'; ctx.fillRect(bx-5,by-10,10,10);
          ctx.fillStyle='#ffeb3b'; ctx.fillRect(bx-1,by-14,2,4);
          if(frames>=weapon.timer){ animating=false; explode(bx,by,weapon.rad,weapon.dmg,w.team); checkVictory(); setTimeout(nextTurn,600); render(); }
          else setTimeout(step, 16);
        }
        setTimeout(step, 16);
        return;
      }

      if(weapon.type==='air'){
        animating=true;
        const baseX=w.x + dir*60;
        const bombs=[];
        for(let i=0;i<weapon.count;i++) bombs.push({x: baseX + (i-Math.floor(weapon.count/2))*18, y:0, vy:0, done:false, delay:i*180});
        const start=performance.now();
        function step(){
          const now=performance.now();
          render();
          let allDone=true;
          bombs.forEach(b=>{
            if(now-start < b.delay){ allDone=false; return; }
            if(!b.done){
              b.vy+=0.6; b.y+=b.vy;
              if(b.y>=terrainY(b.x)-2){ b.done=true; explode(b.x,b.y,weapon.rad,weapon.dmg,w.team); }
              else { allDone=false; }
            }
            if(!b.done){ ctx.fillStyle='#ff0'; ctx.fillRect(b.x-2,b.y-2,4,4); allDone=false; }
          });
          if(!allDone) setTimeout(step, 16);
          else { animating=false; checkVictory(); setTimeout(nextTurn,600); }
        }
        setTimeout(step, 16);
        return;
      }

      if(weapon.type==='shot'){
        animating=true;
        const speed=power*0.13;
        const pellets=[];
        for(let i=0;i<weapon.pellets;i++){
          const a=angle + (i-(weapon.pellets-1)/2)*0.12;
          pellets.push({x:w.x, y:w.y-8, vx:Math.cos(a)*speed*dir + state.wind*0.05, vy:-Math.sin(a)*speed, alive:true});
        }
        function step(){
          render();
          let anyAlive=false;
          pellets.forEach(p=>{
            if(!p.alive) return;
            p.vy+=0.22; p.vx+=state.wind*0.015;
            p.x+=p.vx; p.y+=p.vy;
            if(p.x<0||p.x>=W||p.y>=H){ p.alive=false; return; }
            const gy=terrainY(p.x);
            if(p.y>=gy){ p.alive=false; return; }
            const hit=state.worms.find(ww=>ww.alive && ww.id!==w.id && Math.hypot(ww.x-p.x,ww.y-p.y)<9);
            if(hit){ hit.hp-=weapon.dmg; log(`Strzelba trafia gracza ${hit.team+1} (-${weapon.dmg}).`); if(hit.hp<=0){hit.alive=false;log(`Robak gracza ${hit.team+1} zginął.`);} p.alive=false; return; }
            ctx.fillStyle='#ff0'; ctx.fillRect(p.x-2,p.y-2,4,4);
            anyAlive=true;
          });
          if(anyAlive) setTimeout(step, 16);
          else { animating=false; checkVictory(); setTimeout(nextTurn,400); }
        }
        setTimeout(step, 16);
        return;
      }

      if(weapon.type==='mini'){
        animating=true;
        let shotsFired=0;
        function fireOne(){
          if(shotsFired>=weapon.shots){ animating=false; checkVictory(); setTimeout(nextTurn,400); return; }
          shotsFired++;
          const a=angle + (Math.random()*0.2-0.1);
          const speed=power*0.15;
          const proj={x:w.x, y:w.y-8, vx:Math.cos(a)*speed*dir + state.wind*0.05, vy:-Math.sin(a)*speed, alive:true};
          function step(){
            render();
            if(proj.alive){
              proj.vy+=0.25; proj.vx+=state.wind*0.015;
              proj.x+=proj.vx; proj.y+=proj.vy;
              let done=false;
              if(proj.x<0||proj.x>=W||proj.y>=H) done=true;
              else {
                const gy=terrainY(proj.x);
                if(proj.y>=gy) done=true;
                const hit=state.worms.find(ww=>ww.alive && ww.id!==w.id && Math.hypot(ww.x-proj.x,ww.y-proj.y)<8);
                if(hit){ hit.hp-=weapon.dmg; if(hit.hp<=0){hit.alive=false;log(`Robak gracza ${hit.team+1} zginął.`);} log(`Minigun trafia (-${weapon.dmg}).`); done=true; }
              }
              if(done){ proj.alive=false; ctx.fillStyle='#ff0'; ctx.fillRect(proj.x-2,proj.y-2,4,4); setTimeout(fireOne,120); return; }
              ctx.fillStyle='#ff0'; ctx.fillRect(proj.x-2,proj.y-2,4,4);
              setTimeout(step, 16);
            }
          }
          setTimeout(step, 16);
        }
        fireOne();
        return;
      }

      // proj / gren
      animating=true;
      const speed=power*0.12;
      const isGren=weapon.type==='gren';
      const proj={x:w.x, y:w.y-8, vx:Math.cos(angle)*speed*dir + state.wind*0.05, vy:-Math.sin(angle)*speed, weapon, alive:true, timer: isGren?weapon.timer:0, bouncy:!!weapon.bouncy};
      function step(){
        render();
        if(proj.alive){
          proj.vy+=0.25; proj.vx+=state.wind*0.015;
          proj.x+=proj.vx; proj.y+=proj.vy;
          if(isGren) proj.timer--;
          let explodeNow=false;
          if(proj.x<0||proj.x>=W||proj.y>=H) explodeNow=true;
          else {
            const gy=terrainY(proj.x);
            if(proj.y>=gy){
              if(isGren && proj.bouncy && proj.timer>10){
                proj.y=gy-2; proj.vy=-Math.abs(proj.vy)*0.55; proj.vx*=0.85;
              } else {
                explodeNow=true;
              }
            }
            const hit=state.worms.find(ww=>ww.alive && ww.id!==w.id && Math.hypot(ww.x-proj.x,ww.y-proj.y)<9);
            if(hit) explodeNow=true;
          }
          if(isGren && proj.timer<=0) explodeNow=true;
          if(explodeNow){
            proj.alive=false;
            explode(proj.x,proj.y,weapon.rad,weapon.dmg,w.team);
          } else {
            ctx.fillStyle='#ff0'; ctx.fillRect(proj.x-2,proj.y-2,4,4);
          }
        }
        if(proj.alive) setTimeout(step, 16);
        else { animating=false; checkVictory(); setTimeout(nextTurn,600); }
    }
      setTimeout(step, 16);
    }

    function checkVictory(){
      const at=aliveTeams();
      if(at.size<=1 && state.worms.some(x=>x.alive)){
        const winner=[...at][0];
        log(`🏆 Wygrywa gracz ${winner+1}!`);
        updateUI();
      }
    }

    function drawScene(){
      const grad=ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,'#0d1b2a'); grad.addColorStop(0.6,'#1b2838'); grad.addColorStop(1,'#0b1220');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,0.06)';
      for(let i=0;i<5;i++){ ctx.beginPath(); ctx.ellipse(120+i*140,40+i*8,60,18,0,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle='#0a3d62'; ctx.fillRect(0,state.waterLevel,W,H-state.waterLevel);
      ctx.fillStyle='rgba(255,255,255,0.15)';
      for(let x=0;x<W;x+=8){ ctx.fillRect(x,state.waterLevel+Math.sin(x*0.1)*2,4,2); }
      ctx.fillStyle='#3a5a2a';
      ctx.beginPath(); ctx.moveTo(0,H);
      for(let x=0;x<W;x++) ctx.lineTo(x, state.terrain[x]);
      ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#5a8a3a'; ctx.lineWidth=2;
      ctx.beginPath();
      for(let x=0;x<W;x++){ if(x===0) ctx.moveTo(x,state.terrain[x]); else ctx.lineTo(x,state.terrain[x]); }
      ctx.stroke(); ctx.lineWidth=1;
      state.crates.forEach(c=>{
        if(c.collected) return;
        ctx.fillStyle = c.type==='health' ? '#e53935' : '#fb8c00';
        ctx.fillRect(c.x-6, c.y-6, 12, 12);
        ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
        ctx.fillText(c.type==='health'?'+':'?', c.x, c.y+3);
        ctx.textAlign='left';
      });
      state.worms.forEach(w=>{
        if(!w.alive) return;
        ctx.fillStyle=COLORS[w.team];
        ctx.beginPath(); ctx.ellipse(w.x,w.y-6,7,5,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(w.x + (w.dir||1)*3, w.y-9, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(w.x-12,w.y-18,24,4);
        ctx.fillStyle = w.hp>50?'#4caf50': w.hp>25?'#ff9800':'#f44336';
        ctx.fillRect(w.x-12,w.y-18,24*(w.hp/100),4);
        ctx.fillStyle='#fff'; ctx.font='9px sans-serif'; ctx.textAlign='center';
        ctx.fillText(Math.round(w.hp), w.x, w.y-20); ctx.textAlign='left';
      });
      const w=state.worms[state.current];
      if(w && w.alive){
        ctx.strokeStyle='#fff'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(w.x,w.y-6,13,0,Math.PI*2); ctx.stroke(); ctx.lineWidth=1;
        const rad=aimAngle*Math.PI/180;
        const dir=w.dir||1;
        const speed=aimPower*0.12;
        let px=w.x, py=w.y-8, vx=Math.cos(rad)*speed*dir, vy=-Math.sin(rad)*speed;
        ctx.strokeStyle='rgba(255,235,59,0.7)'; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(px,py);
        for(let i=0;i<40;i++){
          vy+=0.25; vx+=state.wind*0.015; px+=vx; py+=vy;
          if(py>=terrainY(px)) break;
          ctx.lineTo(px,py);
        }
        ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle='#fff'; ctx.font='12px sans-serif';
      ctx.fillText('Wiatr: '+state.wind.toFixed(1) + (state.wind>0?' →':' ←'), 10, 16);
    }

    function render(){ drawScene(); updateUI(); }

    function updateUI(){
      const w=state.worms[state.current];
      document.getElementById('wStatus').textContent = w && w.alive ? `Gracz ${w.team+1} | Robak ${w.id%100+1} | HP ${Math.round(w.hp)}` : 'Koniec';
      document.getElementById('wTurnHud').textContent = w && w.alive ? `Gracz ${w.team+1}` : '-';
      document.getElementById('wWindHud').textContent = 'Wiatr: '+state.wind.toFixed(1);
      let info='';
      for(let t=0;t<state.players;t++){
        const ws=state.worms.filter(x=>x.team===t);
        const alive=ws.filter(x=>x.alive).length;
        info += `<div style="color:${COLORS[t]}">Gracz ${t+1}: ${alive}/${ws.length} robaków</div>`;
      }
      document.getElementById('wInfo').innerHTML=info;
      const curTeam = w? w.team : 0;
      const ammo=state.ammo[curTeam];
      let ammoHtml='<div style="font-size:12px;color:#9aa0a6;margin-top:4px;">Amunicja:</div>';
      Object.keys(WEAPONS).forEach(k=>{
        const v=ammo[k];
        if(v>0 || WEAPONS[k].ammo===Infinity){
          ammoHtml += `<div style="font-size:12px;">${WEAPONS[k].name}: ${WEAPONS[k].ammo===Infinity?'∞':v}</div>`;
        }
      });
      document.getElementById('wAmmo').innerHTML=ammoHtml;
      const sel=document.getElementById('wWeapon');
      const prev=sel.value;
      sel.innerHTML='';
      Object.keys(WEAPONS).forEach(k=>{
        if(state.ammo[curTeam][k]>0 || WEAPONS[k].ammo===Infinity){
          const opt=document.createElement('option'); opt.value=k; opt.textContent=WEAPONS[k].name; sel.appendChild(opt);
        }
      });
      if(prev && Array.from(sel.options).some(o=>o.value===prev)) sel.value=prev;
      const log=document.getElementById('wLog'); log.innerHTML=state.log.slice(-18).map(l=>'<div>'+l+'</div>').join(''); log.scrollTop=log.scrollHeight;
    }

    // controls
    document.getElementById('wLeft').addEventListener('click',()=>{ const w=state.worms[state.current]; if(!w||!w.alive||animating) return; const before=w.y; w.x=Math.max(0,w.x-6); w.dir=-1; w.moved+=6; applyGravity(w);
      const fall=w.y-before; if(fall>24){ const dmg=Math.round((fall-24)*0.6); w.hp-=dmg; log(`Upadek: -${dmg} HP.`); if(w.hp<=0){w.alive=false;log('Robak zginął przy upadku.');} }
      render(); });
    document.getElementById('wRight').addEventListener('click',()=>{ const w=state.worms[state.current]; if(!w||!w.alive||animating) return; const before=w.y; w.x=Math.min(W-1,w.x+6); w.dir=1; w.moved+=6; applyGravity(w);
      const fall=w.y-before; if(fall>24){ const dmg=Math.round((fall-24)*0.6); w.hp-=dmg; log(`Upadek: -${dmg} HP.`); if(w.hp<=0){w.alive=false;log('Robak zginął przy upadku.');} }
      render(); });
    const angSl=document.getElementById('wAngle'); const powSl=document.getElementById('wPower');
    angSl.addEventListener('input',()=>{ aimAngle=parseFloat(angSl.value); document.getElementById('wAngleV').textContent=aimAngle; render(); });
    powSl.addEventListener('input',()=>{ aimPower=parseFloat(powSl.value); document.getElementById('wPowerV').textContent=aimPower; render(); });
    document.getElementById('wFire').addEventListener('click',()=>{ if(!animating) fireWeapon(); });
    document.getElementById('wEndTurn').addEventListener('click',()=>{ if(!animating) nextTurn(); });

    document.getElementById('mJump').addEventListener('click',()=>{ const w=state.worms[state.current]; if(!w||!w.alive||animating) return; const before=w.y; w.y-=18; w.x += (w.dir||1)*12; applyGravity(w); const fall=w.y-before; if(fall>24){const dmg=Math.round((fall-24)*0.6);w.hp-=dmg;log(`Upadek: -${dmg} HP.`);if(w.hp<=0){w.alive=false;}} render(); });
    document.getElementById('mBackflip').addEventListener('click',()=>{ const w=state.worms[state.current]; if(!w||!w.alive||animating) return; w.dir=- (w.dir||1); log('Zmiana kierunku.'); render(); });
    document.getElementById('mSelect').addEventListener('click',()=>{
      const team=state.worms[state.current].team;
      const mine=state.worms.map((w,i)=>({w,i})).filter(o=>o.w.alive && o.w.team===team);
      if(mine.length<=1) return;
      const pos=mine.findIndex(o=>o.i===state.current);
      const next=mine[(pos+1)%mine.length].i;
      state.current=next;
      state.worms[state.current].moved=0;
      log(`Wybrano robaka ${state.worms[state.current].id%100+1}.`);
      render();
    });

    // touch aim on canvas
    let dragging=false;
    canvas.addEventListener('pointerdown', (e)=>{
      if(animating) return;
      dragging=true;
    });
    canvas.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      const w=state.worms[state.current]; if(!w||!w.alive) return;
      const rect=canvas.getBoundingClientRect();
      const x=(e.clientX-rect.left)*(W/rect.width);
      const y=(e.clientY-rect.top)*(H/rect.height);
      const dx=x-w.x; const dy=w.y-8-y;
      let ang=Math.atan2(dy, Math.abs(dx))*180/Math.PI;
      ang=Math.max(0,Math.min(180,ang));
      const pwr=Math.max(10,Math.min(100, Math.hypot(dx,dy)*0.6));
      aimAngle=ang; aimPower=pwr;
      w.dir = dx>=0?1:-1;
      angSl.value=ang; powSl.value=pwr;
      document.getElementById('wAngleV').textContent=Math.round(ang);
      document.getElementById('wPowerV').textContent=Math.round(pwr);
      render();
    });
    canvas.addEventListener('pointerup', ()=>{ dragging=false; });
    canvas.addEventListener('pointercancel', ()=>{ dragging=false; });

    document.getElementById('wNew').addEventListener('click',()=>{
      const n=parseInt(document.getElementById('wPlayers').value);
      const pt=parseInt(document.getElementById('wPerTeam').value);
      state=newState(n,pt); animating=false; aimAngle=45; aimPower=60;
      angSl.value=45; powSl.value=60;
      document.getElementById('wAngleV').textContent=45; document.getElementById('wPowerV').textContent=60;
      render();
    });
    document.getElementById('wCopy').addEventListener('click',()=>{
      const code=btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      document.getElementById('wCode').value=code;
      navigator.clipboard.writeText(code).catch(()=>{});
    });
    document.getElementById('wLoad').addEventListener('click',()=>{
      const v=document.getElementById('wCode').value;
      if(!v.trim()) return;
      try { state=normalizeState(JSON.parse(decodeURIComponent(escape(atob(v.trim()))))); animating=false; render(); }
      catch(e){ alert('Błędny kod stanu'); }
    });

    // init
    state=normalizeState(newState(4,3));
    render();
  }
};
