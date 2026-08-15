const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('user');
    window.location.hash = '#/auth';
    throw new Error('Unauthorized');
  }
  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  
  if (!res.ok) {
    const errorMsg = (data && data.error) || (data && data.message) || (typeof data === 'string' ? data : res.statusText || 'An error occurred');
    throw new Error(errorMsg);
  }
  return data;
};

export const apiGet = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  return handleResponse(res);
};

export const apiPost = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return handleResponse(res);
};

export const apiPostFile = async (url, formData) => {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  return handleResponse(res);
};

export const apiPut = async (url, body) => {
  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return handleResponse(res);
};

export const apiDelete = async (url) => {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(res);
};
