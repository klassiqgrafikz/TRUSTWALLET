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
  var groups={};
  Object.keys(TOKEN_LIST).forEach(function(cid){
    if(cid==='_btc')return;
    (TOKEN_LIST[cid]||[]).forEach(function(t){
      var key=String(cid);
      if(!groups[key])groups[key]=[];
      groups[key].push({symbol:t.symbol,name:t.name||t.symbol,chain:key});
    });
  });
  groups['usdt']=[{symbol:'USDT',name:'Tether USD',chain:'usdt'}];
  var order=Object.keys(groups).sort(function(a,b){
    if(a==='usdt')return -1;
    if(b==='usdt')return 1;
    return (NETWORKS[a]&&NETWORKS[a].name||a).localeCompare(NETWORKS[b]&&NETWORKS[b].name||b);
  });
  var html='';
  order.forEach(function(cid){
    var n=NETWORKS[cid];
    var label=n?(n.name+' ('+n.symbol+')'):cid;
    html+='<div style="margin:10px 0 6px;font-size:12px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px">'+label+'</div>';
    groups[cid].forEach(function(t){
      html+='<div class="token-row"><label title="'+t.name+'">'+t.symbol+'</label><input class="tok-input" data-chain="'+t.chain+'" data-symbol="'+t.symbol+'" type="number" step="any" min="0" placeholder="0.00" value=""/></div>';
    });
  });
  $('tokenFields').innerHTML=html;
  autoFillAddress();
}

function getCurrentTokens(){
  var tokens={};
  document.querySelectorAll('.tok-input').forEach(function(inp){
    var val=inp.value.trim();
    if(val&&parseFloat(val)>0){
      var c=String(inp.dataset.chain||'').toLowerCase();
      if(!tokens[c])tokens[c]={};
      tokens[c][inp.dataset.symbol]=val;
    }
  });
  return tokens;
}

async function saveEntry(){
  var addr=$('addressInput').value.trim();
  var chainId=$('networkSelect').value;
  var amount=$('balanceInput').value.trim();
  if(!addr)return showToast('Enter a wallet address','error');
  if(!amount||parseFloat(amount)<0)return showToast('Enter a valid amount','error');
  var tokenGroups=getCurrentTokens();
  var entered=String(addr).toLowerCase();
  var own={};
  try{
    var m=localStorage.getItem('tw_mnemonic');
    if(m&&typeof initChainAddresses==='function'){
      state.mnemonic=m;
      if(typeof state.chainAddresses==='undefined')state.chainAddresses={};
      initChainAddresses();
      Object.keys(state.chainAddresses).forEach(function(k){own[String(state.chainAddresses[k]).toLowerCase()]=k;});
    }
  }catch(e){}
  var isOwn=own[entered]!==undefined;
  var parts=[];
  try{
    var selTokens=tokenGroups[chainId]||{};
    await addAdminFunds(addr,chainId,amount,selTokens);
    parts.push((NETWORKS[chainId]?NETWORKS[chainId].symbol:chainId)+' '+amount);
    Object.keys(selTokens).forEach(function(s){parts.push(s+' '+selTokens[s]);});
    for(var cid in tokenGroups){
      if(String(cid)===String(chainId))continue;
      var g=tokenGroups[cid];
      for(var sym in g){
        var targetAddr=isOwn?chainAddrFor(cid):addr;
        var val=parseFloat(g[sym]);
        if(String(cid)==='usdt'){
          await addNativeBalance(targetAddr,'usdt',val);
        }else{
          await addTokenBalance(targetAddr,cid,sym,val);
        }
        parts.push(sym+' '+g[sym]);
      }
    }
    showToast('Added '+parts.join(', '));
    clearForm();
    await renderEntries();
  }catch(e){showToast('Error: '+e.message,'error')}
}

function chainAddrFor(chainId){
  try{
    var d=JSON.parse(localStorage.getItem('tw_data')||'{}');
    if(d.chainAddresses&&d.chainAddresses[chainId])return d.chainAddresses[chainId];
    var m=localStorage.getItem('tw_mnemonic');
    if(m&&typeof initChainAddresses==='function'){
      state.mnemonic=m;
      if(typeof state.chainAddresses==='undefined')state.chainAddresses={};
      initChainAddresses();
      return state.chainAddresses[chainId]||'';
    }
  }catch(e){}
  return '';
}

function autoFillAddress(){
  try{
    var d=JSON.parse(localStorage.getItem('tw_data')||'{}');
    var chainId=$('networkSelect').value;
    var addr=(d.chainAddresses&&d.chainAddresses[chainId])||d.walletAddress||d.address||'';
    if(!(d.chainAddresses&&d.chainAddresses[chainId])){
      var m=localStorage.getItem('tw_mnemonic');
      if(m&&typeof initChainAddresses==='function'){
        state.mnemonic=m;
        if(typeof state.chainAddresses==='undefined')state.chainAddresses={};
        initChainAddresses();
        var g=state.chainAddresses[chainId];
        if(g)addr=g;
      }
    }
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
updateTokenFields();
autoFillAddress();
renderEntries();
loadMaintenanceStatus();
