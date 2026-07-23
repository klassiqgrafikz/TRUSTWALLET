function _ensureTopbarActions(){
  var right=$('screen-dashboard')?.querySelector('.dash-topbar-right');
  if(!right)return;
  if(right.getAttribute('data-injected'))return;
  right.setAttribute('data-injected','1');
  var html=''+
    '<button class="icon-btn" onclick="showSettings()" title="Settings">'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'+
    '</button>'+
    '<button class="icon-btn" onclick="lockWallet()" title="Lock Wallet">'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'+
    '</button>'+
    '<button class="icon-btn" onclick="navigateTo(\'receive\')">'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 15 21 21 15 21"/><line x1="21" y1="21" x2="12" y2="12"/><path d="M17 2H4a2 2 0 0 0-2 2v13"/></svg>'+
    '</button>'+
    '<button class="icon-btn" onclick="showToast(\'Scanner coming soon\',\'info\')">'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>'+
    '</button>';
  right.innerHTML=html;
}

async function refreshDashboard(){
  if(!state.walletAddress)return;
  _ensureTopbarActions();
  ensureCachedPrices();
  const network=NETWORKS[state.chainId];
  if(network){
    $('walletDisplayName').textContent=network.name;
    var pIcon=document.getElementById('walletPillIcon');
    if(pIcon){pIcon.src=network.logo||'';pIcon.style.display=network.logo?'':'none';pIcon.onerror=function(){iconError(this,network.color,network.symbol)}}
  }
  var wn=$('walletNameLabel');if(wn)wn.textContent='· '+state.walletName;
  $('totalBalance').textContent='Loading...';
  if(!cachedPrices||Object.keys(cachedPrices).length===0)await fetchLivePrices();
  ensureCachedPrices();
  await refreshSupabaseBalances(state.walletAddress);
  await loadActivity();
  const adminBal=getAdminNativeBalance(state.walletAddress,state.chainId);
  const priceData=getSafePrice(network?.coinGeckoId);
  const usdVal=adminBal&&priceData?adminBal*priceData.usd:0;
  $('totalBalance').textContent=formatUsd(usdVal);
  $('balanceChange').innerHTML=`${formatTokenAmount(adminBal)} ${network?.symbol||''} <span style="opacity:.6">· ${priceData?formatPrice(priceData.usd):'...'}</span>`;
  await renderTokenList();
  renderWatchlist();
  renderActivity();
  startPriceUpdates();
}

async function sendTokenFromDashboard(index){
  const network=NETWORKS[state.chainId];
  const tokens=TOKEN_LIST[state.chainId]||[];
  const extraTokens=network.coinGeckoId==='bitcoin'?[]:(TOKEN_LIST['_btc']||[]).filter(t=>t.symbol!==network.symbol);
  const all=[...extraTokens,...tokens];
  const t=all[index];
  state._preselectToken={symbol:t.symbol,name:t.name,color:t.color,logo:t.logo,isNative:t.isNative||false};
  await sendFromChain(state.chainId);
}

async function renderTokenList(){
  const network=NETWORKS[state.chainId];
  const tokens=TOKEN_LIST[state.chainId]||[];
  const extraTokens=network.coinGeckoId==='bitcoin'?[]:(TOKEN_LIST['_btc']||[]).filter(t=>t.symbol!==network.symbol);
  const allTokens=[...extraTokens,...tokens];
  const nativeBal=getAdminNativeBalance(state.walletAddress,state.chainId);
  const nativePriceData=getPriceForChain(state.chainId);
  const nativePriceStr=nativePriceData?formatPrice(nativePriceData.usd):'<span class="price-loading">...</span>';
  const nativeChgStr=nativePriceData?`<span class="${nativePriceData.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(nativePriceData.usd_24h_change)}</span>`:'';
  let nativeBalStr='0';
  if(nativeBal!==null)nativeBalStr=formatTokenAmount(nativeBal);
  let html=`<div class="asset-row" data-coin-id="${network.coinGeckoId||''}" data-symbol="${network.symbol}" onclick="navigateTo('send')"><div class="asset-left"><img src="${network.logo}" class="asset-icon" onerror="iconError(this,'${network.color}','${network.symbol}')"/><div class="asset-info"><div class="asset-name">${network.name}</div><div class="asset-symbol">${network.symbol}</div></div></div><div class="asset-right"><div class="asset-balance">${nativeBalStr} ${network.symbol}</div><div class="asset-price">${nativePriceStr} ${nativeChgStr}</div></div></div>`;
  allTokens.forEach(function(t,i){
    const priceInfo=t.priceId?getPriceByCoinId(t.priceId):null;
    const priceStr=priceInfo?formatPrice(priceInfo.usd):(t.isStable?'$1.00':'<span class="price-loading">...</span>');
    const chgStr=priceInfo?`<span class="${priceInfo.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(priceInfo.usd_24h_change)}</span>`:'';
    const tokBal=getAdminTokenBalance(state.walletAddress,state.chainId,t.symbol);
    const tokBalStr=tokBal!==null?formatTokenAmount(tokBal,t.decimals>6?4:2):'0';
    const tokUsd=priceInfo&&tokBal!==null?' · '+formatUsd(priceInfo.usd*tokBal):'';
    html+=`<div class="asset-row" data-coin-id="${t.priceId||''}" data-symbol="${t.symbol}" onclick="sendTokenFromDashboard(${i})"><div class="asset-left"><img src="${t.logo}" class="asset-icon" onerror="iconError(this,'${t.color}','${t.symbol}')"/><div class="asset-info"><div class="asset-name">${t.name}</div><div class="asset-symbol">${t.symbol}</div></div></div><div class="asset-right"><div class="asset-balance">${tokBalStr} ${t.symbol}</div><div class="asset-price">${priceStr} ${chgStr}</div></div></div>`;
  });
  $('tokenList').innerHTML=html;
}

function renderWatchlist(){
  const el=$('watchlist');
  if(!el)return;
  const popular=CHAIN_TABLE.slice(0,8);
  el.innerHTML=popular.map(c=>{
    const n=NETWORKS[c.id];
    if(!n)return '';
    const price=getPriceForChain(c.id);
    const priceStr=price?formatPrice(price.usd):'<span class="price-loading">...</span>';
    const chgStr=price?`<span class="${price.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(price.usd_24h_change)}</span>`:'';
    return `<div class="asset-row" data-coin-id="${n.coinGeckoId||''}" data-symbol="${c.symbol}" onclick="switchToNetwork('${c.id}')"><div class="asset-left"><img src="${c.logo}" class="asset-icon" onerror="iconError(this,'${n.color}','${c.symbol}')"/><div class="asset-info"><div class="asset-name">${c.name}</div><div class="asset-symbol">${c.symbol}</div></div></div><div class="asset-right"><div class="asset-price">${priceStr}</div>${chgStr?'<div>'+chgStr+'</div>':''}</div></div>`;
  }).join('')||'<div style="padding:20px;text-align:center;color:var(--lightBlack);font-size:13px">No watchlist data</div>';
}

async function loadActivity(){
  try{
    var rows=await sbGetTransactions(state.walletAddress,50);
    state.activity=(rows||[]).map(function(r){
      var ts=new Date(r.created_at).getTime();
      var amt=r.amount||'';
      var sym=r.symbol||'';
      return{hash:r.hash,from:r.from_address,to:r.to_address,chainId:r.chain_id,amount:amt,symbol:sym,gasFee:r.gas_fee,timestamp:ts};
    });
  }catch(e){state.activity=state.activity||[]}
}

function renderActivity(){
  const el=$('activityList');
  if(!el)return;
  const items=state.activity||[];
  if(items.length===0){
    el.innerHTML='<div style="padding:32px;text-align:center;color:var(--lightBlack);font-size:14px">No recent transactions</div>';
    return;
  }
  const addr=state.walletAddress?.toLowerCase();
  el.innerHTML=items.slice(0,20).map((tx,i)=>{
    const isIncoming=tx.from==='admin_faucet'||(addr&&tx.to?.toLowerCase()===addr&&tx.from?.toLowerCase()!==addr);
    const isAdmin=tx.from==='admin_faucet';
    const net=NETWORKS?.[tx.chainId];
    const netName=net?.name||'Unknown';
    const netLogo=net?.logo||'';
    const netColor=net?.color||'#888';
    const ts=new Date(tx.timestamp);
    const timeStr=ts.toLocaleDateString()+' '+ts.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const label=isAdmin?'Received (Faucet)':isIncoming?'Received':'Sent';
    const color=isIncoming?'var(--trustGreen)':'var(--red)';
    const sign=isIncoming?'+':'−';
    return `<div onclick="openTxDetail(${i})" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--baseWhite);cursor:pointer;transition:background .15s" onmouseenter="this.style.background='var(--baseWhite)'" onmouseleave="this.style.background='transparent'">
      <div style="width:40px;height:40px;border-radius:50%;background:${netColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
        ${netLogo?`<img src="${netLogo}" style="width:24px;height:24px" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=\\'font-size:12px;font-weight:700;color:#fff\\'>${(net?.symbol||'?').slice(0,2)}</span>'"/>`:`<span style="font-size:12px;font-weight:700;color:#fff">${(net?.symbol||'?').slice(0,2)}</span>`}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${label}</div>
        <div style="font-size:12px;color:var(--lightBlack)">${netName} · ${timeStr}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-weight:600;font-size:14px;color:${color}">${sign}${tx.amount}</div>
        <div style="font-size:11px;color:var(--lightBlack)">${isAdmin?'Deposit':'Transaction'}</div>
      </div>
    </div>`;
  }).join('');
}

function openTxDetail(index,skipHistory){
  var items=state.activity||[];
  var tx=items[index];
  if(!tx)return;
  if(!skipHistory&&!_historyRouting)_pushModal('txDetail',{txIndex:index});
  var isIncoming=tx.from==='admin_faucet'||(state.walletAddress?.toLowerCase()&&tx.to?.toLowerCase()===state.walletAddress?.toLowerCase()&&tx.from?.toLowerCase()!==state.walletAddress?.toLowerCase());
  var isAdmin=tx.from==='admin_faucet';
  var net=NETWORKS?.[tx.chainId];
  var netName=net?.name||'Unknown';
  var netColor=net?.color||'#888';
  var netLogo=net?.logo||'';
  var netSymbol=net?.symbol||'';
  var explorer=net?.explorer||'';
  var amt=parseFloat(tx.amount)||0;
  var coinId=net?.coinGeckoId||'';
  var priceData=coinId?getPriceByCoinId(coinId):null;
  var usdPrice=priceData?priceData.usd:0;
  var usdVal=usdPrice*amt;
  var ts=new Date(tx.timestamp);
  var dateStr=ts.toLocaleDateString()+' '+ts.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  var shortHash=tx.hash?tx.hash.slice(0,10)+'...'+tx.hash.slice(-8):'—';
  var explorerUrl='';
  if(explorer&&tx.hash){
    if(explorer.includes('blockchair'))explorerUrl=explorer+'/transaction/'+tx.hash;
    else explorerUrl=explorer+'/tx/'+tx.hash;
  }
  var label=isAdmin?'RECEIVED':isIncoming?'RECEIVED':'SENT';
  var sign=isIncoming?'+':'−';
  var amtStr=formatTokenAmount(amt)+' '+tx.symbol;
  var usdStr=usdVal>0?'≈ '+formatUsd(usdVal):'';
  $('txDetailContent').innerHTML=
    '<div style="text-align:center;padding:16px 0">'+
      '<div style="width:56px;height:56px;border-radius:50%;background:'+netColor+';display:flex;align-items:center;justify-content:center;margin:0 auto 12px;overflow:hidden">'+
        (netLogo?'<img src="'+netLogo+'" style="width:32px;height:32px" onerror="iconError(this,\''+netColor+'\',\''+netSymbol+'\')"/>':'<span style="font-size:14px;font-weight:700;color:#fff">'+(netSymbol||'?').slice(0,2)+'</span>')+
      '</div>'+
      '<div style="font-size:12px;font-weight:700;color:'+(isIncoming?'var(--trustGreen)':'var(--red)')+';letter-spacing:.5px;margin-bottom:4px">'+label+'</div>'+
      '<div style="font-size:28px;font-weight:800;color:var(--trustBlack);font-family:var(--font-heading)">'+sign+amtStr+'</div>'+
      (usdStr?'<div style="font-size:14px;color:var(--lightBlack);margin-top:4px">'+usdStr+'</div>':'')+
    '</div>'+
    '<div style="display:flex;align-items:center;gap:6px;justify-content:center;margin:16px 0;padding:10px;background:#E8FFE8;border-radius:10px;color:#22C55E;font-size:13px;font-weight:600">'+
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Confirmed'+
    '</div>'+
    '<div style="background:var(--baseWhite);border-radius:12px;padding:16px;margin-bottom:16px">'+
      '<div class="tx-detail-row"><span class="tx-detail-label">From</span><span class="tx-detail-value" style="word-break:break-all;font-size:12px">'+(tx.from||'—')+'</span></div>'+
      '<div class="tx-detail-row"><span class="tx-detail-label">To</span><span class="tx-detail-value" style="word-break:break-all;font-size:12px">'+(tx.to||'—')+'</span></div>'+
      '<div class="tx-detail-row"><span class="tx-detail-label">Date</span><span class="tx-detail-value">'+dateStr+'</span></div>'+
      '<div class="tx-detail-row"><span class="tx-detail-label">Network</span><span class="tx-detail-value">'+netName+'</span></div>'+
      (tx.gasFee?'<div class="tx-detail-row"><span class="tx-detail-label">Gas Fee</span><span class="tx-detail-value">'+tx.gasFee+'</span></div>':'')+
      (tx.hash?'<div class="tx-detail-row"><span class="tx-detail-label">TX Hash</span><span class="tx-detail-value" style="font-size:11px;word-break:break-all">'+tx.hash+'</span></div>':'')+
    '</div>'+
    (usdPrice>0?'<div class="tx-detail-row" style="padding:8px 0;border-bottom:none"><span class="tx-detail-label">Token Price</span><span class="tx-detail-value">'+formatUsd(usdPrice)+'</span></div>':'')+
    '<div style="margin:16px 0"><input id="txMemoInput" type="text" class="form-input" placeholder="Add a memo..." style="border:1.5px solid var(--borderTint)"/></div>'+
    '<div style="display:flex;gap:10px">'+
      '<button class="btn btn-outline" style="flex:1;font-size:13px" onclick="shareTx()">Share</button>'+
      (explorerUrl?'<button class="btn btn-primary" style="flex:1;font-size:13px" onclick="window.open(\''+explorerUrl+'\',\'_blank\')">View on Explorer</button>':'<button class="btn btn-primary" style="flex:1;font-size:13px;opacity:.5" disabled>No Explorer</button>')+
    '</div>';
  $('txDetailModal').classList.remove('hidden');
}
function closeTxDetail(){$('txDetailModal').classList.add('hidden');if(!_historyRouting)history.back()}
function shareTx(){
  var memo=$('txMemoInput')?.value?.trim();
  var txt='Transaction from Trust Wallet';
  if(memo)txt+=': '+memo;
  if(navigator.share)navigator.share({title:'Transaction',text:txt});
  else showToast('Share not supported on this device','info');
}
