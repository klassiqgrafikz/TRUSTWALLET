function saveToStorage() {
  try {
    localStorage.setItem('tw_data', JSON.stringify({
      walletAddress: state.walletAddress, name: state.walletName,
      chainId: state.chainId, chainAddresses: state.chainAddresses,
    }));
  } catch (e) {}
}

function saveMnemonic(phrase) {
  try { if (phrase) localStorage.setItem('tw_mnemonic', phrase); else localStorage.removeItem('tw_mnemonic'); } catch (e) {}
}

function clearMnemonic() {
  try { localStorage.removeItem('tw_mnemonic'); } catch (e) {}
}

function loadState() {
  try {
    var m = localStorage.getItem('tw_mnemonic');
    var d = localStorage.getItem('tw_data');
    if (m && d) {
      state.mnemonic = m;
      var data = JSON.parse(d);
      state.walletName = data.name || 'My Wallet';
      state.chainId = data.chainId || 1;
      if (data.chainAddresses && Object.keys(data.chainAddresses).length > 0) {
        state.chainAddresses = data.chainAddresses;
      } else {
        initChainAddresses();
      }
      state.walletAddress = data.walletAddress || state.chainAddresses[state.chainId] || '';
    }
  } catch (e) {}
}

function loadTheme() {
  try {
    var t = localStorage.getItem('tw_theme');
    if (t === 'dark') {
      document.body.classList.add('dark');
      var el = $('themeIcon');
      if (el) el.textContent = '\uD83C\uDF19';
      var el2 = $('themeIconMain');
      if (el2) el2.textContent = '\uD83C\uDF19';
    }
  } catch (e) {}
}
