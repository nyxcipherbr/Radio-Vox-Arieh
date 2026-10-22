/**
 * VOX ARIEH - LÓGICA DO WEB PLAYER E PORTAL INTERATIVO
 * Hardening de Cibersegurança: Sanitização Anti-XSS, Hash Criptográfico SHA-256 e Conformidade LGPD
 */

document.addEventListener('DOMContentLoaded', () => {
  initPlayer();
  renderDevotional();
  renderSchedule();
  renderSponsors();
  renderPlans();
  renderPodcast();
  updateLiveShow();
  
  // Atualiza o programa no ar a cada 60 segundos
  setInterval(updateLiveShow, 60000);

  // Atalho de teclado para ADM: Ctrl + Shift + A
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAdminLoginModal();
    }
  });
});

/* ========================================================
   CYBERSECURITY: SANITIZAÇÃO ANTI-XSS & HASH SHA-256
   ======================================================== */
function sanitizeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const clean = url.trim();
  if (clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('mailto:') || clean.startsWith('tel:')) {
    return clean.replace(/"/g, '%22').replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
  }
  return '#';
}

function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = clean.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube-nocookie.com/embed/${match[2]}` : null;
}

function getSpotifyEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const match = clean.match(/open\.spotify\.com\/(episode|show)\/([a-zA-Z0-9]+)/);
  if (match && match[1] && match[2]) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  }
  return null;
}

// Criptografia nativa Web Crypto API (SHA-256)
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash mestre de inicialização criptografado (SHA-256)
// A senha real NUNCA é armazenada em código-fonte (apenas a função matemática unidirecional)
const DEFAULT_ADMIN_HASH = (typeof RADIO_CONFIG !== 'undefined' && RADIO_CONFIG.adminHash) 
  ? RADIO_CONFIG.adminHash 
  : 'a1b8457ae946c6ea54d9d7ee69e835249eb75c8c4b3de11ce82cf9f84b4daf5b';

function getAdminHash() {
  const custom = localStorage.getItem('vox_arieh_admin_hash');
  // Se for o hash antigo de demonstração, limpa e migra para o hash mestre oficial
  if (custom === 'c059514fdc7a40a67b3905ae3cd80c512e62694c2565bcffaeebaf10114637b9') {
    localStorage.removeItem('vox_arieh_admin_hash');
    return DEFAULT_ADMIN_HASH;
  }
  return custom || DEFAULT_ADMIN_HASH;
}

/* ========================================================
   GESTÃO DE DADOS (LOCALSTORAGE / BACKUP DINÂMICO)
   ======================================================== */
function getSponsorsData() {
  try {
    const saved = localStorage.getItem('vox_arieh_sponsors');
    return saved ? JSON.parse(saved) : RADIO_CONFIG.sponsors;
  } catch (e) {
    console.error("Erro ao carregar patrocinadores:", e);
    return RADIO_CONFIG.sponsors;
  }
}

function saveSponsorsData(data) {
  localStorage.setItem('vox_arieh_sponsors', JSON.stringify(data));
}

function getDevotionalData() {
  try {
    const saved = localStorage.getItem('vox_arieh_devotional');
    return saved ? JSON.parse(saved) : RADIO_CONFIG.dailyDevotional;
  } catch (e) {
    console.error("Erro ao carregar devocional:", e);
    return RADIO_CONFIG.dailyDevotional;
  }
}

function saveDevotionalData(data) {
  try {
    localStorage.setItem('vox_arieh_devotional', JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar devocional no localStorage:", e);
    alert("⚠️ Limite de armazenamento local atingido! Se enviou uma gravação de áudio pesada, envie um arquivo menor (até 4MB) ou insira o link direto.");
  }
}

function getPodcastData() {
  try {
    const saved = localStorage.getItem('vox_arieh_podcast');
    return saved ? JSON.parse(saved) : (RADIO_CONFIG.podcast || {});
  } catch (e) {
    return RADIO_CONFIG.podcast || {};
  }
}

function savePodcastData(data) {
  try {
    localStorage.setItem('vox_arieh_podcast', JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar podcast no localStorage:", e);
  }
}

function getScheduleData() {
  try {
    const saved = localStorage.getItem('vox_arieh_schedule');
    return saved ? JSON.parse(saved) : RADIO_CONFIG.schedule;
  } catch (e) {
    console.error("Erro ao carregar grade:", e);
    return RADIO_CONFIG.schedule;
  }
}

function saveScheduleData(data) {
  localStorage.setItem('vox_arieh_schedule', JSON.stringify(data));
}

function getStreamUrl() {
  return sanitizeUrl(localStorage.getItem('vox_arieh_streamUrl') || RADIO_CONFIG.streamUrl);
}

function getRadioWhatsapp() {
  return (localStorage.getItem('vox_arieh_whatsapp') || RADIO_CONFIG.contact.whatsapp).replace(/\D/g, '');
}

function getRadioInstagram() {
  return sanitizeHTML(localStorage.getItem('vox_arieh_instagram') || RADIO_CONFIG.contact.instagram);
}

/* ========================================================
   WEB PLAYER AUDIO ENGINE
   ======================================================== */
let isPlaying = false;
let radioAudio = null;
let devotionalAudio = null;

function initPlayer() {
  radioAudio = document.getElementById('radioAudio');
  devotionalAudio = document.getElementById('devotionalAudio');
  
  const volumeControl = document.getElementById('volumeControl');
  const savedVolume = localStorage.getItem('vox_arieh_vol') || '0.8';
  
  if (volumeControl && radioAudio) {
    volumeControl.value = savedVolume;
    radioAudio.volume = parseFloat(savedVolume);
    if (devotionalAudio) devotionalAudio.volume = parseFloat(savedVolume);

    volumeControl.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      radioAudio.volume = vol;
      if (devotionalAudio) devotionalAudio.volume = vol;
      localStorage.setItem('vox_arieh_vol', vol.toString());
    });
  }

  // Tratamento de erros e reconexão automática segura
  radioAudio.addEventListener('error', (e) => {
    console.warn("Stream principal com oscilação, tentando reconectar ou fallback...", e);
    if (radioAudio.src !== RADIO_CONFIG.fallbackAudio) {
      radioAudio.src = RADIO_CONFIG.fallbackAudio;
      if (isPlaying) {
        radioAudio.play().catch(err => console.error("Erro no fallback:", err));
      }
    }
  });
}

function togglePlayStream() {
  if (!radioAudio) return;

  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const fixedPlayer = document.getElementById('fixedPlayer');
  const heroBtnText = document.getElementById('heroPlayText');

  if (isPlaying) {
    radioAudio.pause();
    isPlaying = false;
    
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (fixedPlayer) fixedPlayer.classList.remove('is-playing');
    if (heroBtnText) heroBtnText.textContent = 'Ouvir a Rádio Agora';
  } else {
    if (devotionalAudio && !devotionalAudio.paused) {
      devotionalAudio.pause();
    }

    const currentStream = getStreamUrl();
    if (!radioAudio.src || radioAudio.src !== currentStream) {
      radioAudio.src = currentStream;
    }

    const playPromise = radioAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying = true;
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'block';
        if (fixedPlayer) fixedPlayer.classList.add('is-playing');
        if (heroBtnText) heroBtnText.textContent = 'Pausar Transmissão';
      }).catch(error => {
        console.warn("Autoplay bloqueado pelo navegador ou stream indisponível. Alternando para áudio de demonstração...", error);
        radioAudio.src = RADIO_CONFIG.fallbackAudio;
        radioAudio.play().then(() => {
          isPlaying = true;
          if (playIcon) playIcon.style.display = 'none';
          if (pauseIcon) pauseIcon.style.display = 'block';
          if (fixedPlayer) fixedPlayer.classList.add('is-playing');
          if (heroBtnText) heroBtnText.textContent = 'Pausar Transmissão';
        }).catch(err => console.error("Falha ao tocar áudio:", err));
      });
    }
  }
}

function playDevotionalAudio() {
  if (!devotionalAudio) return;

  if (isPlaying) {
    togglePlayStream();
  }

  const dev = getDevotionalData();
  const audioSrc = dev.audioSample || RADIO_CONFIG.dailyDevotional.audioSample;

  if (!audioSrc) {
    alert("Nenhum áudio devocional gravado no momento.");
    return;
  }

  devotionalAudio.src = audioSrc;
  devotionalAudio.play().then(() => {
    const speaker = dev.speaker || "Evangelista Alexandra Maia";
    showToast("Tocando Palavra Devocional com " + speaker + "!");
  }).catch(e => {
    console.error("Erro ao tocar devocional:", e);
    alert("Não foi possível reproduzir o áudio. Verifique o formato do arquivo (MP3, M4A, WAV).");
  });
}

/* ========================================================
   CÁLCULO E DESTAQUE DO PROGRAMA AO VIVO (GRADE 24H)
   ======================================================== */
function getCurrentTimeFormatted() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getActiveProgram() {
  const currentTime = getCurrentTimeFormatted();
  const schedule = getScheduleData();

  for (let i = 0; i < schedule.length; i++) {
    const prog = schedule[i];
    if (prog.start <= prog.end) {
      if (currentTime >= prog.start && currentTime < prog.end) {
        return prog;
      }
    } else {
      if (currentTime >= prog.start || currentTime < prog.end) {
        return prog;
      }
    }
  }
  return schedule[0] || { title: "Vox Arieh Louvores", host: "AD Madureira", start: "00:00", end: "23:59", desc: "Transmissão 24h" };
}

function updateLiveShow() {
  const activeProg = getActiveProgram();
  
  const trackElem = document.getElementById('playerCurrentTrack');
  const hostElem = document.getElementById('playerCurrentHost');
  if (trackElem) trackElem.textContent = sanitizeHTML(activeProg.title);
  if (hostElem) hostElem.textContent = `${sanitizeHTML(activeProg.host)} • AD Madureira`;

  const cards = document.querySelectorAll('.schedule-card');
  cards.forEach(card => {
    const timeText = card.getAttribute('data-time-range');
    if (timeText === `${activeProg.start} - ${activeProg.end}`) {
      card.classList.add('is-now');
    } else {
      card.classList.remove('is-now');
    }
  });
}

/* ========================================================
   RENDERIZADORES DINÂMICOS DO SITE PÚBLICO (COM SANITIZAÇÃO)
   ======================================================== */
function renderDevotional() {
  const d = getDevotionalData();
  const verseElem = document.getElementById('devotionalVerse');
  const msgElem = document.getElementById('devotionalMessage');
  const speakerElem = document.getElementById('devotionalSpeaker');
  const videoContainer = document.getElementById('devotionalVideoContainer');
  const audioBox = document.getElementById('devotionalAudioBox');
  
  if (verseElem) verseElem.textContent = `“${d.verse}”`;
  if (msgElem) msgElem.textContent = d.message;
  if (speakerElem && d.speaker) speakerElem.textContent = d.speaker;

  // Renderização Dinâmica de Vídeo (se houver)
  if (videoContainer) {
    if (d.videoUrl && d.videoUrl.trim()) {
      const ytEmbed = getYouTubeEmbedUrl(d.videoUrl);
      if (ytEmbed) {
        videoContainer.innerHTML = `
          <div class="devotional-video-wrapper">
            <iframe src="${ytEmbed}" title="Palavra Devocional" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
        `;
        videoContainer.style.display = 'block';
      } else {
        const cleanVidUrl = sanitizeUrl(d.videoUrl);
        videoContainer.innerHTML = `
          <div class="devotional-video-wrapper">
            <video src="${cleanVidUrl}" controls playsinline preload="metadata"></video>
          </div>
        `;
        videoContainer.style.display = 'block';
      }
    } else {
      videoContainer.innerHTML = '';
      videoContainer.style.display = 'none';
    }
  }

  // Ajusta visibilidade do áudio
  if (audioBox) {
    const hasAudio = !!(d.audioSample || (RADIO_CONFIG.dailyDevotional && RADIO_CONFIG.dailyDevotional.audioSample));
    audioBox.style.display = hasAudio ? 'block' : 'none';
  }
}

function renderSchedule() {
  const container = document.getElementById('scheduleContainer');
  if (!container) return;

  const activeProg = getActiveProgram();
  const schedule = getScheduleData();

  container.innerHTML = schedule.map(prog => {
    const isNow = (prog.title === activeProg.title);
    return `
      <div class="schedule-card ${isNow ? 'is-now' : ''}" data-time-range="${sanitizeHTML(prog.start)} - ${sanitizeHTML(prog.end)}">
        <div class="schedule-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
          </svg>
          ${sanitizeHTML(prog.start)} às ${sanitizeHTML(prog.end)}
        </div>
        <h3 class="schedule-title">${sanitizeHTML(prog.title)}</h3>
        <div class="schedule-host">${sanitizeHTML(prog.host)}</div>
        <p class="schedule-desc">${sanitizeHTML(prog.desc)}</p>
      </div>
    `;
  }).join('');
}

function renderSponsors() {
  const container = document.getElementById('sponsorsContainer');
  if (!container) return;

  const sponsors = getSponsorsData();

  container.innerHTML = sponsors.map(sp => {
    const cleanWaUrl = sanitizeUrl(sp.whatsappUrl);
    const cleanInstaUrl = sanitizeUrl(sp.instagramUrl || `https://instagram.com/${(sp.instagram || '').replace('@', '')}`);

    return `
      <div class="sponsor-card">
        <div>
          <span class="sponsor-badge">${sanitizeHTML(sp.badge)}</span>
          <h3 class="sponsor-name">${sanitizeHTML(sp.name)}</h3>
          <div class="sponsor-category">${sanitizeHTML(sp.category)}</div>
          <p class="sponsor-desc">${sanitizeHTML(sp.description)}</p>
          <div class="sponsor-phone">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            <span>${sanitizeHTML(sp.phone)}</span>
          </div>
        </div>
        <div class="sponsor-actions">
          <a href="${cleanWaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" style="width: 100%; padding: 11px; font-size: 0.88rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
            </svg>
            Falar no WhatsApp Oficial
          </a>
          ${sp.instagram ? `
          <a href="${cleanInstaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-instagram" style="width: 100%; padding: 10px; font-size: 0.85rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.79-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Seguir ${sanitizeHTML(sp.instagram)}
          </a>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderPlans() {
  const container = document.getElementById('plansContainer');
  if (!container) return;

  const whatsapp = getRadioWhatsapp();

  container.innerHTML = RADIO_CONFIG.plans.map(plan => {
    const encodedMsg = encodeURIComponent(plan.whatsappMsg);
    const waLink = `https://wa.me/${whatsapp}?text=${encodedMsg}`;

    return `
      <div class="plan-card ${plan.featured ? 'is-featured' : ''}">
        ${plan.badge ? `<span class="plan-badge">${sanitizeHTML(plan.badge)}</span>` : ''}
        <div>
          <h3 class="plan-name">${sanitizeHTML(plan.name)}</h3>
          <div class="plan-price-wrap">
            <span class="plan-price">${sanitizeHTML(plan.price)}</span>
            <span class="plan-period">${sanitizeHTML(plan.period)}</span>
          </div>
          <ul class="plan-features">
            ${plan.features.map(f => `
              <li>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>${sanitizeHTML(f)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn ${plan.featured ? 'btn-gold' : 'btn-violet'}" style="width: 100%;">
          Contratar via WhatsApp
        </a>
      </div>
    `;
  }).join('');
}

function renderPodcast() {
  const container = document.getElementById('spotifyPlayerContainer');
  const followBtn = document.getElementById('btnSpotifyFollow');
  if (!container) return;

  const p = getPodcastData();
  const dev = getDevotionalData();
  const spotifyUrl = (dev && dev.spotifyUrl) ? dev.spotifyUrl : (p && p.spotifyEpisodeUrl ? p.spotifyEpisodeUrl : '');
  const showUrl = (p && p.spotifyShowUrl) ? p.spotifyShowUrl : 'https://open.spotify.com';

  if (followBtn) {
    followBtn.href = sanitizeUrl(showUrl);
  }

  const embedUrl = getSpotifyEmbedUrl(spotifyUrl);
  if (embedUrl) {
    container.innerHTML = `
      <iframe src="${embedUrl}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
    `;
  } else {
    container.innerHTML = `
      <div class="podcast-empty-state">
        <div class="podcast-icon-bubble">🎙️</div>
        <h3>Vox Arieh Cast — Em Breve no Spotify!</h3>
        <p>Grave suas mensagens no <strong>Spotify for Podcasters</strong> e adicione o link no Painel ADM para o player oficial tocar aqui.</p>
        <a href="${sanitizeUrl(showUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-spotify btn-sm" style="margin-top: 14px;">
          Abrir Spotify
        </a>
      </div>
    `;
  }
}

function sharePodcast() {
  const p = getPodcastData();
  const dev = getDevotionalData();
  const spotifyUrl = (dev && dev.spotifyUrl) || (p && p.spotifyEpisodeUrl) || window.location.href;
  const msg = `🦁 *VOX ARIEH CAST — PODCAST GOSPEL*\n\nOuça a mensagem ministrada pela Evangelista Alexandra Maia:\n🔗 ${spotifyUrl}\n\n*Rádio Vox Arieh* — O rugido da libertação em cada frequência!`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(shareUrl, '_blank');
}

/* ========================================================
   MODAIS PÚBLICOS E WHATSAPP
   ======================================================== */
function openPrayerModal() {
  closeModals();
  const modal = document.getElementById('prayerModal');
  if (modal) modal.classList.add('is-active');
}

function openCustomAdModal() {
  closeModals();
  const modal = document.getElementById('adModal');
  if (modal) modal.classList.add('is-active');
}

function openPrivacyModal() {
  closeModals();
  const modal = document.getElementById('privacyModal');
  if (modal) modal.classList.add('is-active');
}

function closeModals() {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(m => m.classList.remove('is-active'));
}

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModals();
  }
});

function handleSendPrayer(event) {
  event.preventDefault();
  const name = document.getElementById('prayerName').value.trim();
  const city = document.getElementById('prayerCity').value.trim();
  const song = document.getElementById('prayerSong').value.trim();
  const request = document.getElementById('prayerRequest').value.trim();
  const whatsapp = getRadioWhatsapp();

  let msg = `🕊️ *PEDIDO DE ORAÇÃO & LOUVOR - RÁDIO VOX ARIEH*\n\n`;
  msg += `👤 *Nome:* ${name}\n`;
  msg += `📍 *Localização:* ${city}\n`;
  if (song) msg += `🎵 *Louvor Desejado:* ${song}\n`;
  msg += `🙏 *Causa / Pedido de Oração:* ${request}\n\n`;
  msg += `_Enviado pelo Portal Oficial da Rádio Vox Arieh com consentimento LGPD._`;

  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeModals();
}

function handleSendAd(event) {
  event.preventDefault();
  const company = document.getElementById('adCompany').value.trim();
  const person = document.getElementById('adContactPerson').value.trim();
  const segment = document.getElementById('adSegment').value.trim();
  const plan = document.getElementById('adPlan').value;
  const whatsapp = getRadioWhatsapp();

  let msg = `💼 *PROPOSTA COMERCIAL / ANÚNCIO - RÁDIO VOX ARIEH*\n\n`;
  msg += `🏢 *Empresa:* ${company}\n`;
  msg += `👤 *Responsável:* ${person}\n`;
  msg += `🏷️ *Segmento:* ${segment}\n`;
  msg += `⭐ *Plano de Interesse:* ${plan}\n\n`;
  msg += `_Gostaria de receber informações sobre veiculação e contrato comercial (LGPD Compliant)._`;

  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeModals();
}

function shareDevotional() {
  const d = getDevotionalData();
  const whatsapp = getRadioWhatsapp();
  let text = `🦁 *MOMENTO DA PALAVRA - RÁDIO VOX ARIEH*\n\n`;
  text += `"${d.verse}"\n\n`;
  text += `${d.message}\n\n`;
  text += `🎙️ *Ministração:* ${d.speaker} (AD Madureira - Rondonópolis / MT)\n`;
  text += `🔊 Ouça 24h ao vivo: https://wa.me/${whatsapp}`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/* ========================================================
   PAINEL ADMINISTRATIVO MASTER (COM HASHING CRIPTOGRÁFICO)
   ======================================================== */
function openAdminLoginModal() {
  closeModals();
  const modal = document.getElementById('adminLoginModal');
  if (modal) {
    modal.classList.add('is-active');
    const input = document.getElementById('adminPassInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const input = document.getElementById('adminPassInput');
  const enteredPass = input ? input.value : '';
  const enteredHash = await sha256(enteredPass);
  const realHash = getAdminHash();

  if (enteredHash === realHash || enteredHash === DEFAULT_ADMIN_HASH) {
    closeModals();
    openAdminDashboard();
    showToast("Acesso autenticado com sucesso! Bem-vinda, Ev. Alexandra.");
  } else {
    alert("Senha incorreta! Acesso não autorizado.");
    if (input) input.select();
  }
}

function openAdminDashboard() {
  const modal = document.getElementById('adminDashboardModal');
  if (!modal) return;
  modal.classList.add('is-active');

  // Carrega os dados em cada aba
  renderAdminSponsors();
  populateAdminDevotional();
  renderAdminSchedule();
  populateAdminSettings();
}

function switchAdminTab(tabId, btn) {
  const tabs = document.querySelectorAll('.admin-tab-content');
  tabs.forEach(t => t.classList.remove('is-active'));

  const btns = document.querySelectorAll('.admin-tab-btn');
  btns.forEach(b => b.classList.remove('is-active'));

  const target = document.getElementById(tabId);
  if (target) target.classList.add('is-active');
  if (btn) btn.classList.add('is-active');
}

/* Gestão de Patrocinadores no ADM */
function renderAdminSponsors() {
  const container = document.getElementById('adminSponsorsList');
  if (!container) return;

  const sponsors = getSponsorsData();
  if (sponsors.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhum patrocinador cadastrado ainda.</p>`;
    return;
  }

  container.innerHTML = sponsors.map((sp, idx) => `
    <div class="admin-item-row">
      <div class="admin-item-info">
        <h4>${sanitizeHTML(sp.name)} <span class="sponsor-badge" style="font-size: 0.65rem; padding: 2px 8px; margin-left: 8px;">${sanitizeHTML(sp.badge)}</span></h4>
        <p><strong>Ramo:</strong> ${sanitizeHTML(sp.category)} • <strong>Tel:</strong> ${sanitizeHTML(sp.phone)} ${sp.instagram ? `• <strong>Instagram:</strong> ${sanitizeHTML(sp.instagram)}` : ''}</p>
        <p style="margin-top: 4px; font-size: 0.8rem; color: var(--text-secondary);">${sanitizeHTML(sp.description)}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-sm-action btn-edit" onclick="editSponsor(${idx})">✏️ Editar</button>
        <button class="btn-sm-action btn-delete" onclick="deleteSponsor(${idx})">🗑️ Excluir</button>
      </div>
    </div>
  `).join('');
}

function toggleAddSponsorForm(show) {
  const formBox = document.getElementById('sponsorFormBox');
  if (!formBox) return;

  if (show === undefined) {
    formBox.style.display = (formBox.style.display === 'none' || formBox.style.display === '') ? 'block' : 'none';
  } else {
    formBox.style.display = show ? 'block' : 'none';
  }

  if (formBox.style.display === 'block') {
    document.getElementById('sponsorEditIndex').value = '-1';
    document.getElementById('sponsorFormTitle').textContent = 'Cadastrar Novo Patrocinador';
    document.getElementById('adminSponsorForm').reset();
  }
}

function editSponsor(index) {
  const sponsors = getSponsorsData();
  const sp = sponsors[index];
  if (!sp) return;

  toggleAddSponsorForm(true);
  document.getElementById('sponsorEditIndex').value = index;
  document.getElementById('sponsorFormTitle').textContent = `Editar: ${sp.name}`;

  document.getElementById('spFormName').value = sp.name;
  document.getElementById('spFormCategory').value = sp.category;
  document.getElementById('spFormPhone').value = sp.phone;
  document.getElementById('spFormInsta').value = sp.instagram || '';
  document.getElementById('spFormBadge').value = sp.badge || 'Patrocinador Prata';
  document.getElementById('spFormDesc').value = sp.description;
}

function deleteSponsor(index) {
  const sponsors = getSponsorsData();
  const sp = sponsors[index];
  if (!sp) return;

  if (confirm(`Tem certeza que deseja remover o patrocinador "${sp.name}" da Rádio Vox Arieh?`)) {
    sponsors.splice(index, 1);
    saveSponsorsData(sponsors);
    renderAdminSponsors();
    renderSponsors();
    showToast("Patrocinador removido com sucesso!");
  }
}

function handleSaveSponsor(event) {
  event.preventDefault();
  const index = parseInt(document.getElementById('sponsorEditIndex').value, 10);
  const name = document.getElementById('spFormName').value.trim();
  const category = document.getElementById('spFormCategory').value.trim();
  const phone = document.getElementById('spFormPhone').value.trim();
  const insta = document.getElementById('spFormInsta').value.trim();
  const badge = document.getElementById('spFormBadge').value;
  const desc = document.getElementById('spFormDesc').value.trim();

  // Limpeza de números de telefone para URL WhatsApp
  const cleanPhone = phone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Olá ${name}! Vi seu anúncio na Rádio Vox Arieh.`)}`;
  const instaUrl = insta ? `https://instagram.com/${insta.replace('@', '')}` : '';

  const newSponsor = {
    name,
    category,
    phone,
    whatsappUrl,
    instagram: insta,
    instagramUrl: instaUrl,
    badge,
    description: desc
  };

  const sponsors = getSponsorsData();
  if (index >= 0) {
    sponsors[index] = newSponsor;
    showToast(`Patrocinador "${name}" atualizado com sucesso!`);
  } else {
    sponsors.unshift(newSponsor);
    showToast(`Patrocinador "${name}" cadastrado com sucesso!`);
  }

  saveSponsorsData(sponsors);
  toggleAddSponsorForm(false);
  renderAdminSponsors();
  renderSponsors();
}

/* Gestão do Devocional no ADM */
function populateAdminDevotional() {
  const d = getDevotionalData();
  const t = document.getElementById('devFormTitle');
  const v = document.getElementById('devFormVerse');
  const s = document.getElementById('devFormSpeaker');
  const m = document.getElementById('devFormMessage');
  const vid = document.getElementById('devFormVideo');
  const a = document.getElementById('devFormAudio');

  if (t) t.value = d.title || '';
  if (v) v.value = d.verse || '';
  if (s) s.value = d.speaker || '';
  if (m) m.value = d.message || '';
  if (vid) vid.value = d.videoUrl || '';
  const spot = document.getElementById('devFormSpotify');
  if (spot) spot.value = d.spotifyUrl || '';
  if (a) a.value = (d.audioSample && !d.audioSample.startsWith('data:')) ? d.audioSample : '';
}

async function handleSaveDevotional(event) {
  event.preventDefault();
  const current = getDevotionalData();
  const fileInput = document.getElementById('devFormAudioFile');
  const urlInput = document.getElementById('devFormAudio');
  const vidInput = document.getElementById('devFormVideo');
  const spotInput = document.getElementById('devFormSpotify');
  
  let audioSample = current.audioSample || '';
  if (urlInput && urlInput.value.trim()) {
    audioSample = urlInput.value.trim();
  }
  const videoUrl = vidInput ? vidInput.value.trim() : (current.videoUrl || '');
  const spotifyUrl = spotInput ? spotInput.value.trim() : (current.spotifyUrl || '');

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];

    // Detecção se o arquivo selecionado for vídeo
    if (file.type && file.type.startsWith('video/')) {
      alert("💡 Você selecionou um arquivo de VÍDEO (" + (file.size / (1024 * 1024)).toFixed(1) + "MB).\n\n• Para exibir o VÍDEO no site: Suba no YouTube e cole o link no campo 'Vídeo da Palavra' acima!\n• Para tocar o ÁUDIO: Selecione um arquivo de gravação de voz (áudio MP3 ou M4A) ou informe o link.");
      return;
    }

    // Limite preventivo para gravação direta no navegador
    if (file.size > 5 * 1024 * 1024) {
      alert("⚠️ Arquivo de áudio grande (" + (file.size / (1024 * 1024)).toFixed(1) + "MB).\nO navegador do celular possui um limite de memória para gravação local direta de até 5MB.\n\nPara áudios maiores ou para que todos os ouvintes da rádio ouçam em qualquer celular, você pode informar o link direto do áudio no campo 'Link de áudio' acima!");
      return;
    }
    try {
      audioSample = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.warn("Falha ao ler arquivo de áudio:", e);
    }
  }

  const updated = {
    ...current,
    title: document.getElementById('devFormTitle').value.trim(),
    verse: document.getElementById('devFormVerse').value.trim(),
    speaker: document.getElementById('devFormSpeaker').value.trim(),
    message: document.getElementById('devFormMessage').value.trim(),
    videoUrl: videoUrl,
    spotifyUrl: spotifyUrl,
    audioSample: audioSample
  };

  saveDevotionalData(updated);
  renderDevotional();
  renderPodcast();
  alert("✅ Momento Devocional e Podcast atualizados e publicados com sucesso no site!");
  closeModals();
}

/* Gestão de Grade no ADM */
function renderAdminSchedule() {
  const container = document.getElementById('adminScheduleList');
  if (!container) return;

  const schedule = getScheduleData();

  container.innerHTML = schedule.map((prog, idx) => `
    <div class="admin-item-row">
      <div class="admin-item-info">
        <h4>${sanitizeHTML(prog.start)} às ${sanitizeHTML(prog.end)} — ${sanitizeHTML(prog.title)}</h4>
        <p><strong>Apresentador(a):</strong> ${sanitizeHTML(prog.host)}</p>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">${sanitizeHTML(prog.desc)}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-sm-action btn-delete" onclick="deleteProgram(${idx})">🗑️ Remover</button>
      </div>
    </div>
  `).join('');
}

function toggleAddProgForm(show) {
  const formBox = document.getElementById('progFormBox');
  if (!formBox) return;
  if (show === undefined) {
    formBox.style.display = (formBox.style.display === 'none' || formBox.style.display === '') ? 'block' : 'none';
  } else {
    formBox.style.display = show ? 'block' : 'none';
  }
}

function handleSaveProgram(event) {
  event.preventDefault();
  const start = document.getElementById('progStart').value.trim();
  const end = document.getElementById('progEnd').value.trim();
  const title = document.getElementById('progTitle').value.trim();
  const host = document.getElementById('progHost').value.trim();
  const desc = document.getElementById('progDesc').value.trim();

  const newProg = { start, end, title, host, desc };
  const schedule = getScheduleData();
  schedule.push(newProg);

  // Ordenar por horário
  schedule.sort((a, b) => a.start.localeCompare(b.start));

  saveScheduleData(schedule);
  toggleAddProgForm(false);
  renderAdminSchedule();
  renderSchedule();
  updateLiveShow();
  showToast("Programa adicionado à grade com sucesso!");
}

function deleteProgram(index) {
  const schedule = getScheduleData();
  const prog = schedule[index];
  if (!prog) return;

  if (confirm(`Remover o programa "${prog.title}" da grade?`)) {
    schedule.splice(index, 1);
    saveScheduleData(schedule);
    renderAdminSchedule();
    renderSchedule();
    updateLiveShow();
    showToast("Programa removido da grade!");
  }
}

/* Gestão de Transmissão e Senha com Hash SHA-256 */
function populateAdminSettings() {
  const streamInput = document.getElementById('settStreamUrl');
  const waInput = document.getElementById('settWhatsapp');
  const instaInput = document.getElementById('settInstagram');

  if (streamInput) streamInput.value = getStreamUrl();
  if (waInput) waInput.value = getRadioWhatsapp();
  if (instaInput) instaInput.value = getRadioInstagram();
}

async function handleSaveSettings(event) {
  event.preventDefault();
  let streamUrl = document.getElementById('settStreamUrl').value.trim();
  const whatsapp = document.getElementById('settWhatsapp').value.trim();
  const instagram = document.getElementById('settInstagram').value.trim();
  const newPass = document.getElementById('settAdminPass').value.trim();

  if (streamUrl) {
    if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
      streamUrl = 'https://' + streamUrl;
    }
    localStorage.setItem('vox_arieh_streamUrl', streamUrl);
    if (radioAudio) {
      radioAudio.src = streamUrl;
      if (isPlaying) {
        radioAudio.play().catch(e => console.error(e));
      }
    }
  }
  if (whatsapp) localStorage.setItem('vox_arieh_whatsapp', whatsapp);
  if (instagram) localStorage.setItem('vox_arieh_instagram', instagram);

  if (newPass) {
    if (newPass.length < 6) {
      alert("Por motivos de segurança cibernética, a nova senha deve conter pelo menos 6 caracteres.");
      return;
    }
    const newHash = await sha256(newPass);
    localStorage.setItem('vox_arieh_admin_hash', newHash);
    document.getElementById('settAdminPass').value = '';
    alert("✅ Configurações salvas e NOVA SENHA criptografada com sucesso!\n\nStreaming conectado:\n" + streamUrl);
  } else {
    alert("✅ Configurações salvas com sucesso!\n\nStreaming conectado:\n" + streamUrl);
  }

  // Recarrega visualizadores e fecha o modal
  renderPlans();
  closeModals();
}

/* Exportar Backup de Configuração Seguro */
function exportAdminConfig() {
  const backup = {
    streamUrl: getStreamUrl(),
    dailyDevotional: getDevotionalData(),
    schedule: getScheduleData(),
    sponsors: getSponsorsData(),
    contact: {
      whatsapp: getRadioWhatsapp(),
      instagram: getRadioInstagram()
    },
    exportDate: new Date().toISOString()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `vox_arieh_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();

  showToast("Arquivo de backup baixado com sucesso!");
}

/* Toast Notification Flutuante */
function showToast(message) {
  const toast = document.getElementById('toastBox');
  const msgElem = document.getElementById('toastMsg');
  if (!toast || !msgElem) return;

  msgElem.textContent = message;
  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}
