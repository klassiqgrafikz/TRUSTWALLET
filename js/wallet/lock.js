function lockWallet(){
  state.walletAddress='';state.mnemonic='';state.password='';state.chainAddresses={};
  clearMnemonic();
  document.getElementById('screen-home').classList.remove('hidden');
  ['screen-dashboard','screen-send','screen-confirm','screen-receive','screen-txSuccess'].forEach(s=>$(s).classList.add('hidden'));
  showToast('Wallet locked','info');
  if(!_historyRouting)history.replaceState(null,'','#/');
}
