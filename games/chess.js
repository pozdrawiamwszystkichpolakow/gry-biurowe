window.ChessGame = {
  name: 'Szachy',
  desc: 'Szachy z trybem multiplayer (hot-seat, vs komputer, online P2P).',
  init: function(container){
    const root = container;
    root.innerHTML = `
    <style>
      .chess-app { display:flex; flex-wrap:wrap; gap:16px; }
      .board { display:grid; grid-template-columns:repeat(8,1fr); grid-template-rows:repeat(8,1fr); width:min(88vw,560px); height:min(88vw,560px); border:2px solid #444; user-select:none; }
      .sq { position:relative; display:flex; align-items:center; justify-content:center; font-size:clamp(28px,6vw,46px); cursor:pointer; }
      .sq.light { background:#f0d9b5; color:#1a1a1a; }
      .sq.dark { background:#b58863; color:#1a1a1a; }
      .sq.selected { background:#f6f669 !important; }
      .sq.last { box-shadow:inset 0 0 0 3px #e8e08a; }
      .sq .dot { position:absolute; width:28%; height:28%; border-radius:50%; background:rgba(0,0,0,0.25); pointer-events:none; }
      .sq .ring { position:absolute; width:80%; height:80%; border-radius:50%; border:4px solid rgba(0,0,0,0.25); pointer-events:none; }
      .coord { position:absolute; font-size:10px; color:#333; pointer-events:none; }
      .coord.file { bottom:2px; right:4px; }
      .coord.rank { top:2px; left:4px; }
      .panel { background:#2a2a3c; border-radius:12px; padding:14px; min-width:280px; flex:1; color:#e6e6e6; }
      .panel h2 { margin:0 0 8px; font-size:18px; }
      .row { display:flex; gap:8px; flex-wrap:wrap; margin:6px 0; align-items:center; }
      button { background:#4f8cff; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; font-size:14px; }
      button.secondary { background:#444; }
      button.danger { background:#c44; }
      select, textarea, input { background:#333; color:#fff; border:1px solid #555; border-radius:6px; padding:6px; }
      textarea { width:100%; height:80px; font-family:monospace; font-size:12px; }
      .status { font-size:16px; font-weight:600; margin:8px 0; }
      .history { height:200px; overflow:auto; background:#181824; border-radius:8px; padding:8px; font-family:ui-monospace,monospace; font-size:13px; }
      .history div { padding:2px 0; }
      .captured { font-size:22px; line-height:1.4; min-height:28px; }
      .modal { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:none; align-items:center; justify-content:center; z-index:10; }
      .modal.show { display:flex; }
      .modal-box { background:#2a2a3c; padding:20px; border-radius:12px; text-align:center; color:#fff; }
      .modal-box button { margin:4px; font-size:24px; padding:10px 14px; }
      .mpbox { background:#181824; border-radius:8px; padding:10px; margin-top:8px; }
      .muted { color:#9aa0a6; font-size:12px; }
    </style>
    <div class="chess-app">
      <div><div class="board" id="board"></div></div>
      <div class="panel">
        <h2>Szachy</h2>
        <div class="status" id="status">Białe na ruchu</div>
        <div class="row">
          <label>Tryb:</label>
          <select id="mode">
            <option value="pvp">Dwóch graczy (hot-seat)</option>
            <option value="ai">Gra z komputerem</option>
            <option value="online">Multiplayer online (P2P)</option>
            <option value="server">Multiplayer przez serwer (LAN/internet)</option>
          </select>
        </div>
        <div class="row" id="aiOpts">
          <label>Komputer gra:</label>
          <select id="aiColor"><option value="b">czarnymi</option><option value="w">białymi</option></select>
          <label>Poziom:</label>
          <select id="depth"><option value="2">łatwy</option><option value="3" selected>średni</option><option value="4">trudny</option></select>
        </div>
        <div id="onlineOpts" style="display:none;">
          <div class="mpbox">
            <div class="row"><button id="hostBtn">Utwórz grę (host)</button><button class="secondary" id="joinBtn">Dołącz (gość)</button></div>
            <div id="hostPanel" style="display:none;">
              <p class="muted">1. Skopiuj ofertę i wyślij przeciwnikowi:</p>
              <textarea id="offerOut" readonly></textarea>
              <button id="copyOffer">Kopiuj ofertę</button>
              <p class="muted">2. Wklej odpowiedź przeciwnika:</p>
              <textarea id="answerIn"></textarea>
              <button id="applyAnswer">Połącz</button>
            </div>
            <div id="joinPanel" style="display:none;">
              <p class="muted">1. Wklej ofertę hosta:</p>
              <textarea id="offerIn"></textarea>
              <button id="createAnswer">Utwórz odpowiedź</button>
              <p class="muted">2. Skopiuj odpowiedź i odeślij hostowi:</p>
              <textarea id="answerOut" readonly></textarea>
              <button id="copyAnswer">Kopiuj odpowiedź</button>
            </div>
            <div id="connStatus" class="muted">Nie połączono.</div>
          </div>
        </div>
        <div id="serverOpts" style="display:none;">
          <div class="mpbox">
            <p class="muted">Serwer (uruchom relay.py na jednym komputerze). Adres np. http://192.168.1.10:8766</p>
            <div class="row"><input id="serverUrl" placeholder="http://IP:8766" style="flex:1;min-width:160px;"><input id="roomCode" placeholder="kod pokoju" style="width:120px;"></div>
            <div class="row"><button id="connectServer">Połącz</button><button class="secondary" id="disconnectServer">Rozłącz</button></div>
            <div id="serverStatus" class="muted">Nie połączono.</div>
          </div>
        </div>
        <div class="row">
          <button id="newGame">Nowa gra</button>
          <button class="secondary" id="undo">Cofnij</button>
          <button class="secondary" id="flip">Obróć</button>
        </div>
        <div><b>Białe zbite:</b><div class="captured" id="capW"></div></div>
        <div><b>Czarne zbite:</b><div class="captured" id="capB"></div></div>
        <div class="history" id="history"></div>
      </div>
    </div>
    <div class="modal" id="promoModal"><div class="modal-box"><div>Wybierz figurę:</div>
      <button data-p="Q">♕</button><button data-p="R">♖</button><button data-p="B">♗</button><button data-p="N">♘</button></div></div>
    `;

    // ---------- engine ----------
    function sym(p){ if(!p) return ''; const w={P:'♙',N:'♘',B:'♗',R:'♖',Q:'♕',K:'♔'}; const b={P:'♟',N:'♞',B:'♝',R:'♜',Q:'♛',K:'♚'}; return (p.color==='w'?w:b)[p.type]; }
    let board, turn, castling, enPassant, history, selected, legalMoves, gameOver, flipped, captured;
    let mode='pvp', aiColor='b', depth=3;
    let online=false, myColor='w', pc=null, dc=null, connected=false;
    let serverMode=false, serverUrl='', roomCode='', clientId=Math.random().toString(36).slice(2), pollTimer=null, lastSeq=0, serverConnected=false;

    function initGame(){
      board = [
        [{color:'b',type:'R'},{color:'b',type:'N'},{color:'b',type:'B'},{color:'b',type:'Q'},{color:'b',type:'K'},{color:'b',type:'B'},{color:'b',type:'N'},{color:'b',type:'R'}],
        Array(8).fill(null).map(()=>({color:'b',type:'P'})),
        Array(8).fill(null),Array(8).fill(null),Array(8).fill(null),Array(8).fill(null),
        Array(8).fill(null).map(()=>({color:'w',type:'P'})),
        [{color:'w',type:'R'},{color:'w',type:'N'},{color:'w',type:'B'},{color:'w',type:'Q'},{color:'w',type:'K'},{color:'w',type:'B'},{color:'w',type:'N'},{color:'w',type:'R'}],
      ];
      turn='w'; castling={K:true,Q:true,k:true,q:true}; enPassant=null;
      history=[]; selected=null; legalMoves=[]; gameOver=false; captured={w:[],b:[]};
      statusText='Białe na ruchu';
      render();
    }
    function cloneBoard(b){ return b.map(row=>row.map(c=>c?{color:c.color,type:c.type}:null)); }
    function cloneState(){ return {board:cloneBoard(board), turn, castling:{...castling}, enPassant:enPassant?{...enPassant}:null, captured:{w:[...captured.w],b:[...captured.b]}, gameOver}; }

    function inBounds(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
    function opp(c){ return c==='w'?'b':'w'; }
    function isAttacked(b, r, c, byColor){
      // pawn
      for(const dc of [-1,1]){
        const pr = r + (byColor==='w'?1:-1);
        const pc = c + dc;
        if(inBounds(pr,pc)){ const p=b[pr][pc]; if(p&&p.color===byColor&&p.type==='P') return true; }
      }
      const kn=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
      for(const [dr,dc] of kn){ const rr=r+dr, cc=c+dc; if(inBounds(rr,cc)){const p=b[rr][cc]; if(p&&p.color===byColor&&p.type==='N') return true;} }
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0&&dc===0) continue; const rr=r+dr,cc=c+dc; if(inBounds(rr,cc)){const p=b[rr][cc]; if(p&&p.color===byColor&&p.type==='K') return true;} }
      const lines=[[[1,0],[-1,0],[0,1],[0,-1]],[[1,1],[1,-1],[-1,1],[-1,-1]]];
      const types1=['R','Q']; const types2=['B','Q'];
      for(let i=0;i<lines.length;i++){
        for(const [dr,dc] of lines[i]){
          let rr=r+dr, cc=c+dc;
          while(inBounds(rr,cc)){
            const p=b[rr][cc];
            if(p){
              if(p.color===byColor && ((i===0&&types1.includes(p.type))||(i===1&&types2.includes(p.type)))) return true;
              break;
            }
            rr+=dr; cc+=dc;
          }
        }
      }
      return false;
    }
    function findKing(b,color){ for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]&&b[r][c].color===color&&b[r][c].type==='K') return {r,c}; return null; }
    function inCheck(b,color){ const k=findKing(b,color); if(!k) return false; return isAttacked(b,k.r,k.c,opp(color)); }

    function pseudoMoves(b, r, c, cast, ep){
      const p=b[r][c]; if(!p) return [];
      const moves=[]; const color=p.color; const t=p.type;
      if(t==='P'){
        const dir = color==='w'?-1:1;
        const start = color==='w'?6:1;
        const promRank = color==='w'?0:7;
        if(inBounds(r+dir,c) && !b[r+dir][c]){
          if(r+dir===promRank) for(const pr of ['Q','R','B','N']) moves.push({from:{r,c},to:{r:r+dir,c},promotion:pr});
          else moves.push({from:{r,c},to:{r:r+dir,c}});
          if(r===start && !b[r+2*dir][c]) moves.push({from:{r,c},to:{r:r+2*dir,c},double:true});
        }
        for(const dc of [-1,1]){
          const rr=r+dir, cc=c+dc;
          if(!inBounds(rr,cc)) continue;
          const target=b[rr][cc];
          if(target && target.color!==color){
            if(rr===promRank) for(const pr of ['Q','R','B','N']) moves.push({from:{r,c},to:{r:rr,c:cc},capture:target,promotion:pr});
            else moves.push({from:{r,c},to:{r:rr,c:cc},capture:target});
          }
          if(ep && ep.r===rr && ep.c===cc){ moves.push({from:{r,c},to:{r:rr,c:cc},enPassant:true}); }
        }
      } else if(t==='N'){
        for(const [dr,dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]){
          const rr=r+dr,cc=c+dc; if(!inBounds(rr,cc)) continue; const t2=b[rr][cc]; if(!t2||t2.color!==color) moves.push({from:{r,c},to:{r:rr,c:cc},capture:t2||null});
        }
      } else if(t==='K'){
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(dr===0&&dc===0) continue; const rr=r+dr,cc=c+dc; if(!inBounds(rr,cc)) continue; const t2=b[rr][cc]; if(!t2||t2.color!==color) moves.push({from:{r,c},to:{r:rr,c:cc},capture:t2||null}); }
        const backRank = color==='w'?7:0;
        if(r===backRank && c===4){
          const ks = color==='w'?'K':'k'; const qs = color==='w'?'Q':'q';
          if(cast[ks] && !b[backRank][5] && !b[backRank][6] && b[backRank][7] && b[backRank][7].type==='R' && b[backRank][7].color===color){
            if(!isAttacked(b,backRank,4,opp(color)) && !isAttacked(b,backRank,5,opp(color)) && !isAttacked(b,backRank,6,opp(color)))
              moves.push({from:{r,c},to:{r:backRank,c:6},castle:'K'});
          }
          if(cast[qs] && !b[backRank][3] && !b[backRank][2] && !b[backRank][1] && b[backRank][0] && b[backRank][0].type==='R' && b[backRank][0].color===color){
            if(!isAttacked(b,backRank,4,opp(color)) && !isAttacked(b,backRank,3,opp(color)) && !isAttacked(b,backRank,2,opp(color)))
              moves.push({from:{r,c},to:{r:backRank,c:2},castle:'Q'});
          }
        }
      } else {
        const dirs = t==='R'?[[1,0],[-1,0],[0,1],[0,-1]]: t==='B'?[[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        for(const [dr,dc] of dirs){
          let rr=r+dr, cc=c+dc;
          while(inBounds(rr,cc)){
            const t2=b[rr][cc];
            if(!t2){ moves.push({from:{r,c},to:{r:rr,c:cc}}); }
            else { if(t2.color!==color) moves.push({from:{r,c},to:{r:rr,c:cc},capture:t2}); break; }
            rr+=dr; cc+=dc;
          }
        }
      }
      return moves;
    }

    function applyMove(b, move, color, cast, ep){
      const nb = cloneBoard(b);
      const from=move.from, to=move.to;
      const p = nb[from.r][from.c];
      let capturedPiece = move.capture || null;
      let newCast = {...cast};
      let newEp = null;
      if(move.enPassant){
        capturedPiece = nb[from.r][to.c];
        nb[from.r][to.c]=null;
      }
      if(move.castle){
        const backRank = color==='w'?7:0;
        if(move.castle==='K'){ nb[backRank][5]=nb[backRank][7]; nb[backRank][7]=null; }
        else { nb[backRank][3]=nb[backRank][0]; nb[backRank][0]=null; }
      }
      nb[to.r][to.c] = move.promotion ? {color, type:move.promotion} : p;
      nb[from.r][from.c]=null;
      if(move.double){ newEp = {r: (from.r+to.r)/2, c: from.c}; }
      const backRank = color==='w'?7:0;
      if(p.type==='K'){
        if(color==='w'){ newCast.K=false; newCast.Q=false; } else { newCast.k=false; newCast.q=false; }
      }
      if(p.type==='R'){
        if(from.r===backRank && from.c===7){ if(color==='w') newCast.K=false; else newCast.k=false; }
        if(from.r===backRank && from.c===0){ if(color==='w') newCast.Q=false; else newCast.q=false; }
      }
      if(to.r===0 && to.c===7) newCast.k=false;
      if(to.r===0 && to.c===0) newCast.q=false;
      if(to.r===7 && to.c===7) newCast.K=false;
      if(to.r===7 && to.c===0) newCast.Q=false;
      return {board:nb, castling:newCast, ep:newEp, captured:capturedPiece};
    }

    function legalMovesFor(b,color,cast,ep){
      const moves=[];
      for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const p=b[r][c]; if(!p||p.color!==color) continue;
        for(const m of pseudoMoves(b,r,c,cast,ep)){
          const res=applyMove(b,m,color,cast,ep);
          if(!inCheck(res.board,color)) moves.push(m);
        }
      }
      return moves;
    }

    let statusText='Białe na ruchu';

    function makeMove(move, promotionChoice, remote=false){
      if(gameOver) return;
      const mv = {...move};
      if(mv.promotion && promotionChoice) mv.promotion=promotionChoice;
      if(mv.promotion && !promotionChoice) mv.promotion='Q';
      const res = applyMove(board, mv, turn, castling, enPassant);
      history.push({state:cloneState(), move:mv});
      if(res.captured){ captured[res.captured.color].push(res.captured.type); }
      board=res.board; castling=res.castling; enPassant=res.ep;
      turn = opp(turn);
      const lm = legalMovesFor(board, turn, castling, enPassant);
      if(lm.length===0){
        if(inCheck(board,turn)){ gameOver=true; statusText = (opp(turn)==='w'?'Białe':'Czarne')+' wygrywają (mat)!'; }
        else { gameOver=true; statusText='Pat — remis.'; }
      } else if(inCheck(board,turn)){ statusText=(turn==='w'?'Białe':'Czarne')+' na ruchu — szach!'; }
      else { statusText=(turn==='w'?'Białe':'Czarne')+' na ruchu'; }
      selected=null; legalMoves=[];
      render();
      if(!remote && online && connected && dc && dc.readyState==='open'){
        dc.send(JSON.stringify({type:'move', move:mv}));
      }
      if(!remote && serverMode && serverConnected){
        serverSend({type:'move', move:mv, from:clientId});
      }
      if(!remote && !online && !serverMode && mode==='ai' && turn===aiColor && !gameOver){
        setTimeout(aiMove, 250);
      }
    }

    function render(){
      const boardEl = document.getElementById('board');
      boardEl.innerHTML='';
      const lastMove = history.length? history[history.length-1].move : null;
      for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
          const rr = flipped ? 7-r : r;
          const cc = flipped ? 7-c : c;
          const sq = document.createElement('div');
          const isLight = (rr+cc)%2===0;
          sq.className = 'sq ' + (isLight?'light':'dark');
          if(selected && selected.r===rr && selected.c===cc) sq.classList.add('selected');
          if(lastMove && ((lastMove.from.r===rr&&lastMove.from.c===cc)||(lastMove.to.r===rr&&lastMove.to.c===cc))) sq.classList.add('last');
          const isLegal = legalMoves.some(m=>m.to.r===rr && m.to.c===cc);
          const p = board[rr][cc];
          if(isLegal){
            if(p){ const ring=document.createElement('div'); ring.className='ring'; sq.appendChild(ring);}
            else { const dot=document.createElement('div'); dot.className='dot'; sq.appendChild(dot);}
          }
          if(p){ const span=document.createElement('span'); span.textContent = sym(p); sq.appendChild(span); }
          if(c===0){ const coord=document.createElement('div'); coord.className='coord rank'; coord.textContent = 8-rr; sq.appendChild(coord);}
          if(r===7){ const coord=document.createElement('div'); coord.className='coord file'; coord.textContent = String.fromCharCode(97+cc); sq.appendChild(coord);}
          sq.addEventListener('click', ()=>onSquareClick(rr,cc));
          boardEl.appendChild(sq);
        }
      }
      document.getElementById('capW').textContent = captured.w.map(t=>sym({color:'w',type:t})).join(' ');
      document.getElementById('capB').textContent = captured.b.map(t=>sym({color:'b',type:t})).join(' ');
      const h=document.getElementById('history'); h.innerHTML='';
      for(let i=0;i<history.length;i++){
        const mv=history[i].move;
        const from=String.fromCharCode(97+mv.from.c)+(8-mv.from.r);
        const to=String.fromCharCode(97+mv.to.c)+(8-mv.to.r);
        const promo = mv.promotion?('=' + mv.promotion):'';
        const div=document.createElement('div');
        div.textContent = (i%2===0? (Math.floor(i/2)+1)+'. ' : '') + from+'-'+to+promo;
        h.appendChild(div);
      }
      h.scrollTop=h.scrollHeight;
      document.getElementById('status').textContent = statusText;
    }

    function onSquareClick(r,c){
      if(gameOver) return;
      if(online && turn !== myColor) return;
      if(serverMode && turn !== myColor) return;
      if(mode==='ai' && !online && !serverMode && turn===aiColor) return;
      const p = board[r][c];
      if(selected){
        const mv = legalMoves.find(m=>m.to.r===r && m.to.c===c);
        if(mv){
          if(mv.promotion){ showPromo(mv); return; }
          makeMove(mv);
          return;
        }
      }
      if(p && p.color===turn){
        selected={r,c};
        legalMoves = legalMovesFor(board,turn,castling,enPassant).filter(m=>m.from.r===r && m.from.c===c);
        render();
      } else {
        selected=null; legalMoves=[];
        render();
      }
    }

    function showPromo(mv){
      const modal=document.getElementById('promoModal');
      modal.classList.add('show');
      const handler = (e)=>{
        if(e.target.dataset && e.target.dataset.p){
          modal.classList.remove('show');
          mv.promotion=e.target.dataset.p;
          makeMove(mv, e.target.dataset.p);
          modal.removeEventListener('click',handler);
        }
      };
      modal.addEventListener('click',handler);
    }

    // AI
    const PST = {
      P:[[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
      N:[[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
      B:[[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
      R:[[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
      Q:[[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
      K:[[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
    };
    const VAL={P:100,N:320,B:330,R:500,Q:900,K:20000};
    function evaluate(b){
      let score=0;
      for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const p=b[r][c]; if(!p) continue;
        const v = VAL[p.type] + (PST[p.type]? (p.color==='w'? PST[p.type][r][c] : PST[p.type][7-r][c]) : 0);
        score += p.color==='w'? v : -v;
      }
      return score;
    }
    function minimax(b, color, cast, ep, depth, alpha, beta, maximizing){
      const lm = legalMovesFor(b, color, cast, ep);
      if(depth===0 || lm.length===0){
        if(lm.length===0){
          if(inCheck(b,color)) return maximizing? -100000+ (10-depth) : 100000 - (10-depth);
          return 0;
        }
        return evaluate(b);
      }
      lm.sort((a,bm)=> (bm.capture?1:0)-(a.capture?1:0));
      if(maximizing){
        let best=-Infinity;
        for(const m of lm){
          const res=applyMove(b,m,color,cast,ep);
          const s = minimax(res.board, opp(color), res.castling, res.ep, depth-1, alpha, beta, false);
          if(s>best) best=s;
          alpha=Math.max(alpha,best);
          if(beta<=alpha) break;
        }
        return best;
      } else {
        let best=Infinity;
        for(const m of lm){
          const res=applyMove(b,m,color,cast,ep);
          const s = minimax(res.board, opp(color), res.castling, res.ep, depth-1, alpha, beta, true);
          if(s<best) best=s;
          beta=Math.min(beta,best);
          if(beta<=alpha) break;
        }
        return best;
      }
    }
    function aiMove(){
      if(gameOver) return;
      const maximizing = (aiColor==='w');
      const lm = legalMovesFor(board, aiColor, castling, enPassant);
      if(lm.length===0) return;
      let bestMove=lm[0]; let bestVal = maximizing? -Infinity: Infinity;
      lm.sort(()=>Math.random()-0.5);
      for(const m of lm){
        const res=applyMove(board,m,aiColor,castling,enPassant);
        const val = minimax(res.board, opp(aiColor), res.castling, res.ep, depth-1, -Infinity, Infinity, !maximizing);
        if(maximizing){ if(val>bestVal){bestVal=val;bestMove=m;} }
        else { if(val<bestVal){bestVal=val;bestMove=m;} }
      }
      if(bestMove.promotion) bestMove.promotion='Q';
      makeMove(bestMove);
    }

    // WebRTC signaling helpers
    function makePC(){
      const p = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
      p.onicecandidate = (e)=>{};
      p.onicegatheringstatechange = ()=>{};
      return p;
    }
    function waitIceComplete(p){
      return new Promise(resolve=>{
        if(p.iceGatheringState==='complete') { resolve(); return; }
        const check = ()=>{
          if(p.iceGatheringState==='complete'){ p.removeEventListener('icegatheringstatechange', check); resolve(); }
        };
        p.addEventListener('icegatheringstatechange', check);
        // fallback timeout
        setTimeout(()=>{ p.removeEventListener('icegatheringstatechange', check); resolve(); }, 4000);
      });
    }

    // UI wiring
    const $ = (id)=>document.getElementById(id);
    $('mode').addEventListener('change', (e)=>{
      mode=e.target.value;
      $('aiOpts').style.display = mode==='ai'?'flex':'none';
      $('onlineOpts').style.display = mode==='online'?'block':'none';
      $('serverOpts').style.display = mode==='server'?'block':'none';
      if(mode!=='online'){ online=false; }
      if(mode!=='server'){ serverMode=false; stopPolling(); }
    });
    $('aiColor').addEventListener('change', (e)=>{ aiColor=e.target.value; });
    $('depth').addEventListener('change', (e)=>{ depth=parseInt(e.target.value); });

    $('newGame').addEventListener('click', ()=>{ initGame(); });
    $('undo').addEventListener('click', ()=>{
      if(online) return;
      if(history.length===0) return;
      const last = history.pop();
      const st=last.state;
      board=cloneBoard(st.board); turn=st.turn; castling={...st.castling}; enPassant=st.enPassant?{...st.enPassant}:null; captured={w:[...st.captured.w],b:[...st.captured.b]}; gameOver=st.gameOver;
      selected=null; legalMoves=[]; statusText=(turn==='w'?'Białe':'Czarne')+' na ruchu';
      render();
    });
    $('flip').addEventListener('click', ()=>{ flipped=!flipped; render(); });

    // Online handlers
    $('hostBtn').addEventListener('click', async ()=>{
      online=true; myColor='w';
      pc = makePC();
      dc = pc.createDataChannel('game');
      dc.onopen = ()=>{ connected=true; $('connStatus').textContent='Połączono! Grasz białymi.'; initGame(); };
      dc.onmessage = (ev)=>{ const msg=JSON.parse(ev.data); if(msg.type==='move'){ makeMove(msg.move, msg.move.promotion, true); } };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIceComplete(pc);
      $('offerOut').value = JSON.stringify(pc.localDescription);
      $('hostPanel').style.display='block';
      $('joinPanel').style.display='none';
      $('connStatus').textContent='Oczekiwanie na odpowiedź...';
    });
    $('copyOffer').addEventListener('click', ()=>{ navigator.clipboard.writeText($('offerOut').value); });
    $('applyAnswer').addEventListener('click', async ()=>{
      const ans = JSON.parse($('answerIn').value);
      await pc.setRemoteDescription(ans);
    });

    $('joinBtn').addEventListener('click', ()=>{
      online=true; myColor='b';
      pc = makePC();
      pc.ondatachannel = (e)=>{
        dc = e.channel;
        dc.onopen = ()=>{ connected=true; $('connStatus').textContent='Połączono! Grasz czarnymi.'; initGame(); };
        dc.onmessage = (ev)=>{ const msg=JSON.parse(ev.data); if(msg.type==='move'){ makeMove(msg.move, msg.move.promotion, true); } };
      };
      $('joinPanel').style.display='block';
      $('hostPanel').style.display='none';
    });
    $('createAnswer').addEventListener('click', async ()=>{
      const offer = JSON.parse($('offerIn').value);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIceComplete(pc);
      $('answerOut').value = JSON.stringify(pc.localDescription);
      $('connStatus').textContent='Wyślij odpowiedź hostowi.';
    });
    $('copyAnswer').addEventListener('click', ()=>{ navigator.clipboard.writeText($('answerOut').value); });

    // Server mode helpers
    function serverBase(){ return $('serverUrl').value.trim().replace(/\/$/,''); }
    function serverSend(msg){
      const url = serverBase() + '/send?room=' + encodeURIComponent(roomCode);
      fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(msg)}).catch(e=>console.error(e));
    }
    function stopPolling(){ if(pollTimer){ clearInterval(pollTimer); pollTimer=null; } }
    function startPolling(){
      stopPolling();
      pollTimer = setInterval(async ()=>{
        try {
          const url = serverBase() + '/poll?room=' + encodeURIComponent(roomCode) + '&since=' + lastSeq;
          const res = await fetch(url);
          if(!res.ok) return;
          const data = await res.json();
          for(const m of data.messages){
            lastSeq = Math.max(lastSeq, m.seq);
            const msg = m.msg;
            if(msg.type==='role' && msg.clientId===clientId){
              myColor = msg.color;
              $('serverStatus').textContent = 'Połączono. Grasz ' + (myColor==='w'?'białymi':'czarnymi') + '.';
              if(history.length===0) initGame();
            }
            if(msg.type==='move' && msg.from !== clientId){
              makeMove(msg.move, msg.move.promotion, true);
            }
          }
        } catch(e){ /* ignore */ }
      }, 700);
    }

    $('connectServer').addEventListener('click', async ()=>{
      serverUrl = serverBase();
      roomCode = $('roomCode').value.trim();
      if(!serverUrl || !roomCode){ $('serverStatus').textContent='Podaj adres serwera i kod pokoju.'; return; }
      serverMode=true; online=false; serverConnected=true;
      lastSeq=0;
      $('serverStatus').textContent='Łączenie...';
      serverSend({type:'join', from:clientId});
      startPolling();
    });
    $('disconnectServer').addEventListener('click', ()=>{
      serverMode=false; serverConnected=false; stopPolling();
      $('serverStatus').textContent='Rozłączono.';
    });
    flipped=false;
    initGame();
    $('aiOpts').style.display='none';
    $('onlineOpts').style.display='none';
    $('serverOpts').style.display='none';
  }
};
