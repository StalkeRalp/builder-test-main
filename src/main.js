import './style.css'
import { initI18n } from './i18n.js'
import { initTheme } from './theme.js'

// ====== CREATE SCROLL PROGRESS INDICATOR ======
if (!document.getElementById('scroll-progress')) {
  const progressBar = document.createElement('div');
  progressBar.id = 'scroll-progress';
  document.body.appendChild(progressBar);
}

// ====== SCROLL PROGRESS LISTENER ======
window.addEventListener('scroll', () => {
  const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  const progressEl = document.getElementById('scroll-progress');
  if (progressEl) {
    progressEl.style.width = scrolled + '%';
  }
});

// ====== SCROLL TO TOP BUTTON ======
let scrollToTopBtn = document.getElementById('scrollToTopBtn');
if (!scrollToTopBtn) {
  scrollToTopBtn = document.createElement('button');
  scrollToTopBtn.id = 'scrollToTopBtn';
  scrollToTopBtn.innerHTML = '↑';
  scrollToTopBtn.setAttribute('title', 'Retour en haut');
  document.body.appendChild(scrollToTopBtn);
}

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    scrollToTopBtn.classList.add('show');
  } else {
    scrollToTopBtn.classList.remove('show');
  }
});

scrollToTopBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// ====== INTERSECTION OBSERVER FOR LUXURY REVEAL ======
const revealOptions = {
  threshold: 0.08,
  rootMargin: '0px 0px -50px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      // If element has counter animation, trigger it
      if (entry.target.hasAttribute('data-counter')) {
        animateCounter(entry.target);
      }
      revealObserver.unobserve(entry.target);
    }
  });
}, revealOptions);

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme System (Light / Dark Mode)
  initTheme();

  // Initialize i18n Language System (Default French)
  initI18n();

  // Attach reveal classes to elements with reveal-on-scroll, reveal-zoom, data-reveal or data-counter
  const revealElements = document.querySelectorAll('.reveal-on-scroll, .reveal-zoom, [data-reveal], [data-counter]');
  revealElements.forEach(el => {
    if (!el.classList.contains('reveal-on-scroll') && !el.classList.contains('reveal-zoom')) {
      el.classList.add('reveal-on-scroll');
    }
    revealObserver.observe(el);
  });

  // Re-initialize Lucide icons if loaded
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// ====== STAT COUNTER ANIMATION ======
function animateCounter(el) {
  const target = parseFloat(el.getAttribute('data-counter'));
  const duration = 2000;
  const prefix = el.getAttribute('data-prefix') || '';
  const suffix = el.getAttribute('data-suffix') || '';
  const isFloat = target % 1 !== 0;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const val = easeProgress * target;
    const formattedVal = isFloat ? val.toFixed(1) : Math.floor(val).toLocaleString();
    
    el.innerText = `${prefix}${formattedVal}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      el.innerText = `${prefix}${target.toLocaleString()}${suffix}`;
    }
  }

  requestAnimationFrame(updateCount);
}

// ====== MOBILE MENU TOGGLE ======
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  const mobileLinks = mobileMenu.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
    });
  });
}

// ====== HEADER IMAGE SLIDESHOWS ======
function setupHeaderSlideshow(elementId, images) {
  const container = document.getElementById(elementId);
  if (!container) return;

  let currentIndex = 0;

  function nextImage() {
    currentIndex = (currentIndex + 1) % images.length;
    const imgEl = container.querySelector('img');
    if (imgEl) {
      imgEl.style.opacity = '0.3';
      setTimeout(() => {
        imgEl.src = images[currentIndex];
        imgEl.style.opacity = '1';
      }, 400);
    }
  }

  setInterval(nextImage, 4000);
}

setupHeaderSlideshow('headerConstruction', [
  '/building/building.jpg',
  '/building/building2.jpeg',
  '/building/building3.jpeg',
  '/building/building4.jpeg',
  '/building/building5.jpeg'
]);

setupHeaderSlideshow('headerEnergy', [
  '/energy/energy1.jpg',
  '/energy/energy2.jpg',
  '/energy/energy3.jpg',
  '/energy/energy4.jpg',
  '/energy/energy5.jpg'
]);

setupHeaderSlideshow('headerTech', [
  '/IT/secu1.jpg',
  '/IT/secu2.jpg',
  '/IT/secu3.jpg',
  '/IT/secu4.jpg',
  '/IT/secu5.jpg'
]);

setupHeaderSlideshow('headerTransport', [
  '/transport/trans1.jpg',
  '/transport/tran2.jpg',
  '/transport/trans3.jpg',
  '/transport/trans4.jpg'
]);


