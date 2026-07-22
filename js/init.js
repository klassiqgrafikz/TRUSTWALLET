async function init(){
  window.addEventListener('scroll',function(){$('header').classList.toggle('scrolled',window.scrollY>10);});
  populateChainTable();
  initAnimations();
  document.querySelectorAll('.scramble-text').forEach(function(el){scrambleText(el);});
  fetchLivePrices();
  setInterval(fetchLivePrices,60000);
  loadTheme();
  loadState();
  if(state.wallet){
    initChainAddresses();
    await refreshSupabaseBalances(state.wallet.address);
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');
    startBalancePolling(state.wallet.address,15000);
    navigateTo('dashboard');
  }
}
init();
