/**
 * @name CustomActivityRPC
 * @author datmk
 * @version 1.0.0
 * @description Hiển thị Discord Rich Presence tuỳ chỉnh với 5 thông số: Chế độ (Mode), Tên hoạt động (Activity), Trạng thái (Status), Model, và Thời gian (Timestamp).
 */

module.exports = class CustomActivityRPC {
  constructor() {
    this.defaultSettings = {
      applicationId: "1472915568930848829",
      appName: "Claude AI",
      mode: "Cowork (Agent Mode)",
      activityName: "Đang lập trình plugin Discord RPC",
      status: "Đang hoạt động • Sẵn sàng",
      model: "Claude Opus 4.8 (1M)",
      showTimestamp: true,
    };
    this.settings = Object.assign({}, this.defaultSettings);
    this.startTimestamp = Date.now();
  }

  start() {
    this.loadSettings();
    this.startTimestamp = Date.now();
    this.updatePresence();
  }

  stop() {
    this.clearPresence();
  }

  loadSettings() {
    if (typeof BdApi !== "undefined") {
      const saved = BdApi.Data.load("CustomActivityRPC", "settings");
      if (saved) {
        this.settings = Object.assign({}, this.defaultSettings, saved);
      }
    }
  }

  saveSettings() {
    if (typeof BdApi !== "undefined") {
      BdApi.Data.save("CustomActivityRPC", "settings", this.settings);
    }
    this.updatePresence();
  }

  dispatchActivity(activity) {
    if (typeof BdApi === "undefined") return;
    const Dispatcher = BdApi.Webpack.getByKeys("dispatch", "subscribe");
    if (!Dispatcher) return;

    Dispatcher.dispatch({
      type: "LOCAL_ACTIVITY_UPDATE",
      activity: activity,
      socketId: "CustomActivityRPC",
    });
  }

  updatePresence() {
    const s = this.settings;
    const activity = {
      application_id: s.applicationId || "1472915568930848829",
      name: s.appName || "Claude AI",
      type: 0, // Playing
      details: `[${s.mode}] ${s.activityName}`,
      state: `${s.status} | ⚡ ${s.model}`,
    };

    if (s.showTimestamp) {
      activity.timestamps = {
        start: this.startTimestamp,
      };
    }

    this.dispatchActivity(activity);
  }

  clearPresence() {
    this.dispatchActivity(null);
  }

  getSettingsPanel() {
    const panel = document.createElement("div");
    panel.style.padding = "16px";
    panel.style.color = "var(--header-primary, #fff)";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.gap = "12px";

    const fields = [
      { key: "appName", label: "Tên hiển thị chính (App Name)" },
      { key: "mode", label: "1. Chế độ (Mode)" },
      { key: "activityName", label: "2. Tên hoạt động (Activity)" },
      { key: "status", label: "3. Trạng thái (Status)" },
      { key: "model", label: "4. Model" },
      { key: "applicationId", label: "Application Client ID" },
    ];

    fields.forEach(({ key, label }) => {
      const wrap = document.createElement("div");
      const lbl = document.createElement("label");
      lbl.textContent = label;
      lbl.style.display = "block";
      lbl.style.marginBottom = "4px";
      lbl.style.fontSize = "12px";
      lbl.style.fontWeight = "600";

      const input = document.createElement("input");
      input.type = "text";
      input.value = this.settings[key] || "";
      input.style.width = "100%";
      input.style.padding = "8px 10px";
      input.style.borderRadius = "6px";
      input.style.border = "1px solid #444";
      input.style.background = "#1e1f22";
      input.style.color = "#fff";

      input.addEventListener("input", (e) => {
        this.settings[key] = e.target.value;
        this.saveSettings();
      });

      wrap.appendChild(lbl);
      wrap.appendChild(input);
      panel.appendChild(wrap);
    });

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "⏱️ Đặt lại bộ đếm thời gian (00:00)";
    resetBtn.style.padding = "8px 14px";
    resetBtn.style.background = "#5865f2";
    resetBtn.style.color = "#fff";
    resetBtn.style.border = "none";
    resetBtn.style.borderRadius = "6px";
    resetBtn.style.cursor = "pointer";
    resetBtn.style.fontWeight = "600";
    resetBtn.addEventListener("click", () => {
      this.startTimestamp = Date.now();
      this.updatePresence();
      if (typeof BdApi !== "undefined") {
        BdApi.UI.showToast("Đã đặt lại bộ đếm thời gian!", { type: "success" });
      }
    });

    panel.appendChild(resetBtn);
    return panel;
  }
};
