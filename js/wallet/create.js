function generateMnemonic(){return ethers.Wallet.createRandom().mnemonic.phrase}
function deriveWallet(m,i){i=i||0;try{return ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(m),"m/44'/60'/0'/0/"+i)}catch(e){console.error(e);return null}}

function instantCreateWallet(){
  showLoading('Creating wallet...');
  try{
    var phrase=generateMnemonic();
    var wallet=deriveWallet(phrase);
    if(!wallet){hideLoading();showToast('Failed to create wallet','error');return}
    state.mnemonic=phrase;state.walletName='My Wallet';state.password='';
    state.activity=[];
    saveMnemonic(phrase);
    initChainAddresses();
    var ethAddr=wallet.address;
    sbUpsertWallet(ethAddr, state.walletName, state.chainId, state.chainAddresses).catch(function(){});
    saveToStorage();
    hideLoading();
    showToast('Wallet created!','success');
    navigateTo('dashboard');
  }catch(e){hideLoading();showToast('Error: '+e.message,'error')}
}

function openWalletModal(){
  $('walletModal').classList.remove('hidden');
  setImportMethod('mnemonic');
}
function closeWalletModal(){$('walletModal').classList.add('hidden')}
