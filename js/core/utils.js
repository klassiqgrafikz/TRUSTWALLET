const $=id=>document.getElementById(id);
function showToast(m,t='info'){$('toast').className='toast '+t;$('toast').textContent=m;$('toast').style.display='flex';setTimeout(()=>{$('toast').style.display='none'},3000)}
function showLoading(t='Loading...'){$('loadingText').textContent=t;$('loading').classList.remove('hidden')}
function hideLoading(){$('loading').classList.add('hidden')}
function closeMobileMenu(){$('screen-home')&&document.querySelector('.mobile-menu').classList.remove('open')}

function goHome(){
  if(state.wallet){navigateTo('dashboard');return}
  exitToHome();
}
function exitToHome(){
  document.getElementById('screen-home').classList.remove('hidden');
  ['screen-dashboard','screen-send','screen-confirm','screen-receive','screen-txSuccess'].forEach(s=>$(s).classList.add('hidden'));
  $('navLinks').style.display='';$('headerActions').style.display='';$('hamburgerBtn').style.display='';
  window.scrollTo(0,0);
}

function navigateTo(screen){
  const home=document.getElementById('screen-home');
  const isWallet=screen==='dashboard'||screen==='send'||screen==='confirm'||screen==='receive'||screen==='txSuccess';
  if(isWallet){
    home.classList.add('hidden');
    ['screen-dashboard','screen-send','screen-confirm','screen-receive','screen-txSuccess'].forEach(s=>$(s).classList.add('hidden'));
    $(screen==='dashboard'?'screen-dashboard':'screen-'+screen).classList.remove('hidden');
    $('navLinks').style.display='none';$('headerActions').style.display='none';$('hamburgerBtn').style.display='none';
  }else{
    $('navLinks').style.display='';$('headerActions').style.display='';$('hamburgerBtn').style.display='';
  }
  window.scrollTo(0,0);
  if(screen==='dashboard'&&state.wallet)refreshDashboard();
  if(screen==='receive')initReceiveScreen();
  if(screen==='send')initSendScreen();
}

function fmtNum(n,dec){return n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function formatTokenAmount(amount,maxDec=4){
  if(amount===null||amount===undefined||isNaN(amount))return'0';
  const n=parseFloat(amount);
  if(n===0)return'0';
  const min=Math.pow(10,-maxDec);
  if(n<min)return'<'+min.toFixed(maxDec);
  return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:maxDec});
}
function formatBalance(b,d=18){if(!b)return'0';const n=parseFloat(ethers.formatUnits(b,d));if(n===0)return'0';if(n<0.001)return'<0.001';if(n<1)return formatTokenAmount(n,4);if(n<1000)return formatTokenAmount(n,4);return formatTokenAmount(n,2)}
function formatUsd(a){return'$'+parseFloat(a||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
