const router     = require('express').Router()
const Busboy     = require('busboy')
const { v4: uuidv4 } = require('uuid')
const admin      = require('firebase-admin')
const db         = admin.firestore()
const bucket     = admin.storage().bucket()

router.post('/:userId', (req, res) => {
  let busboy
  try {
    busboy = Busboy({ headers: req.headers })
  } catch (e) {
    console.error('Busboy init error', e)
    return res.status(500).send({ error: 'Busboy init failed' })
  }

  const chunks = []
  let mimeType

  const safeSend = (status, payload) => {
    if (!res.headersSent) res.status(status).send(payload)
  }

  busboy
    .on('file', (field, stream, filename, encoding, mimetype) => {
      mimeType = mimetype
      stream.on('data', chunk => chunks.push(chunk))
    })
    .on('error', err => {
      console.error('Busboy parsing error', err)
      safeSend(400, { error: err.message })
    })
    .on('finish', async () => {
      if (!chunks.length) {
        return safeSend(400, { error: 'No file received' })
      }

      const buffer  = Buffer.concat(chunks)
      const userId  = req.params.userId
      const voiceId = uuidv4()
      const path    = `Voices/${userId}/${voiceId}.webm`

      try {
        const ref = bucket.file(path)
        await ref.save(buffer, { metadata: { contentType: mimeType } })
        const [audioUrl] = await ref.getSignedUrl({
          action:  'read',
          expires: '03-01-2500'
        })

        await db.collection('voices').doc(voiceId).set({
          customerId:   userId,
          audioUrl,
          storagePath:  path,
          createdAt:    Date.now(),
          duration:     null,
          original:     'None',
          processed:    'None',
          true_request: 'None'
        })

        safeSend(201, { voiceId, audioUrl })
      } catch (err) {
        console.error('Upload/Firestore error', err)
        safeSend(500, { error: err.message })
      }
    })

  busboy.end(req.rawBody)
})

router.post('/confirm/:voiceId', async (req, res) => {
  try {
    await db.collection('voices').doc(req.params.voiceId)
            .update({ true_request: 'Yes' })
    res.send({ status: 'confirmed' })
  } catch (err) {
    console.error('Confirm error', err)
    res.status(500).send({ error: err.message })
  }
})

module.exports = router
