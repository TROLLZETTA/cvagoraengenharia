const express = require("express");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");

// 🔐 IMPORTAR SUA CHAVE FIREBASE
const serviceAccount = require("./firebase-key.json");

// 🔥 INICIAR FIREBASE
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "cvagora-engenharia.firebasestorage.app" // 🔥 ALTERE AQUI
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// 🚀 APP
const app = express();
app.use(cors());
app.use(express.json());

// 📦 CONFIG UPLOAD (MEMÓRIA + LIMITE)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  },
  fileFilter: (req, file, cb) => {
    // 🔐 BLOQUEIO BÁSICO DE EXTENSÕES PERIGOSAS
    const ext = path.extname(file.originalname).toLowerCase();

    const proibidos = [".exe", ".bat", ".sh", ".js"];

    if (proibidos.includes(ext)) {
      return cb(new Error("Tipo de arquivo não permitido"));
    }

    cb(null, true);
  }
});

// 🧠 ROTA PRINCIPAL (RECEBE FORMULÁRIO)
app.post("/enviar", upload.array("files"), async (req, res) => {

  try {
    const { nome, telefone, tipo, descricao } = req.body;
    const files = req.files || [];

    if (!nome || !telefone) {
      return res.status(400).json({ erro: "Dados obrigatórios" });
    }

    const urls = [];

    // 📤 UPLOAD PARA FIREBASE STORAGE
    for (const file of files) {

      const nomeArquivo = Date.now() + "-" + file.originalname;
      const fileUpload = bucket.file(nomeArquivo);

      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype
        }
      });

      const url = `https://storage.googleapis.com/${bucket.name}/${nomeArquivo}`;
      urls.push(url);
    }

    // 💾 SALVAR NO BANCO
    await db.collection("leads").add({
      nome,
      telefone,
      tipo,
      descricao,
      arquivos: urls,
      criadoEm: new Date()
    });

    return res.json({
      sucesso: true,
      mensagem: "Lead salvo com sucesso"
    });

  } catch (erro) {
    console.error("ERRO:", erro);

    return res.status(500).json({
      erro: true,
      mensagem: "Erro ao processar solicitação"
    });
  }
});

// 🧪 ROTA TESTE
app.get("/", (req, res) => {
  res.send("🚀 API CVAGORA funcionando");
});

// 🔥 INICIAR SERVIDOR
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});