"""Minimal Aliyun DNS RPC client (stdlib only). Reads keys from env."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
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


def alidns(action: str, extra: dict) -> dict:
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
    encoded = "&".join(
        f"{_percent(k)}={_percent(params[k])}" for k in sorted(params)
    )
    string_to_sign = "GET&%2F&" + _percent(encoded)
    params["Signature"] = _sign(sk, string_to_sign)
    url = "https://alidns.aliyuncs.com/?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"{exc.code} {body}") from exc


def ensure_a_record(domain: str, rr: str, ip: str) -> str:
    data = alidns(
        "DescribeDomainRecords",
        {"DomainName": domain, "RRKeyWord": rr, "Type": "A", "PageSize": 50},
    )
    records = data.get("DomainRecords", {}).get("Record", [])
    if isinstance(records, dict):
        records = [records]
    for rec in records:
        if rec.get("RR") == rr and rec.get("Type") == "A":
            if rec.get("Value") == ip:
                return f"exists {rr}.{domain} -> {ip}"
            alidns(
                "UpdateDomainRecord",
                {
                    "RecordId": rec["RecordId"],
                    "RR": rr,
                    "Type": "A",
                    "Value": ip,
                    "TTL": 600,
                },
            )
            return f"updated {rr}.{domain} -> {ip}"
    alidns(
        "AddDomainRecord",
        {"DomainName": domain, "RR": rr, "Type": "A", "Value": ip, "TTL": 600},
    )
    return f"added {rr}.{domain} -> {ip}"


if __name__ == "__main__":
    print(ensure_a_record("wuyeni.cn", "qiba", "47.102.108.137"))
