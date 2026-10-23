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

function verifyAuth(req, bodyHash) {
  const headerHash = req.headers['x-admin-hash'];
  const providedHash = headerHash || bodyHash;
  if (!providedHash) return false;

  const data = loadData();
  const allowedHash = (data && data.adminHash) ? data.adminHash : DEFAULT_ADMIN_HASH;
  return providedHash.toLowerCase() === allowedHash.toLowerCase();
}

const server = http.createServer((req, res) => {
  // CORS e cabeçalhos de segurança
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Hash');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
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

        if (type === 'devotional') {
          currentData.dailyDevotional = updateData;
        } else if (type === 'podcastEpisodes') {
          currentData.podcastEpisodes = updateData;
        } else if (type === 'podcastShow') {
          currentData.podcastShow = updateData;
        } else if (type === 'sponsors') {
          currentData.sponsors = updateData;
        } else if (type === 'schedule') {
          currentData.schedule = updateData;
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

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🦁 Rádio Vox Arieh - API ADM rodando em http://127.0.0.1:${PORT}`);
});
