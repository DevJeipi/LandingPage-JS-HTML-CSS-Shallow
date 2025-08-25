const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

// Configuração CORS mais específica
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://your-vercel-domain.vercel.app", // Substitua pelo seu domínio Vercel
    "https://*.vercel.app",
    "https://revendedasras-shallow.vercel.app", // Se este for seu domínio
    "https://www.shallowbeachwear.com.br", // Hostgator
    "https://shallowbeachwear.com.br",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware para headers CORS adicionais
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // Responder a requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.use(express.json({ limit: "10mb" }));

const API_KEY =
  "c161e761d0de8149526f39669505844a8b1ab9bd65d0074b2280275e7b0d4ca4e536c369";
const API_URL = "https://shallowbeachwear.api-us1.com/api/3";

// Função para limpar e formatar dados
function sanitizeData(data) {
  const { nome, email, telefone } = data;

  return {
    nome: nome ? nome.trim().normalize("NFKC") : "",
    email: email ? email.trim().toLowerCase() : "",
    telefone: telefone
      ? telefone.replace(/\s+/g, "").replace(/[()-]/g, "")
      : "",
  };
}

// Função para validar dados
function validateData(data) {
  const { nome, email, telefone } = data;
  const errors = [];

  // Validar nome
  if (!nome || nome.length < 2) {
    errors.push("Nome deve ter pelo menos 2 caracteres");
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Email inválido");
  }

  // Validar telefone (deve ter pelo menos 10 dígitos após o código do país)
  const phoneRegex = /^\+\d{2,3}\d{10,11}$/;
  if (!telefone || !phoneRegex.test(telefone)) {
    errors.push("Telefone inválido. Formato esperado: +55XXXXXXXXXXX");
  }

  return errors;
}

app.post("/api/enviar", async (req, res) => {
  console.log("Dados recebidos:", req.body);

  try {
    // Sanitizar dados
    const dadosLimpos = sanitizeData(req.body);
    console.log("Dados após sanitização:", dadosLimpos);

    // Validar dados
    const errosValidacao = validateData(dadosLimpos);
    if (errosValidacao.length > 0) {
      console.log("Erros de validação:", errosValidacao);
      return res.status(400).json({
        erro: "Dados inválidos",
        detalhes: errosValidacao,
      });
    }

    const { nome, email, telefone } = dadosLimpos;

    // Preparar payload para ActiveCampaign
    const contactPayload = {
      contact: {
        email: email,
        firstName: nome,
        phone: telefone,
      },
    };

    console.log(
      "Enviando para ActiveCampaign:",
      JSON.stringify(contactPayload, null, 2)
    );

    // Criar contato no ActiveCampaign
    const contactResponse = await axios.post(
      `${API_URL}/contacts`,
      contactPayload,
      {
        headers: {
          "Api-Token": API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 segundos de timeout
      }
    );

    console.log("Resposta do ActiveCampaign:", contactResponse.data);

    const contactId = contactResponse.data.contact.id;

    // Adicionar contato à lista (ID 4)
    const listPayload = {
      contactList: {
        list: 4,
        contact: contactId,
        status: 1,
      },
    };

    console.log("Adicionando à lista:", JSON.stringify(listPayload, null, 2));

    await axios.post(`${API_URL}/contactLists`, listPayload, {
      headers: {
        "Api-Token": API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log("Contato adicionado à lista com sucesso!");

    res.status(200).json({
      mensagem: "Contato adicionado e inscrito com sucesso!",
      contactId: contactId,
    });
  } catch (error) {
    console.error("Erro completo:", error);

    // Log detalhado do erro
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);

      // Retornar erro específico do ActiveCampaign se disponível
      if (error.response.data && error.response.data.errors) {
        return res.status(400).json({
          erro: "Erro na API do ActiveCampaign",
          detalhes: error.response.data.errors,
        });
      }
    } else if (error.request) {
      console.error("Erro de rede:", error.request);
      return res.status(503).json({
        erro: "Erro de conexão com o ActiveCampaign. Tente novamente em alguns minutos.",
      });
    }

    res.status(500).json({
      erro: "Erro interno do servidor. Tente novamente em alguns minutos.",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("ActiveCampaign API URL:", API_URL);
});
