const express = require("express");
const {
  requireAuth,
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
} = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const notificationSelect = "id, type, title, body, entity_type, entity_id, read_at, created_at";

router.use(requireAuth, requireInitialPasswordChanged, requireProfileOnboardingComplete);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function notificationId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid notification ID");
  return id;
}

router.get("/", async (req, res, next) => {
  try {
    const unreadOnly = String(req.query.unread || "") === "true";
    let query = getSupabase().from("notifications").select(notificationSelect)
      .eq("recipient_id", req.user.id).order("created_at", { ascending: false }).limit(100);
    if (unreadOnly) query = query.is("read_at", null);

    const [listResult, unreadCountResult] = await Promise.all([
      query,
      getSupabase().from("notifications").select("id", { count: "exact", head: true })
        .eq("recipient_id", req.user.id).is("read_at", null),
    ]);
    if (listResult.error) throw listResult.error;
    if (unreadCountResult.error) throw unreadCountResult.error;

    return res.json({
      notifications: listResult.data || [],
      unread_count: unreadCountResult.count || 0,
    });
  } catch (error) { return next(error); }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const id = notificationId(req.params.id);
    const { data, error } = await getSupabase().from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id).eq("recipient_id", req.user.id).is("read_at", null)
      .select(notificationSelect).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(404, "Notification was not found");
    return res.json({ notification: data });
  } catch (error) { return next(error); }
});

router.post("/read-all", async (req, res, next) => {
  try {
    const { error } = await getSupabase().from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", req.user.id).is("read_at", null);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

module.exports = router;
