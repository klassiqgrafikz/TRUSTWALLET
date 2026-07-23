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
    navigateTo('dashboard');
  }
}
init();
