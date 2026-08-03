function $(id){return document.getElementById(id)}

function showToast(msg,type){
  type=type||'success';
  var t=$('toast');
  t.className='toast '+type;
  t.textContent=msg;
  t.style.display='block';
  setTimeout(function(){t.style.display='none'},3000);
}

function populateNetworkSelect(){
  var sel=$('networkSelect');
  sel.innerHTML=Object.entries(NETWORKS).map(function(e){var id=e[0],n=e[1];return'<option value="'+id+'">'+n.name+' ('+n.symbol+')</option>';}).join('');
  sel.onchange=updateTokenFields;
}

var NETWORK_NAMES=Object.fromEntries(Object.entries(NETWORKS).map(function(e){return[String(e[0]),e[1].name+' ('+e[1].symbol+')'];}));

function updateTokenFields(){
  var sel=$('networkSelect');
  var chainId=sel.value;
  var net=NETWORKS[chainId];
  var tokens=[].concat(TOKEN_LIST[chainId]||[]).concat(net&&net.coinGeckoId==='bitcoin'?[]:TOKEN_LIST['_btc']||[]).filter(function(t,i,a){return a.findIndex(function(x){return x.symbol===t.symbol})===i;});
  if(!tokens.some(function(t){return t.symbol==='USDT'}))tokens.push({symbol:'USDT',name:'Tether',color:'#26A17B',logo:'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png'});
  var container=$('tokenFields');
  if(tokens.length===0){
    container.innerHTML='<p style="font-size:13px;color:var(--gray)">No tokens defined for this network.</p>';
  }else{
    container.innerHTML=tokens.filter(function(t){return !t.showPrice;}).map(function(t){
      return '<div class="token-row"><label>'+t.symbol+'</label><input class="tok-input" data-symbol="'+t.symbol+'" type="number" step="any" min="0" placeholder="0.00" value=""/></div>';
    }).join('');
  }
  autoFillAddress();
}

function getCurrentTokens(){
  var inputs=document.querySelectorAll('.tok-input');
  var tokens={};
  inputs.forEach(function(inp){
    var val=inp.value.trim();
    if(val&&parseFloat(val)>0)tokens[inp.dataset.symbol]=val;
  });
  return tokens;
}

async function saveEntry(){
  var addr=$('addressInput').value.trim();
  var chainId=$('networkSelect').value;
  var amount=$('balanceInput').value.trim();
  if(!addr)return showToast('Enter a wallet address','error');
  if(!amount||parseFloat(amount)<0)return showToast('Enter a valid amount','error');
  var tokens=getCurrentTokens();
  try{
    await addAdminFunds(addr,chainId,amount,tokens);
    showToast('Added '+amount+' to '+addr.slice(0,10)+'... on '+NETWORK_NAMES[chainId]);
    clearForm();
    await renderEntries();
  }catch(e){showToast('Error: '+e.message,'error')}
}

function autoFillAddress(){
  try{
    var d=JSON.parse(localStorage.getItem('tw_data')||'{}');
    var chainId=$('networkSelect').value;
    var addr=(d.chainAddresses&&d.chainAddresses[chainId])||d.walletAddress||d.address||'';
    if(addr)$('addressInput').value=addr;
  }catch(e){}
}

function clearForm(){
  $('addressInput').value='';
  $('balanceInput').value='';
  document.querySelectorAll('.tok-input').forEach(function(inp){inp.value='';});
  autoFillAddress();
}

async function renderEntries(){
  try{
    var rows=await sbGetAllBalances();
  }catch(e){rows=[]}
  var tbody=$('entriesBody');
  var empty=$('emptyState');
  if(!rows||rows.length===0){
    tbody.innerHTML='';
    empty.style.display='block';
    return;
  }
  empty.style.display='none';
  tbody.innerHTML=rows.map(function(r){
    var tokens=Object.entries(r.tokens||{}).map(function(e){return e[0]+': '+e[1];}).join(', ')||'\u2014';
    return '<tr><td><span class="addr">'+r.address+'</span></td><td><span class="status active">'+(NETWORK_NAMES[r.chain_id]||r.chain_id)+'</span></td><td><strong>'+(r.balance||'0')+'</strong></td><td style="font-size:12px;color:var(--gray)">'+tokens+'</td><td><button class="btn btn-danger btn-sm" onclick="deleteEntry(\''+r.address+'\',\''+r.chain_id+'\')">Delete</button></td></tr>';
  }).join('');
}

async function deleteEntry(addr,chainId){
  try{
    await removeAdminBalance(addr,chainId);
    await renderEntries();
    showToast('Entry removed');
  }catch(e){showToast('Error: '+e.message,'error')}
}

async function clearAll(){
  if(!confirm('Remove all admin balances?'))return;
  try{
    await sbDeleteAllBalances();
    await renderEntries();
    showToast('All entries cleared');
  }catch(e){showToast('Error: '+e.message,'error')}
}

function setMaintenanceUI(on){
  $('maintenanceToggle').checked = on;
  $('maintenanceStatusText').innerHTML = '<span style="font-weight:700;color:' + (on ? '#FF3B30' : '#22C55E') + '">&#9679; MODE: ' + (on ? 'PAUSED' : 'LIVE') + '</span> &mdash; website is ' + (on ? 'hidden behind the under-development screen' : 'visible to all visitors') + '.';
}

async function loadMaintenanceStatus(){
  try{
    var cached = getMaintenanceCached();
    setMaintenanceUI(cached);
    var v = await sbGetConfig('maintenance');
    if (v === 'on' || v === 'off') { setMaintenanceCached(v === 'on'); setMaintenanceUI(v === 'on'); }
  }catch(e){ setMaintenanceUI(getMaintenanceCached()); }
}

async function toggleMaintenance(checked){
  $('maintenanceToggle').disabled = true;
  try{
    await sbSetConfig('maintenance', checked ? 'on' : 'off');
    setMaintenanceCached(checked);
    setMaintenanceUI(checked);
    showToast(checked ? 'Maintenance mode ON — site paused' : 'Maintenance mode OFF — site live');
  }catch(e){
    setMaintenanceUI(!checked);
    showToast('Sync failed: run "ALTER TABLE site_config DISABLE ROW LEVEL SECURITY;" in Supabase SQL Editor. '+(e.message||''),'error');
  }finally{
    $('maintenanceToggle').disabled = false;
  }
}

populateNetworkSelect();
autoFillAddress();
renderEntries();
loadMaintenanceStatus();
