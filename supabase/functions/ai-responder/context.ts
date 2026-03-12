import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function buildBusinessContext(): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [partsRes, bikesRes, bikePartsRes] = await Promise.all([
    supabase
      .from("parts")
      .select("name, category, sale_price, pix_price, stock_qty, material, color, rim_size, frame_size, gears")
      .eq("visible_on_storefront", true)
      .order("name"),
    supabase
      .from("bike_models")
      .select("id, name, category, sale_price, pix_price, stock_qty, brand, color, rim_size, frame_size, weight_kg, description")
      .eq("visible_on_storefront", true)
      .order("name"),
    supabase
      .from("bike_model_parts")
      .select("bike_model_id, quantity, part_name_override, notes, part_id"),
  ]);

  const parts = partsRes.data || [];
  const bikes = bikesRes.data || [];
  const bikeParts = bikePartsRes.data || [];

  // Build parts lookup for bike components
  const partsById: Record<string, string> = {};
  for (const p of parts) {
    // We need all parts for lookup, fetch separately
  }

  // Fetch all parts for ID lookup
  const { data: allParts } = await supabase
    .from("parts")
    .select("id, name");
  for (const p of (allParts || [])) {
    partsById[p.id] = p.name;
  }

  let ctx = "=== CATÁLOGO DE PEÇAS ===\n";
  for (const p of parts) {
    const price = p.pix_price && p.pix_price > 0 ? `Pix: R$${p.pix_price}` : "";
    const salePrice = p.sale_price && p.sale_price > 0 ? `Preço: R$${p.sale_price}` : "";
    const specs = [p.category, p.material, p.color, p.rim_size, p.gears].filter(Boolean).join(", ");
    ctx += `- ${p.name} | ${specs} | ${salePrice} ${price} | Estoque: ${p.stock_qty}\n`;
  }

  ctx += "\n=== CATÁLOGO DE BIKES ===\n";
  for (const b of bikes) {
    const price = b.pix_price && b.pix_price > 0 ? `Pix: R$${b.pix_price}` : "";
    const salePrice = b.sale_price && b.sale_price > 0 ? `Preço: R$${b.sale_price}` : "";
    const specs = [b.brand, b.category, b.color, b.rim_size, b.frame_size, b.weight_kg ? `${b.weight_kg}kg` : null].filter(Boolean).join(", ");
    ctx += `- ${b.name} | ${specs} | ${salePrice} ${price} | Estoque: ${b.stock_qty}\n`;
    if (b.description) ctx += `  Descrição: ${b.description}\n`;

    // Components
    const components = bikeParts.filter((bp) => bp.bike_model_id === b.id);
    if (components.length > 0) {
      ctx += "  Componentes: ";
      ctx += components
        .map((c) => {
          const name = c.part_name_override || partsById[c.part_id || ""] || "Peça";
          return `${name}${c.quantity > 1 ? ` x${c.quantity}` : ""}`;
        })
        .join(", ");
      ctx += "\n";
    }
  }

  return ctx;
}
