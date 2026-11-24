// Reads the snapshot, counts and photos of Stock Check tasks (migration 068) in the shape the
// web and mobile apps use. Sizes and conditions are returned by name and code, not by ID.

const CONDITION_ORDER = ["good", "minor_damage", "overripe", "spoiled", "pest_disease"];

function sizeName(row) {
  return row.size?.size_name || "";
}

function conditionCode(row) {
  return row.condition?.code || "";
}

// Builds the totals shown in tables: counted, good, non-saleable, unaccounted for, written off.
function summarize(snapshot, counts) {
  const sizes = snapshot.map((row) => {
    const sizeCounts = counts.filter((count) => count.size === row.size);
    const counted = sizeCounts.reduce((sum, count) => sum + count.quantity, 0);
    const good = sizeCounts.filter((count) => count.condition === "good").reduce((sum, count) => sum + count.quantity, 0);
    const nonSaleable = counted - good;
    const unaccounted = Math.max(row.system_quantity - counted, 0);
    const found = Math.max(counted - row.system_quantity, 0);
    // The net change approval applies: good count minus the recorded quantity.
    const writtenOff = nonSaleable + unaccounted - found;
    return {
      size: row.size,
      system_quantity: row.system_quantity,
      counted,
      good,
      non_saleable: nonSaleable,
      unaccounted,
      found,
      written_off: writtenOff,
      updated_quantity: row.system_quantity - writtenOff,
    };
  });
  const total = (key) => sizes.reduce((sum, size) => sum + size[key], 0);
  return {
    sizes,
    system_quantity: total("system_quantity"),
    counted: total("counted"),
    good: total("good"),
    non_saleable: total("non_saleable"),
    unaccounted: total("unaccounted"),
    found: total("found"),
    written_off: total("written_off"),
  };
}

// Returns { [taskId]: { snapshot, counts, photos, summary } } for the given Stock Check task IDs.
async function loadStockChecks(supabase, taskIds) {
  const ids = [...new Set((taskIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const [snapshotResult, countResult, photoResult] = await Promise.all([
    supabase.from("stock_check_snapshots")
      .select("task_id, system_quantity, captured_at, size:pineapple_sizes(id, size_name)").in("task_id", ids),
    supabase.from("stock_check_counts")
      .select("task_id, quantity, worker_quantity, damage_types, size:pineapple_sizes(id, size_name), condition:stock_conditions(code, condition_name, sort_order)")
      .in("task_id", ids),
    supabase.from("stock_check_photos")
      .select("id, task_id, image_url, size:pineapple_sizes(id, size_name), condition:stock_conditions(code, condition_name)")
      .in("task_id", ids).order("id"),
  ]);
  for (const result of [snapshotResult, countResult, photoResult]) {
    if (result.error) {
      // Migration 068 not applied yet: show the task without stock check data instead of failing.
      if (["42P01", "PGRST200", "PGRST205"].includes(result.error.code)) return {};
      throw result.error;
    }
  }

  const byTask = Object.fromEntries(ids.map((id) => [id, { snapshot: [], counts: [], photos: [] }]));
  for (const row of snapshotResult.data || []) {
    byTask[row.task_id]?.snapshot.push({ size: sizeName(row), size_id: row.size?.id || 0, system_quantity: row.system_quantity, captured_at: row.captured_at });
  }
  for (const row of countResult.data || []) {
    byTask[row.task_id]?.counts.push({
      size: sizeName(row), size_id: row.size?.id || 0, condition: conditionCode(row),
      condition_name: row.condition?.condition_name || "", quantity: row.quantity,
      worker_quantity: row.worker_quantity, damage_types: row.damage_types || [],
    });
  }
  for (const row of photoResult.data || []) {
    byTask[row.task_id]?.photos.push({
      id: row.id, size: sizeName(row), condition: conditionCode(row),
      condition_name: row.condition?.condition_name || "", image_url: row.image_url,
    });
  }
  for (const data of Object.values(byTask)) {
    data.snapshot.sort((a, b) => a.size_id - b.size_id);
    data.counts.sort((a, b) => a.size_id - b.size_id || CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition));
    data.summary = data.snapshot.length ? summarize(data.snapshot, data.counts) : null;
  }
  return byTask;
}

module.exports = { loadStockChecks, summarize };
