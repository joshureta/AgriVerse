const { getSupabase } = require("../supabase");

async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const supabase = getSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, mobile_number, country, region, province, city_municipality, barangay, role, worker_category",
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile is not available" });
    }

    req.user = user;
    req.profile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: "You do not have access to this resource" });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
