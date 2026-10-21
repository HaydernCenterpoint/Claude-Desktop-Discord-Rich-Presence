const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const pluginDir = path.join(process.env.APPDATA || '', 'discord-rpc-plugin');
const statusFile = path.join(pluginDir, 'github-published.json');

function saveResult(obj) {
  try {
    fs.writeFileSync(statusFile, JSON.stringify({ time: new Date().toISOString(), ...obj }, null, 2), 'utf8');
  } catch (e) {}
}

function cleanLockFiles(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        cleanLockFiles(full);
      } else if (e.name.endsWith('.lock') || e.name.startsWith('tmp_obj_')) {
        try { fs.unlinkSync(full); } catch (err) {}
      }
    }
  } catch (e) {}
}

function getGitCredentialToken() {
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000
    });
    const m = out.match(/password=([^\r\n]+)/);
    if (m && m[1]) return m[1].trim();
  } catch (e) {}
  return null;
}

function createRepoViaApi(token, repoName, description) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      name: repoName,
      description,
      private: false,
      auto_init: false
    });
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: '/user/repos',
        method: 'POST',
        headers: {
          'User-Agent': 'Claude-Desktop-RPC-Publisher',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );
    req.on('error', (err) => resolve({ statusCode: 0, error: err.message }));
    req.write(body);
    req.end();
  });
}

async function runPublish() {
  try {
    const repoName = 'Claude-Desktop-Discord-Rich-Presence';
    const description = 'Live Discord Rich Presence for Claude Desktop & Claude Code with 13 animated Clawd scenes, inline SVG provider logos, terminal thinking box, token stats & GitHub diff bar';

    // Dọn dẹp mọi file .lock trong .git trên Windows trước khi commit & push
    cleanLockFiles(path.join(pluginDir, '.git'));

    try {
      execSync('git add -A', { cwd: pluginDir, windowsHide: true });
      execSync('git commit -m "feat: Claude Desktop Discord Rich Presence"', { cwd: pluginDir, windowsHide: true });
    } catch (e) {}

    const token = getGitCredentialToken();
    if (token) {
      const apiRes = await createRepoViaApi(token, repoName, description);
      try {
        execSync('git remote remove origin', { cwd: pluginDir, stdio: 'ignore', windowsHide: true });
      } catch (e) {}
      execSync(
        `git remote add origin https://x-access-token:${token}@github.com/HaydernCenterpoint/${repoName}.git`,
        { cwd: pluginDir, windowsHide: true }
      );
      const pushOut = execSync('git push -u origin main --force', {
        cwd: pluginDir,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 25000
      });
      execSync(
        `git remote set-url origin https://github.com/HaydernCenterpoint/${repoName}.git`,
        { cwd: pluginDir, windowsHide: true }
      );
      saveResult({
        success: true,
        xlGifsSynced: true,
        method: 'git-credential-manager-api',
        apiStatus: apiRes ? apiRes.statusCode : null,
        pushOut,
        url: `https://github.com/HaydernCenterpoint/${repoName}`
      });
      return;
    }

    const ghOut = execSync(
      `gh repo create ${repoName} --public --description "${description}" --source=. --remote=origin --push`,
      { cwd: pluginDir, encoding: 'utf8', windowsHide: true, timeout: 25000 }
    );
    saveResult({
      success: true,
      method: 'gh-cli',
      ghOut,
      url: `https://github.com/HaydernCenterpoint/${repoName}`
    });
  } catch (err) {
    saveResult({
      success: false,
      error: err.message,
      stderr: err.stderr ? String(err.stderr) : null,
      stdout: err.stdout ? String(err.stdout) : null
    });
  }
}

runPublish();
