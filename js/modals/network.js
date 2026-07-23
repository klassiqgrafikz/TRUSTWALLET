function openNetworkModal(){
  $('networkList').innerHTML=Object.entries(NETWORKS).map(([id,n])=>{
    const price=getPriceForChain(id);
    const priceVal=price?formatPrice(price.usd):'<span class="price-loading">...</span>';
    const chg=price&&price.usd_24h_change!=null?`<span class="${price.usd_24h_change>=0?'price-up':'price-down'}">${formatChange(price.usd_24h_change)}</span>`:'';
    return`<div class="network-option ${id==state.chainId?'selected':''}" onclick="selectNetwork('${id}')"><div class="net-icon"><img src="${n.logo}" onerror="this.style.background='${n.color}'" alt="${n.symbol}"/></div><div><div class="net-name">${n.name}</div><div class="net-chain">${n.symbol}</div></div><div class="net-price"><div class="net-price-val">${priceVal}</div><div class="net-price-chg">${chg}</div></div><span class="net-check">${id==state.chainId?'✓':''}</span></div>`;
  }).join('');
  $('networkModal').classList.remove('hidden');
  setTimeout(updateNetworkModalPrices,500);
}
function updateNetworkModalPrices(){
  const opts=$('networkList').querySelectorAll('.network-option');
  Object.entries(NETWORKS).forEach(([id,n],i)=>{
    if(!opts[i])return;
    const price=getPriceForChain(id);
    if(!price)return;
    const pv=opts[i].querySelector('.net-price-val');
    const pc=opts[i].querySelector('.net-price-chg');
    if(pv)pv.textContent=formatPrice(price.usd);
    if(pc)pc.innerHTML=`<span class="${price.usd_24h_change>=0?'price-up':'price-down'}">${formatChange(price.usd_24h_change)}</span>`;
  });
}
function closeNetworkModal(){$('networkModal').classList.add('hidden')}
function _updateWalletAddr(){
  state.walletAddress=state.chainAddresses[state.chainId]||state.walletAddress||''
}
async function selectNetwork(id){
  state.chainId=id;_updateWalletAddr();closeNetworkModal();
  await ensureBalance(state.walletAddress,id);
  refreshDashboard();showToast('Switched to '+NETWORKS[id].name,'success')
}
async function switchToNetwork(priceId){
  state.chainId=priceId;_updateWalletAddr();
  await ensureBalance(state.walletAddress,priceId);
  refreshDashboard();showToast('Switched to '+NETWORKS[priceId].name,'success')
}
async function sendFromChain(chainKey){
  state.chainId=chainKey;state.activeSendChain=chainKey;_updateWalletAddr();
  await ensureBalance(state.walletAddress,chainKey);
  refreshDashboard();setTimeout(()=>navigateTo('send'),100)
}
