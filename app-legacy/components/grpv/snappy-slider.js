/**
 * SnappySlider - Vanilla JS version for GRPV category weighting
 * Values 1-5, snapping, track with markers, thumb with value
 */
(function () {
  'use strict';

  function formatNum(val, step) {
    step = step || 1;
    var n = Number(val);
    if (isNaN(n)) return String(val);
    var dec = (step.toString().split('.')[1] || '').length;
    if (dec === 0 && Number.isInteger(n)) return n.toString();
    return n.toFixed(dec);
  }

  function createSnappySlider(opts) {
    var values = opts.values || [1, 2, 3, 4, 5];
    var defaultValue = opts.defaultValue !== undefined ? opts.defaultValue : 4;
    var min = opts.min !== undefined ? opts.min : Math.min.apply(null, values);
    var max = opts.max !== undefined ? opts.max : Math.max.apply(null, values);
    var step = opts.step !== undefined ? opts.step : 1;
    var label = opts.label || '';
    var id = opts.id || 'snappy-' + Math.random().toString(36).slice(2);
    var dataCat = opts.dataCat || '';

    var sliderValues = values.filter(function (v) { return v >= min && v <= max; });
    if (sliderValues.length === 0) sliderValues = [min, max];
    var sliderMin = Math.min.apply(null, sliderValues);
    var sliderMax = Math.max.apply(null, sliderValues);

    var currentValue = defaultValue;
    var onChange = opts.onChange || function () {};

    var wrap = document.createElement('div');
    wrap.className = 'grpv-snappy-slider';
    if (dataCat) wrap.setAttribute('data-cat', dataCat);

    var header = document.createElement('div');
    header.className = 'grpv-snappy-header';

    var labelEl = document.createElement('label');
    labelEl.setAttribute('for', id + '-input');
    labelEl.className = 'grpv-snappy-label';
    labelEl.textContent = label;

    var valueWrap = document.createElement('div');
    valueWrap.className = 'grpv-snappy-value-wrap';

    var input = document.createElement('input');
    input.type = 'number';
    input.id = id + '-input';
    input.className = 'grpv-snappy-value-input';
    input.value = formatNum(currentValue, step);
    input.min = min;
    input.max = max;
    input.step = step;

    valueWrap.appendChild(input);
    header.appendChild(labelEl);
    header.appendChild(valueWrap);
    wrap.appendChild(header);

    var trackWrap = document.createElement('div');
    trackWrap.className = 'grpv-snappy-track-wrap';

    var track = document.createElement('div');
    track.className = 'grpv-snappy-track';
    track.setAttribute('role', 'slider');
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-valuemin', min);
    track.setAttribute('aria-valuemax', max);
    track.setAttribute('aria-valuenow', currentValue);

    var progress = document.createElement('div');
    progress.className = 'grpv-snappy-progress';

    sliderValues.forEach(function (mark) {
      if (mark === 0) return;
      var pct = ((mark - sliderMin) / (sliderMax - sliderMin)) * 100;
      if (pct < 0 || pct > 100) return;
      var m = document.createElement('div');
      m.className = 'grpv-snappy-marker';
      m.style.left = pct + '%';
      track.appendChild(m);
    });

    track.insertBefore(progress, track.firstChild);

    var thumb = document.createElement('div');
    thumb.className = 'grpv-snappy-thumb';
    var thumbTri = document.createElement('div');
    thumbTri.className = 'grpv-snappy-thumb-triangle';
    var thumbSq = document.createElement('div');
    thumbSq.className = 'grpv-snappy-thumb-square';
    var thumbVal = document.createElement('div');
    thumbVal.className = 'grpv-snappy-thumb-value';
    thumb.appendChild(thumbTri);
    thumb.appendChild(thumbSq);
    thumb.appendChild(thumbVal);

    track.appendChild(thumb);
    trackWrap.appendChild(track);
    wrap.appendChild(trackWrap);

    function updateUI() {
      var pct = ((Math.min(Math.max(currentValue, sliderMin), sliderMax) - sliderMin) / (sliderMax - sliderMin)) * 100;
      progress.style.width = pct + '%';
      thumb.style.left = pct + '%';
      thumbVal.textContent = formatNum(currentValue, step);
      input.value = formatNum(currentValue, step);
      track.setAttribute('aria-valuenow', currentValue);
    }

    function setValue(v) {
      var clamped = Math.max(min, Math.min(max, Math.round(v / step) * step));
      if (clamped !== currentValue) {
        currentValue = clamped;
        updateUI();
        onChange(currentValue);
      }
    }

    function handleInteraction(clientX) {
      var rect = track.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      var raw = pct * (sliderMax - sliderMin) + sliderMin;
      var snapPoints = sliderValues.concat([currentValue]).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      var closest = snapPoints.reduce(function (prev, curr) {
        return Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev;
      });
      if (Math.abs(closest - raw) <= 0.5) {
        setValue(closest);
      } else {
        setValue(raw);
      }
    }

    track.addEventListener('mousedown', function (e) {
      e.preventDefault();
      handleInteraction(e.clientX);
      document.body.style.userSelect = 'none';
      function onMove(e) { handleInteraction(e.clientX); }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.body.style.userSelect = '';
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, { once: true });
    });

    track.addEventListener('dblclick', function () {
      setValue(defaultValue);
    });

    input.addEventListener('change', function () {
      var v = Number(input.value);
      if (!isNaN(v)) setValue(v);
      else updateUI();
    });

    input.addEventListener('blur', function () {
      var v = Number(input.value);
      if (isNaN(v)) {
        input.value = formatNum(currentValue, step);
      } else {
        setValue(v);
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setValue(currentValue + (e.key === 'ArrowUp' ? step : -step));
      }
    });

    updateUI();

    wrap.getValue = function () { return currentValue; };
    wrap.setValue = function (v) { setValue(v); updateUI(); };
    wrap.getInputId = function () { return id + '-input'; };

    return wrap;
  }

  window.createGRPVSnappySlider = createSnappySlider;
})();
