# 🦁 Guia Técnico & Operacional: Rádio Vox Arieh 24h no Ar

Este manual foi elaborado exclusivamente para a **Evangelista Alexandra Maia** e equipe da **Igreja Assembleia de Deus Madureira (Rondonópolis - MT)**, detalhando o funcionamento completo do streaming 24 horas, automação de comerciais e integração com o portal web.

---

## 1. Como a Rádio Funciona 24 Horas sem Computador Ligado

Para que a **Vox Arieh** nunca saia do ar, a transmissão utiliza a tecnologia de **AutoDJ na Nuvem**:

```
[Seus Arquivos MP3] 
 (Louvores + Devocionais + Comerciais)
            │
            ▼
┌─────────────────────────┐
│   PAINEL DE STREAMING   │ ◄─── Entrada Ao Vivo a qualquer momento
│      com AutoDJ         │      (Via Celular ou Computador com BUTT / OBS)
└───────────┬─────────────┘
            │
            ▼ Link do Stream (Icecast / SHOUTcast)
┌─────────────────────────┐
│  PORTAL WEB VOX ARIEH   │ ───► Ouvintes no Celular, PC e Aplicativos
│  + RadiosNet + TuneIn   │
└─────────────────────────┘
```

---

## 2. Escolhendo o Provedor de Streaming (2 Opções)

### Opção A: Plataforma Nacional Pronta (Mais Recomendada para Iniciar Rápido)
Empresas especializadas que já entregam o painel de AutoDJ em português:
* **Exemplos:** *BRLOGIC*, *ServerSP*, *Brasil Stream*, *Maxcast*.
* **Custo médio:** R$ 35 a R$ 60 por mês.
* **Vantagens:** Painel visual intuitivo para arrastar músicas, agendador automático de comerciais, aplicativo Android opcional incluído e suporte em português via WhatsApp.
* **O que você recebe:** Uma URL de streaming (ex.: `https://stm1.server.com:8000/live`).

### Opção B: Servidor VPS Próprio com AzuraCast (Para Quem Quer Custo Fixo e Zero Limite)
* **AzuraCast** é o melhor sistema open source do mundo para gestão de web rádio.
* **Custo:** ~5 a 6 dólares/mês em um servidor VPS (ex.: Hetzner ou DigitalOcean).
* **Vantagens:** Não há limite de ouvintes simultâneos, relatórios completos em PDF com gráficos de quantas vezes cada comercial tocou para prestar contas aos patrocinadores.

---

## 3. Estrutura de Pastas e Rotação no AutoDJ

Ao acessar o painel do seu streaming, crie as seguintes pastas para organizar os áudios MP3:

1. **`01_LOUVORES_ADORACAO`**: Músicas de adoração, comunhão e louvores contemporâneos.
2. **`02_LOUVORES_PENTECOSTAIS`**: Hinos de celebração, harpa cristã e ritmos alegres.
3. **`03_DEVOCIONAIS_ALEXANDRA_MAIA`**: Áudios de 2 a 5 minutos gravados pela Evangelista Alexandra Maia ou Pastores (Pr. Ary Dantas, Pr. Melgercior e Pra. Zeigna).
4. **`04_VINHETAS_VOX_ARIEH`**: Passagens sonoras curtas (3 a 7 segundos) com a voz padrão: *"Vox Arieh — O rugido da libertação em cada frequência!"*.
5. **`05_COMERCIAIS_PATROCINADORES`**: Spots de 30 segundos das empresas parceiras.

### Regra de Rotação Recomendada no Painel:
* **Vinheta:** Tocar a cada **2 ou 3 músicas**.
* **Momento da Palavra / Devocional:** Tocar a cada **45 minutos** ou em horários fixos (06:00, 11:30, 18:00 e 22:00).
* **Bloco Comercial:** Tocar **1 ou 2 spots** a cada **15 a 20 minutos** (garantindo as 6, 12 ou 18 inserções diárias contratadas pelos planos Bronze, Prata e Ouro).

---

## 4. Como Entrar Ao Vivo (Pregação, Culto ou Locução)

Quando a Evangelista Alexandra Maia ou os Pastores quiserem transmitir um culto ou falar ao vivo:

1. **Pelo Computador:**
   * Baixe o software gratuito **BUTT (Broadcast Using This Tool)** ou **OBS Studio**.
   * Insira o IP, Porta e Senha de Transmissão fornecidos pelo seu streaming.
   * Clique em **Play/Conectar**: o AutoDJ baixa o volume da música suavemente e a voz ao vivo entra no ar instantaneamente. Ao desconectar, o AutoDJ retoma a programação automática.
2. **Pelo Celular (Android ou iPhone):**
   * Use aplicativos como **MediaCast** ou **BroadcastMySelf**.
   * Permite transmitir cultos externos ou palavras pastorais direto do celular de onde você estiver.

---

## 5. Como Vincular seu Stream ao Site da Vox Arieh

Quando você contratar seu streaming e receber a URL, basta abrir o arquivo [config.js](config.js):

```javascript
// Localize esta linha no config.js:
streamUrl: "SUA_URL_DE_STREAMING_AQUI", // ex: https://stm1.painel.com:8000/live
```

Salve o arquivo e o player do site passará a reproduzir imediatamente a sua transmissão ao vivo!

---

## 6. Divulgação Gratuita em Agregadores Nacionais

Cadastre a Rádio Vox Arieh nos principais diretórios do Brasil para ganhar centenas de ouvintes orgânicos todos os dias:

1. **RadiosNet (www.radios.com.br):**
   * O maior diretório de rádios do Brasil. O cadastro é gratuito.
   * Cadastre a Vox Arieh na categoria: *Gospel / Religiosa*, Cidade: *Rondonópolis - MT*.
2. **TuneIn (www.tunein.com):**
   * Maior agregador global de rádio na internet. Permite que qualquer pessoa ouça a rádio também pela assistente inteligente **Alexa** ("Alexa, tocar Rádio Vox Arieh no TuneIn").
3. **CXRadio & Radios do Brasil:**
   * Diretórios adicionais para ampliar o alcance.

---

## 7. Formalização e Cobrança dos Patrocinadores

Como você já possui **CNPJ ativo**:
1. **Emissão de NFS-e (Nota Fiscal de Serviços):**
   * Emita a nota fiscal mensalmente para os anunciantes na atividade de publicidade/veiculação.
2. **Contrato de Apoio Cultural / Veiculação:**
   * Utilize contratos de 3, 6 ou 12 meses para garantir receita recorrente (ex: R$ 300/mês no Plano Prata).
3. **Comprovação:**
   * Envie no fim de cada mês o extrato simples do streaming comprovando que os spots comerciais foram ao ar nos horários combinados.
