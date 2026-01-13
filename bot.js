const TelegramBot = require('node-telegram-bot-api');
const { searchFlights } = require('./searchFlights');
require('dotenv').config();

const bot = new TelegramBot("8270159218:AAEYyi8uGis2NfRiE9_2hwZAyVqHhYZCzy0", { polling: true });

console.log('🤖 Bot is running...');

bot.onText(/\/check_vmb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(' ');

  // Validate input
  if (args.length !== 2) {
    return bot.sendMessage(chatId, '❌ Lỗi cú pháp. Ví dụ: /check_vmb BKK-SGN 13/01/2026');
  }

  const route = args[0]; // BKK-SGN
  const date = args[1];  // 13/01/2026

  // Tách from/to
  const routeParts = route.split('-');
  if (routeParts.length !== 2 || routeParts[0].length !== 3 || routeParts[1].length !== 3) {
    return bot.sendMessage(chatId, '❌ Mã sân bay phải là 3 ký tự. Ví dụ: BKK-SGN');
  }

  const [from, to] = routeParts.map(r => r.toUpperCase());

  // Chuyển date sang YYYY-MM-DD
  const dateParts = date.split('/');
  if (dateParts.length !== 3) {
    return bot.sendMessage(chatId, '❌ Ngày phải theo format DD/MM/YYYY');
  }
  const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2,'0')}-${dateParts[0].padStart(2,'0')}`;

  console.log('🛫 from:', from, 'to:', to, 'date:', formattedDate);

  // Gửi thông báo đang tra cứu
  bot.sendMessage(chatId, '🔍 Đang tra cứu vé máy bay...');

  try {
    const flights = await searchFlights(from, to, formattedDate);

    if (!flights || flights.length === 0) {
      return bot.sendMessage(chatId, '❌ Không tìm thấy chuyến bay');
    }

    // Format reply
    let reply = `✈️ *Danh sách chuyến bay ${from} → ${to}*\n📅 ${formattedDate}\n\n`;
    flights.forEach((f, i) => {
      reply += `${i + 1}. ${f.airline}\n🕒 ${f.departure} → ${f.arrival}\n💰 ${f.price * 27} VND\n\n`;
    });

    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error("💥 Lỗi searchFlights:", err.response?.data || err.message || err);
    bot.sendMessage(chatId, '⚠️ Lỗi khi tra cứu vé máy bay');
  }
});