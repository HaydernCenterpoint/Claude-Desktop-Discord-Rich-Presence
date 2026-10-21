#!/usr/bin/env node
/**
 * Auto-Patcher Daemon: Tự động gắn lại plugin vào mọi bản cập nhật mới của Discord (app-1.0.xxxx)
 */
const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || '';
const localAppData = process.env.LOCALAPPDATA || '';
const pluginDir = path.join(appData, 'discord-rpc-plugin');
const masterPatchPath = path.join(pluginDir, 'RPCIPC.patched.js');
const discordLocal = path.join(localAppData, 'Discord');

function checkAndPatchDiscord() {
  try {
    if (!fs.existsSync(masterPatchPath) || !fs.existsSync(discordLocal)) return;
    const entries = fs.readdirSync(discordLocal, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && e.name.startsWith('app-')) {
        const targetRpc = path.join(
          discordLocal,
          e.name,
          'modules',
          'discord_rpc-1',
          'discord_rpc',
          'RPCIPC.js'
        );
        if (fs.existsSync(targetRpc)) {
          const st = fs.statSync(targetRpc);
          if (st.size < 8000) {
            fs.copyFileSync(masterPatchPath, targetRpc);
          }
        }
      }
    }
  } catch (e) {}
}

checkAndPatchDiscord();
setInterval(checkAndPatchDiscord, 15000);
