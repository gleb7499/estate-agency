// Map: lightweight iframe + geocoding (Yandex JSONP / OSM fallback) and print support
import { root, getData } from './state.js';
  // Build the static map image URL (Yandex Static Maps)
  const buildStaticMapUrl = ({ lat, lng, zoom = 16, size = [600, 400] }) => {
    const [w, h] = size;
    // API size limits: pick safe defaults
    const width = Math.max(200, Math.min(650, Math.round(w)));
    const height = Math.max(200, Math.min(650, Math.round(h)));
    // Red marker (pm2rdm)
    return `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=${zoom}&size=${width},${height}&pt=${lng},${lat},pm2rdm&l=map`;
  };

  // "Print" button — print the page
  root.addEventListener('click', (e) => {
    const printBtn = e.target.closest('.mp-header__print');
    if (!printBtn) return;
    // Before printing, prepare the map and wait for the static image to be ready when possible
    try { prepareMapForPrint(); } catch (_) {}
    const container = root.querySelector('#mp-map');
    const img = container?.querySelector('img.mp-map__print');
    const waitReady = (cb) => {
      const timeout = Date.now() + 1200;
      const tick = () => {
        if (!img || img.complete || img.naturalWidth > 0 || Date.now() > timeout) { cb(); return; }
        setTimeout(tick, 50);
      };
      tick();
    };
    waitReady(() => { try { window.print(); } catch (_) {} });
  });

  // Map initialization: get the coordinates → insert an iframe with the point
  // Address normalization: remove the apartment/floor/entrance from the string to improve the chance of an accurate geocode
  export const normalizeAddress = (addr) => {
    if (typeof addr !== 'string') return addr;
    let a = addr;
    a = a.replace(/\bкв\.?\s*\d+\b/gi, '');
    a = a.replace(/\bквартира\s*\d+\b/gi, '');
    a = a.replace(/\bподъезд\s*\d+\b/gi, '');
    a = a.replace(/\bэтаж\s*\d+\b/gi, '');
    // Frequent building format: 117/1 → 117k1 (as Yandex returns it)
    a = a.replace(/(\d+)\s*\/\s*(\d+)\b/g, '$1к$2');
    a = a.replace(/\s*,\s*,+/g, ','); // double commas
    a = a.replace(/\s{2,}/g, ' ').trim();
    a = a.replace(/,\s*$/,'');
    return a;
  };
  
  // Yandex JSONP geocoding (bypasses CORS). Returns [lat, lng]
  const jsonpGeocode = (addr) => {
    const address = normalizeAddress(addr);
    if (!address) return Promise.reject(new Error('Нет адреса для JSONP-геокодирования'));
    return new Promise((resolve, reject) => {
      const cbName = `__mp_jsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const url = `https://geocode-maps.yandex.ru/1.x/?format=json&lang=ru_RU&geocode=${encodeURIComponent(address)}&callback=${cbName}`;
      const script = document.createElement('script');
      let timer = null;
      const cleanup = () => {
        try { delete window[cbName]; } catch (_) {}
        if (script && script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timer);
      };
      window[cbName] = (j) => {
        try {
          const members = j?.response?.GeoObjectCollection?.featureMember || [];
          if (!members.length) throw new Error('JSONP: адрес не найден');
          let best = null;
          for (const m of members) {
            const kind = m?.GeoObject?.metaDataProperty?.GeocoderMetaData?.kind;
            if (kind === 'house') { best = m; break; }
          }
          const obj = best || members[0];
          const pos = obj?.GeoObject?.Point?.pos;
          if (!pos) throw new Error('JSONP: нет координат');
          const [lonStr, latStr] = pos.split(' ');
          const lat = parseFloat(latStr); const lng = parseFloat(lonStr);
          if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error('JSONP: нераспознанные координаты');
          resolve([lat, lng]);
        } catch (err) { reject(err); }
        finally { cleanup(); }
      };
      script.onerror = () => { cleanup(); reject(new Error('JSONP: ошибка загрузки')); };
      script.src = url;
      script.async = true;
      document.head.appendChild(script);
      timer = setTimeout(() => { cleanup(); reject(new Error('JSONP: таймаут')); }, 8000);
    });
  };
  // Alternative geocoder (OSM Nominatim) — no key. Returns [lat, lng]
  const osmGeocode = (addr) => {
    const address = normalizeAddress(addr);
    if (!address) return Promise.reject(new Error('Нет адреса для OSM-геокодирования'));
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
    return fetch(url, { headers: { 'Accept-Language': 'ru' } })
      .then((r) => { if (!r.ok) throw new Error(`OSM HTTP ${r.status}`); return r.json(); })
      .then((arr) => {
        if (!Array.isArray(arr) || !arr.length) throw new Error('OSM: адрес не найден');
        const { lat, lon } = arr[0] || {};
        const plat = parseFloat(lat); const plng = parseFloat(lon);
        if (Number.isNaN(plat) || Number.isNaN(plng)) throw new Error('OSM: нераспознанные координаты');
        return [plat, plng];
      });
  };
  export const initMap = (data) => {
    const container = root.querySelector('#mp-map');
    if (!container) return;
    const section = root.querySelector('#location');
    const addressAttr = (section && section.getAttribute('data-address') && section.getAttribute('data-address') !== '[TBD]')
      ? section.getAttribute('data-address')
      : null;
    const addressRaw = (data && typeof data.address === 'string') ? data.address : addressAttr;
    const address = normalizeAddress(addressRaw);
    // Try to take the coordinates from data attributes (if the integrator sets them)
    let lat = null; let lng = null;
    if (section) {
      const latAttr = section.getAttribute('data-lat');
      const lngAttr = section.getAttribute('data-lng');
      if (latAttr && lngAttr && latAttr !== '[TBD]' && lngAttr !== '[TBD]') {
        const latNum = Number(latAttr);
        const lngNum = Number(lngAttr);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) { lat = latNum; lng = lngNum; }
      }
    }
    if (!address && (lat == null || lng == null)) return;

    const buildIframeWithPoint = (plat, plng, eager = false) => {
      const src = `https://yandex.ru/map-widget/v1/?ll=${plng},${plat}&z=16&pt=${plng},${plat},pm2rdm`;
      const loading = eager ? 'eager' : 'lazy';
      container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="${loading}" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  // Update/create the static image for printing
  const img = container.querySelector('img.mp-map__print') || (() => { const i = document.createElement('img'); i.className = 'mp-map__print'; container.appendChild(i); return i; })();
      try { img.alt = 'Карта'; } catch (_) {}
      try { img.decoding = 'sync'; img.loading = 'eager'; } catch (_) {}
  try { img.src = buildStaticMapUrl({ lat: plat, lng: plng, size: [container.clientWidth || 600, container.clientHeight || 400] }); container.classList.add('has-print-map'); } catch (_) {}
    };

    // 1) if coordinates are given — draw immediately
  if (lat != null && lng != null) { buildIframeWithPoint(lat, lng); return; }

    // 2) address present — Yandex JSONP → OSM → as a last resort search (may show "1 found")
    jsonpGeocode(address)
      .then(([plat, plng]) => buildIframeWithPoint(plat, plng))
      .catch(() => osmGeocode(address)
        .then(([plat, plng]) => buildIframeWithPoint(plat, plng))
        .catch(() => {
          const q = encodeURIComponent(address || '');
          const src = `https://yandex.ru/map-widget/v1/?text=${q}&z=16`;
          container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
          // No exact coordinates — build the static map without a marker (the API does not support centering on text), leave only the iframe for printing
          const img = container.querySelector('img.mp-map__print') || (() => { const i = document.createElement('img'); i.className = 'mp-map__print'; container.appendChild(i); return i; })();
          try { img.removeAttribute('src'); } catch (_) {}
        })
      );
  };

  // Before printing, make sure the map is rendered and not "lazy"
  export const prepareMapForPrint = () => {
    const container = root.querySelector('#mp-map');
    if (!container) return;
  // If the iframe is not inserted yet — insert a quick search variant by address
    let iframe = container.querySelector('iframe');
    if (!iframe) {
      // Attempt to take the address from data/DOM
      const addrFromData = (getData() && getData().address) || '';
      const addrFromDom = (root.querySelector('.mp-gallery .mp-address__text')?.textContent || '').trim();
      const address = addrFromData || addrFromDom || '';
      if (address) {
        const q = encodeURIComponent(address);
        const src = `https://yandex.ru/map-widget/v1/?text=${q}&z=16`;
        container.innerHTML = `<iframe title="Карта" src="${src}" style="border:0;width:100%;height:100%" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        // Try to create a static image if the section has known coordinates
        const section = root.querySelector('#location');
        const latAttr = section?.getAttribute('data-lat');
        const lngAttr = section?.getAttribute('data-lng');
        const latNum = latAttr && latAttr !== '[TBD]' ? Number(latAttr) : null;
        const lngNum = lngAttr && lngAttr !== '[TBD]' ? Number(lngAttr) : null;
        if (latNum != null && !Number.isNaN(latNum) && lngNum != null && !Number.isNaN(lngNum)) {
          const img = document.createElement('img');
          img.className = 'mp-map__print';
          try { img.alt = 'Карта'; img.decoding = 'sync'; img.loading = 'eager'; } catch (_) {}
          try { img.src = buildStaticMapUrl({ lat: latNum, lng: lngNum, size: [container.clientWidth || 600, container.clientHeight || 400] }); container.classList.add('has-print-map'); } catch (_) {}
          container.appendChild(img);
        }
        iframe = container.querySelector('iframe');
      } else {
        // If the address is unavailable, try the standard initialization
        try { initMap(getData()); } catch (_) {}
      }
    }
    // Force off lazy loading and restart loading
    if (iframe) {
      try { iframe.setAttribute('loading', 'eager'); } catch (_) {}
      try { iframe.src = iframe.src; } catch (_) {}
    }
    // Make sure the static map image is ready — wait briefly
    const img = container.querySelector('img.mp-map__print');
    if (img && !img.complete) {
      try {
        const t0 = Date.now();
        const done = (cb) => {
          if (img.complete || img.naturalWidth > 0 || Date.now() - t0 > 1500) cb();
          else setTimeout(() => done(cb), 60);
        };
        // Printing is triggered by external code; here we just try to get it loaded in time
        done(() => {});
      } catch (_) {}
    }
  };

