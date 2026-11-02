const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { httpError } = require("../lib/http-error");

const router = express.Router();
router.use(requireAuth);

const profileSelect = "id, full_name, email, mobile_number, business_name, country, region, province, city_municipality, barangay, role, worker_category, must_change_password, name_confirmed_at, onboarding_completed_at";

function required(value, maximum, label) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) throw httpError(400, `${label} is required and must be ${maximum} characters or fewer`);
  return text;
}

function optional(value, maximum, label) {
  const text = String(value ?? "").trim();
  if (text.length > maximum) throw httpError(400, `${label} must be ${maximum} characters or fewer`);
  return text || null;
}

router.patch("/", async (req, res, next) => {
  try {
    const fullName = required(req.body.full_name, 100, "Full name");
    if (fullName.length < 2) throw httpError(400, "Full name must contain at least 2 characters");
    const changes = {
      full_name: fullName,
      mobile_number: optional(req.body.mobile_number, 30, "Mobile number"),
      country: "Philippines",
      region: required(req.body.region, 120, "Region"),
      province: optional(req.body.province, 120, "Province"),
      city_municipality: required(req.body.city_municipality, 120, "City or municipality"),
      barangay: required(req.body.barangay, 120, "Barangay"),
    };
    if (req.profile.role === "buyer") {
      changes.business_name = optional(req.body.business_name, 120, "Business name");
      if (["country", "region", "province", "city_municipality", "barangay"]
        .some((field) => (changes[field] || "") !== (req.profile[field] || ""))) {
        changes.default_delivery_address_id = null;
        changes.delivery_address_confirmed_at = null;
      }
    }
    const { data, error } = await getSupabase().from("profiles")
      .update(changes).eq("id", req.user.id).select(profileSelect).single();
    if (error) throw error;
    return res.json({ profile: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
