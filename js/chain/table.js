function populateChainTable(){
  $('chainsBody').innerHTML=CHAIN_TABLE.map(c=>{
    const yes='<span class="check">✓</span>';
    const no='<span class="cross">—</span>';
    const price=getPriceForChain(c.id);
    const change=price?price.usd_24h_change:null;
    const priceStr=price?formatPrice(price.usd):'<span class="price-loading">...</span>';
    const changeStr=change!==null?`<span class="${change>=0?'price-up':'price-down'}">${formatChange(change)}</span>`:'<span class="price-loading">...</span>';
    return`<tr><td><span class="chain-name"><span class="chain-icon"><img src="${c.logo}" onerror="this.style.display='none';this.parentElement.textContent='${c.name[0]}'" alt="${c.name}"/></span>${c.name}</span></td><td class="price-cell">${priceStr}</td><td class="change-cell">${changeStr}</td><td>${c.buy?yes:no}</td><td>${c.sell?yes:no}</td><td>${c.swap?yes:no}</td><td>${c.recv?yes:no}</td><td>${c.stake?yes:no}</td></tr>`;
  }).join('');
}
function updatePriceDisplays(){
  document.querySelectorAll('#chainsBody tr').forEach((row,i)=>{
    const c=CHAIN_TABLE[i];if(!c)return;
    const price=getPriceForChain(c.id);
    if(!price)return;
    const cells=row.querySelectorAll('td');
    if(cells[1])cells[1].innerHTML=formatPrice(price.usd);
    if(cells[2]){
      const ch=price.usd_24h_change;
      cells[2].innerHTML=`<span class="${ch>=0?'price-up':'price-down'}">${formatChange(ch)}</span>`;
    }
  });
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
