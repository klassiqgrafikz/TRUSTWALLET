let importMethod='mnemonic';
function setImportMethod(m){
  importMethod=m;
  $('importMnemonicBtn').className='btn '+(m==='mnemonic'?'btn-primary':'btn-outline')+' btn-sm';
  $('importPrivateBtn').className='btn '+(m==='private'?'btn-primary':'btn-outline')+' btn-sm';
  $('importMnemonicField').classList.toggle('hidden',m!=='mnemonic');
  $('importPrivateField').classList.toggle('hidden',m!=='private');
}

function importWallet(){
  const pw=$('importPassword').value;if(pw.length<8)return showToast('Password must be 8+ characters','error');
  showLoading('Importing...');
  try{
    let wallet;
    if(importMethod==='mnemonic'){
      const phrase=$('importMnemonicInput').value.trim().toLowerCase();
      if(!phrase||!(phrase.split(' ').length===12||phrase.split(' ').length===24)){hideLoading();showToast('Enter 12 or 24 words','error');return}
      wallet=deriveWallet(phrase);state.mnemonic=phrase;
    }else{
      const pk=$('importPrivateKeyInput').value.trim();if(!pk){hideLoading();showToast('Enter private key','error');return}
      try{wallet=new ethers.Wallet(pk)}catch{wallet=null}
      state.mnemonic='';
    }
    if(!wallet){hideLoading();showToast('Invalid credentials','error');return}
    state.wallet=wallet;state.walletName=$('importName').value||'My Wallet';state.password=pw;
    saveMnemonic(state.mnemonic);state.activity=[];localStorage.setItem('tw_activity','[]');
    ensureBalance(wallet.address,1);syncOnchainBalance(wallet.address,1);
    saveToStorage();hideLoading();showToast('Wallet imported!','success');closeWalletModal();navigateTo('dashboard');
  }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}
