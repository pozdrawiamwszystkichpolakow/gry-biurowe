window.WormsGame = {
  name: 'Worms (artyleryjska)',
  desc: 'Turowa gra artyleryjska 2-4 graczy na niszczalnym terenie. Hot-seat lub asynchronicznie kodem (Teams/mail).',
  init: function(container){
    const root = container;
    root.innerHTML = `
    <style>
      .w { display:flex; flex-wrap:wrap; gap:12px; }
      .cw { background:#0b1220; border-radius:12px; padding:8px; }
      canvas { border:1px solid #333; border-radius:8px; display:block; }
      .panel { background:#2a2a3c; border-radius:12px; padding:12px; min-width:280px; flex:1; color:#e6e6e6; }
      .row { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; align-items:center; }
      button { background:#4f8cff; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:13px; }
      button.secondary { background:#444; }
      button.danger { background:#c44; }
      select,textarea,input { background:#333; color:#fff; border:1px solid #555; border-radius:6px; padding:4px; }
      textarea { width:100%; height:90px; font-family:monospace; font-size:11px; }
      .status { font-size:14px; font-weight:600; margin:6px 0; }
      .log { height:100px; overflow:auto; background:#181824; border-radius:6px; padding:6px; font-size:12px; }
    </style>
    <div class="w">
      <div class="cw">
        <canvas id="wormCanvas" width="720" height="360"></canvas>
        <div class="row">
          <button id="wLeft">◀</button>
          <button id="wRight">▶</button>
          <label>Kąt:</label><input type="range" id="wAngle" min="0" max="180" value="45" style="width:120px;">
          <span id="wAngleV">45</span>
          <label>Moc:</label><input type="range" id="wPower" min="10" max="100" value="60" style="width:120px;">
          <span id="wPowerV">60</span>
        </div>
        <div class="row">
          <select id="wWeapon">
            <option value="bazooka">Bazooka</option>
            <option value="grenade">Granat</option>
            <option value="shotgun">Strzelba</option>
            <option value="airstrike">Nalot</option>
          </select>
          <button id="wFire">Ognia!</button>
          <button class="secondary" id="wEndTurn">Koniec tury</button>
        </div>
      </div>
      <div class="panel">
        <h3>Worms</h3>
        <div class="status" id="wStatus">Nowa gra</div>
        <div class="row">
          <label>Gracze:</label>
          <select id="wPlayers"><option value="2">2</option><option value="3">3</option><option value="4" selected>4</option></select>
          <button id="wNew">Nowa gra</button>
        </div>
        <div id="wInfo"></div>
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
    const COLORS=['#e53935','#1e88e5','#43a047','#fdd835'];
    let state=null;
    let animating=false;
    let currentProj=null;
    let aimAngle=45, aimPower=60;

    function genTerrain(){
      const h=new Array(W).fill(0);
      for(let x=0;x<W;x++){
        const base=H*0.7 + Math.sin(x*0.01)*40 + Math.sin(x*0.037)*20 + Math.sin(x*0.07)*10;
        h[x]=Math.max(80,Math.min(H-20,base));
      }
      // flatten spawns
      return h;
    }

    function newState(nPlayers){
      const terrain=genTerrain();
      const worms=[];
      const perTeam=2;
      for(let t=0;t<nPlayers;t++){
        for(let i=0;i<perTeam;i++){
          const x=Math.floor(W/(nPlayers+1)*(t+1) + (i-0.5)*30);
          const y=terrain[x]-10;
          worms.push({id:t*10+i, team:t, x, y, hp:100, alive:true, dir:1, moved:0});
        }
      }
      return {version:1, players:nPlayers, perTeam, terrain, worms, current:0, wind:(Math.random()*6-3), log:['Bitwa rozpoczęta!']};
    }

    function aliveWorms(){ return state.worms.filter(w=>w.alive); }
    function currentWorm(){ return state.worms[state.current]; }

    function terrainY(x){ if(x<0||x>=W) return H; return state.terrain[Math.round(Math.max(0,Math.min(W-1,x)))]; }

    function applyGravity(w){
      const gy=terrainY(w.x);
      if(w.y < gy-1){ w.y+=2; if(w.y>gy-1) w.y=gy-1; }
      else if(w.y > gy-1){ w.y=gy-1; }
    }

    function log(msg){ state.log.push(msg); if(state.log.length>40) state.log.shift(); }

    function nextTurn(){
      // advance to next alive worm
      let tries=0;
      do {
        state.current=(state.current+1)%state.worms.length;
        tries++;
      } while(!state.worms[state.current].alive && tries<state.worms.length);
      state.wind += (Math.random()*2-1); state.wind=Math.max(-5,Math.min(5,state.wind));
      // reset moved
      const w=state.worms[state.current]; w.moved=0;
      log(`Tura: Gracz ${w.team+1} / robak ${w.id%10+1}. Wiatr: ${state.wind.toFixed(1)}`);
      render();
    }

    function explode(cx,cy,radius,damage){
      // crater
      for(let x=Math.max(0,Math.floor(cx-radius)); x<=Math.min(W-1,Math.ceil(cx+radius)); x++){
        const dx=x-cx;
        const dyMax=Math.sqrt(Math.max(0,radius*radius-dx*dx));
        state.terrain[x]=Math.min(H, state.terrain[x]+dyMax*0.6);
      }
      // damage worms
      state.worms.forEach(w=>{
        if(!w.alive) return;
        const d=Math.hypot(w.x-cx, w.y-cy);
        if(d<=radius){
          const dmg=Math.round(damage*(1-d/radius));
          w.hp-=dmg;
          // knockback
          const ang=Math.atan2(w.y-cy, w.x-cx);
          w.x += Math.cos(ang)*dmg*0.3;
          w.y -= Math.abs(Math.sin(ang))*dmg*0.3;
          applyGravity(w);
          log(`Gracz ${w.team+1} otrzymuje ${dmg} obrażeń.`);
          if(w.hp<=0){ w.alive=false; log(`Robak gracza ${w.team+1} zginął.`); }
        }
      });
    }

    function fireWeapon(){
      if(animating) return;
      const w=currentWorm();
      if(!w.alive) return;
      const weapon=document.getElementById('wWeapon').value;
      const angle=parseFloat(document.getElementById('wAngle').value);
      const power=parseFloat(document.getElementById('wPower').value);
      const rad=angle*Math.PI/180;
      const dir=w.dir;
      if(weapon==='airstrike'){
        // click on canvas to target? Instead use worm x + 50
        const tx=w.x + dir*80;
        animating=true;
        let t=0;
        const bombs=[];
        for(let i=0;i<3;i++) bombs.push({x:tx+(i-1)*15, y:0, vy:0, done:false, delay:i*200});
        const start=performance.now();
        function step(now){
          ctx.clearRect(0,0,W,H);
          drawScene();
          let allDone=true;
          bombs.forEach(b=>{
            if(now-start < b.delay) { allDone=false; return; }
            if(!b.done){
              b.vy+=0.5; b.y+=b.vy;
              if(b.y>=terrainY(b.x)-2){ b.done=true; explode(b.x,b.y,22,35); }
              else { allDone=false; }
            }
            if(!b.done){ ctx.fillStyle='#ff0'; ctx.fillRect(b.x-2,b.y-2,4,4); allDone=false; }
          });
          if(!allDone) requestAnimationFrame(step);
          else { animating=false; endTurnAfterShot(); }
        }
        requestAnimationFrame(step);
        return;
      }
      // projectile weapons
      const speed=power*0.12;
      const vx=Math.cos(rad)*speed*dir + (weapon==='shotgun'?0:0);
      const vy=-Math.sin(rad)*speed;
      if(weapon==='shotgun'){
        // 3 pellets
        animating=true;
        const pellets=[-0.15,0,0.15].map(a=>({x:w.x,y:w.y-8,vx:Math.cos(rad+a)*speed*dir,vy:-Math.sin(rad+a)*speed,alive:true}));
        const start=performance.now();
        function step(now){
          ctx.clearRect(0,0,W,H);
          drawScene();
          let anyAlive=false;
          pellets.forEach(p=>{
            if(!p.alive) return;
            p.vy+=0.25; p.vx+=state.wind*0.02;
            p.x+=p.vx; p.y+=p.vy;
            if(p.x<0||p.x>=W||p.y>=H){ p.alive=false; return; }
            const gy=terrainY(p.x);
            if(p.y>=gy){ p.alive=false; explode(p.x,p.y,12,18); return; }
            // worm hit
            const hit=state.worms.find(ww=>ww.alive && Math.hypot(ww.x-p.x,ww.y-p.y)<8);
            if(hit){ p.alive=false; explode(p.x,p.y,12,18); return; }
            ctx.fillStyle='#ff0'; ctx.fillRect(p.x-2,p.y-2,4,4);
            anyAlive=true;
          });
          if(anyAlive) requestAnimationFrame(step);
          else { animating=false; endTurnAfterShot(); }
        }
        requestAnimationFrame(step);
        return;
      }
      // bazooka / grenade
      animating=true;
      const proj={x:w.x, y:w.y-8, vx:vx*dir, vy:vy, weapon, timer: weapon==='grenade'?150:0, alive:true};
      const start=performance.now();
      function step(now){
        ctx.clearRect(0,0,W,H);
        drawScene();
        if(proj.alive){
          proj.vy+=0.25; proj.vx+=state.wind*0.02;
          proj.x+=proj.vx; proj.y+=proj.vy;
          if(weapon==='grenade') proj.timer--;
          let explodeNow=false;
          if(proj.x<0||proj.x>=W||proj.y>=H) explodeNow=true;
          else {
            const gy=terrainY(proj.x);
            if(proj.y>=gy) explodeNow=true;
            const hit=state.worms.find(ww=>ww.alive && Math.hypot(ww.x-proj.x,ww.y-proj.y)<8);
            if(hit) explodeNow=true;
          }
          if(weapon==='grenade' && proj.timer<=0) explodeNow=true;
          if(explodeNow){
            proj.alive=false;
            explode(proj.x,proj.y, weapon==='grenade'?28:24, weapon==='grenade'?40:35);
          } else {
            ctx.fillStyle='#ff0'; ctx.fillRect(proj.x-2,proj.y-2,4,4);
          }
        }
        if(proj.alive) requestAnimationFrame(step);
        else { animating=false; endTurnAfterShot(); }
      }
      requestAnimationFrame(step);
    }

    function endTurnAfterShot(){
      // check victory
      const teamsAlive=new Set(state.worms.filter(w=>w.alive).map(w=>w.team));
      if(teamsAlive.size<=1){
        const winner=[...teamsAlive][0];
        log(`Wygrał gracz ${winner+1}!`);
        render(); return;
      }
      setTimeout(()=>nextTurn(), 600);
    }

    function drawScene(){
      // sky
      const grad=ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,'#1a2a4a'); grad.addColorStop(1,'#0b1220');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      // terrain
      ctx.fillStyle='#3a5a2a';
      ctx.beginPath();
      ctx.moveTo(0,H);
      for(let x=0;x<W;x++) ctx.lineTo(x, state.terrain[x]);
      ctx.lineTo(W,H);
      ctx.closePath();
      ctx.fill();
      // worms
      state.worms.forEach(w=>{
        if(!w.alive) return;
        ctx.fillStyle=COLORS[w.team];
        ctx.beginPath(); ctx.arc(w.x,w.y-4,6,0,Math.PI*2); ctx.fill();
        // hp bar
        ctx.fillStyle='#000'; ctx.fillRect(w.x-10,w.y-16,20,3);
        ctx.fillStyle='#4caf50'; ctx.fillRect(w.x-10,w.y-16,20*(w.hp/100),3);
      });
      // active worm marker
      const w=currentWorm();
      if(w && w.alive){
        ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.arc(w.x,w.y-4,10,0,Math.PI*2); ctx.stroke();
        // aim line
        const ang=aimAngle*Math.PI/180;
        ctx.strokeStyle='rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(w.x,w.y-8);
        ctx.lineTo(w.x+Math.cos(ang)*aimPower*0.5*w.dir, w.y-8-Math.sin(ang)*aimPower*0.5);
        ctx.stroke();
      }
      // wind
      ctx.fillStyle='#fff'; ctx.font='12px sans-serif';
      ctx.fillText('Wiatr: '+state.wind.toFixed(1), 10, 16);
    }

    function render(){ drawScene(); updateInfo(); }

    function updateInfo(){
      const w=currentWorm();
      document.getElementById('wStatus').textContent = w && w.alive ? `Gracz ${w.team+1} | Robak ${w.id%10+1} | HP ${w.hp}` : 'Koniec';
      document.getElementById('wInfo').innerHTML = state.worms.map(ww=>`<div style="color:${COLORS[ww.team]}">G${ww.team+1}#${ww.id%10+1} HP:${ww.hp}${ww.alive?'':' 💀'}</div>`).join('');
      const log=document.getElementById('wLog'); log.innerHTML=state.log.slice(-15).map(l=>'<div>'+l+'</div>').join(''); log.scrollTop=log.scrollHeight;
    }

    // controls
    document.getElementById('wLeft').addEventListener('click',()=>{ const w=currentWorm(); if(!w||!w.alive||animating) return; w.x=Math.max(0,w.x-5); w.dir=-1; w.moved+=5; applyGravity(w); render(); });
    document.getElementById('wRight').addEventListener('click',()=>{ const w=currentWorm(); if(!w||!w.alive||animating) return; w.x=Math.min(W-1,w.x+5); w.dir=1; w.moved+=5; applyGravity(w); render(); });
    const angSl=document.getElementById('wAngle'); const powSl=document.getElementById('wPower');
    angSl.addEventListener('input',()=>{ aimAngle=parseFloat(angSl.value); document.getElementById('wAngleV').textContent=aimAngle; render(); });
    powSl.addEventListener('input',()=>{ aimPower=parseFloat(powSl.value); document.getElementById('wPowerV').textContent=aimPower; render(); });
    document.getElementById('wFire').addEventListener('click',()=>{ if(!animating) fireWeapon(); });
    document.getElementById('wEndTurn').addEventListener('click',()=>{ if(!animating) nextTurn(); });

    document.getElementById('wNew').addEventListener('click',()=>{
      const n=parseInt(document.getElementById('wPlayers').value);
      state=newState(n); animating=false; currentProj=null;
      aimAngle=45; aimPower=60;
      document.getElementById('wAngle').value=45; document.getElementById('wPower').value=60;
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
      try { state=JSON.parse(decodeURIComponent(escape(atob(v.trim())))); animating=false; render(); }
      catch(e){ alert('Błędny kod stanu'); }
    });

    // init
    state=newState(4);
    render();
  }
};
