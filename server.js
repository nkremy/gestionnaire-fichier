// ─────────────────────────────────────────────────────────────
// server.js
// Service HTTP autonome : gestionnaire de fichiers clients.
//
// Routes :
//   POST /ranger-fichier    { phone, base64, mimeType } → { success, reference }
//   POST /retrouver-fichier { reference }                → { success, base64 }
//   GET  /health
//
// Variables d'environnement :
//   STOCKAGE_MEDIAS_CHEMIN → répertoire racine du stockage
//   PORT                   → port d'écoute (défaut 3001)
// ─────────────────────────────────────────────────────────────
import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import 'dotenv/config'

const app = express()
app.use(express.json({ limit: '50mb' }))

function log(niveau, contexte, message, data = null) {
  const ts = new Date().toISOString()
  const ligne = `[${ts}] [${niveau}] [${contexte}] ${message}`
  if (data !== null) {
    console.error(ligne, typeof data === 'object' ? JSON.stringify(data) : data)
  } else {
    console.error(ligne)
  }
}

const REPERTOIRE_BASE = process.env.STOCKAGE_MEDIAS_CHEMIN

if (!REPERTOIRE_BASE) {
  log('ERROR', 'STOCKAGE', 'STOCKAGE_MEDIAS_CHEMIN non défini — arrêt du service')
  process.exit(1)
}

const EXTENSIONS_PAR_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/amr': 'amr',
  'video/mp4': 'mp4'
}

app.post('/ranger-fichier', async (req, res) => {
  const { phone, base64, mimeType } = req.body || {}

  if (!phone || !base64) {
    log('WARN', 'STOCKAGE', 'Requête /ranger-fichier incomplète — phone ou base64 manquant')
    return res.status(400).json({ success: false, erreur: 'phone et base64 sont obligatoires' })
  }

  log('INFO', 'STOCKAGE', `Rangement fichier pour ${phone} — mimeType: ${mimeType}`)

  try {
    const dossierClient = path.join(REPERTOIRE_BASE, phone)
    await fs.mkdir(dossierClient, { recursive: true })

    const extension = EXTENSIONS_PAR_MIME[mimeType] || 'bin'
    const nomFichier = `${randomUUID()}.${extension}`
    const cheminComplet = path.join(dossierClient, nomFichier)

    const buffer = Buffer.from(base64, 'base64')
    await fs.writeFile(cheminComplet, buffer)

    const reference = `${phone}/${nomFichier}`
    log('INFO', 'STOCKAGE', `Fichier rangé — reference: ${reference} — taille: ${buffer.length} octets`)

    return res.status(200).json({ success: true, reference })
  } catch (err) {
    log('ERROR', 'STOCKAGE', `Échec rangement fichier pour ${phone}`, err.message)
    return res.status(500).json({ success: false, erreur: err.message })
  }
})

app.post('/retrouver-fichier', async (req, res) => {
  const { reference } = req.body || {}

  if (!reference) {
    log('WARN', 'STOCKAGE', 'Requête /retrouver-fichier incomplète — reference manquante')
    return res.status(400).json({ success: false, erreur: 'reference est obligatoire' })
  }

  log('INFO', 'STOCKAGE', `Recherche fichier — reference: ${reference}`)

  try {
    const cheminComplet = path.join(REPERTOIRE_BASE, reference)
    const buffer = await fs.readFile(cheminComplet)
    const base64 = buffer.toString('base64')

    log('INFO', 'STOCKAGE', `Fichier retrouvé — reference: ${reference} — taille: ${buffer.length} octets`)
    return res.status(200).json({ success: true, base64 })
  } catch (err) {
    log('ERROR', 'STOCKAGE', `Échec recherche fichier — reference: ${reference}`, err.message)
    return res.status(404).json({ success: false, erreur: err.message })
  }
})

app.get('/health', (req, res) => {
  log('INFO', 'STOCKAGE', 'Health check OK')
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'stockage-fichiers-clients'
  })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  log('INFO', 'STOCKAGE', `=== Service de stockage démarré sur le port ${PORT} ===`)
  log('INFO', 'STOCKAGE', `Répertoire racine : ${REPERTOIRE_BASE}`)
  log('INFO', 'STOCKAGE', `POST /ranger-fichier    → ranger un fichier`)
  log('INFO', 'STOCKAGE', `POST /retrouver-fichier → retrouver un fichier`)
  log('INFO', 'STOCKAGE', `GET  /health            → santé du service`)
})
