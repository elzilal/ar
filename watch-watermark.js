// =========================================================
// watch-watermark.js
// Watermark متحرك (اسم الطالب + رقم الهاتف كامل) - حماية من التصوير/التسريب
// بيترتد رايح جاي وفوق وتحت جوه مربع الفيديو، وبيفضل ظاهر
// حتى لو الطالب كبّر الفيديو Fullscreen (لأننا بنعمل fullscreen
// على الـ wrapper كله مش على الـ iframe لوحده)
// =========================================================

let watermarkStarted = false;

function startWatermark(studentName, phone){
  if(watermarkStarted) return; // منمنعش تكرار الحلقة لو اتنادت أكتر من مرة
  watermarkStarted = true;

  const wrap = document.getElementById('videoWrap');
  const wm = document.getElementById('watchWatermark');
  if(!wrap || !wm) return;

  wm.textContent = `${studentName || 'طالب'} - ${phone || ''}`;

  let x = 16, y = 16;
  let dx = 1.1, dy = 0.85; // سرعة الحركة بالبكسل لكل فريم

  function tick(){
    const boxW = wrap.clientWidth;
    const boxH = wrap.clientHeight;
    const wmW = wm.offsetWidth || 140;
    const wmH = wm.offsetHeight || 30;

    x += dx;
    y += dy;

    if(x <= 0){ x = 0; dx = Math.abs(dx); }
    if(x + wmW >= boxW){ x = Math.max(0, boxW - wmW); dx = -Math.abs(dx); }
    if(y <= 0){ y = 0; dy = Math.abs(dy); }
    if(y + wmH >= boxH){ y = Math.max(0, boxH - wmH); dy = -Math.abs(dy); }

    wm.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// زرار fullscreen مخصص: بيكبّر الـ wrapper كله (فيديو + واتر مارك)
// بدل ما نسيب المتصفح يكبّر الـ iframe بس، عشان الاسم يفضل ظاهر
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('watchFsBtn')?.addEventListener('click', () => {
    const wrap = document.getElementById('videoWrap');
    if(!wrap) return;
    if(!document.fullscreenElement){
      (wrap.requestFullscreen || wrap.webkitRequestFullscreen || wrap.msRequestFullscreen)?.call(wrap);
    }else{
      document.exitFullscreen?.();
    }
  });
});
