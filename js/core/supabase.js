/*
  === Supabase Setup ===
  1. Create project at https://supabase.com
  2. Run this SQL in the SQL Editor:

  CREATE TABLE wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT 'My Wallet',
    chain_id TEXT DEFAULT '1',
    chain_addresses JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT NOT NULL,
    chain_id TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    tokens JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(address, chain_id)
  );

  CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hash TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    chain_id TEXT NOT NULL,
    amount TEXT,
    symbol TEXT,
    gas_fee TEXT,
    type TEXT DEFAULT 'send',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_balances_address ON balances(address);
  CREATE INDEX idx_transactions_from ON transactions(from_address);
  CREATE INDEX idx_transactions_to ON transactions(to_address);

  3. Copy your project URL and anon key (Settings > API) to the config below.
  4. For production, configure RLS policies so users can only read/write their own data.
*/

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

function _sbConfigOk() {
  return SUPABASE_URL !== 'https://your-project.supabase.co' && SUPABASE_ANON_KEY !== 'your-anon-key';
}

function _sbHeaders() {
  return { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
}

function _sbUrl(path) {
  var base = SUPABASE_URL.replace(/\/+$/, '');
  return base + '/rest/v1' + path;
}

async function _sbFetch(path, opts) {
  opts = opts || {};
  if (!_sbConfigOk()) {
    console.warn('Supabase: configure SUPABASE_URL and SUPABASE_ANON_KEY in js/core/supabase.js');
    return null;
  }
  try {
    var res = await fetch(_sbUrl(path), { method: opts.method || 'GET', headers: Object.assign({}, _sbHeaders(), opts.headers || {}), body: opts.body || null });
    if (!res.ok) { var txt = await res.text(); throw new Error(res.status + ': ' + txt); }
    return res;
  } catch (e) { console.error('Supabase error:', e); throw e; }
}

async function sbGetBalances(address) {
  if (!address) return [];
  if (!_sbConfigOk()) return [];
  var res = await _sbFetch('/balances?address=eq.' + encodeURIComponent(address.toLowerCase()) + '&select=*');
  return res ? await res.json() : [];
}

async function sbUpsertBalance(address, chainId, balance, tokens) {
  return _sbFetch('/balances?on_conflict=address,chain_id', {
    method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ address: address.toLowerCase(), chain_id: String(chainId), balance: String(balance ?? '0'), tokens: tokens ?? {}, updated_at: new Date().toISOString() }),
  });
}

async function sbDeleteBalance(address, chainId) {
  var params = 'address=eq.' + encodeURIComponent(address.toLowerCase()) + '&chain_id=eq.' + encodeURIComponent(String(chainId));
  return _sbFetch('/balances?' + params, { method: 'DELETE' });
}

async function sbGetAllBalances() {
  if (!_sbConfigOk()) return [];
  var res = await _sbFetch('/balances?select=*&limit=5000');
  return res ? await res.json() : [];
}

async function sbDeleteAllBalances() {
  return _sbFetch('/balances', { method: 'DELETE' });
}

async function sbUpsertWallet(address, name, chainId, chainAddresses) {
  return _sbFetch('/wallets?on_conflict=address', {
    method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ address: address.toLowerCase(), name: name || 'My Wallet', chain_id: String(chainId || '1'), chain_addresses: chainAddresses || {} }),
  });
}

async function sbGetWallet(address) {
  if (!address) return null;
  var res = await _sbFetch('/wallets?address=eq.' + encodeURIComponent(address.toLowerCase()) + '&select=*');
  if (!res) return null;
  var rows = await res.json();
  return rows[0] || null;
}

async function sbInsertTransaction(tx) {
  return _sbFetch('/transactions', {
    method: 'POST', headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      hash: tx.hash, from_address: tx.from, to_address: tx.to || '', chain_id: String(tx.chainId),
      amount: tx.amount || '', symbol: tx.symbol || '', gas_fee: tx.gasFee || '',
      type: tx.type || 'send', created_at: new Date(tx.timestamp || Date.now()).toISOString(),
    }),
  });
}

async function sbGetTransactions(address, limit) {
  if (!address) return [];
  limit = limit || 50;
  var addr = address.toLowerCase();
  var res = await _sbFetch('/transactions?or=(from_address.eq.' + encodeURIComponent(addr) + ',to_address.eq.' + encodeURIComponent(addr) + ')&order=created_at.desc&limit=' + limit + '&select=*');
  return res ? await res.json() : [];
}
