const { getSupabase } = require("../supabase");

// Uploads a single base64-encoded image to a public Supabase Storage bucket.
// Returns { imageUrl, storagePath } or null if the upload failed.
async function uploadImage(bucket, base64Data, mimeType, keyPrefix) {
  try {
    const supabase = getSupabase();
    const buffer = Buffer.from(base64Data, "base64");
    const ext = (mimeType || "image/jpeg").split("/")[1] || "jpg";
    const cleanPrefix = String(keyPrefix || "upload").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const filePath = `${cleanPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: mimeType || "image/jpeg", upsert: true });
    if (uploadError) {
      console.warn(`Supabase storage upload error (${bucket}):`, uploadError.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { imageUrl: publicData?.publicUrl || null, storagePath: filePath };
  } catch (err) {
    console.warn(`Storage upload exception (${bucket}):`, err.message);
    return null;
  }
}

module.exports = { uploadImage };
