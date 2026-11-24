// Reads the damaged counts and photo proof of Stock Check tasks (migration 068) in the shape the
// web and mobile apps use. Sizes and damage types are returned by name and code, not by ID.

const DAMAGE_ORDER = ["minor_damage", "overripe", "spoiled", "pest_disease"];

// Totals per size: damaged pineapples that are removed from Pineapple Stock when approved.
function summarize(counts) {
  const sizeNames = [...new Set(counts.map((count) => count.size))];
  const sizes = sizeNames.map((size) => {
    const rows = counts.filter((count) => count.size === size);
    return { size, removed: rows.reduce((sum, count) => sum + count.quantity, 0) };
  });
  return { sizes, removed: sizes.reduce((sum, size) => sum + size.removed, 0) };
}

// Returns { [taskId]: { counts, photos, summary } } for the given Stock Check task IDs.
async function loadStockChecks(supabase, taskIds) {
  const ids = [...new Set((taskIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const [countResult, photoResult] = await Promise.all([
    supabase.from("stock_check_counts")
      .select("task_id, quantity, damage_types, size:pineapple_sizes(id, size_name), condition:stock_conditions(code, condition_name, sort_order)")
      .in("task_id", ids),
    supabase.from("stock_check_photos")
      .select("id, task_id, image_url, size:pineapple_sizes(id, size_name), condition:stock_conditions(code, condition_name)")
      .in("task_id", ids).order("id"),
  ]);
  for (const result of [countResult, photoResult]) {
    if (result.error) {
      // Migration 068 not applied yet: show the task without stock check data instead of failing.
      if (["42P01", "PGRST200", "PGRST205"].includes(result.error.code)) return {};
      throw result.error;
    }
  }

  const byTask = Object.fromEntries(ids.map((id) => [id, { counts: [], photos: [] }]));
  for (const row of countResult.data || []) {
    // Legacy stock checks also stored saleable (Good) counts. They are not damage.
    if (row.condition?.code === "good") continue;
    byTask[row.task_id]?.counts.push({
      size: row.size?.size_name || "", size_id: row.size?.id || 0,
      condition: row.condition?.code || "", condition_name: row.condition?.condition_name || "",
      quantity: row.quantity, damage_types: row.damage_types || [],
    });
  }
  for (const row of photoResult.data || []) {
    byTask[row.task_id]?.photos.push({
      id: row.id, size: row.size?.size_name || "", condition: row.condition?.code || "",
      condition_name: row.condition?.condition_name || "", image_url: row.image_url,
    });
  }
  for (const data of Object.values(byTask)) {
    data.counts.sort((a, b) => a.size_id - b.size_id || DAMAGE_ORDER.indexOf(a.condition) - DAMAGE_ORDER.indexOf(b.condition));
    data.summary = summarize(data.counts);
  }
  return byTask;
}

module.exports = { loadStockChecks, summarize };
