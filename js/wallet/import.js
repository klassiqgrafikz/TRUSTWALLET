let importMethod='mnemonic';
function setImportMethod(m){
  importMethod=m;
  $('importMnemonicBtn').className='btn '+(m==='mnemonic'?'btn-primary':'btn-outline')+' btn-sm';
  $('importPrivateBtn').className='btn '+(m==='private'?'btn-primary':'btn-outline')+' btn-sm';
  $('importMnemonicField').classList.toggle('hidden',m!=='mnemonic');
  $('importPrivateField').classList.toggle('hidden',m!=='private');
}

function importWallet(){
  showLoading('Importing...');
  try{
    let wallet;
    if(importMethod==='mnemonic'){
      const phrase=$('importMnemonicInput').value.trim().toLowerCase();
      if(!phrase||!(phrase.split(' ').length===12||phrase.split(' ').length===24)){hideLoading();showToast('Enter 12 or 24 words','error');return}
      wallet=deriveWallet(phrase);state.mnemonic=phrase;
    }else{
      const pk=$('importPrivateKeyInput').value.trim();if(!pk){hideLoading();showToast('Enter private key','error');return}
      try{wallet=new ethers.Wallet(pk)}catch(e){wallet=null}
      state.mnemonic='';
    }
    if(!wallet){hideLoading();showToast('Invalid credentials','error');return}
    state.walletName=$('importName').value||'My Wallet';state.password='';
    saveMnemonic(state.mnemonic);
    state.activity=[];
    initChainAddresses();
    sbUpsertWallet(wallet.address, state.walletName, state.chainId, state.chainAddresses).catch(function(){});
    saveToStorage();hideLoading();showToast('Wallet imported!','success');closeWalletModal();navigateTo('dashboard');
  }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}
