(function () {
  'use strict';
  var script = document.currentScript;
  var base = script ? new URL(script.src).origin : window.location.origin;

  function cssVars(colors) {
    return (
      '--wrr-primary:' + (colors.primary || '#2563EB') + ';' +
      '--wrr-accent:' + (colors.accent || '#1D4ED8') + ';' +
      '--wrr-text:' + (colors.text || '#0F172A') + ';' +
      '--wrr-surface:' + (colors.surface || '#FFFFFF') + ';'
    );
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(node.style, attrs[k]);
        } else if (k === 'className') node.className = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    ;(children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function field(labelText, input) {
    var wrap = el('div', { className: 'wrr-audit-field' });
    wrap.appendChild(el('label', { className: 'wrr-audit-label' }, [labelText]));
    wrap.appendChild(input);
    return wrap;
  }

  function renderForm(key, container) {
    container.innerHTML = '<p class="wrr-audit-loading">Loading form…</p>';
    fetch(base + '/api/website-audit/' + encodeURIComponent(key))
      .then(function (r) {
        if (!r.ok) throw new Error('Form not found');
        return r.json();
      })
      .then(function (form) {
        var startedAt = 0;
        var turnstileSiteKey = form.turnstileSiteKey || '';
        var turnstileWidgetId = null;
        var branding = form.branding || {};
        var colors = branding.colors || {};
        container.setAttribute('style', cssVars(colors));
        container.className = (container.className || '') + ' wrr-audit-root';

        var card = el('div', { className: 'wrr-audit-card' });
        if (branding.logoUrl) {
          card.appendChild(
            el('img', {
              className: 'wrr-audit-logo',
              src: branding.logoUrl,
              alt: branding.name || 'Logo',
            }),
          );
        }
        if (branding.name) {
          card.appendChild(el('div', { className: 'wrr-audit-brand' }, [branding.name]));
        }
        card.appendChild(el('h2', { className: 'wrr-audit-headline' }, [form.headline || 'Free website audit']));
        if (form.subheadline) {
          card.appendChild(el('p', { className: 'wrr-audit-sub' }, [form.subheadline]));
        }

        var formEl = el('form', { className: 'wrr-audit-form', novalidate: 'novalidate' });
        var hp = el('div', { style: { position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }, 'aria-hidden': 'true' });
        hp.appendChild(
          el('input', {
            type: 'text',
            name: 'wrr_hp',
            tabindex: '-1',
            autocomplete: 'new-password',
            'data-1p-ignore': 'true',
            'data-lpignore': 'true',
          }),
        );
        formEl.appendChild(hp);

        var nameInput = el('input', {
          type: 'text',
          name: 'name',
          required: 'required',
          placeholder: 'Your name',
          className: 'wrr-audit-input',
        });
        var emailInput = el('input', {
          type: 'email',
          name: 'email',
          required: 'required',
          placeholder: 'you@company.com',
          className: 'wrr-audit-input',
        });
        var websiteInput = el('input', {
          type: 'url',
          name: 'website',
          required: 'required',
          placeholder: 'https://example.com',
          className: 'wrr-audit-input',
        });
        formEl.appendChild(field('Name *', nameInput));
        formEl.appendChild(field('Email *', emailInput));
        if (form.collectPhone !== false) {
          formEl.appendChild(
            field(
              'Phone',
              el('input', {
                type: 'tel',
                name: 'phone',
                placeholder: '(optional)',
                className: 'wrr-audit-input',
              }),
            ),
          );
        }
        formEl.appendChild(field('Website *', websiteInput));

        var err = el('p', { className: 'wrr-audit-error', style: { display: 'none' } });
        var turnstileMount = el('div', { className: 'wrr-audit-turnstile', style: { marginTop: '12px' } });
        var submit = el('button', { type: 'submit', className: 'wrr-audit-submit' }, [
          form.buttonLabel || 'Get my free audit',
        ]);
        formEl.appendChild(err);
        if (turnstileSiteKey) formEl.appendChild(turnstileMount);
        formEl.appendChild(submit);
        card.appendChild(formEl);
        container.innerHTML = '';
        container.appendChild(card);

        if (!document.getElementById('wrr-audit-embed-style')) {
          var style = document.createElement('style');
          style.id = 'wrr-audit-embed-style';
          style.textContent =
            '.wrr-audit-root{font-family:DM Sans,Segoe UI,sans-serif;color:var(--wrr-text,#0F172A);}' +
            '.wrr-audit-card{background:var(--wrr-surface,#fff);border:1px solid rgba(15,23,42,.08);border-radius:16px;padding:24px;box-sizing:border-box;}' +
            '.wrr-audit-logo{display:block;max-height:40px;max-width:180px;margin:0 0 12px;object-fit:contain;}' +
            '.wrr-audit-brand{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--wrr-primary,#2563EB);margin:0 0 8px;}' +
            '.wrr-audit-headline{margin:0 0 8px;font-size:1.5rem;line-height:1.2;font-weight:700;}' +
            '.wrr-audit-sub{margin:0 0 20px;font-size:.95rem;opacity:.8;line-height:1.5;}' +
            '.wrr-audit-field{margin:0 0 14px;}' +
            '.wrr-audit-label{display:block;font-size:.8rem;font-weight:600;margin:0 0 6px;}' +
            '.wrr-audit-input{width:100%;box-sizing:border-box;border:1px solid rgba(15,23,42,.16);border-radius:10px;padding:10px 12px;font-size:1rem;background:#fff;color:inherit;}' +
            '.wrr-audit-input:focus{outline:2px solid var(--wrr-primary,#2563EB);outline-offset:1px;}' +
            '.wrr-audit-submit{width:100%;margin-top:8px;border:0;border-radius:10px;padding:12px 16px;font-size:1rem;font-weight:700;cursor:pointer;color:#fff;background:var(--wrr-primary,#2563EB);}' +
            '.wrr-audit-submit:disabled{opacity:.6;cursor:wait;}' +
            '.wrr-audit-error{color:#b91c1c;font-size:.875rem;margin:0 0 8px;}' +
            '.wrr-audit-success{padding:20px;border-radius:12px;background:rgba(16,185,129,.1);color:#065f46;font-size:1rem;line-height:1.5;}' +
            '.wrr-audit-loading,.wrr-audit-fatal{padding:16px;color:#64748b;}';
          document.head.appendChild(style);
        }

        function markInteraction() {
          if (!startedAt) startedAt = Date.now();
        }
        formEl.addEventListener('focusin', markInteraction);
        formEl.addEventListener('input', markInteraction);

        function loadTurnstile() {
          if (!turnstileSiteKey) return Promise.resolve();
          if (window.turnstile) return Promise.resolve();
          return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            s.async = true;
            s.onload = function () {
              resolve();
            };
            s.onerror = function () {
              reject(new Error('Security widget failed to load.'));
            };
            document.head.appendChild(s);
          });
        }

        loadTurnstile()
          .then(function () {
            if (!turnstileSiteKey || !window.turnstile) return;
            turnstileWidgetId = window.turnstile.render(turnstileMount, {
              sitekey: turnstileSiteKey,
              theme: 'light',
            });
          })
          .catch(function () {
            /* submit handler will surface Turnstile errors from the API */
          });

        formEl.addEventListener('submit', function (e) {
          e.preventDefault();
          err.style.display = 'none';
          if (!startedAt) startedAt = Date.now();
          submit.disabled = true;
          var hpNode = formEl.querySelector('[name="wrr_hp"]');
          var payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            website: websiteInput.value.trim(),
            _startedAt: startedAt,
            wrr_hp: hpNode ? hpNode.value || '' : '',
          };
          var phoneNode = formEl.querySelector('[name="phone"]');
          if (phoneNode) payload.phone = phoneNode.value.trim();
          if (turnstileSiteKey && window.turnstile) {
            payload.turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || '';
          }

          fetch(base + '/api/website-audit/' + encodeURIComponent(key) + '/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
            .then(function (r) {
              return r.text().then(function (text) {
                var d = {};
                try {
                  d = text ? JSON.parse(text) : {};
                } catch (parseErr) {
                  if (r.status === 404) {
                    throw new Error(
                      'Audit submit API not found (404). Deploy the latest Web Ranking Reports app on the server, then hard-refresh this page.',
                    );
                  }
                  throw new Error('Unexpected server response (' + r.status + '). Try again or use the iframe form on webrankingreports.com.');
                }
                if (!r.ok) {
                  var msg =
                    d.message ||
                    d.statusMessage ||
                    (r.status === 404 ? 'Form not found' : 'Submit failed (' + r.status + ')');
                  if (r.status === 404 && msg === 'Form not found') {
                    msg +=
                      ' Check the embed key in CRM → Website audit matches this page, or rotate the key and update the snippet.';
                  }
                  throw new Error(msg);
                }
                return d;
              });
            })
            .then(function (data) {
              if (!data.reportUrl) {
                throw new Error(
                  'Your request did not start an audit. Refresh the page and try again, or use the hosted form on webrankingreports.com.',
                );
              }
              if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
              }
              var msg = data.message || form.successMessage || 'Thank you!';
              var html = '<div class="wrr-audit-success"><p>' + msg + '</p>';
              html +=
                '<p style="margin-top:12px;"><a href="' +
                data.reportUrl +
                '" target="_blank" rel="noopener" style="color:var(--wrr-primary,#2563EB);font-weight:600;">Open your report</a></p>';
              html += '</div>';
              card.innerHTML = html;
            })
            .catch(function (ex) {
              submit.disabled = false;
              if (turnstileSiteKey && window.turnstile && turnstileWidgetId != null) {
                try {
                  window.turnstile.reset(turnstileWidgetId);
                } catch (ignore) {}
              }
              err.textContent = ex.message || 'Something went wrong.';
              err.style.display = 'block';
            });
        });
      })
      .catch(function () {
        container.innerHTML = '<p class="wrr-audit-fatal">Form could not be loaded.</p>';
      });
  }

  function init() {
    var nodes = document.querySelectorAll('[data-wrr-audit]');
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-wrr-audit');
      if (id) renderForm(id.trim(), nodes[i]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
