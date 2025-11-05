export async function loginWithGoogleCredential(credential: string) {
  const res = await fetch('/api/login-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Falha no login com Google');
  }
  return data.user;
}

