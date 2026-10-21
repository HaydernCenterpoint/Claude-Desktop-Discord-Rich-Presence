const net = require("net");
const crypto = require("crypto");

const OPCODES = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4,
};

// Danh sách Application ID thật đã đăng ký trên Discord (dùng làm fallback nếu Client ID bị lỗi)
const FALLBACK_CLIENT_IDS = [
  "1472915568930848829", // Claude Code Official Community RPC App ID
  "383226320970055681",  // Visual Studio Code Official RPC App ID (luôn hoạt động 100%)
];

class DiscordIPC {
  constructor(clientId, onLog = () => {}) {
    this.clientId = String(clientId || FALLBACK_CLIENT_IDS[0]).trim();
    this.fallbackIndex = 0;
    this.onLog = onLog;
    this.socket = null;
    this.connected = false;
    this.ready = false;
    this.reconnectTimer = null;
    this.sessionStartTimestamp = Math.floor(Date.now() / 1000);
    this.lastActivityPayload = null;
  }

  encode(op, data) {
    const payload = Buffer.from(JSON.stringify(data), "utf8");
    const header = Buffer.alloc(8);
    header.writeInt32LE(op, 0);
    header.writeInt32LE(payload.length, 4);
    return Buffer.concat([header, payload]);
  }

  getPipePath(index) {
    if (process.platform === "win32") {
      return `\\\\?\\pipe\\discord-ipc-${index}`;
    }
    const prefix =
      process.env.XDG_RUNTIME_DIR ||
      process.env.TMPDIR ||
      process.env.TMP ||
      process.env.TEMP ||
      "/tmp";
    return `${prefix.replace(/\/$/, "")}/discord-ipc-${index}`;
  }

  async connect() {
    if (this.connected) return true;

    for (let i = 0; i < 10; i++) {
      const pipePath = this.getPipePath(i);
      const success = await this.tryConnectPipe(pipePath);
      if (success) {
        this.onLog(`[Discord RPC] Đã kết nối tới ống IPC: ${pipePath} (Client ID: ${this.clientId})`);
        return true;
      }
    }

    this.onLog(
      "[Discord RPC] Không tìm thấy ứng dụng Discord đang mở trên máy. Sẽ tự động thử lại sau 5 giây..."
    );
    this.scheduleReconnect(5000);
    return false;
  }

  tryConnectPipe(pipePath) {
    return new Promise((resolve) => {
      const socket = net.createConnection(pipePath);
      let resolved = false;

      const finish = (ok) => {
        if (!resolved) {
          resolved = true;
          resolve(ok);
        }
      };

      socket.once("connect", () => {
        this.socket = socket;
        this.connected = true;
        this.setupSocketListeners();
        this.sendHandshake();
        finish(true);
      });

      socket.once("error", () => {
        socket.destroy();
        finish(false);
      });
    });
  }

  setupSocketListeners() {
    let buffer = Buffer.alloc(0);

    this.socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 8) {
        const op = buffer.readInt32LE(0);
        const length = buffer.readInt32LE(4);

        if (buffer.length < 8 + length) break;

        const rawPayload = buffer.slice(8, 8 + length).toString("utf8");
        buffer = buffer.slice(8 + length);

        try {
          const message = JSON.parse(rawPayload);
          this.handleMessage(op, message);
        } catch (err) {
          this.onLog(`[Discord RPC] Lỗi đọc gói tin: ${err.message}`);
        }
      }
    });

    this.socket.on("close", () => {
      this.connected = false;
      this.ready = false;
      this.socket = null;
      this.onLog("[Discord RPC] Kết nối tới Discord đã đóng. Đang kết nối lại...");
      this.scheduleReconnect(4000);
    });

    this.socket.on("error", (err) => {
      this.onLog(`[Discord RPC] Lỗi socket: ${err.message}`);
    });
  }

  sendHandshake() {
    if (!this.socket || !this.connected) return;
    const packet = this.encode(OPCODES.HANDSHAKE, {
      v: 1,
      client_id: this.clientId,
    });
    this.socket.write(packet);
  }

  handleMessage(op, message) {
    if (op === OPCODES.PING) {
      if (this.socket && this.connected) {
        this.socket.write(this.encode(OPCODES.PONG, message));
      }
      return;
    }

    if (op === OPCODES.CLOSE) {
      this.onLog(
        `[Discord RPC] Client ID '${this.clientId}' bị từ chối (${message.code}: ${message.message || "Invalid Client ID"}).`
      );
      // Tự động chuyển sang Fallback Client ID hợp lệ nếu Client ID hiện tại không tồn tại
      if (this.fallbackIndex < FALLBACK_CLIENT_IDS.length) {
        const nextId = FALLBACK_CLIENT_IDS[this.fallbackIndex++];
        if (nextId !== this.clientId) {
          this.clientId = nextId;
          this.onLog(`[Discord RPC] Tự động chuyển sang Client ID dự phòng hợp lệ: ${this.clientId}`);
          if (this.socket) this.socket.destroy();
          this.connected = false;
          this.ready = false;
          this.scheduleReconnect(1000);
        }
      }
      return;
    }

    if (op === OPCODES.FRAME) {
      if (message.cmd === "DISPATCH" && message.evt === "READY") {
        this.ready = true;
        const userTag = message.data?.user?.username || "User";
        this.onLog(`[Discord RPC] ✅ KẾT NỐI THÀNH CÔNG! Tài khoản Discord: ${userTag}`);
        if (this.lastActivityPayload) {
          this.sendRawActivity(this.lastActivityPayload);
        }
      } else if (message.evt === "ERROR") {
        this.onLog(
          `[Discord RPC] ⚠️ Cảnh báo từ Discord: ${JSON.stringify(message.data)}`
        );
        // Nếu lỗi do buttons hoặc assets không hợp lệ, gửi lại bản rút gọn an toàn
        if (this.lastActivityPayload && (this.lastActivityPayload.buttons || this.lastActivityPayload.assets)) {
          this.onLog("[Discord RPC] Đang gửi lại Rich Presence ở chế độ tương thích an toàn...");
          const safeActivity = {
            details: this.lastActivityPayload.details,
            state: this.lastActivityPayload.state,
            timestamps: this.lastActivityPayload.timestamps,
            instance: false,
          };
          this.lastActivityPayload = safeActivity;
          this.sendRawActivity(safeActivity);
        }
      } else if (message.cmd === "SET_ACTIVITY") {
        this.onLog(`[Discord RPC] ✨ Đã hiển thị Rich Presence lên hồ sơ Discord của bạn!`);
      }
    }
  }

  scheduleReconnect(delayMs = 5000) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, delayMs);
  }

  formatTemplate(templateStr, vars) {
    if (!templateStr) return "";
    return templateStr
      .replace(/\{mode\}/g, vars.mode || "")
      .replace(/\{activityName\}/g, vars.activityName || "")
      .replace(/\{status\}/g, vars.status || "")
      .replace(/\{model\}/g, vars.model || "")
      .trim();
  }

  buildActivityFromConfig(config) {
    const vars = {
      mode: config.mode || "Cowork",
      activityName: config.activityName || "Đang làm việc trên Claude",
      status: config.status || "Trực tuyến",
      model: config.model || "Claude Opus 4.8",
    };

    const detailsTemplate =
      config.displayTemplate?.details || "[{mode}] {activityName}";
    const stateTemplate =
      config.displayTemplate?.state || "{status} | ⚡ {model}";

    let details = this.formatTemplate(detailsTemplate, vars).slice(0, 128);
    let state = this.formatTemplate(stateTemplate, vars).slice(0, 128);

    // Discord yêu cầu chuỗi phải dài ít nhất 2 ký tự
    if (details.length < 2) details = "Đang làm việc với Claude";
    if (state.length < 2) state = "Trực tuyến";

    if (config.resetTimestampOnUpdate) {
      this.sessionStartTimestamp = Math.floor(Date.now() / 1000);
    }

    const startTimestamp = config.customStartTimestamp
      ? Number(config.customStartTimestamp)
      : this.sessionStartTimestamp;

    const activity = {
      type: 0, // Playing
      details,
      state,
      instance: false,
    };

    if (config.showTimestamp !== false) {
      activity.timestamps = {
        start: startTimestamp,
      };
      if (config.customEndTimestamp) {
        activity.timestamps.end = Number(config.customEndTimestamp);
      }
    }

    const assets = {};
    if (config.assets?.largeImageKey && String(config.assets.largeImageKey).trim()) {
      assets.large_image = String(config.assets.largeImageKey).trim();
      if (config.assets?.largeImageText) {
        assets.large_text = this.formatTemplate(
          config.assets.largeImageText,
          vars
        ).slice(0, 128);
      }
    }
    if (config.assets?.smallImageKey && String(config.assets.smallImageKey).trim()) {
      assets.small_image = String(config.assets.smallImageKey).trim();
      if (config.assets?.smallImageText) {
        assets.small_text = this.formatTemplate(
          config.assets.smallImageText,
          vars
        ).slice(0, 128);
      }
    }

    if (Object.keys(assets).length > 0) {
      activity.assets = assets;
    }

    if (Array.isArray(config.buttons) && config.buttons.length > 0) {
      const validButtons = config.buttons
        .filter((b) => b && b.label && b.url && /^https?:\/\//.test(b.url))
        .slice(0, 2)
        .map((b) => ({
          label: String(b.label).slice(0, 32),
          url: String(b.url),
        }));

      if (validButtons.length > 0) {
        activity.buttons = validButtons;
      }
    }

    return activity;
  }

  sendRawActivity(activity) {
    if (!this.socket || !this.connected || !this.ready) return false;
    const frame = {
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity,
      },
      nonce: crypto.randomUUID(),
    };
    this.socket.write(this.encode(OPCODES.FRAME, frame));
    return true;
  }

  setActivity(configOrActivity) {
    const activity =
      configOrActivity.details &&
      !configOrActivity.mode &&
      !configOrActivity.activityName
        ? configOrActivity
        : this.buildActivityFromConfig(configOrActivity);

    this.lastActivityPayload = activity;

    if (!this.socket || !this.connected || !this.ready) {
      this.connect();
      return false;
    }

    return this.sendRawActivity(activity);
  }

  clearActivity() {
    this.lastActivityPayload = null;
    if (!this.socket || !this.connected || !this.ready) return false;

    const frame = {
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity: null,
      },
      nonce: crypto.randomUUID(),
    };

    this.socket.write(this.encode(OPCODES.FRAME, frame));
    return true;
  }

  resetTimer() {
    this.sessionStartTimestamp = Math.floor(Date.now() / 1000);
    if (this.lastActivityPayload) {
      if (this.lastActivityPayload.timestamps) {
        this.lastActivityPayload.timestamps.start = this.sessionStartTimestamp;
      }
      this.setActivity(this.lastActivityPayload);
    }
  }

  destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.ready = false;
  }
}

module.exports = { DiscordIPC };
