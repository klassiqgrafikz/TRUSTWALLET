function init(){
  window.addEventListener('scroll',()=>{$('header').classList.toggle('scrolled',window.scrollY>10)});
  populateChainTable();
  initAnimations();
  document.querySelectorAll('.scramble-text').forEach(el=>scrambleText(el));
  fetchLivePrices();
  setInterval(fetchLivePrices,60000);
  loadTheme();
  loadState();
  if(state.wallet){
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');
    navigateTo('dashboard');
  }
}
init();
