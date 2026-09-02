const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

const ONLINE_WINDOW_MS = 45 * 1000;
const TYPING_WINDOW_MS = 7 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const seenAt = new Date(lastSeenAt).getTime();
  return Number.isFinite(seenAt) && Date.now() - seenAt <= ONLINE_WINDOW_MS;
}

function isTyping(typingAt) {
  if (!typingAt) return false;
  const timestamp = new Date(typingAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= TYPING_WINDOW_MS;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readConversationId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid conversation ID");
  return id;
}

function readBody(value) {
  const body = String(value || "").trim();
  if (!body) throw httpError(400, "Write a message before sending");
  if (body.length > 2000) throw httpError(400, "Message must not exceed 2000 characters");
  return body;
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("buyer_conversations")
      .select([
        "id, buyer_id, created_at, last_message_at, buyer_last_seen_at, admin_last_seen_at, buyer_typing_at, admin_typing_at",
        "buyer:profiles!buyer_conversations_buyer_id_fkey(id, full_name)",
        "messages:buyer_messages(id, sender_role, body, created_at, read_at)",
      ].join(","))
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    if (data?.length) {
      await getSupabase()
        .from("buyer_conversations")
        .update({ admin_last_seen_at: new Date().toISOString() })
        .in("id", data.map((conversation) => conversation.id));
    }

    const conversations = (data || []).map((conversation) => {
      const messages = conversation.messages || [];
      const lastMessage = messages.reduce((latest, message) => (
        !latest || new Date(message.created_at) > new Date(latest.created_at) ? message : latest
      ), null);
      const unreadCount = messages.filter((message) => message.sender_role === "buyer" && !message.read_at).length;
      return {
        id: conversation.id,
        buyer_id: conversation.buyer_id,
        buyer: Array.isArray(conversation.buyer) ? conversation.buyer[0] : conversation.buyer,
        created_at: conversation.created_at,
        last_message_at: conversation.last_message_at,
        last_message: lastMessage ? { body: lastMessage.body, sender_role: lastMessage.sender_role, created_at: lastMessage.created_at } : null,
        unread_count: unreadCount,
        is_online: isOnline(conversation.buyer_last_seen_at),
        last_seen_at: conversation.buyer_last_seen_at,
        is_typing: isTyping(conversation.buyer_typing_at),
      };
    });

    return res.json({ conversations });
  } catch (error) {
    return next(error);
  }
});

router.get("/:conversationId", async (req, res, next) => {
  try {
    const conversationId = readConversationId(req.params.conversationId);
    const supabase = getSupabase();

    const { data: conversation, error: conversationError } = await supabase
      .from("buyer_conversations")
      .select("id, buyer_id, created_at, last_message_at, buyer_last_seen_at, admin_last_seen_at, buyer_typing_at, admin_typing_at, buyer:profiles!buyer_conversations_buyer_id_fkey(id, full_name)")
      .eq("id", conversationId)
      .single();
    if (conversationError?.code === "PGRST116") throw httpError(404, "Conversation not found");
    if (conversationError) throw conversationError;

    await supabase
      .from("buyer_conversations")
      .update({ admin_last_seen_at: new Date().toISOString() })
      .eq("id", conversationId);

    const { data: messages, error: messagesError } = await supabase
      .from("buyer_messages")
      .select("id, conversation_id, sender_id, sender_role, body, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (messagesError) throw messagesError;

    await supabase
      .from("buyer_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("sender_role", "buyer")
      .is("read_at", null);

    return res.json({
      conversation: {
        ...conversation,
        buyer: Array.isArray(conversation.buyer) ? conversation.buyer[0] : conversation.buyer,
        is_online: isOnline(conversation.buyer_last_seen_at),
        last_seen_at: conversation.buyer_last_seen_at,
        is_typing: isTyping(conversation.buyer_typing_at),
      },
      messages: messages || [],
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:conversationId/messages", async (req, res, next) => {
  try {
    const conversationId = readConversationId(req.params.conversationId);
    const body = readBody(req.body?.body);
    const supabase = getSupabase();

    const { data: conversation, error: conversationError } = await supabase
      .from("buyer_conversations")
      .select("id")
      .eq("id", conversationId)
      .single();
    if (conversationError?.code === "PGRST116") throw httpError(404, "Conversation not found");
    if (conversationError) throw conversationError;

    await supabase
      .from("buyer_conversations")
      .update({ admin_last_seen_at: new Date().toISOString(), admin_typing_at: null })
      .eq("id", conversationId);

    const { data: message, error } = await supabase
      .from("buyer_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        sender_role: "admin",
        body,
      })
      .select("id, conversation_id, sender_id, sender_role, body, created_at, read_at")
      .single();
    if (error) throw error;

    return res.status(201).json({ message });
  } catch (error) {
    return next(error);
  }
});

router.post("/:conversationId/typing", async (req, res, next) => {
  try {
    const conversationId = readConversationId(req.params.conversationId);
    const typingAt = req.body?.is_typing ? new Date().toISOString() : null;
    const { data, error } = await getSupabase()
      .from("buyer_conversations")
      .update({ admin_typing_at: typingAt, admin_last_seen_at: new Date().toISOString() })
      .eq("id", conversationId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(404, "Conversation not found");
    return res.json({ is_typing: Boolean(typingAt) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
