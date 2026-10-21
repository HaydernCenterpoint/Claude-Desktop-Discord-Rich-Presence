"use strict";
const process = require('process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');
const { exec, execSync } = require('child_process');
const { createSafeEmitter } = require('./safeEmitter');
const IS_WINDOWS = process.platform === 'win32';
let socketBasePath;
if (IS_WINDOWS) {
    socketBasePath = '\\\\?\\pipe\\discord-ipc';
}
else {
    const temp = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
    socketBasePath = path.join(temp, 'discord-ipc');
}
function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
function getAvailableSocket(testSocketPathFn, tries = 0, lastErr) {
    if (tries > 9) {
        return Promise.reject(new Error(`Max tries exceeded, last error: ${lastErr}`));
    }
    const socketPath = `${socketBasePath}-${tries}`;
    const socket = recastNetSocket(net.createConnection(socketPath));
    return testSocketPathFn(socket).then(() => {
        if (!IS_WINDOWS) {
            try {
                fs.unlinkSync(socketPath);
            }
            catch (err) { }
        }
        return socketPath;
    }, (err) => getAvailableSocket(testSocketPathFn, tries + 1, err));
}
function recastNetSocket(socket) {
    let didHandshake = false;
    const emitter = createSafeEmitter();
    socket.on('error', (err) => emitter.emit('error', err));
    socket.on('close', () => emitter.emit('close'));
    socket.on('data', (data) => emitter.emit('data', data));
    socket.on('pong', () => emitter.emit('pong'));
    socket.on('request', (data) => emitter.emit('request', data));
    socket.once('handshake', (data) => emitter.emit('handshake', data));
    return {
        setHandshakeComplete: (complete) => (didHandshake = complete),
        getHandshakeComplete: () => didHandshake,
        destroy: () => {
            emitter.removeAllListeners();
            socket.destroy();
        },
        write: (buffer) => socket.write(Buffer.from(buffer)),
        end: (buffer) => socket.end(Buffer.from(buffer)),
        read: (len) => {
            const buf = socket.read(len);
            if (!buf)
                return buf;
            return toArrayBuffer(buf);
        },
        ...emitter,
    };
}

// --- Auto Claude-3p Native 3-Line Mobile/Web Optimized + Verified Working Animated Clawd GIFs + Desktop Rich UI ---
let claudeRpcStarted = false;
function startClaudeAutoClient(listeningPipePath) {
    if (claudeRpcStarted) return;
    claudeRpcStarted = true;

    const appData = process.env.APPDATA || '';
    const localAppData = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || '';
    const pluginDir = path.join(appData, 'discord-rpc-plugin');
    const configPath = path.join(pluginDir, 'config.json');
    const logPath = path.join(pluginDir, 'rpc-debug.log');
    const masterPatchPath = path.join(pluginDir, 'RPCIPC.patched.js');
    const githubSyncFlagPath = path.join(pluginDir, 'github-published.json');
    const sessionStart = Math.floor(Date.now() / 1000);

    const CLAUDE_CLIENT_ID = '1472915568930848829';

    function writeLog(msg) {
        try {
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
        } catch (e) {}
    }

    let ghPublishRunning = false;
    function autoPublishToGitHub() {
        try {
            if (ghPublishRunning) return;
            if (fs.existsSync(githubSyncFlagPath)) {
                try {
                    const prev = JSON.parse(fs.readFileSync(githubSyncFlagPath, 'utf8'));
                    if (prev && prev.success) return;
                } catch (e) {}
            }
            const pubScript = path.join(pluginDir, 'auto-github-publish.js');
            if (fs.existsSync(pubScript)) {
                ghPublishRunning = true;
                delete require.cache[require.resolve(pubScript)];
                require(pubScript);
            }
        } catch (e) {}
    }
    autoPublishToGitHub();

    function ensureAllDiscordVersionsPatched() {
        try {
            fs.copyFileSync(__filename, masterPatchPath);
            const discordLocal = path.join(localAppData, 'Discord');
            if (!fs.existsSync(discordLocal)) return;
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
                    if (fs.existsSync(targetRpc) && targetRpc !== __filename) {
                        const st = fs.statSync(targetRpc);
                        if (st.size < 8000) {
                            fs.copyFileSync(__filename, targetRpc);
                        }
                    }
                }
            }
        } catch (e) {}
    }
    ensureAllDiscordVersionsPatched();

    // Bộ Inline SVG chuẩn của từng Provider
    const PROVIDER_SVGS = {
        gemini: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gemStar" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1A73E8"/><stop offset="50%" stop-color="#9B72CB"/><stop offset="100%" stop-color="#D96570"/></linearGradient></defs><path d="M12 1C12 7.075 16.925 12 23 12C16.925 12 12 16.925 12 23C12 16.925 7.075 12 1 12C7.075 12 12 7.075 12 1Z" fill="url(#gemStar)"/></svg>`,
        openai: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771.0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="#10A37F"/></svg>`,
        claude: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L13.6 9.2L19.8 5.2L15.2 11.1L22 13.5L14.8 14.8L18.2 21.2L12.5 16.4L9.2 22.5L9.8 15.2L3 17.5L8.5 12.4L2.5 8.2L9.6 10.1L7.8 3L12 8.8L12 2Z" fill="#D97757"/></svg>`,
        deepseek: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#4D6BFE"/><path d="M7.5 12.5C7.5 9.5 10 7.5 13 7.5C15.5 7.5 17.5 9 18 11.5C16.5 11 15 11.5 14 12.5C13 13.5 11.5 15 9.5 15C8.2 15 7.5 14 7.5 12.5Z" fill="#FFFFFF"/><circle cx="14.5" cy="10" r="1.2" fill="#4D6BFE"/></svg>`,
        meta: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.8 6C4.1 6 2 8.5 2 12C2 15.5 4.1 18 6.8 18C9.2 18 11.1 15.8 12.8 12.8L13.5 11.5C14.7 9.4 15.8 8.2 17.2 8.2C18.8 8.2 20 9.7 20 12C20 14.3 18.8 15.8 17.2 15.8C15.9 15.8 14.9 14.8 13.9 13.2L12.5 15.4C13.9 17.2 15.4 18 17.2 18C19.9 18 22 15.5 22 12C22 8.5 19.9 6 17.2 6C14.8 6 12.9 8.2 11.2 11.2L10.5 12.5C9.3 14.6 8.2 15.8 6.8 15.8C5.2 15.8 4 14.3 4 12C4 9.7 5.2 8.2 6.8 8.2C8.1 8.2 9.1 9.2 10.1 10.8L11.5 8.6C10.1 6.8 8.6 6 6.8 6Z" fill="#0081FB"/></svg>`,
        stepfun: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="14" width="6" height="6" rx="1.5" fill="#00D4AA"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="#00A6FF"/><rect x="15" y="4" width="6" height="6" rx="1.5" fill="#7B61FF"/></svg>`,
        xiaomi: `<svg class="claude-provider-inline-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" fill="#FF6900"/><path d="M6 16V8H11.5C13 8 14 9 14 10.5V16H12V10.5C12 10.1 11.7 9.8 11.3 9.8H8V16H6ZM9.5 16V11.5H11V16H9.5ZM16 16V8H18V16H16Z" fill="#FFFFFF"/></svg>`
    };

    const TOKEN_ICON_SVG = `<svg class="claude-token-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#F59E0B" stroke-width="2" fill="rgba(245,158,11,0.15)"/><path d="M12 7V17M9 9.5C9 8.4 10.3 7.5 12 7.5C13.7 7.5 15 8.4 15 9.5C15 10.6 13.7 11.5 12 11.5C10.3 11.5 9 12.4 9 13.5C9 14.6 10.3 15.5 12 15.5C13.7 15.5 15 14.6 15 13.5" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round"/></svg>`;

    let currentDiffRender = {
        addedStr: '+0',
        removedStr: '-0',
        greenBlocks: 0,
        emptyBlocks: 5,
        modelName: 'Gemini 4 Argon (google-antigravity)',
        providerKey: 'gemini',
        providerName: 'Google Gemini',
        thinkingSummary: 'Running a command...',
        sessionTokensStr: '0',
        totalTokensStr: '0'
    };

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function injectCustomStylesAndColorizeDiff() {
        try {
            if (typeof document === 'undefined' || !document.head) return;

            const styleId = 'clawd-mascot-zoom-style';
            let st = document.getElementById(styleId);
            if (!st) {
                st = document.createElement('style');
                st.id = styleId;
                document.head.appendChild(st);
            }
            st.textContent = `
                img[src*="clawd-on-desk"],
                img[src*="clawd-emotes-skill"] {
                    transform: scale(1.42) translateY(-2%) !important;
                    transform-origin: center bottom !important;
                    image-rendering: pixelated !important;
                }
                img[src*="ClawdMoji"] {
                    transform: scale(1.08) !important;
                    transform-origin: center center !important;
                    image-rendering: pixelated !important;
                }
                .claude-diff-line {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 3px !important;
                    margin-top: 1px !important;
                    max-width: 100% !important;
                }
                .claude-model-row {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                    font-size: 13px !important;
                    line-height: 1.25 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .claude-provider-svg-wrap {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 15px !important;
                    height: 15px !important;
                    flex-shrink: 0 !important;
                }
                .claude-provider-inline-icon {
                    width: 15px !important;
                    height: 15px !important;
                    display: block !important;
                }
                .claude-model-name-span {
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
                .claude-thinking-row {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                    font-family: "JetBrains Mono", Consolas, "SFMono-Regular", Menlo, monospace !important;
                    font-size: 11.5px !important;
                    line-height: 1.35 !important;
                    background: rgba(13, 17, 23, 0.82) !important;
                    border: 1px solid rgba(48, 54, 61, 0.9) !important;
                    border-left: 2.5px solid #D97757 !important;
                    border-radius: 4px !important;
                    padding: 2px 7px !important;
                    color: #e6edf3 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    max-width: 245px !important;
                    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45) !important;
                }
                .claude-term-prompt {
                    color: #3fb950 !important;
                    font-weight: 800 !important;
                    flex-shrink: 0 !important;
                    user-select: none !important;
                    letter-spacing: -0.5px !important;
                }
                .claude-three-dots {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 2px !important;
                    flex-shrink: 0 !important;
                    margin-right: 1px !important;
                }
                .claude-three-dots .c-dot {
                    width: 3.2px !important;
                    height: 3.2px !important;
                    border-radius: 50% !important;
                    background-color: #D97757 !important;
                    display: inline-block !important;
                    animation: claudeDotPulse 1.4s ease-in-out infinite !important;
                }
                .claude-three-dots .c-dot.d1 { animation-delay: 0s !important; }
                .claude-three-dots .c-dot.d2 { animation-delay: 0.22s !important; }
                .claude-three-dots .c-dot.d3 { animation-delay: 0.44s !important; }
                @keyframes claudeDotPulse {
                    0%, 80%, 100% { opacity: 0.35; transform: scale(0.85); }
                    40% { opacity: 1; transform: scale(1.2); background-color: #ff9b7a; }
                }
                .claude-thinking-text {
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                    font-style: normal !important;
                    background: linear-gradient(
                        90deg,
                        #79c0ff 0%,
                        #79c0ff 35%,
                        #ffffff 50%,
                        #79c0ff 65%,
                        #79c0ff 100%
                    ) !important;
                    background-size: 200% 100% !important;
                    -webkit-background-clip: text !important;
                    background-clip: text !important;
                    -webkit-text-fill-color: transparent !important;
                    animation: claudeTextShimmer 2.6s linear infinite !important;
                }
                @keyframes claudeTextShimmer {
                    0% { background-position: 100% 0; }
                    100% { background-position: -100% 0; }
                }
                .claude-term-cursor {
                    display: inline-block !important;
                    width: 6px !important;
                    height: 11px !important;
                    background-color: #D97757 !important;
                    flex-shrink: 0 !important;
                    margin-left: 1px !important;
                    animation: claudeTermBlink 1s steps(2, start) infinite !important;
                }
                @keyframes claudeTermBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .claude-tokens-row {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                    font-family: Consolas, "SFMono-Regular", Menlo, monospace !important;
                    font-size: 11.5px !important;
                    line-height: 1.25 !important;
                    color: #b5bac1 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .claude-token-icon {
                    width: 13px !important;
                    height: 13px !important;
                    flex-shrink: 0 !important;
                }
                .claude-tok-label {
                    color: #949ba4 !important;
                    font-weight: 600 !important;
                }
                .claude-tok-val {
                    color: #f59e0b !important;
                    font-weight: 700 !important;
                }
                .claude-tok-total {
                    color: #a78bfa !important;
                    font-weight: 700 !important;
                }
                .claude-tok-sep {
                    color: rgba(148, 155, 164, 0.5) !important;
                }
                .claude-github-diff {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    font-family: Consolas, "SFMono-Regular", Menlo, monospace !important;
                    font-weight: 700 !important;
                    font-size: 13px !important;
                    line-height: 1.2 !important;
                }
                .claude-diff-add {
                    color: #3fb950 !important;
                }
                .claude-diff-del {
                    color: #f85149 !important;
                }
                .claude-diff-squares {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 2.5px !important;
                    margin-left: 2px !important;
                }
                .claude-sq {
                    width: 9px !important;
                    height: 9px !important;
                    border-radius: 2px !important;
                    display: inline-block !important;
                    box-sizing: border-box !important;
                }
                .claude-sq.green {
                    background-color: #2ea043 !important;
                }
                .claude-sq.empty {
                    background-color: transparent !important;
                    border: 1.5px solid rgba(139, 148, 158, 0.45) !important;
                }
            `;

            const d = currentDiffRender;
            const svgMarkup = PROVIDER_SVGS[d.providerKey] || PROVIDER_SVGS.gemini;
            const safeThinking = escapeHtml(d.thinkingSummary || 'Running a command...');
            const dotsHtml = `<span class="claude-three-dots"><span class="c-dot d1"></span><span class="c-dot d2"></span><span class="c-dot d3"></span></span>`;

            let squaresHtml = '';
            for (let g = 0; g < d.greenBlocks; g++) squaresHtml += '<span class="claude-sq green"></span>';
            for (let e = 0; e < d.emptyBlocks; e++) squaresHtml += '<span class="claude-sq empty"></span>';

            const tokensHtml = `
                ${TOKEN_ICON_SVG}
                <span class="claude-tok-label">Sess:</span>
                <span class="claude-tok-val">${escapeHtml(d.sessionTokensStr)}</span>
                <span class="claude-tok-sep">•</span>
                <span class="claude-tok-label">Total:</span>
                <span class="claude-tok-total">${escapeHtml(d.totalTokensStr)}</span>
            `;

            const allElements = document.querySelectorAll('div, span');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                if (el.children.length === 0 && el.textContent && (el.textContent.includes('🟩') || el.textContent.includes('⬛')) && el.textContent.includes('🪙')) {
                    el.innerHTML = `
                        <div class="claude-diff-line">
                            <div class="claude-model-row" title="${escapeHtml(d.providerName)}: ${escapeHtml(d.modelName)}">
                                <span class="claude-provider-svg-wrap" data-provider="${d.providerKey}">${svgMarkup}</span>
                                <span class="claude-model-name-span">${escapeHtml(d.modelName)}</span>
                            </div>
                            <div class="claude-thinking-row" title=">_ ${safeThinking}">
                                <span class="claude-term-prompt">&gt;_</span>
                                ${dotsHtml}
                                <span class="claude-thinking-text">${safeThinking}</span>
                                <span class="claude-term-cursor"></span>
                            </div>
                            <div class="claude-tokens-row" title="Session Tokens: ${escapeHtml(d.sessionTokensStr)} | All-time Total Tokens: ${escapeHtml(d.totalTokensStr)}">
                                ${tokensHtml}
                            </div>
                            <div class="claude-github-diff">
                                <span class="claude-diff-add">${d.addedStr}</span>
                                <span class="claude-diff-del">${d.removedStr}</span>
                                <span class="claude-diff-squares">${squaresHtml}</span>
                            </div>
                        </div>
                    `;
                } else if (el.querySelector && el.querySelector('.claude-github-diff')) {
                    let svgWrap = el.querySelector('.claude-provider-svg-wrap');
                    if (svgWrap && svgWrap.getAttribute('data-provider') !== d.providerKey) {
                        svgWrap.setAttribute('data-provider', d.providerKey);
                        svgWrap.innerHTML = svgMarkup;
                    }

                    let thinkingRow = el.querySelector('.claude-thinking-row');
                    const modelRow = el.querySelector('.claude-model-row');
                    if (!thinkingRow && modelRow) {
                        thinkingRow = document.createElement('div');
                        thinkingRow.className = 'claude-thinking-row';
                        thinkingRow.setAttribute('title', `>_ ${d.thinkingSummary || ''}`);
                        thinkingRow.innerHTML = `<span class="claude-term-prompt">&gt;_</span>${dotsHtml}<span class="claude-thinking-text">${safeThinking}</span><span class="claude-term-cursor"></span>`;
                        modelRow.insertAdjacentElement('afterend', thinkingRow);
                    } else if (thinkingRow) {
                        if (!thinkingRow.querySelector('.claude-term-prompt') || !thinkingRow.querySelector('.claude-three-dots')) {
                            thinkingRow.innerHTML = `<span class="claude-term-prompt">&gt;_</span>${dotsHtml}<span class="claude-thinking-text">${safeThinking}</span><span class="claude-term-cursor"></span>`;
                        } else {
                            const tSpan = thinkingRow.querySelector('.claude-thinking-text');
                            if (tSpan && tSpan.textContent !== d.thinkingSummary) {
                                tSpan.textContent = d.thinkingSummary;
                            }
                        }
                        thinkingRow.setAttribute('title', `>_ ${d.thinkingSummary || ''}`);
                    }

                    let tokensRow = el.querySelector('.claude-tokens-row');
                    if (!tokensRow && thinkingRow) {
                        tokensRow = document.createElement('div');
                        tokensRow.className = 'claude-tokens-row';
                        tokensRow.innerHTML = tokensHtml;
                        thinkingRow.insertAdjacentElement('afterend', tokensRow);
                    } else if (tokensRow) {
                        const valEl = tokensRow.querySelector('.claude-tok-val');
                        const totEl = tokensRow.querySelector('.claude-tok-total');
                        if (valEl && valEl.textContent !== d.sessionTokensStr) valEl.textContent = d.sessionTokensStr;
                        if (totEl && totEl.textContent !== d.totalTokensStr) totEl.textContent = d.totalTokensStr;
                        tokensRow.setAttribute('title', `Session Tokens: ${d.sessionTokensStr} | All-time Total Tokens: ${d.totalTokensStr}`);
                    }

                    const nameEl = el.querySelector('.claude-model-name-span');
                    const addEl = el.querySelector('.claude-diff-add');
                    const delEl = el.querySelector('.claude-diff-del');
                    const sqEl = el.querySelector('.claude-diff-squares');

                    if (nameEl && nameEl.textContent !== d.modelName) {
                        nameEl.textContent = d.modelName;
                    }
                    if (modelRow) {
                        modelRow.setAttribute('title', `${d.providerName}: ${d.modelName}`);
                    }
                    if (addEl && addEl.textContent !== d.addedStr) addEl.textContent = d.addedStr;
                    if (delEl && delEl.textContent !== d.removedStr) delEl.textContent = d.removedStr;
                    if (sqEl && sqEl.innerHTML !== squaresHtml) sqEl.innerHTML = squaresHtml;
                }
            }
        } catch (e) {}
    }

    if (typeof window !== 'undefined') {
        setInterval(injectCustomStylesAndColorizeDiff, 600);
    }

    function getProviderInfoForModel(modelName) {
        const m = String(modelName || '').toLowerCase();

        if (m.includes('gemini') || m.includes('google')) {
            return { providerName: 'Google Gemini', providerKey: 'gemini' };
        }
        if (m.includes('gpt') || m.includes('openai') || m.includes('whisper') || m.includes('tts')) {
            return { providerName: 'OpenAI', providerKey: 'openai' };
        }
        if (m.includes('deepseek')) {
            return { providerName: 'DeepSeek AI', providerKey: 'deepseek' };
        }
        if (m.includes('meta') || m.includes('muse') || m.includes('llama')) {
            return { providerName: 'Meta AI', providerKey: 'meta' };
        }
        if (m.includes('step') || m.includes('stepfun')) {
            return { providerName: 'StepFun AI', providerKey: 'stepfun' };
        }
        if (m.includes('mimo') || m.includes('xiaomi')) {
            return { providerName: 'Xiaomi MiMo', providerKey: 'xiaomi' };
        }
        return { providerName: 'Anthropic Claude', providerKey: 'claude' };
    }

    function getActivityStatusBadge(mode, status, lastToolName, idleMinutes) {
        const tool = String(lastToolName || '').toLowerCase();

        if (status === 'Working') {
            if (tool.includes('bash') || tool.includes('terminal')) {
                return {
                    smallKey: 'terminal',
                    smallText: `⚡ Running Terminal Command • [${mode} Mode]`
                };
            }
            if (tool.includes('read') || tool.includes('grep') || tool.includes('glob')) {
                return {
                    smallKey: 'reading',
                    smallText: `📖 Reading & Analyzing Code • [${mode} Mode]`
                };
            }
            if (tool.includes('web') || tool.includes('search')) {
                return {
                    smallKey: 'searching',
                    smallText: `🔍 Searching Documentation • [${mode} Mode]`
                };
            }
            if (tool.includes('write') || tool.includes('edit')) {
                return {
                    smallKey: 'coding',
                    smallText: `💻 Actively Writing Code • [${mode} Mode]`
                };
            }
            if (mode === 'Code') {
                return {
                    smallKey: 'coding',
                    smallText: `💻 Working in IDE / Code • [Code Mode]`
                };
            }
            return {
                smallKey: 'thinking',
                smallText: `🧠 Thinking & Processing • [${mode} Mode]`
            };
        }

        if (idleMinutes >= 15) {
            return {
                smallKey: 'idle',
                smallText: `⏸️ Paused / AFK (${Math.round(idleMinutes)}m) • [${mode} Mode]`
            };
        }
        return {
            smallKey: 'idle',
            smallText: `☕ Idle • Waiting for Input (${mode} Mode)`
        };
    }

    // Bộ sưu tập 13 HOẠT CẢNH ĐỘNG (Animated Scenes) ĐÃ XÁC MINH 100% TỒN TẠI TRÊN GITHUB CDN (Không bao giờ hiện dấu chấm hỏi [?])
    const CLAWD_SCENES = [
        { name: 'Building Blocks 🧱', url: 'https://raw.githubusercontent.com/rullerzhou-afk/clawd-on-desk/main/assets/gif/clawd-building.gif' },
        { name: 'Surfing Waves 🏄', url: 'https://raw.githubusercontent.com/afspies/ClawdMoji/main/emoji/surf/clawd_surf.gif' },
        { name: 'Dancing Mariachi 🪇', url: 'https://raw.githubusercontent.com/afspies/ClawdMoji/main/emoji/mariachi/clawd_mariachi.gif' },
        { name: 'On Fire Coding 🔥', url: 'https://raw.githubusercontent.com/afspies/ClawdMoji/main/emoji/fire/clawd_fire.gif' },
        { name: 'Headphones Groove 🎧', url: 'https://raw.githubusercontent.com/rullerzhou-afk/clawd-on-desk/main/assets/gif/clawd-headphones-groove.gif' },
        { name: 'Juggling Tasks 🤹', url: 'https://raw.githubusercontent.com/rullerzhou-afk/clawd-on-desk/main/assets/gif/clawd-juggling.gif' },
        { name: 'London Rain 🌧️', url: 'https://raw.githubusercontent.com/afspies/ClawdMoji/main/emoji/rain/clawd_rain.gif' },
        { name: 'Fast Typing ⌨️', url: 'https://raw.githubusercontent.com/rullerzhou-afk/clawd-on-desk/main/assets/gif/clawd-typing.gif' },
        { name: 'Rock Guitar 🎸', url: 'https://raw.githubusercontent.com/xixicc186/clawd-emotes-skill/main/clawd-emotes/gallery/clawd-guitar.gif' },
        { name: 'Gaming Time 🎮', url: 'https://raw.githubusercontent.com/xixicc186/clawd-emotes-skill/main/clawd-emotes/gallery/clawd-gaming.gif' },
        { name: 'Coffee Break ☕', url: 'https://raw.githubusercontent.com/xixicc186/clawd-emotes-skill/main/clawd-emotes/gallery/clawd-coffee.gif' },
        { name: 'Deep Thinking 💡', url: 'https://raw.githubusercontent.com/rullerzhou-afk/clawd-on-desk/main/assets/gif/clawd-thinking.gif' },
        { name: 'Happy Bounce 🦀', url: 'https://raw.githubusercontent.com/rullerzhou-afk/clawd-on-desk/main/assets/gif/clawd-idle.gif' }
    ];

    const MODEL_DISPLAY_MAP = {
        'claude-opus-4-8-p03p': 'Gemini 4 Argon (google-antigravity)',
        'claude-opus-4-8-p03p[1m]': 'Gemini 4 Argon (google-antigravity)',
        'claude-opus-4-8-p04y': 'GPT 6 Luna (native)',
        'claude-opus-4-8-p09o': 'Gemini 3.8 Flash (google-antigravity)',
        'gemini-4-argon': 'Gemini 4 Argon (google-antigravity)',
        'gemini-3.8-flash': 'Gemini 3.8 Flash (google-antigravity)',
        'claude-haiku-5-5': 'Claude Haiku 5 5 (devin)',
        'swe-2': 'Swe 2 (devin)',
        'gpt-6-astra': 'GPT 6 Astra (native)',
        'gpt-6-luna': 'GPT 6 Luna (native)',
        'gpt-6.1-sol': 'GPT 6.1 Sol (native)',
        'deepseek-v4.1-flash': 'Deepseek V4.1 Flash Free (ofm)'
    };

    const locCache = new Map();
    const gitDiffCache = new Map();
    const fileTokenCache = new Map();
    let cachedLifetimeTokens = 0;
    let lastLifetimeScanTs = 0;

    function formatCompactTokens(num) {
        const n = Number(num || 0);
        if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
        if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }

    function countNewlinesInEscapedJsonString(escapedStr) {
        if (!escapedStr) return 0;
        let count = 1;
        for (let i = 0; i < escapedStr.length - 1; i++) {
            if (escapedStr.charCodeAt(i) === 92 && escapedStr.charCodeAt(i + 1) === 110) {
                count++;
                i++;
            }
        }
        return count;
    }

    function extractTokensFromTranscriptFile(jsonlPath) {
        if (!jsonlPath || !fs.existsSync(jsonlPath)) return 0;
        try {
            const st = fs.statSync(jsonlPath);
            const cached = fileTokenCache.get(jsonlPath);
            if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
                return cached.tokens;
            }

            const maxRead = Math.min(st.size, 6 * 1024 * 1024);
            const fd = fs.openSync(jsonlPath, 'r');
            const buf = Buffer.alloc(maxRead);
            fs.readSync(fd, buf, 0, maxRead, Math.max(0, st.size - maxRead));
            fs.closeSync(fd);

            const text = buf.toString('utf8');
            let sumUsageTokens = 0;

            const inputMatches = [...text.matchAll(/"input_tokens"\s*:\s*(\d+)/g)];
            const outputMatches = [...text.matchAll(/"output_tokens"\s*:\s*(\d+)/g)];
            const cacheCreateMatches = [...text.matchAll(/"cache_creation_input_tokens"\s*:\s*(\d+)/g)];
            const cacheReadMatches = [...text.matchAll(/"cache_read_input_tokens"\s*:\s*(\d+)/g)];

            for (const m of inputMatches) sumUsageTokens += Number(m[1]);
            for (const m of outputMatches) sumUsageTokens += Number(m[1]);
            for (const m of cacheCreateMatches) sumUsageTokens += Number(m[1]);
            for (const m of cacheReadMatches) sumUsageTokens += Number(m[1]);

            let budgetUsed = 0;
            const remMatches = [...text.matchAll(/<total_tokens>\s*(\d+)\s*tokens left\s*<\/total_tokens>/g)];
            if (remMatches.length > 0) {
                let minRem = 15000000;
                for (const rm of remMatches) {
                    const rem = Number(rm[1]);
                    if (rem > 0 && rem < 15000000 && rem < minRem) {
                        minRem = rem;
                    }
                }
                budgetUsed = 15000000 - minRem;
            }

            let tokens = Math.max(sumUsageTokens, budgetUsed);
            if (tokens === 0 && st.size > 200) {
                tokens = Math.round(st.size / 4);
            }

            fileTokenCache.set(jsonlPath, { mtimeMs: st.mtimeMs, size: st.size, tokens });
            return tokens;
        } catch (e) {
            return 0;
        }
    }

    function computeLifetimeTotalTokens() {
        if (cachedLifetimeTokens > 0 && (Date.now() - lastLifetimeScanTs) < 25000) {
            return cachedLifetimeTokens;
        }
        lastLifetimeScanTs = Date.now();

        const allJsonlFiles = [];
        function collectJsonl(dir, maxDepth, curDepth = 0) {
            if (curDepth > maxDepth || !fs.existsSync(dir)) return;
            let entries = [];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch (e) { return; }

            for (const e of entries) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) {
                    const lower = e.name.toLowerCase();
                    if (lower === 'outputs' || lower === 'uploads' || lower === 'node_modules') continue;
                    collectJsonl(full, maxDepth, curDepth + 1);
                } else if (e.name.endsWith('.jsonl')) {
                    allJsonlFiles.push(full);
                }
            }
        }

        collectJsonl(path.join(userProfile, '.claude', 'projects'), 4);
        collectJsonl(path.join(localAppData, 'Claude-3p', 'local-agent-mode-sessions'), 4);
        collectJsonl(path.join(localAppData, 'Claude-3p', 'claude-code-sessions'), 4);

        let total = 0;
        for (const f of allJsonlFiles) {
            total += extractTokensFromTranscriptFile(f);
        }

        cachedLifetimeTokens = total;
        return total;
    }

    function cleanThinkingSnippet(rawStr) {
        if (!rawStr) return null;
        let s = String(rawStr)
            .replace(/\\n/g, ' ')
            .replace(/\r?\n/g, ' ')
            .replace(/\*\*+/g, '')
            .replace(/`+/g, '')
            .replace(/^#+\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();
        const firstSentence = s.split(/(?<=[.!?])\s+/)[0];
        if (firstSentence && firstSentence.length >= 8) {
            s = firstSentence;
        }
        if (s.length > 42) {
            s = s.slice(0, 40).trim() + '...';
        }
        return s.length >= 3 ? s : null;
    }

    function getGitRepoDiffStats(cwdPath) {
        if (!cwdPath || !fs.existsSync(cwdPath)) return null;
        const cached = gitDiffCache.get(cwdPath);
        if (cached && (Date.now() - cached.ts) < 8000) {
            return cached.stats;
        }
        try {
            const out = execSync('git diff HEAD --shortstat', {
                cwd: cwdPath,
                windowsHide: true,
                timeout: 1500,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            });
            let added = 0;
            let removed = 0;
            const insMatch = out.match(/(\d+)\s+insertion/);
            const delMatch = out.match(/(\d+)\s+deletion/);
            if (insMatch) added = Number(insMatch[1]);
            if (delMatch) removed = Number(delMatch[1]);

            if (added > 0 || removed > 0) {
                const stats = { added, removed };
                gitDiffCache.set(cwdPath, { ts: Date.now(), stats });
                return stats;
            }
        } catch (e) {}
        return null;
    }

    function computeLinesCookedAndThinkingFromTranscript(jsonlPath) {
        if (!jsonlPath || !fs.existsSync(jsonlPath)) {
            return { added: 0, removed: 0, lastToolName: null, thinkingSummary: null, sessionTokens: 0 };
        }
        try {
            const st = fs.statSync(jsonlPath);
            const cached = locCache.get(jsonlPath);
            if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
                return cached.stats;
            }

            const maxRead = Math.min(st.size, 8 * 1024 * 1024);
            const fd = fs.openSync(jsonlPath, 'r');
            const buf = Buffer.alloc(maxRead);
            fs.readSync(fd, buf, 0, maxRead, Math.max(0, st.size - maxRead));
            fs.closeSync(fd);

            const content = buf.toString('utf8');
            const lines = content.split(/\r?\n/);

            let added = 0;
            let removed = 0;
            let lastToolName = null;
            let latestThinking = null;
            let latestActiveForm = null;
            const seenToolIds = new Set();

            for (const line of lines) {
                if (!line) continue;

                if (line.includes('"activeForm"')) {
                    const afm = line.match(/"activeForm"\s*:\s*"((?:\\.|[^"\\])+)"/);
                    if (afm && afm[1]) {
                        latestActiveForm = cleanThinkingSnippet(afm[1]);
                    }
                } else if (line.includes('"subject"') && line.includes('"TaskCreate"')) {
                    const sbm = line.match(/"subject"\s*:\s*"((?:\\.|[^"\\])+)"/);
                    if (sbm && sbm[1]) {
                        latestActiveForm = cleanThinkingSnippet(sbm[1]);
                    }
                }

                if (line.includes('"thinking"')) {
                    const thMatches = [...line.matchAll(/"thinking"\s*:\s*"((?:\\.|[^"\\]){5,300})/g)];
                    if (thMatches.length > 0) {
                        const rawTh = thMatches[thMatches.length - 1][1];
                        const cleaned = cleanThinkingSnippet(rawTh);
                        if (cleaned) latestThinking = cleaned;
                    }
                }

                if (line.includes('"tool_use"')) {
                    const tm = line.match(/"name"\s*:\s*"([^"]+)"/);
                    if (tm && tm[1]) {
                        lastToolName = tm[1];
                        const tName = tm[1];
                        if (tName === 'Read') {
                            const fp = line.match(/"file_path"\s*:\s*"([^"]+)"/);
                            if (fp && fp[1]) latestThinking = `Reading ${path.basename(fp[1].replace(/\\\\/g, '\\'))}...`;
                        } else if (tName === 'Edit' || tName === 'Write') {
                            const fp = line.match(/"file_path"\s*:\s*"([^"]+)"/);
                            if (fp && fp[1]) latestThinking = `Editing ${path.basename(fp[1].replace(/\\\\/g, '\\'))}...`;
                        } else if (tName === 'Grep' || tName === 'Glob') {
                            const pt = line.match(/"pattern"\s*:\s*"([^"]+)"/);
                            if (pt && pt[1]) latestThinking = `Searching "${pt[1].slice(0, 22)}"...`;
                        } else if (tName.includes('bash') || tName === 'Bash') {
                            const desc = line.match(/"description"\s*:\s*"([^"]+)"/);
                            if (desc && desc[1]) latestThinking = cleanThinkingSnippet(desc[1]);
                            else latestThinking = 'Running a command...';
                        } else if (tName === 'WebSearch') {
                            const q = line.match(/"query"\s*:\s*"([^"]+)"/);
                            if (q && q[1]) latestThinking = `Searching "${q[1].slice(0, 24)}"...`;
                        }
                    }
                }

                if (
                    line.includes('"Write"') ||
                    line.includes('"Edit"') ||
                    line.includes('"MultiEdit"') ||
                    line.includes('"old_string"') ||
                    line.includes('"new_string"')
                ) {
                    try {
                        const obj = JSON.parse(line);
                        const blocks = obj?.message?.content || obj?.content || [];
                        if (Array.isArray(blocks)) {
                            for (const b of blocks) {
                                if (b && b.type === 'tool_use' && b.input) {
                                    if (b.id && seenToolIds.has(b.id)) continue;
                                    if (b.id) seenToolIds.add(b.id);

                                    const name = b.name || '';
                                    lastToolName = name;
                                    const inp = b.input;

                                    if (name === 'Write' && typeof inp.content === 'string') {
                                        added += inp.content.split(/\r?\n/).length;
                                    } else if (name === 'Edit') {
                                        if (typeof inp.new_string === 'string') {
                                            added += inp.new_string.split(/\r?\n/).length;
                                        }
                                        if (typeof inp.old_string === 'string') {
                                            removed += inp.old_string.split(/\r?\n/).length;
                                        }
                                    } else if (name === 'MultiEdit' && Array.isArray(inp.edits)) {
                                        for (const ed of inp.edits) {
                                            if (typeof ed?.new_string === 'string') {
                                                added += ed.new_string.split(/\r?\n/).length;
                                            }
                                            if (typeof ed?.old_string === 'string') {
                                                removed += ed.old_string.split(/\r?\n/).length;
                                            }
                                        }
                                    }
                                }
                            }
                            continue;
                        }
                    } catch (e) {}

                    const writeMatches = [...line.matchAll(/"name"\s*:\s*"Write"[\s\S]*?"content"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
                    for (const wm of writeMatches) {
                        added += countNewlinesInEscapedJsonString(wm[1]);
                    }
                    const editOldMatches = [...line.matchAll(/"old_string"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
                    for (const om of editOldMatches) {
                        removed += countNewlinesInEscapedJsonString(om[1]);
                    }
                    const editNewMatches = [...line.matchAll(/"new_string"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
                    for (const nm of editNewMatches) {
                        added += countNewlinesInEscapedJsonString(nm[1]);
                    }
                }
            }

            const sessionTokens = extractTokensFromTranscriptFile(jsonlPath);
            const thinkingSummary = latestThinking || latestActiveForm || null;
            const stats = { added, removed, lastToolName, thinkingSummary, sessionTokens };
            locCache.set(jsonlPath, { mtimeMs: st.mtimeMs, size: st.size, stats });
            return stats;
        } catch (e) {
            return { added: 0, removed: 0, lastToolName: null, thinkingSummary: null, sessionTokens: 0 };
        }
    }

    function findTranscriptForSessionFile(filePath, rawText) {
        if (filePath.endsWith('.jsonl')) return filePath;
        try {
            const base = path.basename(filePath, '.json');
            if (base.startsWith('local_')) {
                const uuid = base.replace(/^local_/, '');
                const shortId = uuid.split('-')[0];
                const dir = path.dirname(filePath);

                const coworkSubDir = path.join(dir, shortId);
                if (fs.existsSync(coworkSubDir)) {
                    const auditFile = path.join(coworkSubDir, 'audit.jsonl');
                    if (fs.existsSync(auditFile)) return auditFile;
                }

                const projectsDir = path.join(userProfile, '.claude', 'projects');
                if (fs.existsSync(projectsDir)) {
                    const projFolders = fs.readdirSync(projectsDir, { withFileTypes: true });
                    for (const pf of projFolders) {
                        if (!pf.isDirectory()) continue;
                        const candidateJsonl = path.join(projectsDir, pf.name, `${uuid}.jsonl`);
                        if (fs.existsSync(candidateJsonl)) return candidateJsonl;
                    }
                }
            }

            const sidMatch = rawText && rawText.match(/"(?:sessionId|id|uuid)"\s*:\s*"([0-9a-f-]{36})"/i);
            if (sidMatch && sidMatch[1]) {
                const sid = sidMatch[1];
                const projectsDir = path.join(userProfile, '.claude', 'projects');
                if (fs.existsSync(projectsDir)) {
                    const projFolders = fs.readdirSync(projectsDir, { withFileTypes: true });
                    for (const pf of projFolders) {
                        if (!pf.isDirectory()) continue;
                        const candidateJsonl = path.join(projectsDir, pf.name, `${sid}.jsonl`);
                        if (fs.existsSync(candidateJsonl)) return candidateJsonl;
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    function buildDiffBar5Squares(added, removed) {
        const total = added + removed;
        if (total <= 0) {
            return {
                unicodeBar: '⬛⬛⬛⬛⬛',
                greenBlocks: 0,
                emptyBlocks: 5
            };
        }
        let greenBlocks = Math.round((added / total) * 5);
        if (added > 0 && greenBlocks === 0) greenBlocks = 1;
        if (removed > 0 && greenBlocks === 5) greenBlocks = 4;

        const emptyBlocks = 5 - greenBlocks;
        const unicodeBar = '🟩'.repeat(greenBlocks) + '⬛'.repeat(emptyBlocks);
        return {
            unicodeBar,
            greenBlocks,
            emptyBlocks
        };
    }

    function detectUiActiveTabFromLevelDb() {
        const storageDirs = [
            path.join(localAppData, 'Claude-3p', 'Local Storage', 'leveldb'),
            path.join(localAppData, 'Claude-3p', 'Session Storage')
        ];
        let detectedUiMode = null;

        for (const dir of storageDirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                const files = fs.readdirSync(dir)
                    .filter(f => f.endsWith('.log') || f.endsWith('.ldb'))
                    .map(f => {
                        const p = path.join(dir, f);
                        return { p, mtime: fs.statSync(p).mtimeMs, size: fs.statSync(p).size };
                    })
                    .sort((a, b) => b.mtime - a.mtime);

                for (const item of files.slice(0, 3)) {
                    const fd = fs.openSync(item.p, 'r');
                    const readLen = Math.min(item.size, 131072);
                    const buf = Buffer.alloc(readLen);
                    fs.readSync(fd, buf, 0, readLen, Math.max(0, item.size - readLen));
                    fs.closeSync(fd);

                    const cleanStr = buf.toString('latin1').replace(/[\x00-\x1F\x7F-\xFF]+/g, ' ');
                    const lastCodePos = Math.max(
                        cleanStr.lastIndexOf('"code"'),
                        cleanStr.lastIndexOf('/code'),
                        cleanStr.lastIndexOf('claude-code'),
                        cleanStr.lastIndexOf('local_a0aeb852'),
                        cleanStr.lastIndexOf('local_4ef0dff4')
                    );
                    const lastCoworkPos = Math.max(
                        cleanStr.lastIndexOf('"cowork"'),
                        cleanStr.lastIndexOf('/cowork'),
                        cleanStr.lastIndexOf('local-agent-mode'),
                        cleanStr.lastIndexOf('local_35a1dd24')
                    );

                    if (lastCodePos > -1 || lastCoworkPos > -1) {
                        if (!detectedUiMode) {
                            detectedUiMode = lastCodePos > lastCoworkPos ? 'Code' : 'Cowork';
                        }
                    }
                }
            } catch (e) {}
        }

        return { detectedUiMode };
    }

    function extractInfoFromFile(filePath, defaultMode) {
        try {
            const baseName = path.basename(filePath);
            if (
                baseName === 'audit.jsonl' ||
                baseName === '.claude.json' ||
                baseName === 'cowork_account_settings.json' ||
                (filePath.includes('local-agent-mode-sessions') && filePath.includes('\\.claude\\sessions\\'))
            ) {
                return null;
            }

            const st = fs.statSync(filePath);
            const fd = fs.openSync(filePath, 'r');
            const readSize = Math.min(st.size, 98304);
            const buf = Buffer.alloc(readSize);
            fs.readSync(fd, buf, 0, readSize, Math.max(0, st.size - readSize));
            fs.closeSync(fd);
            const text = buf.toString('utf8');

            let model = null;
            let activityName = null;
            let mode = defaultMode;

            const lowerPath = filePath.toLowerCase();
            if (
                lowerPath.includes('claude-code-sessions') ||
                lowerPath.includes('ccd-session') ||
                lowerPath.includes('.claude\\projects') ||
                lowerPath.includes('.claude\\sessions')
            ) {
                mode = 'Code';
            } else if (lowerPath.includes('local-agent-mode-sessions')) {
                mode = 'Cowork';
            }

            const labelMatch = text.match(/labeled this model \\?"([^"\\]+)\\?"/);
            if (labelMatch && labelMatch[1]) {
                model = labelMatch[1];
            }

            if (!model) {
                const customLabelMatch = text.match(/(Gemini 4 Argon \([^"\\]+\)|Gemini 3\.8 Flash \([^"\\]+\)|Google\/gemini 4 Argon \([^"\\]+\)|Inclusionai\/ling[^"\\]+|Meta\/muse[^"\\]+|Openai\/gpt[^"\\]+|Claude Haiku 5 5 \([^"\\]+\)|Swe 2 \([^"\\]+\)|GPT 6[^"\\]+|Deepseek[^"\\]+|Longcat[^"\\]+|Muse Spark[^"\\]+)/);
                if (customLabelMatch && customLabelMatch[1]) {
                    model = customLabelMatch[1];
                }
            }

            if (!model) {
                const modelMatches = [...text.matchAll(/"model"\s*:\s*"([^"]+)"/g)];
                if (modelMatches.length > 0) {
                    const rawModel = modelMatches[modelMatches.length - 1][1];
                    const cleanId = rawModel.replace(/\[1m\]/i, '');
                    model = MODEL_DISPLAY_MAP[rawModel] || MODEL_DISPLAY_MAP[cleanId] || rawModel;
                }
            }

            const titleMatches = [...text.matchAll(/"(?:title|name|projectName|summary|customTitle)"\s*:\s*"([^"]{2,80})"/g)];
            if (titleMatches.length > 0) {
                for (let i = titleMatches.length - 1; i >= 0; i--) {
                    const candidate = titleMatches[i][1];
                    if (
                        !candidate.startsWith('mcp__') &&
                        !candidate.includes('claude-') &&
                        !candidate.includes('cc-plugin') &&
                        !candidate.includes('telemetry') &&
                        !candidate.includes('TaskUpdate') &&
                        !candidate.includes('TaskCreate') &&
                        candidate !== 'user' &&
                        candidate !== 'assistant' &&
                        candidate !== 'New conversation'
                    ) {
                        activityName = candidate;
                        break;
                    }
                }
            }

            const cwdMatches = [...text.matchAll(/"(?:cwd|projectPath|repoPath|worktreePath|rootPath)"\s*:\s*"([^"]+)"/g)];
            let projectFolder = null;
            let fullProjectCwd = null;
            if (cwdMatches.length > 0) {
                for (let i = cwdMatches.length - 1; i >= 0; i--) {
                    const rawCwd = cwdMatches[i][1].replace(/\\\\/g, '\\');
                    const baseFolder = path.basename(rawCwd);
                    if (
                        baseFolder &&
                        baseFolder !== 'outputs' &&
                        baseFolder !== 'host-cwd' &&
                        baseFolder !== 'Claude-3p' &&
                        !baseFolder.startsWith('host-cwd') &&
                        !baseFolder.endsWith('.json') &&
                        !baseFolder.endsWith('.js')
                    ) {
                        projectFolder = baseFolder;
                        fullProjectCwd = rawCwd;
                        break;
                    }
                }
            }

            if (mode === 'Code' && projectFolder) {
                if (activityName && !activityName.includes(projectFolder)) {
                    activityName = `${activityName} (${projectFolder})`;
                } else if (!activityName) {
                    activityName = projectFolder;
                }
            }

            let linesAdded = 0;
            let linesRemoved = 0;
            let lastToolName = null;
            let thinkingSummary = null;
            let sessionTokens = 0;

            const transcriptPath = findTranscriptForSessionFile(filePath, text);
            if (transcriptPath) {
                const cooked = computeLinesCookedAndThinkingFromTranscript(transcriptPath);
                linesAdded = cooked.added;
                linesRemoved = cooked.removed;
                lastToolName = cooked.lastToolName;
                thinkingSummary = cooked.thinkingSummary;
                sessionTokens = cooked.sessionTokens || 0;
            }

            if (fullProjectCwd) {
                const gitStats = getGitRepoDiffStats(fullProjectCwd);
                if (gitStats) {
                    linesAdded = gitStats.added;
                    linesRemoved = gitStats.removed;
                }
            }

            if (linesAdded === 0 && linesRemoved === 0) {
                const addMatch = text.match(/"(?:linesAdded|additions|insertions|totalLinesAdded)"\s*:\s*(\d+)/);
                const remMatch = text.match(/"(?:linesRemoved|deletions|totalLinesRemoved)"\s*:\s*(\d+)/);
                if (addMatch) linesAdded = Number(addMatch[1]);
                if (remMatch) linesRemoved = Number(remMatch[1]);
            }

            const elapsedMs = Date.now() - st.mtimeMs;
            return {
                filePath,
                transcriptPath,
                mtimeMs: st.mtimeMs,
                idleMinutes: elapsedMs / 60000,
                mode,
                model,
                activityName,
                linesAdded,
                linesRemoved,
                sessionTokens,
                lastToolName,
                thinkingSummary,
                status: elapsedMs < 180000 ? 'Working' : (elapsedMs < 900000 ? 'Idle' : 'Paused')
            };
        } catch (e) {
            return null;
        }
    }

    function detectLiveClaude3pState() {
        const candidates = [];

        function scanFolder(dir, defaultMode, maxDepth, curDepth = 0) {
            if (curDepth > maxDepth || !fs.existsSync(dir)) return;
            let entries = [];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch (e) { return; }

            for (const e of entries) {
                const full = path.join(dir, e.name);
                if (e.isDirectory()) {
                    const lowerName = e.name.toLowerCase();
                    if (
                        lowerName === 'outputs' ||
                        lowerName === 'uploads' ||
                        lowerName === 'node_modules' ||
                        lowerName === '.claude' ||
                        lowerName === 'cache' ||
                        lowerName === 'code cache'
                    ) {
                        continue;
                    }
                    scanFolder(full, defaultMode, maxDepth, curDepth + 1);
                } else if (
                    (e.name.startsWith('local_') && e.name.endsWith('.json')) ||
                    e.name.endsWith('.jsonl') ||
                    (defaultMode === 'Code' && e.name.endsWith('.json'))
                ) {
                    if (e.name === 'audit.jsonl' || e.name === 'cowork_account_settings.json') continue;
                    try {
                        const st = fs.statSync(full);
                        if (st.size > 15 && st.size < 25 * 1024 * 1024) {
                            candidates.push({ path: full, mtimeMs: st.mtimeMs, defaultMode });
                        }
                    } catch (err) {}
                }
            }
        }

        scanFolder(path.join(localAppData, 'Claude-3p', 'claude-code-sessions'), 'Code', 4);
        scanFolder(path.join(userProfile, '.claude', 'sessions'), 'Code', 3);
        scanFolder(path.join(userProfile, '.claude', 'projects'), 'Code', 3);
        scanFolder(path.join(localAppData, 'Claude-3p', 'local-agent-mode-sessions'), 'Cowork', 3);

        candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

        const uiState = detectUiActiveTabFromLevelDb();

        const parsedList = [];
        for (const c of candidates.slice(0, 12)) {
            const info = extractInfoFromFile(c.path, c.defaultMode);
            if (info) parsedList.push(info);
        }

        let best = {
            mode: 'Cowork',
            model: 'Gemini 4 Argon (google-antigravity)',
            activityName: 'Agentic Coding',
            status: 'Working',
            idleMinutes: 0,
            lastToolName: null,
            thinkingSummary: null,
            linesAdded: 0,
            linesRemoved: 0,
            sessionTokens: 0,
            lifetimeTokens: 0
        };

        if (parsedList.length > 0) {
            let chosen = parsedList[0];

            if (uiState.detectedUiMode === 'Code') {
                const newestCode = parsedList.find(p => p.mode === 'Code' && p.activityName);
                if (newestCode) {
                    chosen = newestCode;
                }
            }

            best.mode = chosen.mode || 'Cowork';
            best.status = chosen.status || 'Working';
            best.idleMinutes = chosen.idleMinutes || 0;
            best.lastToolName = chosen.lastToolName || null;
            best.thinkingSummary = chosen.thinkingSummary || null;
            best.linesAdded = chosen.linesAdded || 0;
            best.linesRemoved = chosen.linesRemoved || 0;
            best.sessionTokens = chosen.sessionTokens || 0;

            if (chosen.activityName) best.activityName = chosen.activityName;
            if (chosen.model && !chosen.model.startsWith('claude-')) {
                best.model = chosen.model;
            } else {
                const withLabel = parsedList.find(p => p.model && !p.model.startsWith('claude-'));
                if (withLabel) best.model = withLabel.model;
            }

            if (best.linesAdded === 0 && best.linesRemoved === 0) {
                const withLoc = parsedList.find(p => p.mode === best.mode && (p.linesAdded > 0 || p.linesRemoved > 0));
                if (withLoc) {
                    best.linesAdded = withLoc.linesAdded;
                    best.linesRemoved = withLoc.linesRemoved;
                }
            }

            if (best.sessionTokens === 0) {
                const withTok = parsedList.find(p => p.mode === best.mode && p.sessionTokens > 0);
                if (withTok) {
                    best.sessionTokens = withTok.sessionTokens;
                }
            }

            if (!best.thinkingSummary) {
                const withThink = parsedList.find(p => p.mode === best.mode && p.thinkingSummary);
                if (withThink) {
                    best.thinkingSummary = withThink.thinkingSummary;
                }
            }
        }

        const totalAllTime = computeLifetimeTotalTokens();
        best.lifetimeTokens = Math.max(totalAllTime, best.sessionTokens);

        return best;
    }

    function loadCfg() {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            return {
                clientId: CLAUDE_CLIENT_ID,
                showTimestamp: true
            };
        }
    }

    function encode(op, data) {
        const payload = Buffer.from(JSON.stringify(data), 'utf8');
        const header = Buffer.alloc(8);
        header.writeInt32LE(op, 0);
        header.writeInt32LE(payload.length, 4);
        return Buffer.concat([header, payload]);
    }

    let clientSocket = null;
    let isReady = false;

    function formatNumber(n) {
        return Number(n || 0).toLocaleString('en-US');
    }

    function sendPresence() {
        if (!clientSocket || !isReady) return;
        const cfg = loadCfg();
        const live = detectLiveClaude3pState();

        ensureAllDiscordVersionsPatched();

        const addedStr = `+${formatNumber(live.linesAdded)}`;
        const removedStr = `-${formatNumber(live.linesRemoved)}`;
        const diffBar = buildDiffBar5Squares(live.linesAdded, live.linesRemoved);

        const sessTokStr = formatCompactTokens(live.sessionTokens);
        const totalTokStr = formatCompactTokens(live.lifetimeTokens);

        const fullModel = live.model || 'Gemini 4 Argon (google-antigravity)';
        const shortModel = String(fullModel)
            .replace(/\s*\(google-antigravity\)/i, '')
            .replace(/\s*\(native\)/i, '');

        const provider = getProviderInfoForModel(fullModel);
        const statusBadge = getActivityStatusBadge(live.mode, live.status, live.lastToolName, live.idleMinutes);

        const displayThinking = live.thinkingSummary || (live.status === 'Working' ? 'Running a command...' : 'Waiting for input...');

        currentDiffRender = {
            addedStr,
            removedStr,
            greenBlocks: diffBar.greenBlocks,
            emptyBlocks: diffBar.emptyBlocks,
            modelName: fullModel,
            providerKey: provider.providerKey,
            providerName: provider.providerName,
            thinkingSummary: displayThinking,
            sessionTokensStr: sessTokStr,
            totalTokensStr: totalTokStr
        };

        injectCustomStylesAndColorizeDiff();

        const details = `[${live.mode || 'Cowork'}] ${live.status || 'Working'} • ${live.activityName || 'Agentic Coding'}`.slice(0, 128);
        const state = `🪙 ${sessTokStr}/${totalTokStr} • ${addedStr} ${removedStr} ${diffBar.unicodeBar}`.slice(0, 128);
        const nativeLine3 = `✦ ${shortModel} • >_ ${displayThinking}`.slice(0, 128);

        const sceneIndex = Math.floor(Date.now() / 15000) % CLAWD_SCENES.length;
        const currentScene = CLAWD_SCENES[sceneIndex];

        const activity = {
            type: 0,
            details,
            state,
            timestamps: cfg.showTimestamp !== false ? { start: sessionStart } : undefined,
            assets: {
                large_image: currentScene.url,
                large_text: nativeLine3,
                small_image: statusBadge.smallKey,
                small_text: statusBadge.smallText.slice(0, 128)
            },
            instance: false
        };

        const frame = {
            cmd: 'SET_ACTIVITY',
            args: { pid: process.pid, activity },
            nonce: crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
        };
        try {
            clientSocket.write(encode(1, frame));
            writeLog(`Sent SET_ACTIVITY: ${details} | ${state} | gif=${currentScene.url}`);
        } catch (e) {
            writeLog(`Write error: ${e.message}`);
        }
    }

    function clearPresence() {
        if (!clientSocket || !isReady) return;
        const frame = {
            cmd: 'SET_ACTIVITY',
            args: { pid: process.pid, activity: null },
            nonce: crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
        };
        try {
            clientSocket.write(encode(1, frame));
        } catch (e) {}
    }

    function connectToServer() {
        const pipe = listeningPipePath || `${socketBasePath}-0`;
        const s = net.createConnection(pipe);

        s.once('connect', () => {
            clientSocket = s;
            s.write(encode(0, { v: 1, client_id: CLAUDE_CLIENT_ID }));

            let buf = Buffer.alloc(0);
            s.on('data', (chunk) => {
                buf = Buffer.concat([buf, chunk]);
                while (buf.length >= 8) {
                    const op = buf.readInt32LE(0);
                    const len = buf.readInt32LE(4);
                    if (buf.length < 8 + len) break;
                    const raw = buf.slice(8, 8 + len).toString('utf8');
                    buf = buf.slice(8 + len);
                    try {
                        const msg = JSON.parse(raw);
                        if (op === 3) {
                            s.write(encode(4, msg));
                        } else if (op === 2) {
                            s.destroy();
                            setTimeout(() => connectToServer(), 2000);
                        } else if (op === 1 && msg.cmd === 'DISPATCH' && msg.evt === 'READY') {
                            isReady = true;
                            sendPresence();
                        }
                    } catch (e) {}
                }
            });

            s.on('close', () => {
                isReady = false;
                clientSocket = null;
            });
            s.on('error', () => {});
        });

        s.once('error', () => {
            s.destroy();
        });
    }

    setTimeout(() => {
        connectToServer();

        setInterval(() => {
            exec('tasklist /NH', { windowsHide: true, maxBuffer: 1024 * 1024 * 4 }, (err, stdout) => {
                const running = err || !stdout ? true : stdout.toLowerCase().includes('claude');
                if (running) {
                    if (!clientSocket) {
                        connectToServer();
                    } else {
                        sendPresence();
                    }
                } else {
                    clearPresence();
                }
            });
        }, 4000);
    }, 2000);
}
// --- End Auto Claude-3p Native 3-Line Mobile/Web Optimized + Verified Working Animated Clawd GIFs + Desktop Rich UI ---

function recastNetServer(server) {
    const emitter = createSafeEmitter();
    server.on('error', (err) => emitter.emit('error', err));
    return {
        listening: () => !!server.listening,
        address: () => server.address(),
        listen: (socketPath, onListening) => {
            server.listen(socketPath, () => {
                onListening();
                try {
                    startClaudeAutoClient(socketPath);
                } catch (e) {}
            });
        },
        ...emitter,
    };
}
const proxiedNet = {
    createServer: function (onConnection) {
        const server = net.createServer((socket) => {
            onConnection(recastNetSocket(socket));
        });
        return recastNetServer(server);
    },
};
module.exports = {
    getAvailableSocket,
    net: proxiedNet,
};
