// POST /api/detect  { image: "data:image/jpeg;base64,..." }  ->  { ships: [{ x, w, type }] }
// The vision model only does the seeing: it finds the ships in the photo. It does not name any ship. web/src/spot.js does the naming.
// Needs OPENROUTER_API_KEY and VISION_MODEL (an OpenRouter model id that accepts images) in the Vercel environment.
// The photo is sent to the model and is not stored.
const PROMPT = `Find every ship or large vessel on the water in this photo.
Reply with JSON only: {"ships":[{"x":0.0,"w":0.0,"type":"tanker|cargo|other"}]}
x = horizontal centre of the hull, 0 is the left edge of the image and 1 is the right edge.
w = hull length as a fraction of the image width.
type = "tanker" for a low flat deck with pipes, "cargo" for containers, cranes or hatches, "other" when you cannot tell.
List ships left to right. Leave out buoys, land, and boats shorter than about 1% of the image width. Do not guess names.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.OPENROUTER_API_KEY || !process.env.VISION_MODEL) return res.status(503).json({ error: 'the vision step is not set up' });
  const image = (req.body && req.body.image) || '';
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 6e6) return res.status(400).json({ error: 'send one jpeg, png or webp under 4 MB' });
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'x-title': 'Vessel Viewer' },
      body: JSON.stringify({ model: process.env.VISION_MODEL, max_tokens: 1200, temperature: 0,
        messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: image } }] }] }),
    });
    if (!r.ok) return res.status(502).json({ error: 'the vision model call failed' });
    const text = String((((await r.json()).choices || [])[0] || {}).message?.content || '');
    let ships = [];
    try { ships = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).ships || []; } catch (_) {}
    ships = ships.filter((s) => s && s.x >= 0 && s.x <= 1 && s.w > 0 && s.w <= 1)
      .map((s) => ({ x: +s.x, w: +s.w, type: ['tanker', 'cargo'].includes(s.type) ? s.type : null }))
      .sort((a, b) => a.x - b.x).slice(0, 30);
    res.setHeader('cache-control', 'no-store');
    res.status(200).json({ ships, model: process.env.VISION_MODEL });
  } catch (e) {
    res.status(502).json({ error: 'the vision model call failed' });
  }
}
