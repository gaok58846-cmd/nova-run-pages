(()=>{
'use strict';

function create(options){
  const {root,storage,tr}=options;
  const overlay=root.querySelector('[data-select-overlay]');
  const dialog=overlay.querySelector('[data-select-dialog]');
  const title=overlay.querySelector('[data-select-title]');
  const list=overlay.querySelector('[data-select-list]');
  const closeButton=overlay.querySelector('[data-select-close]');
  const backdrop=overlay.querySelector('[data-select-backdrop]');
  const enhanced=new WeakMap();
  let current=null,currentTrigger=null,focusIndex=0,historyToken='',ignoreNextPop=false,refreshQueued=false,closeTimer=0;

  const visibleOptions=select=>Array.from(select.options).filter(option=>!option.hidden);
  const fieldTitle=select=>select.closest('.nr-form-field')?.querySelector('.nr-field-title')?.textContent?.trim()||select.getAttribute('aria-label')||'';
  const selectedText=select=>select.selectedOptions[0]?.textContent?.trim()||'';
  const canVibrate=()=>{const state=storage.settings();return state.vibration!==false&&!state.reducedMotion};

  function syncTrigger(select){
    const state=enhanced.get(select);
    if(!state)return;
    state.value.textContent=selectedText(select);
    state.button.setAttribute('aria-label',tr('selectOption',{name:fieldTitle(select)}));
    state.button.disabled=select.disabled;
    if(current===select)renderOptions();
  }

  function enhance(select){
    if(enhanced.has(select))return;
    select.classList.add('nr-native-select');
    select.tabIndex=-1;
    select.setAttribute('aria-hidden','true');
    const button=document.createElement('button');
    button.type='button';
    button.className='nr-select-trigger';
    button.setAttribute('aria-haspopup','listbox');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls',list.id);
    const value=document.createElement('span');
    value.className='nr-select-value';
    const arrow=document.createElement('span');
    arrow.className='nr-select-arrow';
    arrow.setAttribute('aria-hidden','true');
    button.append(value,arrow);
    select.insertAdjacentElement('afterend',button);
    enhanced.set(select,{button,value});
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open(select,button)});
    button.addEventListener('keydown',event=>{
      if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){
        event.preventDefault();
        open(select,button,event.key==='ArrowUp'?'last':'selected');
      }
    });
    select.addEventListener('change',()=>syncTrigger(select));
    select.addEventListener('input',()=>syncTrigger(select));
    syncTrigger(select);
  }

  function enhanceAll(){
    root.querySelectorAll('select[data-setting][data-custom-select]').forEach(enhance);
  }

  function renderOptions(preferred='selected'){
    if(!current)return;
    const options=visibleOptions(current);
    title.textContent=fieldTitle(current);
    list.textContent='';
    focusIndex=Math.max(0,options.findIndex(option=>option.value===current.value));
    if(preferred==='last')focusIndex=Math.max(0,options.length-1);
    options.forEach((option,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='nr-select-option';
      button.dataset.value=option.value;
      button.setAttribute('role','option');
      button.setAttribute('aria-selected',String(option.value===current.value));
      button.disabled=option.disabled;
      button.tabIndex=index===focusIndex?0:-1;
      const label=document.createElement('span');
      label.textContent=option.textContent.trim();
      const mark=document.createElement('i');
      mark.setAttribute('aria-hidden','true');
      button.append(label,mark);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();choose(option.value)});
      list.appendChild(button);
    });
  }

  function focusOption(index){
    const buttons=Array.from(list.querySelectorAll('.nr-select-option:not(:disabled)'));
    if(!buttons.length)return;
    const next=Math.max(0,Math.min(buttons.length-1,index));
    buttons.forEach((button,i)=>button.tabIndex=i===next?0:-1);
    focusIndex=next;
    buttons[next].focus({preventScroll:true});
  }

  function pushHistory(){
    try{
      historyToken=`nr-select-${Date.now().toString(36)}`;
      history.pushState({...history.state,nrSelectToken:historyToken},document.title);
    }catch(error){historyToken=''}
  }

  function open(select,trigger,preferred='selected'){
    if(current===select&&!overlay.hidden)return;
    if(current)close('replace',false);
    clearTimeout(closeTimer);
    current=select;
    currentTrigger=trigger;
    renderOptions(preferred);
    trigger.setAttribute('aria-expanded','true');
    overlay.hidden=false;
    overlay.classList.remove('is-closing');
    root.classList.add('select-open');
    pushHistory();
    requestAnimationFrame(()=>{
      overlay.classList.add('is-open');
      const selected=list.querySelector('[aria-selected="true"]');
      (selected||list.querySelector('.nr-select-option:not(:disabled)'))?.focus({preventScroll:true});
    });
    if(options.onOpen)options.onOpen(select);
  }

  function choose(value){
    if(!current)return;
    const option=visibleOptions(current).find(item=>item.value===value);
    if(!option||option.disabled)return;
    current.value=value;
    current.dispatchEvent(new Event('input',{bubbles:true}));
    current.dispatchEvent(new Event('change',{bubbles:true}));
    if(canVibrate()&&typeof navigator.vibrate==='function')navigator.vibrate(8);
    close('select');
  }

  function close(reason='dismiss',consumeHistory=true){
    if(!current&&overlay.hidden)return;
    clearTimeout(closeTimer);
    const trigger=currentTrigger;
    if(trigger)trigger.setAttribute('aria-expanded','false');
    overlay.classList.remove('is-open');
    overlay.classList.add('is-closing');
    root.classList.remove('select-open');
    const reduced=root.dataset.motion==='reduced';
    const finish=()=>{overlay.hidden=true;overlay.classList.remove('is-closing');if(trigger&&reason!=='settings-close'&&document.contains(trigger))trigger.focus({preventScroll:true})};
    if(reduced)finish();else closeTimer=setTimeout(finish,190);
    if(consumeHistory&&historyToken){
      try{if(history.state&&history.state.nrSelectToken===historyToken){ignoreNextPop=true;history.back()}}catch(error){}
    }
    historyToken='';
    current=null;
    currentTrigger=null;
    if(options.onClose)options.onClose(reason);
  }

  function refresh(select){
    if(select)syncTrigger(select);else enhancedSelects().forEach(syncTrigger);
  }
  function enhancedSelects(){return Array.from(root.querySelectorAll('select[data-setting][data-custom-select]')).filter(select=>enhanced.has(select))}
  function queueRefresh(){if(refreshQueued)return;refreshQueued=true;requestAnimationFrame(()=>{refreshQueued=false;enhanceAll();refresh()})}

  list.addEventListener('keydown',event=>{
    const enabled=Array.from(list.querySelectorAll('.nr-select-option:not(:disabled)'));
    const active=Math.max(0,enabled.indexOf(document.activeElement));
    if(event.key==='ArrowDown'){event.preventDefault();focusOption((active+1)%enabled.length)}
    else if(event.key==='ArrowUp'){event.preventDefault();focusOption((active-1+enabled.length)%enabled.length)}
    else if(event.key==='Home'){event.preventDefault();focusOption(0)}
    else if(event.key==='End'){event.preventDefault();focusOption(enabled.length-1)}
    else if(event.key==='Escape'&&current){event.preventDefault();close('escape')}
  });
  closeButton.addEventListener('click',()=>close('button'));
  backdrop.addEventListener('click',()=>close('backdrop'));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current){event.preventDefault();close('escape')}});
  addEventListener('popstate',()=>{if(ignoreNextPop){ignoreNextPop=false;return}if(current)close('history',false)});
  const observer=new MutationObserver(queueRefresh);
  root.querySelectorAll('select[data-setting]').forEach(select=>observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label']}));
  enhanceAll();

  function destroy(){close('destroy',false);observer.disconnect();clearTimeout(closeTimer)}
  return Object.freeze({enhanceAll,refresh,close,destroy,get open(){return!!current}});
}

globalThis.NovaRunSelectMenu=Object.freeze({create});
})();
