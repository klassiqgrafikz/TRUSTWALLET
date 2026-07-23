async function init(){
  window.addEventListener('scroll',function(){$('header').classList.toggle('scrolled',window.scrollY>10);});
  populateChainTable();
  initAnimations();
  document.querySelectorAll('.scramble-text').forEach(function(el){scrambleText(el);});
  fetchLivePrices();
  setInterval(fetchLivePrices,60000);
  loadTheme();
  loadState();
  if(state.mnemonic){
    if(!state.chainAddresses||Object.keys(state.chainAddresses).length===0)initChainAddresses();
    if(!state.walletAddress)state.walletAddress=state.chainAddresses[state.chainId]||'';
    var ethAddr=deriveEthAddress(state.mnemonic);
    if(ethAddr)sbUpsertWallet(ethAddr, state.walletName, state.chainId, state.chainAddresses).catch(function(){});
    navigateTo('dashboard');
  }
}
init();
