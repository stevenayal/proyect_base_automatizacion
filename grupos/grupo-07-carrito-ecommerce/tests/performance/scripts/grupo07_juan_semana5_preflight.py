#!/usr/bin/env python3
"""Single authenticated GET preflight; on 429 wait once and retry at most once."""

from __future__ import annotations

import math
import os
import sys
import time
import urllib.error
import urllib.request


URL = "https://aiquaa-sandbox-api.vercel.app/api/v1/ordenes"
TIMEOUT_SECONDS = 15
MAX_RESET_WAIT_SECONDS = 65
MIN_REMAINING_FOR_RUN = 10


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


def seconds_until_reset(value: str | None, *, now: float | None = None) -> float | None:
    """Accept Unix epoch seconds or a relative seconds value; reject unbounded waits."""
    if value is None:
        return None
    try:
        parsed = float(value.strip())
    except (AttributeError, ValueError):
        return None
    if not math.isfinite(parsed) or parsed < 0:
        return None
    if parsed >= 1_000_000_000_000:
        parsed /= 1000
    current = time.time() if now is None else now
    delay = parsed - current if parsed >= 1_000_000_000 else parsed
    if delay < 0:
        return 0
    if delay > MAX_RESET_WAIT_SECONDS:
        return None
    return delay


def request_once(opener, api_key: str) -> tuple[int, dict[str, str]]:
    request = urllib.request.Request(URL, headers={
        "x-api-key": api_key,
        "Accept": "application/json",
        "User-Agent": "grupo07-juan-semana5-preflight",
    }, method="GET")
    try:
        response = opener.open(request, timeout=TIMEOUT_SECONDS)
    except urllib.error.HTTPError as error:
        response = error
    status = response.getcode()
    headers = dict(response.headers.items())
    response.close()
    return status, headers


def run_preflight(api_key: str, *, opener=None, sleep=time.sleep) -> int:
    if not api_key or not api_key.strip() or "\r" in api_key or "\n" in api_key:
        print("Preflight abortado: falta GRUPO07_API_KEY válida.", file=sys.stderr)
        return 1
    if opener is None:
        opener = urllib.request.build_opener(NoRedirect())

    for attempt in range(2):
        try:
            status, headers = request_once(opener, api_key)
        except (OSError, TimeoutError, urllib.error.URLError):
            print("Preflight abortado: no se pudo completar la comprobación HTTPS.", file=sys.stderr)
            return 1
        lower_headers = {name.lower(): value for name, value in headers.items()}
        remaining_value = lower_headers.get("x-ratelimit-remaining")
        remaining = None
        if remaining_value is not None:
            try:
                remaining = int(remaining_value.strip())
            except ValueError:
                remaining = None

        print(f"Preflight HTTP {status}; requests restantes reportadas: {remaining if remaining is not None else 'no disponibles'}.")
        if status == 429:
            if attempt == 1:
                print("Preflight sigue en HTTP 429 tras el único reintento permitido.", file=sys.stderr)
                return 1
            delay = seconds_until_reset(lower_headers.get("x-ratelimit-reset"))
            if delay is None:
                print("Preflight HTTP 429 sin reset utilizable dentro del límite de espera; se detiene sin reintentar.", file=sys.stderr)
                return 1
            wait = math.ceil(delay) + 1
            print(f"Preflight recibió HTTP 429; espera acotada de {wait} s y un único reintento.")
            sleep(wait)
            continue
        if not 200 <= status < 300:
            print(f"Preflight abortado por HTTP {status}; no se ejecutará JMeter.", file=sys.stderr)
            return 1
        if remaining is None:
            print("Preflight abortado: no se pudo verificar X-Ratelimit-Remaining.", file=sys.stderr)
            return 1
        if remaining < MIN_REMAINING_FOR_RUN:
            print(
                f"Preflight abortado: quedan {remaining} requests; se requieren al menos {MIN_REMAINING_FOR_RUN} para esta ventana controlada.",
                file=sys.stderr,
            )
            return 1
        print("Preflight aprobado; se autoriza iniciar la corrida controlada.")
        return 0
    return 1


def main() -> int:
    return run_preflight(os.environ.get("GRUPO07_API_KEY", ""))


if __name__ == "__main__":
    raise SystemExit(main())
