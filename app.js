const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");
const { WebSocketServer } = require("ws");
const http = require("http");

const app = express();
const port = process.env.PORT || 3001;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const wsConnections = new Set();
let currentTiktokConnection = null;

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

wss.on("connection", (ws) => {
	console.log("Nouveau client WebSocket connecté");
	wsConnections.add(ws);

	// Gérer les messages reçus du client
	ws.on("message", async (message) => {
		const data = JSON.parse(message);

		if (data.type === "connect") {
			// Déconnecter l'ancienne connexion si elle existe
			if (currentTiktokConnection) {
				await currentTiktokConnection.disconnect();
			}
			// Initialiser une nouvelle connexion TikTok
      console.log('TikTok :', data.username);
			initTiktokLiveListener(data.username, ws);
		}
	});

	ws.on("close", () => {
		console.log("Client WebSocket déconnecté");
		wsConnections.delete(ws);
	});
});
const tiktokConfig = {
  processInitialData: false,
  enableExtendedGiftInfo: false,
  enableWebsocketUpgrade: true, // Désactiver l'upgrade WebSocket
  requestPollingIntervalMs: 2000, // Utiliser le polling toutes les 2 secondes
  sessionId: process.env.TIKTOK_SESSION_ID || '123333' // Utiliser un sessionId d'environnement si disponible
};


const initTiktokLiveListener = async (tiktokLiveAccount, ws) => {
	try {
		const tiktokLiveConnection = new WebcastPushConnection(tiktokLiveAccount, tiktokConfig);
		const state = await tiktokLiveConnection.connect();
		currentTiktokConnection = tiktokLiveConnection;

		console.info(`Connecté à roomId ${state.roomId}`);
		console.info(`Connecté au compte TikTok Live ${tiktokLiveAccount}`);

		// Envoyer confirmation de connexion au client
		ws.send(
			JSON.stringify({
				type: "connection_status",
				status: "connected",
				username: tiktokLiveAccount,
			}),
		);

		let tiktokLiveLastMessage = null;

		tiktokLiveConnection.on("chat", (data) => {
			if (tiktokLiveLastMessage === data.comment) {
				console.log(`chat skip ---:${tiktokLiveLastMessage}`);
				return;
			}

			tiktokLiveLastMessage = data.comment;
			console.log(`chat:${data.comment}`);

			const response = {
				type: "chat",
				message: data.comment,
				userId: data.userId,
				username: data.uniqueId,
				timestamp: new Date().toISOString(),
			};

			wsConnections.forEach((client) => {
				if (client.readyState === 1) {
					client.send(JSON.stringify(response));
				}
			});
		});

		tiktokLiveConnection.on("error", (err) => {
			console.error("Erreur TikTok:", err);
			ws.send(
				JSON.stringify({
					type: "connection_status",
					status: "error",
					message: err.message,
				}),
			);
		});
	} catch (error) {
		console.error("Erreur de connexion TikTok Live:", error);
		ws.send(
			JSON.stringify({
				type: "connection_status",
				status: "error",
				message: error.message,
			}),
		);
	}
};

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>TikTok Live Chat</title>
    <style>
      @import url("https://p.typekit.net/p.css?s=1&k=vnd5zic&ht=tk&f=39475.39476.39477.39478.39479.39480.39481.39482&a=18673890&app=typekit&e=css");
      @font-face {
        font-family: "neo-sans";
        src: url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2");
        font-style: normal;
        font-weight: 700;
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
      }
      #connection-form {
        max-width: 600px;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 5px;
      }
      #username-input {
        width: 70%;
        padding: 10px;
        margin-right: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      #connect-button {
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      #connect-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
      #status-message {
        margin: 10px 0;
        padding: 10px;
        border-radius: 4px;
      }
      .success {
        background-color: #dff0d8;
        color: #3c763d;
      }
      .error {
        background-color: #f2dede;
        color: #a94442;
      }
      #chat-container {
        max-width: 600px;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 5px;
        height: 400px;
        overflow-y: auto;
      }
      .chat-message {
        margin: 10px 0;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 5px;
      }
      .username {
        font-weight: bold;
        color: #333;
      }
      #loading {
        display: none;
        text-align: center;
        margin: 10px 0;
      }
    </style>
  </head>
  <body>
    <div id="connection-form">
      <input type="text" id="username-input" placeholder="Entrez le nom d'utilisateur TikTok">
      <button id="connect-button">Connecter</button>
      <div id="loading">Connexion en cours...</div>
      <div id="status-message" style="display: none;"></div>
    </div>
    <div id="chat-container"></div>

    <script>
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(\`\${wsProtocol}//\${window.location.host}\`);
      const chatContainer = document.getElementById('chat-container');
      const usernameInput = document.getElementById('username-input');
      const connectButton = document.getElementById('connect-button');
      const loadingDiv = document.getElementById('loading');
      const statusMessage = document.getElementById('status-message');

      connectButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
          connectButton.disabled = true;
          loadingDiv.style.display = 'block';
          statusMessage.style.display = 'none';
          
          ws.send(JSON.stringify({
            type: 'connect',
            username: username
          }));
        }
      });

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connection_status') {
          loadingDiv.style.display = 'none';
          statusMessage.style.display = 'block';
          
          if (data.status === 'connected') {
            statusMessage.className = 'success';
            statusMessage.textContent = \`Connecté au live de \${data.username}\`;
          } else if (data.status === 'error') {
            statusMessage.className = 'error';
            statusMessage.textContent = \`Erreur: \${data.message}\`;
            connectButton.disabled = false;
          }
        }
        else if (data.type === 'chat') {
          const messageDiv = document.createElement('div');
          messageDiv.className = 'chat-message';
          messageDiv.innerHTML = \`
            <span class="username">\${data.username}:</span>
            <span class="message">\${data.message}</span>
          \`;
          
          chatContainer.appendChild(messageDiv);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      };

      ws.onclose = () => {
        console.log('Connexion WebSocket fermée');
        statusMessage.className = 'error';
        statusMessage.textContent = 'Connexion perdue. Veuillez rafraîchir la page.';
        statusMessage.style.display = 'block';
        connectButton.disabled = false;
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        statusMessage.className = 'error';
        statusMessage.textContent = 'Erreur de connexion. Veuillez réessayer.';
        statusMessage.style.display = 'block';
        connectButton.disabled = false;
      };
    </script>
  </body>
</html>
`;

app.get("/", (req, res) => res.type("html").send(html));

server.listen(port, () => {
	console.log(`Serveur démarré sur le port ${port}`);
});
