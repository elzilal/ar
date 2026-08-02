let watermarkStarted = false;

function startWatermark(studentName, phone){
  if(watermarkStarted) return; // منمنعش تكرار الحلقة لو اتنادت أكتر من مرة
  watermarkStarted = true;

  const wrap = document.getElementById('videoWrap');
  const wm = document.getElementById('watchWatermark');
  if(!wrap || !wm) return;

  wm.textContent = `${studentName || 'طالب'} - ${phone || ''}`;

  // الواتر مارك بيقف في مكان ثابت، وكل دقيقة بيقفز لمكان عشوائي تاني
  // بدل ما يفضل بيتحرك على طول. ده بيسهّل قراءة الاسم وبرضه يمنع
  // إن حد يغطي عليه بمكان ثابت لمدة طويلة.
  function moveToRandomSpot(){
    const boxW = wrap.clientWidth;
    const boxH = wrap.clientHeight;
    const wmW = wm.offsetWidth || 140;
    const wmH = wm.offsetHeight || 30;

    const maxX = Math.max(0, boxW - wmW);
    const maxY = Math.max(0, boxH - wmH);

    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    wm.style.transform = `translate(${x}px, ${y}px)`;
  }

  moveToRandomSpot();
  setInterval(moveToRandomSpot, 60000); // كل دقيقة (60000 مللي ثانية)
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
