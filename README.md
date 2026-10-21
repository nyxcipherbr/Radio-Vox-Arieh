# 🦁 Rádio Vox Arieh — Web Rádio 24h & Portal Interativo

> **"O rugido da libertação em cada frequência."**  
> Ministério de Comunicação Cristã — Assembleia de Deus Madureira (Rondonópolis - MT)  
> Direção: Evangelista Alexandra Maia

---

## 📻 Sobre o Projeto

A **Rádio Vox Arieh** é um portal completo de web rádio gospel e evangelização 24 horas, desenvolvido com tecnologia web pura (HTML5, CSS3 moderno, JavaScript ES6) de altíssima performance e sem dependências pesadas.

### Principais Funcionalidades:
- 🔊 **Web Player 24h:** Streaming de áudio contínuo, equalizador com ondas sonoras dinâmicas e controle de volume persistente.
- 📖 **Momento da Palavra:** Seção devocional com versículo diário e player de mensagens bíblicas sob demanda.
- ⏰ **Grade 24 Horas Inteligente:** Destaque automático em tempo real do programa que está no ar com base no relógio do ouvinte.
- 💼 **Guia Comercial (Apoio Cultural):** Vitrine de patrocinadores locais com botões diretos para WhatsApp e Instagram.
- 👑 **Painel Administrativo Master (Nicho ADM):** Área restrita protegida por senha para cadastrar/editar patrocinadores, atualizar o devocional, gerenciar horários e configurar a URL de streaming sem mexer em código.

---

## 🚀 Como Rodar Localmente

Basta abrir o arquivo `index.html` em qualquer navegador ou rodar um servidor HTTP local:

```bash
# Via Python
python3 -m http.server 8080

# Ou simplesmente abrir index.html com 2 cliques
```

---

## 🌐 Deploy na DigitalOcean / Servidor Web (Nginx)

1. Clone o repositório no servidor:
   ```bash
   git clone https://github.com/nyxcipherbr/radio-vox-arieh.git /var/www/radio-vox-arieh
   ```
2. Configure o bloco do Nginx no arquivo `/etc/nginx/sites-available/radio-vox-arieh`:
   ```nginx
   server {
       listen 80;
       server_name radio.seudominio.com.br;
       root /var/www/radio-vox-arieh;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
3. Ative e recarregue:
   ```bash
   sudo ln -s /etc/nginx/sites-available/radio-vox-arieh /etc/nginx/sites-enabled/
   sudo systemctl reload nginx
   sudo certbot --nginx -d radio.seudominio.com.br
   ```

---

## 🔒 Acesso Administrativo
- **Atalho no Teclado:** `Ctrl + Shift + A`
- **Botão:** Rodapé do site ("Painel da Direção")
- **Autenticação:** Protegida por hash criptográfico SHA-256 com credenciais exclusivas da coordenação.
