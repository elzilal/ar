/* =========================================================
   الظلال — script.js
   ========================================================= */

/* ---------------- الوضع الفاتح / الغامق ---------------- */
(function initTheme(){
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  const saved = localStorage.getItem('alzilal-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');

  applyTheme(initial);

  if(themeToggle){
    themeToggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('alzilal-theme', next);
    });
  }

  function applyTheme(mode){
    if(mode === 'dark'){
      root.setAttribute('data-theme', 'dark');
      if(themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
    }else{
      root.removeAttribute('data-theme');
      if(themeToggle) themeToggle.setAttribute('aria-pressed', 'false');
    }
  }
})();

/* ---------------- قائمة الموبايل ---------------- */
(function initMobileMenu(){
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if(!menuToggle || !mobileMenu) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ---------------- تأثير الهيدر عند السكرول ---------------- */
(function initHeaderScroll(){
  const header = document.getElementById('siteHeader');
  if(!header) return;

  function onScroll(){
    if(window.scrollY > 12){
      header.classList.add('scrolled');
    }else{
      header.classList.remove('scrolled');
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ---------------- السنة في الفوتر ---------------- */
(function initFooterYear(){
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* ---------------- تحويل الطالب المسجّل دخول تلقائيًا من الصفحة الرئيسية لصفحته ----------------
   ملحوظة مهمة: الكود ده لازم يشتغل بس في index.html.
   الاعتماد القديم على وجود #coursesGrid كان غلط، لأن صفحات sec1/2/3.html
   عندها عنصر بنفس المعرّف (#coursesGrid) لغرض تاني تمامًا (شبكة كورسات الطالب).
   النتيجة كانت: listener تاني مستقل لـ onAuthStateChanged بيشتغل جنب اللي
   جوه sec*.html نفسه، وبيعمل window.location.replace حتى لو الطالب واقف
   صح في صفحته أصلاً — وده اللي كان بيسبب الريفرش المتكرر ودورة "تسجيل دخول".
   الفحص الصحيح: نتأكد إننا في index.html فعليًا عن طريق مسار الصفحة،
   مش بس وجود عنصر معين.
   ========================================================= */
(function redirectApprovedStudentFromHome(){
  const currentPage = window.location.pathname.split('/').pop();
  const isHomePage = currentPage === '' || currentPage === 'index.html';
  if(!isHomePage) return;

  const coursesGrid = document.getElementById('coursesGrid');
  if(!coursesGrid) return;
  if(typeof auth === 'undefined' || typeof db === 'undefined') return;

  auth.onAuthStateChanged(async (user) => {
    if(!user || !user.email || !user.email.endsWith('@elzilal-student.app')) return;
    try{
      const phone = user.email.replace('@elzilal-student.app', '');
      const snap = await db.collection('students').doc(phone).get();
      if(snap.exists && snap.data().status === 'approved'){
        const gradeToPage = { '1': 'sec1.html', '2': 'sec2.html', '3': 'sec3.html' };
        const target = gradeToPage[snap.data().grade];
        if(target && target !== currentPage) window.location.replace(target);
      }
    }catch(e){ console.error(e); }
  });
})();

/* ---------------- تحميل بيانات الصفحة الرئيسية من data.json + الكورسات من Firestore ---------------- */
(function loadHomeData(){
  const coursesGrid = document.getElementById('coursesGrid');
  const teacherBio = document.getElementById('teacherBio');
  const socialLinks = document.getElementById('socialLinks');

  // نحمّل الداتا بس في الصفحات اللي محتاجاها فعليًا
  if(!coursesGrid && !teacherBio && !document.getElementById('whyUsGrid')) return;

  // نفس الحماية: متحملش كورسات "الصفحة الرئيسية" (location == 'index')
  // على صفحات sec*.html حتى لو فيها عنصر #coursesGrid.
  const currentPage = window.location.pathname.split('/').pop();
  const isHomePage = currentPage === '' || currentPage === 'index.html';

  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      renderTeacher(data.teacher);
      renderWhyUs(data.whyUs);
      renderSocial(data.social);
    })
    .catch(err => console.error('حصل خطأ في تحميل بيانات الصفحة:', err));

  // الكورسات بتتحمل من Firestore (مش data.json) عشان تتضاف/تتعدل من لوحة الإدارة courses.html
  const gradeLabels = { '1': 'الصف الأول الثانوي', '2': 'الصف الثاني الثانوي', '3': 'الصف الثالث الثانوي' };

  function loadCoursesFromFirestore(){
    if(!coursesGrid || !isHomePage) return;
    if(typeof db === 'undefined'){
      coursesGrid.innerHTML = '<p class="loading-msg">تعذر تحميل الكورسات حاليًا</p>';
      return;
    }
    db.collection('courses')
      .where('location', '==', 'index')
      .where('active', '==', true)
      .get()
      .then(snap => {
        const courses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCourses(courses);
      })
      .catch(err => {
        console.error('حصل خطأ في تحميل الكورسات:', err);
        coursesGrid.innerHTML = '<p class="loading-msg">تعذر تحميل الكورسات حاليًا</p>';
      });
  }
  loadCoursesFromFirestore();

  function renderCourses(courses){
    if(!coursesGrid || !Array.isArray(courses)) return;
    if(courses.length === 0){
      coursesGrid.innerHTML = '<p class="empty-msg">لا توجد كورسات متاحة حاليًا</p>';
      return;
    }
    coursesGrid.innerHTML = courses.map(c => `
      <div class="course-card">
        ${c.image ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.title || '')}" class="course-card-img" onerror="this.style.display='none'">` : ''}
        <div class="course-card-body">
          <span class="course-grade">${escapeHtml(gradeLabels[c.grade] || '')}</span>
          <h3>${escapeHtml(c.title || '')}</h3>
          <div class="course-price">
            <span class="amount">${escapeHtml(String(c.price ?? ''))}</span>
            <span class="currency">${escapeHtml(c.currency || 'جنيه')}</span>
          </div>
          <a href="enroll.html?course=${encodeURIComponent(c.id)}" class="course-btn" data-course-id="${escapeHtml(c.id)}">اشترك الآن</a>
        </div>
      </div>
    `).join('');
  }

  function renderTeacher(teacher){
    if(!teacher) return;
    const nameEl = document.getElementById('teacherName');
    const roleEl = document.getElementById('teacherRole');
    const highlightEl = document.getElementById('teacherHighlight');

    if(nameEl && teacher.name) nameEl.textContent = teacher.name;
    if(roleEl && teacher.role) roleEl.textContent = teacher.role;
    if(highlightEl && teacher.highlight) highlightEl.textContent = teacher.highlight;

    if(teacherBio && Array.isArray(teacher.bio)){
      teacherBio.innerHTML = teacher.bio.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }
  }

  function renderWhyUs(whyUs){
    const whyUsGrid = document.getElementById('whyUsGrid');
    if(!whyUsGrid || !whyUs) return;

    const eyebrowEl = document.getElementById('whyUsEyebrow');
    const titleEl = document.getElementById('whyUsTitle');
    const subtitleEl = document.getElementById('whyUsSubtitle');

    if(eyebrowEl && whyUs.eyebrow) eyebrowEl.textContent = whyUs.eyebrow;
    if(titleEl && whyUs.title) titleEl.textContent = whyUs.title;
    if(subtitleEl && whyUs.subtitle) subtitleEl.textContent = whyUs.subtitle;

    if(Array.isArray(whyUs.features)){
      whyUsGrid.innerHTML = whyUs.features.map(f => `
        <div class="why-card">
          <span class="why-icon" aria-hidden="true">${getIcon(f.icon)}</span>
          <h3>${escapeHtml(f.title || '')}</h3>
          <p>${escapeHtml(f.desc || '')}</p>
        </div>
      `).join('');
    }
  }

  function renderSocial(social){
    if(!socialLinks || !social) return;
    socialLinks.querySelectorAll('[data-social]').forEach(link => {
      const key = link.dataset.social;
      if(social[key]) link.setAttribute('href', social[key]);
    });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getIcon(name){
    const icons = {
      commitment: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
      experience: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.6 6.6L21 9.2l-5 4.6L17.4 21 12 17.3 6.6 21 8 13.8l-5-4.6 6.4-.6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
      method: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5V5a2 2 0 012-2h11a2 2 0 012 2v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 22a2 2 0 01-2-2v0a2 2 0 012-2h13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      support: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    };
    return icons[name] || icons.commitment;
  }
})();
