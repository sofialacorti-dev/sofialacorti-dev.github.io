(function () {
  'use strict';

  var hasObserver = 'IntersectionObserver' in window;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scrollTick = null;

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  /* -- 1. Masthead: pins once the hero is scrolled past. */
  var masthead = document.getElementById('masthead');
  var sentinel = document.querySelector('.sentinel');
  if (masthead && sentinel && hasObserver) {
    new IntersectionObserver(function (entries) {
      each(entries, function (entry) {
        masthead.classList.toggle('is-pinned', entry.boundingClientRect.top < 0);
      });
    }).observe(sentinel);
  }

  /* -- 2. Scroll progress bar. */
  var progress = document.querySelector('.progress');
  function updateProgress() {
    scrollTick = null;
    if (!progress) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? doc.scrollTop / max : 0) + ')';
  }
  if (progress) {
    if (reduceMotion) {
      updateProgress();
    } else {
      window.addEventListener('scroll', function () {
        if (scrollTick === null) {
          scrollTick = requestAnimationFrame(updateProgress);
        }
      }, { passive: true });
      updateProgress();
    }
  }

  /* -- 3. Reveal on scroll. */
  var revealables = document.querySelectorAll('.reveal');
  if (!hasObserver || reduceMotion) {
    each(revealables, function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      each(entries, function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    each(revealables, function (el) { revealObserver.observe(el); });
  }

  /* -- 4. Scrollspy: active section in the nav. */
  var hero = document.querySelector('.hero');
  var navLinks = document.querySelectorAll('.sections__list a');
  var sections = [];
  var activeId = null;

  each(navLinks, function (link) {
    var target = document.querySelector(link.getAttribute('href'));
    if (target) sections.push(target);
  });

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    each(navLinks, function (link) {
      if (link.getAttribute('href') === '#' + id) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if (hasObserver && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      each(entries, function (entry) {
        if (!entry.isIntersecting) return;
        setActive(entry.target === hero ? '' : entry.target.id);
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    each(sections, function (section) { spy.observe(section); });
    if (hero) spy.observe(hero);
  }

  /* -- 5. Back to top button. */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var lastY = 0;
    function toggleToTop() {
      var y = window.scrollY;
      if (y > 640 && y > lastY === false) {
        toTop.classList.add('is-visible');
      } else if (y <= 300) {
        toTop.classList.remove('is-visible');
      }
      lastY = y;
    }
    window.addEventListener('scroll', toggleToTop, { passive: true });
    toggleToTop();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* -- 6. Footer year. */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* -- 7. Spotlight on the hero following the mouse. */
  var heroEl = document.querySelector('.hero');
  var spotlight = document.querySelector('.spotlight');
  if (heroEl && spotlight && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    var spotTick = null;
    heroEl.addEventListener('pointerenter', function () { heroEl.classList.add('is-spotlight'); });
    heroEl.addEventListener('pointerleave', function () { heroEl.classList.remove('is-spotlight'); });
    heroEl.addEventListener('pointermove', function (e) {
      if (spotTick !== null) return;
      spotTick = requestAnimationFrame(function () {
        spotTick = null;
        var rect = heroEl.getBoundingClientRect();
        spotlight.style.transform = 'translate(' + (e.clientX - rect.left) + 'px,' + (e.clientY - rect.top) + 'px)';
      });
    }, { passive: true });
  }

  /* -- 8. Tilt on project cards. */
  var cards = document.querySelectorAll('.card');
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    each(cards, function (card) {
      var rect = null;
      function onEnter() {
        rect = card.getBoundingClientRect();
        card.classList.add('is-tilting');
        card.style.transition = 'transform 0.05s ease-out';
      }
      function onMove(e) {
        if (!rect) return;
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 4).toFixed(2) + 'deg) translateY(-4px)';
      }
      function onLeave() {
        rect = null;
        card.classList.remove('is-tilting');
        card.style.transition = '';
        card.style.transform = '';
      }
      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
    });
  }

  /* -- 9. Copy email button. */
  var copyBtn = document.querySelector('.copy-chip');
  if (copyBtn) {
    function copyFeedback() {
      copyBtn.classList.add('is-copied');
      copyBtn.textContent = 'copiado!';
      setTimeout(function () {
        copyBtn.classList.remove('is-copied');
        copyBtn.textContent = 'copiar e-mail';
      }, 1800);
    }
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-copy') || '';
      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyFeedback(); }
        catch (err) { /* noop */ }
        ta.remove();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(copyFeedback, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  /* -- 10. View transition when navigating via the menu. */
  var supportsViewTransition = 'startViewTransition' in document && !reduceMotion;
  each(navLinks, function (link) {
    link.addEventListener('click', function (e) {
      var hash = link.getAttribute('href');
      if (!hash || hash.charAt(0) !== '#') return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      if (supportsViewTransition) {
        document.startViewTransition(function () {
          window.location.hash = hash;
        });
      } else {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
}());