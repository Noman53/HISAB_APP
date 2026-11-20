import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'Sign in is required.' }, { status: 401 });
  const url = Deno.env.get('SUPABASE_URL'); const anonKey = Deno.env.get('SUPABASE_ANON_KEY'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return Response.json({ error: 'Account deletion is not configured on this project.' }, { status: 503 });
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return Response.json({ error: 'The sign-in session is invalid.' }, { status: 401 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await admin.auth.admin.deleteUser(data.user.id);
  if (result.error) return Response.json({ error: 'Could not delete the account. Try again later.' }, { status: 500 });
  return Response.json({ deleted: true });
});
