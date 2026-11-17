(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(hover: none)').matches;

  function initRevealObserver() {
    const targets = document.querySelectorAll('.product-card, .sidebar-box, .detail-related');

    if (prefersReducedMotion) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    function observeTargets() {
      const cards = document.querySelectorAll('.product-card, .sidebar-box, .detail-related');
      cards.forEach((el, idx) => {
        if (!el.classList.contains('reveal-float')) {
          el.classList.add('reveal-float');
          if (el.classList.contains('product-card')) {
            el.style.transitionDelay = `${Math.min((idx % 6) * 20, 100)}ms`;
          }
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight + 120) {
            requestAnimationFrame(() => el.classList.add('is-visible'));
          } else {
            observer.observe(el);
          }
          // Safety fallback: ensure no card ever remains hidden
          setTimeout(() => el.classList.add('is-visible'), 350);
        }
      });
    }

    observeTargets();

    // Re-observe dynamically rendered product grids (pagination, search, filters)
    const grid = document.getElementById('productGrid') || document.getElementById('relatedGrid');
    if (grid) {
      const mo = new MutationObserver(() => observeTargets());
      mo.observe(grid, { childList: true });
    }
  }

  function initSpatialTilt() {
    if (prefersReducedMotion || isTouchDevice) return;

    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const rotateY = (x * 7).toFixed(2);
      const rotateX = (-y * 7).toFixed(2);
      card.style.transform = `translateY(-7px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.012)`;
    });

    document.addEventListener(
      'mouseleave',
      (e) => {
        const card = e.target && e.target.closest ? e.target.closest('.product-card') : null;
        if (card) {
          card.style.transform = '';
        }
      },
      true
    );

    document.addEventListener('mouseout', (e) => {
      const card = e.target && e.target.closest ? e.target.closest('.product-card') : null;
      if (card && !card.contains(e.relatedTarget)) {
        card.style.transform = '';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initRevealObserver();
    initSpatialTilt();
  });
})();
