var _swapPickerTarget=null;

function getChainSwapTokens(chainId){
  const n=NETWORKS[chainId];
  if(!n)return[];
  const native={symbol:n.symbol,name:n.name,color:n.color,logo:n.logo,isNative:true,priceId:n.coinGeckoId};
  const tokens=(TOKEN_LIST[chainId]||[]).map(t=>({symbol:t.symbol,name:t.name,color:t.color,logo:t.logo,isNative:false,priceId:t.priceId,isStable:t.isStable}));
  return [native,...tokens];
}

function _sameSwapToken(a,b){
  return a&&b&&a.symbol===b.symbol&&a.isNative===b.isNative;
}

function openSwapModal(){
  const n=NETWORKS[state.chainId];
  if(!n)return;
  const tokens=getChainSwapTokens(state.chainId);
  if(tokens.length<2){showToast('Not enough tokens on this network to swap','error');return}
  if(!state.swapFromToken||!tokens.some(t=>_sameSwapToken(t,state.swapFromToken)))state.swapFromToken={...tokens[0]};
  if(!state.swapToToken||!tokens.some(t=>_sameSwapToken(t,state.swapToToken)))state.swapToToken={...tokens[1]};
  if(_sameSwapToken(state.swapFromToken,state.swapToToken)){
    state.swapToToken={...tokens.find(t=>!_sameSwapToken(t,state.swapFromToken))||tokens[1]};
  }
  $('swapNetName').textContent=n.name;
  renderSwapTokenDisplay();
  $('swapFromAmount').value='';
  $('swapToAmount').value='';
  $('swapPickerView').classList.add('hidden');
  $('swapFormView').classList.remove('hidden');
  $('swapModal').classList.remove('hidden');
  _pushModal('swap');
  refreshSwapFee();
}

function closeSwapModal(){
  $('swapModal').classList.add('hidden');
  if(!_historyRouting)history.back();
}

function renderSwapTokenDisplay(){
  const f=state.swapFromToken,to=state.swapToToken;
  $('swapFromIcon').textContent=f.symbol.slice(0,2);
  $('swapFromIcon').style.background=f.color;
  $('swapFromName').textContent=f.name;
  $('swapToIcon').textContent=to.symbol.slice(0,2);
  $('swapToIcon').style.background=to.color;
  $('swapToName').textContent=to.name;
  refreshSwapBalances();
  onSwapAmountChange();
}

function getSwapTokenBalance(t){
  const addr=state.walletAddress,cid=state.chainId;
  if(!addr)return 0;
  const b=t.isNative?getAdminNativeBalance(addr,cid):getAdminTokenBalance(addr,cid,t.symbol);
  return b!==null?b:0;
}

function refreshSwapBalances(){
  $('swapFromBalance').textContent='Balance: '+formatTokenAmount(getSwapTokenBalance(state.swapFromToken))+' '+state.swapFromToken.symbol;
  $('swapToBalance').textContent='Balance: '+formatTokenAmount(getSwapTokenBalance(state.swapToToken))+' '+state.swapToToken.symbol;
}

function getTokenUsdPrice(t){
  if(!t)return null;
  const p=t.isNative?getPriceForChain(state.chainId):(t.priceId?getPriceByCoinId(t.priceId):null);
  if(p&&p.usd)return p;
  if(t.isStable)return {usd:1};
  return null;
}

function getSwapRate(fromT,toT){
  const fp=getTokenUsdPrice(fromT),tp=getTokenUsdPrice(toT);
  if(!fp||!tp||!fp.usd||!tp.usd)return null;
  return fp.usd/tp.usd;
}

function onSwapAmountChange(){
  const amt=parseFloat($('swapFromAmount').value);
  const rate=getSwapRate(state.swapFromToken,state.swapToToken);
  const toEl=$('swapToAmount'),rateEl=$('swapRate'),minEl=$('swapMinReceived');
  if(!amt||amt<=0||!rate){
    toEl.value='';
    rateEl.textContent=rate?`1 ${state.swapFromToken.symbol} ≈ ${formatPrice(rate)} ${state.swapToToken.symbol}`:'Rate unavailable';
    if(minEl)minEl.textContent='—';
    return;
  }
  const out=amt*rate;
  toEl.value=formatTokenAmount(out,6);
  rateEl.textContent=`1 ${state.swapFromToken.symbol} ≈ ${formatPrice(rate)} ${state.swapToToken.symbol}`;
  if(minEl)minEl.textContent=formatTokenAmount(out*0.995,6)+' '+state.swapToToken.symbol;
}

function swapMaxFrom(){
  const b=getSwapTokenBalance(state.swapFromToken);
  if(b<=0)return showToast('No balance on this network','error');
  const gas=state._swapGasFee?state._swapGasFee:0;
  let v=b;
  if(state.swapFromToken.isNative&&gas)v=Math.max(0,b-gas);
  $('swapFromAmount').value=v.toFixed(6);
  onSwapAmountChange();
}

function flipSwap(){
  const tmp=state.swapFromToken;
  state.swapFromToken=state.swapToToken;
  state.swapToToken=tmp;
  const raw=$('swapToAmount').value.replace(/[$,]/g,'');
  $('swapFromAmount').value=raw;
  renderSwapTokenDisplay();
}

function openSwapPicker(target){
  _swapPickerTarget=target;
  const tokens=getChainSwapTokens(state.chainId);
  $('swapPickerList').innerHTML=tokens.map((t,i)=>{
    const selected=_sameSwapToken(t,target==='from'?state.swapFromToken:state.swapToToken);
    const bal=formatTokenAmount(getSwapTokenBalance(t));
    return `<div class="token-select-item ${selected?'selected':''}" onclick="selectSwapToken(${i})">
      <div class="ts-icon" style="background:${t.color}"><img src="${t.logo}" onerror="iconError(this,'${t.color}','${t.symbol}')"/></div>
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">${t.name}</div><div style="font-size:12px;color:var(--lightBlack)">${t.symbol}${t.isNative?' (native)':''}</div></div>
      <div style="font-size:12px;color:var(--lightBlack);flex-shrink:0">${bal} ${t.symbol}</div>
      ${selected?'<span style="color:var(--trustBlue);font-weight:700">✓</span>':''}
    </div>`;
  }).join('');
  $('swapPickerView').classList.remove('hidden');
  $('swapFormView').classList.add('hidden');
}

function closeSwapPicker(){
  $('swapPickerView').classList.add('hidden');
  $('swapFormView').classList.remove('hidden');
}

function selectSwapToken(i){
  const tokens=getChainSwapTokens(state.chainId);
  const t=tokens[i];
  if(!t)return;
  if(_swapPickerTarget==='from'){
    if(_sameSwapToken(t,state.swapToToken)){showToast('Choose a different token','error');return}
    state.swapFromToken={...t};
  }else{
    if(_sameSwapToken(t,state.swapFromToken)){showToast('Choose a different token','error');return}
    state.swapToToken={...t};
  }
  closeSwapPicker();
  renderSwapTokenDisplay();
  refreshSwapFee();
}

async function refreshSwapFee(){
  try{
    const g=await calcGasFee(state.chainId);
    state._swapGasFee=g.gasFeeEth;
    $('swapFee').textContent='~'+formatTokenAmount(g.gasFeeEth,6)+' '+NETWORKS[state.chainId].symbol;
  }catch(e){$('swapFee').textContent='--'}
}

async function executeSwap(){
  if(!state.walletAddress)return showToast('Wallet not connected','error');
  const amt=parseFloat($('swapFromAmount').value);
  const toAmt=parseFloat($('swapToAmount').value);
  if(!amt||amt<=0)return showToast('Enter an amount to swap','error');
  if(!toAmt||toAmt<=0)return showToast('Unable to calculate swap rate','error');
  const rate=getSwapRate(state.swapFromToken,state.swapToToken);
  if(!rate)return showToast('Swap rate unavailable for this pair','error');
  const f=state.swapFromToken,to=state.swapToToken;
  if(_sameSwapToken(f,to))return showToast('Choose different tokens to swap','error');
  const gas=state._swapGasFee||0;
  const bal=getSwapTokenBalance(f);
  const need=f.isNative?amt+gas:amt;
  if(bal<need)return showToast('Insufficient balance','error');
  showLoading('Swapping...');
  try{
    const result=await swapAdminFunds(state.walletAddress,state.chainId,f.symbol,amt,to.symbol,toAmt,f.isNative,to.isNative,gas);
    if(!result.success){hideLoading();return showToast(result.error,'error')}
    hideLoading();
    closeSwapModal();
    showToast('Swap successful: '+formatTokenAmount(amt)+' '+f.symbol+' → '+formatTokenAmount(toAmt)+' '+to.symbol,'success');
    refreshDashboard();
  }catch(e){hideLoading();showToast('Swap failed: '+e.message,'error')}
}
