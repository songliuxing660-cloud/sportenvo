const quoteState={
  court:'Panoramic Court',
  quantity:'1 Court',
  foundation:'Existing / Concrete Base',
  roof:'No Roof'
};

function proposalType(){
  if(quoteState.court==='FORCE-HX') return 'Engineered High-Wind';
  if(quoteState.roof==='Retractable Roof') return 'Premium All-Season';
  if(quoteState.foundation==='Modular Steel Foundation'||quoteState.court==='Mobile / Modular') return 'Flexible Modular';
  if(quoteState.court==='Super Panoramic') return 'Premium Commercial';
  return 'Standard Commercial';
}

function scopeDescription(){
  const parts=[];
  if(quoteState.court==='FORCE-HX') parts.push('reinforced court concept for demanding wind environments');
  else if(quoteState.court==='Super Panoramic') parts.push('premium visibility-focused commercial court');
  else if(quoteState.court==='Mobile / Modular') parts.push('flexible commercial court for relocatable or reduced-civil-work projects');
  else parts.push('professional commercial panoramic court');
  if(quoteState.foundation==='Modular Steel Foundation') parts.push('with a modular steel foundation');
  else if(quoteState.foundation==='Need Recommendation') parts.push('with foundation selection to be reviewed');
  else if(quoteState.foundation==='Engineering Review') parts.push('with site-specific foundation engineering review');
  else parts.push('with an existing concrete base');
  if(quoteState.roof==='Retractable Roof') parts.push('and a retractable roof system');
  else if(quoteState.roof==='Fixed Roof') parts.push('and a fixed roof solution');
  else if(quoteState.roof==='Need Recommendation') parts.push('with roof recommendation pending');
  else parts.push('and no roof');
  return parts.join(' ') + '.';
}

function updateScope(){
  const t=document.getElementById('scopeTitle');
  if(!t) return;
  t.textContent=`${quoteState.court} · ${quoteState.quantity}`;
  document.getElementById('scopeSummary').textContent=scopeDescription();
  document.getElementById('scopeFoundation').textContent=quoteState.foundation;
  document.getElementById('scopeRoof').textContent=quoteState.roof;
  document.getElementById('scopeProposal').textContent=proposalType();
}

document.querySelectorAll('[data-est-group]').forEach(group=>{
  group.querySelectorAll('.est-option').forEach(btn=>btn.addEventListener('click',()=>{
    group.querySelectorAll('.est-option').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    quoteState[group.dataset.estGroup]=btn.dataset.value;
    updateScope();
  }));
});

function copyEstimatorToForm(){
  const map={court:'courtType',quantity:'quantity',foundation:'foundation',roof:'roof'};
  Object.entries(map).forEach(([key,id])=>{
    const el=document.getElementById(id);
    if(!el) return;
    const option=[...el.options].find(o=>o.value===quoteState[key]||o.text===quoteState[key]);
    if(option) el.value=option.value;
  });
}

document.getElementById('useConfig')?.addEventListener('click',()=>{
  copyEstimatorToForm();
  const form=document.getElementById('projectInquiryForm');
  if(form) form.scrollIntoView({behavior:'smooth',block:'start'});
});

// Apply a configuration only when explicitly requested. Keep subsequent form edits.
updateScope();
