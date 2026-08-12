/* =========================================================
   شاشة البداية (Splash) — تتأكد من حالة تسجيل الدخول
   وتوجّه الطالب المسجل لصفحة كورساته تلقائيًا
   ========================================================= */
(function initSplash() {
  const splash = document.getElementById('appSplash');
  const statusEl = document.getElementById('splashStatus');
  if (!splash) return;

  const GRADE_URL = { '1': 'sec1.html', '2': 'sec2.html', '3': 'sec3.html' };
  let settled = false;

  function hideSplash() {
    if (settled) return;
    settled = true;
    splash.classList.add('splash-hidden');
    setTimeout(() => splash.remove(), 350);
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  // أمان مطلق: مهما حصل (حتى لو Firebase نفسه فشل يحمّل من الـ CDN)
  // السبلاش لازم يختفي بعد 3 ثواني بالظبط ومحدش يفضل واقف قدامه.
  const safetyTimeout = setTimeout(hideSplash, 3000);

  if (typeof auth === 'undefined') {
    hideSplash();
    return;
  }

  let authTimedOut = false;
  const authWaitTimeout = setTimeout(() => { authTimedOut = true; }, 3000);

  auth.onAuthStateChanged(async (user) => {
    if (settled || authTimedOut) return;

    if (!user) {
      clearTimeout(safetyTimeout);
      clearTimeout(authWaitTimeout);
      hideSplash();
      return;
    }

    if (!user.email) {
      try { await user.reload(); user = auth.currentUser; } catch (e) { /* ignore */ }
    }
    if (!user || !user.email || !user.email.endsWith('@elzilal-student.app')) {
      clearTimeout(safetyTimeout);
      clearTimeout(authWaitTimeout);
      hideSplash();
      return;
    }

    const phone = user.email.replace('@elzilal-student.app', '');

    try {
      const snap = await db.collection('students').doc(phone).get();
      if (!snap.exists) {
        clearTimeout(safetyTimeout);
        clearTimeout(authWaitTimeout);
        hideSplash();
        return;
      }
      const student = snap.data();
      if (student.status !== 'approved') {
        clearTimeout(safetyTimeout);
        clearTimeout(authWaitTimeout);
        hideSplash();
        return;
      }
      const target = GRADE_URL[String(student.grade)];
      if (!target) {
        clearTimeout(safetyTimeout);
        clearTimeout(authWaitTimeout);
        hideSplash();
        return;
      }

      clearTimeout(safetyTimeout);
      clearTimeout(authWaitTimeout);
      settled = true;
      setStatus('جاري تحويلك لحسابك...');
      window.location.replace(target);
    } catch (err) {
      console.error(err);
      clearTimeout(safetyTimeout);
      clearTimeout(authWaitTimeout);
      hideSplash();
    }
  });
})();

(function initTheme() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('alzilal-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark? 'dark' : 'light');

  applyTheme(initial);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'dark'? 'dark' : 'light';
      const next = current === 'dark'? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('alzilal-theme', next);
    });
  }

  function applyTheme(mode) {
    if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
    } else {
      root.removeAttribute('data-theme');
      if (themeToggle) themeToggle.setAttribute('aria-pressed', 'false');
    }
  }
})();

/* =========================================================
   شاشات منبثقة (Bottom Sheets) + اللوحة الجانبية
   ========================================================= */
function initSheet(sheetId, overlayId, handleId, openTriggerIds) {
  const sheet = document.getElementById(sheetId);
  const overlay = document.getElementById(overlayId);
  if (!sheet || !overlay) return { open: () => {}, close: () => {} };

  function open() {
    closeAllSheetsAndPanel();
    sheet.classList.add('open');
    overlay.classList.add('open');
  }
  function close() {
    sheet.classList.remove('open');
    overlay.classList.remove('open');
  }

  overlay.addEventListener('click', close);
  const handle = handleId ? document.getElementById(handleId) : null;
  if (handle) handle.addEventListener('click', close);

  // سحب لأسفل لإغلاق الشاشة (لمس)
  let startY = null;
  sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 90) { close(); startY = null; }
  }, { passive: true });
  sheet.addEventListener('touchend', () => { startY = null; });

  (openTriggerIds || []).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', open);
  });

  return { open, close };
}

function closeAllSheetsAndPanel() {
  document.querySelectorAll('.bottom-sheet.open').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.sheet-overlay.open').forEach(o => o.classList.remove('open'));
  const sidePanel = document.getElementById('sidePanel');
  const sidePanelOverlay = document.getElementById('sidePanelOverlay');
  if (sidePanel) sidePanel.classList.remove('open');
  if (sidePanelOverlay) sidePanelOverlay.classList.remove('open');
  const profilePage = document.getElementById('profilePage');
  if (profilePage) profilePage.classList.remove('open');
}

const teacherSheetCtrl = initSheet('teacherSheet', 'teacherSheetOverlay', 'teacherSheetHandle', ['navTeacherInfo']);

/* ---- صفحة الحساب: صفحة كاملة بدل الشاشة المنبثقة ---- */
function initProfilePage() {
  const page = document.getElementById('profilePage');
  const openBtn = document.getElementById('navProfile');
  if (!page || !openBtn) return { open: () => {}, close: () => {} };

  function open() {
    closeAllSheetsAndPanel();
    page.classList.add('open');
  }
  function close() {
    page.classList.remove('open');
    const navHome = document.getElementById('navHome');
    if (navHome) {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      navHome.classList.add('active');
    }
  }

  openBtn.addEventListener('click', open);

  return { open, close };
}
const profilePageCtrl = initProfilePage();

(function initSidePanel() {
  const panel = document.getElementById('sidePanel');
  const overlay = document.getElementById('sidePanelOverlay');
  const fabBtn = document.getElementById('sideFabBtn');
  if (!panel || !overlay || !fabBtn) return;

  function open() {
    closeAllSheetsAndPanel();
    panel.classList.add('open');
    overlay.classList.add('open');
  }
  function close() {
    panel.classList.remove('open');
    overlay.classList.remove('open');
  }

  fabBtn.addEventListener('click', open);
  overlay.addEventListener('click', close);
})();

(function initBottomNavActiveState() {
  const navHome = document.getElementById('navHome');
  const navItems = document.querySelectorAll('.nav-item');
  if (!navHome) return;
  // الرئيسية محددة افتراضيًا عند دخول الصفحة
  navItems.forEach(i => i.classList.remove('active'));
  navHome.classList.add('active');

  document.getElementById('navTeacherInfo')?.addEventListener('click', () => {
    profilePageCtrl.close();
    navItems.forEach(i => i.classList.remove('active'));
    document.getElementById('navTeacherInfo').classList.add('active');
  });
  document.getElementById('navProfile')?.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    document.getElementById('navProfile').classList.add('active');
  });
  navHome.addEventListener('click', () => {
    profilePageCtrl.close();
    navItems.forEach(i => i.classList.remove('active'));
    navHome.classList.add('active');
  });
})();

/* =========================================================
   شاشة الملف الشخصي — ضيف أو بيانات الطالب من Firebase
   ========================================================= */
(function initProfileSheetContent() {
  const contentEl = document.getElementById('profileSheetContent');
  if (!contentEl) return;

  const gradeLabels = { '1': 'الصف الأول الثانوي', '2': 'الصف الثاني الثانوي', '3': 'الصف الثالث الثانوي' };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function renderGuest() {
    contentEl.innerHTML = `
      <div class="profile-guest">
        <div class="profile-guest-avatar">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
            <path d="M4 20c1.8-4 5-6 8-6s6.2 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h2>مرحبًا بيك</h2>
        <p>سجّل دخولك أو اعمل حساب جديد عشان تقدر تتابع كورساتك</p>
        <div class="profile-guest-actions">
          <a href="login.html" class="btn btn-solid">تسجيل الدخول</a>
          <a href="signup.html" class="btn btn-ghost">إنشاء حساب</a>
        </div>
      </div>
    `;
  }

  function renderLoading() {
    contentEl.innerHTML = `
      <div class="profile-guest">
        <p class="loading-msg">جاري تحميل بياناتك...</p>
      </div>
    `;
  }

  function renderStudent(data) {
    contentEl.innerHTML = `
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
              <path d="M4 20c1.8-4 5-6 8-6s6.2 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h2>${escapeHtml(data.studentName)}</h2>
          <span class="profile-grade">${escapeHtml(gradeLabels[data.grade] || data.grade || '')}</span>
        </div>
        <div class="profile-fields">
          <div class="profile-field">
            <span class="field-label">رقم الطالب</span>
            <span class="field-value">${escapeHtml(data.studentPhone)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">رقم ولي الأمر</span>
            <span class="field-value">${escapeHtml(data.parentPhone)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">المحافظة</span>
            <span class="field-value">${escapeHtml(data.governorate)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">المدينة</span>
            <span class="field-value">${escapeHtml(data.city)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">القرية / الحي</span>
            <span class="field-value">${escapeHtml(data.village)}</span>
          </div>
        </div>
        <a href="account.html" class="profile-logout">الدخول إلى حسابك</a>
      </div>
    `;
  }

  renderGuest();

  document.getElementById('navProfile')?.addEventListener('click', () => {
    if (typeof auth === 'undefined') { renderGuest(); return; }
    const current = auth.currentUser;
    if (!current) { renderGuest(); return; }
    renderLoading();
    if (typeof db === 'undefined') { renderGuest(); return; }
    db.collection('students').doc(current.uid).get()
      .then(doc => {
        if (doc.exists) {
          renderStudent(doc.data());
        } else {
          renderGuest();
        }
      })
      .catch(err => {
        console.error(err);
        renderGuest();
      });
  }, { once: false });
})();

(function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  function onScroll() {
    if (window.scrollY > 12) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

(function initFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

(function redirectApprovedStudentFromHome() {
  return;
})();

(function loadHomeData() {
  const coursesGrid = document.getElementById('coursesGrid');
  const teacherBio = document.getElementById('teacherBio');

  if (!coursesGrid &&!teacherBio &&!document.getElementById('whyUsGrid')) return;

  const currentPage = window.location.pathname.split('/').pop();
  const isHomePage = currentPage === '' || currentPage === 'index.html';

  fetch('data.json')
   .then(res => res.json())
   .then(data => {
      renderTeacher(data.teacher);
      renderWhyUs(data.whyUs);
      renderSocial(data.social);
    })
   .catch(err => console.error(err));

  const gradeLabels = { '1': 'الصف الأول الثانوي', '2': 'الصف الثاني الثانوي', '3': 'الصف الثالث الثانوي' };

  function loadCoursesFromFirestore() {
    if (!coursesGrid ||!isHomePage) return;
    if (typeof db === 'undefined') {
      coursesGrid.innerHTML = '<p class="loading-msg">تعذر تحميل الكورسات حاليًا</p>';
      return;
    }
    db.collection('courses')
     .where('active', '==', true)
     .get()
     .then(snap => {
        const courses = snap.docs
         .map(doc => ({ id: doc.id,...doc.data() }))
         .filter(c => {
            const locs = Array.isArray(c.locations)? c.locations : (c.location? [c.location] : []);
            return locs.includes('index');
          });
        renderCourses(courses);
      })
     .catch(err => {
        console.error(err);
        coursesGrid.innerHTML = '<p class="loading-msg">تعذر تحميل الكورسات حاليًا</p>';
      });
  }
  loadCoursesFromFirestore();

  function renderCourses(courses) {
    if (!coursesGrid ||!Array.isArray(courses)) return;
    if (courses.length === 0) {
      coursesGrid.innerHTML = '<p class="empty-msg">لا توجد كورسات متاحة حاليًا</p>';
      return;
    }
    coursesGrid.innerHTML = courses.map(c => `
      <div class="course-card">
        ${c.image? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.title || '')}" class="course-card-img" onerror="this.style.display='none'">` : ''}
        <div class="course-card-body">
          <span class="course-grade">${escapeHtml(gradeLabels[c.grade] || '')}</span>
          <h3>${escapeHtml(c.title || '')}</h3>
          <div class="course-price">
            <span class="amount">${escapeHtml(String(c.price?? ''))}</span>
            <span class="currency">${escapeHtml(c.currency || 'جنيه')}</span>
          </div>
          <a href="enroll.html?course=${encodeURIComponent(c.id)}" class="course-btn" data-course-id="${escapeHtml(c.id)}">اشترك الآن</a>
        </div>
      </div>
    `).join('');
  }

  function renderTeacher(teacher) {
    if (!teacher) return;
    const nameEl = document.getElementById('teacherName');
    const roleEl = document.getElementById('teacherRole');
    const highlightEl = document.getElementById('teacherHighlight');

    if (nameEl && teacher.name) nameEl.textContent = teacher.name;
    if (roleEl && teacher.role) roleEl.textContent = teacher.role;
    if (highlightEl && teacher.highlight) highlightEl.textContent = teacher.highlight;

    if (teacherBio && Array.isArray(teacher.bio)) {
      teacherBio.innerHTML = teacher.bio.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }

    // نفس بيانات المعلم تتملى في الشاشة المنبثقة (نص الشريط السفلي)
    const sheetName = document.getElementById('sheetTeacherName');
    const sheetRole = document.getElementById('sheetTeacherRole');
    const sheetHighlight = document.getElementById('sheetTeacherHighlight');
    const sheetBio = document.getElementById('sheetTeacherBio');

    if (sheetName && teacher.name) sheetName.textContent = teacher.name;
    if (sheetRole && teacher.role) sheetRole.textContent = teacher.role;
    if (sheetHighlight && teacher.highlight) sheetHighlight.textContent = teacher.highlight;
    if (sheetBio && Array.isArray(teacher.bio)) {
      sheetBio.innerHTML = teacher.bio.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }
  }

  function renderWhyUs(whyUs) {
    const whyUsGrid = document.getElementById('whyUsGrid');
    if (!whyUsGrid ||!whyUs) return;

    const eyebrowEl = document.getElementById('whyUsEyebrow');
    const titleEl = document.getElementById('whyUsTitle');
    const subtitleEl = document.getElementById('whyUsSubtitle');

    if (eyebrowEl && whyUs.eyebrow) eyebrowEl.textContent = whyUs.eyebrow;
    if (titleEl && whyUs.title) titleEl.textContent = whyUs.title;
    if (subtitleEl && whyUs.subtitle) subtitleEl.textContent = whyUs.subtitle;

    if (Array.isArray(whyUs.features)) {
      whyUsGrid.innerHTML = whyUs.features.map(f => `
        <div class="why-card">
          <span class="why-icon" aria-hidden="true">${getIcon(f.icon)}</span>
          <h3>${escapeHtml(f.title || '')}</h3>
          <p>${escapeHtml(f.desc || '')}</p>
        </div>
      `).join('');
    }
  }

  function renderSocial(social) {
    if (!social) return;
    document.querySelectorAll('[data-social]').forEach(link => {
      const key = link.dataset.social;
      if (social[key]) link.setAttribute('href', social[key]);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getIcon(name) {
    const icons = {
      commitment: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
      experience: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.6 6.6L21 9.2l-5 4.6L17.4 21 12 17.3 6.6 21 8 13.8l-5-4.6 6.4-.6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
      method: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5V5a2 2 0 012-2h11a2 2 0 012 2v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 22a2 2 0 01-2-2v0a2 2 0 012-2h13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      support: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
    };
    return icons[name] || icons.commitment;
  }
})();
