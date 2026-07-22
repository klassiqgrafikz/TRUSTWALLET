function buildAllTokenList(){
  const map={};
  Object.entries(NETWORKS).forEach(([id,n])=>{
    const key=String(id);
    const native={symbol:n.symbol,name:n.name,color:n.color,logo:n.logo,isNative:true,chainId:id,netName:n.name};
    map[key+'_native']=native;
    (TOKEN_LIST[id]||[]).forEach((t,i)=>{
      const k=key+'_'+t.symbol+'_'+i;
      map[k]={...t,chainId:id,isNative:false,netName:n.name};
    });
  });
  return Object.values(map);
}

function openTokenSelectModal(){
  const all=buildAllTokenList();
  let lastNet='';
  $('modalTokenList').innerHTML=all.map((t,i)=>{
    const header=t.netName!==lastNet?`<div style="padding:8px 12px;font-size:11px;font-weight:700;color:var(--lightBlack);text-transform:uppercase;letter-spacing:.5px;background:var(--bg,var(--baseWhite))">${t.netName}</div>`:'';
    lastNet=t.netName;
    return header+`<div class="token-select-item" onclick="selectSendToken(${i})"><div class="ts-icon" style="background:${t.color}"><img src="${t.logo}" onerror="this.style.display='none'"/></div><div><div style="font-weight:600;font-size:14px">${t.name}</div><div style="font-size:12px;color:var(--lightBlack)">${t.symbol}${t.isNative?' (native)':''}</div></div></div>`;
  }).join('');
  $('tokenSelectModal').classList.remove('hidden');
}
function closeTokenSelectModal(){$('tokenSelectModal').classList.add('hidden')}
function filterModalTokens(q){$('modalTokenList').querySelectorAll('.token-select-item').forEach(i=>{i.style.display=i.textContent.toLowerCase().includes(q.toLowerCase())?'':'none'})}
async function selectSendToken(i){
  const all=buildAllTokenList();
  const t=all[i];
  if(String(t.chainId)!==String(state.chainId)){
    state.chainId=t.chainId;
    await ensureBalance(state.wallet?.address,t.chainId);
    syncOnchainBalance(state.wallet?.address,t.chainId);
    refreshDashboard();
  }
  state.sendToken={symbol:t.symbol,name:t.name,color:t.color,logo:t.logo,isNative:t.isNative||false};
  $('sendTokenIcon').textContent=t.symbol.slice(0,2);$('sendTokenIcon').style.background=t.color;$('sendTokenName').textContent=t.name+' ('+t.symbol+')';
  refreshSendBalance();refreshSendFee();closeTokenSelectModal();
}
