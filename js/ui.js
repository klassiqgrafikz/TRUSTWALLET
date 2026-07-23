function switchTab(btn,tab){
  document.querySelectorAll('.wallet-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  $('mobileView').style.display=tab==='mobile'?'flex':'none';
  $('extensionView').style.display=tab==='extension'?'flex':'none';
}

function updateThemeIcons(isDark){
  const icon=isDark?'🌙':'☀️';
  ['themeIcon','themeIconMain','themeIconMobile','themeIconMenu'].forEach(function(id){var e=$(id);if(e)e.textContent=icon});
}
function toggleTheme(){
  document.body.classList.toggle('dark');
  const isDark=document.body.classList.contains('dark');
  updateThemeIcons(isDark);
  try{localStorage.setItem('tw_theme',isDark?'dark':'light')}catch{}
}

const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08,rootMargin:'0px 0px -40px 0px'});
function initAnimations(){document.querySelectorAll('.fade-up').forEach(el=>obs.observe(el))}

function scrambleText(el){
  const target=el.getAttribute('data-text')||el.textContent;
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?';
  el.innerHTML='';
  const spans=[];
  for(let i=0;i<target.length;i++){
    const s=document.createElement('span');
    s.className='char';
    s.textContent=target[i]===' '?'\u00A0':target[i];
    el.appendChild(s);
    spans.push({el:s,final:target[i]===' '?'\u00A0':target[i]});
  }
  let step=0;
  const maxSteps=target.length*2;
  const iv=setInterval(()=>{
    spans.forEach((sp,i)=>{
      if(step>i*1.5){
        sp.el.textContent=sp.final;
        sp.el.classList.remove('scrambling');
      }else if(step>i*1.5-3){
        sp.el.textContent=chars[Math.floor(Math.random()*chars.length)];
        sp.el.classList.add('scrambling');
      }
    });
    step++;
    if(step>maxSteps+5){clearInterval(iv);spans.forEach(sp=>{sp.el.textContent=sp.final;sp.el.classList.remove('scrambling')})}
  },40);
}
