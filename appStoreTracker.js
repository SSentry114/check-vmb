const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'appstore_data.json');

let apps = {};

// Load data khi start
if (fs.existsSync(DATA_FILE)) {
  apps = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2));
}

async function fetchApp(bundleId) {
  const url = `https://itunes.apple.com/lookup?bundleId=${bundleId}`;
  const res = await axios.get(url);
  return res.data;
}

function addApp(bundleId, chatId) {
  if (!apps[bundleId]) {
    apps[bundleId] = {
      bundleId,
      chatId,
      exists: false,
      version: null,
      trackName: null,
      sellerName: null
    };
    saveData();
  }
}

function startTracking(bot) {
  setInterval(async () => {
    for (const bundleId of Object.keys(apps)) {
      const app = apps[bundleId];

      try {
        const data = await fetchApp(bundleId);

        // ===== APP EXISTS =====
        if (data.resultCount > 0) {
          const info = data.results[0];
          const currentVersion = info.version;

          // App lên lần đầu
          if (!app.exists) {
            await bot.sendMessage(
              app.chatId,
              `🎉 *App đã lên App Store!*\n\n📱 ${info.trackName}\n🆕 Version: ${currentVersion}\n🌍 ${info.trackViewUrl}`,
              { parse_mode: 'Markdown' }
            );
          }

          // Version mới
          if (app.version && app.version !== currentVersion) {
            await bot.sendMessage(
              app.chatId,
              `🚀 *App có version mới!*\n\n📱 ${info.trackName}\n🔁 ${app.version} → ${currentVersion}`,
              { parse_mode: 'Markdown' }
            );
          }

          // Update snapshot
          app.exists = true;
          app.version = currentVersion;
          app.trackName = info.trackName;
          app.sellerName = info.sellerName;

        } 
        // ===== APP DIE / REMOVED =====
        else {
          if (app.exists) {
            await bot.sendMessage(
              app.chatId,
              `⚠️ *App đã bị gỡ khỏi App Store!*\n\n📱 ${app.trackName}\n🔗 ${bundleId}`,
              { parse_mode: 'Markdown' }
            );
          }

          app.exists = false;
          app.version = null;
        }

        saveData();

      } catch (err) {
        console.error('❌ AppStore check error:', err.message);
      }
    }
  }, 5 * 60 * 1000);
}

module.exports = {
  startTracking,
  addApp
};
