const express = require("express");
const {
  requireAuth,
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
} = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { httpError } = require("../lib/http-error");

const router = express.Router();
const notificationSelect = "id, type, title, body, entity_type, entity_id, read_at, created_at";

router.use(requireAuth, requireInitialPasswordChanged, requireProfileOnboardingComplete);

function notificationId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid notification ID");
  return id;
}

router.get("/", async (req, res, next) => {
  try {
    const unreadOnly = String(req.query.unread || "") === "true";
    const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw httpError(400, "Invalid notification limit");
    if (!Number.isSafeInteger(offset) || offset < 0) throw httpError(400, "Invalid notification offset");
    if (!Number.isSafeInteger(offset + limit - 1)) throw httpError(400, "Invalid notification offset");

    let query = getSupabase().from("notifications").select(notificationSelect, { count: "exact" })
      .eq("recipient_id", req.user.id).order("created_at", { ascending: false }).order("id", { ascending: false });
    if (unreadOnly) query = query.is("read_at", null);
    query = query.range(offset, offset + limit - 1);

    const [listResult, unreadCountResult] = await Promise.all([
      query,
      getSupabase().from("notifications").select("id", { count: "exact", head: true })
        .eq("recipient_id", req.user.id).is("read_at", null),
    ]);
    if (listResult.error) throw listResult.error;
    if (unreadCountResult.error) throw unreadCountResult.error;

    return res.json({
      notifications: listResult.data || [],
      total_count: listResult.count || 0,
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
