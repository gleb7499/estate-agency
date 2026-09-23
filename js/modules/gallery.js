// Gallery: thumbs, lightbox, video modal, navigation, full card rendering
import { root, MP, showToast, setData } from './state.js';
import { fmtCurrency, fmtNumber } from './format.js';
import { renderPriceBreakdown, PriceBreakdown } from './price.js';
import { initMap } from './map.js';
import { TitleAutoFit } from './layout.js';
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('.mp-gallery__badge--bl .mp-badge__copy');
    if (!btn) return;
    const wrap = btn.closest('.mp-gallery__badge--bl');
    const textEl = wrap?.querySelector('.mp-badge__text');
    const raw = textEl?.textContent || '';
    const match = raw.match(/\b(\d{1,})\b/);
    const idStr = match ? match[1] : '';
    if (!idStr) return;
    try {
      await navigator.clipboard.writeText(idStr);
      showToast('Скопировано!');
    } catch (_) {
      // Fallback: create a temporary input
      const tmp = document.createElement('input');
      tmp.value = idStr;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(tmp);
      showToast('Скопировано!');
    }
  });

  // Formatting utilities (shared)

  // Delegated click on gallery previews — a single handler on the root
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-gallery__thumb');
    if (!btn || !root.contains(btn)) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const mainImg = gallery.querySelector('.mp-gallery__image');
    const full = btn.getAttribute('data-full');
    const isVideo = btn.getAttribute('data-type') === 'video';
    if (full && mainImg) {
      mainImg.src = full;
      // update the background blur for the square area
      const mainWrap = gallery.querySelector('.mp-gallery__main');
      if (mainWrap) {
        try {
          mainWrap.style.setProperty('--mp-gallery-bg', `url("${full}")`);
          mainWrap.style.backgroundImage = `url('${full}')`;
          mainWrap.style.backgroundSize = 'cover';
          mainWrap.style.backgroundPosition = 'center';
          // Fallback background <img> with blur
          let bg = mainWrap.querySelector('img.mp-gallery__bg');
          if (!bg) {
            bg = document.createElement('img');
            bg.className = 'mp-gallery__bg';
            bg.alt = '';
            bg.setAttribute('aria-hidden', 'true');
            mainWrap.insertBefore(bg, mainWrap.firstChild);
          }
          bg.src = full;
        } catch (_) {}
      }
      // show the play button only on the video frame
      const playBtn = gallery.querySelector('.mp-gallery__play');
      if (playBtn) playBtn.hidden = !isVideo;
      gallery.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      MP.emit('mp:gallery:change', { src: full, type: isVideo ? 'video' : 'photo' });
      updateGalleryNavVisibility();
    }
  });

  // =================== Photo lightbox ===================
  const openPhotoModal = () => {
    const modal = root.querySelector('.mp-photo-modal');
    const gallery = root.querySelector('.mp-gallery');
    if (!modal || !gallery) return;
    // Title
    const title = (gallery.querySelector('.mp-title')?.textContent || '').trim();
    const titleEl = modal.querySelector('.mp-photo__title');
    if (titleEl) titleEl.textContent = title;
    // "Call" button — use the number from the agent card if available
    const phoneLink = root.querySelector('.mp-agent .mp-agent__phone');
    const callBtn = modal.querySelector('.mp-photo__call');
    if (callBtn) {
      const href = phoneLink?.getAttribute('href') || '#';
      callBtn.setAttribute('href', href);
    }
    // List of previews (in the gallery) and the active index — excluding video
    const allThumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const photoThumbs = allThumbs.filter((t) => t.getAttribute('data-type') !== 'video');
    const activePhotoIndex = Math.max(0, photoThumbs.findIndex((t) => t.classList.contains('is-active')));
    // If the video item is active, put the first photo into the modal
    const activeIsVideo = !!allThumbs.find((t) => t.classList.contains('is-active') && t.getAttribute('data-type') === 'video');
    const mainSrc = activeIsVideo
      ? (photoThumbs[0]?.getAttribute('data-full') || photoThumbs[0]?.querySelector('img')?.getAttribute('src') || '')
      : (gallery.querySelector('.mp-gallery__image')?.getAttribute('src') || '');
    const img = modal.querySelector('.mp-photo__image');
    if (img && mainSrc) img.src = mainSrc;
    // Previews in the modal
    const thumbsWrap = modal.querySelector('.mp-photo__thumbs');
    if (thumbsWrap) {
      if (photoThumbs.length) {
        thumbsWrap.innerHTML = photoThumbs.map((t, i) => {
          const src = t.querySelector('img')?.getAttribute('src') || t.getAttribute('data-full') || '';
          return `<button class="mp-gallery__thumb${i === activePhotoIndex ? ' is-active' : ''}" type="button" data-full="${src}"><img src="${src}" alt="Превью ${i + 1}"></button>`;
        }).join('');
      } else {
        // Fallback — if there are no thumbnails but there is a main src
        thumbsWrap.innerHTML = mainSrc ? `<button class="mp-gallery__thumb is-active" type="button" data-full="${mainSrc}"><img src="${mainSrc}" alt="Превью"></button>` : '';
      }
    }
    updatePhotoNavVisibility();
    // Scroll the thumbnails so the active one is visible
    try {
      const activeThumb = modal.querySelector('.mp-photo__thumbs .mp-gallery__thumb.is-active');
      activeThumb?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
    } catch (_) {}
    // Show the modal
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    try { modal.querySelector('.mp-photo__image')?.focus?.(); } catch (_) {}
  };
  export const closePhotoModal = () => {
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  // Open: click on the current photo (not on arrows/badges)
  root.addEventListener('click', (e) => {
    if (e.target.closest('.mp-gallery__play')) return; // do not open the photo if the click is on play
    const img = e.target.closest('.mp-gallery__main .mp-gallery__image');
    if (!img) return;
    e.preventDefault();
    const gallery = root.querySelector('.mp-gallery');
    const activeThumb = gallery?.querySelector('.mp-gallery__thumb.is-active');
    const isVideoActive = activeThumb?.getAttribute('data-type') === 'video';
    if (isVideoActive) {
      const src = activeThumb.getAttribute('data-video') || gallery?.getAttribute('data-video') || '';
      openVideoModal(src);
    } else {
      openPhotoModal();
    }
  });

  // =================== Video: open/close modal ===================
  const openVideoModal = (src) => {
    const modal = root.querySelector('.mp-video-modal');
    if (!modal) return;
    const video = modal.querySelector('.mp-video__el');
    const title = modal.querySelector('#mp-video-modal-title');
    const pageTitle = (root.querySelector('.mp-gallery .mp-title')?.textContent || '').trim();
    if (title) title.textContent = pageTitle ? `Видео — ${pageTitle}` : 'Видео';
    if (video) {
      try { video.src = src || ''; } catch (_) { /* noop */ }
      try { video.currentTime = 0; } catch (_) {}
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closeVideoModal = () => {
    const modal = root.querySelector('.mp-video-modal');
    if (!modal) return;
    const video = modal.querySelector('.mp-video__el');
    modal.hidden = true;
    document.body.style.overflow = '';
    // Stop and clear the source
    if (video) {
      try { video.pause(); } catch (_) {}
      try { video.removeAttribute('src'); video.load?.(); } catch (_) {}
    }
  };
  // Play button on the main photo
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-gallery__play');
    if (!btn) return;
    e.preventDefault();
    // Video source: data-video on the button or on .mp-gallery, then a fallback (empty)
    const gallery = root.querySelector('.mp-gallery');
    const src = btn.getAttribute('data-video')
      || gallery?.getAttribute('data-video')
      || '';
    openVideoModal(src);
  });
  // Video close on overlay/close icon is already handled by the common handler; adding an explicit call
  root.addEventListener('click', (e) => {
    const isClose = e.target.closest('.mp-video-modal [data-close="true"]');
    if (!isClose) return;
    closeVideoModal();
  });
  // ESC closes the video
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVideoModal(); });
  // Navigation inside the lightbox
  root.addEventListener('click', (e) => {
    const prev = e.target.closest('.mp-photo-modal .mp-photo__prev');
    const next = e.target.closest('.mp-photo-modal .mp-photo__next');
    if (!prev && !next) return;
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal || modal.hidden) return;
    const thumbs = Array.from(modal.querySelectorAll('.mp-photo__thumbs .mp-gallery__thumb'));
    if (!thumbs.length) return;
    const idx = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const target = next ? Math.min(idx + 1, thumbs.length - 1) : Math.max(idx - 1, 0);
    if (thumbs[target]) thumbs[target].click();
  });
  // Click on a thumbnail inside the lightbox
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.mp-photo-modal .mp-photo__thumbs .mp-gallery__thumb');
    if (!btn) return;
    const modal = root.querySelector('.mp-photo-modal');
    const img = modal?.querySelector('.mp-photo__image');
    const src = btn.getAttribute('data-full') || btn.querySelector('img')?.getAttribute('src');
    if (img && src) img.src = src;
    btn.parentElement?.querySelectorAll('.mp-gallery__thumb.is-active').forEach((el) => el.classList.remove('is-active'));
    btn.classList.add('is-active');
    updatePhotoNavVisibility();
    try { btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (_) {}
  });
  // Additional close on Esc
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePhotoModal(); return; }
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal || modal.hidden) return;
    if (e.key === 'ArrowRight') {
      const next = modal.querySelector('.mp-photo__next');
      next?.click();
    } else if (e.key === 'ArrowLeft') {
      const prev = modal.querySelector('.mp-photo__prev');
      prev?.click();
    }
  });
  // Overlay click is handled by the common data-close="true" handler above

  function updatePhotoNavVisibility() {
    const modal = root.querySelector('.mp-photo-modal');
    if (!modal || modal.hidden) return;
    const thumbs = Array.from(modal.querySelectorAll('.mp-photo__thumbs .mp-gallery__thumb'));
    const prevBtn = modal.querySelector('.mp-photo__prev');
    const nextBtn = modal.querySelector('.mp-photo__next');
    if (!thumbs.length) { if (prevBtn) prevBtn.hidden = true; if (nextBtn) nextBtn.hidden = true; return; }
    const idx = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const isFirst = idx <= 0; const isLast = idx >= thumbs.length - 1;
    if (prevBtn) prevBtn.hidden = isFirst;
    if (nextBtn) nextBtn.hidden = isLast;
  }

  // "Next photo" button on the current image
  root.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('.mp-gallery__next');
    if (!nextBtn) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
    if (!thumbsWrap) return;
    const thumbs = Array.from(thumbsWrap.querySelectorAll('.mp-gallery__thumb'));
    if (!thumbs.length) return;
    const currentIndex = thumbs.findIndex((t) => t.classList.contains('is-active'));
    const nextIndex = Math.min((currentIndex >= 0 ? currentIndex + 1 : 1), thumbs.length - 1);
    // click the next preview — reuse the existing logic
    thumbs[nextIndex].click();
  });

  // "Previous photo" button
  root.addEventListener('click', (e) => {
    const prevBtn = e.target.closest('.mp-gallery__prev');
    if (!prevBtn) return;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
    if (!thumbsWrap) return;
    const thumbs = Array.from(thumbsWrap.querySelectorAll('.mp-gallery__thumb'));
    if (!thumbs.length) return;
    const currentIndex = thumbs.findIndex((t) => t.classList.contains('is-active'));
    const prevIndex = Math.max((currentIndex >= 0 ? currentIndex - 1 : 0), 0);
    thumbs[prevIndex].click();
  });

  // Show/hide arrows on the first/last photo
  export const updateGalleryNavVisibility = () => {
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const prevBtn = gallery.querySelector('.mp-gallery__prev');
    const nextBtn = gallery.querySelector('.mp-gallery__next');
    if (!thumbs.length) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }
    const currentIndex = thumbs.findIndex((t) => t.classList.contains('is-active'));
    const isFirst = currentIndex <= 0;
    const isLast = currentIndex >= thumbs.length - 1;
    if (prevBtn) prevBtn.hidden = isFirst;
    if (nextBtn) nextBtn.hidden = isLast;
  };
  // Update visibility when the gallery changes
  root.addEventListener('mp:gallery:change', updateGalleryNavVisibility);
  // Sync the active state of indicators when the photo changes
  root.addEventListener('mp:gallery:change', () => {
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    const activeIndex = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const indicators = Array.from(gallery.querySelectorAll('.mp-gallery__indicator'));
    indicators.forEach((el, i) => {
      const on = i === activeIndex;
      el.classList.toggle('is-active', on);
      try { el.setAttribute('aria-current', on ? 'true' : 'false'); } catch (_) {}
    });
  });

  // Click on an indicator → switch photo
  root.addEventListener('click', (e) => {
    const ind = e.target.closest('.mp-gallery__indicator');
    if (!ind) return;
    const idx = Number(ind.getAttribute('data-index')) || 0;
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery) return;
    const thumbs = Array.from(gallery.querySelectorAll('.mp-gallery__thumbs .mp-gallery__thumb'));
    if (thumbs[idx]) thumbs[idx].click();
  });
  // And on the initial data render
  root.addEventListener('mp:data', () => setTimeout(updateGalleryNavVisibility, 0));


  // Render the whole card from the given data
  export const renderAll = (data) => {
    if (data) setData(data);
    const gallery = root.querySelector('.mp-gallery');
    if (!gallery || !data) return;

    // Title and address
    const titleEl = gallery.querySelector('.mp-title');
    const addrEl = gallery.querySelector('.mp-address__text');
    if (titleEl) titleEl.textContent = data.name || '';
    if (addrEl) addrEl.textContent = data.address || '';

    // Main photo/video and previews
    const mainImg = gallery.querySelector('.mp-gallery__image');
    const playBtn = gallery.querySelector('.mp-gallery__play');
    const videoSrc = (typeof data.video === 'string' && data.video.trim()) ? data.video.trim() : (gallery.getAttribute('data-video') || '').trim();
    const hasPhotos = Array.isArray(data.photos) && data.photos.length;
    const hasVideo = !!videoSrc;
    
    // Function to extract a poster from the video
    const extractVideoPoster = (videoUrl, callback) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // required for autoplay
      video.currentTime = 1.5; // take the frame at 1.5 seconds
      
      video.addEventListener('loadeddata', () => {
        try {
          // Try to extract via Canvas
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(posterUrl);
        } catch (err) {
          console.warn('Canvas extraction failed, trying video poster approach:', err);
          // Fallback: use the video element itself as the source
          callback(videoUrl + '#t=1'); // URL with a timecode for the poster
        }
      });
      
      video.addEventListener('error', (e) => {
        console.warn('Ошибка загрузки видео для постера:', e);
        callback(hasPhotos ? data.photos[0] : ''); // final fallback
      });
      
      // Timeout in case loading takes long
      setTimeout(() => {
        if (video.readyState < 2) { // if the video did not load within 3 seconds
          callback(hasPhotos ? data.photos[0] : '');
        }
      }, 3000);
      
      video.src = videoUrl;
    };

    if (hasPhotos || hasVideo) {
      // Set the main frame
      if (mainImg) {
        if (hasVideo) {
          // Temporarily set the fallback while extracting the poster from the video
          const fallbackPoster = hasPhotos ? data.photos[0] : '';
          mainImg.src = fallbackPoster;
          
          // Extract the real poster from the video
          extractVideoPoster(videoSrc, (posterUrl) => {
            if (posterUrl && mainImg) {
              mainImg.src = posterUrl;
              // Update the background too
              const mainWrap = gallery.querySelector('.mp-gallery__main');
              if (mainWrap) {
                try {
                  mainWrap.style.setProperty('--mp-gallery-bg', `url("${posterUrl}")`);
                  mainWrap.style.backgroundImage = `url('${posterUrl}')`;
                  const bg = mainWrap.querySelector('img.mp-gallery__bg');
                  if (bg) bg.src = posterUrl;
                } catch (_) {}
              }
              // Update the video preview in the carousel
              const videoThumb = gallery.querySelector('.mp-gallery__thumb[data-type="video"]');
              if (videoThumb) {
                const thumbImg = videoThumb.querySelector('img');
                if (thumbImg) thumbImg.src = posterUrl;
                videoThumb.setAttribute('data-full', posterUrl);
              }
            }
          });
        } else {
          mainImg.src = data.photos[0];
        }
        try { mainImg.setAttribute('loading', 'eager'); } catch (_) {}
        
        // Background setup (will be updated asynchronously for video)
        const mainWrap = gallery.querySelector('.mp-gallery__main');
        if (mainWrap) {
          const initialBgSrc = hasVideo ? (hasPhotos ? data.photos[0] : '') : data.photos[0];
          try {
            mainWrap.style.setProperty('--mp-gallery-bg', `url("${initialBgSrc}")`);
            mainWrap.style.backgroundImage = `url('${initialBgSrc}')`;
            mainWrap.style.backgroundSize = 'cover';
            mainWrap.style.backgroundPosition = 'center';
            let bg = mainWrap.querySelector('img.mp-gallery__bg');
            if (!bg) {
              bg = document.createElement('img');
              bg.className = 'mp-gallery__bg';
              bg.alt = '';
              bg.setAttribute('aria-hidden', 'true');
              mainWrap.insertBefore(bg, mainWrap.firstChild);
            }
            bg.src = initialBgSrc;
          } catch (_) {}
        }
      }
      // Visibility and source of the play button: shown on load only if the video comes first
      if (playBtn) {
        playBtn.hidden = !hasVideo; // on load: if there is a video, show it (since the video comes first)
        if (hasVideo) playBtn.setAttribute('data-video', videoSrc); else playBtn.removeAttribute('data-video');
      }
      // Build previews: video first (if any), then photos
      const thumbsWrap = gallery.querySelector('.mp-gallery__thumbs');
      if (thumbsWrap) {
        const parts = [];
        if (hasVideo) {
          const thumbPosterFallback = hasPhotos ? data.photos[0] : '';
          parts.push(
            `<button class="mp-gallery__thumb is-active" type="button" role="listitem" aria-label="Видео" data-type="video" data-video="${videoSrc}" data-full="${thumbPosterFallback}">
              <img src="${thumbPosterFallback}" alt="Видео превью" loading="lazy">
            </button>`
          );
        }
        if (hasPhotos) {
          parts.push(
            data.photos.map((src, i) => (
              `<button class="mp-gallery__thumb${!hasVideo && i === 0 ? ' is-active' : ''}" type="button" role="listitem" aria-label="Фото ${i + 1}" data-full="${src}">
                <img src="${src}" alt="Превью ${i + 1}" loading="lazy">
              </button>`
            )).join('')
          );
        }
        thumbsWrap.innerHTML = parts.join('');
      }
      // Carousel indicators (mobile): create/update
      let indicators = gallery.querySelector('.mp-gallery__indicators');
      if (!indicators) {
        indicators = document.createElement('div');
        indicators.className = 'mp-gallery__indicators';
        const main = gallery.querySelector('.mp-gallery__main');
        if (main && main.parentNode) {
          main.parentNode.insertBefore(indicators, main.nextSibling);
        } else {
          gallery.appendChild(indicators);
        }
      }
      const totalItems = (hasPhotos ? data.photos.length : 0) + (hasVideo ? 1 : 0);
      indicators.innerHTML = Array.from({ length: totalItems }).map((_, i) => (
        `<button type="button" class="mp-gallery__indicator${i === 0 ? ' is-active' : ''}" aria-label="Показать элемент ${i + 1}" data-index="${i}"></button>`
      )).join('');
      // Update the count badge (including video)
      const badge = gallery.querySelector('.mp-gallery__badge .mp-badge__text');
      if (badge) badge.textContent = `${totalItems} фото`;
    }

    // ID badge (bottom left): taken from the id URL parameter
    try {
      const url = new URL(window.location.href);
      const objectId = url.searchParams.get('id');
      const idBadge = gallery.querySelector('.mp-gallery__badge--bl');
      if (idBadge) {
        const textSpan = idBadge.querySelector('.mp-badge__text');
        if (objectId && /^\d{1,}$/.test(objectId)) {
          if (textSpan) textSpan.textContent = `ID ${objectId}`;
          idBadge.hidden = false;
        } else {
          idBadge.hidden = true;
        }
      }
    } catch (_) { /* no-op */ }

    // Facts
    const factsWrap = root.querySelector('#overview .mp-facts');
    if (factsWrap && Array.isArray(data.facts)) {
      const iconByIndex = [
        'assets/img/square.svg',
        'assets/img/living-area.svg',
        'assets/img/kitchen.svg',
        'assets/img/floor.svg',
        'assets/img/construction-year.svg',
      ];
      factsWrap.innerHTML = data.facts.map(({ label, value }, i) => {
        const shortMap = {
          'Общая площадь': 'Общая пл.',
          'Жилая площадь': 'Жилая пл.',
          // Other potential abbreviations can be added here if needed
        };
        const labelShort = shortMap[label] || label;
        return (
          `<li class="mp-fact" data-label="${label}">
            <span class="mp-fact__icon" aria-hidden="true">${iconByIndex[i] ? `<img src="${iconByIndex[i]}" alt="" aria-hidden="true">` : ''}</span>
            <div class="mp-fact__text">
              <div class="mp-fact__label" data-label-short="${labelShort}">${label}</div>
              <div class="mp-fact__value">${value}</div>
            </div>
          </li>`
        );
      }).join('');
      factsWrap.querySelectorAll('.mp-fact__icon img').forEach((img) => {
        img.addEventListener('error', () => { img.remove(); });
      });
    }

    // Price and price per m²
    const priceEl = root.querySelector('.mp-overview__info .mp-price');
    const pricePerEl = root.querySelector('.mp-overview__info .mp-price-per');
    if (priceEl) {
      if (typeof data.currency === 'string') {
        try { priceEl.setAttribute('data-price-currency', data.currency); } catch(_) {}
      }
      if (typeof data.price === 'number') {
        priceEl.textContent = fmtCurrency(data.price, data.currency || 'RUB');
      }
    }
    if (pricePerEl) {
      let per = (typeof data.pricePerSqm === 'number') ? data.pricePerSqm : null;
      if (per == null && typeof data.price === 'number' && typeof data.totalAreaSqm === 'number' && data.totalAreaSqm > 0) {
        per = Math.round(data.price / data.totalAreaSqm);
      }
      if (typeof per === 'number') {
        pricePerEl.textContent = `${fmtNumber(per)} ₽/м²`;
      }
    }

    // Extended price breakdown
    renderPriceBreakdown(data);

    // Deal terms (2x2 grid)
    const termsWrap = root.querySelector('.mp-terms__grid');
    if (termsWrap) {
      const t = data.terms || {};
      const yesNo = (v) => (v ? 'Да' : 'Нет');
      const items = [
        { label: 'Тип продажи', value: t.saleType ?? '' },
        { label: 'Продается впервые', value: (t.firstSale != null) ? yesNo(!!t.firstSale) : '' },
        { label: 'Онлайн показ', value: (t.onlineViewing != null) ? yesNo(!!t.onlineViewing) : '' },
        { label: 'Ипотека', value: (t.mortgage != null) ? yesNo(!!t.mortgage) : '' },
      ];
      termsWrap.innerHTML = items.map(({ label, value }) => (
        `<li class="mp-terms__item">
          <span class="mp-terms__label">${label}</span>
          <span class="mp-terms__value">${value}</span>
        </li>`
      )).join('');
    }

    // About the property (4x3)
    const aboutWrap = root.querySelector('.mp-about__grid');
    if (aboutWrap && Array.isArray(data.about)) {
      aboutWrap.innerHTML = data.about.map(({ label, value }) => (
        `<li class="mp-about__item">
          <span class="mp-about__label">${label}</span>
          <span class="mp-about__value">${value}</span>
        </li>`
      )).join('');
    }

    // About the building (2x3)
    const buildingWrap = root.querySelector('.mp-building__grid');
    if (buildingWrap && Array.isArray(data.building)) {
      buildingWrap.innerHTML = data.building.map(({ label, value }) => (
        `<li class="mp-building__item">
          <span class="mp-building__label">${label}</span>
          <span class="mp-building__value">${value}</span>
        </li>`
      )).join('');
    }

    // Description (plain text)
    const descEl = root.querySelector('.mp-description__text');
    if (descEl && typeof data.description === 'string') {
      descEl.textContent = data.description;
    }

    // Location: initialize the map
    try { initMap(data); } catch (err) { /* no-op */ }
  };

// Print: fit the title to one line for print and restore after
  // Print hooks: before the print dialog opens, load the map without lazy
  export const fitTitleForPrint = () => {
    const title = root.querySelector('.mp-gallery .mp-title');
    if (!title) return;
    // Save the original inline font-size (if any)
    if (!title.dataset.printOriginalFontSize) {
      title.dataset.printOriginalFontSize = title.style.fontSize || '';
    }
    const originalComputed = parseFloat(getComputedStyle(title).fontSize) || 48;
    // Compute the available width — parent width or root
    const parent = title.parentElement || root;
    const available = (parent.clientWidth || 0) - 4; // small margin
    if (available <= 0) return;
    // Binary search reducing the size
    let low = 8;
    let high = originalComputed;
    const span = document.createElement('span');
    span.style.cssText = 'position:absolute;left:-9999px;top:-9999px;white-space:nowrap;font-weight:' + getComputedStyle(title).fontWeight + ';font-family:' + getComputedStyle(title).fontFamily + ';';
    document.body.appendChild(span);
    const text = title.textContent?.trim() || '';
    span.textContent = text;
    while (high - low > 0.5) {
      const mid = (low + high) / 2;
      span.style.fontSize = mid + 'px';
      if (span.offsetWidth <= available) {
        low = mid; // can go bigger
      } else {
        high = mid; // too wide
      }
    }
    const finalSize = Math.min(originalComputed, low);
    title.style.fontSize = finalSize.toFixed(2) + 'px';
    document.body.removeChild(span);
  };
  export const restoreTitleAfterPrint = () => {
    const title = root.querySelector('.mp-gallery .mp-title');
    if (!title) return;
    const orig = title.dataset.printOriginalFontSize;
    if (orig !== undefined) {
      title.style.fontSize = orig;
      delete title.dataset.printOriginalFontSize;
    }
    // Restart the regular autofit for screen mode
    try { TitleAutoFit.fitNow(); } catch (_) {}
    PriceBreakdown.restoreAfterPrint();
  };
