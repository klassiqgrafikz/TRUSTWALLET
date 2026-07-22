function lockWallet(){
  state.wallet=null;state.mnemonic='';state.password='';
  clearMnemonic();
  document.getElementById('screen-home').classList.remove('hidden');
  ['screen-dashboard','screen-send','screen-confirm','screen-receive','screen-txSuccess'].forEach(s=>$(s).classList.add('hidden'));
  showToast('Wallet locked','info');
}
