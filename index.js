const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// Configuração CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ========== Configuração do Swagger ==========
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Download MP3 do YouTube',
      version: '1.0.0',
      description: 'API para baixar músicas do YouTube em formato MP3',
    },
    servers: [
      { url: 'https://apidownloadmusicytb-production.up.railway.app' }
    ],
  },
  apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Rota para o JSON do Swagger
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// UI do Swagger - IMPORTANTE: Colocado em um endpoint específico
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ========== Rota de Download ==========
/**
 * @swagger
 * /api/baixar:
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
app.post('/api/baixar', (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL do vídeo é obrigatória e deve ser string' });
  }

  const tempDir = path.join(__dirname, 'temp_downloads');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const outputFile = path.join(tempDir, `audio_${Date.now()}.mp3`);
  const cmd = `yt-dlp -x --audio-format mp3 --no-playlist -o "${outputFile}" "${url}"`;

  console.log(`Iniciando download: ${url}`);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro no download:', error);
      return res.status(500).json({ error: 'Erro no download do áudio' });
    }

    console.log(`Download concluído: ${outputFile}`);
    
    // Configura os headers para download do arquivo
    res.setHeader('Content-Disposition', 'attachment; filename="musica.mp3"');
    res.setHeader('Content-Type', 'audio/mpeg');
    
    // Stream do arquivo para a resposta
    const fileStream = fs.createReadStream(outputFile);
    fileStream.pipe(res);
    
    fileStream.on('close', () => {
      fs.unlink(outputFile, (err) => {
        if (err) console.error('Erro ao deletar arquivo temporário:', err);
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📘 Swagger disponível em http://localhost:${PORT}/docs`);
});