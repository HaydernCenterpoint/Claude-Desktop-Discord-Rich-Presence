#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
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
      activityName: "Đang lập trình plugin Discord RPC",
      status: "Đang hoạt động • Sẵn sàng",
      model: "Claude Opus 4.8 (1M Context)",
      showTimestamp: true,
      resetTimestampOnUpdate: false,
      assets: {
        largeImageKey: "claude_logo",
        largeImageText: "Model: {model}",
        smallImageKey: "mode_icon",
        smallImageText: "Chế độ: {mode}",
      },
      buttons: [
        {
          label: "Claude AI",
          url: "https://claude.ai",
        },
      ],
      displayTemplate: {
        details: "[{mode}] {activityName}",
        state: "{status} | ⚡ {model}",
      },
    };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

let config = loadConfig();
const logs = [];

function addLog(msg) {
  const time = new Date().toLocaleTimeString("vi-VN");
  const entry = `[${time}] ${msg}`;
  console.log(entry);
  logs.unshift(entry);
  if (logs.length > 50) logs.pop();
}

let rpc = new DiscordIPC(config.clientId, addLog);
rpc.connect().then(() => {
  rpc.setActivity(config);
});

const HTML_PAGE = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Discord Rich Presence - Bảng Điều Khiển</title>
  <style>
    :root {
      --bg: #0f1117;
      --card: #181b23;
      --discord-card: #111214;
      --border: #2a2f3d;
      --accent: #5865f2;
      --accent-hover: #4752c4;
      --green: #23a55a;
      --text: #f2f3f5;
      --muted: #949ba4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 28px 20px;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 24px;
    }
    @media (max-width: 820px) {
      .container { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 22px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 20px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      font-weight: 600;
    }
    .badge.online { background: rgba(35,165,90,0.18); color: #4ade80; }
    .badge.offline { background: rgba(239,68,68,0.18); color: #f87171; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .form-group { margin-bottom: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      margin-bottom: 6px;
    }
    input, select {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0d0f14;
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus, select:focus { border-color: var(--accent); }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .chip {
      font-size: 11.5px;
      background: #232733;
      color: #cbd5e1;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .chip:hover { background: var(--accent); color: white; border-color: var(--accent); }
    .btn-row {
      display: flex;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
    }
    button {
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary { background: var(--accent); color: white; flex: 1; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: #2b2d31; color: var(--text); }
    .btn-secondary:hover { background: #383a40; }
    .btn-danger { background: rgba(239,68,68,0.16); color: #f87171; }
    .btn-danger:hover { background: rgba(239,68,68,0.28); }

    /* Discord Live Preview Card */
    .discord-preview {
      background: var(--discord-card);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #232428;
      margin-bottom: 18px;
    }
    .dp-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }
    .dp-body {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .dp-avatar-wrap {
      position: relative;
      width: 68px;
      height: 68px;
      flex-shrink: 0;
    }
    .dp-large-img {
      width: 68px;
      height: 68px;
      border-radius: 14px;
      background: linear-gradient(135deg, #d97757, #b85435);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 26px;
      color: #fff;
    }
    .dp-small-img {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--accent);
      border: 3px solid var(--discord-card);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
    .dp-info { flex: 1; min-width: 0; }
    .dp-appname { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 2px; }
    .dp-line {
      font-size: 13px;
      color: #dbdee1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.35;
    }
    .dp-timer {
      font-size: 12.5px;
      color: #23a55a;
      font-weight: 600;
      margin-top: 4px;
    }
    .log-box {
      background: #0b0c10;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      font-family: Consolas, monospace;
      font-size: 12px;
      color: #94a3b8;
      height: 190px;
      overflow-y: auto;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="panel">
      <h1>
        <span>🎮 Discord Rich Presence Plugin</span>
        <span id="connBadge" class="badge offline"><span class="dot"></span> Đang kiểm tra...</span>
      </h1>
      <p class="subtitle">Điều chỉnh trực tiếp 5 thông số: Chế độ, Tên hoạt động, Trạng thái, Model và Thời gian</p>

      <div class="form-row">
        <div class="form-group">
          <label>1. Chế độ (Mode)</label>
          <input id="mode" type="text" placeholder="VD: Cowork, Code, Chat..." />
          <div class="presets">
            <span class="chip" onclick="setVal('mode','Cowork (Agent Mode)')">Cowork</span>
            <span class="chip" onclick="setVal('mode','Claude Code')">Claude Code</span>
            <span class="chip" onclick="setVal('mode','Chat')">Chat</span>
            <span class="chip" onclick="setVal('mode','Debug & Fix')">Debug</span>
          </div>
        </div>

        <div class="form-group">
          <label>4. Model đang dùng</label>
          <input id="model" type="text" placeholder="VD: Claude Opus 4.8" />
          <div class="presets">
            <span class="chip" onclick="setVal('model','Claude Opus 4.8 (1M)')">Opus 4.8 (1M)</span>
            <span class="chip" onclick="setVal('model','Claude Sonnet 4.6')">Sonnet 4.6</span>
            <span class="chip" onclick="setVal('model','Gemini 4 Argon')">Gemini 4 Argon</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>2. Tên hoạt động (Activity / Details)</label>
        <input id="activityName" type="text" placeholder="VD: Đang xây dựng plugin Discord Rich Presence" />
        <div class="presets">
          <span class="chip" onclick="setVal('activityName','Đang lập trình dự án mới')">Đang lập trình</span>
          <span class="chip" onclick="setVal('activityName','Đang tối ưu hóa mã nguồn')">Tối ưu code</span>
          <span class="chip" onclick="setVal('activityName','Đang nghiên cứu tài liệu')">Nghiên cứu</span>
          <span class="chip" onclick="setVal('activityName','Đang mod Project Zomboid')">Mod Project Zomboid</span>
        </div>
      </div>

      <div class="form-group">
        <label>3. Trạng thái (Status / State)</label>
        <input id="status" type="text" placeholder="VD: Đang thực thi tác vụ • Sẵn sàng" />
        <div class="presets">
          <span class="chip" onclick="setVal('status','Đang hoạt động • Sẵn sàng')">Sẵn sàng</span>
          <span class="chip" onclick="setVal('status','Đang suy nghĩ sâu (Thinking)...')">Đang suy nghĩ</span>
          <span class="chip" onclick="setVal('status','Đang chạy Agent tự động')">Chạy Agent</span>
          <span class="chip" onclick="setVal('status','Đang nghỉ / AFK')">AFK</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Định dạng dòng 1 (Details)</label>
          <input id="tplDetails" type="text" placeholder="[{mode}] {activityName}" />
        </div>
        <div class="form-group">
          <label>Định dạng dòng 2 (State)</label>
          <input id="tplState" type="text" placeholder="{status} | ⚡ {model}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Discord Application Client ID</label>
          <input id="clientId" type="text" placeholder="Nhập Application ID trên Discord Developer Portal" />
        </div>
        <div class="form-group">
          <label>5. Bộ đếm thời gian (Timestamp)</label>
          <select id="showTimestamp">
            <option value="true">Hiển thị thời gian đã trôi qua (00:00)</option>
            <option value="false">Ẩn bộ đếm thời gian</option>
          </select>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn-primary" onclick="saveAndApply(false)">💾 Cập nhật ngay lên Discord</button>
        <button class="btn-secondary" onclick="saveAndApply(true)">⏱️ Đặt lại thời gian (00:00)</button>
        <button class="btn-danger" onclick="clearRpc()">Ẩn RPC</button>
      </div>
    </div>

    <div class="panel">
      <div class="discord-preview">
        <div class="dp-header">Xem trước hiển thị trên hồ sơ Discord</div>
        <div class="dp-body">
          <div class="dp-avatar-wrap">
            <div class="dp-large-img">C</div>
            <div class="dp-small-img">⚡</div>
          </div>
          <div class="dp-info">
            <div class="dp-appname">Claude AI</div>
            <div class="dp-line" id="prevDetails">[Cowork] Đang lập trình plugin</div>
            <div class="dp-line" id="prevState">Đang hoạt động | ⚡ Claude Opus 4.8</div>
            <div class="dp-timer" id="prevTimer">00:00 đã trôi qua</div>
          </div>
        </div>
      </div>

      <label>Nhật ký kết nối (IPC Logs)</label>
      <div class="log-box" id="logBox">Đang tải...</div>
    </div>
  </div>

  <script>
    let startTs = Math.floor(Date.now() / 1000);

    function setVal(id, val) {
      document.getElementById(id).value = val;
      updatePreview();
    }

    function fmtTemplate(tpl, vars) {
      return (tpl || '')
        .replace(/\\{mode\\}/g, vars.mode)
        .replace(/\\{activityName\\}/g, vars.activityName)
        .replace(/\\{status\\}/g, vars.status)
        .replace(/\\{model\\}/g, vars.model);
    }

    function updatePreview() {
      const vars = {
        mode: document.getElementById('mode').value || 'Cowork',
        activityName: document.getElementById('activityName').value || 'Đang làm việc',
        status: document.getElementById('status').value || 'Trực tuyến',
        model: document.getElementById('model').value || 'Claude Opus 4.8'
      };
      const dTpl = document.getElementById('tplDetails').value || '[{mode}] {activityName}';
      const sTpl = document.getElementById('tplState').value || '{status} | ⚡ {model}';

      document.getElementById('prevDetails').textContent = fmtTemplate(dTpl, vars);
      document.getElementById('prevState').textContent = fmtTemplate(sTpl, vars);
      document.getElementById('prevTimer').style.display =
        document.getElementById('showTimestamp').value === 'true' ? 'block' : 'none';
    }

    ['mode','activityName','status','model','tplDetails','tplState','showTimestamp'].forEach(id => {
      document.getElementById(id).addEventListener('input', updatePreview);
    });

    async function fetchState() {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        startTs = data.sessionStartTimestamp || startTs;

        const badge = document.getElementById('connBadge');
        if (data.connected) {
          badge.className = 'badge online';
          badge.innerHTML = '<span class="dot"></span> Đã kết nối Discord';
        } else {
          badge.className = 'badge offline';
          badge.innerHTML = '<span class="dot"></span> Chờ mở Discord...';
        }

        document.getElementById('logBox').innerHTML = data.logs.join('<br/>');
      } catch {}
    }

    async function loadInitial() {
      const res = await fetch('/api/state');
      const data = await res.json();
      const c = data.config;
      document.getElementById('mode').value = c.mode || '';
      document.getElementById('activityName').value = c.activityName || '';
      document.getElementById('status').value = c.status || '';
      document.getElementById('model').value = c.model || '';
      document.getElementById('clientId').value = c.clientId || '';
      document.getElementById('showTimestamp').value = String(c.showTimestamp !== false);
      document.getElementById('tplDetails').value = c.displayTemplate?.details || '[{mode}] {activityName}';
      document.getElementById('tplState').value = c.displayTemplate?.state || '{status} | ⚡ {model}';
      startTs = data.sessionStartTimestamp || startTs;
      updatePreview();
      fetchState();
    }

    async function saveAndApply(resetTimer) {
      const payload = {
        clientId: document.getElementById('clientId').value.trim(),
        mode: document.getElementById('mode').value,
        activityName: document.getElementById('activityName').value,
        status: document.getElementById('status').value,
        model: document.getElementById('model').value,
        showTimestamp: document.getElementById('showTimestamp').value === 'true',
        displayTemplate: {
          details: document.getElementById('tplDetails').value,
          state: document.getElementById('tplState').value
        },
        resetTimer
      };
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await fetchState();
    }

    async function clearRpc() {
      await fetch('/api/clear', { method: 'POST' });
      await fetchState();
    }

    setInterval(() => {
      const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - startTs);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      const hrs = Math.floor(elapsed / 3600);
      document.getElementById('prevTimer').textContent =
        (hrs > 0 ? String(hrs).padStart(2, '0') + ':' : '') + mins + ':' + secs + ' đã trôi qua';
    }, 1000);

    setInterval(fetchState, 2500);
    loadInitial();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(HTML_PAGE);
  }

  if (req.method === "GET" && req.url === "/api/state") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(
      JSON.stringify({
        connected: rpc.connected && rpc.ready,
        sessionStartTimestamp: rpc.sessionStartTimestamp,
        config,
        logs,
      })
    );
  }

  if (req.method === "POST" && req.url === "/api/update") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const clientIdChanged =
          data.clientId && data.clientId !== config.clientId;

        config = {
          ...config,
          clientId: data.clientId || config.clientId,
          mode: data.mode ?? config.mode,
          activityName: data.activityName ?? config.activityName,
          status: data.status ?? config.status,
          model: data.model ?? config.model,
          showTimestamp:
            data.showTimestamp !== undefined
              ? data.showTimestamp
              : config.showTimestamp,
          displayTemplate: data.displayTemplate || config.displayTemplate,
        };

        saveConfig(config);

        if (clientIdChanged) {
          addLog(`Đổi Client ID sang ${config.clientId}, đang kết nối lại...`);
          rpc.destroy();
          rpc = new DiscordIPC(config.clientId, addLog);
          rpc.connect().then(() => rpc.setActivity(config));
        } else {
          if (data.resetTimer) {
            rpc.resetTimer();
          }
          rpc.setActivity(config);
          addLog(
            `Đã cập nhật: [${config.mode}] ${config.activityName} | ${config.status} (${config.model})`
          );
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/clear") {
    rpc.clearActivity();
    addLog("Đã ẩn hiển thị Rich Presence trên Discord.");
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  addLog(`Bảng điều khiển Discord RPC đang chạy tại: http://127.0.0.1:${PORT}`);
});
