import './style.css'

// ====== SCROLL TO TOP BUTTON ======
const scrollToTopBtn = document.createElement('button');
scrollToTopBtn.id = 'scrollToTopBtn';
scrollToTopBtn.innerHTML = '↑';
scrollToTopBtn.setAttribute('title', 'Retour en haut');
document.body.appendChild(scrollToTopBtn);

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

// ====== SCROLL REVEAL ANIMATIONS ======
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observer toutes les cartes et sections
document.querySelectorAll('.bg-gradient-to-br, .flex.flex-col.items-center').forEach(el => {
  el.classList.add('scroll-reveal');
  observer.observe(el);
});

// Menu hamburger toggle
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const isHidden = mobileMenu.style.display === 'none';
    mobileMenu.style.display = isHidden ? 'flex' : 'none';
    
    // Animer les lignes du hamburger
    const lines = menuBtn.querySelectorAll('span');
    lines[0].classList.toggle('rotate-45');
    lines[0].classList.toggle('translate-y-2');
    lines[1].classList.toggle('opacity-0');
    lines[2].classList.toggle('-rotate-45');
    lines[2].classList.toggle('-translate-y-2');
  });
  
  // Fermer le menu quand on clique sur un lien
  const mobileLinks = mobileMenu.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.style.display = 'none';
      
      // Réinitialiser l'animation du hamburger
      const lines = menuBtn.querySelectorAll('span');
      lines[0].classList.remove('rotate-45', 'translate-y-2');
      lines[1].classList.remove('opacity-0');
      lines[2].classList.remove('-rotate-45', '-translate-y-2');
    });
  });
}

// Carrousel d'images du header (Construction)
const headerConstruction = document.getElementById('headerConstruction');
if (headerConstruction) {
  const buildingImages = [
    '/building/building.jpg',
    '/building/building2.jpeg',
    '/building/building3.jpeg',
    '/building/building4.jpeg',
    '/building/building5.jpeg'
  ];
  
  let currentImageIndex = 0;
  
  function updateHeaderImage() {
    const imageUrl = buildingImages[currentImageIndex];
    headerConstruction.style.backgroundImage = `url('${imageUrl}')`;
    currentImageIndex = (currentImageIndex + 1) % buildingImages.length;
  }
  
  // Initialiser la première image
  updateHeaderImage();
  
  // Changer l'image toutes les 2 secondes
  setInterval(updateHeaderImage, 2000);
}

// Carrousel d'images du header (Energy) - SANS gradient violet
const headerEnergy = document.getElementById('headerEnergy');
if (headerEnergy) {
  const energyImages = [
    '/energy/energy1.jpg',
    '/energy/energy2.jpg',
    '/energy/energy3.jpg',
    '/energy/energy4.jpg',
    '/energy/energy5.jpg'
  ];
  
  let currentEnergyImageIndex = 0;
  
  function updateEnergyHeaderImage() {
    const imageUrl = energyImages[currentEnergyImageIndex];
    // Sans gradient violet, juste l'image
    headerEnergy.style.backgroundImage = `url('${imageUrl}')`;
    currentEnergyImageIndex = (currentEnergyImageIndex + 1) % energyImages.length;
  }
  
  // Initialiser la première image
  updateEnergyHeaderImage();
  
  // Changer l'image toutes les 2 secondes
  setInterval(updateEnergyHeaderImage, 2000);
}

// Carrousel d'images du header (Tech/IT) - SANS gradient violet
const headerTech = document.getElementById('headerTech');
if (headerTech) {
  const itImages = [
    '/IT/secu1.jpg',
    '/IT/secu2.jpg',
    '/IT/secu3.jpg',
    '/IT/secu4.jpg',
    '/IT/secu5.jpg'
  ];
  
  let currentITImageIndex = 0;
  
  function updateTechHeaderImage() {
    const imageUrl = itImages[currentITImageIndex];
    // Sans gradient violet, juste l'image
    headerTech.style.backgroundImage = `url('${imageUrl}')`;
    currentITImageIndex = (currentITImageIndex + 1) % itImages.length;
  }
  
  // Initialiser la première image
  updateTechHeaderImage();
  
  // Changer l'image toutes les 2 secondes
  setInterval(updateTechHeaderImage, 2000);
}

// Carrousel d'images du header (Business & Marketing) - SANS gradient violet
const headerBusiness = document.getElementById('headerBusiness');
if (headerBusiness) {
  const marketImages = [
    '/market/maket1.jpg',
    '/market/market2.jpg',
    '/market/market3.jpg',
    '/market/market4.jpg',
    '/market/market5.jpg'
  ];
  
  let currentMarketImageIndex = 0;
  
  function updateBusinessHeaderImage() {
    const imageUrl = marketImages[currentMarketImageIndex];
    headerBusiness.style.backgroundImage = `url('${imageUrl}')`;
    currentMarketImageIndex = (currentMarketImageIndex + 1) % marketImages.length;
  }
  
  // Initialiser la première image
  updateBusinessHeaderImage();
  
  // Changer l'image toutes les 2 secondes
  setInterval(updateBusinessHeaderImage, 2000);
}

// Carrousel d'images du header (Transport) - SANS gradient violet
const headerTransport = document.getElementById('headerTransport');
if (headerTransport) {
  const transportImages = [
    '/transport/trans1.jpg',
    '/transport/trans2.jpg',
    '/transport/trans3.jpg',
    '/transport/trans4.jpg'
  ];
  
  let currentTransportImageIndex = 0;
  
  function updateTransportHeaderImage() {
    const imageUrl = transportImages[currentTransportImageIndex];
    headerTransport.style.backgroundImage = `url('${imageUrl}')`;
    currentTransportImageIndex = (currentTransportImageIndex + 1) % transportImages.length;
  }
  
  // Initialiser la première image
  updateTransportHeaderImage();
  
  // Changer l'image toutes les 2 secondes
  setInterval(updateTransportHeaderImage, 2000);
}

// ====== CARROUSEL D'IMAGES AMÉLIORÉ ======
const carouselWrapper = document.getElementById('carouselWrapper');
const carouselIndicators = document.querySelectorAll('.carousel-indicator');
let currentIndex = 0;
const totalSlides = 5;
let autoSlideInterval;

function updateCarousel() {
  const translateValue = -currentIndex * 100;
  carouselWrapper.style.transform = `translateX(${translateValue}%)`;
  
  // Mettre à jour les indicateurs
  carouselIndicators.forEach((indicator, index) => {
    if (index === currentIndex) {
      indicator.classList.remove('bg-gray-300');
      indicator.classList.add('bg-purple-700');
    } else {
      indicator.classList.remove('bg-purple-700');
      indicator.classList.add('bg-gray-300');
    }
  });
}

function nextSlide() {
  currentIndex = (currentIndex + 1) % totalSlides;
  updateCarousel();
}

function prevSlide() {
  currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
  updateCarousel();
}

function resetAutoSlide() {
  clearInterval(autoSlideInterval);
  autoSlideInterval = setInterval(nextSlide, 2000);
}

// Créer les boutons de contrôle du carrousel
if (carouselWrapper) {
  const carousel = carouselWrapper.closest('.carousel-container');
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-button prev';
  prevBtn.innerHTML = '❮';
  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetAutoSlide();
  });
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-button next';
  nextBtn.innerHTML = '❯';
  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetAutoSlide();
  });
  
  carousel.appendChild(prevBtn);
  carousel.appendChild(nextBtn);
  
  // Défilement automatique après 2 secondes
  autoSlideInterval = setInterval(nextSlide, 2000);
  
  // Clic sur les indicateurs
  carouselIndicators.forEach(indicator => {
    indicator.addEventListener('click', () => {
      currentIndex = parseInt(indicator.getAttribute('data-index'));
      updateCarousel();
      resetAutoSlide();
    });
  });
}

