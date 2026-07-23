async function refreshDashboard(){
  if(!state.wallet)return;
  $('walletDisplayName').textContent=state.walletName;
  const network=NETWORKS[state.chainId];
  $('networkDot').style.background=network.color;
  $('currentNetworkName').textContent=network.name;
  $('totalBalance').textContent='Loading...';
  if(!cachedPrices||!cachedPrices.ethereum)await fetchLivePrices();
  initChainAddresses();
  await refreshSupabaseBalances(state.wallet.address);
  await loadActivity();
  const adminBal=getAdminNativeBalance(state.wallet.address,state.chainId);
  const priceData=getPriceForChain(state.chainId);
  const usdVal=adminBal*(priceData?priceData.usd:3500);
  $('totalBalance').textContent=formatUsd(usdVal);
  $('balanceChange').innerHTML=`<span style="color:var(--trustGreen)">${formatTokenAmount(adminBal)} ${network.symbol}</span>`;
  renderPortfolio();
  await renderTokenList();
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
  let html=`<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-bottom:1px solid var(--baseWhite)" onclick="navigateTo('send')"><div style="display:flex;align-items:center;gap:12px"><img src="${network.logo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" onerror="this.style.background='${network.color}';this.alt='${network.symbol}'"/><div><div style="font-weight:600">${network.name}</div><div style="font-size:13px;color:var(--lightBlack)">${network.symbol}</div></div></div><div style="text-align:right"><div id="nativeBal" style="font-weight:600">Loading...</div><div id="nativePrice" style="font-size:12px;color:var(--lightBlack)"></div></div></div>`;
  let i=0;
  for(const t of allTokens){
    const priceInfo=t.priceId?getPriceByCoinId(t.priceId):null;
    const priceStr=priceInfo?formatPrice(priceInfo.usd):(t.isStable?'$1.00':'<span class="price-loading">...</span>');
    const chgStr=priceInfo?`<span class="${priceInfo.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(priceInfo.usd_24h_change)}</span>`:'';
    const netKey=String(state.chainId);
    html+=`<div style="padding:14px 16px;border-bottom:1px solid var(--baseWhite)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div style="display:flex;align-items:center;gap:12px"><img src="${t.logo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" onerror="this.style.background='${t.color}';this.alt='${t.symbol}'"/><div><div style="font-weight:600">${t.name}</div><div style="font-size:13px;color:var(--lightBlack)">${t.symbol}</div></div></div><div style="text-align:right"><div id="tok-${t.symbol}" style="font-weight:600">${priceStr}</div><div id="bal-${t.symbol}" style="font-size:12px;color:var(--lightBlack)"></div><div id="tok-chg-${t.symbol}" style="font-size:12px">${chgStr}</div></div></div>${netKey?`<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-primary btn-sm" style="padding:6px 14px;font-size:11px" onclick="event.stopPropagation();sendTokenFromDashboard(${i})">Send</button><button class="btn btn-outline btn-sm" style="padding:6px 14px;font-size:11px" onclick="event.stopPropagation();receiveOnChain('${netKey}')">Receive</button></div>`:''}</div>`;
    i++;
  }
  $('tokenList').innerHTML=html;
  const adminNativeBal=getAdminNativeBalance(state.wallet.address,state.chainId);
  const nativePriceData=getPriceForChain(state.chainId);
  if(adminNativeBal!==null){
    const el=$('nativeBal');if(el)el.textContent=formatTokenAmount(adminNativeBal)+' '+network.symbol;
    const pe=$('nativePrice');
    if(pe&&nativePriceData)pe.innerHTML=formatPrice(nativePriceData.usd)+' '+`<span class="${nativePriceData.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(nativePriceData.usd_24h_change)}</span>`;
  }else if(network.type==='evm'&&network.rpc){
    try{
      const p=new ethers.JsonRpcProvider(network.rpc);
      const bal=await p.getBalance(state.wallet.address);
      const el=$('nativeBal');if(el)el.textContent=formatBalance(bal)+' '+network.symbol;
      const pe=$('nativePrice');
      if(pe&&nativePriceData)pe.innerHTML=formatPrice(nativePriceData.usd)+' '+`<span class="${nativePriceData.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:11px">${formatChange(nativePriceData.usd_24h_change)}</span>`;
    }catch(e){}
  }
  for(const t of allTokens){
    const tokBal=getAdminTokenBalance(state.wallet.address,state.chainId,t.symbol);
    const e=$('bal-'+t.symbol);if(e)e.textContent=(tokBal!==null?formatTokenAmount(tokBal,t.decimals>6?4:2):'0')+' '+t.symbol;
  }
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

function renderPortfolio(){
  const section=$('portfolioSection');
  const list=$('portfolioList');
  const totalEl=$('portfolioTotal');
  if(!section||!list||!totalEl||!state.wallet)return;
  const balances=getAdminBalancesForAddress(state.wallet.address);
  const entries=Object.entries(balances);
  if(entries.length===0){section.style.display='none';return}
  section.style.display='block';
  let total=0;
  const rows=entries.map(([chainId,data])=>{
    const n=NETWORKS[chainId];
    const bal=parseFloat(data.balance||'0');
    const price=getPriceForChain(chainId);
    const usd=price?bal*price.usd:0;
    total+=usd;
    const name=n?n.name:'Chain #'+chainId;
    const sym=n?n.symbol:'?';
    const color=n?n.color:'#888';
    const logo=n?n.logo:'';
    const priceStr=price?formatPrice(price.usd):'<span style="opacity:.5">...</span>';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--baseWhite)">
      <img src="${logo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.style.background='${color}';this.alt='${sym}'"/>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600">${name}</div>
        <div style="font-size:11px;color:var(--lightBlack)">${formatTokenAmount(bal)} ${sym} · ${priceStr}</div>
      </div>
      <div style="font-weight:600;font-size:14px">${formatUsd(usd)}</div>
    </div>`;
  }).join('');
  list.innerHTML=rows;
  totalEl.textContent=formatUsd(total);
}
