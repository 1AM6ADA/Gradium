# Gradium — Security Hardening

This documents the hardening applied in the code and the **server-side steps
you must run yourself** (they need SSH/root on `90.156.255.209`, which this
setup no longer has stored). Do the deploy steps below to make the code changes
take effect on the live site.

---

## 1. What was fixed in the code (already done)

| Area | Fix | File |
|------|-----|------|
| **JWT forgery / account takeover** | App now **refuses to boot** in production if `SECRET_KEY` is the default. A strong key was generated into `.env`. | `backend/app/main.py`, `backend/app/config.py` |
| **Brute-force / DoS / LLM cost-abuse** | Per-IP **rate limiting** (auth 8/min, AI 6/min, uploads 12/min, general 120/min) with `429 + Retry-After`. | `backend/app/security.py` |
| **Memory-exhaustion uploads** | **30 MB request body cap** (413) before the body is read into RAM, plus an in-handler guard. | `backend/app/security.py`, `backend/app/api/routes/quiz.py` |
| **Missing security headers** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `CSP`, `HSTS` on API **and** frontend. | `backend/app/security.py`, `next.config.ts` |
| **API map leak** | `/docs`, `/redoc`, `/openapi.json` **disabled in production**. | `backend/app/main.py` |
| **Weak passwords** | Register requires **8–128 char** passwords; name length bounded. | `backend/app/schemas/user.py` |
| **CORS footgun** | App refuses to boot if `CORS_ORIGINS` contains `*` (wildcard + credentials leaks sessions). | `backend/app/main.py` |
| **Fingerprinting** | `X-Powered-By` removed from the frontend. | `next.config.ts` |

Rate-limit counters are in-memory, correct for the **single uvicorn worker**
this app runs. If you ever add `--workers N` or a second host, move the counters
to Redis or the limits become per-worker.

---

## 1b. Deployed to the live server on 2026-07-10 ✅

All of §1 is **already live** on `90.156.255.209` (deployed over SSH):

- `SECRET_KEY` rotated to a fresh 64-char random key — the JWT-forgery /
  account-takeover hole is closed (verified: a token forged with the old
  default key now returns `401`).
- Both images rebuilt with the hardened code and redeployed. Verified live:
  `/docs` → 404, security headers present on API + frontend, weak password →
  422, oversized body → 413, login rate-limit → 429 after 8 tries, site → 200.
- The strongSwan/IPsec **VPN was left completely untouched** (still active),
  and **no firewall/iptables changes were made** (the VPN depends on those
  rules — see §3a note).
- One-click delete installed: `teardown.sh` on the server and
  `destroy-remote.sh` in this repo (see §5).

The remaining items in §3 (TLS, edge DDoS, SSH hygiene, key rotation) still
need doing and are the next priorities.

## 2. Redeploying after future code changes (run on the server)

On `90.156.255.209`, in the project directory:

```bash
# 1. Set a strong, unique JWT key in the server's .env (this rotates it —
#    every user will be logged out once and must log in again).
openssl rand -hex 32          # copy the output
nano .env                     # set SECRET_KEY=<that value>
                              # set ENVIRONMENT=production
                              # set CORS_ORIGINS=http://90.156.255.209:3000  (the real frontend origin)
                              # leave TRUST_PROXY=false for now

# 2. Rebuild and restart.
docker compose up -d --build

# 3. Verify.
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/docs   # want 404 (docs off)
curl -sI http://localhost:8000/health | grep -i x-frame-options       # want DENY
```

> The generated key already in the local `.env` here works too — but generate a
> **fresh** one on the server so it never left your machine in plaintext.

---

## 3. Server-level hardening (still TODO — needs root)

These are the biggest remaining risks. The app is on **plain HTTP** with the API
**directly exposed** on `:8000`.

### 3a. Firewall — ⚠️ coordinate with the IPsec VPN first
**Not applied** during hardening: this box runs a strongSwan/IPsec VPN that
relies on specific iptables/policy rules, and Docker also manages iptables.
A naive `ufw enable` can break the tunnel. If you firewall, do it with someone
who can confirm the IPsec + Docker rules survive — don't blanket-deny. The
minimal intent (once you've verified it won't disrupt IPsec):
```bash
# only after confirming these won't clobber the VPN's iptables rules
ufw allow OpenSSH
ufw allow 3000/tcp          # frontend
ufw allow 8000/tcp          # backend API (browsers call it directly today)
```

### 3b. Put both services behind a reverse proxy + TLS (recommended)
This is the single highest-value upgrade: it gives you HTTPS (credentials/JWTs
are currently sent in cleartext), one public port, connection/rate limits at the
edge, and lets you **stop exposing `:8000`** directly.

With a domain, use Caddy (automatic Let's Encrypt):
```
your-domain.com {
    encode gzip
    handle /api/* { reverse_proxy 127.0.0.1:8000 }
    handle /ws/*  { reverse_proxy 127.0.0.1:8000 }
    handle       { reverse_proxy 127.0.0.1:3000 }
}
```
Then rebuild the frontend with `NEXT_PUBLIC_API_URL=https://your-domain.com` and
`NEXT_PUBLIC_WS_URL=wss://your-domain.com`, set `CORS_ORIGINS=https://your-domain.com`,
set `TRUST_PROXY=true`, and `ufw deny 8000` / `ufw deny 3000` (only the proxy's
80/443 stay open). This closes the direct-to-API attack surface entirely.

### 3c. Edge DDoS protection
Rate limiting in the app protects CPU/DB/LLM-spend but a volumetric flood still
saturates the box. Put the domain behind **Cloudflare (free tier)** — proxied
DNS hides the origin IP and absorbs L3/L4 floods. Then firewall the origin to
accept `:80/:443` **only from Cloudflare IP ranges**.

### 3d. SSH & host hygiene
- Disable password SSH, use keys only: in `/etc/ssh/sshd_config` set
  `PasswordAuthentication no` and `PermitRootLogin prohibit-password`, then
  `systemctl restart ssh`. (The root password was the entry point of the earlier
  compromise — kill it.)
- Install `fail2ban` (bans brute-forcers on SSH and can watch nginx/Caddy logs).
- `unattended-upgrades` for automatic security patches.

### 3e. Rotate the leaked GigaChat key
`.env` here contains a live `GIGACHAT_AUTH_KEY`. If this repo/dir was ever shared
or pushed, revoke it in the Sber console and issue a new one.

---

## 4. Priority order

1. **Deploy §2** (rotates the forgeable JWT key, turns on rate limiting + body caps). — *biggest single win, do first*
2. **§3d** disable root/password SSH — *closes the original breach vector*.
3. **§3a** firewall.
4. **§3b + §3c** TLS + Cloudflare — *removes cleartext + absorbs volumetric DDoS*.
5. **§3e** rotate the AI key if it was ever exposed.
