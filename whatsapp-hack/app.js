//Importando bibliotecas
const express = require('express');
const { create } = require('venom-bot');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

//Iniciando serviços
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//Configurando a aplicação
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;
let venomClient = null;
let venomStatus = null;
let venomQR = null;

// URL leitura/status da conexão
app.get('/', (req, res) => {
    res.render('index', { venomStatus, venomQR });
});

// URL envio de mensagens (Form)
app.get('/send', (req, res) => {
    res.render('send');
});

// URL envio de mensagens (Json)
app.post('/send-message', (req, res) => {
    const { number, message } = req.body;

    if (venomClient) {
        venomClient
            .sendText(`55${number}@c.us`, message)
            .then((result) => res.status(200).json({ status: 'success', result }))
            .catch((error) => res.status(500).json({ status: 'error', error }));
    } else {
        res.status(500).json({ status: 'error', message: 'WhatsApp não conectado.' });
    }
});

// Criando sessão Venom-bot e capturando QR/Status
venomClient = create({
    session: 'whatsapp-bot',
    multidevice: true,
},
    // Gerencia mudanças na variável base64Qr
    (base64Qr) => {
        venomQR = base64Qr;
        io.emit('qr', base64Qr);
    },
    // Gerencia mudanças na variável statusFind
    (statusFind) => {
        venomStatus = statusFind;
        io.emit('status', statusFind);
    });

//Configurando ações quando o cliente é inicializado.
venomClient.then(async (client) => {
    venomClient = client;

    // Gerencia mudanças de status
    client.onStateChange((state) => {
        venomStatus = state;
        io.emit('status', state);
    });

    // Listener para mensagens recebidas
    client.onMessage(async (message) => {
        try {
            console.log('Received Message:', message);

            // Adicionando múltiplas condições e validações
            if (message.isGroupMsg === false) {
                if (message.body.toLowerCase() === 'hi') {
                    await sendMessage(client, message.from, 'Bem-vindo ao Venom 🕷');
                } else if (message.body.toLowerCase().includes('dev')) {
                    await sendMessage(client, message.from, 'Bem-vindo dev!');
                } else if (message.from === '55NUMERO_COM_DDD@c.us') {
                    await sendMessage(client, message.from, 'Você é 55NUMERO_COM_DDD@c.us!');
                }
            }
        } catch (error) {
            console.error('Erro onMessage:', error);
        }
    });
}).catch((err) => {
    console.error('Erro Venom-bot:', err);
});

async function sendMessage(client, to, message) {
    try {
        const result = await client.sendText(to, message);
        console.log('Mensagem enviada:', result);
    } catch (error) {
        console.error('Erro ao enviar:', error);
    }
}

io.on('connection', (socket) => {
    console.log('Client conectado ao Socket.io');
    socket.on('disconnect', () => console.log('Client desconectado do Socket.io'));
});

// Iniciar o servidor
server.listen(PORT, () => {
    console.log(`Servidor executando na porta: ${PORT}`);
});  
