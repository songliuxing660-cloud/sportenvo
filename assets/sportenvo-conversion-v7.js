(function(){
  'use strict';
  const isStart=/\/start-project\.html$/i.test(location.pathname);
  const isThanks=/\/thank-you\.html$/i.test(location.pathname);

  function send(name,params){
    if(typeof window.gtag!=='function') return;
    window.gtag('event',name,Object.assign({
      page_location:location.href,
      page_title:document.title
    },params||{}));
  }
  function leadContext(){
    let started=0,sourcePage='',sourceTitle='',sourceCta='',sourceTag='',utmSource='',utmMedium='',utmCampaign='';
    try{
      started=parseInt(localStorage.getItem('sportenvo_lead_started_at')||'0',10);
      sourcePage=localStorage.getItem('sportenvo_lead_source_page')||'';
      sourceTitle=localStorage.getItem('sportenvo_lead_source_title')||'';
      sourceCta=localStorage.getItem('sportenvo_lead_source_cta')||'';
      sourceTag=localStorage.getItem('sportenvo_lead_source_tag')||'';
      utmSource=localStorage.getItem('sportenvo_lead_utm_source')||'';
      utmMedium=localStorage.getItem('sportenvo_lead_utm_medium')||'';
      utmCampaign=localStorage.getItem('sportenvo_lead_utm_campaign')||'';
    }catch(e){}
    return {started,sourcePage,sourceTitle,sourceCta,sourceTag,utmSource,utmMedium,utmCampaign};
  }
  function recentLead(ctx){
    return !!(ctx.started && Date.now()-ctx.started<2*60*60*1000);
  }

  if(isStart){
    const entryParams=new URLSearchParams(location.search);
    const entrySource=(entryParams.get('source')||'').trim().slice(0,100);
    const utmSource=(entryParams.get('utm_source')||'').trim().slice(0,100);
    const utmMedium=(entryParams.get('utm_medium')||'').trim().slice(0,100);
    const utmCampaign=(entryParams.get('utm_campaign')||'').trim().slice(0,140);
    try{
      if(entrySource) localStorage.setItem('sportenvo_lead_source_tag',entrySource);
      if(utmSource) localStorage.setItem('sportenvo_lead_utm_source',utmSource);
      if(utmMedium) localStorage.setItem('sportenvo_lead_utm_medium',utmMedium);
      if(utmCampaign) localStorage.setItem('sportenvo_lead_utm_campaign',utmCampaign);
    }catch(e){}
    const ctx=leadContext();
    send('start_project_view',{
      form_name:'SPORTENVO Project Inquiry',
      lead_source_tag:ctx.sourceTag||entrySource,
      lead_source_page:ctx.sourcePage,
      lead_source_cta:ctx.sourceCta,
      utm_source:ctx.utmSource||utmSource,
      utm_medium:ctx.utmMedium||utmMedium,
      utm_campaign:ctx.utmCampaign||utmCampaign
    });

    window.addEventListener('message',function(event){
      if(event.origin!=='https://forms.zohopublic.com') return;
      let payload=event.data;
      let textPayload='';
      if(typeof payload==='string'){
        textPayload=payload;
        try{payload=JSON.parse(payload);}catch(e){}
      }else{
        try{textPayload=JSON.stringify(payload||{});}catch(e){}
      }

      let eventName='';
      if(payload&&typeof payload==='object'){
        eventName=String(
          payload.event_name||
          payload.eventName||
          payload.event||
          payload.zf_event||
          payload.zfEvent||
          ''
        );
      }
      const combined=(eventName+' '+textPayload).toLowerCase();
      if(!/(^|[^a-z])zf_submitform([^a-z]|$)/.test(combined) && !/submit form/.test(combined)) return;

      try{sessionStorage.setItem('sportenvo_form_submit_confirmed','1');}catch(e){}
      if(typeof window.sportenvoHandleZohoSubmit==='function'){
        window.sportenvoHandleZohoSubmit({
          event_name:'zf_submitform',
          form_alias:'SPORTENVO Project Inquiry'
        });
      }else{
        document.dispatchEvent(new CustomEvent('sportenvo:lead-submitted',{
          detail:{event_name:'zf_submitform',form_alias:'SPORTENVO Project Inquiry'}
        }));
      }
    },false);

    document.addEventListener('sportenvo:lead-submitted',function(){
      try{sessionStorage.setItem('sportenvo_form_submit_confirmed','1');}catch(e){}
      window.setTimeout(function(){
        if(location.pathname!='/thank-you.html'){
          location.href='/thank-you.html?submitted=1';
        }
      },120);
    },{once:true});
  }

  if(isThanks){
    const ctx=leadContext();
    let confirmed=false;
    try{confirmed=sessionStorage.getItem('sportenvo_form_submit_confirmed')==='1';}catch(e){}
    const viaParam=new URLSearchParams(location.search).get('submitted')==='1';
    const fromZoho=/^https:\/\/forms\.zohopublic\.com\//i.test(document.referrer||'');
    const recent=recentLead(ctx);
    const dedupeKey='sportenvo_thankyou_conversion_'+String(ctx.started||'direct');
    let already=false;
    try{already=sessionStorage.getItem(dedupeKey)==='1';}catch(e){}

    send('thank_you_view',{
      form_name:'SPORTENVO Project Inquiry',
      lead_source_page:ctx.sourcePage,
      lead_source_title:ctx.sourceTitle,
      lead_source_cta:ctx.sourceCta,
      lead_source_tag:ctx.sourceTag,
      utm_source:ctx.utmSource,
      utm_medium:ctx.utmMedium,
      utm_campaign:ctx.utmCampaign,
      conversion_confirmed:confirmed||viaParam||fromZoho
    });

    let submitAlreadyTracked=false;
    try{
      submitAlreadyTracked=sessionStorage.getItem('sportenvo_zoho_submit_'+String(ctx.started||Math.floor(Date.now()/60000)))==='1';
    }catch(e){}

    if(recent && (confirmed||viaParam||fromZoho) && !already && !submitAlreadyTracked){
      const params={
        form_name:'SPORTENVO Project Inquiry',
        lead_source_page:ctx.sourcePage,
        lead_source_title:ctx.sourceTitle,
        lead_source_cta:ctx.sourceCta,
        lead_source_tag:ctx.sourceTag,
        utm_source:ctx.utmSource,
        utm_medium:ctx.utmMedium,
        utm_campaign:ctx.utmCampaign
      };
      send('project_form_submit',params);
      send('generate_lead',Object.assign({currency:'USD',value:0},params));
      try{sessionStorage.setItem(dedupeKey,'1');}catch(e){}
    }

    try{sessionStorage.removeItem('sportenvo_form_submit_confirmed');}catch(e){}
  }
})();