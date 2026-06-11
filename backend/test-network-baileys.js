const WebSocket = require('ws');

console.log('='.repeat(60));
console.log('TESTE WEBSOCKET - WhatsApp');
console.log('='.repeat(60));
console.log();

// URL do WebSocket do WhatsApp (usada pelo Baileys)
const wsUrl = 'wss://web.whatsapp.com/ws/chat';

console.log(' Testando WebSocket do WhatsApp...');
console.log('-'.repeat(60));

const start = Date.now();
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  const duration = Date.now() - start;
  console.log(`✅ CONECTADO em ${duration}ms`);
  ws.close();
});

ws.on('error', (e) => {
  const duration = Date.now() - start;
  console.log(`❌ ERRO: ${e.message}`);
  console.log(`️  TEMPO: ${duration}ms`);
});

ws.on('close', () => {
  const duration = Date.now() - start;
  console.log(`🔒 FECHADO após ${duration}ms`);
  console.log();
  console.log('='.repeat(60));
  console.log('TESTE CONCLUÍDO');
  console.log('='.repeat(60));
});

// Timeout de 15 segundos
setTimeout(() => {
  if (ws.readyState !== WebSocket.CLOSED) {
    const duration = Date.now() - start;
    console.log(`⏰ TIMEOUT após ${duration}ms`);
    ws.close();
  }
}, 15000);
