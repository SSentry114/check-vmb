const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:nWCtPjsjbVwhnfqPFmNfqNpYMVprYoaU@interchange.proxy.rlwy.net:32107/railway",
});

async function addApp(bundleId, chatId) {
  await pool.query(
    `INSERT INTO app_store_apps(bundle_id, chat_id)
     VALUES($1, $2)
     ON CONFLICT (bundle_id) DO NOTHING`,
    [bundleId, chatId]
  );
}

async function fetchApp(bundleId) {
  const url = `https://itunes.apple.com/lookup?bundleId=${bundleId}`;
  const res = await axios.get(url);
  return res.data;
}

async function getTrackedApps() {
  const res = await pool.query(`SELECT * FROM app_store_apps`);
  return res.rows;
}

async function updateApp(app) {
  await pool.query(
    `UPDATE app_store_apps
     SET exists=$1, version=$2, track_name=$3, seller_name=$4, last_checked=NOW()
     WHERE bundle_id=$5`,
    [app.exists, app.version, app.track_name, app.seller_name, app.bundle_id]
  );
}

function startTracking(bot) {
  setInterval(async () => {
    const apps = await getTrackedApps();

    for (const app of apps) {
      try {
        const data = await fetchApp(app.bundle_id);

        if (data.resultCount > 0) {
          const info = data.results[0];
          const currentVersion = info.version;

          // App lên lần đầu
          if (!app.exists) {
            await bot.sendMessage(
              app.chat_id,
              `🎉 *App đã lên App Store!*\n\n📱 ${info.trackName}\n🆕 Version: ${currentVersion}\n🌍 ${info.trackViewUrl}`,
              { parse_mode: 'Markdown' }
            );
          }

          // Version mới
          if (app.version && app.version !== currentVersion) {
            await bot.sendMessage(
              app.chat_id,
              `🚀 *App có version mới!*\n📱 ${info.trackName}\n🔁 ${app.version} → ${currentVersion}`,
              { parse_mode: 'Markdown' }
            );
          }

          // Update DB
          await updateApp({
            ...app,
            exists: true,
            version: currentVersion,
            track_name: info.trackName,
            seller_name: info.sellerName
          });

        } else {
          // App bị gỡ
          if (app.exists) {
            await bot.sendMessage(
              app.chat_id,
              `⚠️ *App đã bị gỡ khỏi App Store!*\n📱 ${app.track_name}\n🔗 ${app.bundle_id}`,
              { parse_mode: 'Markdown' }
            );
          }

          await updateApp({ ...app, exists: false, version: null });
        }

      } catch (err) {
        console.error('❌ AppStore check error:', err.message);
      }
    }

  }, 5 * 60 * 1000); // 5 phút
}

module.exports = { addApp, startTracking };
