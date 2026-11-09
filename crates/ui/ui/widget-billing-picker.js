function installBillingPicker(config){
if(window.top!==window)return;
function parseAmount(text){
  if(typeof text!=='string'||text.length>512)return null;
  text=text.replace(/−/g,'-').replace(/[\u00a0\u202f]/g,' ');
  const matches=[...text.matchAll(/(-?)\s*(?:US\$|USD|\$)\s*(-?\d[\d., '\u2019]*)/g)];
  if(matches.length!==1)return null;
  const end=matches[0].index+matches[0][0].trimEnd().length;if(/[A-Za-z0-9_.]/.test(text.charAt(end)))return null;
  let raw=matches[0][2].trim().replace(/[ '\u2019]/g,''),negative=matches[0][1]==='-'||raw.startsWith('-');raw=raw.replace(/^-/,'');
  const dot=raw.lastIndexOf('.'),comma=raw.lastIndexOf(','),last=Math.max(dot,comma);let whole=raw,fraction='';
  if(last>=0&&raw.length-last-1<=2){whole=raw.slice(0,last);fraction=raw.slice(last+1);if(!/^\d{1,2}$/.test(fraction))return null;}
  if(!/^\d+$/.test(whole)&&!/^\d{1,3}(?:[.,]\d{3})+$/.test(whole))return null;
  whole=whole.replace(/[.,]/g,'').replace(/^0+(?=\d)/,'');if(whole.length>12)return null;
  return (negative?'-':'')+whole+'.'+fraction.padEnd(2,'0');
}
function selectorFor(element){
  if(element.id){const id='#'+CSS.escape(element.id);if(document.querySelectorAll(id).length===1)return id;}
  const testId=element.getAttribute('data-testid');if(testId){const candidate='[data-testid="'+CSS.escape(testId)+'"]';if(document.querySelectorAll(candidate).length===1)return candidate;}
  const parts=[];let current=element;
  while(current&&current!==document.documentElement&&parts.length<12){const siblings=[...current.parentElement.children].filter(v=>v.tagName===current.tagName);parts.unshift(current.tagName.toLowerCase()+':nth-of-type('+(siblings.indexOf(current)+1)+')');current=current.parentElement;}
  return parts.join(' > ');
}
const allowed=()=>location.protocol==='https:'&&(config.provider==='openai'?location.hostname==='platform.openai.com'&&location.pathname.startsWith('/settings/organization/billing'):config.provider==='stripe_mrr'?location.hostname==='dashboard.stripe.com'&&location.pathname.split('/').includes('billing'):['platform.claude.com','console.anthropic.com'].includes(location.hostname)&&location.pathname.startsWith('/settings/billing'));
let host,shadow,status,selectButton,selecting=false,lastSent=0,lastAmount='';
function report(amount,selector){const data={nonce:config.nonce,amount,currency:'USD',selector};try{location.href=location.origin+config.bridgePath+'?data='+encodeURIComponent(JSON.stringify(data));lastSent=Date.now();lastAmount=amount;}catch{}}
function attach(){
  if(host||!document.body||!allowed())return;
  host=document.createElement('div');host.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483647;';shadow=host.attachShadow({mode:'closed'});
  const panel=document.createElement('div');panel.style.cssText='width:280px;padding:16px;border-radius:14px;background:#202126;color:#fff;box-shadow:0 8px 40px #0006;font:13px/1.5 system-ui;border:1px solid #ffffff30';
  const title=document.createElement('strong');title.textContent=config.provider==='stripe_mrr'?'Atelier · Stripe MRR':'Atelier · Billing balance';panel.append(title);
  status=document.createElement('div');status.style.cssText='margin:8px 0;color:#d0d1d6';status.textContent=!config.selector?'Sign in, then click Select balance and choose the USD '+(config.provider==='stripe_mrr'?'MRR':'credit')+' amount.':'Connected. The selected amount refreshes every minute.';panel.append(status);
  const button=document.createElement('button');selectButton=button;button.textContent='Select balance';button.style.cssText='border:0;border-radius:8px;padding:8px 12px;background:#4d7dff;color:white;cursor:pointer;font:inherit';button.onclick=()=>{selecting=!selecting;button.textContent=selecting?'Cancel selection':'Select balance';status.textContent=selecting?'Click the amount on this page.':'Select a balance after signing in.'};panel.append(button);shadow.append(panel);document.body.append(host);
}
function sample(){
  attach();if(!allowed()){if(host)host.style.display='none';return}if(host)host.style.display='block';if(!config.selector||selecting)return;
  let node;try{node=document.querySelector(config.selector)}catch{}
  const amount=node&&parseAmount(node.innerText||node.textContent||'');
  if(!amount){if(status)status.textContent='Balance not found. Select the amount again after signing in.';return}
  if(status)status.textContent='Connected · '+amount+' USD. You can minimize this window.';
  if(amount!==lastAmount||Date.now()-lastSent>=30000)report(amount,config.selector);
}
document.addEventListener('click',event=>{
  if(!selecting||!allowed()||!host||event.target===host||!(event.target instanceof Element))return;
  event.preventDefault();event.stopImmediatePropagation();let selected=event.target,amount=parseAmount(selected.innerText||selected.textContent||'');
  for(let level=0;!amount&&level<3&&selected.parentElement&&selected.parentElement!==document.body;level++){selected=selected.parentElement;amount=parseAmount(selected.innerText||selected.textContent||'');}
  if(!amount){status.textContent='Select a single USD amount, such as $12.34.';return}
  const selector=selectorFor(selected);if(!selector||document.querySelectorAll(selector).length!==1){status.textContent='Select the balance amount more precisely.';return}
  config.selector=selector;selecting=false;selectButton.textContent='Select balance';report(amount,selector);sample();
},true);
window.addEventListener('DOMContentLoaded',sample);window.addEventListener('load',sample);setInterval(sample,5000);
}
installBillingPicker(config);
