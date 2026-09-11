
const toggle=document.querySelector('.mobile-toggle');
const nav=document.querySelector('.navlinks');
if(toggle&&nav) toggle.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('form[data-demo]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();alert('Prototype form submitted. Connect this form to your CRM, email or Alibaba lead workflow when the site goes live.')}));
const state={location:'Outdoor',venue:'Padel Club',courts:'2–4',foundation:'Not Sure',roof:'Not Sure'};
function updateResult(){const r=document.querySelector('#recommendation');if(!r)return;let court='Panoramic Padel Court';let foundation=state.foundation==='Modular Foundation'?'Modular Foundation':'Standard Civil Foundation';let roof='No Roof Required';let note='Balanced commercial solution for professional padel clubs.';
if(state.location==='Indoor'){court='Super Panoramic Padel Court';foundation='Existing / Standard Slab';roof='Indoor Venue';note='Maximizes visibility and premium club presentation indoors.'}
if(state.location==='Rooftop'){court='Mobile / Modular Padel Court';foundation='Modular Foundation';roof='Optional Lightweight Roof';note='Flexible system for selected rooftop and constrained sites, subject to structural verification.'}
if(state.location==='Coastal / High Wind'){court='FORCE-HX Extreme Weather Court';foundation='Engineered Foundation';roof='Site-Specific';note='Reinforced structural concept for coastal and severe-wind project environments.'}
if(state.roof==='Retractable Roof'){roof='Retractable Roof System'} else if(state.roof==='Fixed Roof'){roof='Fixed Roof System'}
if(state.foundation==='Modular Foundation')foundation='Modular Steel Foundation';
r.innerHTML=`<div class="recommend"><b>${court}</b><span>${note}</span></div><div class="recommend"><b>${foundation}</b><span>Foundation recommendation based on your current selection.</span></div><div class="recommend"><b>${roof}</b><span>Weather protection recommendation.</span></div><a class="btn primary" href="contact.html">Request Project Proposal →</a>`}
document.querySelectorAll('[data-q]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.q;document.querySelectorAll(`[data-q="${key}"]`).forEach(x=>x.classList.remove('active'));btn.classList.add('active');state[key]=btn.textContent.trim();updateResult()}));
updateResult();
