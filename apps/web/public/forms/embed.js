(function () {
  'use strict';
  var script = document.currentScript;
  var base = script ? new URL(script.src).origin : window.location.origin;
  function renderForm(formId, container) {
    container.innerHTML = '';
    fetch(base + '/api/forms/' + encodeURIComponent(formId))
      .then(function (r) { if (!r.ok) throw new Error('Form not found'); return r.json(); })
      .then(function (form) {
        var startedAt = Date.now();
        var formEl = document.createElement('form');
        formEl.className = 'wrr-form';
        var hp = document.createElement('div');
        hp.style.cssText = 'position:absolute;left:-9999px;';
        var hpi = document.createElement('input');
        hpi.type = 'text';
        hpi.name = 'companyFax';
        hpi.setAttribute('tabindex', '-1');
        hpi.setAttribute('autocomplete', 'off');
        hp.appendChild(hpi);
        formEl.appendChild(hp);
        (form.fields || []).forEach(function (f) {
          var wrap = document.createElement('div');
          wrap.setAttribute('data-wrr-field', f.key);
          if (f.type === 'hidden') {
            var hi = document.createElement('input');
            hi.type = 'hidden';
            hi.name = f.key;
            wrap.appendChild(hi);
            container.appendChild(wrap);
            return;
          }
          var label = document.createElement('label');
          label.textContent = (f.label || f.key) + (f.required ? ' *' : '');
          wrap.appendChild(label);
          var el;
          if (f.type === 'textarea') {
            el = document.createElement('textarea');
            el.placeholder = f.placeholder || '';
            el.rows = 3;
          } else if (f.type === 'select') {
            el = document.createElement('select');
            var opt0 = document.createElement('option');
            opt0.value = '';
            opt0.textContent = f.placeholder || 'Select…';
            el.appendChild(opt0);
            (f.options || []).forEach(function (o) {
              var opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label || o.value;
              el.appendChild(opt);
            });
          } else if (f.type === 'radio' || f.type === 'checkbox') {
            (f.options || []).forEach(function (o) {
              var lb = document.createElement('label');
              var inp = document.createElement('input');
              inp.type = f.type;
              inp.name = f.key;
              inp.value = o.value;
              if (f.type === 'radio' && f.required) inp.required = true;
              lb.appendChild(inp);
              lb.appendChild(document.createTextNode(' ' + (o.label || o.value)));
              wrap.appendChild(lb);
            });
            container.appendChild(wrap);
            return;
          } else {
            el = document.createElement('input');
            el.type = f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text';
            el.placeholder = f.placeholder || '';
          }
          if (el) { el.name = f.key; el.required = !!f.required; wrap.appendChild(el); }
          container.appendChild(wrap);
        });
        var submitWrap = document.createElement('div');
        var submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.textContent = 'Submit';
        submitWrap.appendChild(submitBtn);
        formEl.appendChild(submitWrap);
        container.appendChild(formEl);
        formEl.addEventListener('submit', function (e) {
          e.preventDefault();
          submitBtn.disabled = true;
          var payload = {};
          var inputs = formEl.querySelectorAll('input, textarea, select');
          for (var i = 0; i < inputs.length; i++) {
            var node = inputs[i];
            var name = node.getAttribute('name');
            if (!name) continue;
            if (node.type === 'checkbox') { if (node.checked) payload[name] = node.value; }
            else if (node.type === 'radio') { if (node.checked) payload[name] = node.value; }
            else payload[name] = node.value;
          }
          fetch(base + '/api/forms/' + encodeURIComponent(formId) + '/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: payload, _startedAt: startedAt }),
          })
            .then(function (r) {
              if (!r.ok) return r.json().then(function (d) { throw new Error(d.message || 'Submit failed'); });
              return r.json();
            })
            .then(function (data) {
              container.innerHTML = '<p class="wrr-success">' + (data.message || 'Thank you!') + '</p>';
              if (data.redirectUrl) window.location.href = data.redirectUrl;
            })
            .catch(function (err) {
              submitBtn.disabled = false;
              container.innerHTML += '<p class="wrr-error">' + (err.message || 'Something went wrong.') + '</p>';
            });
        });
      })
      .catch(function () { container.innerHTML = '<p class="wrr-error">Form could not be loaded.</p>'; });
  }
  function init() {
    var nodes = document.querySelectorAll('[data-wrr-form]');
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-wrr-form');
      if (id) renderForm(id.trim(), nodes[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
