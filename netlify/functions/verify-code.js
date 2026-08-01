// netlify/functions/verify-code.js
//
// Pont entre l'app FrancoRoute Prépa et le Google Sheet des codes.
// L'URL du Web App Apps Script et la phrase secrète ne sont JAMAIS dans le
// HTML — elles vivent uniquement dans les variables d'environnement Netlify
// (APPS_SCRIPT_URL et APPS_SCRIPT_SECRET), configurées sur le site Netlify.
//
// Traduit la réponse du Google Sheet (status: valide/expiré/bloqué/inconnu)
// vers le format attendu par index.html ({ ok, reason }) — index.html n'a
// besoin d'aucune modification.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, reason: 'method_not_allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'bad_request' }) };
  }

  const code = (body.code || '').toString().trim();
  const deviceId = (body.deviceId || '').toString().trim();
  if (!code || !deviceId) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'bad_request' }) };
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!scriptUrl || !secret) {
    // Configuration manquante côté Netlify — ne jamais révéler pourquoi au client.
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'bad_request' }) };
  }

  let sheetData;
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId, secret })
    });
    sheetData = await res.json();
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'network' }) };
  }

  switch (sheetData.status) {
    case 'valide':
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    case 'expiré':
      return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'expired' }) };
    case 'bloqué':
      return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'device_limit' }) };
    case 'inconnu':
      return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'invalid' }) };
    default:
      return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'invalid' }) };
  }
};
