/**
 * VOX ARIEH - LÓGICA DO WEB PLAYER E PORTAL INTERATIVO
 * Hardening de Cibersegurança: Sanitização Anti-XSS, Hash Criptográfico SHA-256 e Conformidade LGPD
 */

let SERVER_DATA = null;

async function loadServerData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        SERVER_DATA = data;
        return true;
      }
    }
  } catch (e) {
    console.warn("[VOX ARIEH] Usando cache local (API offline ou estático):", e);
  }
  return false;
}

async function syncToServer(type, data) {
  try {
    const hash = getAdminHash();
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Hash': hash
      },
      body: JSON.stringify({ type, data, hash })
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        if (!SERVER_DATA) SERVER_DATA = {};
        if (type === 'wordStudies') SERVER_DATA.wordStudies = data;
        if (type === 'devotional') SERVER_DATA.dailyDevotional = data;
        if (type === 'podcastEpisodes') SERVER_DATA.podcastEpisodes = data;
        if (type === 'sponsors') SERVER_DATA.sponsors = data;
        if (type === 'schedule') SERVER_DATA.schedule = data;
        if (type === 'prayers') SERVER_DATA.prayers = data;
        if (type === 'settings') {
          if (data.streamUrl) SERVER_DATA.streamUrl = data.streamUrl;
          if (data.contact) SERVER_DATA.contact = { ...SERVER_DATA.contact, ...data.contact };
        }
        return true;
      }
    }
  } catch (e) {
    console.warn("[VOX ARIEH] Aviso: salvo no navegador local. Sincronização direta com /api/save pendente:", e);
  }
  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Purga e bloqueio preventivo de qualquer resquício de vídeo no cache
  try {
    const savedDev = localStorage.getItem('vox_arieh_devotional');
    if (savedDev) {
      const parsed = JSON.parse(savedDev);
      if (parsed.videoUrl) {
        delete parsed.videoUrl;
        localStorage.setItem('vox_arieh_devotional', JSON.stringify(parsed));
      }
    }
  } catch(e) {}

  // Carrega em tempo real os dados gravados no servidor para todos os ouvintes
  await loadServerData();

  initPlayer();
  initMiniPlayer();
  initWordStudyPlayer();
  initPWA();
  renderWordStudies();
  renderDevotional();
  renderSchedule();
  renderSponsors();
  renderPlans();
  renderPodcast();
  renderPodcastGallery();
  updateLiveShow();
  updatePrayerCountBadges();
  
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

const escapeHTML = sanitizeHTML;

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
  if (SERVER_DATA && Array.isArray(SERVER_DATA.sponsors) && SERVER_DATA.sponsors.length > 0) {
    return SERVER_DATA.sponsors;
  }
  try {
    const saved = localStorage.getItem('vox_arieh_sponsors');
    return saved ? JSON.parse(saved) : RADIO_CONFIG.sponsors;
  } catch (e) {
    console.error("Erro ao carregar patrocinadores:", e);
    return RADIO_CONFIG.sponsors;
  }
}

function saveSponsorsData(data) {
  try {
    localStorage.setItem('vox_arieh_sponsors', JSON.stringify(data));
  } catch (e) {}
  syncToServer('sponsors', data).then(saved => {
    if (saved) showToast("✅ Patrocinadores salvos no servidor!");
  });
}

function getWordStudiesData() {
  let list = [];
  if (SERVER_DATA && SERVER_DATA.wordStudies && Array.isArray(SERVER_DATA.wordStudies)) {
    list = SERVER_DATA.wordStudies;
  } else {
    try {
      const saved = localStorage.getItem('vox_arieh_word_studies');
      if (saved) list = JSON.parse(saved);
      else list = (RADIO_CONFIG && RADIO_CONFIG.wordStudies) ? RADIO_CONFIG.wordStudies : [];
    } catch (e) {
      console.error("Erro ao carregar estudos bíblicos:", e);
      list = (RADIO_CONFIG && RADIO_CONFIG.wordStudies) ? RADIO_CONFIG.wordStudies : [];
    }
  }

  // Garante que todas as ministrações tenham uma fonte de áudio válida tocável
  return list.map(st => {
    let audioFile = st.audioFile || '';
    if (!audioFile && (!st.audioUrl || st.audioUrl.includes('spotify'))) {
      audioFile = 'assets/estudando_palavra_intro.mp3';
    }
    return { ...st, audioFile };
  });
}

function saveWordStudiesData(data) {
  try {
    localStorage.setItem('vox_arieh_word_studies', JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar estudos no localStorage:", e);
  }
  if (SERVER_DATA) {
    SERVER_DATA.wordStudies = data;
  }
  syncToServer('wordStudies', data).then(saved => {
    if (saved) {
      showToast("✅ Acervo Estudando a Palavra salvo no servidor!");
    }
  });
}

function getDevotionalData() {
  if (SERVER_DATA && SERVER_DATA.dailyDevotional) {
    return SERVER_DATA.dailyDevotional;
  }
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
  syncToServer('devotional', data).then(saved => {
    if (saved) {
      showToast("✅ Palavra do Dia gravada no servidor!");
    }
  });
}

function getPodcastData() {
  if (SERVER_DATA && SERVER_DATA.podcastShow) {
    return SERVER_DATA.podcastShow;
  }
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
  syncToServer('podcastShow', data);
}

function getDeletedEpisodes() {
  try {
    const list = JSON.parse(localStorage.getItem('vox_arieh_deleted_episodes') || '[]');
    return new Set(Array.isArray(list) ? list : []);
  } catch (e) {
    return new Set();
  }
}

function trackDeletedEpisode(spotifyUrl) {
  try {
    if (!spotifyUrl) return;
    const norm = spotifyUrl.split('?')[0].trim().toLowerCase();
    const list = JSON.parse(localStorage.getItem('vox_arieh_deleted_episodes') || '[]');
    if (!list.includes(norm)) {
      list.push(norm);
      localStorage.setItem('vox_arieh_deleted_episodes', JSON.stringify(list));
    }
  } catch (e) {}
}

function getPodcastEpisodes() {
  if (SERVER_DATA && Array.isArray(SERVER_DATA.podcastEpisodes) && SERVER_DATA.podcastEpisodes.length > 0) {
    return SERVER_DATA.podcastEpisodes;
  }
  const defaultEpisodes = (RADIO_CONFIG.podcast && Array.isArray(RADIO_CONFIG.podcast.episodes))
    ? RADIO_CONFIG.podcast.episodes
    : [];

  try {
    const saved = localStorage.getItem('vox_arieh_episodes');
    if (!saved) {
      return defaultEpisodes;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultEpisodes;
    }

    // Fusão inteligente (Smart Merge) para proteger registros do celular:
    const normalize = url => (url || '').split('?')[0].trim().toLowerCase();
    const existingUrls = new Set(parsed.map(ep => normalize(ep.spotifyUrl)).filter(Boolean));
    const deletedUrls = getDeletedEpisodes();

    let updated = false;
    const merged = [...parsed];

    for (const defEp of defaultEpisodes) {
      const norm = normalize(defEp.spotifyUrl);
      if (norm && !existingUrls.has(norm) && !deletedUrls.has(norm)) {
        merged.push(defEp);
        existingUrls.add(norm);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem('vox_arieh_episodes', JSON.stringify(merged));
    }
    return merged;
  } catch (e) {
    console.error("Erro ao carregar episódios:", e);
    return defaultEpisodes;
  }
}

function savePodcastEpisodes(episodes) {
  try {
    localStorage.setItem('vox_arieh_episodes', JSON.stringify(episodes));
  } catch (e) {
    console.error("Erro ao salvar episódios no localStorage:", e);
    alert("⚠️ Erro ao salvar lista de episódios no navegador!");
  }
  syncToServer('podcastEpisodes', episodes).then(saved => {
    if (saved) showToast("✅ Galeria de podcasts salva no servidor!");
  });
}

function getScheduleData() {
  // 1. Prioridade para alteração explícita do administrador no navegador
  try {
    const saved = localStorage.getItem('vox_arieh_schedule');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erro ao ler grade do localStorage:", e);
  }

  // 2. Se o servidor forneceu a grade (mesmo que vazia se o ADM limpou)
  if (SERVER_DATA && Array.isArray(SERVER_DATA.schedule)) {
    return SERVER_DATA.schedule;
  }

  // 3. Fallback para configuração padrão inicial
  return (RADIO_CONFIG && Array.isArray(RADIO_CONFIG.schedule)) ? RADIO_CONFIG.schedule : [];
}

function saveScheduleData(data) {
  try {
    localStorage.setItem('vox_arieh_schedule', JSON.stringify(data));
  } catch (e) {}
  if (SERVER_DATA) {
    SERVER_DATA.schedule = data;
  }
  syncToServer('schedule', data).then(saved => {
    if (saved) showToast("✅ Grade salva no servidor!");
  });
}

function getPrayersData() {
  if (SERVER_DATA && Array.isArray(SERVER_DATA.prayers)) {
    return SERVER_DATA.prayers;
  }
  try {
    const saved = localStorage.getItem('vox_arieh_prayers');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error("Erro ao carregar pedidos de oração:", e);
    return [];
  }
}

function savePrayersData(data) {
  try {
    localStorage.setItem('vox_arieh_prayers', JSON.stringify(data));
  } catch (e) {}
  if (SERVER_DATA) {
    SERVER_DATA.prayers = data;
  }
  syncToServer('prayers', data).then(saved => {
    if (saved) showToast("✅ Pedidos de oração atualizados no servidor!");
  });
}

function getStreamUrl() {
  if (SERVER_DATA && SERVER_DATA.streamUrl) {
    return sanitizeUrl(SERVER_DATA.streamUrl);
  }
  return sanitizeUrl(localStorage.getItem('vox_arieh_streamUrl') || RADIO_CONFIG.streamUrl);
}

function getRadioWhatsapp() {
  if (SERVER_DATA && SERVER_DATA.contact && SERVER_DATA.contact.whatsapp) {
    return SERVER_DATA.contact.whatsapp.replace(/\D/g, '');
  }
  return (localStorage.getItem('vox_arieh_whatsapp') || RADIO_CONFIG.contact.whatsapp).replace(/\D/g, '');
}

function getRadioInstagram() {
  if (SERVER_DATA && SERVER_DATA.contact && SERVER_DATA.contact.instagram) {
    return sanitizeHTML(SERVER_DATA.contact.instagram);
  }
  return sanitizeHTML(localStorage.getItem('vox_arieh_instagram') || RADIO_CONFIG.contact.instagram);
}

/* ========================================================
   WEB PLAYER AUDIO ENGINE
   ======================================================== */
let isPlaying = false;
let radioAudio = null;
let devotionalAudio = null;
let wordStudyAudio = null;
let currentStudyIndex = 0;
let currentStudySpeed = 1.0;

function initPlayer() {
  radioAudio = document.getElementById('radioAudio');
  devotionalAudio = document.getElementById('devotionalAudio');
  wordStudyAudio = document.getElementById('wordStudyAudio');
  
  const volumeControl = document.getElementById('volumeControl');
  const savedVolume = localStorage.getItem('vox_arieh_vol') || '0.8';
  
  if (volumeControl && radioAudio) {
    volumeControl.value = savedVolume;
    radioAudio.volume = parseFloat(savedVolume);
    if (devotionalAudio) devotionalAudio.volume = parseFloat(savedVolume);
    if (wordStudyAudio) wordStudyAudio.volume = parseFloat(savedVolume);

    volumeControl.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      radioAudio.volume = vol;
      if (devotionalAudio) devotionalAudio.volume = vol;
      if (wordStudyAudio) wordStudyAudio.volume = vol;
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

function initWordStudyPlayer() {
  wordStudyAudio = document.getElementById('wordStudyAudio');
  if (!wordStudyAudio) return;

  wordStudyAudio.addEventListener('timeupdate', updateStudyProgress);
  wordStudyAudio.addEventListener('ended', onStudyAudioEnded);
  wordStudyAudio.addEventListener('play', () => updateStudyPlayUI(true));
  wordStudyAudio.addEventListener('pause', () => updateStudyPlayUI(false));
}

function updateNavPlayButton(playing) {
  const navText = document.getElementById('navPlayText');
  const navSvg = document.getElementById('navPlaySvg');
  if (navText) navText.textContent = playing ? 'Pausar' : 'Ouvir Rádio';
  if (navSvg) {
    navSvg.innerHTML = playing ? 
      '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : 
      '<path d="M8 5v14l11-7z"/>';
  }
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
    updateNavPlayButton(false);
    updateMediaSession();
    updateMiniPlayerUI();
  } else {
    // Se estiver ouvindo um estudo bíblico gravado, pausa o estudo para tocar a rádio ao vivo
    if (wordStudyAudio && !wordStudyAudio.paused) {
      pauseStudyAudio();
    }
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
        updateNavPlayButton(true);
        updateMediaSession();
        updateMiniPlayerUI();
      }).catch(error => {
        console.warn("Autoplay bloqueado pelo navegador ou stream indisponível. Alternando para áudio de demonstração...", error);
        radioAudio.src = RADIO_CONFIG.fallbackAudio;
        radioAudio.play().then(() => {
          isPlaying = true;
          if (playIcon) playIcon.style.display = 'none';
          if (pauseIcon) pauseIcon.style.display = 'block';
          if (fixedPlayer) fixedPlayer.classList.add('is-playing');
          if (heroBtnText) heroBtnText.textContent = 'Pausar Transmissão';
          updateNavPlayButton(true);
          updateMediaSession();
          updateMiniPlayerUI();
        }).catch(err => console.error("Falha ao tocar áudio:", err));
      });
    }
  }
}

function togglePlay() {
  togglePlayStream();
}

/* ========================================================
   ESTUDANDO A PALAVRA (MENSAGENS & ESTUDOS EM ÁUDIO)
   ======================================================== */
function renderWordStudies() {
  const studies = getWordStudiesData();
  const listContainer = document.getElementById('wordStudyList');

  if (studies.length > 0) {
    if (currentStudyIndex >= studies.length) currentStudyIndex = 0;
    loadStudyIntoPlayer(studies[currentStudyIndex], false);
  }

  if (!listContainer) return;

  if (studies.length === 0) {
    listContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">
        <p>Nenhuma ministração cadastrada no momento.</p>
      </div>`;
    return;
  }

  listContainer.innerHTML = studies.map((st, idx) => {
    const isActive = idx === currentStudyIndex;
    return `
      <div class="study-card-item ${isActive ? 'is-active' : ''}" onclick="selectStudyByIndex(${idx})">
        <div class="study-card-thumb">
          <img src="assets/biblia_aberta.jpg?v=9.0" alt="Bíblia Sagrada" class="study-thumb-img">
          <span class="study-thumb-badge">${idx + 1}</span>
        </div>
        <div class="study-card-body">
          <div class="study-card-topline">
            <span class="study-verse-mini">${sanitizeHTML(st.verse || 'Escrituras Sagradas')}</span>
            <span class="study-duration-mini">⏱️ ${sanitizeHTML(st.duration || '30 min')}</span>
          </div>
          <h4 class="study-card-title">${sanitizeHTML(st.title)}</h4>
          <div class="study-card-speaker">
            <span>🎙️ ${sanitizeHTML(st.speaker || 'Evangelista Alexandra Maia')}</span>
            ${st.date ? `<span> • 🗓️ ${sanitizeHTML(st.date)}</span>` : ''}
          </div>
        </div>
        <div class="study-card-action">
          <button class="btn-item-play ${isActive ? 'btn-item-active' : ''}" title="Ouvir esta ministração" onclick="event.stopPropagation(); selectStudyByIndex(${idx}, true);">
            ${isActive ? `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ` : `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            `}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function loadStudyIntoPlayer(study, autoPlay = false) {
  if (!study) return;

  const verseElem = document.getElementById('currentStudyVerse');
  const titleElem = document.getElementById('currentStudyTitle');
  const speakerElem = document.getElementById('currentStudySpeaker');
  const dateElem = document.getElementById('currentStudyDate');
  const durBadge = document.getElementById('currentStudyDurationBadge');
  const descElem = document.getElementById('currentStudyDesc');
  const durationElem = document.getElementById('studyTotalDuration');
  const spotifyBtn = document.getElementById('btnStudySpotify');

  if (verseElem) {
    verseElem.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink: 0;">
        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
      </svg>
      <span>${sanitizeHTML(study.verse || 'Bíblia Sagrada')}</span>
    `;
  }
  if (titleElem) titleElem.textContent = study.title || 'Ministração da Palavra';
  if (speakerElem) speakerElem.textContent = study.speaker || 'Evangelista Alexandra Maia';
  if (dateElem) dateElem.textContent = study.date ? `🗓️ ${study.date}` : '';
  if (durBadge) durBadge.textContent = study.duration ? `⏱️ ${study.duration}` : '⏱️ 30 min';
  if (descElem) descElem.textContent = study.description || '';
  if (durationElem) durationElem.textContent = study.duration || '00:16';

  if (spotifyBtn) {
    if (study.audioUrl && study.audioUrl.includes('spotify')) {
      spotifyBtn.href = sanitizeUrl(study.audioUrl);
      spotifyBtn.style.display = 'inline-flex';
    } else {
      spotifyBtn.style.display = 'none';
    }
  }

  if (!wordStudyAudio) {
    wordStudyAudio = document.getElementById('wordStudyAudio');
  }

  if (wordStudyAudio) {
    let audioSrc = '';
    if (study.audioFile && !study.audioFile.includes('spotify')) {
      audioSrc = study.audioFile;
    } else if (study.audioUrl && !study.audioUrl.includes('spotify')) {
      audioSrc = study.audioUrl;
    } else {
      audioSrc = 'assets/estudando_palavra_intro.mp3';
    }

    if (!wordStudyAudio.src.endsWith(audioSrc)) {
      wordStudyAudio.src = audioSrc;
      wordStudyAudio.load();
    }
    if (autoPlay) {
      playStudyAudio();
    }
  }
}

function selectStudyByIndex(index, autoPlay = true) {
  const studies = getWordStudiesData();
  if (index < 0 || index >= studies.length) return;
  currentStudyIndex = index;
  loadStudyIntoPlayer(studies[currentStudyIndex], autoPlay);

  const listItems = document.querySelectorAll('.study-card-item');
  listItems.forEach((item, idx) => {
    if (idx === index) item.classList.add('is-active');
    else item.classList.remove('is-active');
  });
}

function toggleStudyAudio() {
  if (!wordStudyAudio) {
    wordStudyAudio = document.getElementById('wordStudyAudio');
  }
  if (!wordStudyAudio) return;

  if (wordStudyAudio.paused) {
    playStudyAudio();
  } else {
    pauseStudyAudio();
  }
}

function playStudyAudio() {
  if (!wordStudyAudio) {
    wordStudyAudio = document.getElementById('wordStudyAudio');
  }
  if (!wordStudyAudio) return;

  // Pausa a rádio ao vivo para o ouvinte ouvir a Palavra!
  if (isPlaying) {
    togglePlayStream();
  }

  const studies = getWordStudiesData();
  const current = studies[currentStudyIndex];

  let audioSrc = '';
  if (current && current.audioFile && !current.audioFile.includes('spotify')) {
    audioSrc = current.audioFile;
  } else if (current && current.audioUrl && !current.audioUrl.includes('spotify')) {
    audioSrc = current.audioUrl;
  } else {
    audioSrc = 'assets/estudando_palavra_intro.mp3';
  }

  if (!wordStudyAudio.src || wordStudyAudio.src === '' || wordStudyAudio.src === window.location.href || !wordStudyAudio.src.endsWith(audioSrc)) {
    wordStudyAudio.src = audioSrc;
    wordStudyAudio.load();
  }

  wordStudyAudio.playbackRate = currentStudySpeed;

  const playPromise = wordStudyAudio.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      updateStudyPlayUI(true);
      showToast(`📖 Tocando: ${current ? current.title : 'Estudando a Palavra'}`);
    }).catch(err => {
      console.warn("Reproduzindo com vinheta sagrada oficial:", err);
      wordStudyAudio.src = 'assets/estudando_palavra_intro.mp3';
      wordStudyAudio.load();
      wordStudyAudio.play().then(() => {
        updateStudyPlayUI(true);
        showToast(`📖 Tocando: ${current ? current.title : 'Estudando a Palavra'}`);
      }).catch(e => {
        console.error("Erro ao tocar áudio da palavra:", e);
      });
    });
  }
}

function pauseStudyAudio() {
  if (!wordStudyAudio) return;
  wordStudyAudio.pause();
  updateStudyPlayUI(false);
}

function updateStudyPlayUI(playing) {
  const iconPlay = document.getElementById('iconStudyPlay');
  const iconPause = document.getElementById('iconStudyPause');
  const liveBadge = document.getElementById('wordStudyLiveBadge');

  if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
  if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
  if (liveBadge) liveBadge.style.display = playing ? 'inline-flex' : 'none';

  // Atualiza botão do item ativo na lista
  const activeBtn = document.querySelector('.study-card-item.is-active .btn-item-play');
  if (activeBtn) {
    activeBtn.innerHTML = playing ? `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    ` : `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
  }
}

function updateStudyProgress() {
  if (!wordStudyAudio) return;
  const curTime = wordStudyAudio.currentTime;
  const dur = wordStudyAudio.duration;

  const curTimeElem = document.getElementById('studyCurrentTime');
  const durElem = document.getElementById('studyTotalDuration');
  const bar = document.getElementById('studyProgressBar');

  if (curTimeElem) curTimeElem.textContent = formatAudioTime(curTime);
  if (dur && !isNaN(dur) && durElem) durElem.textContent = formatAudioTime(dur);

  if (bar && dur && !isNaN(dur)) {
    bar.value = (curTime / dur) * 100;
  }
}

function seekStudyAudio(val) {
  if (!wordStudyAudio || !wordStudyAudio.duration) return;
  const seekTo = (val / 100) * wordStudyAudio.duration;
  wordStudyAudio.currentTime = seekTo;
}

function cycleStudySpeed() {
  const speeds = [1.0, 1.25, 1.5, 2.0];
  let idx = speeds.indexOf(currentStudySpeed);
  idx = (idx + 1) % speeds.length;
  currentStudySpeed = speeds[idx];
  if (wordStudyAudio) {
    wordStudyAudio.playbackRate = currentStudySpeed;
  }
  const btn = document.getElementById('btnStudySpeed');
  if (btn) btn.innerHTML = `<span style="font-size: 0.72rem; opacity: 0.8;">VEL:</span> <strong>${currentStudySpeed}x</strong>`;
}

function onStudyAudioEnded() {
  updateStudyPlayUI(false);
  const studies = getWordStudiesData();
  if (currentStudyIndex < studies.length - 1) {
    selectStudyByIndex(currentStudyIndex + 1, true);
  }
}

function formatAudioTime(secs) {
  if (isNaN(secs) || secs < 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function shareCurrentStudy() {
  const studies = getWordStudiesData();
  const current = studies[currentStudyIndex];
  if (!current) return;
  const text = `🦁 *Rádio Vox Arieh — Estudando a Palavra*\n\nOuça este estudo bíblico abençoado: *"${current.title}"*\n🎙️ Ministrado por: ${current.speaker}\n📖 ${current.verse}\n\nOuça agora em: ${window.location.origin}/#palavra`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function filterWordStudies(query) {
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll('.study-card-item');
  const studies = getWordStudiesData();

  items.forEach((item, idx) => {
    const st = studies[idx];
    if (!st) return;
    const match = st.title.toLowerCase().includes(q) || 
                  (st.speaker && st.speaker.toLowerCase().includes(q)) ||
                  (st.verse && st.verse.toLowerCase().includes(q)) ||
                  (st.description && st.description.toLowerCase().includes(q));
    item.style.display = match ? 'flex' : 'none';
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

  const miniTitle = document.getElementById('miniPlayerTitle');
  const miniProg = document.getElementById('miniPlayerProgram');
  if (miniTitle) miniTitle.textContent = sanitizeHTML(activeProg.title);
  if (miniProg) miniProg.textContent = isPlaying ? `No Ar • ${activeProg.host}` : `Pausado • ${activeProg.title}`;

  const cards = document.querySelectorAll('.schedule-card');
  cards.forEach(card => {
    const timeText = card.getAttribute('data-time-range');
    if (timeText === `${activeProg.start} - ${activeProg.end}`) {
      card.classList.add('is-now');
    } else {
      card.classList.remove('is-now');
    }
  });

  if (isPlaying) {
    updateMediaSession();
  }
}

/* Integração com a Media Session API (Notificação na Tela de Bloqueio & Bluetooth) */
function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;

  const activeProg = getActiveProgram();
  const progTitle = activeProg ? activeProg.title : 'Rádio Vox Arieh 24h';
  const progHost = activeProg ? activeProg.host : 'Assembleia de Deus Madureira';

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: progTitle,
      artist: `Rádio Vox Arieh • ${progHost}`,
      album: 'O rugido da libertação em cada frequência',
      artwork: [
        { src: 'assets/lion_logo.jpg?v=5.0', sizes: '192x192', type: 'image/jpeg' },
        { src: 'assets/lion_logo.jpg?v=5.0', sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlaying) togglePlayStream();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying) togglePlayStream();
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      if (isPlaying) togglePlayStream();
    });
  } catch (e) {
    console.warn("[MediaSession] Não suportado pelo navegador:", e);
  }
}

/* Sincronização e Controle do Mini-Player Flutuante (Rodapé) */
let miniPlayerDismissed = false;

function updateMiniPlayerUI() {
  const btn = document.getElementById('btnMiniPlay');
  const progElem = document.getElementById('miniPlayerProgram');
  const activeProg = getActiveProgram();
  if (progElem) {
    progElem.textContent = isPlaying ? `No Ar • ${activeProg.host}` : `Pausado • ${activeProg.title}`;
  }
  if (btn) {
    btn.innerHTML = isPlaying 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    btn.title = isPlaying ? 'Pausar Rádio' : 'Tocar Rádio';
  }
}

function initMiniPlayer() {
  window.addEventListener('scroll', () => {
    const mini = document.getElementById('stickyMiniPlayer');
    if (!mini || miniPlayerDismissed) return;
    if (window.scrollY > 380) {
      mini.classList.add('is-active');
    } else {
      mini.classList.remove('is-active');
    }
  });
}

function dismissMiniPlayer() {
  const mini = document.getElementById('stickyMiniPlayer');
  if (mini) mini.classList.remove('is-active');
  miniPlayerDismissed = true;
}

/* ========================================================
   PROGRESSIVE WEB APP (PWA) - INSTALAÇÃO & SERVICE WORKER
   ======================================================== */
let deferredPrompt = null;

function initPWA() {
  // 1. Registro do Service Worker para cache offline e funcionamento como App
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=9.0')
        .then(reg => {
          console.log('[PWA] Service Worker registrado com escopo:', reg.scope);
          // Força verificação imediata de atualizações no servidor
          reg.update();
        })
        .catch(err => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Novo Service Worker ativo. Atualizando página...');
        window.location.reload();
      }
    });
  }

  // 2. Captura do evento de instalação no Android/Chrome/Desktop
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwaBanner');
    try {
      const dismissed = sessionStorage.getItem('vox_pwa_banner_dismissed');
      if (banner && !dismissed) {
        banner.style.display = 'flex';
      }
    } catch (err) {
      if (banner) banner.style.display = 'flex';
    }
  });

  // 3. Notificação pós-instalação
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    dismissPwaBanner();
    showToast("🦁 Aplicativo Rádio Vox Arieh instalado com sucesso!");
  });
}

function installPWA() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    closeModals();
    const iosModal = document.getElementById('iosInstallModal');
    if (iosModal) {
      iosModal.classList.add('is-active');
    }
    return;
  }

  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] Usuário aceitou a instalação.');
      }
      deferredPrompt = null;
      dismissPwaBanner();
    });
  } else {
    alert("📲 Para instalar o App Oficial da Rádio Vox Arieh:\n\n• No Android/Chrome: Toque no menu de três pontinhos (⋮) no topo do navegador e escolha 'Instalar aplicativo' ou 'Adicionar à tela inicial'.\n• No iPhone/Safari: Toque no ícone Compartilhar (⎋) e escolha 'Adicionar à Tela de Início' (➕).\n• No Computador: Clique no ícone de instalação (+) na barra de endereços do navegador!");
  }
}

function dismissPwaBanner() {
  const banner = document.getElementById('pwaBanner');
  if (banner) {
    banner.style.display = 'none';
  }
  try {
    sessionStorage.setItem('vox_pwa_banner_dismissed', 'true');
  } catch (e) {}
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

  // Remoção total de vídeo: site exclusivo de áudio e palavra
  if (videoContainer) {
    videoContainer.innerHTML = '';
    videoContainer.style.display = 'none';
  }

  // Ajusta visibilidade do áudio
  if (audioBox) {
    const hasAudio = !!(d.audioSample || (RADIO_CONFIG.dailyDevotional && RADIO_CONFIG.dailyDevotional.audioSample));
    audioBox.style.display = hasAudio ? 'block' : 'none';
  }

  // Ajusta botão direto de áudio no Spotify
  const spotifyBox = document.getElementById('devotionalSpotifyBox');
  const spotifyBtn = document.getElementById('devotionalSpotifyBtn');
  if (spotifyBox && spotifyBtn) {
    const spotUrl = (d && d.spotifyUrl) ? d.spotifyUrl : (RADIO_CONFIG.dailyDevotional && RADIO_CONFIG.dailyDevotional.spotifyUrl ? RADIO_CONFIG.dailyDevotional.spotifyUrl : '');
    if (spotUrl) {
      spotifyBtn.href = sanitizeUrl(spotUrl);
      spotifyBox.style.display = 'block';
    } else {
      spotifyBox.style.display = 'none';
    }
  }
}

function renderSchedule() {
  const container = document.getElementById('scheduleContainer');
  const section = document.getElementById('programacao');
  const navLinks = document.querySelectorAll('a[href="#programacao"]');
  if (!container) return;

  const schedule = getScheduleData();

  if (!schedule || schedule.length === 0) {
    container.innerHTML = '';
    if (section) section.style.display = 'none';
    navLinks.forEach(link => {
      const parentLi = link.closest('li');
      if (parentLi) parentLi.style.display = 'none';
      else link.style.display = 'none';
    });
    return;
  }

  // Se houver programação, reexibir seção e menu
  if (section) section.style.display = '';
  navLinks.forEach(link => {
    const parentLi = link.closest('li');
    if (parentLi) parentLi.style.display = '';
    else link.style.display = '';
  });

  const activeProg = getActiveProgram();

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

function filterSponsors(query) {
  renderSponsors(query);
}

function scrollSponsors(direction) {
  const wrapper = document.getElementById('sponsorsScrollWrapper');
  if (!wrapper) return;
  const scrollAmount = 330;
  if (direction === 'left') {
    wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  } else {
    wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}

function renderSponsors(filterText = '') {
  const container = document.getElementById('sponsorsContainer');
  const countBadge = document.getElementById('sponsorsCountBadge');
  if (!container) return;

  let sponsors = getSponsorsData();
  const totalCount = sponsors.length;

  if (filterText && filterText.trim() !== '') {
    const q = filterText.toLowerCase().trim();
    sponsors = sponsors.filter(sp => 
      (sp.name && sp.name.toLowerCase().includes(q)) ||
      (sp.category && sp.category.toLowerCase().includes(q)) ||
      (sp.description && sp.description.toLowerCase().includes(q)) ||
      (sp.badge && sp.badge.toLowerCase().includes(q))
    );
  }

  if (countBadge) {
    countBadge.textContent = `${sponsors.length} de ${totalCount} parceiros`;
  }

  if (sponsors.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem; width: 100%;">
        🔍 Nenhum parceiro encontrado com o termo "<strong>${sanitizeHTML(filterText)}</strong>".
      </div>
    `;
    return;
  }

  container.innerHTML = sponsors.map(sp => {
    const cleanWaUrl = sanitizeUrl(sp.whatsappUrl);
    const cleanInstaUrl = sanitizeUrl(sp.instagramUrl || `https://instagram.com/${(sp.instagram || '').replace('@', '')}`);

    return `
      <div class="sponsor-card">
        <div>
          <span class="sponsor-badge">${sanitizeHTML(sp.badge || 'Amigo da Rádio')}</span>
          <h3 class="sponsor-name">${sanitizeHTML(sp.name)}</h3>
          <div class="sponsor-category">${sanitizeHTML(sp.category)}</div>
          <p class="sponsor-desc" title="${sanitizeHTML(sp.description)}">${sanitizeHTML(sp.description)}</p>
          <div class="sponsor-phone">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            <span>${sanitizeHTML(sp.phone)}</span>
          </div>
        </div>
        <div class="sponsor-actions">
          <a href="${cleanWaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" style="width: 100%; padding: 10px; font-size: 0.84rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/>
            </svg>
            Conversar no WhatsApp
          </a>
          ${sp.instagram ? `
          <a href="${cleanInstaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-instagram" style="width: 100%; padding: 8px; font-size: 0.8rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.79-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
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
  const episodeBtn = document.getElementById('btnSpotifyEpisode');
  if (!container) return;

  const episodes = getPodcastEpisodes();
  const featuredEp = episodes.find(e => e.featured) || (episodes.length > 0 ? episodes[0] : null);
  if (!currentActiveEpisodeId && featuredEp) {
    currentActiveEpisodeId = featuredEp.id;
  }
  const p = getPodcastData();
  const dev = getDevotionalData();

  const spotifyUrl = (featuredEp && featuredEp.spotifyUrl)
    ? featuredEp.spotifyUrl
    : ((dev && dev.spotifyUrl) ? dev.spotifyUrl : (p && p.spotifyEpisodeUrl ? p.spotifyEpisodeUrl : ''));

  const showUrl = (p && p.spotifyShowUrl && p.spotifyShowUrl !== 'https://open.spotify.com') 
    ? p.spotifyShowUrl 
    : 'https://open.spotify.com/show/3EzAq8DExatDJzkdlgdogX';

  if (followBtn) {
    followBtn.href = sanitizeUrl(showUrl);
  }

  if (episodeBtn) {
    if (spotifyUrl) {
      episodeBtn.href = sanitizeUrl(spotifyUrl);
      episodeBtn.style.display = 'inline-flex';
    } else {
      episodeBtn.style.display = 'none';
    }
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
          Abrir Perfil no Spotify
        </a>
      </div>
    `;
  }
}

let currentActiveEpisodeId = null;

function filterPodcasts(query) {
  renderPodcastGallery(query);
}

function renderPodcastGallery(filterText = '') {
  const container = document.getElementById('podcastGalleryGrid');
  if (!container) return;

  let episodes = getPodcastEpisodes();
  if (!episodes || episodes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 20px; background: rgba(36, 0, 70, 0.3); border: 1px dashed var(--border-violet); border-radius: var(--radius-md);">
        <p style="color: var(--text-muted); margin: 0; font-size: 0.92rem;">
          Nenhuma ministração cadastrada ainda. Adicione novos links pelo <strong>Painel ADM</strong>!
        </p>
      </div>
    `;
    return;
  }

  // Se houver busca/filtro
  if (filterText && filterText.trim() !== '') {
    const q = filterText.toLowerCase().trim();
    episodes = episodes.filter(ep => 
      (ep.title && ep.title.toLowerCase().includes(q)) ||
      (ep.speaker && ep.speaker.toLowerCase().includes(q)) ||
      (ep.category && ep.category.toLowerCase().includes(q))
    );
  }

  if (episodes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 25px 20px; color: var(--text-muted); font-size: 0.88rem;">
        🔍 Nenhuma ministração encontrada para "<strong>${sanitizeHTML(filterText)}</strong>".
      </div>
    `;
    return;
  }

  container.innerHTML = episodes.map((ep) => {
    const isFeatured = !!ep.featured;
    const isActive = (currentActiveEpisodeId === ep.id);
    const title = sanitizeHTML(ep.title || 'Ministração Bíblica');
    const speaker = sanitizeHTML(ep.speaker || 'Ev. Alexandra Maia');
    const category = sanitizeHTML(ep.category || 'Palavra');
    const date = ep.date ? sanitizeHTML(ep.date) : '';
    const safeUrl = sanitizeUrl(ep.spotifyUrl || '#');

    return `
      <div class="podcast-track-row ${isActive ? 'is-active-track' : ''}" onclick="playEpisodeInPlayer('${ep.id}')" title="Toque para ouvir no reprodutor">
        <div class="podcast-track-left">
          <div class="podcast-track-play-btn">
            ${isActive ? '🔊' : '▶'}
          </div>
          <div class="podcast-track-info">
            <div class="podcast-track-title">${title}</div>
            <div class="podcast-track-sub">
              <span>👤 ${speaker}</span>
              <span>•</span>
              <span class="podcast-track-tag">${category}</span>
              ${date ? `<span>•</span><span>${date}</span>` : ''}
              ${isFeatured ? `<span style="color: var(--gold-bright); font-weight: 700;">• ⭐ Destaque</span>` : ''}
            </div>
          </div>
        </div>
        <div class="podcast-track-actions">
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="podcast-action-icon-btn btn-spotify-icon" onclick="event.stopPropagation();" title="Abrir no app Spotify">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10s10-4.476 10-10c0-5.523-4.477-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.871 7.076-.505 9.721 1.115.295.18.388.563.208.857zm1.224-2.719c-.226.367-.706.482-1.072.257-2.69-1.654-6.79-2.133-9.97-1.168-.413.125-.85-.107-.975-.52-.125-.413.107-.85.52-.975 3.632-1.102 8.147-.568 11.24 1.334.366.226.481.706.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.018-.129-1.168-.623-.15-.494.129-1.019.624-1.169 3.532-1.072 9.404-.865 13.115 1.338.445.264.59.838.327 1.282-.264.444-.838.59-1.28.332z"/>
            </svg>
            <span>Spotify</span>
          </a>
          <button type="button" class="podcast-action-icon-btn btn-share-icon" onclick="event.stopPropagation(); shareSpecificPodcast('${ep.id}')" title="Compartilhar no WhatsApp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24"/>
            </svg>
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function playEpisodeInPlayer(episodeId) {
  const episodes = getPodcastEpisodes();
  const ep = episodes.find(e => e.id === episodeId);
  if (!ep || !ep.spotifyUrl) return;

  currentActiveEpisodeId = episodeId;

  const container = document.getElementById('spotifyPlayerContainer');
  const episodeBtn = document.getElementById('btnSpotifyEpisode');
  const embedUrl = getSpotifyEmbedUrl(ep.spotifyUrl);

  if (container && embedUrl) {
    container.innerHTML = `
      <iframe src="${embedUrl}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
    `;
  }

  if (episodeBtn) {
    episodeBtn.href = sanitizeUrl(ep.spotifyUrl);
    episodeBtn.style.display = 'inline-flex';
  }

  const playerBox = document.getElementById('podcasts');
  if (playerBox) {
    playerBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const searchInput = document.getElementById('podcastSearchInput');
  const searchVal = searchInput ? searchInput.value : '';
  renderPodcastGallery(searchVal);

  showToast(`Tocando agora: ${ep.title}`);
}

function shareSpecificPodcast(episodeId) {
  const episodes = getPodcastEpisodes();
  const ep = episodes.find(e => e.id === episodeId);
  if (!ep) return;

  const title = ep.title || 'Palavra Ministrada';
  const speaker = ep.speaker || 'Evangelista Alexandra Maia';
  const url = ep.spotifyUrl || window.location.href;
  const msg = `🦁 *VOX ARIEH — MINISTRAÇÃO EM ÁUDIO*\n\nOuça essa mensagem ministrada:\n📖 *${title}*\n🎙️ *Ministrante:* ${speaker}\n🎧 *Ouça agora no Spotify:* ${url}\n\n*Rádio Vox Arieh* — O rugido da libertação em cada frequência!`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(shareUrl, '_blank');
}

function sharePodcast() {
  const episodes = getPodcastEpisodes();
  const featuredEp = episodes.find(e => e.featured) || (episodes.length > 0 ? episodes[0] : null);
  const p = getPodcastData();
  const dev = getDevotionalData();
  const spotifyUrl = (featuredEp && featuredEp.spotifyUrl) || (dev && dev.spotifyUrl) || (p && p.spotifyEpisodeUrl) || window.location.href;
  const showUrl = (p && p.spotifyShowUrl && p.spotifyShowUrl !== 'https://open.spotify.com') 
    ? p.spotifyShowUrl 
    : 'https://open.spotify.com/show/3EzAq8DExatDJzkdlgdogX';
  const msg = `🦁 *VOX ARIEH CAST — PODCAST GOSPEL*\n\nOuça ministrações e pregações da Palavra de Deus:\n🎧 *Episódio:* ${spotifyUrl}\n✨ *Siga nosso canal no Spotify:* ${showUrl}\n\n*Rádio Vox Arieh* — O rugido da libertação em cada frequência!`;
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

  const prayerObj = {
    id: 'pray_' + Date.now(),
    name,
    city: city || 'Não informado',
    category: 'Clamor 24h',
    song: song || '',
    request,
    date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status: 'Recebido'
  };

  // 1. Salva localmente de imediato
  const localPrayers = getPrayersData();
  localPrayers.unshift(prayerObj);
  try { localStorage.setItem('vox_arieh_prayers', JSON.stringify(localPrayers)); } catch (e) {}
  if (SERVER_DATA) SERVER_DATA.prayers = localPrayers;
  updatePrayerCountBadges();

  // 2. Persiste no servidor /api/prayer
  try {
    fetch('/api/prayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, category: 'Clamor 24h', song, request })
    }).catch(err => console.warn("[API Prayer] Offline ou em background:", err));
  } catch (e) {}

  let msg = `🕊️ *PEDIDO DE ORAÇÃO & LOUVOR - RÁDIO VOX ARIEH*\n\n`;
  msg += `👤 *Nome:* ${name}\n`;
  msg += `📍 *Localização:* ${city}\n`;
  if (song) msg += `🎵 *Louvor Desejado:* ${song} (Para tocar no programa das 16h às 18h)\n`;
  msg += `🙏 *Causa / Pedido de Oração:* ${request}\n\n`;
  msg += `_Enviado pelo Portal Oficial da Rádio Vox Arieh com consentimento LGPD._`;

  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeModals();
  showToast("✅ Seu pedido foi enviado para o Altar de Oração!");
}

function handleSendPrayerPage(event) {
  event.preventDefault();
  const nameInput = document.getElementById('pagePrayerName');
  const cityInput = document.getElementById('pagePrayerCity');
  const catInput = document.getElementById('pagePrayerCategory');
  const songInput = document.getElementById('pagePrayerSong');
  const reqInput = document.getElementById('pagePrayerRequest');

  const name = nameInput ? nameInput.value.trim() : '';
  const city = cityInput ? cityInput.value.trim() : '';
  const category = catInput ? catInput.value.trim() : 'Geral';
  const song = songInput ? songInput.value.trim() : '';
  const request = reqInput ? reqInput.value.trim() : '';
  const whatsapp = getRadioWhatsapp();

  if (!name || !request) {
    alert("Por favor, preencha seu nome e o motivo de oração.");
    return;
  }

  const prayerObj = {
    id: 'pray_' + Date.now(),
    name,
    city: city || 'Não informado',
    category: category || 'Geral',
    song: song || '',
    request,
    date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status: 'Recebido'
  };

  // 1. Salva localmente de imediato
  const localPrayers = getPrayersData();
  localPrayers.unshift(prayerObj);
  try { localStorage.setItem('vox_arieh_prayers', JSON.stringify(localPrayers)); } catch (e) {}
  if (SERVER_DATA) SERVER_DATA.prayers = localPrayers;
  updatePrayerCountBadges();

  // 2. Persiste no servidor /api/prayer
  try {
    fetch('/api/prayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, category, song, request })
    }).catch(err => console.warn("[API Prayer] Offline ou em background:", err));
  } catch (e) {}

  let msg = `🕊️ *NOVO PEDIDO DE ORAÇÃO & INTERCESSÃO — RÁDIO VOX ARIEH*\n\n`;
  msg += `👤 *Nome:* ${name}\n`;
  if (city) msg += `📍 *Cidade / Bairro:* ${city}\n`;
  msg += `🏷️ *Causa / Área:* ${category}\n`;
  if (song) msg += `🎵 *Louvor Desejado:* ${song}\n`;
  msg += `🙏 *Causa / Pedido de Oração:* ${request}\n\n`;
  msg += `_Enviado pelo Altar de Clamor da Rádio Vox Arieh._`;

  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');

  // Limpa campos
  if (nameInput) nameInput.value = '';
  if (cityInput) cityInput.value = '';
  if (songInput) songInput.value = '';
  if (reqInput) reqInput.value = '';

  showToast("✅ Seu pedido foi enviado para o Altar de Oração!");
}

function handleSendAd(event) {
  event.preventDefault();
  const company = document.getElementById('adCompany').value.trim();
  const person = document.getElementById('adContactPerson').value.trim();
  const segment = document.getElementById('adSegment').value.trim();
  const plan = document.getElementById('adPlan').value;
  const whatsapp = getRadioWhatsapp();

  let msg = `🤝 *INTERESSE EM PARCERIA & DIVULGAÇÃO — RÁDIO VOX ARIEH*\n\n`;
  msg += `🏢 *Empresa / Atividade:* ${company}\n`;
  msg += `👤 *Responsável:* ${person}\n`;
  msg += `🏷️ *Ramo:* ${segment}\n`;
  msg += `⭐ *Interesse:* ${plan}\n\n`;
  msg += `_Olá Evangelista Alexandra! Gostaria de apoiar a rádio com uma oferta voluntária e divulgar meu trabalho na programação da Vox Arieh._`;

  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeModals();
}

function copyPixKey() {
  const pixInput = document.getElementById('pixKeyText');
  const btn = document.getElementById('btnCopyPix');
  const cleanPix = (pixInput ? pixInput.value : 'a90c419e-3cbb-4584-b1ae-e07ab456998e').trim();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cleanPix).then(() => {
      if (btn) btn.innerHTML = '<span>✅ Copiado!</span>';
      showToast('Chave PIX copiada! Abra seu app de banco para colar.');
      setTimeout(() => {
        if (btn) btn.innerHTML = '<span>📋 Copiar Chave</span>';
      }, 3000);
    }).catch(() => fallbackCopyPix(cleanPix, btn));
  } else {
    fallbackCopyPix(cleanPix, btn);
  }
}

function fallbackCopyPix(text, btn) {
  try {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    if (btn) btn.innerHTML = '<span>✅ Copiado!</span>';
    showToast('Chave PIX copiada com sucesso!');
    setTimeout(() => {
      if (btn) btn.innerHTML = '<span>📋 Copiar Chave</span>';
    }, 3000);
  } catch (err) {
    alert('Chave PIX: ' + text + '\n\nCopie a chave acima para realizar sua oferta voluntária!');
  }
}

function shareDevotional() {
  const d = getDevotionalData();
  const whatsapp = getRadioWhatsapp();
  const spotUrl = (d && d.spotifyUrl) ? d.spotifyUrl : (RADIO_CONFIG.dailyDevotional && RADIO_CONFIG.dailyDevotional.spotifyUrl ? RADIO_CONFIG.dailyDevotional.spotifyUrl : '');
  let text = `🦁 *MOMENTO DA PALAVRA - RÁDIO VOX ARIEH*\n\n`;
  text += `"${d.verse}"\n\n`;
  text += `${d.message}\n\n`;
  text += `🎙️ *Ministração:* ${d.speaker} (AD Madureira - Rondonópolis / MT)\n`;
  if (spotUrl) {
    text += `🎧 *Ouça no Spotify:* ${spotUrl}\n`;
  }
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
  renderAdminWordStudies();
  populateAdminDevotional();
  renderAdminPodcastEpisodes();
  renderAdminSchedule();
  renderAdminPrayers();
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

  if (tabId === 'tabPrayers') {
    renderAdminPrayers();
  }
  if (tabId === 'tabDevotional') {
    renderAdminWordStudies();
  }
}

/* ========================================================
   GESTÃO DE PEDIDOS DE ORAÇÃO & INTERCESSÃO NO ADM
   ======================================================== */
function updatePrayerCountBadges() {
  const prayers = getPrayersData();
  const pendingCount = prayers.filter(p => p.status !== 'Orado').length;
  const badge = document.getElementById('adminPrayerCount');
  const countHeader = document.getElementById('adminPrayerCountBadge');
  if (badge) badge.textContent = pendingCount;
  if (countHeader) {
    countHeader.textContent = `${prayers.length} ${prayers.length === 1 ? 'pedido' : 'pedidos'} (${pendingCount} pendentes)`;
  }
}

function renderAdminPrayers() {
  const container = document.getElementById('adminPrayersList');
  updatePrayerCountBadges();
  if (!container) return;

  const prayers = getPrayersData();
  if (prayers.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 35px 20px; color: var(--text-muted); background: rgba(36, 0, 70, 0.3); border: 1px dashed var(--border-violet); border-radius: var(--radius-md);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🕊️</div>
        <h4 style="color: #fff; margin-bottom: 6px;">Nenhum pedido de oração recebido ainda</h4>
        <p style="font-size: 0.88rem; margin: 0;">Quando os ouvintes enviarem causas pelo mural ou modal, os pedidos aparecerão aqui para intercessão pastoral.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = prayers.map((p, idx) => {
    const isAnswered = (p.status === 'Orado');
    const badgeColor = isAnswered 
      ? 'background: rgba(46, 204, 113, 0.15); border: 1px solid #2ecc71; color: #2ecc71;' 
      : 'background: rgba(212, 175, 55, 0.15); border: 1px solid var(--border-gold); color: var(--gold-bright);';

    return `
      <div class="prayer-admin-item" style="border-left: 4px solid ${isAnswered ? '#2ecc71' : 'var(--gold-bright)'};">
        <div class="prayer-admin-header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <h4 style="color: #fff; margin: 0; font-size: 1.05rem;">👤 ${sanitizeHTML(p.name)}</h4>
              <span class="prayer-badge-category">${sanitizeHTML(p.category || 'Geral')}</span>
              <span class="sponsor-badge" style="${badgeColor}; font-size: 0.72rem; padding: 2px 8px;">
                ${isAnswered ? '✅ Orado & Apresentado' : '⏳ Aguardando Oração'}
              </span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">
              📍 ${sanitizeHTML(p.city || 'Cidade não informada')} • 🗓️ ${sanitizeHTML(p.date || 'Data recente')}
              ${p.song ? ` • 🎵 <strong>Louvor:</strong> "${sanitizeHTML(p.song)}"` : ''}
            </p>
          </div>
        </div>

        <div style="background: rgba(20, 0, 40, 0.6); border: 1px solid rgba(255, 215, 0, 0.12); border-radius: 8px; padding: 12px 14px; margin: 12px 0; font-size: 0.92rem; color: #f5f5f5; line-height: 1.6;">
          <strong style="color: var(--gold-light);">🙏 Motivo de Oração:</strong><br>
          ${sanitizeHTML(p.request)}
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; margin-top: 10px;">
          ${!isAnswered ? `
            <button type="button" class="btn-sm-action btn-gold" style="background: rgba(212, 175, 55, 0.2); border: 1px solid var(--border-gold); color: var(--gold-bright); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="markPrayerAnswered(${idx})">
              <span>🙏</span> Marcar como Orado
            </button>
          ` : `
            <button type="button" class="btn-sm-action btn-violet" style="background: rgba(157, 78, 221, 0.15); border: 1px solid var(--border-violet); color: #c77dff; border-radius: 6px; padding: 6px 12px; cursor: pointer;" onclick="markPrayerPending(${idx})">
              ↩️ Reabrir Causa
            </button>
          `}
          <button type="button" class="btn-sm-action btn-delete" style="border-radius: 6px; padding: 6px 12px; cursor: pointer;" onclick="deletePrayer(${idx})">
            🗑️ Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function markPrayerAnswered(index) {
  const prayers = getPrayersData();
  if (!prayers[index]) return;
  prayers[index].status = 'Orado';
  savePrayersData(prayers);
  renderAdminPrayers();
  showToast(`Pedido de ${prayers[index].name} marcado como orado no altar!`);
}

function markPrayerPending(index) {
  const prayers = getPrayersData();
  if (!prayers[index]) return;
  prayers[index].status = 'Recebido';
  savePrayersData(prayers);
  renderAdminPrayers();
  showToast(`Pedido reaberto com sucesso!`);
}

function deletePrayer(index) {
  const prayers = getPrayersData();
  const p = prayers[index];
  if (!p) return;
  if (confirm(`Remover o pedido de oração de "${p.name}"?`)) {
    prayers.splice(index, 1);
    savePrayersData(prayers);
    renderAdminPrayers();
    showToast("Pedido de oração removido!");
  }
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

/* ========================================================
   GESTÃO DO ACERVO "ESTUDANDO A PALAVRA" NO ADM
   ======================================================== */
function renderAdminWordStudies() {
  const container = document.getElementById('adminStudiesList');
  if (!container) return;

  const studies = getWordStudiesData();

  if (studies.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 35px 20px; color: var(--text-muted); background: rgba(36, 0, 70, 0.3); border: 1px dashed var(--border-violet); border-radius: var(--radius-md);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">📖</div>
        <h4 style="color: #fff; margin-bottom: 6px;">Nenhuma ministração cadastrada no acervo</h4>
        <p style="font-size: 0.88rem; margin: 0;">Clique no botão acima "➕ Nova Mensagem / Estudo em Áudio" para cadastrar áudios e ministrações da Palavra de Deus.</p>
      </div>`;
    return;
  }

  container.innerHTML = studies.map((st, idx) => {
    const isFeatured = !!st.featured;
    const hasAudio = !!(st.audioFile || (st.audioUrl && !st.audioUrl.includes('spotify')));
    const hasSpotify = !!(st.spotifyUrl || (st.audioUrl && st.audioUrl.includes('spotify')));

    return `
      <div class="admin-item-row" style="${isFeatured ? 'border-color: var(--gold-primary); background: rgba(36, 0, 70, 0.4);' : ''}">
        <div class="admin-item-info">
          <h4>
            ${sanitizeHTML(st.title)}
            ${isFeatured ? '<span style="color: var(--gold-bright); font-size: 0.75rem; margin-left: 8px; border: 1px solid var(--border-gold); padding: 2px 8px; border-radius: 12px; font-weight: 700;">⭐ Destaque Principal</span>' : ''}
          </h4>
          <p>
            <strong>🎙️ Ministrante:</strong> ${sanitizeHTML(st.speaker || 'Evangelista Alexandra Maia')} | 
            <strong>📖 Bíblia:</strong> ${sanitizeHTML(st.verse || 'Referência Bíblica')} | 
            <strong>⏱️ Duração:</strong> ${sanitizeHTML(st.duration || '30 min')}
          </p>
          <p style="font-size: 0.82rem; color: #d0c8e0; margin-top: 4px; line-height: 1.4;">
            ${sanitizeHTML(st.description || st.message || '')}
          </p>
          <div style="font-size: 0.78rem; color: var(--gold-light); margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap;">
            ${hasAudio ? `<span>🔊 Áudio MP3 / Direto Disponível</span>` : ''}
            ${hasSpotify ? `<span>🎧 Link Spotify Integrado</span>` : ''}
            ${st.date ? `<span>🗓️ ${sanitizeHTML(st.date)}</span>` : ''}
          </div>
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn-sm-action btn-gold" style="background: rgba(212,175,55,0.2); border: 1px solid var(--border-gold); color: var(--gold-bright); border-radius: 6px; padding: 6px 10px; cursor: pointer;" onclick="selectStudyByIndex(${idx}, true); closeModals();">
            ▶️ Ouvir
          </button>
          <button type="button" class="btn-sm-action btn-gold" style="background: rgba(157,78,221,0.2); border: 1px solid var(--border-violet); color: #c77dff; border-radius: 6px; padding: 6px 10px; cursor: pointer;" onclick="editWordStudy('${st.id}')">
            ✏️ Editar
          </button>
          ${!isFeatured ? `
            <button type="button" class="btn-sm-action btn-gold" style="background: rgba(212,175,55,0.15); border: 1px solid var(--border-gold); color: var(--gold-bright); border-radius: 6px; padding: 6px 10px; cursor: pointer;" onclick="setFeaturedStudy('${st.id}')">
              ⭐ Destacar
            </button>
          ` : ''}
          <button type="button" class="btn-sm-action btn-delete" onclick="deleteWordStudy('${st.id}')">
            🗑️ Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleAddStudyForm(show) {
  const box = document.getElementById('studyFormBox');
  if (!box) return;
  if (show === undefined) {
    const isVisible = (box.style.display === 'block');
    if (isVisible) {
      box.style.display = 'none';
    } else {
      openStudyForm(null);
    }
  } else {
    box.style.display = show ? 'block' : 'none';
    if (show) openStudyForm(null);
  }
}

function openStudyForm(study = null) {
  const box = document.getElementById('studyFormBox');
  const heading = document.getElementById('studyFormHeading');
  if (!box) return;

  box.style.display = 'block';
  if (heading) {
    heading.textContent = study ? "Editar Mensagem / Estudo da Palavra" : "Adicionar Nova Mensagem em Áudio";
  }

  const form = document.getElementById('adminStudyForm');
  if (form && !study) {
    form.reset();
  }

  const idInput = document.getElementById('studyFormId');
  const titleInput = document.getElementById('studyFormTitle');
  const speakerInput = document.getElementById('studyFormSpeaker');
  const verseInput = document.getElementById('studyFormVerse');
  const durationInput = document.getElementById('studyFormDuration');
  const dateInput = document.getElementById('studyFormDate');
  const descInput = document.getElementById('studyFormDesc');
  const audioUrlInput = document.getElementById('studyFormAudioUrl');
  const audioFileInput = document.getElementById('studyFormAudioFile');
  const featuredInput = document.getElementById('studyFormFeatured');
  const fileNameDisplay = document.getElementById('studyFormFileName');

  if (idInput) idInput.value = study ? (study.id || '') : '';
  if (titleInput) titleInput.value = study ? (study.title || '') : '';
  if (speakerInput) speakerInput.value = study ? (study.speaker || '') : 'Evangelista Alexandra Maia';
  if (verseInput) verseInput.value = study ? (study.verse || '') : '';
  if (durationInput) durationInput.value = study ? (study.duration || '30 min') : '30 min';
  if (dateInput) dateInput.value = study ? (study.date || '') : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  if (descInput) descInput.value = study ? (study.description || study.message || '') : '';
  if (audioUrlInput) {
    audioUrlInput.value = study ? (study.audioUrl && !study.audioUrl.startsWith('data:') ? study.audioUrl : (study.spotifyUrl || '')) : '';
  }
  if (audioFileInput) audioFileInput.value = '';
  if (fileNameDisplay) fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
  if (featuredInput) featuredInput.checked = study ? !!study.featured : false;

  const adminModal = document.querySelector('.admin-modal-box');
  if (adminModal) {
    adminModal.scrollTop = 0;
  }
  try {
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 120);
  } catch (e) {}
}

function closeStudyForm() {
  const box = document.getElementById('studyFormBox');
  if (box) box.style.display = 'none';
}

window.toggleAddStudyForm = toggleAddStudyForm;
window.openStudyForm = openStudyForm;
window.closeStudyForm = closeStudyForm;

function editWordStudy(id) {
  const studies = getWordStudiesData();
  const study = studies.find(s => s.id === id);
  if (study) {
    openStudyForm(study);
  }
}

function setFeaturedStudy(id) {
  const studies = getWordStudiesData();
  studies.forEach(s => {
    s.featured = (s.id === id);
  });
  saveWordStudiesData(studies);
  renderWordStudies();
  renderAdminWordStudies();
  showToast("Estudo destacado no topo do reprodutor com sucesso!");
}

function deleteWordStudy(id) {
  if (!confirm("Deseja realmente excluir este estudo da palavra?")) return;
  const studies = getWordStudiesData().filter(s => s.id !== id);
  saveWordStudiesData(studies);
  renderWordStudies();
  renderAdminWordStudies();
  showToast("Estudo excluído com sucesso!");
}

async function handleSaveWordStudy(event) {
  event.preventDefault();
  const id = document.getElementById('studyFormId').value.trim();
  const title = document.getElementById('studyFormTitle').value.trim();
  const speaker = document.getElementById('studyFormSpeaker').value.trim();
  const verse = document.getElementById('studyFormVerse').value.trim();
  const duration = document.getElementById('studyFormDuration').value.trim();
  const date = document.getElementById('studyFormDate').value.trim();
  const description = document.getElementById('studyFormDesc').value.trim();
  let audioUrl = document.getElementById('studyFormAudioUrl').value.trim();
  const fileInput = document.getElementById('studyFormAudioFile');
  const isFeatured = document.getElementById('studyFormFeatured').checked;

  let audioFile = '';
  let spotifyUrl = '';

  if (audioUrl.includes('spotify.com')) {
    spotifyUrl = audioUrl;
  }

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    if (file.size > 120 * 1024 * 1024) {
      alert("⚠️ O arquivo de áudio selecionado (" + sizeMb + "MB) excede o limite máximo permitido de 120MB.\nPor favor, comprima o arquivo ou insira o link direto.");
      return;
    }

    showToast("⏳ Enviando áudio (" + sizeMb + "MB) para o servidor... Aguarde.");

    // Upload direto em streaming para o servidor (/api/upload-audio)
    let uploadSuccess = false;
    try {
      const uploadRes = await fetch('/api/upload-audio', {
        method: 'POST',
        headers: {
          'X-Admin-Hash': getAdminHash(),
          'X-File-Name': encodeURIComponent(file.name),
          'Content-Type': file.type || 'audio/mpeg'
        },
        body: file
      });

      if (uploadRes.ok) {
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.audioUrl) {
          audioFile = uploadJson.audioUrl;
          if (!audioUrl) audioUrl = uploadJson.audioUrl;
          uploadSuccess = true;
          console.log("[VOX ARIEH] Áudio gravado com sucesso no servidor:", uploadJson.audioUrl);
        }
      }
    } catch (uploadErr) {
      console.warn("[VOX ARIEH] Falha no upload para /api/upload-audio:", uploadErr);
    }

    // Fallback: se offline ou sem API e o áudio for pequeno (<= 6MB)
    if (!uploadSuccess) {
      if (file.size <= 6 * 1024 * 1024) {
        try {
          audioFile = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
          });
        } catch (e) {
          console.warn("Falha ao converter áudio para base64:", e);
        }
      } else {
        alert("⚠️ O áudio possui " + sizeMb + "MB. Para arquivos deste tamanho, verifique se a API do servidor está ativa ou insira o link direto de áudio (MP3 ou Spotify).");
        return;
      }
    }
  }

  const studies = getWordStudiesData();

  if (isFeatured) {
    studies.forEach(s => s.featured = false);
  }

  if (id) {
    // Editar existente
    const idx = studies.findIndex(s => s.id === id);
    if (idx !== -1) {
      const existing = studies[idx];
      studies[idx] = {
        ...existing,
        title,
        speaker,
        verse,
        duration: duration || existing.duration || '30 min',
        date: date || existing.date || '',
        description,
        audioUrl: audioUrl || existing.audioUrl || '',
        audioFile: audioFile || existing.audioFile || '',
        spotifyUrl: spotifyUrl || existing.spotifyUrl || '',
        featured: isFeatured
      };
    }
  } else {
    // Novo estudo
    const newStudy = {
      id: 'study_' + Date.now(),
      title,
      speaker: speaker || 'Evangelista Alexandra Maia',
      verse,
      duration: duration || '30 min',
      date: date || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      description,
      audioUrl,
      audioFile,
      spotifyUrl,
      featured: isFeatured || (studies.length === 0)
    };
    studies.unshift(newStudy);
  }

  saveWordStudiesData(studies);
  renderWordStudies();
  renderAdminWordStudies();
  closeStudyForm();
  showToast("✅ Ministração da Palavra salva e publicada com sucesso!");
}

/* Compatibilidade retroativa */
function populateAdminDevotional() {
  renderAdminWordStudies();
}
async function handleSaveDevotional(event) {
  if (event) event.preventDefault();
}

/* Gestão da Galeria de Podcasts & Pregações no ADM */
function renderAdminPodcastEpisodes() {
  const container = document.getElementById('adminPodcastList');
  const countBadge = document.getElementById('adminPodcastCount');
  if (!container) return;

  const episodes = getPodcastEpisodes();
  if (countBadge) {
    countBadge.textContent = episodes.length === 1 ? '1 episódio' : `${episodes.length} episódios`;
  }

  if (episodes.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhum episódio cadastrado na galeria ainda. Clique em "➕ Novo Episódio / Mensagem" acima para adicionar.</p>`;
    return;
  }

  container.innerHTML = episodes.map((ep, idx) => {
    const isFeatured = !!ep.featured;
    return `
      <div class="admin-item-row" style="${isFeatured ? 'border-color: var(--gold-primary); background: rgba(36, 0, 70, 0.4);' : ''}">
        <div class="admin-item-info">
          <h4>
            ${sanitizeHTML(ep.title)}
            ${isFeatured ? '<span style="color: var(--gold-bright); font-size: 0.75rem; margin-left: 8px; border: 1px solid var(--border-gold); padding: 2px 8px; border-radius: 12px; font-weight: 700;">⭐ Destaque no Topo</span>' : ''}
          </h4>
          <p><strong>Ministrante:</strong> ${sanitizeHTML(ep.speaker)} | <strong>Tema:</strong> ${sanitizeHTML(ep.category || 'Geral')}</p>
          <p style="font-size: 0.8rem; color: var(--gold-light); word-break: break-all; margin-top: 4px;">
            🎧 <strong>Spotify:</strong> <a href="${sanitizeUrl(ep.spotifyUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--gold-bright); text-decoration: underline;">${sanitizeHTML(ep.spotifyUrl)}</a>
          </p>
        </div>
        <div class="admin-item-actions">
          ${!isFeatured ? `<button type="button" class="btn-sm-action btn-gold" style="background: rgba(212,175,55,0.2); border: 1px solid var(--border-gold); color: var(--gold-bright); border-radius: 6px; padding: 6px 10px; cursor: pointer;" onclick="setFeaturedPodcast(${idx})">⭐ Destacar</button>` : ''}
          <button type="button" class="btn-sm-action btn-delete" onclick="deletePodcastEpisode(${idx})">🗑️ Remover</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleAddPodcastForm(show) {
  const box = document.getElementById('podcastFormBox');
  if (!box) return;
  if (show === undefined) {
    box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'block' : 'none';
  } else {
    box.style.display = show ? 'block' : 'none';
  }
}

function handleSavePodcastEpisode(event) {
  event.preventDefault();
  const title = document.getElementById('podEpTitle').value.trim();
  const speaker = document.getElementById('podEpSpeaker').value.trim();
  const category = document.getElementById('podEpCategory').value.trim();
  let url = document.getElementById('podEpUrl').value.trim();
  const isFeatured = document.getElementById('podEpFeatured').checked;

  if (!url) {
    alert("Por favor, informe o link do episódio no Spotify.");
    return;
  }

  const episodes = getPodcastEpisodes();

  if (isFeatured) {
    episodes.forEach(e => e.featured = false);
  }

  const newEp = {
    id: 'ep_' + Date.now(),
    title: title,
    speaker: speaker,
    category: category || 'Geral',
    date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    spotifyUrl: url,
    featured: isFeatured || episodes.length === 0
  };

  episodes.unshift(newEp);
  savePodcastEpisodes(episodes);

  // Limpa formulário
  document.getElementById('adminPodcastForm').reset();
  toggleAddPodcastForm(false);

  renderAdminPodcastEpisodes();
  renderPodcastGallery();
  renderPodcast();

  showToast(`Episódio "${title}" adicionado à galeria com sucesso!`);
}

function setFeaturedPodcast(index) {
  const episodes = getPodcastEpisodes();
  if (!episodes[index]) return;

  episodes.forEach((e, idx) => {
    e.featured = (idx === index);
  });

  savePodcastEpisodes(episodes);
  renderAdminPodcastEpisodes();
  renderPodcastGallery();
  renderPodcast();
  showToast(`Episódio "${episodes[index].title}" definido como destaque principal!`);
}

function deletePodcastEpisode(index) {
  const episodes = getPodcastEpisodes();
  const ep = episodes[index];
  if (!ep) return;

  if (confirm(`Remover o episódio "${ep.title}" da galeria de podcasts?`)) {
    episodes.splice(index, 1);
    if (ep.featured && episodes.length > 0) {
      episodes[0].featured = true;
    }
    trackDeletedEpisode(ep.spotifyUrl);
    savePodcastEpisodes(episodes);
    renderAdminPodcastEpisodes();
    renderPodcastGallery();
    renderPodcast();
    showToast("Episódio removido da galeria!");
  }
}

/* Gestão de Grade no ADM */
function renderAdminSchedule() {
  const container = document.getElementById('adminScheduleList');
  if (!container) return;

  const schedule = getScheduleData();

  if (schedule.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 35px 20px; color: var(--text-muted); background: rgba(36, 0, 70, 0.3); border: 1px dashed var(--border-violet); border-radius: var(--radius-md);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🗓️</div>
        <h4 style="color: #fff; margin-bottom: 6px;">Nenhum horário cadastrado (Grade Oculta no Site)</h4>
        <p style="font-size: 0.88rem; margin: 0;">A seção da grade está oculta para os ouvintes no site. Para adicionar horários, clique em "➕ Novo Horário", ou restaure a grade oficial clicando em "🔄 Restaurar Grade Oficial".</p>
      </div>`;
    return;
  }

  container.innerHTML = schedule.map((prog, idx) => `
    <div class="admin-item-row">
      <div class="admin-item-info">
        <h4>${sanitizeHTML(prog.start)} às ${sanitizeHTML(prog.end)} — ${sanitizeHTML(prog.title)}</h4>
        <p><strong>Apresentador(a):</strong> ${sanitizeHTML(prog.host)}</p>
        <p style="font-size: 0.8rem; color: var(--text-secondary);">${sanitizeHTML(prog.desc)}</p>
      </div>
      <div class="admin-item-actions">
        <button type="button" class="btn-sm-action btn-delete" onclick="deleteProgram(${idx})">🗑️ Remover</button>
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

function clearAllSchedule() {
  if (confirm("Deseja realmente remover todos os horários e ocultar a grade de programação do site?")) {
    saveScheduleData([]);
    renderAdminSchedule();
    renderSchedule();
    updateLiveShow();
    showToast("🗑️ Grade de programação removida com sucesso!");
  }
}

function resetScheduleToDefault() {
  if (confirm("Deseja restaurar a Grade Oficial de 24 Horas com os horários da Palavra (00h, 03h, 06h, 12h, 18h) e Louvores?")) {
    const defaultSched = (RADIO_CONFIG && Array.isArray(RADIO_CONFIG.schedule)) ? [...RADIO_CONFIG.schedule] : [];
    saveScheduleData(defaultSched);
    renderAdminSchedule();
    renderSchedule();
    updateLiveShow();
    showToast("Grade Oficial Restaurada com Sucesso!");
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

  const settingsData = {
    streamUrl,
    contact: { whatsapp, instagram }
  };

  if (newPass) {
    if (newPass.length < 6) {
      alert("Por motivos de segurança cibernética, a nova senha deve conter pelo menos 6 caracteres.");
      return;
    }
    const newHash = await sha256(newPass);
    localStorage.setItem('vox_arieh_admin_hash', newHash);
    settingsData.newAdminHash = newHash;
    document.getElementById('settAdminPass').value = '';
    alert("✅ Configurações salvas e NOVA SENHA criptografada com sucesso!\n\nStreaming conectado:\n" + streamUrl);
  } else {
    alert("✅ Configurações salvas com sucesso!\n\nStreaming conectado:\n" + streamUrl);
  }

  syncToServer('settings', settingsData);

  // Recarrega visualizadores e fecha o modal
  renderPlans();
  closeModals();
}

/* Exportar Backup de Configuração Seguro */
function exportAdminConfig() {
  const backup = {
    streamUrl: getStreamUrl(),
    wordStudies: getWordStudiesData(),
    dailyDevotional: getDevotionalData(),
    podcastEpisodes: getPodcastEpisodes(),
    schedule: getScheduleData(),
    sponsors: getSponsorsData(),
    prayers: getPrayersData(),
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

/* Restaurar Backup de Configuração Seguro */
function handleImportBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.wordStudies && Array.isArray(data.wordStudies)) saveWordStudiesData(data.wordStudies);
      if (data.dailyDevotional) saveDevotionalData(data.dailyDevotional);
      if (data.podcastEpisodes && Array.isArray(data.podcastEpisodes)) savePodcastEpisodes(data.podcastEpisodes);
      if (data.schedule && Array.isArray(data.schedule)) saveScheduleData(data.schedule);
      if (data.sponsors && Array.isArray(data.sponsors)) saveSponsorsData(data.sponsors);
      if (data.prayers && Array.isArray(data.prayers)) savePrayersData(data.prayers);
      if (data.streamUrl) localStorage.setItem('vox_arieh_streamUrl', data.streamUrl);
      if (data.contact) {
        if (data.contact.whatsapp) localStorage.setItem('vox_arieh_whatsapp', data.contact.whatsapp);
        if (data.contact.instagram) localStorage.setItem('vox_arieh_instagram', data.contact.instagram);
      }
      renderWordStudies();
      renderAdminWordStudies();
      renderDevotional();
      renderSchedule();
      renderSponsors();
      renderPodcast();
      renderPodcastGallery();
      renderAdminPodcastEpisodes();
      renderAdminSponsors();
      renderAdminSchedule();
      renderAdminPrayers();
      populateAdminDevotional();
      populateAdminSettings();
      showToast("Backup restaurado com sucesso!");
      alert("✅ Dados e configurações restaurados com sucesso a partir do backup!");
    } catch (err) {
      alert("❌ Erro ao ler o arquivo de backup. Verifique se é um arquivo JSON válido exportado pelo painel.");
    }
  };
  reader.readAsText(file);
  event.target.value = '';
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
