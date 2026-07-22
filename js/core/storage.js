function saveToStorage(){
  try{localStorage.setItem('tw_data',JSON.stringify({address:state.wallet?.address,name:state.walletName,chainId:state.chainId,chainAddresses:state.chainAddresses}))}catch{}
  persistActivity();
}

function persistActivity(){
  try{localStorage.setItem('tw_activity',JSON.stringify(state.activity||[]))}catch{}
}

function loadActivity(){
  try{
    const a=localStorage.getItem('tw_activity');
    if(a)state.activity=JSON.parse(a);
  }catch{}
}

function saveMnemonic(phrase){
  try{if(phrase)localStorage.setItem('tw_mnemonic',phrase);else localStorage.removeItem('tw_mnemonic')}catch{}
}

function clearMnemonic(){
  try{localStorage.removeItem('tw_mnemonic')}catch{}
}

function loadState(){
  try{
    const m=localStorage.getItem('tw_mnemonic');
    const d=localStorage.getItem('tw_data');
    if(m&&d){
      const data=JSON.parse(d);
      if(data.address){
        const wallet=deriveWallet(m);
        if(wallet&&wallet.address.toLowerCase()===data.address.toLowerCase()){
          state.wallet=wallet;state.walletName=data.name||'My Wallet';state.chainId=data.chainId||1;state.chainAddresses=data.chainAddresses||{};
        }
      }
    }
  }catch{}
  loadActivity();
}

function loadTheme(){
  try{
    const t=localStorage.getItem('tw_theme');
    if(t==='dark'){
      document.body.classList.add('dark');
      const el=$('themeIcon');if(el)el.textContent='🌙';
      const el2=$('themeIconMain');if(el2)el2.textContent='🌙';
    }
  }catch{}
}
