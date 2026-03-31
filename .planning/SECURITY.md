# SECURITY.md — SynClaw 安全模型与 CVE 响应

**Defined:** 2026-03-25

---

## 安全模型

### 信任边界

SynClaw 遵循 OpenClaw 的个人助手信任模型：

- **单一信任边界**：每个 Gateway 实例代表一个受信任的操作者
- **SynClaw 桌面壳定位**：SynClaw 作为 Electron 外壳，不引入额外的信任边界
- **OpenClaw Gateway 是安全核心**：所有文件操作、工具执行、模型推理均通过 Gateway 沙箱
- **不受支持的场景**：多用户 adversarial 共享同一 Gateway

### SynClaw 的安全责任

| 层级 | 责任方 | 安全措施 |
|------|--------|---------|
| Gateway 运行时安全 | OpenClaw | Sandbox、工具策略、认证 |
| Electron 桌面层 | SynClaw | Token 存储、系统通知、窗口管理 |
| OpenClaw 版本安全 | SynClaw | 版本锁定、CVE 扫描 |
| 用户数据保护 | OpenClaw + SynClaw | 数据不离开用户设备 |

---

## OpenClaw CVE 审计（截至 2026-03-25）

### 高危 CVE（SynClaw 需响应）

| CVE | CVSS | 描述 | SynClaw 影响 | 修复版本 |
|-----|------|------|-------------|---------|
| GHSA-rqpp-rjj8-7wv8 | **10.0** | WebSocket scope 权限提升，空 token 可自声明 operator.admin | ⚠️ **极高风险**：gateway-bridge 使用空 token + operator.admin 声明 | ≥ 2026.3.12 |
| CVE-2026-28446 | **9.4** | Voice-call 扩展认证绕过 | ⚠️ 若用户启用 voice-call | ≥ 2026.2.1 |
| CVE-2026-32302 | **8.1** | trusted-proxy 模式下 Origin 验证绕过 | ⚠️ 若配置了 trusted-proxy（SynClaw 默认不用） | ≥ 2026.3.11 |
| CVE-2026-27488 | **6.9** | Cron webhook SSRF | ⚠️ 若用户配置了 cron webhook | ≥ 2026.2.19 |

### 中危 CVE

| CVE | CVSS | 描述 | SynClaw 影响 | 修复版本 |
|-----|------|------|-------------|---------|
| CVE-2026-26326 | **5.3** | skills.status 暴露敏感配置 | ⚠️ SynClaw 调用了 skills.status | ≥ 2026.2.14 |
| CVE-2026-27485 | **4.6** | Package skill symlink 攻击 | ⚠️ 若安装了不受信任的 skill | ≥ 2026.2.19 |
| CVE-2026-27007 | **4.8** | Config hash 不稳定 | ⚠️ 配置完整性问题 | ≥ 2026.2.15 |
| CVE-2026-27576 | **4.8** | Local Stdio Bridge 性能问题 | ⚠️ 过大的 prompt payload | ≥ 2026.2.19 |

### CVE 修复策略

1. **版本锁定**：在 `download-openclaw.mjs` 中强制指定 ≥ 2026.3.12
2. **CI 扫描**：在 GitHub Actions 中添加 CVE 版本扫描
3. **启动检查**：Gateway 启动时验证 OpenClaw 版本
4. **安全公告**：在 SynClaw Release Notes 中记录 CVE 影响和升级说明

---

## 安全加固清单

### 必须实施（v1.1 Phase 0 + v1.1.1）

- [x] **AUTH-01**: 生成并存储强随机 token（Keychain/macOS Keychain）
- [x] **AUTH-02**: gateway-bridge 不再声明 `operator.admin` scope，改用最小权限 scopes 列表
- [x] **AUTH-03**: Gateway bind 锁定为 `loopback`，auth.mode 锁定为 `token`
- [x] **SANDBOX-01**: 默认启用 OpenClaw sandbox (`mode: "non-main"`, 通过 gateway-bridge connect 后 config.patch 应用)
- [x] **SANDBOX-02**: `tools.fs.workspaceOnly: true` 强制文件系统操作在工作区
- [x] **SANDBOX-03**: `tools.exec.host: "sandbox"`, `security: "deny"`, `ask: "always"`, `elevated.enabled: false`
- [x] **VERSION-01**: `download-openclaw.mjs` 锁定 ≥ 2026.3.12
- [x] **VERSION-02**: 启动时版本检查，低于目标版本则拒绝启动
- [ ] **SECURITY-01**: 定期运行 `openclaw security audit --json`，展示安全警告
- [ ] **KEYCHAIN-01**: API Key 存储到 macOS Keychain（而非 electron-store 明文）

### 纵深防御（v1.1 Phase 1+）

- [ ] **DEFENSE-01**: 保留敏感目录路径白名单（`/etc`, `/sys`, `C:\Windows` 等）
- [ ] **DEFENSE-02**: `shell:openExternal` 阻止 `javascript:` 协议
- [ ] **DEFENSE-03**: 文件操作使用 OpenClaw 内置的 `fs.workspaceOnly: true`
- [ ] **DEFENSE-04**: 禁用 `tools.elevated`（除非用户明确开启）
- [ ] **DEFENSE-05**: `tools.loopDetection` 默认启用

---

## 安全加固基线配置

SynClaw 强制应用的 OpenClaw 配置分为三层：

**Layer 1（Gateway 全局阻断）** — 最高优先级，阻止所有 scope 提升攻击：
```json5
{
  gateway: {
    tools: {
      deny: ['operator.admin'],
    },
  },
}
```

**Layer 2（Agent 沙箱配置）** — 通过 `gateway-bridge.ts` 的 `applySecurityConfig()` 在每次连接后自动应用：
```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: 'non-main',   // sub-session 在 Docker 隔离，主会话在宿主机
        scope: 'session',
      },
    },
  },
  tools: {
    profile: 'minimal',
    deny: [
      'group:automation',
      'group:runtime',
      'sessions_spawn',
      'sessions_send',
      'fd_write',
    ],
    fs: { workspaceOnly: true },
    exec: {
      host: 'sandbox',
      security: 'deny',
      ask: 'always',
    },
    elevated: { enabled: false },
  },
}
```

用户可配置的强化选项：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: {
      mode: "token",
      rateLimit: {
        maxAttempts: 5,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: false,
      },
    },
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    elevated: { enabled: false },
  },
}
```

用户可配置的强化选项：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",        // 强烈建议开启
        docker: {
          network: "none",         // 强烈建议开启
          readOnlyRoot: true,    // 强烈建议开启
        },
      },
    },
  },
  tools: {
    exec: {
      security: "deny",           // 建议
      ask: "always",              // 建议
    },
    loopDetection: {
      enabled: true,              // 建议
    },
  },
}
```

---

## CVE 响应流程

1. **监控**：定期检查 OpenClaw GitHub Security Advisories
2. **评估**：48小时内评估 CVE 对 SynClaw 的影响
3. **决策**：是否需要紧急修复（≥ 8.0 CVSS = 紧急）
4. **修复**：在下一个 patch 版本中更新版本要求
5. **通知**：在 Release Notes 中说明 CVE 修复版本
6. **验证**：CI 中添加 CVE 版本扫描，阻止使用有漏洞的版本

---

## 漏洞报告

发现 SynClaw 安全问题请通过以下方式报告：

- GitHub Issues（标记 `security` 标签）
- 不公开披露未修复的安全问题

---

*Last updated: 2026-03-25*
