var _balanceCache = {};
var _pollTimer = null;

function startBalancePolling(address, interval) {
  interval = interval || 15000;
  stopBalancePolling();
  if (!address) return;
  _pollTimer = setInterval(function () { refreshSupabaseBalances(address); }, interval);
}

function stopBalancePolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

async function refreshSupabaseBalances(address) {
  if (!address) return;
  try {
    var rows = await sbGetBalances(address);
    _balanceCache = _balanceCache || {};
    if (!_balanceCache[address.toLowerCase()]) _balanceCache[address.toLowerCase()] = {};
    (rows || []).forEach(function (r) {
      _balanceCache[address.toLowerCase()][String(r.chain_id)] = { balance: String(r.balance ?? '0'), tokens: r.tokens || {} };
    });
  } catch (e) { console.warn('refreshSupabaseBalances error:', e); }
}

function getAdminBalance(address, chainId) {
  if (!_balanceCache) return null;
  var addr = address?.toLowerCase();
  var entry = _balanceCache[addr];
  if (entry) {
    var net = entry[String(chainId)];
    if (net) return net;
  }
  var ca = _chainAddr(address, chainId);
  if (ca && _balanceCache[ca.toLowerCase()]) {
    var net2 = _balanceCache[ca.toLowerCase()][String(chainId)];
    if (net2) return net2;
  }
  return null;
}

function getAdminNativeBalance(address, chainId) {
  var entry = getAdminBalance(address, chainId);
  if (!entry || entry.balance === undefined || entry.balance === null) return null;
  return parseFloat(entry.balance);
}

function getAdminTokenBalance(address, chainId, tokenSymbol) {
  var entry = getAdminBalance(address, chainId);
  if (!entry || !entry.tokens) return null;
  var val = entry.tokens[tokenSymbol];
  return val !== undefined && val !== null ? parseFloat(val) : null;
}

async function ensureBalance(address, chainId) {
  if (!address) return;
  try {
    var existing = await sbGetBalances(address);
    var found = (existing || []).some(function (r) { return String(r.chain_id) === String(chainId); });
    if (!found) {
      await sbUpsertBalance(address, chainId, '0', {});
    }
    await refreshSupabaseBalances(address);
  } catch (e) { console.warn('ensureBalance error:', e); }
}

async function setAdminBalance(address, chainId, nativeBalance, tokens) {
  var addr = address.toLowerCase();
  await sbUpsertBalance(addr, chainId, nativeBalance, tokens);
  var targets = [addr];
  try {
    var d = JSON.parse(localStorage.getItem('tw_data') || '{}');
    if (d.address) {
      var wAddr = d.address.toLowerCase();
      if (wAddr !== targets[0]) targets.push(wAddr);
      if (d.chainAddresses) {
        var chainAddr = d.chainAddresses[chainId];
        if (chainAddr) {
          var cAddr = chainAddr.toLowerCase();
          if (targets.indexOf(cAddr) === -1) targets.push(cAddr);
        }
      }
    }
  } catch (e) {}
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i];
    if (t !== addr) {
      await sbUpsertBalance(t, chainId, nativeBalance, tokens);
    }
  }
  await refreshSupabaseBalances(address);
  pushAdminActivity(address, chainId, nativeBalance);
}

async function addNativeBalance(address, chainId, amount) {
  var addr = address.toLowerCase();
  var existing = await sbGetBalances(addr);
  var row = (existing || []).filter(function (r) { return String(r.chain_id) === String(chainId); })[0];
  var cur = row ? parseFloat(row.balance || '0') : 0;
  var newBal = String(Math.max(0, cur + amount));
  await sbUpsertBalance(addr, chainId, newBal, (row && row.tokens) || {});
  if (_balanceCache) {
    if (!_balanceCache[addr]) _balanceCache[addr] = {};
    if (!_balanceCache[addr][String(chainId)]) _balanceCache[addr][String(chainId)] = {};
    _balanceCache[addr][String(chainId)].balance = newBal;
  }
}

async function addTokenBalance(address, chainId, tokenSymbol, amount) {
  var addr = address.toLowerCase();
  var existing = await sbGetBalances(addr);
  var row = (existing || []).filter(function (r) { return String(r.chain_id) === String(chainId); })[0];
  var tokens = (row && row.tokens) ? Object.assign({}, row.tokens) : {};
  var cur = parseFloat(tokens[tokenSymbol] || '0');
  tokens[tokenSymbol] = String(Math.max(0, cur + amount));
  var bal = row ? row.balance : '0';
  await sbUpsertBalance(addr, chainId, bal, tokens);
  if (_balanceCache) {
    if (!_balanceCache[addr]) _balanceCache[addr] = {};
    if (!_balanceCache[addr][String(chainId)]) _balanceCache[addr][String(chainId)] = { balance: bal, tokens: {} };
    _balanceCache[addr][String(chainId)].tokens = tokens;
  }
}

function _chainAddr(address, chainId) {
  if (typeof state === 'undefined' || !state || !state.chainAddresses || !state.wallet) return null;
  var n = NETWORKS ? NETWORKS[chainId] : null;
  if (!n || n.type === 'evm') return null;
  if (address?.toLowerCase() !== state.wallet.address?.toLowerCase()) return null;
  var ca = getChainAddress(chainId);
  return ca || null;
}

function hasAdminBalance(address, chainId) {
  var bal = getAdminNativeBalance(address, chainId);
  return bal !== null;
}

function getAdminBalancesForAddress(address) {
  if (!_balanceCache) return {};
  var result = Object.assign({}, _balanceCache[address?.toLowerCase()]);
  if (typeof state !== 'undefined' && state && state.chainAddresses) {
    var keys = Object.keys(state.chainAddresses);
    for (var i = 0; i < keys.length; i++) {
      var cid = keys[i];
      var chainAddr = state.chainAddresses[cid];
      if (chainAddr && chainAddr.toLowerCase() !== address?.toLowerCase() && _balanceCache[chainAddr.toLowerCase()]) {
        var chainEntries = _balanceCache[chainAddr.toLowerCase()];
        var chainKeys = Object.keys(chainEntries);
        for (var j = 0; j < chainKeys.length; j++) {
          var storedChainId = chainKeys[j];
          if (!result[storedChainId]) result[storedChainId] = chainEntries[storedChainId];
        }
      }
    }
  }
  return result;
}

async function pushAdminActivity(address, chainId, nativeBalance) {
  var netName = (NETWORKS ? NETWORKS[chainId]?.symbol : null) || 'Unknown';
  var entry = {
    hash: 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    from: 'admin_faucet', to: address, amount: nativeBalance + ' ' + netName,
    symbol: netName, chainId: chainId, type: 'admin_faucet', timestamp: Date.now(),
  };
  try { await sbInsertTransaction(entry); } catch (e) {}
  if (typeof state !== 'undefined' && state && state.activity) {
    state.activity.unshift({
      hash: entry.hash, from: 'admin_faucet', to: address,
      amount: entry.amount, symbol: netName, chainId: chainId, timestamp: Date.now(),
    });
  }
}

function writeActivityEntry(entry) {
  sbInsertTransaction(entry).catch(function () {});
  if (typeof state !== 'undefined' && state && state.activity) {
    state.activity.unshift({
      hash: entry.hash, from: entry.from, to: entry.to,
      amount: entry.amount, symbol: entry.symbol, chainId: entry.chainId,
      gasFee: entry.gasFee, timestamp: entry.timestamp || Date.now(),
    });
  }
}

async function calcGasFee(chainId) {
  var n = NETWORKS ? NETWORKS[chainId] : null;
  var gasPriceGwei = 10;
  if (n && n.type === 'evm' && n.rpc) {
    try {
      var p = new ethers.JsonRpcProvider(n.rpc);
      var fd = await p.getFeeData();
      if (fd.gasPrice) gasPriceGwei = parseFloat(ethers.formatUnits(fd.gasPrice, 'gwei'));
    } catch (e) {}
  }
  var gasLimit = 21000;
  var gasFeeEth = gasPriceGwei * gasLimit / 1e9;
  return { gasPriceGwei: gasPriceGwei, gasLimit: gasLimit, gasFeeEth: gasFeeEth };
}

async function transferAdminFunds(fromAddr, toAddr, chainId, amount, gasFeeEth, tokenSym) {
  var from = fromAddr.toLowerCase();
  var to = toAddr.toLowerCase();
  await ensureBalance(fromAddr, chainId);
  await ensureBalance(toAddr, chainId);
  var isToken = tokenSym && tokenSym !== (NETWORKS ? NETWORKS[chainId]?.symbol : null);
  var amt = parseFloat(amount);
  var gas = parseFloat(gasFeeEth);
  if (isToken) {
    var tokBal = getAdminTokenBalance(fromAddr, chainId, tokenSym);
    if (tokBal === null || tokBal < amt) return { success: false, error: 'Insufficient token balance' };
    await addTokenBalance(fromAddr, chainId, tokenSym, -amt);
    await addTokenBalance(toAddr, chainId, tokenSym, amt);
    var nativeBal = getAdminNativeBalance(fromAddr, chainId);
    if (nativeBal < gas) return { success: false, error: 'Insufficient native balance for gas' };
    await addNativeBalance(fromAddr, chainId, -gas);
  } else {
    var currentBal = getAdminNativeBalance(fromAddr, chainId);
    var total = amt + gas;
    if (currentBal < total) return { success: false, error: 'Insufficient funds (amount + gas)' };
    await addNativeBalance(fromAddr, chainId, -total);
    await addNativeBalance(toAddr, chainId, amt);
  }
  var netName = (NETWORKS ? NETWORKS[chainId]?.symbol : null) || 'Unknown';
  var displaySym = tokenSym || netName;
  var txEntry = {
    hash: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    from: fromAddr, to: toAddr, amount: amt + ' ' + displaySym, symbol: displaySym,
    chainId: chainId, gasFee: gas + ' ' + netName, type: 'send', timestamp: Date.now(),
  };
  await sbInsertTransaction(txEntry);
  if (typeof state !== 'undefined' && state && state.activity) {
    state.activity.unshift({
      hash: txEntry.hash, from: fromAddr, to: toAddr,
      amount: txEntry.amount, symbol: displaySym, chainId: chainId,
      gasFee: txEntry.gasFee, timestamp: Date.now(),
    });
  }
  return { success: true, hash: txEntry.hash, gasFee: gas };
}

async function syncOnchainBalance(address, chainId) {
  var n = NETWORKS ? NETWORKS[chainId] : null;
  if (!n || n.type !== 'evm' || !n.rpc || !address) return;
  try {
    var p = new ethers.JsonRpcProvider(n.rpc);
    var raw = await p.getBalance(address);
    var onChain = parseFloat(ethers.formatEther(raw));
    var existing = await sbGetBalances(address);
    var row = (existing || []).filter(function (r) { return String(r.chain_id) === String(chainId); })[0];
    var tokens = (row && row.tokens) ? Object.assign({}, row.tokens) : {};
    var tokenList = TOKEN_LIST ? TOKEN_LIST[chainId] || [] : [];
    var ABI = ['function balanceOf(address) view returns (uint256)'];
    for (var i = 0; i < Math.min(tokenList.length, 8); i++) {
      try {
        var c = new ethers.Contract(tokenList[i].address, ABI, p);
        var b = await c.balanceOf(address);
        var f = parseFloat(ethers.formatUnits(b, tokenList[i].decimals));
        tokens[tokenList[i].symbol] = String(f);
      } catch (e) {}
    }
    await sbUpsertBalance(address, chainId, String(onChain), tokens);
    await refreshSupabaseBalances(address);
  } catch (e) {}
}

async function removeAdminBalance(address, chainId) {
  try {
    if (chainId !== undefined && chainId !== null) {
      await sbDeleteBalance(address, chainId);
    } else {
      var rows = await sbGetBalances(address);
      for (var i = 0; i < (rows || []).length; i++) {
        await sbDeleteBalance(address, rows[i].chain_id);
      }
    }
    await refreshSupabaseBalances(address);
  } catch (e) {}
}
