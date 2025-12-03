const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const app = express();

// Configurar o servidor para servir arquivos estáticos
app.use(express.static('.'));

// Configurar o servidor PeerJS
const server = app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});

app.use('/peerjs', peerServer);

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para a página do morador
app.get('/morador', (req, res) => {
  res.sendFile(path.join(__dirname, 'morador.html'));
});

// Rota para a página do visitante
app.get('/visitante', (req, res) => {
  res.sendFile(path.join(__dirname, 'visitante.html'));
});
