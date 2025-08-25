const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

// CORS totalmente aberto (apenas para teste/emergência)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
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
  console.log("Origin da requisição:", req.headers.origin);

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
        timeout: 15000, // 15 segundos de timeout
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
      timeout: 15000,
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
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    cors: "enabled",
  });
});

// Endpoint de teste para verificar CORS
app.get("/test-cors", (req, res) => {
  res.json({
    message: "CORS está funcionando!",
    origin: req.headers.origin,
    method: req.method,
    headers: req.headers,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("ActiveCampaign API URL:", API_URL);
  console.log("CORS configurado para aceitar qualquer origem");
});
