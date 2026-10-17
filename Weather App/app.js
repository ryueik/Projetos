/* Weather App — previsão do tempo com Open-Meteo (sem chave de API)
   Geocoding: https://geocoding-api.open-meteo.com/v1/search
   Previsão:  https://api.open-meteo.com/v1/forecast */
(function () {
  'use strict';

  var GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  var STORE = 'weather:lastPlace';
  var DEFAULT_PLACE = { name: 'Taubaté', admin1: 'São Paulo', country: 'Brasil', latitude: -23.0264, longitude: -45.5553 };

  var $ = function (id) { return document.getElementById(id); };
  var main = $('main');
  var input = $('cityInput');
  var list = $('suggestions');
  var currentPlace = null;
  var lastData = null;
  var suggestTimer = null;
  var suggestCtrl = null;
  var forecastCtrl = null;
  var results = [];
  var activeIndex = -1;

  /* ---------------- Códigos WMO → descrição + ícone ---------------- */
  var WMO = {
    0: ['Céu limpo', 'clear'], 1: ['Predomínio de sol', 'mostly'], 2: ['Parcialmente nublado', 'partly'], 3: ['Nublado', 'cloudy'],
    45: ['Neblina', 'fog'], 48: ['Neblina com geada', 'fog'],
    51: ['Garoa fraca', 'drizzle'], 53: ['Garoa', 'drizzle'], 55: ['Garoa forte', 'drizzle'],
    56: ['Garoa congelante', 'drizzle'], 57: ['Garoa congelante forte', 'drizzle'],
    61: ['Chuva fraca', 'rain'], 63: ['Chuva', 'rain'], 65: ['Chuva forte', 'rain'],
    66: ['Chuva congelante', 'rain'], 67: ['Chuva congelante forte', 'rain'],
    71: ['Neve fraca', 'snow'], 73: ['Neve', 'snow'], 75: ['Neve forte', 'snow'], 77: ['Grãos de neve', 'snow'],
    80: ['Pancadas de chuva fracas', 'showers'], 81: ['Pancadas de chuva', 'showers'], 82: ['Pancadas de chuva fortes', 'showers'],
    85: ['Pancadas de neve', 'snow'], 86: ['Pancadas de neve fortes', 'snow'],
    95: ['Trovoadas', 'storm'], 96: ['Trovoadas com granizo', 'storm'], 99: ['Trovoadas com granizo forte', 'storm']
  };
  function wmo(code) { return WMO[code] || ['Condição desconhecida', 'cloudy']; }

  // Ícones SVG fixos (não contêm dados do usuário)
  var P = {
    sun: '<circle class="sun" cx="32" cy="32" r="11"/><g class="ray"><path d="M32 9v6M32 49v6M9 32h6M49 32h6M15.7 15.7l4.2 4.2M44.1 44.1l4.2 4.2M15.7 48.3l4.2-4.2M44.1 19.9l4.2-4.2"/></g>',
    sunSmall: '<circle class="sun" cx="24" cy="24" r="9"/><g class="ray"><path d="M24 7v4M7 24h4M12 12l3 3M36 12l-3 3M12 36l3-3"/></g>',
    moon: '<path class="moon" d="M40 12a18 18 0 1 0 12 30A15 15 0 0 1 40 12z"/>',
    moonSmall: '<path class="moon" d="M30 10a13 13 0 1 0 10 21A11 11 0 0 1 30 10z"/>',
    cloud: '<path class="cloud" d="M20 50h26a10 10 0 0 0 1-20 14 14 0 0 0-27-2 11 11 0 0 0 0 22z"/>',
    cloudBack: '<path class="cloud-d" d="M38 34h14a7 7 0 0 0 0-14 10 10 0 0 0-19-1 8 8 0 0 0 5 15z"/>',
    cloudDark: '<path class="cloud-d" d="M20 44h26a10 10 0 0 0 1-20 14 14 0 0 0-27-2 11 11 0 0 0 0 22z"/>',
    cloudHigh: '<path class="cloud" d="M20 42h26a10 10 0 0 0 1-20 14 14 0 0 0-27-2 11 11 0 0 0 0 22z"/>',
    drizzle: '<g class="drop"><path d="M24 50l-1 4M34 50l-1 4M44 50l-1 4"/></g>',
    rain: '<g class="drop"><path d="M22 49l-3 8M32 49l-3 8M42 49l-3 8"/></g>',
    snow: '<g class="flake"><path d="M22 50v6M19 53h6M34 50v6M31 53h6M46 50v6M43 53h6"/></g>',
    bolt: '<path class="bolt" d="M34 42l-8 12h6l-3 9 10-13h-6l4-8z"/>',
    fog: '<g class="fog"><path d="M12 46h40M16 53h32M20 60h24"/></g>'
  };
  function icon(kind, isDay) {
    var body;
    switch (kind) {
      case 'clear': body = isDay ? P.sun : P.moon; break;
      case 'mostly': body = (isDay ? P.sunSmall : P.moonSmall) + '<g transform="translate(14 10) scale(.8)">' + P.cloud + '</g>'; break;
      case 'partly': body = (isDay ? P.sunSmall : P.moonSmall) + P.cloud; break;
      case 'cloudy': body = P.cloudBack + P.cloud; break;
      case 'fog': body = '<g transform="translate(0 -8)">' + P.cloud + '</g>' + P.fog; break;
      case 'drizzle': body = P.cloudHigh + P.drizzle; break;
      case 'rain': body = P.cloudDark + '<g transform="translate(0 -2)">' + P.cloudHigh + '</g>' + P.rain; break;
      case 'showers': body = (isDay ? P.sunSmall : P.moonSmall) + P.cloudHigh + P.rain; break;
      case 'snow': body = P.cloudHigh + P.snow; break;
      case 'storm': body = P.cloudDark + '<g transform="translate(0 -4)">' + P.cloudHigh + '</g>' + P.bolt; break;
      default: body = P.cloud;
    }
    return '<svg class="wx" viewBox="0 0 64 64" aria-hidden="true">' + body + '</svg>';
  }
  function iconEl(kind, isDay, label) {
    var wrap = document.createElement('span');
    wrap.innerHTML = icon(kind, isDay); // marcação fixa definida acima
    var s = wrap.firstChild;
    if (label) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); s.removeAttribute('aria-hidden'); }
    return s;
  }
  function skyFor(kind, isDay) {
    if (kind === 'storm') return 'storm';
    if (kind === 'rain' || kind === 'showers' || kind === 'drizzle') return 'rain';
    if (kind === 'snow') return 'snow';
    if (kind === 'cloudy' || kind === 'fog') return 'cloudy';
    return isDay ? 'clear' : 'clear-night';
  }

  /* ---------------- Formatação ---------------- */
  var WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var WEEK_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function parseLocal(iso) { // "2026-10-16T14:00" ou "2026-10-16" no fuso da cidade
    var m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0,
      wd: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() };
  }
  function hhmm(iso) { var p = parseLocal(iso); return p ? String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0') : '--:--'; }
  function round(n) { return typeof n === 'number' && isFinite(n) ? Math.round(n) : '--'; }
  function windDir(deg) {
    if (typeof deg !== 'number') return '';
    return ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(deg / 45) % 8];
  }
  function uvLabel(uv) {
    if (typeof uv !== 'number') return '--';
    var u = Math.round(uv);
    var t = u <= 2 ? 'baixo' : u <= 5 ? 'moderado' : u <= 7 ? 'alto' : u <= 10 ? 'muito alto' : 'extremo';
    return u + ' · ' + t;
  }
  function placeLabel(p) {
    return [p.admin1, p.country].filter(Boolean).join(', ');
  }

  /* ---------------- Estados ---------------- */
  function setLoading(on) {
    main.classList.toggle('is-loading', on);
    main.setAttribute('aria-busy', String(on));
    if (on) {
      ['hours', 'days'].forEach(function (id) {
        var el = $(id); el.textContent = '';
        for (var i = 0; i < (id === 'hours' ? 8 : 7); i++) {
          var li = document.createElement('li'); li.className = 'skel'; el.appendChild(li);
        }
      });
    }
  }
  var lastAction = null;
  function showError(title, text) {
    $('alertTitle').textContent = title;
    $('alertText').textContent = text;
    $('alert').hidden = false;
  }
  function hideError() { $('alert').hidden = true; }

  /* ---------------- Rede ---------------- */
  function getJSON(url, ctrl) {
    return fetch(url, { signal: ctrl ? ctrl.signal : undefined }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function searchCities(q, count) {
    if (suggestCtrl) suggestCtrl.abort();
    suggestCtrl = new AbortController();
    var url = GEO_URL + '?name=' + encodeURIComponent(q) + '&count=' + (count || 6) + '&language=pt&format=json';
    return getJSON(url, suggestCtrl).then(function (d) { return (d && d.results) || []; });
  }

  function loadForecast(place) {
    lastAction = function () { loadForecast(place); };
    if (forecastCtrl) forecastCtrl.abort();
    forecastCtrl = new AbortController();
    hideError();
    setLoading(true);
    var params = [
      'latitude=' + encodeURIComponent(place.latitude),
      'longitude=' + encodeURIComponent(place.longitude),
      'current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m',
      'hourly=temperature_2m,weather_code,precipitation_probability,is_day',
      'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
      'timezone=auto',
      'forecast_days=7',
      'wind_speed_unit=kmh'
    ].join('&');
    return getJSON(FORECAST_URL + '?' + params, forecastCtrl)
      .then(function (data) {
        if (!data || !data.current || !data.hourly || !data.daily) throw new Error('Resposta incompleta');
        currentPlace = place;
        lastData = data;
        try { localStorage.setItem(STORE, JSON.stringify(place)); } catch (e) { /* sem storage */ }
        render(place, data);
        setLoading(false);
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        setLoading(false);
        if (lastData && currentPlace) render(currentPlace, lastData); // mantém a última previsão válida
        else { $('hours').textContent = ''; $('days').textContent = ''; $('cityName').textContent = place.name; }
        showError('Não foi possível carregar a previsão',
          'Verifique sua conexão com a internet e tente novamente. (' + (err && err.message ? err.message : 'erro') + ')');
      });
  }

  /* ---------------- Renderização ---------------- */
  function render(place, data) {
    var c = data.current, d = data.daily, h = data.hourly;
    var w = wmo(c.weather_code);
    var isDay = c.is_day === 1;

    document.body.setAttribute('data-sky', skyFor(w[1], isDay));
    document.title = round(c.temperature_2m) + '°C · ' + place.name + ' — Weather App';

    var t = parseLocal(c.time);
    $('localTime').textContent = t
      ? WEEK_LONG[t.wd] + ', ' + t.d + ' ' + MONTHS[t.mo - 1] + ' · ' + hhmm(c.time)
      : '';
    $('cityName').textContent = place.name;
    $('cityRegion').textContent = placeLabel(place) || ' ';
    var ic = $('nowIcon'); ic.textContent = ''; ic.appendChild(iconEl(w[1], isDay, w[0]));
    $('nowTemp').textContent = round(c.temperature_2m);
    $('nowDesc').textContent = w[0];
    $('nowRange').textContent = 'Máx. ' + round(d.temperature_2m_max[0]) + '° · Mín. ' + round(d.temperature_2m_min[0]) + '°';
    $('mFeels').textContent = round(c.apparent_temperature) + '°';
    $('mHumidity').textContent = round(c.relative_humidity_2m) + '%';
    $('mWind').textContent = round(c.wind_speed_10m) + ' km/h ' + windDir(c.wind_direction_10m);
    $('mPressure').textContent = round(c.pressure_msl) + ' hPa';
    $('mUv').textContent = uvLabel(d.uv_index_max[0]);
    $('mSun').textContent = hhmm(d.sunrise[0]) + ' / ' + hhmm(d.sunset[0]);

    // Próximas 24 horas a partir da hora atual da cidade
    var nowKey = String(c.time).slice(0, 13); // "AAAA-MM-DDTHH"
    var start = h.time.findIndex(function (x) { return String(x).slice(0, 13) >= nowKey; });
    if (start < 0) start = 0;
    var hours = $('hours'); hours.textContent = '';
    for (var i = start; i < Math.min(start + 24, h.time.length); i++) {
      var hw = wmo(h.weather_code[i]);
      var li = document.createElement('li');
      li.className = 'hour' + (i === start ? ' is-now' : '');
      var tm = document.createElement('time');
      tm.dateTime = h.time[i];
      tm.textContent = i === start ? 'Agora' : hhmm(h.time[i]);
      var temp = document.createElement('strong');
      temp.textContent = round(h.temperature_2m[i]) + '°';
      var rain = document.createElement('small');
      var pp = h.precipitation_probability ? h.precipitation_probability[i] : null;
      rain.textContent = typeof pp === 'number' && pp >= 10 ? pp + '%' : '';
      if (rain.textContent) rain.title = 'Chance de chuva';
      li.append(tm, iconEl(hw[1], h.is_day ? h.is_day[i] === 1 : true, hw[0]), temp, rain);
      hours.appendChild(li);
    }

    // 7 dias
    var days = $('days'); days.textContent = '';
    var minAll = Math.min.apply(null, d.temperature_2m_min);
    var maxAll = Math.max.apply(null, d.temperature_2m_max);
    var span = Math.max(1, maxAll - minAll);
    d.time.forEach(function (day, idx) {
      var p = parseLocal(day);
      var dw = wmo(d.weather_code[idx]);
      var li = document.createElement('li');
      li.className = 'day';
      var name = document.createElement('div');
      name.className = 'day__name';
      name.textContent = idx === 0 ? 'Hoje' : idx === 1 ? 'Amanhã' : WEEK[p.wd];
      var sm = document.createElement('small');
      sm.textContent = String(p.d).padStart(2, '0') + '/' + String(p.mo).padStart(2, '0');
      name.appendChild(sm);
      var rainEl = document.createElement('span');
      rainEl.className = 'day__rain';
      var pr = d.precipitation_probability_max ? d.precipitation_probability_max[idx] : null;
      rainEl.textContent = typeof pr === 'number' && pr > 0 ? pr + '%' : '';
      if (rainEl.textContent) rainEl.title = 'Chance de chuva';
      var range = document.createElement('div');
      range.className = 'range';
      var lo = document.createElement('span'); lo.textContent = round(d.temperature_2m_min[idx]) + '°';
      var hi = document.createElement('span'); hi.textContent = round(d.temperature_2m_max[idx]) + '°';
      var bar = document.createElement('div'); bar.className = 'bar';
      var fill = document.createElement('i');
      fill.style.left = ((d.temperature_2m_min[idx] - minAll) / span * 100) + '%';
      fill.style.right = ((maxAll - d.temperature_2m_max[idx]) / span * 100) + '%';
      bar.appendChild(fill);
      bar.setAttribute('aria-hidden', 'true');
      range.append(lo, bar, hi);
      li.title = dw[0];
      li.append(name, iconEl(dw[1], true, dw[0]), rainEl, range);
      days.appendChild(li);
    });

    $('updated').textContent = 'às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------------- Busca com sugestões ---------------- */
  function closeList() {
    list.hidden = true; list.textContent = ''; results = []; activeIndex = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function renderSuggestions(items, emptyMsg) {
    list.textContent = '';
    results = items;
    activeIndex = -1;
    if (!items.length) {
      var e = document.createElement('li');
      e.className = 's-empty';
      e.textContent = emptyMsg || 'Nenhuma cidade encontrada.';
      list.appendChild(e);
    }
    items.forEach(function (p, i) {
      var li = document.createElement('li');
      li.id = 'sug-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      var n = document.createElement('span'); n.textContent = p.name;
      var r = document.createElement('small'); r.textContent = placeLabel(p);
      li.append(n, r);
      li.addEventListener('mousedown', function (ev) { ev.preventDefault(); choose(i); });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function highlight(i) {
    var opts = list.querySelectorAll('[role="option"]');
    if (!opts.length) return;
    activeIndex = (i + opts.length) % opts.length;
    opts.forEach(function (o, k) { o.setAttribute('aria-selected', String(k === activeIndex)); });
    input.setAttribute('aria-activedescendant', opts[activeIndex].id);
    opts[activeIndex].scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    var p = results[i];
    if (!p) return;
    closeList();
    input.value = '';
    input.blur();
    loadForecast({ name: p.name, admin1: p.admin1 || '', country: p.country || '', latitude: p.latitude, longitude: p.longitude });
  }

  input.addEventListener('input', function () {
    var q = input.value.trim();
    clearTimeout(suggestTimer);
    if (q.length < 2) { closeList(); return; }
    suggestTimer = setTimeout(function () {
      searchCities(q).then(function (items) {
        if (input.value.trim() === q) renderSuggestions(items);
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        renderSuggestions([], 'Não foi possível buscar cidades agora.');
      });
    }, 280);
  });
  input.addEventListener('keydown', function (e) {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(activeIndex + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(activeIndex - 1); }
    else if (e.key === 'Escape') { closeList(); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); choose(activeIndex); }
  });
  input.addEventListener('blur', function () { setTimeout(closeList, 120); });

  $('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (q.length < 2) {
      renderSuggestions([], 'Digite pelo menos 2 letras do nome da cidade.');
      input.focus();
      return;
    }
    clearTimeout(suggestTimer);
    searchCities(q, 6).then(function (items) {
      if (!items.length) { renderSuggestions([], 'Nenhuma cidade encontrada para “' + q + '”.'); return; }
      results = items;
      choose(0);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      showError('Busca indisponível', 'Não foi possível buscar a cidade. Verifique sua conexão.');
    });
  });

  /* ---------------- Geolocalização ---------------- */
  var geoBtn = $('geoBtn');
  geoBtn.addEventListener('click', function () {
    if (!('geolocation' in navigator)) {
      showError('Localização indisponível', 'Seu navegador não oferece suporte à geolocalização. Busque a cidade pelo nome.');
      return;
    }
    geoBtn.classList.add('is-loading');
    geoBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      geoBtn.classList.remove('is-loading'); geoBtn.disabled = false;
      var lat = +pos.coords.latitude.toFixed(4), lon = +pos.coords.longitude.toFixed(4);
      loadForecast({ name: 'Minha localização', admin1: '', country: lat + ', ' + lon, latitude: lat, longitude: lon });
    }, function (err) {
      geoBtn.classList.remove('is-loading'); geoBtn.disabled = false;
      var msg = err && err.code === 1
        ? 'Você não permitiu o acesso à localização. Libere a permissão no navegador ou busque a cidade pelo nome.'
        : 'Não foi possível obter sua localização agora. Tente novamente ou busque a cidade pelo nome.';
      showError('Localização não obtida', msg);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });

  $('retryBtn').addEventListener('click', function () { hideError(); if (lastAction) lastAction(); });

  $('themeBtn').addEventListener('click', function () {
    var root = document.documentElement;
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('weather-theme', next); } catch (e) { /* sem storage */ }
  });

  /* ---------------- Início ---------------- */
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
  var valid = saved && typeof saved.name === 'string' && isFinite(saved.latitude) && isFinite(saved.longitude);
  loadForecast(valid ? saved : DEFAULT_PLACE);

  // Atualiza a cada 15 minutos quando a aba está visível
  setInterval(function () { if (!document.hidden && currentPlace) loadForecast(currentPlace); }, 15 * 60 * 1000);
})();
