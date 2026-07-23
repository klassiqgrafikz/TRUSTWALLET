const BASE58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const HEX='0123456789abcdef';
function hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h=h&h}return Math.abs(h)}
function seededRandom(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
function genBase58(seed,len){const r=seededRandom(seed);let a='';for(let i=0;i<len;i++)a+=BASE58[Math.floor(r()*BASE58.length)];return a}
function genHex(seed,len){const r=seededRandom(seed);let a='';for(let i=0;i<len;i++)a+=HEX[Math.floor(r()*16)];return a}
function generateChainAddress(chainKey,ethAddr){
  const seed=hashStr(ethAddr+chainKey);
  const net=NETWORKS[chainKey];if(!net)return ethAddr;
  switch(chainKey){
    case'btc':return'bc1q'+genBase58(seed+1,38);
    case'sol':return genBase58(seed+2,44);
    case'trx':return'T'+genHex(seed+3,33);
    case'doge':return'D'+genBase58(seed+4,33);
    case'ltc':return'M'+genBase58(seed+5,33);
    case'xrp':return genBase58(seed+6,34);
    case'ada':return'addr1'+genHex(seed+7,58);
    case'dot':return genBase58(seed+8,48);
    case'atom':return'cosmos1'+genBase58(seed+9,38);
    case'near':return genBase58(seed+10,40)+'.near';
    case'ton':return genBase58(seed+11,48);
    case'sui':return'0x'+genHex(seed+12,64);
    default:return ethAddr;
  }
}
function deriveEthAddress(m){
  try{return ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(m)).address}catch(e){return''}
}
function initChainAddresses(){
  if(!state.mnemonic)return;
  const ethAddr=deriveEthAddress(state.mnemonic);
  Object.keys(NETWORKS).forEach(k=>{state.chainAddresses[k]=generateChainAddress(k,ethAddr)});
  state.walletAddress=state.chainAddresses[state.chainId]||ethAddr;
}
function getChainAddress(chainKey){return state.chainAddresses[chainKey]||state.walletAddress||''}
