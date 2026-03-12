// ============================================================
// supabase/functions/osm-cache/index.ts
//
// This Edge Function is the gatekeeper for all OSM data.
// It runs on Supabase's Deno runtime, close to your database,
// which means the PostGIS cache check and Overpass API call
// both happen server-side — no extra round trips from the app.
//
// The function runs with the service_role key, which bypasses
// RLS. This is intentional: the osm_places table has no INSERT
// policy for client roles (anon/authenticated), so only this
// server-side function can write to it.
//
// Deploy with: supabase functions deploy osm-cache
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// OSM tag → our internal place_type enum mapping
function tagToPlaceType(tags: Record<string, string>): string {
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'bar') return 'bar';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'library') return 'library';
  if (tags.amenity === 'cinema') return 'cinema';
  if (tags.leisure === 'park') return 'park';
  if (tags.sport === 'gym') return 'gym';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'gallery') return 'gallery';
  if (tags.shop === 'books') return 'bookshop';
  return 'other';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight — required for calls from the Expo web build
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { longitude, latitude, bbox } = await req.json();
    const { south, west, north, east } = bbox;

    // ── Service role client (bypasses RLS for writes) ────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Step 1: Check if this area has already been fetched ──
    // We check if any previously-fetched bounding box contains
    // the requested point. If yes, skip Overpass entirely.
    const { data: existingArea } = await supabase
      .from('osm_fetched_areas')
      .select('id, fetched_at')
      .filter(
        'bbox',
        'cs',  // PostGIS "contains" operator via Supabase filter
        `POINT(${longitude} ${latitude})`,
      )
      .maybeSingle();

    const isStale = existingArea
      ? Date.now() - new Date(existingArea.fetched_at).getTime() > 30 * 24 * 60 * 60 * 1000
      : false;

    if (existingArea && !isStale) {
      // Cache hit: return from PostGIS without calling Overpass
      const { data: cachedPlaces } = await supabase.rpc('get_nearby_osm_places', {
        p_longitude: longitude,
        p_latitude: latitude,
        p_radius_metres: 3000,
      });

      return new Response(
        JSON.stringify({ places: cachedPlaces, source: 'cache' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 2: Cache miss — call the Overpass API ───────────
    // Overpass QL: fetch all third-place venue types within the bbox.
    // (south, west, north, east) order — Overpass uses lat/lng, not lng/lat.
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="cafe"](${south},${west},${north},${east});
        node["amenity"="bar"](${south},${west},${north},${east});
        node["amenity"="restaurant"](${south},${west},${north},${east});
        node["amenity"="library"](${south},${west},${north},${east});
        node["amenity"="cinema"](${south},${west},${north},${east});
        node["leisure"="park"](${south},${west},${north},${east});
        node["tourism"="museum"](${south},${west},${north},${east});
        node["tourism"="gallery"](${south},${west},${north},${east});
        node["shop"="books"](${south},${west},${north},${east});
      );
      out body;
    `;

    const overpassResponse = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!overpassResponse.ok) {
      throw new Error(`Overpass API error: ${overpassResponse.status}`);
    }

    const overpassData = await overpassResponse.json();
    const elements = overpassData.elements ?? [];

    // ── Step 3: Write results to PostGIS cache ───────────────
    // Filter out places without names — unnamed nodes aren't useful
    const places = elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => ({
        osm_id: el.id,
        osm_type: el.type,  // 'node', 'way', or 'relation'
        name: el.tags.name,
        place_type: tagToPlaceType(el.tags),
        // PostGIS POINT format: (longitude latitude) — note lng first
        location: `POINT(${el.lon} ${el.lat})`,
        tags: el.tags,
        address: [
          el.tags['addr:street'],
          el.tags['addr:housenumber'],
        ].filter(Boolean).join(' ') || '',
        city: el.tags['addr:city'] || 'Oslo',
        country: 'NO',
      }));

    if (places.length > 0) {
      // UPSERT: if a place already exists (same osm_id), update it.
      // This handles the case where Overpass returns updated data for
      // a previously-cached place (e.g., a café changed its name).
      await supabase.from('osm_places').upsert(places, {
        onConflict: 'osm_id',
        ignoreDuplicates: false,
      });
    }

    // Record that we've fetched this bounding box so future requests
    // to the same area hit the PostGIS cache instead of Overpass.
    await supabase.from('osm_fetched_areas').upsert({
      bbox: `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`,
      fetched_at: new Date().toISOString(),
    });

    // Return the freshly-fetched data (transformed to have lng/lat floats)
    const returnPlaces = places.map((p: any) => ({
      ...p,
      longitude: parseFloat(p.location.match(/POINT\(([^ ]+)/)?.[1] ?? '0'),
      latitude: parseFloat(p.location.match(/ ([^)]+)\)/)?.[1] ?? '0'),
    }));

    return new Response(
      JSON.stringify({ places: returnPlaces, source: 'overpass' }),
      { headers: { 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});