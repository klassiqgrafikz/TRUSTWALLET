let cachedPrices={};
let lastPriceFetch=0;

const TOKEN_COIN_IDS=['tether','usd-coin','dai','wrapped-bitcoin','chainlink','uniswap','aave','pancakeswap','raydium','jupiter-exchange-solana'];

function getUniqueCoinIds(){
  const ids=new Set();
  Object.values(NETWORKS).forEach(n=>{if(n.coinGeckoId)ids.add(n.coinGeckoId)});
  TOKEN_COIN_IDS.forEach(id=>ids.add(id));
  return [...ids];
}

function updatePriceDisplays(){
  try{
    const el=document.getElementById('totalBalance');
    if(el&&cachedPrices.ethereum){
      const adminBal=getAdminNativeBalance?.(state?.wallet?.address,state?.chainId);
      if(adminBal!==null&&adminBal!==undefined){
        el.textContent=formatUsd(adminBal*cachedPrices.ethereum.usd);
      }
    }
  }catch{}
}

async function fetchLivePrices(){
  try{
    const ids=getUniqueCoinIds();
    if(ids.length===0)return;
    const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
    if(!r.ok)return;
    cachedPrices=await r.json();
    lastPriceFetch=Date.now();
    updatePriceDisplays();
  }catch(e){console.error('Price fetch failed:',e)}
}

function getPriceForChain(chainKey){
  const n=NETWORKS[chainKey];
  if(!n||!n.coinGeckoId||!cachedPrices[n.coinGeckoId])return null;
  return cachedPrices[n.coinGeckoId];
}

function getPriceByCoinId(coinId){
  if(!coinId||!cachedPrices[coinId])return null;
  return cachedPrices[coinId];
}

function getNetworkUsdValue(chainKey, nativeBalance){
  const price=getPriceForChain(chainKey);
  if(!price||nativeBalance===null||nativeBalance===undefined)return 0;
  return nativeBalance*price.usd;
}

function formatPrice(p){
  if(!p&&p!==0)return'--';
  if(p>=1)return'$'+p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(p>=0.01)return'$'+p.toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
  return'$'+p.toLocaleString('en-US',{minimumFractionDigits:6,maximumFractionDigits:6});
}

function formatChange(c){
  if(!c&&c!==0)return'';
  const s=c>=0?'+':'';
  return s+fmtNum(c,2)+'%';
}
