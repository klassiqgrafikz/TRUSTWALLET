function generateMnemonic(){return ethers.Wallet.createRandom().mnemonic.phrase}
function deriveWallet(m,i=0){try{return ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(m),"m/44'/60'/0'/0/"+i)}catch(e){console.error(e);return null}}

function openWalletModal(mode){
  $('walletModal').classList.remove('hidden');
  $('wizStep1').classList.remove('hidden');
  $('wizStep2').classList.add('hidden');
  $('wizStep3').classList.add('hidden');
  if(mode==='create'){
    $('walletModalTitle').textContent='Create New Wallet';
    $('walletModalDesc').textContent='Your Secret Recovery Phrase is the master key to your wallet.';
    $('createView').classList.remove('hidden');
    $('importView').classList.add('hidden');
    state.pendingMnemonic=generateMnemonic();
    renderMnemonic();
  }else{
    $('walletModalTitle').textContent='Import Wallet';
    $('walletModalDesc').textContent='Enter your recovery phrase or private key.';
    $('createView').classList.add('hidden');
    $('importView').classList.remove('hidden');
  }
}
function closeWalletModal(){$('walletModal').classList.add('hidden')}

function renderMnemonic(){
  const words=state.pendingMnemonic.split(' ');
  $('mnemonicDisplay').innerHTML=words.map((w,i)=>`<div class="mnemonic-word"><div class="num">${i+1}</div>${w}</div>`).join('');
}
function copyMnemonic(){navigator.clipboard.writeText(state.pendingMnemonic).then(()=>showToast('Copied!','success')).catch(()=>showToast('Failed','error'))}
function regenerateMnemonic(){state.pendingMnemonic=generateMnemonic();renderMnemonic()}

function confirmMnemonic(){
  $('wizStep1').style.display='none';
  $('wizStep2').classList.remove('hidden');
  const words=state.pendingMnemonic.split(' ');
  const shuffled=[...words].sort(()=>Math.random()-0.5);
  state.confirmWords=[];
  $('confirmSelection').innerHTML='';
  $('confirmWords').innerHTML=shuffled.map((w,i)=>`<div class="mnemonic-word" style="cursor:pointer" onclick="selectConfirmWord('${w}',this)"><div class="num">${i+1}</div>${w}</div>`).join('');
  $('confirmError').classList.add('hidden');
}

function selectConfirmWord(word,el){
  if(el.style.opacity==='0.4')return;
  el.style.opacity='0.4';el.style.pointerEvents='none';
  state.confirmWords.push(word);
  const chip=document.createElement('div');
  chip.className='mnemonic-word';chip.style.cssText='padding:8px 10px;font-size:12px';
  chip.textContent=word;
  chip.onclick=()=>{chip.remove();state.confirmWords=state.confirmWords.filter(w=>w!==word);el.style.opacity='1';el.style.pointerEvents='auto'};
  $('confirmSelection').appendChild(chip);
}

function verifyMnemonic(){
  if(JSON.stringify(state.confirmWords)===JSON.stringify(state.pendingMnemonic.split(' '))){
    $('wizStep2').classList.add('hidden');
    $('wizStep3').classList.remove('hidden');
  }else{
    $('confirmError').textContent='Words in wrong order. Try again.';$('confirmError').classList.remove('hidden');
  }
}

function validatePassword(){
  const pw=$('createPassword').value;const s=$('passwordStrength');
  if(pw.length<8){s.textContent='At least 8 characters';s.style.color='var(--lightBlack)';return}
  const score=[/[A-Z]/.test(pw),/[a-z]/.test(pw),/[0-9]/.test(pw)].filter(Boolean).length;
  s.textContent=score<=1?'Weak':score===2?'Medium':'Strong';
  s.style.color=score<=1?'#FF3B30':score===2?'#FF9500':'#22C55E';
}

function finalizeWallet(){
  const pw=$('createPassword').value;const pwc=$('createPasswordConfirm').value;
  if(pw.length<8)return showToast('Password must be 8+ characters','error');
  if(pw!==pwc)return showToast('Passwords do not match','error');
  showLoading('Creating wallet...');
  try{
    const wallet=deriveWallet(state.pendingMnemonic);
    if(!wallet){hideLoading();showToast('Failed to create wallet','error');return}
    state.wallet=wallet;state.walletName='My Wallet';state.mnemonic=state.pendingMnemonic;state.password=pw;
    saveMnemonic(state.mnemonic);state.activity=[];localStorage.setItem('tw_activity','[]');
    ensureBalance(wallet.address,1);syncOnchainBalance(wallet.address,1);
    saveToStorage();hideLoading();showToast('Wallet created!','success');closeWalletModal();navigateTo('dashboard');
  }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}
