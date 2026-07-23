let cachedPrices={};
let lastPriceFetch=0;
let _priceFallbackUsed=false;

var FALLBACK_PRICES={ethereum:{usd:3500,usd_24h_change:0},binancecoin:{usd:600,usd_24h_change:0},'matic-network':{usd:0.5,usd_24h_change:0},avalanche:{usd:30,usd_24h_change:0},fantom:{usd:0.5,usd_24h_change:0},solana:{usd:150,usd_24h_change:0},tron:{usd:0.12,usd_24h_change:0},bitcoin:{usd:65000,usd_24h_change:0},dogecoin:{usd:0.1,usd_24h_change:0},litecoin:{usd:80,usd_24h_change:0},ripple:{usd:0.5,usd_24h_change:0},polkadot:{usd:6,usd_24h_change:0},cardano:{usd:0.4,usd_24h_change:0},cosmos:{usd:7,usd_24h_change:0},near:{usd:5,usd_24h_change:0},'the-open-network':{usd:5,usd_24h_change:0},sui:{usd:2,usd_24h_change:0},aptos:{usd:15,usd_24h_change:0},arbitrum:{usd:1,usd_24h_change:0},optimism:{usd:2,usd_24h_change:0},mantle:{usd:0.8,usd_24h_change:0},celo:{usd:0.8,usd_24h_change:0},gnosis:{usd:30,usd_24h_change:0},moonbeam:{usd:0.3,usd_24h_change:0},moonriver:{usd:12,usd_24h_change:0},injective:{usd:25,usd_24h_change:0},sei:{usd:0.3,usd_24h_change:0},osmosis:{usd:0.8,usd_24h_change:0},tether:{usd:1,usd_24h_change:0},'usd-coin':{usd:1,usd_24h_change:0},dai:{usd:1,usd_24h_change:0},'wrapped-bitcoin':{usd:65000,usd_24h_change:0},chainlink:{usd:14,usd_24h_change:0},uniswap:{usd:7,usd_24h_change:0},aave:{usd:150,usd_24h_change:0},pancakeswap:{usd:2.5,usd_24h_change:0},raydium:{usd:1.5,usd_24h_change:0},'jupiter-exchange-solana':{usd:1,usd_24h_change:0},'crypto-com-chain':{usd:0.1,usd_24h_change:0},'huobi-token':{usd:2,usd_24h_change:0},'okb':{usd:40,usd_24h_change:0},'theta-token':{usd:1.5,usd_24h_change:0},'velas':{usd:0.02,usd_24h_change:0},'tomochain':{usd:0.3,usd_24h_change:0},'thunder-token':{usd:0.01,usd_24h_change:0},'syscoin':{usd:0.1,usd_24h_change:0},'telos':{usd:0.2,usd_24h_change:0},'fuse-network':{usd:0.04,usd_24h_change:0},'klay-token':{usd:0.2,usd_24h_change:0},'iotex':{usd:0.02,usd_24h_change:0},'meter':{usd:0.5,usd_24h_change:0},'shiden':{usd:0.2,usd_24h_change:0},'astar':{usd:0.1,usd_24h_change:0},'evmos':{usd:0.05,usd_24h_change:0},'canto':{usd:0.1,usd_24h_change:0},'conflux-token':{usd:0.15,usd_24h_change:0},'boba-network':{usd:0.2,usd_24h_change:0},'harmony':{usd:0.02,usd_24h_change:0},'ethereum-classic':{usd:25,usd_24h_change:0},'metis-token':{usd:40,usd_24h_change:0},'flare-networks':{usd:0.02,usd_24h_change:0},'songbird':{usd:0.01,usd_24h_change:0},'algorand':{usd:0.15,usd_24h_change:0},'stellar':{usd:0.1,usd_24h_change:0},'tezos':{usd:0.8,usd_24h_change:0},'bitcoin-cash':{usd:350,usd_24h_change:0},'degen-base':{usd:0.01,usd_24h_change:0},'ronin':{usd:1,usd_24h_change:0},'avalanche-2':{usd:30,usd_24h_change:0},'core':{usd:0.5,usd_24h_change:0},'bittorrent':{usd:0.000001,usd_24h_change:0},'okt':{usd:20,usd_24h_change:0},'cube-chain':{usd:0.01,usd_24h_change:0},'defi-kingdoms':{usd:0.2,usd_24h_change:0},'q-protocol':{usd:1,usd_24h_change:0},'lisk':{usd:1,usd_24h_change:0},'quarkchain':{usd:0.01,usd_24h_change:0},'planq':{usd:0.05,usd_24h_change:0},'sonic-3':{usd:0.5,usd_24h_change:0},'frax':{usd:1,usd_24h_change:0},'filecoin':{usd:5,usd_24h_change:0},'coredaoorg':{usd:0.5,usd_24h_change:0},'oh-finance':{usd:0.5,usd_24h_change:0},'nahmii':{usd:0.1,usd_24h_change:0},'rei-network':{usd:0.1,usd_24h_change:0},'hoo-token':{usd:0.5,usd_24h_change:0}};

function _applyFallbackPrices(){
  if(!_priceFallbackUsed){_priceFallbackUsed=true;Object.assign(cachedPrices,FALLBACK_PRICES);lastPriceFetch=Date.now()}
}

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

const PRICE_PROXIES=['https://api.allorigins.win/raw?url=','https://corsproxy.org/?url='];

async function fetchLivePrices(){
  try{
    const ids=getUniqueCoinIds();
    if(ids.length===0)return;
    const url=`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
    for(let i=0;i<PRICE_PROXIES.length;i++){
      try{
        const r=await fetch(PRICE_PROXIES[i]+encodeURIComponent(url));
        if(r.ok){cachedPrices=await r.json();_priceFallbackUsed=false;lastPriceFetch=Date.now();updatePriceDisplays();return}
      }catch(e){}
    }
    throw new Error('All proxies failed');
  }catch(e){_applyFallbackPrices()}
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
