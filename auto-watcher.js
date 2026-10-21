#!/usr/bin/env node
/**
 * Claude Auto-Watcher & Discord Rich Presence Daemon (Đã sửa lỗi nhận diện Claude-3p & Client ID thật)
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { exec } = require("child_process");
const { DiscordIPC } = require("./discord-ipc");

const CONFIG_PATH = path.join(__dirname, "config.json");
const PORT = Number(process.env.RPC_PORT || 3847);

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {
      clientId: "1472915568930848829",
      mode: "Cowork (Agent Mode)",
      activityName: "Đang làm việc trên Claude Desktop",
      status: "Đang hoạt động • Trực tuyến",
      model: "Gemini 4 Argon / Opus 4.8 (1M)",
      showTimestamp: true,
      autoWatchClaudeDesktop: true,
      onlyShowWhenClaudeRunning: false,
      displayTemplate: {
        details: "[{mode}] {activityName}",
        state: "{status} | ⚡ {model}",
      },
    };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  } catch {}
}

let config = loadConfig();
// Tự động nâng cấp Client ID giả cũ sang Client ID thật
if (config.clientId === "1352019483928475698" || !config.clientId) {
  config.clientId = "1472915568930848829";
  saveConfig(config);
}

const logs = [];
function addLog(msg) {
  const time = new Date().toLocaleTimeString("vi-VN");
  const entry = `[${time}] ${msg}`;
  console.log(entry);
  logs.unshift(entry);
  if (logs.length > 60) logs.pop();
}

let rpc = new DiscordIPC(config.clientId, addLog);
let claudeWasRunning = false;
let manualOverride = false;

/**
 * Kiểm tra xem bất kỳ tiến trình nào có chữ "claude" (Claude.exe, Claude-3p.exe...) đang chạy hay không
 */
function checkClaudeProcessRunning() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      return resolve(true);
    }
    exec("tasklist /NH", { windowsHide: true, maxBuffer: 1024 * 1024 * 4 }, (err, stdout) => {
      if (err || !stdout) return resolve(true);
      const lower = stdout.toLowerCase();
      const isRunning = lower.includes("claude");
      resolve(isRunning);
    });
  });
}

function formatModelName(rawModel) {
  const m = String(rawModel).toLowerCase();
  if (m.includes("opus-4-8") || m.includes("opus-4.8"))
    return "Gemini 4 Argon / Opus 4.8 (1M)";
  if (m.includes("opus")) return "Claude Opus";
  if (m.includes("sonnet-4")) return "Claude Sonnet 4.6";
  if (m.includes("haiku")) return "Claude Haiku";
  return rawModel;
}

function detectActiveClaudeSessionInfo() {
  try {
    const localAppData = process.env.LOCALAPPDATA || "";
    const appData = process.env.APPDATA || "";

    const candidates = [
      path.join(localAppData, "Claude-3p", "local-agent-mode-sessions"),
      path.join(appData, "Claude", "local-agent-mode-sessions"),
    ];

    let newestFile = null;
    let newestMtime = 0;

    function scanDir(dir, depth = 0) {
      if (depth > 4 || !fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== "node_modules" && e.name !== ".git") {
            scanDir(fullPath, depth + 1);
          }
        } else if (e.name.endsWith(".jsonl") || e.name === "session.json") {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > newestMtime) {
              newestMtime = stat.mtimeMs;
              newestFile = fullPath;
            }
          } catch {}
        }
      }
    }

    for (const base of candidates) {
      scanDir(base, 0);
    }

    if (!newestFile) return null;

    const isRecent = Date.now() - newestMtime < 5 * 60 * 1000;
    const content = fs.readFileSync(newestFile, "utf8");
    const lines = content.trim().split(/\r?\n/).slice(-15);

    let detectedModel = null;
    let detectedTitle = null;

    for (const line of lines.reverse()) {
      try {
        const obj = JSON.parse(line);
        if (!detectedModel && obj.model) detectedModel = obj.model;
        if (!detectedTitle && obj.title) detectedTitle = obj.title;
      } catch {}
    }

    return {
      mode: "Cowork (Agent Mode)",
      status: isRecent
        ? "Đang thực thi tác vụ • Trực tuyến"
        : "Đang mở Claude • Sẵn sàng",
      model: detectedModel ? formatModelName(detectedModel) : null,
      activityName: detectedTitle || null,
    };
  } catch {
    return null;
  }
}

async function pollLoop() {
  const isClaudeRunning = await checkClaudeProcessRunning();

  // Luôn bật ngay từ lần đầu chạy hoặc khi Claude mở
  if (isClaudeRunning || config.onlyShowWhenClaudeRunning === false) {
    if (!claudeWasRunning) {
      claudeWasRunning = true;
      addLog("🚀 Đang kích hoạt hiển thị Discord Rich Presence...");
      await rpc.connect();
      rpc.setActivity(config);
    } else if (rpc.connected && rpc.ready) {
      // Đảm bảo giữ kết nối liên tục mỗi chu kỳ
      rpc.setActivity(config);
    }
  } else if (!isClaudeRunning && claudeWasRunning && config.onlyShowWhenClaudeRunning === true) {
    claudeWasRunning = false;
    addLog("💤 Claude đã đóng. Tự động ẩn Discord Rich Presence.");
    rpc.clearActivity();
  }

  if (config.autoWatchClaudeDesktop !== false && !manualOverride) {
    const info = detectActiveClaudeSessionInfo();
    if (info) {
      let changed = false;
      if (info.status && info.status !== config.status) {
        config.status = info.status;
        changed = true;
      }
      if (info.model && info.model !== config.model) {
        config.model = info.model;
        changed = true;
      }
      if (info.activityName && info.activityName !== config.activityName) {
        config.activityName = info.activityName;
        changed = true;
      }
      if (changed) {
        saveConfig(config);
        rpc.setActivity(config);
      }
    }
  }
}

// Gửi Activity ngay lập tức khi khởi động
rpc.setActivity(config);
rpc.connect().then(() => {
  pollLoop();
  setInterval(pollLoop, 5000);
});
