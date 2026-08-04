async function init(){
  if (typeof maintenanceInit === 'function') maintenanceInit();
  window.addEventListener('scroll',function(){$('header').classList.toggle('scrolled',window.scrollY>10);});
  populateChainTable();
  initAnimations();
  document.querySelectorAll('.scramble-text').forEach(function(el){scrambleText(el);});
  fetchLivePrices();
  setInterval(fetchLivePrices,60000);
  loadTheme();
  loadState();
  if(state.mnemonic){
    initChainAddresses();
    if(!state.walletAddress)state.walletAddress=state.chainAddresses[state.chainId]||'';
    var ethAddr=deriveEthAddress(state.mnemonic);
    if(ethAddr)sbUpsertWallet(ethAddr, state.walletName, state.chainId, state.chainAddresses).catch(function(){});
    navigateTo('dashboard');
  }
}

function openSupportChat(){
  if(window.Tawk_API){
    try{
      if(typeof Tawk_API.show==='function')Tawk_API.show();
      if(typeof Tawk_API.open==='function')Tawk_API.open();
      return;
    }catch(e){}
  }
  window.open('https://embed.tawk.to/6a713a0c6299c31d47e71aab/default','_blank');
}
init();
