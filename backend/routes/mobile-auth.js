const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validatePassword(password) {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

const profileSelect =
  "id, full_name, mobile_number, country, region, province, city_municipality, barangay, role, worker_category, must_change_password, name_confirmed_at, onboarding_completed_at";

function readRequired(value, maximum, label) {
  const result = String(value || "").trim();
  if (!result) throw httpError(400, `${label} is required`);
  if (result.length > maximum) throw httpError(400, `${label} is too long`);
  return result;
}

function readOptional(value, maximum, label) {
  const result = String(value || "").trim();
  if (result.length > maximum) throw httpError(400, `${label} is too long`);
  return result || null;
}

router.post(
  "/change-initial-password",
  requireAuth,
  requireRole("farm_worker"),
  async (req, res, next) => {
    try {
      if (!req.profile.must_change_password) {
        throw httpError(409, "The initial password has already been changed");
      }

      const password = String(req.body.password || "");
      if (!validatePassword(password)) {
        throw httpError(
          400,
          "Password must contain at least 8 characters, an uppercase letter, a number, and a special character",
        );
      }

      const supabase = getSupabase();
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        req.user.id,
        { password },
      );

      if (passwordError) {
        throw httpError(400, passwordError.message);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", req.user.id)
        .eq("must_change_password", true)
        .select(
          profileSelect,
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      return res.json({ profile });
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  "/confirm-name",
  requireAuth,
  requireRole("farm_worker"),
  async (req, res, next) => {
    try {
      if (req.profile.must_change_password) {
        throw httpError(409, "Change your temporary password before confirming your name");
      }
      if (req.profile.onboarding_completed_at) {
        throw httpError(409, "Onboarding has already been completed");
      }

      const fullName = readRequired(req.body.full_name, 100, "Full name");
      if (fullName.length < 2) {
        throw httpError(400, "Full name must contain at least 2 characters");
      }

      const { data: profile, error } = await getSupabase()
        .from("profiles")
        .update({ full_name: fullName, name_confirmed_at: new Date().toISOString() })
        .eq("id", req.user.id)
        .eq("must_change_password", false)
        .select(profileSelect)
        .single();
      if (error) throw error;

      return res.json({ profile });
    } catch (error) {
      return next(error);
    }
  },
);

router.patch(
  "/location",
  requireAuth,
  requireRole("farm_worker"),
  async (req, res, next) => {
    try {
      if (req.profile.must_change_password) {
        throw httpError(409, "Change your temporary password before entering your location");
      }
      if (!req.profile.name_confirmed_at) {
        throw httpError(409, "Confirm your name before entering your location");
      }
      if (req.profile.onboarding_completed_at) {
        throw httpError(409, "Onboarding has already been completed");
      }

      const changes = {
        country: "Philippines",
        region: readRequired(req.body.region, 120, "Region"),
        province: readOptional(req.body.province, 120, "Province"),
        city_municipality: readRequired(
          req.body.city_municipality,
          120,
          "City or municipality",
        ),
        barangay: readRequired(req.body.barangay, 120, "Barangay"),
        onboarding_completed_at: new Date().toISOString(),
      };

      const { data: profile, error } = await getSupabase()
        .from("profiles")
        .update(changes)
        .eq("id", req.user.id)
        .is("onboarding_completed_at", null)
        .select(profileSelect)
        .single();
      if (error) throw error;

      return res.json({ profile });
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = { readOptional, readRequired, router, validatePassword };
