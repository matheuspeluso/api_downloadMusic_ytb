const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// Configuração CORS totalmente permissiva
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true
}));

// Headers CORS adicionais para garantir compatibilidade
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Configuração Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Download MP3 do YouTube',
      version: '1.0.0',
      description: 'API para baixar músicas do YouTube em formato MP3',
    },
    servers: [
      { url: 'http://localhost:3000' },
      { url: 'apidownloadmusicytb-production.up.railway.app' } // Substitua pelo seu domínio de produção
    ],
  },
  apis: ['./index.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /baixar:
 *   post:
 *     summary: Baixar áudio mp3 do YouTube
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://www.youtube.com/watch?v=abc123
 *     responses:
 *       200:
 *         description: Arquivo mp3 do áudio
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: URL inválida ou ausente
 *       500:
 *         description: Erro no processo de download
 */
app.post('/baixar', (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL do vídeo é obrigatória e deve ser string' });
  }

  const tempDir = path.join(__dirname, 'temp_downloads');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  // Nome temporário com timestamp pra evitar conflito
  const outputFile = path.join(tempDir, `audio_${Date.now()}.mp3`);

  // Ajuste o caminho do ffmpeg aqui, se tiver instalado localmente
  // Ou deixe vazio se estiver no PATH do sistema
  const ffmpegPath = ''; // ex: 'C:\\ffmpeg\\bin\\ffmpeg.exe' ou ''

  // Monta comando yt-dlp
  const ffmpegOption = ffmpegPath ? `--ffmpeg-location "${ffmpegPath}"` : '';
  const cmd = `yt-dlp -x --audio-format mp3 ${ffmpegOption} --no-playlist -o "${outputFile}" "${url}"`;

  console.log(`Iniciando download rápido: ${url}`);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro no download:', error);
      return res.status(500).json({ error: 'Erro no download do áudio' });
    }

    console.log(`Download concluído: ${outputFile}`);

    // Envia arquivo para cliente
    res.download(outputFile, 'audio.mp3', (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
      }
      // Apaga arquivo depois de enviado (limpeza)
      fs.unlink(outputFile, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Erro ao deletar arquivo temporário:', unlinkErr);
        }
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📘 Swagger disponível em http://localhost:${PORT}/api-docs`);
});
