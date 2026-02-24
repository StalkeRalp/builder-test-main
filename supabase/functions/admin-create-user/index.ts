import { createClient } from 'npm:@supabase/supabase-js@2';

function buildCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get('Origin') || '*';
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')?.trim() || '*';
  const allowOrigin = allowedOrigin === '*' ? requestOrigin : allowedOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

type CreateAdminPayload = {
  email?: string;
  password?: string;
  fullName?: string;
  role?: 'admin' | 'superadmin' | string;
};

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      'Content-Type': 'application/json'
    }
  });
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value: unknown): string {
  return String(value || '').trim();
}

function normalizeRole(value: unknown): 'admin' | 'superadmin' | '' {
  const role = String(value || 'admin').trim().toLowerCase();
  if (role === 'admin' || role === 'superadmin') return role;
  return '';
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { error: 'Méthode non autorisée.' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(req, 500, { error: 'Variables d\'environnement manquantes: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.' });
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse(req, 401, { error: 'Token d\'authentification manquant.' });
    }

    const payload = await req.json() as CreateAdminPayload;
    const email = normalizeEmail(payload.email);
    const password = String(payload.password || '');
    const fullName = normalizeName(payload.fullName);
    const role = normalizeRole(payload.role);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(req, 400, { error: 'Email invalide.' });
    }
    if (!fullName) {
      return jsonResponse(req, 400, { error: 'Nom complet requis.' });
    }
    if (!role) {
      return jsonResponse(req, 400, { error: 'Rôle invalide.' });
    }
    if (password.length < 8) {
      return jsonResponse(req, 400, { error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const token = authHeader.slice('Bearer '.length).trim();
    const { data: tokenUserData, error: tokenUserError } = await adminClient.auth.getUser(token);
    if (tokenUserError || !tokenUserData?.user?.id) {
      return jsonResponse(req, 401, { error: 'Session invalide.' });
    }

    const actorId = tokenUserData.user.id;
    const { data: actorProfile, error: actorProfileError } = await adminClient
      .from('profiles')
      .select('role, email')
      .eq('id', actorId)
      .maybeSingle();

    if (actorProfileError) {
      return jsonResponse(req, 500, { error: actorProfileError.message || 'Impossible de vérifier le rôle appelant.' });
    }

    const actorRole = String(actorProfile?.role || '').toLowerCase();
    if (actorRole !== 'superadmin') {
      return jsonResponse(req, 403, { error: 'Accès réservé aux superadmins.' });
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from('profiles')
      .select('id, role, full_name, email')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (existingProfileError) {
      return jsonResponse(req, 500, { error: existingProfileError.message || 'Lecture profil impossible.' });
    }

    if (existingProfile) {
      const currentRole = String(existingProfile.role || '').toLowerCase();
      const already = currentRole === role && String(existingProfile.full_name || '') === fullName;
      if (!already) {
        const { error: updateProfileError } = await adminClient
          .from('profiles')
          .update({ role, full_name: fullName })
          .eq('id', existingProfile.id);

        if (updateProfileError) {
          return jsonResponse(req, 500, { error: updateProfileError.message || 'Mise à jour profil impossible.' });
        }
      }

      return jsonResponse(req, 200, {
        id: existingProfile.id,
        email,
        full_name: fullName,
        role,
        status: already ? 'already_exists' : (currentRole === 'admin' || currentRole === 'superadmin' ? 'updated_existing_admin' : 'promoted_existing_profile')
      });
    }

    const { data: authUsersPage, error: authUsersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    if (authUsersError) {
      return jsonResponse(req, 500, { error: authUsersError.message || 'Lecture utilisateurs auth impossible.' });
    }

    const existingAuthUser = (authUsersPage?.users || []).find(
      (u) => String(u.email || '').trim().toLowerCase() === email
    );

    if (existingAuthUser?.id) {
      const { error: upsertExistingAuthProfileError } = await adminClient
        .from('profiles')
        .upsert({
          id: existingAuthUser.id,
          email,
          full_name: fullName,
          role
        }, { onConflict: 'id' });

      if (upsertExistingAuthProfileError) {
        return jsonResponse(req, 500, { error: upsertExistingAuthProfileError.message || 'Promotion profil depuis auth.users impossible.' });
      }

      return jsonResponse(req, 200, {
        id: existingAuthUser.id,
        email,
        full_name: fullName,
        role,
        status: 'promoted_existing_auth_user'
      });
    }

    const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        role
      }
    });

    if (createUserError || !createdUserData?.user?.id) {
      return jsonResponse(req, 400, {
        error: createUserError?.message || 'Création utilisateur impossible.'
      });
    }

    const userId = createdUserData.user.id;
    const { error: upsertProfileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role
      }, { onConflict: 'id' });

    if (upsertProfileError) {
      return jsonResponse(req, 500, { error: upsertProfileError.message || 'Création profil impossible.' });
    }

    return jsonResponse(req, 200, {
      id: userId,
      email,
      full_name: fullName,
      role,
      status: 'created'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    console.error('admin-create-user unexpected error:', message);
    return jsonResponse(req, 500, { error: message });
  }
});
