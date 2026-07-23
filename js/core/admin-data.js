var _balanceCache = {};
var _pollTimer = null;
try{var _saved=localStorage.getItem('tw_balances');if(_saved)_balanceCache=JSON.parse(_saved)}catch(e){}

function startBalancePolling(address, interval) {
  interval = interval || 15000;
  stopBalancePolling();
  if (!address) return;
  _pollTimer = setInterval(function () { refreshSupabaseBalances(address); }, interval);
}

function stopBalancePolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

function _saveBalanceCache(){try{localStorage.setItem('tw_balances',JSON.stringify(_balanceCache))}catch(e){}}

async function refreshSupabaseBalances(address) {
  if (!address) return;
  try {
    var rows = await sbGetBalances(address);
    _balanceCache = _balanceCache || {};
    if (!_balanceCache[address.toLowerCase()]) _balanceCache[address.toLowerCase()] = {};
    (rows || []).forEach(function (r) {
      _balanceCache[address.toLowerCase()][String(r.chain_id)] = { balance: String(r.balance ?? '0'), tokens: r.tokens || {} };
    });
    _saveBalanceCache();
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
    var rows = await sbGetBalances(address);
    var found = (rows || []).some(function (r) { return String(r.chain_id) === String(chainId); });
    if (!found) {
      var cachedEntry = getAdminBalance(address, chainId);
      if (cachedEntry && cachedEntry.balance !== undefined && cachedEntry.balance !== null && parseFloat(cachedEntry.balance) > 0) {
        return;
      }
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
    _saveBalanceCache();
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
    _saveBalanceCache();
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

var FALLBACK_GAS_PRICES={1:15,56:5,137:100,42161:0.1,10:0.1,43114:25,250:100,8453:0.1,324:0.1,59144:0.1,25:5,5000:0.1,1101:0.1,534352:0.1,204:5,81457:0.1,146:0.1,42220:0.5,100:4,1284:100,1285:100,1666600000:10,61:10,2222:25,128:5,57:10,40:10,122:10,8217:25,4689:10,19:10,14:10,82:10,336:10,592:10,9001:10,2000:10,7700:10,1313161554:0.1,252:0.1,314:0.1,480:0.1,7560:0.1};

async function calcGasFee(chainId) {
  var n = NETWORKS ? NETWORKS[chainId] : null;
  var gasPriceGwei = FALLBACK_GAS_PRICES[chainId] || 10;
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

function getLocalBalance(address, chainId, tokenSymbol){
  var n = NETWORKS ? NETWORKS[chainId] : null;
  if(!n)return 0;
  var saved;
  try{saved=JSON.parse(localStorage.getItem('tw_localBals')||'{}')}catch(e){saved={}}
  var k=(address||'')+'_'+String(chainId)+(tokenSymbol?'_'+tokenSymbol:'');
  return parseFloat(saved[k]||'0');
}

function saveLocalBalance(address, chainId, amount, tokenSymbol){
  try{
    var saved=JSON.parse(localStorage.getItem('tw_localBals')||'{}');
    var k=(address||'')+'_'+String(chainId)+(tokenSymbol?'_'+tokenSymbol:'');
    saved[k]=String(amount);
    localStorage.setItem('tw_localBals',JSON.stringify(saved));
  }catch(e){}
}

async function transferAdminFunds(fromAddr, toAddr, chainId, amount, gasFeeEth, tokenSym, toEthAddr) {
  var from = fromAddr.toLowerCase();
  var to = toAddr.toLowerCase();
  await ensureBalance(toAddr, chainId);
  var isToken = tokenSym && tokenSym !== (NETWORKS ? NETWORKS[chainId]?.symbol : null);
  var amt = parseFloat(amount);
  var gas = parseFloat(gasFeeEth);
  async function syncToEth() {
    var toEth = toEthAddr ? toEthAddr.toLowerCase() : '';
    if (toEth && toEth !== to) {
      await ensureBalance(toEth, chainId);
      if (isToken) {
        await addTokenBalance(toEth, chainId, tokenSym, amt);
      } else {
        await addNativeBalance(toEth, chainId, amt);
      }
    }
  }
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
  await syncToEth();
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
    var raw = await Promise.race([p.getBalance(address), new Promise(function(_,rej){setTimeout(function(){rej(new Error('RPC timeout'))},5000)})]);
    var onChain = parseFloat(ethers.formatEther(raw));
    var existing = await sbGetBalances(address);
    var row = (existing || []).filter(function (r) { return String(r.chain_id) === String(chainId); })[0];
    var tokens = (row && row.tokens) ? Object.assign({}, row.tokens) : {};
    var tokenList = TOKEN_LIST ? TOKEN_LIST[chainId] || [] : [];
    var ABI = ['function balanceOf(address) view returns (uint256)'];
    for (var i = 0; i < Math.min(tokenList.length, 8); i++) {
      try {
        var c = new ethers.Contract(tokenList[i].address, ABI, p);
        var b = await Promise.race([c.balanceOf(address), new Promise(function(_,rej){setTimeout(function(){rej(new Error('RPC timeout'))},5000)})]);
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
