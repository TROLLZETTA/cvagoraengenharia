const express = require("express");
const cors = require("cors");
const multer = require("multer");
const admin = require("firebase-admin");

const app = express();
app.use(cors());

// 🔐 FIREBASE VIA ENV
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "SEU_BUCKET.appspot.com"
});

const bucket = admin.storage().bucket();

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.send("API CVAGORA funcionando");
});

app.post("/enviar", upload.array("files"), async (req, res) => {
  try {
    const { nome, telefone, tipo, descricao } = req.body;

    const arquivosUrls = [];

    for (const file of req.files) {
      const nomeArquivo = Date.now() + "-" + file.originalname;
      const fileUpload = bucket.file(nomeArquivo);

      await fileUpload.save(file.buffer);

      const url = `https://storage.googleapis.com/${bucket.name}/${nomeArquivo}`;
      arquivosUrls.push(url);
    }

    await admin.firestore().collection("leads").add({
      nome,
      telefone,
      tipo,
      descricao,
      arquivos: arquivosUrls,
      data: new Date()
    });

    res.json({ ok: true });

  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao enviar");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});