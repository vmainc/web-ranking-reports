/** Parse Meta OAuth callback query/body values. Do not log secrets (code/state). */

export function singleOAuthParam(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return typeof v === 'string' ? v : ''
}

export type MetaOAuthCallbackParams = {
  code: string
  state: string
  /** Short-lived user token from implicit grant. Read from POST body only — never from the query string. */
  accessToken: string
  error: string
  errorReason: string
  errorDescription: string
  errorCode: string
  errorMessage: string
  keys: string[]
}

export function collectMetaOAuthParams(
  query: Record<string, unknown>,
  body?: Record<string, unknown> | null,
): MetaOAuthCallbackParams {
  const from = (name: string): string =>
    singleOAuthParam(query[name]) || (body ? singleOAuthParam(body[name]) : '')
  const keys = [...new Set([...Object.keys(query), ...Object.keys(body || {})])].sort()
  return {
    code: from('code'),
    state: from('state'),
    accessToken: body ? singleOAuthParam(body.access_token) : '',
    error: from('error'),
    errorReason: from('error_reason'),
    errorDescription: from('error_description'),
    errorCode: from('error_code'),
    errorMessage: from('error_message'),
    keys,
  }
}

export function isMetaOAuthDenied(params: MetaOAuthCallbackParams): boolean {
  const error = params.error.toLowerCase()
  const reason = params.errorReason.toLowerCase()
  return error === 'access_denied' || reason === 'user_denied'
}

export function hasMetaOAuthError(params: MetaOAuthCallbackParams): boolean {
  return Boolean(params.error || params.errorCode || params.errorMessage)
}

/**
 * Facebook Login for Business user tokens often return in the URL hash.
 * The server never sees the fragment; 302-ing away discards it.
 * `code`/`state`/`error*` are copied into the query string.
 * `access_token` is POSTed (never placed on the query string).
 */
export function metaOAuthHashRecoveryHtml(agencyMissingUrl: string): string {
  const safeAgency = agencyMissingUrl.replace(/</g, '')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Connecting Meta…</title>
</head>
<body>
  <p>Finishing Meta connection…</p>
  <script>
(function () {
  var agency = ${JSON.stringify(safeAgency)};
  var hash = (window.location.hash || '').replace(/^#/, '');
  if (!hash || hash === '_' || hash === '_=_') {
    window.location.replace(agency);
    return;
  }
  var hp = new URLSearchParams(hash);
  var token = hp.get('access_token');
  var code = hp.get('code');
  var state = hp.get('state');
  if (token && state && !code) {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = window.location.pathname;
    function add(name, value) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    add('access_token', token);
    add('state', state);
    document.body.appendChild(form);
    form.submit();
    return;
  }
  if (!code && !state && !hp.get('error') && !hp.get('error_code')) {
    window.location.replace(agency);
    return;
  }
  var next = new URL(window.location.pathname, window.location.origin);
  hp.forEach(function (value, key) {
    if (key === 'access_token' || key === 'token') return;
    next.searchParams.set(key, value);
  });
  window.location.replace(next.pathname + next.search);
})();
  </script>
</body>
</html>`
}
