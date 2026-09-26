const toggle=document.querySelector('.mobile-toggle');
const nav=document.querySelector('.navlinks');
const siteNav=document.querySelector('.site-nav');
if(siteNav){
  const updateHeaderState=()=>siteNav.classList.toggle('is-scrolled',window.scrollY>18);
  updateHeaderState();
  window.addEventListener('scroll',updateHeaderState,{passive:true});
  const path=(window.location.pathname.split('/').pop()||'index.html').toLowerCase();
  let section='';
  if(/^(courts|panoramic|super-panoramic|mobile|force-hx)/.test(path)||window.location.pathname.includes('/padel-courts/')) section='courts';
  else if(/^(solutions|modular-foundation|roof)/.test(path)) section='solutions';
  else if(/^(projects|project-)/.test(path)) section='projects';
  else if(path==='insights.html'||/(guide|cost|dimensions|panoramic-vs)/.test(path)) section='blog';
  else if(/^(about|engineering|quality|resources)/.test(path)) section='about';
  const active=section&&siteNav.querySelector('[data-section="'+section+'"]');
  if(active){active.classList.add('is-active');active.querySelector('.nav-main')?.setAttribute('aria-current','page');}
}
if(toggle&&nav) toggle.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
});
document.querySelectorAll('.site-nav .has-dropdown>.nav-main').forEach(link=>{
  link.addEventListener('click',event=>{
    if(!window.matchMedia('(max-width: 900px)').matches) return;
    event.preventDefault();
    const item=link.parentElement;
    const opening=!item.classList.contains('submenu-open');
    document.querySelectorAll('.site-nav .submenu-open').forEach(openItem=>{
      if(openItem!==item){openItem.classList.remove('submenu-open');openItem.querySelector('.nav-main')?.setAttribute('aria-expanded','false');}
    });
    item.classList.toggle('submenu-open',opening);
    link.setAttribute('aria-expanded',String(opening));
  });
});
window.addEventListener('resize',()=>{
  if(window.innerWidth>900){
    nav?.classList.remove('open');
    toggle?.setAttribute('aria-expanded','false');
    document.querySelectorAll('.site-nav .submenu-open').forEach(item=>item.classList.remove('submenu-open'));
  }
});
// Legacy project selector links to the enquiry page.
const state={location:'Outdoor',venue:'Padel Club',courts:'2–4',foundation:'Not Sure',roof:'Not Sure'};
function updateResult(){const r=document.querySelector('#recommendation');if(!r)return;let court='Panoramic Padel Court';let foundation=state.foundation==='Modular Foundation'?'Modular Foundation':'Standard Civil Foundation';let roof='No Roof Required';let note='Balanced commercial solution for professional padel clubs.';
if(state.location==='Indoor'){court='Super Panoramic Padel Court';foundation='Existing / Standard Slab';roof='Indoor Venue';note='Maximizes visibility and premium club presentation indoors.'}
if(state.location==='Rooftop'){court='Mobile Padel Court';foundation='Modular Foundation';roof='Optional Lightweight Roof';note='Flexible system for selected rooftop and constrained sites, subject to structural verification.'}
if(state.location==='Coastal / High Wind'){court='Anti-Hurricane Padel Court — FORCE-HX Series';foundation='Engineered Foundation';roof='Site-Specific';note='Reinforced structural concept for coastal and severe-wind project environments.'}
if(state.roof==='Retractable Roof'){roof='Retractable Roof System'} else if(state.roof==='Fixed Roof'){roof='Fixed Roof System'}
if(state.foundation==='Modular Foundation')foundation='Modular Steel Foundation';
r.innerHTML=`<div class="recommend"><b>${court}</b><span>${note}</span></div><div class="recommend"><b>${foundation}</b><span>Foundation recommendation based on your current selection.</span></div><div class="recommend"><b>${roof}</b><span>Weather protection recommendation.</span></div><a class="btn primary" href="start-project.html#projectConfiguratorTitle">Request Project Proposal →</a>`}
document.querySelectorAll('[data-q]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.q;document.querySelectorAll(`[data-q="${key}"]`).forEach(x=>x.classList.remove('active'));btn.classList.add('active');state[key]=btn.textContent.trim();updateResult()}));
updateResult();

// Persistent WhatsApp actions used across legacy pages.
(function(){
  if(document.querySelector('.floating-contact-actions')) return;
  document.querySelector('.wa-float')?.remove();
  document.querySelector('.mobile-contact-dock')?.remove();
  document.body.classList.remove('has-mobile-contact');

  const href='https://wa.me/8613128265916?text=Hi%2C%20I%27m%20interested%20in%20a%20padel%20court%20project.';
  const actions=document.createElement('div');
  actions.className='floating-contact-actions';
  actions.setAttribute('role','group');
  actions.setAttribute('aria-label','SPORTENVO project enquiry options');
  actions.innerHTML=`
    <a class="floating-whatsapp" href="${href}" target="_blank" rel="noopener" aria-label="Chat with SPORTENVO">
      <img src="/assets/whatsapp-delivery.jpg" width="156" height="156" alt="">
    </a>
    <a class="floating-quote" href="/start-project.html?source=floating-project-cta#projectConfiguratorTitle">Start Project <span aria-hidden="true">&#8594;</span></a>`;
  document.body.appendChild(actions);
})();


// Anonymous GA4 enquiry funnel events for commercial project leads.
(function(){
  const rememberLeadIntent=(ctaText='',preserveExisting=false)=>{
    try{
      const existingPage=localStorage.getItem('sportenvo_lead_source_page')||'';
      const existingStarted=parseInt(localStorage.getItem('sportenvo_lead_started_at')||'0',10);
      const existingRecent=existingStarted&&Date.now()-existingStarted<2*60*60*1000;
      if(preserveExisting&&existingPage&&existingRecent) return;
      localStorage.setItem('sportenvo_lead_started_at',String(Date.now()));
      localStorage.setItem('sportenvo_lead_source_page',window.location.pathname+window.location.search);
      localStorage.setItem('sportenvo_lead_source_title',document.title);
      if(ctaText) localStorage.setItem('sportenvo_lead_source_cta',String(ctaText).slice(0,120));
    }catch(error){}
  };
  window.sportenvoRememberLeadIntent=rememberLeadIntent;

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:event.target?.parentElement;
    const link=target?.closest?.('a[href]');
    if(!link||typeof window.gtag!=='function') return;
    const rawHref=link.getAttribute('href')||'';
    let destination;
    try{destination=new URL(rawHref,window.location.href);}catch(error){return;}
    const path=destination.pathname.replace(/\/+$/,'');
    const visibleText=(link.textContent||link.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,120);
    const params={
      link_url:destination.href,
      link_text:visibleText,
      page_location:window.location.href,
      page_title:document.title
    };

    if(destination.origin===window.location.origin&&path.endsWith('/start-project.html')){
      rememberLeadIntent(visibleText);
      window.gtag('event','start_project_click',params);
      return;
    }

    if(destination.hostname==='forms.zohopublic.com'&&destination.pathname.includes('/SPORTENVOProjectInquiry/')){
      rememberLeadIntent(visibleText);
      window.gtag('event','project_form_external_open',params);
      window.gtag('event','request_quote_click',params);
      return;
    }

    if(destination.hostname==='wa.me'||destination.hostname==='api.whatsapp.com'){
      rememberLeadIntent(visibleText);
      window.gtag('event','contact_whatsapp_click',params);
      return;
    }

    if(destination.protocol==='mailto:'&&/sales@sportenvo\.com/i.test(destination.href)){
      rememberLeadIntent(visibleText);
      window.gtag('event','contact_email_click',params);
      return;
    }

    if(
      destination.origin===window.location.origin&&
      path.endsWith('/contact.html')&&
      /discuss|request|quote|proposal|project|contact/i.test(visibleText)
    ){
      rememberLeadIntent(visibleText);
      window.gtag('event','request_quote_click',params);
    }
  },{capture:true});
})();


// Canonical conversion handler for Zoho Forms PostMessage Tracking.
// The Zoho-generated tracking listener should call this function only on the Submit Form event.
(function(){
  window.sportenvoHandleZohoSubmit=function(meta){
    const now=Date.now();
    let started=0;
    let sourcePage='';
    let sourceTitle='';
    let sourceCta='';
    let sourceTag='';
    let utmSource='';
    let utmMedium='';
    let utmCampaign='';
    try{
      started=parseInt(localStorage.getItem('sportenvo_lead_started_at')||'0',10);
      sourcePage=localStorage.getItem('sportenvo_lead_source_page')||'';
      sourceTitle=localStorage.getItem('sportenvo_lead_source_title')||'';
      sourceCta=localStorage.getItem('sportenvo_lead_source_cta')||'';
      sourceTag=localStorage.getItem('sportenvo_lead_source_tag')||'';
      utmSource=localStorage.getItem('sportenvo_lead_utm_source')||'';
      utmMedium=localStorage.getItem('sportenvo_lead_utm_medium')||'';
      utmCampaign=localStorage.getItem('sportenvo_lead_utm_campaign')||'';
    }catch(error){}

    // Prevent duplicate conversion events from repeated postMessage callbacks.
    const dedupeKey='sportenvo_zoho_submit_'+String(started||Math.floor(now/60000));
    try{
      if(sessionStorage.getItem(dedupeKey)==='1') return;
      sessionStorage.setItem(dedupeKey,'1');
    }catch(error){}

    const params={
      form_name:'SPORTENVO Project Inquiry',
      page_location:window.location.href,
      page_title:document.title,
      lead_source_page:sourcePage,
      lead_source_title:sourceTitle,
      lead_source_cta:sourceCta,
      lead_source_tag:sourceTag,
      utm_source:utmSource,
      utm_medium:utmMedium,
      utm_campaign:utmCampaign
    };

    if(meta&&typeof meta==='object'){
      if(meta.form_alias) params.form_alias=String(meta.form_alias).slice(0,100);
      if(meta.event_name) params.zoho_event=String(meta.event_name).slice(0,100);
    }

    if(typeof window.gtag==='function'){
      window.gtag('event','project_form_submit',params);
      window.gtag('event','generate_lead',{
        currency:'USD',
        value:0,
        form_name:params.form_name,
        lead_source_page:sourcePage,
        lead_source_title:sourceTitle,
        lead_source_cta:sourceCta,
        lead_source_tag:sourceTag,
        utm_source:utmSource,
        utm_medium:utmMedium,
        utm_campaign:utmCampaign
      });
    }

    document.dispatchEvent(new CustomEvent('sportenvo:lead-submitted',{detail:params}));
  };
})();
