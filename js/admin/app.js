function $(id){return document.getElementById(id)}

function showToast(msg,type='success'){
  const t=$('toast');
  t.className='toast '+type;
  t.textContent=msg;
  t.style.display='block';
  setTimeout(()=>t.style.display='none',3000);
}

function populateNetworkSelect(){
  const sel=$('networkSelect');
  sel.innerHTML=Object.entries(NETWORKS).map(([id,n])=>`<option value="${id}">${n.name} (${n.symbol})</option>`).join('');
  sel.onchange=updateTokenFields;
}

const NETWORK_NAMES=Object.fromEntries(Object.entries(NETWORKS).map(([id,n])=>[String(id),n.name+' ('+n.symbol+')']));

function updateTokenFields(){
  const sel=$('networkSelect');
  const chainId=sel.value;
  const net=NETWORKS[chainId];const tokens=[...(TOKEN_LIST[chainId]||[]),...(net&&net.coinGeckoId==='bitcoin'?[]:TOKEN_LIST['_btc']||[])].filter((t,i,a)=>a.findIndex(x=>x.symbol===t.symbol)===i);
  const container=$('tokenFields');
  const addr=$('addressInput').value.trim();
  if(tokens.length===0){
    container.innerHTML='<p style="font-size:13px;color:var(--gray)">No tokens defined for this network.</p>';
    return;
  }
  container.innerHTML=tokens.filter(t=>!t.showPrice).map(t=>{
    const existingVal='';
    return `<div class="token-row">
      <label>${t.symbol}</label>
      <input class="tok-input" data-symbol="${t.symbol}" type="number" step="any" min="0" placeholder="0.00" value="${existingVal}"/>
    </div>`;
  }).join('');
}

function getCurrentTokens(){
  const inputs=document.querySelectorAll('.tok-input');
  const tokens={};
  inputs.forEach(inp=>{
    const val=inp.value.trim();
    if(val&&parseFloat(val)>0)tokens[inp.dataset.symbol]=val;
  });
  return tokens;
}

function saveEntry(){
  const addr=$('addressInput').value.trim();
  const chainId=$('networkSelect').value;
  const balance=$('balanceInput').value.trim();
  if(!addr)return showToast('Enter a wallet address','error');
  if(!balance||parseFloat(balance)<0)return showToast('Enter a valid native balance','error');
  const tokens=getCurrentTokens();
  setAdminBalance(addr,chainId,balance,tokens);
  showToast('Balance saved for '+addr.slice(0,10)+'... on '+NETWORK_NAMES[chainId]);
  clearForm();
  renderEntries();
}

function autoFillAddress(){
  try{
    const d=JSON.parse(localStorage.getItem('tw_data')||'{}');
    if(d.address)$('addressInput').value=d.address;
  }catch{}
}

function clearForm(){
  $('addressInput').value='';
  $('balanceInput').value='';
  document.querySelectorAll('.tok-input').forEach(inp=>inp.value='');
  autoFillAddress();
}

function renderEntries(){
  const all=getAdminBalances();
  const tbody=$('entriesBody');
  const empty=$('emptyState');
  const entries=[];
  Object.entries(all).forEach(([addr,chains])=>{
    Object.entries(chains).forEach(([chainId,data])=>{
      entries.push({addr,chainId,data});
    });
  });
  if(entries.length===0){
    tbody.innerHTML='';
    empty.style.display='block';
    return;
  }
  empty.style.display='none';
  tbody.innerHTML=entries.map(e=>{
    const tokens=Object.entries(e.data.tokens||{}).map(([sym,val])=>`${sym}: ${val}`).join(', ')||'—';
    return `<tr>
      <td><span class="addr">${e.addr}</span></td>
      <td><span class="status active">${NETWORK_NAMES[e.chainId]||e.chainId}</span></td>
      <td><strong>${e.data.balance||'0'}</strong></td>
      <td style="font-size:12px;color:var(--gray)">${tokens}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteEntry('${e.addr}','${e.chainId}')">Delete</button></td>
    </tr>`;
  }).join('');
}

function deleteEntry(addr,chainId){
  removeAdminBalance(addr,chainId);
  renderEntries();
  showToast('Entry removed');
}

function clearAll(){
  if(!confirm('Remove all admin balances?'))return;
  saveAdminBalances({});
  renderEntries();
  showToast('All entries cleared');
}

populateNetworkSelect();
autoFillAddress();
renderEntries();
