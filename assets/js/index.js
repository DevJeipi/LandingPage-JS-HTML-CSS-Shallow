const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = '6459226b857ce0283df252b9c1bc9fc63a2cbcd0a3a3e6b697fc08d246c23ccb465f904f';
const API_URL = 'https://multigamer362.api-us1.com/api/3/contacts';

app.post('/api/enviar', async (req, res) => {
  console.log("Chegou no backend com:", req.body);

  const { nome, email, telefone } = req.body;

  try {
    const response = await axios.post(API_URL, {
      contact: {
        email,
        firstName: nome,
        phone: telefone,
        lists: [4] //ID da lista
      }
    }, {
      headers: {
        'Api-Token': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.error("Erro no try/catch:", err);
    res.status(500).json({ erro: 'Erro ao enviar para o ActiveCampaign' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando em https://api-shallow.onrender.com');
});