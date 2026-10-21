#!/usr/bin/env node
/**
 * Trình cài đặt Tự Động Khởi Chạy (Auto-Start) mỗi khi mở Claude (Bản sửa lỗi triệt để)
 */

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const appData = process.env.APPDATA;
const localAppData = process.env.LOCALAPPDATA;

if (!appData) {
  console.error("❌ Không tìm thấy biến môi trường APPDATA.");
  process.exit(1);
}

// Dừng tiến trình watcher cũ nếu đang chạy với config cũ
try {
  execSync('wmic process where "commandline like \'%auto-watcher.js%\'" call terminate', {
    stdio: "ignore",
    windowsHide: true,
  });
} catch {}

// 1. Thư mục cài đặt cố định trong máy
const installDir = path.join(appData, "Claude", "discord-rpc-plugin");
fs.mkdirSync(installDir, { recursive: true });

const filesToCopy = [
  "config.json",
  "discord-ipc.js",
  "mcp-server.js",
  "dashboard.js",
  "auto-watcher.js",
  "CustomActivityRPC.plugin.js",
  "Start-Dashboard.bat",
  "Test-Run-Now.bat",
  "README.md",
];

for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  const dest = path.join(installDir, file);
  if (fs.existsSync(src)) {
    // Luôn ghi đè để cập nhật Client ID hợp lệ mới nhất (1472915568930848829)
    fs.copyFileSync(src, dest);
  }
}

console.log(`✅ [1/3] Đã cập nhật toàn bộ mã nguồn vào: ${installDir}`);

// 2. Tích hợp vào cấu hình MCP của Claude Desktop
const configLocations = [
  path.join(appData, "Claude", "claude_desktop_config.json"),
];

if (localAppData && fs.existsSync(path.join(localAppData, "Claude-3p"))) {
  configLocations.push(
    path.join(localAppData, "Claude-3p", "claude_desktop_config.json")
  );
}
if (fs.existsSync(path.join(appData, "Claude-3p"))) {
  configLocations.push(
    path.join(appData, "Claude-3p", "claude_desktop_config.json")
  );
}

const installedMcpServerPath = path.join(installDir, "mcp-server.js");

for (const cfgPath of configLocations) {
  try {
    const dir = path.dirname(cfgPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let cfg = {};
    if (fs.existsSync(cfgPath)) {
      try {
        cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      } catch {
        fs.copyFileSync(cfgPath, cfgPath + ".bak");
        cfg = {};
      }
    }

    if (!cfg.mcpServers) cfg.mcpServers = {};
    cfg.mcpServers["discord-rich-presence"] = {
      command: "node",
      args: [installedMcpServerPath],
    };

    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), "utf8");
    console.log(`✅ [2/3] Đã gắn tự động khởi chạy cùng Claude MCP tại: ${cfgPath}`);
  } catch (err) {
    console.warn(`⚠️ Không thể ghi ${cfgPath}: ${err.message}`);
  }
}

// 3. Tạo VBScript chạy ngầm trong Windows Startup
const startupFolder = path.join(
  appData,
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs",
  "Startup"
);

const vbsPath = path.join(startupFolder, "ClaudeDiscordRPC_AutoWatcher.vbs");
const watcherJsPath = path.join(installDir, "auto-watcher.js");

const vbsContent = `' Tự động chạy ngầm bộ theo dõi Claude Desktop -> Discord Rich Presence
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${installDir.replace(/\\/g, "\\\\")}"
WshShell.Run "node ""${watcherJsPath.replace(/\\/g, "\\\\")}""", 0, False
`;

try {
  fs.writeFileSync(vbsPath, vbsContent, "utf8");
  console.log(`✅ [3/3] Đã tạo dịch vụ tự chạy ngầm: ${vbsPath}`);
} catch (err) {
  console.warn(`⚠️ Không thể tạo file Startup VBS: ${err.message}`);
}

// Khởi chạy ngay lập tức tiến trình ngầm và in kết quả kết nối thực tế trong 4 giây đầu
console.log("\n🔌 Đang kết nối trực tiếp vào Discord trên máy bạn...");
const { DiscordIPC } = require(path.join(installDir, "discord-ipc.js"));
const activeCfg = JSON.parse(fs.readFileSync(path.join(installDir, "config.json"), "utf8"));
const testRpc = new DiscordIPC(activeCfg.clientId, (msg) => console.log("   " + msg));
testRpc.setActivity(activeCfg);
testRpc.connect();

setTimeout(() => {
  testRpc.destroy();
  // Chuyển sang chạy ngầm vĩnh viễn
  try {
    const child = spawn("node", [watcherJsPath], {
      cwd: installDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    console.log("\n🚀 Tiến trình ngầm đã được bật! Hãy kiểm tra lại hồ sơ Discord của bạn ngay bây giờ.");
    console.log("💡 Lưu ý: Trong Discord Settings -> Activity Privacy, hãy bật 'Share your detected activities with others'.");
  } catch (err) {
    console.warn("⚠️ Lỗi khi bật tiến trình ngầm:", err.message);
  }
  process.exit(0);
}, 4000);
