import express from 'express';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

// Obtenir le chemin du répertoire actuel en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

const server = createServer(app);
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
		currentTiktokConnection.disconnect()
	});
});

const tiktokConfig = {
	processInitialData: false,
	enableExtendedGiftInfo: false,
	enableWebsocketUpgrade: true,
	requestPollingIntervalMs: 2000,
	sessionId: process.env.TIKTOK_SESSION_ID || '123333'
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

// Servir l'index.html
app.get("/", async (req, res) => {
	try {
		const htmlPath = join(__dirname, 'index.html');
		const content = await readFile(htmlPath, 'utf8');
		res.type('html').send(content);
	} catch (error) {
		console.error('Erreur lors de la lecture du fichier HTML:', error);
		res.status(500).send('Erreur serveur');
	}
});

server.listen(port, () => {
	console.log(`Serveur démarré sur le port ${port}`);
});