(function(){
 'use strict';
 const formId='XD-pakvMRutFV5VW272mlo86-BampgzRVraMENChmNI';
 const mount=document.getElementById('zf_div_'+formId),help=document.getElementById('inquiryHelp');
 if(!mount||!help)return;
 const status=help.querySelector('.inquiry-loading'),retry=help.querySelector('.inquiry-retry');
 let ready=false,timer;
 function waiting(){
  ready=false;mount.hidden=false;help.dataset.state='loading';status.hidden=false;
  status.textContent='Loading the inquiry form…';retry.hidden=true;
  clearTimeout(timer);
  timer=setTimeout(function(){
   if(ready)return;
   help.dataset.state='delayed';status.textContent='The embedded form is taking longer to load. Open it in a new tab, retry, or send your project by email.';retry.hidden=false;
   // Do not interrupt anyone who has already focused the embedded form.
   if(document.activeElement!==mount.querySelector('iframe'))mount.hidden=true;
  },15000);
 }
 window.addEventListener('message',function(event){
  const frame=mount.querySelector('iframe');
  if(!frame||event.source!==frame.contentWindow||event.origin!=='https://forms.zohopublic.com'||typeof event.data!=='string')return;
  const parts=event.data.split('|'),height=Number(parts[1]);
  if(parts[0]!==formId||![2,3].includes(parts.length)||!Number.isFinite(height)||height<=0)return;
  ready=true;clearTimeout(timer);mount.hidden=false;help.dataset.state='ready';status.hidden=true;retry.hidden=true;
  // Also handle resize in browsers that do not expose a global window.event.
  frame.style.height=(Math.floor(height)+15)+'px';
 });
 retry.addEventListener('click',function(){
  const frame=mount.querySelector('iframe');
  waiting();
  if(frame){frame.src=frame.src;}
  else {window.location.reload();}
 });
 waiting();
})();
