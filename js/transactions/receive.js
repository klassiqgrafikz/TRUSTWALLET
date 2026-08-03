var _receiveFilter='all';

function initReceiveScreen(){
  _receiveFilter='all';
  document.querySelectorAll('.filter-chip').forEach(f=>f.classList.toggle('active',f.dataset.filter==='all'));
  showReceiveNetworkList();
}

function filterReceive(filter){
  _receiveFilter=filter;
  document.querySelectorAll('.filter-chip').forEach(f=>f.classList.toggle('active',f.dataset.filter===filter));
  const rows=$('receiveNetworks').querySelectorAll('.network-option');
  rows.forEach(r=>{
    if(filter==='all'){r.style.display='flex';return}
    r.style.display=r.dataset.chainKey===filter?'flex':'none';
  });
}

function showReceiveNetworkList(){
  $('receiveAddressView').classList.add('hidden');
  $('receiveNetworkList').classList.remove('hidden');
  const el=$('receiveNetworks');
  const filterMap={btc:'btc',eth:'1',sol:'sol',bnb:'56'};
  var usdtChain=_findTokenPrimaryChain('USDT');
  var usdtTok=null;
  if(usdtChain)(TOKEN_LIST[usdtChain]||[]).forEach(function(t){if(t.symbol==='USDT')usdtTok=t});
  var tokenRows='';
  if(usdtChain&&usdtTok){
    tokenRows='<div style="font-size:12px;font-weight:700;color:var(--lightBlack);padding:8px 4px 4px;text-transform:uppercase;letter-spacing:.5px">Tokens</div>'+_receiveTokenRow(usdtTok,usdtChain);
  }
  el.innerHTML=tokenRows+CHAIN_TABLE.map(c=>{
    const n=NETWORKS[c.id];
    if(!n)return'';
    const addr=getChainAddress(c.id);
    const addrShort=addr?addr.slice(0,10)+'...'+addr.slice(-4):'';
    const filterKey=Object.keys(filterMap).find(k=>filterMap[k]==String(c.id))||'other';
    return `<div class="network-option" data-chain-key="${filterKey}" onclick="receiveOnChain('${c.id}')">
      <div class="net-icon"><img src="${c.logo}" onerror="iconError(this,'${n.color}','${c.symbol}')" alt="${c.symbol}"/></div>
      <div style="flex:1;min-width:0"><div class="net-name">${c.name}</div><div class="net-chain">${c.symbol} · ${addrShort}</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="cursor:pointer" onclick="event.stopPropagation();copyChainAddress('${c.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lightBlack)" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></span>
        <span style="cursor:pointer;background:var(--trustBlue);color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600" onclick="event.stopPropagation();receiveOnChain('${c.id}')">QR</span>
      </div>
    </div>`;
  }).join('');
}

function receiveOnChain(chainId){
  state.chainId=chainId;
  $('receiveNetworkList').classList.add('hidden');
  $('receiveAddressView').classList.remove('hidden');
  const n=NETWORKS[chainId];
  if(!n)return;
  $('receiveNetworkLabel').textContent=n.name;
  const addr=getChainAddress(chainId);
  $('receiveAddress').textContent=addr;
  renderQR(addr);
}

function copyChainAddress(chainId){
  const addr=getChainAddress(chainId);
  navigator.clipboard.writeText(addr).then(()=>showToast('Copied!','success'))
}

function copyReceiveAddress(){
  const addr=$('receiveAddress').textContent;
  navigator.clipboard.writeText(addr).then(()=>{const b=$('copyAddressBtn');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',2000)}).catch(()=>showToast('Copy failed','error'))
}

function renderQR(text){
  const c=document.createElement('canvas');c.width=200;c.height=200;
  const ctx=c.getContext('2d');ctx.fillStyle='#FFF';ctx.fillRect(0,0,200,200);
  let seed=0;for(let i=0;i<text.length;i++)seed=((seed<<5)-seed)+text.charCodeAt(i);
  ctx.fillStyle='#000';
  for(let x=0;x<200;x+=5)for(let y=0;y<200;y+=5){seed=(seed*16807)%2147483647;if(seed%3===0||(x<30&&y<30)||(x>170&&y<30)||(x<30&&y>170))ctx.fillRect(x,y,4,4)}
  const qr=$('qrContainer');qr.innerHTML='';qr.appendChild(c);
}

function _receiveChainOrder(){
  var keys=Object.keys(TOKEN_LIST);
  var numeric=[],other=[];
  keys.forEach(function(k){if(/^\d+$/.test(k))numeric.push(k);else other.push(k)});
  numeric.sort(function(a,b){return parseInt(a,10)-parseInt(b,10)});
  other.sort();
  return numeric.concat(other);
}

function _findTokenPrimaryChain(symbol){
  var order=_receiveChainOrder();
  for(var i=0;i<order.length;i++){
    var id=order[i];
    if((TOKEN_LIST[id]||[]).some(function(t){return t.symbol===symbol}))return id;
  }
  return null;
}

function _receiveFilterKeyForChain(chainId){
  var filterMap={btc:'btc',eth:'1',sol:'sol',bnb:'56'};
  return Object.keys(filterMap).find(function(k){return filterMap[k]==String(chainId)})||'other';
}

function _receiveTokenRow(tokenDef,chainId){
  const n=NETWORKS[chainId];
  if(!n)return '';
  const addr=getChainAddress(chainId);
  const addrShort=addr?addr.slice(0,10)+'...'+addr.slice(-4):'';
  const filterKey=_receiveFilterKeyForChain(chainId);
  return `<div class="network-option" data-chain-key="${filterKey}" onclick="receiveToken('${tokenDef.symbol}')">
    <div class="net-icon"><img src="${tokenDef.logo}" onerror="iconError(this,'${tokenDef.color}','${tokenDef.symbol}')" alt="${tokenDef.symbol}"/></div>
    <div style="flex:1;min-width:0"><div class="net-name">${tokenDef.name} (${tokenDef.symbol})</div><div class="net-chain">${n.symbol} · ${addrShort}</div></div>
    <div style="display:flex;gap:6px;align-items:center">
      <span style="cursor:pointer" onclick="event.stopPropagation();copyChainAddress('${chainId}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lightBlack)" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></span>
      <span style="cursor:pointer;background:var(--trustBlue);color:white;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600" onclick="event.stopPropagation();receiveToken('${tokenDef.symbol}')">QR</span>
    </div>
  </div>`;
}

function receiveToken(symbol){
  const chainId=_findTokenPrimaryChain(symbol);
  if(!chainId){showToast('No network supports '+symbol,'error');return}
  receiveOnChain(chainId);
  var name=symbol;
  (TOKEN_LIST[chainId]||[]).forEach(function(t){if(t.symbol===symbol)name=t.name});
  $('receiveNetworkLabel').textContent=name+' ('+symbol+')';
}
