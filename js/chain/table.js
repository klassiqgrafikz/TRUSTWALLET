function _hasDapps(chainKey){
  var n=NETWORKS[chainKey];
  if(!n)return false;
  var t=n.type||'';
  if(t==='evm'||t==='solana'||t==='tron'||t==='near'||t==='sui'||t==='apt'||t==='inj'||t==='sei'||t==='osmo')return true;
  return false;
}
function populateChainTable(){
  $('chainsBody').innerHTML=CHAIN_TABLE.map(c=>{
    const yes='<span class="check">✓</span>';
    const no='<span class="cross">—</span>';
    return`<tr><td><span class="chain-name"><span class="chain-icon"><img src="${c.logo}" onerror="this.style.display='none';this.parentElement.textContent='${c.name[0]}'" alt="${c.name}"/></span>${c.name}</span></td><td>${c.buy?yes:no}</td><td>${c.sell?yes:no}</td><td>${c.swap?yes:no}</td><td>${c.stake?yes:no}</td><td>${_hasDapps(c.id)?yes:no}</td></tr>`;
  }).join('');
}
function updateTablePrices(){
  if(!$('networkModal').classList.contains('hidden'))updateNetworkModalPrices();
  const allExtra=TOKEN_LIST['_btc']||[];
  for(const t of allExtra){
    if(!t.priceId)continue;
    const price=getPriceByCoinId(t.priceId);
    if(!price)continue;
    const pe=$('tok-'+t.symbol);
    if(pe)pe.textContent=formatPrice(price.usd);
    const ce=$('tok-chg-'+t.symbol);
    if(ce)ce.innerHTML=`<span class="${price.usd_24h_change>=0?'price-up':'price-down'}" style="font-size:12px">${formatChange(price.usd_24h_change)}</span>`;
  }
}

function filterChains(){
  const q=$('chainSearch').value.toLowerCase();
  $('chainsBody').querySelectorAll('tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none'});
}
