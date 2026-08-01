const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const allowedRoles = new Set(["admin", "buyer", "farm_worker"]);
const allowedWorkerCategories = new Set([
  "driver",
  "crop_management_worker",
  "seller",
]);
const profileSelect =
  "id, full_name, email, mobile_number, country, region, province, city_municipality, barangay, role, worker_category, created_at";

router.use(requireAuth, requireRole("admin"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readFullName(value) {
  const fullName = String(value || "").trim();

  if (fullName.length < 2 || fullName.length > 100) {
    throw httpError(400, "Full name must contain 2 to 100 characters");
  }

  return fullName;
}

function readRole(value) {
  const role = String(value || "").trim().toLowerCase();

  if (!allowedRoles.has(role)) {
    throw httpError(400, "Role must be admin, buyer, or farm_worker");
  }

  return role;
}

function readEmail(value) {
  const email = String(value || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "A valid email address is required");
  }

  return email;
}

function readMobileNumber(value) {
  const mobileNumber = String(value || "").trim();

  if (mobileNumber.length > 30) {
    throw httpError(400, "Mobile number must contain no more than 30 characters");
  }

  return mobileNumber || null;
}

function readWorkerCategory(value, role) {
  if (role !== "farm_worker") return null;

  const workerCategory = String(value || "").trim().toLowerCase();
  if (!allowedWorkerCategories.has(workerCategory)) {
    throw httpError(
      400,
      "Farm workers must have a driver, crop management worker, or seller category",
    );
  }

  return workerCategory;
}

function roleFields(role, workerCategory) {
  return {
    role,
    worker_category: readWorkerCategory(workerCategory, role),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number.parseInt(req.query.pageSize, 10) || 5, 1),
      50,
    );
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();
    const from = (page - 1) * pageSize;
    const supabase = getSupabase();

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    if (role) {
      query = query.eq("role", readRole(role));
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count || 0;

    return res.json({
      users: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select(profileSelect)
      .eq("id", req.params.id)
      .single();

    if (error?.code === "PGRST116") {
      throw httpError(404, "User profile was not found");
    }

    if (error) {
      throw error;
    }

    return res.json({ user: data });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const supabase = getSupabase();
  let createdUserId = null;

  try {
    const fullName = readFullName(req.body.full_name);
    const role = readRole(req.body.role);
    const email = readEmail(req.body.email);
    const password = String(req.body.password || "");

    if (password.length < 8) {
      throw httpError(400, "Temporary password must contain at least 8 characters");
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      throw httpError(400, authError.message);
    }

    createdUserId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: createdUserId,
          email,
          full_name: fullName,
          ...roleFields(
            role,
            req.body.worker_category ||
              (role === "farm_worker" ? "crop_management_worker" : null),
          ),
        },
        { onConflict: "id" },
      )
      .select("id, full_name, email, role, created_at")
      .single();

    if (profileError) {
      throw profileError;
    }

    return res.status(201).json({ user: profile });
  } catch (error) {
    if (createdUserId) {
      await supabase.auth.admin.deleteUser(createdUserId);
    }

    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const supabase = getSupabase();
  let originalAuthUser = null;

  try {
    const fullName = readFullName(req.body.full_name);
    const email = readEmail(req.body.email);
    const mobileNumber = readMobileNumber(req.body.mobile_number);
    const role = readRole(req.body.role);
    const workerCategory = readWorkerCategory(req.body.worker_category, role);
    const { data: authData, error: authLookupError } =
      await supabase.auth.admin.getUserById(req.params.id);

    if (authLookupError || !authData.user) {
      throw httpError(404, authLookupError?.message || "Authentication user was not found");
    }

    originalAuthUser = authData.user;
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      req.params.id,
      {
        email,
        email_confirm: true,
        user_metadata: {
          ...originalAuthUser.user_metadata,
          full_name: fullName,
          mobile_number: mobileNumber,
        },
      },
    );

    if (authUpdateError) {
      throw httpError(400, authUpdateError.message);
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        mobile_number: mobileNumber,
        ...roleFields(role, workerCategory),
      })
      .eq("id", req.params.id)
      .select(profileSelect)
      .single();

    if (error) {
      await supabase.auth.admin.updateUserById(req.params.id, {
        email: originalAuthUser.email,
        email_confirm: true,
        user_metadata: originalAuthUser.user_metadata,
      });
      throw error;
    }

    return res.json({ user: profile });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      throw httpError(400, "You cannot delete your own administrator account");
    }

    const { error } = await getSupabase().auth.admin.deleteUser(req.params.id);

    if (error) {
      throw httpError(400, error.message);
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
