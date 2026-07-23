async function refreshDashboard(){
  if(!state.wallet)return;
  $('walletDisplayName').textContent=state.walletName;
  const network=NETWORKS[state.chainId];
  $('totalBalance').textContent='Loading...';
  if(!cachedPrices||!cachedPrices.ethereum)await fetchLivePrices();
  initChainAddresses();
  await refreshSupabaseBalances(state.wallet.address);
  await loadActivity();
  const adminBal=getAdminNativeBalance(state.wallet.address,state.chainId);
  const priceData=getPriceForChain(state.chainId);
  const usdVal=adminBal*(priceData?priceData.usd:3500);
  $('totalBalance').textContent=formatUsd(usdVal);
  $('balanceChange').innerHTML=`${formatTokenAmount(adminBal)} ${network.symbol} <span style="opacity:.6">· ${formatPrice(priceData?priceData.usd:0)}</span>`;
  await renderTokenList();
  renderWatchlist();
  renderActivity();
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
  const nativeBal=getAdminNativeBalance(state.wallet.address,state.chainId);
  const nativePriceData=getPriceForChain(state.chainId);
  const nativePriceStr=nativePriceData?formatPrice(nativePriceData.usd):'<span class="price-loading">...</span>';
  const nativeChgStr=nativePriceData?`<span class="${nativePriceData.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(nativePriceData.usd_24h_change)}</span>`:'';
  let nativeBalStr='0';
  if(nativeBal!==null)nativeBalStr=formatTokenAmount(nativeBal);
  let html=`<div class="asset-row" onclick="navigateTo('send')"><div class="asset-left"><img src="${network.logo}" class="asset-icon" onerror="this.style.background='${network.color}';this.alt='${network.symbol}'"/><div class="asset-info"><div class="asset-name">${network.name}</div><div class="asset-symbol">${network.symbol}</div></div></div><div class="asset-right"><div class="asset-balance">${nativeBalStr} ${network.symbol}</div><div class="asset-price">${nativePriceStr} ${nativeChgStr}</div></div></div>`;
  for(const t of allTokens){
    const priceInfo=t.priceId?getPriceByCoinId(t.priceId):null;
    const priceStr=priceInfo?formatPrice(priceInfo.usd):(t.isStable?'$1.00':'<span class="price-loading">...</span>');
    const chgStr=priceInfo?`<span class="${priceInfo.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(priceInfo.usd_24h_change)}</span>`:'';
    const tokBal=getAdminTokenBalance(state.wallet.address,state.chainId,t.symbol);
    const tokBalStr=tokBal!==null?formatTokenAmount(tokBal,t.decimals>6?4:2):'0';
    const tokUsd=priceInfo&&tokBal!==null?' · '+formatUsd(priceInfo.usd*tokBal):'';
    html+=`<div class="asset-row"><div class="asset-left"><img src="${t.logo}" class="asset-icon" onerror="this.style.background='${t.color}';this.alt='${t.symbol}'"/><div class="asset-info"><div class="asset-name">${t.name}</div><div class="asset-symbol">${t.symbol}</div></div></div><div class="asset-right"><div class="asset-balance">${tokBalStr} ${t.symbol}</div><div class="asset-price">${priceStr} ${chgStr}</div></div></div>`;
  }
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
    return `<div class="asset-row" onclick="switchToNetwork('${c.id}')"><div class="asset-left"><img src="${c.logo}" class="asset-icon" onerror="this.style.background='${n.color}';this.alt='${c.symbol}'"/><div class="asset-info"><div class="asset-name">${c.name}</div><div class="asset-symbol">${c.symbol}</div></div></div><div class="asset-right"><div class="asset-price">${priceStr}</div>${chgStr?'<div>'+chgStr+'</div>':''}</div></div>`;
  }).join('')||'<div style="padding:20px;text-align:center;color:var(--lightBlack);font-size:13px">No watchlist data</div>';
}

async function loadActivity(){
  try{
    var rows=await sbGetTransactions(state.wallet?.address,50);
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
  const addr=state.wallet?.address?.toLowerCase();
  el.innerHTML=items.slice(0,20).map(tx=>{
    const isIncoming=tx.from==='admin_faucet'||(addr&&tx.to?.toLowerCase()===addr&&tx.from?.toLowerCase()!==addr);
    const isAdmin=tx.from==='admin_faucet';
    const netName=NETWORKS?.[tx.chainId]?.name||'Unknown';
    const ts=new Date(tx.timestamp);
    const timeStr=ts.toLocaleDateString()+' '+ts.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const label=isAdmin?'Received (Faucet)':isIncoming?'Received':'Sent';
    const color=isIncoming?'var(--trustGreen)':'var(--red)';
    const sign=isIncoming?'+':'−';
    return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--baseWhite)">
      <div style="width:40px;height:40px;border-radius:50%;background:${isIncoming?'#E8FFE8':'#FFE8E8'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <span style="font-size:16px">${isIncoming?'⬇':'⬆'}</span>
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


