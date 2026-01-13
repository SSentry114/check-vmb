const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { searchFlights } = require('./searchFlights');

const BOT_TOKEN = '8270159218:AAEYyi8uGis2NfRiE9_2hwZAyVqHhYZCzy0';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log('🤖 Bot is running...');

bot.onText(/\/check_vmb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  try {
    const args = match[1].split(' ');
    const route = args[0]; // BKK-SGN
    const date = args[1];  // 13/01/2026

    const [from, to] = route.split('-');
    const formattedDate = date.split('/').reverse().join('-');

    bot.sendMessage(chatId, '🔍 Đang tra cứu vé máy bay...');

    const flights = await searchFlights(from, to, formattedDate);

    if (flights.length === 0) {
      return bot.sendMessage(chatId, '❌ Không tìm thấy chuyến bay');
    }

    let reply = `✈️ *Danh sách chuyến bay ${from} → ${to}*\n📅 ${date}\n\n`;

    flights.forEach((f, i) => {
      reply += `${i + 1}. ${f.airline}\n`;
      reply += `🕒 ${f.departure} → ${f.arrival}\n`;
      reply += `💰 ${f.price} USD\n\n`;
    });

    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '⚠️ Lỗi khi tra cứu vé');
  }
});
