from pathlib import Path

import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    "47.102.108.137",
    username="root",
    key_filename=str(Path.home() / ".ssh" / "qiba_deploy"),
    timeout=15,
    allow_agent=False,
    look_for_keys=False,
)
cmd = r"""
python3 - <<'PY'
import json, urllib.request
def doh(url, headers=None):
    req=urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print(r.read().decode()[:500])
    except Exception as e:
        print('ERR', type(e).__name__, e)

print('===== alidns qiba =====')
doh('https://dns.alidns.com/resolve?name=qiba.wuyeni.cn&type=A')
print('===== alidns api =====')
doh('https://dns.alidns.com/resolve?name=api.wuyeni.cn&type=A')
print('===== alidns app =====')
doh('https://dns.alidns.com/resolve?name=app.wuyeni.cn&type=A')
print('===== cf qiba =====')
doh('https://cloudflare-dns.com/dns-query?name=qiba.wuyeni.cn&type=A', {'accept':'application/dns-json'})
print('===== resolv =====')
print(open('/etc/resolv.conf').read())
PY
"""
_, stdout, stderr = c.exec_command(cmd, timeout=25)
print(stdout.read().decode("utf-8", "replace"))
err = stderr.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err[:2000])
c.close()
