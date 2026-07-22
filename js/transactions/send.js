function refreshSendFee(){
  const cid=state.chainId,n=NETWORKS[cid];
  calcGasFee(cid).then(g=>{$('gasPrice').textContent=formatTokenAmount(g.gasPriceGwei,1)+' Gwei';$('estGasFee').textContent='~'+formatTokenAmount(g.gasFeeEth,6)+' '+n.symbol}).catch(()=>{$('gasPrice').textContent='--';$('estGasFee').textContent='--'});
}

function refreshSendBalance(){
  const t=state.sendToken,addr=state.wallet.address,cid=state.chainId;
  if(t&&!t.isNative){
    const b=getAdminTokenBalance(addr,cid,t.symbol);
    $('sendBalance').textContent='Balance: '+formatTokenAmount(b!==null?b:0)+' '+t.symbol;
    return
  }
  const b=getAdminNativeBalance(addr,cid);
  $('sendBalance').textContent='Balance: '+formatTokenAmount(b!==null?b:0)+' '+NETWORKS[cid].symbol;
}

async function initSendScreen(){
  const n=NETWORKS[state.chainId];
  if(state._preselectToken){
    state.sendToken=state._preselectToken;
    delete state._preselectToken;
  }else{
    state.sendToken={symbol:n.symbol,name:n.name,color:n.color,logo:n.logo,isNative:true};
  }
  await ensureBalance(state.wallet.address,state.chainId);
  syncOnchainBalance(state.wallet.address,state.chainId);
  $('sendTokenIcon').textContent=state.sendToken.symbol.slice(0,2);
  $('sendTokenIcon').style.background=state.sendToken.color;
  $('sendTokenName').textContent=state.sendToken.name+' ('+state.sendToken.symbol+')';
  $('sendToAddress').value='';$('sendAmount').value='';
  $('sendAddressError').classList.add('hidden');
  const labels={evm:'0x... or ENS name',utxo:'Address (base58)',solana:'Solana address (base58)',tron:'T... (TRON address)',cosmos:'cosmos1...',near:'name.near or hex',ton:'TON address',sui:'0x... (Sui)',algo:'Algorand address',xlm:'Stellar address',osmo:'osmo1...'};
  $('sendToAddress').placeholder=labels[n.type]||'Chain address';
  refreshSendBalance();
  refreshSendFee();
}

function validateSendAddress(){
  const a=$('sendToAddress').value.trim(),e=$('sendAddressError');
  if(!a){e.classList.add('hidden');return true}
  const n=NETWORKS[state.chainId];
  if(n.type==='evm'){
    try{ethers.getAddress(a);e.classList.add('hidden');return true}catch{}
    if(/^0x[0-9a-fA-F]{40}$/.test(a)){e.classList.add('hidden');return true}
    e.textContent='Invalid EVM address';e.classList.remove('hidden');return false
  }
  if(n.type==='utxo'){
    if(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)||/^bc1[a-zA-Z0-9]{39,59}$/.test(a)||/^(D|A|L|M|X|bitcoincash:)[a-zA-Z0-9]{25,62}$/.test(a)){e.classList.add('hidden');return true}
    e.textContent='Invalid address';e.classList.remove('hidden');return false
  }
  if(n.type==='solana'){
    if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)){e.classList.add('hidden');return true}
    e.textContent='Invalid Solana address';e.classList.remove('hidden');return false
  }
  if(n.type==='tron'){
    if(/^T[a-zA-Z0-9]{33}$/.test(a)){e.classList.add('hidden');return true}
    e.textContent='Invalid TRON address';e.classList.remove('hidden');return false
  }
  e.classList.add('hidden');return true;
}

async function setMaxAmount(){
  const cid=state.chainId,t=state.sendToken,addr=state.wallet.address;
  let bal;
  if(t&&!t.isNative){const b=getAdminTokenBalance(addr,cid,t.symbol);bal=b!==null?b:0}else{const b=getAdminNativeBalance(addr,cid);bal=b!==null?b:0}
  if(bal<=0)return showToast('No balance on this network','error');
  if(t&&t.isNative){const gas=await calcGasFee(cid);bal=Math.max(0,bal-gas.gasFeeEth)}
  $('sendAmount').value=bal.toFixed(6);
}

async function prepareTransaction(){
  const to=$('sendToAddress').value.trim(),amt=$('sendAmount').value,n=NETWORKS[state.chainId],cid=state.chainId,t=state.sendToken;
  if(!to)return showToast('Enter address','error');if(!validateSendAddress())return;
  if(!amt||parseFloat(amt)<=0)return showToast('Enter amount','error');
  const tokenSym=t?t.symbol:n.symbol;
  let bal;
  if(t&&!t.isNative){const b=getAdminTokenBalance(state.wallet.address,cid,t.symbol);bal=b!==null?b:0}else{const b=getAdminNativeBalance(state.wallet.address,cid);bal=b!==null?b:0}
  if(bal<=0)return showToast('Insufficient balance','error');
  showLoading('Preparing...');
  try{
    const g=await calcGasFee(cid);
    if((!t||t.isNative)&&parseFloat(amt)+g.gasFeeEth>bal){hideLoading();return showToast('Insufficient funds (amount + gas)','error')}
    if(t&&!t.isNative&&parseFloat(amt)>bal){hideLoading();return showToast('Insufficient token balance','error')}
    if(parseFloat(amt)<=0){hideLoading();return showToast('Invalid amount','error')}
    hideLoading();
    $('confirmSummary').innerHTML=`<div class="tx-row"><span class="label">From</span><span class="value">${state.wallet.address.slice(0,10)}...${state.wallet.address.slice(-6)}</span></div><div class="tx-row"><span class="label">To</span><span class="value">${to.slice(0,10)}...${to.slice(-6)}</span></div><div class="tx-row"><span class="label">Amount</span><span class="value">${formatTokenAmount(amt)} ${tokenSym}</span></div><div class="tx-row"><span class="label">Network</span><span class="value">${n.name} <span style="font-size:11px;opacity:.6">(internal)</span></span></div><div class="tx-row"><span class="label">Gas Fee</span><span class="value">${formatTokenAmount(g.gasFeeEth,6)} ${n.symbol}</span></div>`;
    state._pendingTx={to,value:amt,symbol:tokenSym,amount:amt,chainId:cid,gasFeeEth:g.gasFeeEth,tokenSym:tokenSym};
    navigateTo('confirm');
  }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}

async function executeTransaction(){
  const tx=state._pendingTx;if(!tx)return;
  showLoading('Sending...');
  try{
    const result=await transferAdminFunds(state.wallet.address,tx.to,tx.chainId,tx.amount,tx.gasFeeEth,tx.tokenSym);
    if(!result.success){hideLoading();return showToast(result.error,'error')}
    hideLoading();
    $('txSuccessDetails').innerHTML=`<div class="tx-row"><span class="label">Hash</span><span class="value" style="font-size:11px">${result.hash}</span></div><div class="tx-row"><span class="label">Amount</span><span class="value">${formatTokenAmount(tx.amount)} ${tx.symbol}</span></div><div class="tx-row"><span class="label">Gas Fee</span><span class="value">${formatTokenAmount(tx.gasFeeEth,6)} ${NETWORKS[tx.chainId]?.symbol||tx.symbol}</span></div><div class="tx-row"><span class="label">Status</span><span class="value" style="color:#22C55E">Confirmed</span></div>`;
    navigateTo('txSuccess');
  }catch(e){hideLoading();showToast(e.code==='INSUFFICIENT_FUNDS'?'Insufficient funds':e.message,'error')}
}
