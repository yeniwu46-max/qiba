#!/usr/bin/env python3
"""Certbot DNS-01 hook. Uses Aliyun DNS. Keys from env only."""
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid


def _sign(secret: str, string_to_sign: str) -> str:
    key = (secret + "&").encode("utf-8")
    digest = hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha1).digest()
    return base64.b64encode(digest).decode("utf-8")


def _percent(value: str) -> str:
    return urllib.parse.quote(value, safe="~")


def alidns(action, extra):
    ak = os.environ["ALIYUN_ACCESS_KEY_ID"]
    sk = os.environ["ALIYUN_ACCESS_KEY_SECRET"]
    params = {
        "Format": "JSON",
        "Version": "2015-01-09",
        "AccessKeyId": ak,
        "SignatureMethod": "HMAC-SHA1",
        "Timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "SignatureVersion": "1.0",
        "SignatureNonce": str(uuid.uuid4()),
        "Action": action,
        **{k: str(v) for k, v in extra.items()},
    }
    encoded = "&".join(f"{_percent(k)}={_percent(params[k])}" for k in sorted(params))
    params["Signature"] = _sign(sk, "GET&%2F&" + _percent(encoded))
    url = "https://alidns.aliyuncs.com/?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(exc.read().decode("utf-8", "replace")) from exc


def rr_for(domain):
    # qiba.wuyeni.cn -> root wuyeni.cn, host _acme-challenge.qiba
    if domain.endswith(".wuyeni.cn"):
        sub = domain[: -len(".wuyeni.cn")]
        return "wuyeni.cn", f"_acme-challenge.{sub}"
    return domain, "_acme-challenge"


def list_txt(root, rr):
    data = alidns(
        "DescribeDomainRecords",
        {"DomainName": root, "RRKeyWord": rr, "Type": "TXT", "PageSize": 50},
    )
    records = data.get("DomainRecords", {}).get("Record", [])
    if isinstance(records, dict):
        records = [records]
    return [r for r in records if r.get("RR") == rr and r.get("Type") == "TXT"]


def auth() -> None:
    domain = os.environ["CERTBOT_DOMAIN"]
    value = os.environ["CERTBOT_VALIDATION"]
    root, rr = rr_for(domain)
    alidns(
        "AddDomainRecord",
        {"DomainName": root, "RR": rr, "Type": "TXT", "Value": value, "TTL": 600},
    )
    print(f"added TXT {rr}.{root}", flush=True)
    for i in range(20):
        time.sleep(6)
        try:
            req = urllib.request.Request(
                f"https://dns.alidns.com/resolve?name={rr}.{root}&type=TXT"
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                body = resp.read().decode()
            if value in body:
                print("doh ready", flush=True)
                return
            print(f"doh wait {i+1}", flush=True)
        except Exception as exc:
            print("doh err", type(exc).__name__, flush=True)
    print("doh timeout, continuing anyway", flush=True)


def cleanup() -> None:
    domain = os.environ.get("CERTBOT_DOMAIN", "qiba.wuyeni.cn")
    root, rr = rr_for(domain)
    for rec in list_txt(root, rr):
        alidns("DeleteDomainRecord", {"RecordId": rec["RecordId"]})
        print(f"deleted TXT {rec.get('RecordId')}", flush=True)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "auth":
        auth()
    elif cmd == "cleanup":
        cleanup()
    else:
        raise SystemExit("usage: acme_aliyun_hook.py auth|cleanup")
