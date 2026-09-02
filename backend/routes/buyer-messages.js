const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("buyer"));

const ONLINE_WINDOW_MS = 45 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const seenAt = new Date(lastSeenAt).getTime();
  return Number.isFinite(seenAt) && Date.now() - seenAt <= ONLINE_WINDOW_MS;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readBody(value) {
  const body = String(value || "").trim();
  if (!body) throw httpError(400, "Write a message before sending");
  if (body.length > 2000) throw httpError(400, "Message must not exceed 2000 characters");
  return body;
}

async function findOrCreateConversation(buyerId) {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("buyer_conversations")
    .select("id, buyer_id, created_at, last_message_at, buyer_last_seen_at, admin_last_seen_at")
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("buyer_conversations")
    .insert({ buyer_id: buyerId })
    .select("id, buyer_id, created_at, last_message_at, buyer_last_seen_at, admin_last_seen_at")
    .single();
  if (createError) throw createError;
  return created;
}

router.get("/unread-count", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data: conversation, error: conversationError } = await supabase
      .from("buyer_conversations")
      .select("id")
      .eq("buyer_id", req.user.id)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return res.json({ unread_count: 0 });

    const { count, error: countError } = await supabase
      .from("buyer_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .eq("sender_role", "admin")
      .is("read_at", null);
    if (countError) throw countError;

    return res.json({ unread_count: count || 0 });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data: conversation, error: conversationError } = await supabase
      .from("buyer_conversations")
      .select("id, buyer_id, created_at, last_message_at, buyer_last_seen_at, admin_last_seen_at")
      .eq("buyer_id", req.user.id)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return res.json({ conversation: null, messages: [], presence: { online: false } });

    await supabase
      .from("buyer_conversations")
      .update({ buyer_last_seen_at: new Date().toISOString() })
      .eq("id", conversation.id);

    const { data: messages, error: messagesError } = await supabase
      .from("buyer_messages")
      .select("id, conversation_id, sender_id, sender_role, body, created_at, read_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (messagesError) throw messagesError;

    await supabase
      .from("buyer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("sender_role", "admin")
      .is("read_at", null);

    return res.json({
      conversation,
      messages: messages || [],
      presence: {
        online: isOnline(conversation.admin_last_seen_at),
        last_seen_at: conversation.admin_last_seen_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = readBody(req.body?.body);
    const conversation = await findOrCreateConversation(req.user.id);

    await getSupabase()
      .from("buyer_conversations")
      .update({ buyer_last_seen_at: new Date().toISOString() })
      .eq("id", conversation.id);

    const { data: message, error } = await getSupabase()
      .from("buyer_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        sender_role: "buyer",
        body,
      })
      .select("id, conversation_id, sender_id, sender_role, body, created_at, read_at")
      .single();
    if (error) throw error;

    return res.status(201).json({
      conversation,
      message,
      presence: {
        online: isOnline(conversation.admin_last_seen_at),
        last_seen_at: conversation.admin_last_seen_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
