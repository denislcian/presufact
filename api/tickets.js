// Buzon de tickets de soporte (Vercel Serverless Function + Upstash Redis REST).
//
// Endpoints:
//   POST   /api/tickets              publico: crear ticket (rate-limit por IP)
//   GET    /api/tickets              admin:   listar tickets
//   PATCH  /api/tickets              admin:   cambiar estado {id, estado}
//   DELETE /api/tickets              admin:   borrar {id}
//
// Variables de entorno necesarias (Vercel > Settings > Environment Variables):
//   UPSTASH_REDIS_REST_URL    url REST de la base Upstash (plan free)
//   UPSTASH_REDIS_REST_TOKEN  token REST de Upstash
//   ADMIN_TOKEN               token largo y aleatorio, solo lo conoce el admin
//
// Sin configurar, POST devuelve 503 y el formulario cae al canal de GitHub.

import crypto from 'node:crypto';

const KV_URL = process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const LIST_KEY = 'presufact:tickets';
const MAX_TICKETS = 500;
const RATE_LIMIT = 5; // tickets por IP y hora

async function kv(command) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error('KV ' + r.status);
  return (await r.json()).result;
}

function isAdmin(req) {
  const header = String(req.headers.authorization || '');
  const expected = `Bearer ${ADMIN_TOKEN}`;
  if (!ADMIN_TOKEN || header.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

async function readAll() {
  const raw = (await kv(['LRANGE', LIST_KEY, '0', String(MAX_TICKETS - 1)])) || [];
  return raw.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

async function writeAll(tickets) {
  await kv(['DEL', LIST_KEY]);
  if (tickets.length) {
    await kv(['RPUSH', LIST_KEY, ...tickets.map((t) => JSON.stringify(t))]);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({ error: 'Buzón no configurado todavía' });
  }

  try {
    if (req.method === 'POST') {
      // rate-limit por IP: RATE_LIMIT tickets/hora
      const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);
      const rlKey = `presufact:rl:${ipHash}`;
      const count = await kv(['INCR', rlKey]);
      if (count === 1) await kv(['EXPIRE', rlKey, '3600']);
      if (count > RATE_LIMIT) {
        return res.status(429).json({ error: 'Demasiados tickets seguidos. Prueba en un rato.' });
      }

      const { asunto, mensaje, email } = req.body || {};
      const a = String(asunto || '').trim().slice(0, 120);
      const m = String(mensaje || '').trim().slice(0, 4000);
      const e = String(email || '').trim().slice(0, 120);
      if (a.length < 3) return res.status(400).json({ error: 'El asunto es demasiado corto' });
      if (m.length < 10) return res.status(400).json({ error: 'Cuéntanos algo más en el mensaje' });
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'El email no parece válido' });

      const ticket = {
        id: crypto.randomUUID(),
        fecha: new Date().toISOString(),
        asunto: a,
        mensaje: m,
        email: e || null,
        estado: 'abierto',
      };
      await kv(['LPUSH', LIST_KEY, JSON.stringify(ticket)]);
      await kv(['LTRIM', LIST_KEY, '0', String(MAX_TICKETS - 1)]);
      return res.status(201).json({ ok: true, id: ticket.id });
    }

    // Todo lo demas requiere el token de admin
    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.method === 'GET') {
      const tickets = await readAll();
      return res.status(200).json({ tickets });
    }

    if (req.method === 'PATCH') {
      const { id, estado } = req.body || {};
      if (!id || !['abierto', 'resuelto'].includes(estado)) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
      }
      const tickets = await readAll();
      const t = tickets.find((x) => x.id === id);
      if (!t) return res.status(404).json({ error: 'Ticket no encontrado' });
      t.estado = estado;
      t.actualizado = new Date().toISOString();
      await writeAll(tickets);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta el id' });
      const tickets = await readAll();
      await writeAll(tickets.filter((x) => x.id !== id));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error('tickets error:', e.message);
    return res.status(500).json({ error: 'Error interno del buzón' });
  }
}
