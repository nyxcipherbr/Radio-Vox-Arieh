/**
 * VOX ARIEH - SERVIÇO BACKEND DE PERSISTÊNCIA EM TEMPO REAL DO ADM
 * Micro-API nativa em Node.js (sem dependências externas)
 * Grava permanentemente alterações do Painel ADM no servidor para todos os ouvintes.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Hash mestre de autenticação da administração (SHA-256)
const DEFAULT_ADMIN_HASH = 'a1b8457ae946c6ea54d9d7ee69e835249eb75c8c4b3de11ce82cf9f84b4daf5b';

// Sistema Anti-Brute Force e Anti-Flood (Rate Limiting em memória)
const requestCounts = new Map();
const RATE_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MIN = 40; // Max 40 requisições por IP por minuto
const MAX_SAVE_ATTEMPTS_PER_MIN = 10; // Max 10 tentativas de login/save por minuto

function checkRateLimit(ip, isSensitive = false) {
  const now = Date.now();
  const limit = isSensitive ? MAX_SAVE_ATTEMPTS_PER_MIN : MAX_REQUESTS_PER_MIN;
  const key = `${ip}_${isSensitive ? 'sens' : 'gen'}`;
  
  const record = requestCounts.get(key);
  if (!record || (now - record.startTime) > RATE_WINDOW_MS) {
    requestCounts.set(key, { count: 1, startTime: now });
    return true;
  }
  
  record.count++;
  if (record.count > limit) {
    return false;
  }
  return true;
}

// Limpeza periódica do mapa de rate limiting a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if ((now - record.startTime) > RATE_WINDOW_MS) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[API] Erro ao ler data.json:', e);
  }
  return null;
}

function saveData(data) {
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[API] Erro ao gravar data.json:', e);
    return false;
  }
}

// Comparação criptográfica segura em tempo constante (Anti-Timing Attacks)
function verifyAuth(req, bodyHash) {
  const headerHash = req.headers['x-admin-hash'];
  const providedHash = String(headerHash || bodyHash || '').trim().toLowerCase();
  if (!providedHash || providedHash.length !== 64) return false;

  const data = loadData();
  const allowedHash = String((data && data.adminHash) ? data.adminHash : DEFAULT_ADMIN_HASH).trim().toLowerCase();

  try {
    const bufProvided = Buffer.from(providedHash, 'hex');
    const bufAllowed = Buffer.from(allowedHash, 'hex');
    if (bufProvided.length !== bufAllowed.length) return false;
    return crypto.timingSafeEqual(bufProvided, bufAllowed);
  } catch (e) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  const clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Cabeçalhos de Segurança da API (OWASP Hardening)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Hash');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate Limiting Geral
  if (!checkRateLimit(clientIp, false)) {
    res.writeHead(429);
    res.end(JSON.stringify({ error: 'Muitas requisições. Por favor, aguarde um momento.' }));
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Healthcheck
  if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/api/ping')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'vox-arieh-api', timestamp: new Date().toISOString() }));
    return;
  }

  // 2. Consulta de dados globais (GET /api/data)
  if (req.method === 'GET' && pathname === '/api/data') {
    const data = loadData();
    if (data) {
      const safeData = { ...data };
      delete safeData.adminHash;
      res.writeHead(200);
      res.end(JSON.stringify(safeData));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'data.json not found' }));
    }
    return;
  }

  // 3. Salvar alterações do ADM (POST /api/save)
  if (req.method === 'POST' && pathname === '/api/save') {
    if (!checkRateLimit(clientIp, true)) {
      res.writeHead(429);
      res.end(JSON.stringify({ error: 'Muitas tentativas de gravação/login. Aguarde 1 minuto.' }));
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Payload muito grande.' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { type, data: updateData, hash } = payload;

        if (!verifyAuth(req, hash)) {
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Não autorizado. Senha do ADM inválida.' }));
          return;
        }

        const currentData = loadData() || {};

        if (type === 'wordStudies') {
          currentData.wordStudies = updateData;
        } else if (type === 'devotional') {
          currentData.dailyDevotional = updateData;
        } else if (type === 'podcastEpisodes') {
          currentData.podcastEpisodes = updateData;
        } else if (type === 'podcastShow') {
          currentData.podcastShow = updateData;
        } else if (type === 'sponsors') {
          currentData.sponsors = updateData;
        } else if (type === 'schedule') {
          currentData.schedule = updateData;
        } else if (type === 'prayers') {
          currentData.prayers = updateData;
        } else if (type === 'settings') {
          if (updateData.streamUrl) currentData.streamUrl = updateData.streamUrl;
          if (updateData.contact) currentData.contact = { ...currentData.contact, ...updateData.contact };
          if (updateData.newAdminHash) currentData.adminHash = updateData.newAdminHash;
        } else if (type === 'full') {
          Object.assign(currentData, updateData);
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Tipo de atualização desconhecido.' }));
          return;
        }

        if (saveData(currentData)) {
          console.log(`[API] Sucesso: Seção "${type}" atualizada pelo ADM em ${new Date().toISOString()}`);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Dados gravados no servidor com sucesso!' }));
        } else {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Falha ao salvar dados no servidor.' }));
        }
      } catch (err) {
        console.error('[API] Erro no processamento do POST /api/save:', err);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }));
      }
    });
    return;
  }

  // 4. Recebimento público de Pedidos de Oração de ouvintes (POST /api/prayer)
  if (req.method === 'POST' && pathname === '/api/prayer') {
    if (!checkRateLimit(clientIp, true)) {
      res.writeHead(429);
      res.end(JSON.stringify({ error: 'Muitos envios recentes. Aguarde 1 minuto.' }));
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024) { // 50KB max para pedido
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Pedido muito extenso.' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const sanitizeClean = str => String(str || '')
          .replace(/[<>]/g, '')
          .trim();

        const name = sanitizeClean(payload.name).slice(0, 80);
        const city = sanitizeClean(payload.city).slice(0, 80);
        const song = sanitizeClean(payload.song).slice(0, 100);
        const prayerRequest = sanitizeClean(payload.request).slice(0, 1500);
        const category = sanitizeClean(payload.category || 'Geral').slice(0, 40);

        if (!name || !prayerRequest) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Nome e pedido de oração são obrigatórios.' }));
          return;
        }

        const currentData = loadData() || {};
        if (!Array.isArray(currentData.prayers)) {
          currentData.prayers = [];
        }

        const newPrayer = {
          id: 'pray_' + Date.now(),
          name,
          city,
          song,
          request: prayerRequest,
          category,
          date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          status: 'Recebido'
        };

        currentData.prayers.unshift(newPrayer);
        // Mantém os últimos 300 pedidos para otimizar espaço
        if (currentData.prayers.length > 300) {
          currentData.prayers = currentData.prayers.slice(0, 300);
        }

        if (saveData(currentData)) {
          console.log(`[API] Novo pedido de oração de "${name}" (${city}) recebido em ${new Date().toISOString()}`);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Pedido de oração recebido com sucesso!', prayer: newPrayer }));
        } else {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Erro ao registrar pedido de oração.' }));
        }
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Formato inválido.' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🦁 Rádio Vox Arieh - API ADM rodando em http://127.0.0.1:${PORT}`);
});
