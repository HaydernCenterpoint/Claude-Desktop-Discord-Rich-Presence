#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { DiscordIPC } = require("./discord-ipc");

const CONFIG_PATH = path.join(__dirname, "config.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {
      clientId: "1472915568930848829",
      mode: "Cowork (Agent Mode)",
      activityName: "Đang làm việc với Claude",
      status: "Đang hoạt động",
      model: "Claude Opus 4.8",
      showTimestamp: true,
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

let currentConfig = loadConfig();
const rpc = new DiscordIPC(currentConfig.clientId, (msg) => {
  process.stderr.write(`${msg}\n`);
});

rpc.connect().then(() => {
  rpc.setActivity(currentConfig);
});

// Watch config.json for external edits (from Web UI or manual edits)
fs.watchFile(CONFIG_PATH, { interval: 1500 }, () => {
  try {
    const updated = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    currentConfig = updated;
    rpc.setActivity(currentConfig);
  } catch {
    // Ignore transient read errors while saving
  }
});

const TOOLS = [
  {
    name: "discord_rpc_update",
    description:
      "Cập nhật trạng thái Discord Rich Presence (Chế độ, Tên hoạt động, Trạng thái, Model, Thời gian).",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          description:
            "Chế độ hiện tại (VD: 'Cowork', 'Code', 'Chat', 'Research', 'Debug')",
        },
        activityName: {
          type: "string",
          description:
            "Tên hoạt động đang thực hiện (VD: 'Đang viết plugin Discord', 'Đang phân tích dữ liệu')",
        },
        status: {
          type: "string",
          description:
            "Trạng thái chi tiết (VD: 'Đang chạy tác vụ (2/3)', 'Đang suy nghĩ...', 'Hoàn tất')",
        },
        model: {
          type: "string",
          description:
            "Tên Model đang sử dụng (VD: 'Claude Opus 4.8', 'Claude Sonnet 4.6', 'Gemini 4 Argon')",
        },
        resetTimer: {
          type: "boolean",
          description: "Đặt lại bộ đếm thời gian về 00:00 kể từ lúc gọi",
        },
      },
    },
  },
  {
    name: "discord_rpc_get_status",
    description: "Xem cấu hình và trạng thái kết nối Discord Rich Presence hiện tại.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "discord_rpc_clear",
    description: "Tạm ẩn / xóa hiển thị Discord Rich Presence.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

function sendJsonRpc(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function handleRpcRequest(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    return sendJsonRpc({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "discord-rich-presence-plugin",
          version: "1.0.0",
        },
      },
    });
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    return sendJsonRpc({
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS,
      },
    });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};

    if (toolName === "discord_rpc_update") {
      if (args.mode !== undefined) currentConfig.mode = args.mode;
      if (args.activityName !== undefined)
        currentConfig.activityName = args.activityName;
      if (args.status !== undefined) currentConfig.status = args.status;
      if (args.model !== undefined) currentConfig.model = args.model;

      if (args.resetTimer) {
        rpc.resetTimer();
      }

      saveConfig(currentConfig);
      const sent = rpc.setActivity(currentConfig);

      return sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  updated: true,
                  discordConnected: sent,
                  currentPresence: {
                    mode: currentConfig.mode,
                    activityName: currentConfig.activityName,
                    status: currentConfig.status,
                    model: currentConfig.model,
                    elapsedSeconds:
                      Math.floor(Date.now() / 1000) - rpc.sessionStartTimestamp,
                  },
                },
                null,
                2
              ),
            },
          ],
        },
      });
    }

    if (toolName === "discord_rpc_get_status") {
      return sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  connected: rpc.connected && rpc.ready,
                  sessionStartTimestamp: rpc.sessionStartTimestamp,
                  config: currentConfig,
                },
                null,
                2
              ),
            },
          ],
        },
      });
    }

    if (toolName === "discord_rpc_clear") {
      const ok = rpc.clearActivity();
      return sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: ok
                ? "Đã xóa hiển thị Discord Rich Presence."
                : "Discord chưa kết nối hoặc đã ẩn sẵn.",
            },
          ],
        },
      });
    }

    return sendJsonRpc({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Không tìm thấy công cụ: ${toolName}`,
      },
    });
  }

  if (id !== undefined) {
    sendJsonRpc({
      jsonrpc: "2.0",
      id,
      result: {},
    });
  }
}

let inputBuffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
  const lines = inputBuffer.split(/\r?\n/);
  inputBuffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req = JSON.parse(line);
      handleRpcRequest(req);
    } catch (err) {
      process.stderr.write(`[MCP Error] JSON parse failed: ${err.message}\n`);
    }
  }
});
