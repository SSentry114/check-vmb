const TelegramBot = require('node-telegram-bot-api');
const { searchFlights } = require('./searchFlights');
require('dotenv').config();
const { startTracking, addApp } = require('./appStoreTracker');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:nWCtPjsjbVwhnfqPFmNfqNpYMVprYoaU@interchange.proxy.rlwy.net:32107/railway'
});
const bot = new TelegramBot("8270159218:AAEYyi8uGis2NfRiE9_2hwZAyVqHhYZCzy0", { polling: true });
startTracking(bot);
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

bot.onText(/\/checking_app (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const rawInput = match[1].trim();

  // Tách bundleId bằng dấu phẩy, loại bỏ khoảng trắng
  const bundleIds = rawInput.split(',').map(b => b.trim()).filter(b => b.length > 0);

  if (bundleIds.length === 0) {
    return bot.sendMessage(chatId, '❌ Bạn chưa nhập bundleId nào.');
  }

  // Kiểm tra từng bundleId hợp lệ
  const invalids = bundleIds.filter(b => !b.includes('.'));
  if (invalids.length > 0) {
    return bot.sendMessage(chatId, `❌ BundleId không hợp lệ: ${invalids.join(', ')}`);
  }

  // Thêm từng bundleId vào DB
  for (const bundleId of bundleIds) {
    await addApp(bundleId, chatId);
  }

  bot.sendMessage(
    chatId,
    `📡 Đã thêm các app vào hệ thống theo dõi vĩnh viễn:\n🔹 ${bundleIds.join('\n🔹 ')}\n⏱ Kiểm tra mỗi 5 phút`
  );
});
