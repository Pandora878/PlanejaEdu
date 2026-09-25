(function(){
  const map={
    'layers-3':'layers-3','arrow-right':'arrow-right','sparkles':'sparkles','presentation':'presentation','file-check-2':'file-check-2','list-checks':'list-checks','brain':'brain','gamepad-2':'gamepad-2','notebook-pen':'notebook-pen','accessibility':'accessibility','message-circle':'message-circle','lightbulb':'lightbulb','file-text':'file-text','bot':'bot','chrome':'chrome','arrow-left':'arrow-left','layout-dashboard':'layout-dashboard','users':'users','user-round':'user-round','clipboard-check':'clipboard-check','calendar-days':'calendar-days','panels-top-left':'panels-top-left','folder-open':'folder-open','settings':'settings','log-out':'log-out','menu':'menu','x':'x','heart-handshake':'heart-handshake','copy':'copy','chevron-left':'chevron-left','chevron-right':'chevron-right','clock-3':'clock-3','eye':'eye','hand':'hand','play':'play','printer':'printer','send':'send','volume-2':'volume-2','download':'download','check':'check','plus':'plus','wand-sparkles':'wand-sparkles'
  };
  function paint(){
    if(!window.lucide || !window.lucide.createIcons){ setTimeout(paint,120); return; }
    document.querySelectorAll('i.icon').forEach(el=>{
      const cls=[...el.classList].find(c=>c.startsWith('icon-')&&c!=='icon');
      if(!cls) return;
      const name=map[cls.slice(5)];
      if(name){el.setAttribute('data-lucide',name);el.classList.remove('icon');}
    });
    window.lucide.createIcons({attrs:{'stroke-width':2}});
  }
  window.addEventListener('DOMContentLoaded',paint);
  window.paintPlanejaIcons=paint;
})();
