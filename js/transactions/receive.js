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
  el.innerHTML=CHAIN_TABLE.map(c=>{
    const n=NETWORKS[c.id];
    if(!n)return'';
    const addr=getChainAddress(c.id);
    const addrShort=addr?addr.slice(0,10)+'...'+addr.slice(-4):'';
    const filterKey=Object.keys(filterMap).find(k=>filterMap[k]==String(c.id))||'other';
    return `<div class="network-option" data-chain-key="${filterKey}" onclick="receiveOnChain('${c.id}')">
      <div class="net-icon"><img src="${c.logo}" onerror="this.style.background='${n.color}'" alt="${c.symbol}"/></div>
      <div style="flex:1;min-width:0"><div class="net-name">${c.name}</div><div class="net-chain">${c.symbol} · ${addrShort}</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="cursor:pointer" onclick="event.stopPropagation();navigator.clipboard.writeText('${addr}').then(()=>showToast('Copied!','success'))"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lightBlack)" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></span>
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
