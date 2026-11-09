/* ==========================================================================
   מאבק מגדל האנטנה בכפר אדומים - קוד אינטראקטיבי
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initBeforeAfterSlider();
  initCounters();
  initFaqAccordion();
  initPetitionSystem();
  initShareFeatures();
});

/* --------------------------------------------------------------------------
   1. Navbar & Smooth Scrolling
   -------------------------------------------------------------------------- */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      const isVisible = navLinks.style.display === 'flex';
      navLinks.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '74px';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'white';
        navLinks.style.padding = '20px';
        navLinks.style.boxShadow = 'var(--shadow-lg)';
        navLinks.style.borderBottom = '1px solid #e2e8f0';
      }
    });

    // Close menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          navLinks.style.display = 'none';
        }
      });
    });
  }
}

/* --------------------------------------------------------------------------
   2. Before / After Interactive Slider (RTL friendly)
   -------------------------------------------------------------------------- */
function initBeforeAfterSlider() {
  const container = document.querySelector('.slider-container');
  const afterWrapper = document.querySelector('.slider-img-after-wrapper');
  const handle = document.querySelector('.slider-handle');

  if (!container || !afterWrapper || !handle) return;

  let isDragging = false;

  function updateSlider(clientX) {
    const rect = container.getBoundingClientRect();
    // In RTL, width from the right side
    const offsetX = clientX - rect.left;
    let percentage = (offsetX / rect.width) * 100;

    // Clamp between 5% and 95%
    percentage = Math.max(5, Math.min(95, percentage));

    // Because this is RTL:
    // Right side is the "After" (Antenna) wrapper width:
    const fromRightPercent = 100 - percentage;

    afterWrapper.style.width = `${fromRightPercent}%`;
    handle.style.right = `${fromRightPercent}%`;
  }

  // Mouse Events
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateSlider(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch Events for Mobile
  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    updateSlider(e.touches[0].clientX);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    updateSlider(e.touches[0].clientX);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });
}

/* --------------------------------------------------------------------------
   3. Animated Stat Counters
   -------------------------------------------------------------------------- */
function initCounters() {
  const statNumbers = document.querySelectorAll('.stat-number-val');
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statNumbers.forEach(counter => {
          const target = +counter.getAttribute('data-target');
          const duration = 1500;
          const stepTime = 20;
          const steps = duration / stepTime;
          const increment = target / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              counter.textContent = target;
              clearInterval(timer);
            } else {
              counter.textContent = Math.ceil(current);
            }
          }, stepTime);
        });
      }
    });
  }, { threshold: 0.3 });

  const statsRow = document.querySelector('.hero-stats-row');
  if (statsRow) observer.observe(statsRow);
}

/* --------------------------------------------------------------------------
   4. FAQ Accordion
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });

      // Toggle current
      item.classList.toggle('active', !isActive);
    });
  });
}

/* --------------------------------------------------------------------------
   5. Resident Petition System (CSV Backend + LocalStorage Fallback)
   -------------------------------------------------------------------------- */
const INITIAL_SIGNERS_COUNT = 387;

const DEFAULT_SIGNERS = [
  'משפחת כהן (נופי בראשית)',
  'דוד ולבנה ש. (שלב ב׳)',
  'מיכל א. (השכונה הוותיקה)',
  'יוסי ומירב (מצפה)',
  'רועי ב. (נופי בראשית ב׳)',
  'תמר לוין (לב הכפר)'
];

function initPetitionSystem() {
  const form = document.getElementById('petition-form');
  const counterDisplay = document.getElementById('signers-counter');
  const signersListContainer = document.getElementById('signers-tags');

  // Load from LocalStorage as initial state / fallback
  let storedCount = parseInt(localStorage.getItem('kfar_adumim_signers_count'), 10);
  if (!storedCount || isNaN(storedCount)) {
    storedCount = INITIAL_SIGNERS_COUNT;
    localStorage.setItem('kfar_adumim_signers_count', storedCount);
  }

  let storedNames = [];
  try {
    storedNames = JSON.parse(localStorage.getItem('kfar_adumim_signers_list')) || [];
  } catch (e) {
    storedNames = [];
  }

  let allNames = [...storedNames, ...DEFAULT_SIGNERS];

  updateCounterUI(storedCount);
  renderSignersTags(allNames);

  // Sync recent signers from the server CSV if available
  fetch('/api/activists')
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      if (data && Array.isArray(data.recentSigners)) {
        const merged = [...new Set([...data.recentSigners, ...DEFAULT_SIGNERS])];
        allNames = merged;
        renderSignersTags(allNames);
        if (typeof data.count === 'number') {
          updateCounterUI(INITIAL_SIGNERS_COUNT + data.count);
        }
      }
    })
    .catch(() => {
      // Fallback to localStorage if running without server
    });

  // Check if user already submitted
  if (localStorage.getItem('kfar_adumim_has_signed')) {
    const submitBtn = document.getElementById('petition-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = '✓ הצטרפת לרשימת הפעילים בהצלחה';
      submitBtn.classList.remove('btn-primary');
      submitBtn.style.background = '#16a34a';
      submitBtn.style.color = '#fff';
      submitBtn.disabled = true;
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('full-name').value.trim();
      const neighborhood = document.getElementById('neighborhood').value.trim();
      const phone = document.getElementById('phone-number').value.trim();
      const volunteerCheck = document.getElementById('volunteer-check');
      const volunteer = volunteerCheck ? volunteerCheck.checked : true;

      if (!fullName || !neighborhood) {
        showToast('נא למלא שם מלא ושכונה/רחוב');
        return;
      }

      const submitBtn = document.getElementById('petition-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'שומר פרטים...';
      }

      try {
        const response = await fetch('/api/activists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, neighborhood, phone, volunteer })
        });

        if (!response.ok) {
          throw new Error('Server returned error');
        }
      } catch (err) {
        console.warn('Could not reach /api/activists, saving locally only:', err);
      }

      // Increment count & save locally as well
      storedCount += 1;
      localStorage.setItem('kfar_adumim_signers_count', storedCount);

      const signerText = `${fullName} (${neighborhood})`;
      storedNames.unshift(signerText);
      localStorage.setItem('kfar_adumim_signers_list', JSON.stringify(storedNames));
      localStorage.setItem('kfar_adumim_has_signed', 'true');

      // Update UI
      allNames = [signerText, ...allNames.filter(n => n !== signerText)];
      updateCounterUI(storedCount);
      renderSignersTags(allNames);

      // Feedback
      showToast('🎉 תודה רבה! פרטיך נשמרו ברשימת הפעילים');
      form.reset();

      if (submitBtn) {
        submitBtn.textContent = '✓ פרטיך נקלטו! תודה על ההתגייסות';
        submitBtn.classList.remove('btn-primary');
        submitBtn.style.background = '#16a34a';
        submitBtn.style.color = '#fff';
        submitBtn.disabled = true;
      }
    });
  }

  function updateCounterUI(count) {
    if (counterDisplay) {
      counterDisplay.textContent = Number(count).toLocaleString('he-IL');
    }
  }

  function renderSignersTags(names) {
    if (!signersListContainer) return;
    signersListContainer.innerHTML = '';
    const previewList = names.slice(0, 10);
    previewList.forEach(name => {
      const tag = document.createElement('span');
      tag.className = 'signer-tag';
      tag.textContent = name;
      signersListContainer.appendChild(tag);
    });
  }
}

/* --------------------------------------------------------------------------
   6. WhatsApp Join & Share Features
   -------------------------------------------------------------------------- */
function initShareFeatures() {
  const shareBtn = document.getElementById('share-whatsapp-btn');
  const shareFloatingBtn = document.getElementById('share-floating-btn');
  const shareBoxBtn = document.getElementById('share-whatsapp-box-btn');

  const shareText = encodeURIComponent(
    `🚨 *מרחיקים את מגדל האנטנות מבתי כפר אדומים!*\n\n` +
    `*קליטה סלולרית טובה — כן. מגדל ענק מול בתי התושבים — לא!*\n\n` +
    `מגדל ברזל כתום־לבן בגובה כ־50 מטרים הוקם לצד הכניסה לכפר אדומים, כ־270 מטרים ממגרשי נופי בראשית שלב ב׳.\n` +
    `אנו דורשים מהמועצה האזורית לקחת אחריות ולהעביר את המגדל למיקום מרוחק משכונות המגורים!\n\n` +
    `✍️ *לחתימה על העצומה הרשמית:*\nhttps://atzuma.co.il/s/YHzGry\n\n` +
    `💬 *להצטרפות לקבוצת העדכונים:*\nhttps://chat.whatsapp.com/Kp6AZC7skdxKvnDsoTSKWE?s=cl&p=i&mlu=4&ilr=4`
  );

  function triggerWhatsAppShare() {
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  }

  if (shareBtn) shareBtn.addEventListener('click', triggerWhatsAppShare);
  if (shareFloatingBtn) shareFloatingBtn.addEventListener('click', triggerWhatsAppShare);
  if (shareBoxBtn) shareBoxBtn.addEventListener('click', triggerWhatsAppShare);
}

/* --------------------------------------------------------------------------
   7. Toast Notification Utility
   -------------------------------------------------------------------------- */
function showToast(message) {
  let toast = document.querySelector('.toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
