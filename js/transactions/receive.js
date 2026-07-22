function initReceiveScreen(){
  showReceiveNetworkList();
}

function showReceiveNetworkList(){
  $('receiveAddressView').classList.add('hidden');
  $('receiveNetworkList').classList.remove('hidden');
  const el=$('receiveNetworks');
  el.innerHTML=CHAIN_TABLE.map(c=>{
    const n=NETWORKS[c.id];
    if(!n)return'';
    return `<div class="network-option" onclick="receiveOnChain('${c.id}')">
      <div class="net-icon"><img src="${c.logo}" onerror="this.style.background='${n.color}'" alt="${c.symbol}"/></div>
      <div><div class="net-name">${c.name}</div><div class="net-chain">${c.symbol}</div></div>
      <span class="net-check" style="margin-left:auto;color:var(--trustBlue);font-size:11px">Receive</span>
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
  $('qrContainer').innerHTML='';$('qrContainer').appendChild(c);
}
