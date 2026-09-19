const toggle=document.querySelector('.mobile-toggle');
const nav=document.querySelector('.navlinks');
if(toggle&&nav) toggle.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
});
// Legacy project selector links to the enquiry page.
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

// ── WhatsApp Floating Button (global, injected into every page) ──
(function(){
  if(document.querySelector('.wa-float')) return;
  const wa = document.createElement('div');
  wa.className = 'wa-float';
  wa.innerHTML = `
    <span class="wa-tooltip">Chat on WhatsApp</span>
    <a class="wa-btn" href="https://wa.me/8613128265916?text=Hi%2C%20I%27m%20interested%20in%20a%20padel%20court%20project." target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L0 24l6.318-1.508A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.371l-.358-.213-3.75.895.952-3.651-.233-.374A9.772 9.772 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818zm5.365-7.308c-.294-.147-1.74-.858-2.01-.956-.27-.098-.466-.147-.663.147-.196.294-.76.956-.932 1.152-.171.196-.343.22-.637.073-.294-.147-1.24-.457-2.363-1.457-.873-.779-1.463-1.74-1.634-2.034-.171-.294-.018-.453.129-.6.132-.131.294-.343.44-.514.147-.171.196-.294.294-.49.098-.196.049-.368-.025-.514-.073-.147-.663-1.597-.908-2.187-.24-.573-.483-.495-.663-.504l-.564-.01c-.196 0-.514.073-.783.368s-1.028 1.004-1.028 2.45 1.053 2.842 1.2 3.038c.147.196 2.073 3.165 5.022 4.437.702.303 1.25.484 1.677.62.705.224 1.346.192 1.853.116.565-.084 1.74-.711 1.985-1.397.245-.686.245-1.274.171-1.397-.073-.122-.27-.196-.564-.343z"/>
      </svg>
    </a>`;
  document.body.appendChild(wa);
})();

// Keep enquiry actions visible when the mobile navigation is closed.
(function(){
  if(document.querySelector('.mobile-contact-dock')) return;
  const dock=document.createElement('div');
  dock.className='mobile-contact-dock';
  dock.setAttribute('role','group');
  dock.setAttribute('aria-label','Contact the SPORTENVO project team');
  const quote=document.createElement('a');
  quote.className='mobile-quote';
  const localForm=document.getElementById('projectQuoteForm') || document.querySelector('[id^="zf_div_"]');
  quote.href=localForm ? '#'+localForm.id : '/start-project.html#projectQuoteForm';
  quote.textContent=localForm ? 'Go to Inquiry Form' : 'Get a Quote';
  const whatsapp=document.createElement('a');
  whatsapp.className='mobile-whatsapp';
  whatsapp.href='https://wa.me/8613128265916?text=Hi%2C%20I%27m%20interested%20in%20a%20padel%20court%20project.';
  whatsapp.target='_blank';whatsapp.rel='noopener';whatsapp.textContent='WhatsApp';
  dock.append(quote,whatsapp);document.body.appendChild(dock);
  document.body.classList.add('has-mobile-contact');
})();
