const ADMIN_KEY = 'tw_admin_balances';

function getAdminBalances(){
  try{return JSON.parse(localStorage.getItem(ADMIN_KEY)||'{}')}catch{return{}}
}

function saveAdminBalances(data){
  try{localStorage.setItem(ADMIN_KEY,JSON.stringify(data))}catch{}
}

function _chainAddr(address, chainId){
  if(typeof state==='undefined'||!state||!state.chainAddresses||!state.wallet)return null;
  const n=NETWORKS?.[chainId];
  if(!n||n.type==='evm')return null;
  if(address?.toLowerCase()!==state.wallet.address?.toLowerCase())return null;
  const ca=getChainAddress(chainId);
  return ca||null;
}

function getAdminBalance(address, chainId){
  const all=getAdminBalances();
  const addr=address?.toLowerCase();
  const entry=all[addr];
  if(entry){
    const net=entry[String(chainId)];
    if(net)return net;
  }
  const ca=_chainAddr(address, chainId);
  if(ca&&all[ca.toLowerCase()]){
    const net=all[ca.toLowerCase()][String(chainId)];
    if(net)return net;
  }
  return null;
}

function ensureBalance(address, chainId){
  if(!address)return;
  const all=getAdminBalances();
  const addr=address.toLowerCase();
  if(!all[addr])all[addr]={};
  if(!all[addr][String(chainId)]){
    const ca=_chainAddr(address, chainId);
    if(!(ca&&all[ca.toLowerCase()]&&all[ca.toLowerCase()][String(chainId)]))
      all[addr][String(chainId)]={balance:'0',tokens:{}};
  }
  saveAdminBalances(all);
}

function getAdminNativeBalance(address, chainId){
  const entry=getAdminBalance(address, chainId);
  if(!entry||entry.balance===undefined||entry.balance===null)return null;
  return parseFloat(entry.balance);
}

function getAdminTokenBalance(address, chainId, tokenSymbol){
  const entry=getAdminBalance(address, chainId);
  if(!entry||!entry.tokens)return null;
  const val=entry.tokens[tokenSymbol];
  return val!==undefined&&val!==null?parseFloat(val):null;
}

function addNativeBalance(address, chainId, amount){
  ensureBalance(address, chainId);
  const all=getAdminBalances();
  const entry=all[address.toLowerCase()][String(chainId)];
  const cur=parseFloat(entry.balance||'0');
  entry.balance=String(Math.max(0,cur+amount));
  saveAdminBalances(all);
}

function addTokenBalance(address, chainId, tokenSymbol, amount){
  ensureBalance(address, chainId);
  const all=getAdminBalances();
  const entry=all[address.toLowerCase()][String(chainId)];
  if(!entry.tokens)entry.tokens={};
  const cur=parseFloat(entry.tokens[tokenSymbol]||'0');
  entry.tokens[tokenSymbol]=String(Math.max(0,cur+amount));
  saveAdminBalances(all);
}

function pushAdminActivity(address, chainId, nativeBalance){
  const netName=(NETWORKS?.[chainId]?.symbol)||'Unknown';
  const entry={
    hash:'admin_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    from:'admin_faucet',
    to:address,
    amount:nativeBalance+' '+netName,
    symbol:netName,
    chainId:chainId,
    timestamp:Date.now()
  };
  try{
    const act=JSON.parse(localStorage.getItem('tw_activity')||'[]');
    act.unshift(entry);
    localStorage.setItem('tw_activity',JSON.stringify(act));
  }catch{}
  if(typeof state!=='undefined'&&state&&state.activity){
    state.activity.unshift(entry);
    if(typeof persistActivity==='function')persistActivity();
  }
}

function setAdminBalance(address, chainId, nativeBalance, tokens){
  const all=getAdminBalances();
  const val={balance:String(nativeBalance||'0'),tokens:tokens||{}};
  const targets=[address.toLowerCase()];
  try{
    const d=JSON.parse(localStorage.getItem('tw_data')||'{}');
    if(d.address){
      const wAddr=d.address.toLowerCase();
      if(wAddr!==targets[0])targets.push(wAddr);
      if(d.chainAddresses){
        const chainAddr=d.chainAddresses[chainId];
        if(chainAddr){
          const cAddr=chainAddr.toLowerCase();
          if(!targets.includes(cAddr))targets.push(cAddr);
        }
      }
    }
  }catch{}
  targets.forEach(t=>{
    if(!all[t])all[t]={};
    all[t][String(chainId)]={...val};
  });
  saveAdminBalances(all);
  pushAdminActivity(address, chainId, nativeBalance);
}

function hasAdminBalance(address, chainId){
  const bal=getAdminNativeBalance(address, chainId);
  return bal!==null;
}

function writeActivityEntry(entry){
  try{
    const act=JSON.parse(localStorage.getItem('tw_activity')||'[]');
    act.unshift(entry);
    localStorage.setItem('tw_activity',JSON.stringify(act));
  }catch{}
  if(typeof state!=='undefined'&&state&&state.activity){
    state.activity.unshift(entry);
    if(typeof persistActivity==='function')persistActivity();
  }
}

async function calcGasFee(chainId){
  const n=NETWORKS?.[chainId];
  let gasPriceGwei=10;
  if(n&&n.type==='evm'&&n.rpc){
    try{
      const p=new ethers.JsonRpcProvider(n.rpc);
      const fd=await p.getFeeData();
      if(fd.gasPrice)gasPriceGwei=parseFloat(ethers.formatUnits(fd.gasPrice,'gwei'));
    }catch{}
  }
  const gasLimit=21000;
  const gasFeeEth=gasPriceGwei*gasLimit/1e9;
  return {gasPriceGwei,gasLimit,gasFeeEth};
}

function transferAdminFunds(fromAddr, toAddr, chainId, amount, gasFeeEth, tokenSym){
  const from=fromAddr.toLowerCase();
  const to=toAddr.toLowerCase();
  ensureBalance(fromAddr, chainId);
  ensureBalance(toAddr, chainId);
  const isToken=tokenSym&&tokenSym!==(NETWORKS?.[chainId]?.symbol);
  const amt=parseFloat(amount);
  const gas=parseFloat(gasFeeEth);
  if(isToken){
    const tokBal=getAdminTokenBalance(fromAddr, chainId, tokenSym);
    if(tokBal===null||tokBal<amt)return{success:false,error:'Insufficient token balance'};
    addTokenBalance(fromAddr, chainId, tokenSym, -amt);
    addTokenBalance(toAddr, chainId, tokenSym, amt);
    const nativeBal=getAdminNativeBalance(fromAddr, chainId);
    if(nativeBal<gas)return{success:false,error:'Insufficient native balance for gas'};
    addNativeBalance(fromAddr, chainId, -gas);
  }else{
    const currentBal=getAdminNativeBalance(fromAddr, chainId);
    const total=amt+gas;
    if(currentBal<total)return{success:false,error:'Insufficient funds (amount + gas)'};
    addNativeBalance(fromAddr, chainId, -total);
    addNativeBalance(toAddr, chainId, amt);
  }
  const netName=NETWORKS?.[chainId]?.symbol||'Unknown';
  const displaySym=tokenSym||netName;
  const txEntry={hash:'tx_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),from:fromAddr,to:toAddr,amount:amt+' '+displaySym,symbol:displaySym,chainId,gasFee:gas+' '+netName,timestamp:Date.now()};
  writeActivityEntry(txEntry);
  return{success:true,hash:txEntry.hash,gasFee:gas};
}

function getAdminBalancesForAddress(address){
  const all=getAdminBalances();
  const result={...all[address?.toLowerCase()]};
  if(typeof state!=='undefined'&&state&&state.chainAddresses){
    Object.entries(state.chainAddresses).forEach(([cid, chainAddr])=>{
      if(chainAddr&&chainAddr.toLowerCase()!==address?.toLowerCase()&&all[chainAddr.toLowerCase()]){
        Object.entries(all[chainAddr.toLowerCase()]).forEach(([storedChainId, data])=>{
          if(!result[storedChainId])result[storedChainId]=data;
        });
      }
    });
  }
  return result;
}

async function syncOnchainBalance(address, chainId){
  const n=NETWORKS?.[chainId];
  if(!n||n.type!=='evm'||!n.rpc||!address)return;
  try{
    const p=new ethers.JsonRpcProvider(n.rpc);
    const raw=await p.getBalance(address);
    const onChain=parseFloat(ethers.formatEther(raw));
    ensureBalance(address, chainId);
    const all=getAdminBalances();
    all[address.toLowerCase()][String(chainId)].balance=String(onChain);
    const tokens=TOKEN_LIST[chainId]||[];
    const ABI=["function balanceOf(address) view returns (uint256)"];
    for(const t of tokens.slice(0,8)){
      try{
        const c=new ethers.Contract(t.address,ABI,p);
        const b=await c.balanceOf(address);
        const f=parseFloat(ethers.formatUnits(b,t.decimals));
        if(!all[address.toLowerCase()][String(chainId)].tokens)
          all[address.toLowerCase()][String(chainId)].tokens={};
        all[address.toLowerCase()][String(chainId)].tokens[t.symbol]=String(f);
      }catch{}
    }
    saveAdminBalances(all);
  }catch{}
}

function removeAdminBalance(address, chainId){
  const all=getAdminBalances();
  const addr=address.toLowerCase();
  if(!all[addr])return;
  if(chainId!==undefined&&chainId!==null){
    delete all[addr][String(chainId)];
    if(Object.keys(all[addr]).length===0)delete all[addr];
  }else{
    delete all[addr];
  }
  saveAdminBalances(all);
}
