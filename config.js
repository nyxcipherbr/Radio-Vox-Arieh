/**
 * CONFIGURAÇÃO GERAL DA RÁDIO VOX ARIEH
 * Edite este arquivo para atualizar dados de transmissão, contatos, programas e anunciantes.
 */

const RADIO_CONFIG = {
  // Identidade da Rádio
  name: "Vox Arieh",
  slogan: "O rugido da libertação em cada frequência",
  meaning: "Arieh (Leão da Tribo de Judá)",
  frequency: "Web Rádio 24 Horas",
  
  // Streaming de Áudio Oficial (AzuraCast Dedicado com SSL Let's Encrypt)
  streamUrl: "https://stream.lexaapp.com.br/listen/voxarieh/radio.mp3",
  fallbackAudio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  
  // Segurança Cibernética: Hash SHA-256 do Painel ADM (Nunca armazena senha em texto puro)
  adminHash: "a1b8457ae946c6ea54d9d7ee69e835249eb75c8c4b3de11ce82cf9f84b4daf5b",
  
  // Liderança e Igreja
  church: {
    name: "Igreja Assembleia de Deus Madureira",
    evangelist: "Evangelista Alexandra Maia",
    presidentPastor: "Pr. Ary Dantas (Pastor Presidente)",
    localPastors: "Pr. Melgercior e Pra. Zeigna (Pastores Dirigentes)",
    address: {
      street: "Rua 10, Quadra 19, Lote 22",
      neighborhood: "Bairro Padre Lothar",
      city: "Rondonópolis",
      state: "MT",
      full: "Rua 10, Qdra 19, Lote 22 - Padre Lothar, Rondonópolis - MT"
    }
  },

  // Contato e Atendimento
  contact: {
    whatsapp: "5566999536712",
    whatsappDisplay: "(66) 99953-6712",
    instagram: "@voxarieh.radio",
    email: "contato@voxarieh.com.br"
  },

  // Devocional em Destaque
  dailyDevotional: {
    title: "O Rugido do Leão de Judá na Sua Vida",
    verse: "O leão rugiu, quem não temerá? O Senhor Deus falou, quem não profetizará? — Amós 3:8",
    speaker: "Evangelista Alexandra Maia",
    message: "Quando o Leão da Tribo de Judá ruge, as correntes caem, a enfermidade recua e as portas que estavam fechadas se abrem em nome de Jesus. Permaneça firme em oração hoje!",
    audioSample: "",
    videoUrl: "",
    spotifyUrl: "https://open.spotify.com/episode/1pkSEp2xss5YXe4KDgBj6f?si=odHD6LcwQ-69y7YzWYOi9w"
  },

  // Podcasts & Mensagens Sob Demanda (Spotify for Podcasters)
  podcast: {
    title: "Rádio Vox Arieh — Momento da Palavra",
    subtitle: "O rugido da Palavra de Deus em cada episódio",
    spotifyEpisodeUrl: "https://open.spotify.com/episode/1pkSEp2xss5YXe4KDgBj6f?si=odHD6LcwQ-69y7YzWYOi9w",
    spotifyShowUrl: "https://open.spotify.com/show/3EzAq8DExatDJzkdlgdogX",
    description: "Devocionais diários, orações de poder e mensagens ministradas pela Evangelista Alexandra Maia e convidados.",
    episodes: [
      {
        id: "ep_1",
        title: "Palavra sobre Cura da Alma",
        speaker: "Evangelista Alexandra Maia",
        category: "Cura & Libertação",
        date: "22 de Outubro",
        spotifyUrl: "https://open.spotify.com/episode/1pkSEp2xss5YXe4KDgBj6f?si=odHD6LcwQ-69y7YzWYOi9w",
        featured: true
      }
    ]
  },

  // Grade de Programação 24 Horas Oficial (Calculada dinamicamente com base no horário real)
  schedule: [
    { start: "00:00", end: "01:00", title: "Momento da Palavra — Clamor da Meia-Noite", host: "Pregações & Ministrações de Fé", desc: "Mensagens bíblicas edificantes, clamor da madrugada e reflexões ungidas para a sua vida." },
    { start: "01:00", end: "03:00", title: "Madrugada com Deus", host: "Louvores & Adoração Profunda", desc: "Os mais belos louvores nacionais de adoração e consagração nas madrugadas." },
    { start: "03:00", end: "04:00", title: "Momento da Palavra — Vigília da Madrugada", host: "Palavra Pastoral & Pregações", desc: "Ministrações bíblicas e palavras de consolo, encorajamento e cura para a sua alma." },
    { start: "04:00", end: "06:00", title: "Alvorada da Vitória", host: "Louvores Pentecostais", desc: "Louvores que despertam a fé para começar o dia cheio da presença de Deus." },
    { start: "06:00", end: "07:00", title: "Momento da Palavra — Despertar da Fé", host: "Mensagens da Palavra & Oração", desc: "Pílula bíblica e oração matinal para você começar o seu dia na presença do Senhor." },
    { start: "07:00", end: "12:00", title: "Manhã de Louvor & Glória", host: "Grandes Clássicos Gospel 24h", desc: "Músicas que edificam sua casa, sucessos contemporâneos e harpa cristã." },
    { start: "12:00", end: "13:00", title: "Momento da Palavra — Alimento do Meio-Dia", host: "Pregações & Alimento Espiritual", desc: "Grandes reflexões da Palavra de Deus, estudos bíblicos e devocionais edificando sua família." },
    { start: "13:00", end: "16:00", title: "Tarde de Avivamento & Central de Pedidos", host: "Participação dos Ouvintes", desc: "Envie seu pedido de louvor pelo WhatsApp das 13h às 16h para tocar hoje na rádio!" },
    { start: "16:00", end: "18:00", title: "Conexão Vox Arieh — Louvores Pedidos no Ar", host: "A Voz do Ouvinte & Intercessão", desc: "O momento mais aguardado: rodando os louvores pedidos pelos ouvintes durante a tarde!" },
    { start: "18:00", end: "19:00", title: "Momento da Palavra — Clamor do Entardecer", host: "Ministrações & Vozes da Fé", desc: "Pregações impactantes, oração pelas famílias e gratidão ao entardecer." },
    { start: "19:00", end: "23:59", title: "Noite de Celebração & Intimidade", host: "Louvores Especiais AD Madureira", desc: "Termine o seu dia debaixo da paz do Senhor com profunda adoração." }
  ],

  // Planos Comerciais para Anunciantes (Mídia Kit - Valores de Lançamento)
  plans: [
    {
      name: "Plano Bronze",
      price: "R$ 50",
      period: "/mês",
      badge: "Iniciante / Apoio",
      features: [
        "6 inserções de áudio (30s) por dia na rádio",
        "Veiculação nos blocos musicais de 24h",
        "Menção do nome da empresa pelo locutor",
        "Emissão de Nota Fiscal e Contrato Comercial"
      ],
      whatsappMsg: "Olá Ev. Alexandra! Tenho interesse no Plano BRONZE (R$ 50/mês) para anunciar minha empresa na Rádio Vox Arieh."
    },
    {
      name: "Plano Prata",
      price: "R$ 100",
      period: "/mês",
      badge: "Mais Popular",
      featured: true,
      features: [
        "12 inserções de áudio (30s) diárias (a cada 2h)",
        "Banner com link e WhatsApp no Guia Comercial do site",
        "Menção especial nos horários nobres",
        "Relatório mensal de veiculação das inserções",
        "Emissão de Nota Fiscal e Contrato PJ"
      ],
      whatsappMsg: "Olá Ev. Alexandra! Tenho interesse no Plano PRATA (R$ 100/mês) para anunciar minha empresa com banner e áudio na Rádio Vox Arieh."
    },
    {
      name: "Plano Ouro",
      price: "R$ 200",
      period: "/mês",
      badge: "Patrocinador Master",
      features: [
        "18 inserções diárias de alta frequência",
        "Patrocínio Exclusivo do 'Momento da Palavra' ('Oferecimento...')",
        "Banner VIP topo de destaque no site e redes sociais",
        "Divulgação direta para a comunidade e ouvintes",
        "Gravação gratuita da vinheta/spot comercial da sua empresa"
      ],
      whatsappMsg: "Olá Ev. Alexandra! Tenho interesse no Plano OURO VIP (R$ 200/mês) para patrocínio exclusivo na Rádio Vox Arieh."
    }
  ],

  // Guia Comercial / Empresas Parceiras (Patrocinadores Oficiais)
  sponsors: [
    {
      name: "Alexa Soluções",
      category: "Central de Vendas • Internet Fibra Óptica",
      description: "Especialista em internet fibra de ultra velocidade (Pedranet, Amigo, Vivo e Federal), planos de celular e conectividade para residências e empresas de Rondonópolis. Atendimento humanizado, consultoria especializada e suporte sem robôs.",
      phone: "(66) 99953-6712",
      whatsappUrl: "https://wa.me/5566999536712?text=Ol%C3%A1%20Alexa%20Solu%C3%A7%C3%B5es!%20Vi%20seu%20an%C3%BAncio%20na%20R%C3%A1dio%20Vox%20Arieh%20e%20gostaria%20de%20consultar%20planos%20de%20internet%20fibra.",
      instagram: "@alexa.conect",
      instagramUrl: "https://www.instagram.com/alexa.conect",
      badge: "Patrocinador Master Oficial"
    },
    {
      name: "Alexa Prime — Beleza & Educação",
      category: "Centro de Estética, Bronzeamento Natural & Cursos",
      description: "Espaço exclusivo de bem-estar, beleza e transformação em Rondonópolis. Especialista em bronzeamento natural com biquíni de fita, estética facial e corporal, massoterapia, além de cursos profissionalizantes com mentoria e certificação.",
      phone: "(66) 99612-8149",
      whatsappUrl: "https://wa.me/5566996128149?text=Ol%C3%A1%20Alexa%20Prime!%20Vi%20seu%20an%C3%BAncio%20na%20R%C3%A1dio%20Vox%20Arieh%20e%20gostaria%20de%20agendar%20um%20hor%C3%A1rio%20ou%20saber%20sobre%20os%20cursos.",
      instagram: "@alexaprime.estetica",
      instagramUrl: "https://www.instagram.com/alexaprime.estetica",
      badge: "Patrocinador Master VIP"
    }
  ]
};
