export async function api(path, { method = 'GET', body } = {}) {
  const t = localStorage.getItem('aq_token');
  const res = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
