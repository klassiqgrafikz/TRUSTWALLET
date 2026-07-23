var _historyRouting=false;

function _getScreenState(){
  var s=history.state;
  if(s&&s.screen)return s.screen;
  return null;
}

function _pushScreen(screen,opts){
  if(_historyRouting)return;
  opts=opts||{};
  var state={screen:screen};
  var url='#/'+screen;
  if(opts.replace)history.replaceState(state,'',url);
  else history.pushState(state,'',url);
}

function _pushModal(modalName,extra){
  if(_historyRouting)return;
  var cur=_getScreenState();
  if(!cur)return;
  var state={screen:cur,modal:modalName};
  if(extra)Object.keys(extra).forEach(function(k){state[k]=extra[k]});
  var url='#/'+cur+'?modal='+modalName;
  history.pushState(state,'',url);
}

function _replaceModal(modalName,extra){
  if(_historyRouting)return;
  var cur=_getScreenState();
  if(!cur)return;
  var state={screen:cur,modal:modalName};
  if(extra)Object.keys(extra).forEach(function(k){state[k]=extra[k]});
  var url='#/'+cur+'?modal='+modalName;
  history.replaceState(state,'',url);
}

function _closeModalsOnBack(){
  $('networkModal').classList.add('hidden');
  $('tokenSelectModal').classList.add('hidden');
  $('walletPickerModal').classList.add('hidden');
  $('txDetailModal').classList.add('hidden');
  $('secretModal').classList.add('hidden');
  $('walletModal').classList.add('hidden');
}

window.addEventListener('popstate',function(e){
  if(_historyRouting)return;
  _historyRouting=true;
  try{
    var s=e.state;
    if(!s||!s.screen){
      _closeModalsOnBack();
      if(state.walletAddress){
        state.walletAddress='';state.mnemonic='';state.password='';state.chainAddresses={};
        clearMnemonic();
        document.getElementById('screen-home').classList.remove('hidden');
        ['screen-dashboard','screen-send','screen-confirm','screen-receive','screen-txSuccess'].forEach(function(s){$(s).classList.add('hidden')});
        $('navLinks').style.display='';$('headerActions').style.display='';$('hamburgerBtn').style.display='';
      }
      return;
    }
    if(s.screen==='home'){
      exitToHome();
      history.replaceState(null,'','#/');
      return;
    }
    _closeModalsOnBack();
    navigateTo(s.screen,true);
    if(s.modal==='txDetail'&&typeof s.txIndex==='number'){
      openTxDetail(s.txIndex,true);
    }
  }finally{_historyRouting=false}
});
