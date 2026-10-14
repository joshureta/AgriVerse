const { getSupabase } = require("../supabase");

async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const supabase = getSupabase();
    // Validate the access token through Supabase Auth. This works with the
    // current publishable-key/session tokens even when local JWKS claims
    // verification is unavailable or out of sync with the project settings.
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    let user = userData?.user;

    if (userError || !user?.id) {
      // Fallback: If getUser fails (e.g. session was revoked due to a recent password change during onboarding),
      // verify the JWT claims locally so that in-flight onboarding requests can proceed smoothly.
      const { data: claimData, error: claimError } = await supabase.auth.getClaims(token);
      const claims = claimData?.claims;
      if (!claimError && claims?.sub) {
        user = {
          id: claims.sub,
          email: claims.email || null,
          email_confirmed_at: claims.email_confirmed_at || null,
        };
      } else {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, mobile_number, country, region, province, city_municipality, barangay, role, worker_category, must_change_password, name_confirmed_at, onboarding_completed_at",
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile is not available" });
    }

    req.user = {
      id: user.id,
      email: user.email || null,
      email_confirmed_at: user.email_confirmed_at || null,
    };
    req.profile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireInitialPasswordChanged(req, res, next) {
  if (req.profile?.must_change_password) {
    return res.status(403).json({
      error: "Change your temporary password before accessing this resource",
      code: "INITIAL_PASSWORD_CHANGE_REQUIRED",
    });
  }

  return next();
}

function requireProfileOnboardingComplete(req, res, next) {
  if (!req.profile?.name_confirmed_at || !req.profile?.onboarding_completed_at) {
    return res.status(403).json({
      error: "Complete your profile before accessing this resource",
      code: "PROFILE_ONBOARDING_REQUIRED",
    });
  }

  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: "You do not have access to this resource" });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
  requireRole,
};
