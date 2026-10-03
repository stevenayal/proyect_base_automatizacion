#!/usr/bin/env python3
"""
capture_evidence.py

Hace login en una SPA (usuario/contraseña) y captura una screenshot de una
página posterior (el "panel de reportes" usado como evidencia de monitoreo),
para adjuntar al informe PDF de la prueba de rendimiento.

Como no conocemos el HTML exacto del formulario de antemano, se prueban
varios selectores comunes en cascada. Si todos fallan, el script termina
con código de error y un mensaje claro de qué selector no se encontró,
para poder ajustarlo.

Uso:
    python capture_evidence.py \
        --login-url https://app.example.com/auth/login \
        --target-url https://app.example.com/reportes \
        --output test-results/performance/evidence/evidencia_monitoreo.png \
        --wait 6

Usuario y contraseña se leen de las variables de entorno SANDBOX_USER y
SANDBOX_PASSWORD (no se pasan por línea de comandos para que no queden
en el historial de shell ni en logs de proceso).
"""

import argparse
import os
import sys
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


EMAIL_SELECTORS = [
    (By.CSS_SELECTOR, "input[type='email']"),
    (By.CSS_SELECTOR, "input[name='email']"),
    (By.CSS_SELECTOR, "input[name='username']"),
    (By.CSS_SELECTOR, "input[id*='email' i]"),
    (By.CSS_SELECTOR, "input[id*='user' i]"),
    (By.CSS_SELECTOR, "input[placeholder*='correo' i]"),
    (By.CSS_SELECTOR, "input[placeholder*='email' i]"),
    (By.CSS_SELECTOR, "input[placeholder*='usuario' i]"),
]

PASSWORD_SELECTORS = [
    (By.CSS_SELECTOR, "input[type='password']"),
    (By.CSS_SELECTOR, "input[name='password']"),
    (By.CSS_SELECTOR, "input[id*='password' i]"),
]

COURSE_OPTION_SELECTORS = [
    (By.XPATH, "//*[self::label or self::div or self::span or self::p or self::h3][contains(., 'Curso 1')]"),
    (By.CSS_SELECTOR, "input[type='radio']"),
]

COURSE_CONTINUE_SELECTORS = [
    (By.XPATH, "//button[contains(translate(., 'CONTINUAR', 'continuar'), 'continuar')]"),
]

SUBMIT_SELECTORS = [
    (By.CSS_SELECTOR, "button[type='submit']"),
    (By.XPATH, "//button[contains(translate(., 'INGRESARACCEDERLOGEARIR', 'ingresaraccederlogearir'), 'ingres')]"),
    (By.XPATH, "//button[contains(translate(., 'LOGIN', 'login'), 'login')]"),
    (By.XPATH, "//button[contains(translate(., 'INICIAR SESIÓN', 'iniciar sesión'), 'iniciar')]"),
    (By.CSS_SELECTOR, "button"),
]


def parse_args():
    p = argparse.ArgumentParser(description="Login + captura de evidencia para el informe de performance")
    p.add_argument("--login-url", required=True)
    p.add_argument("--target-url", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--wait", type=int, default=6, help="Segundos de espera tras navegar, para que cargue el contenido dinámico")
    return p.parse_args()


def find_first(driver, selectors, timeout=10):
    last_err = None
    for by, sel in selectors:
        try:
            el = WebDriverWait(driver, timeout).until(EC.presence_of_element_located((by, sel)))
            return el, (by, sel)
        except TimeoutException as e:
            last_err = e
            continue
    raise NoSuchElementException(f"Ningún selector encontró el elemento. Último intento: {selectors[-1]}") from last_err


def find_first_optional(driver, selectors, timeout=3):
    """Como find_first, pero devuelve (None, None) en vez de lanzar excepción
    si no aparece nada dentro del timeout (campo opcional, ej. login sin password)."""
    try:
        return find_first(driver, selectors, timeout=timeout)
    except NoSuchElementException:
        return None, None


def main():
    args = parse_args()
    user = os.environ.get("SANDBOX_USER")
    password = os.environ.get("SANDBOX_PASSWORD")  # opcional: este login puede no pedir contraseña

    if not user:
        print("ERROR: falta la variable de entorno SANDBOX_USER", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1600,1000")

    driver = webdriver.Chrome(options=options)

    try:
        print(f"Abriendo login: {args.login_url}")
        driver.get(args.login_url)

        # Paso opcional: algunas sandboxes primero piden elegir un curso/grupo
        # antes de mostrar el formulario de email. Si aparece, elegimos la
        # primera opción y avanzamos con "Continuar".
        course_el, used_course_sel = find_first_optional(driver, COURSE_OPTION_SELECTORS, timeout=4)
        if course_el is not None:
            print(f"Pantalla de selección de curso detectada (selector: {used_course_sel}). Seleccionando la primera opción.")
            course_el.click()
            continue_el, used_continue_sel = find_first(driver, COURSE_CONTINUE_SELECTORS, timeout=5)
            print(f"Botón 'Continuar' encontrado con selector: {used_continue_sel}")
            continue_el.click()
            time.sleep(2)
        else:
            print("No apareció pantalla de selección de curso, se asume que no aplica.")

        email_el, used_email_sel = find_first(driver, EMAIL_SELECTORS)
        print(f"Campo de usuario encontrado con selector: {used_email_sel}")
        email_el.clear()
        email_el.send_keys(user)

        # La contraseña es opcional: este sandbox puede loguear solo con el email.
        # Buscamos el campo con un timeout corto; si no aparece, seguimos sin llenarlo.
        pass_el, used_pass_sel = find_first_optional(driver, PASSWORD_SELECTORS, timeout=3)
        if pass_el is not None:
            print(f"Campo de contraseña encontrado con selector: {used_pass_sel}")
            if not password:
                print("ADVERTENCIA: la página pide contraseña pero SANDBOX_PASSWORD no está definida.", file=sys.stderr)
            else:
                pass_el.clear()
                pass_el.send_keys(password)
        else:
            print("No se encontró campo de contraseña: este login parece ser solo con email.")

        submit_el, used_submit_sel = find_first(driver, SUBMIT_SELECTORS)
        print(f"Botón de submit encontrado con selector: {used_submit_sel}")
        submit_el.click()

        # Esperar a que el login procese (cambio de URL o simplemente tiempo fijo)
        time.sleep(3)

        print(f"Navegando al panel objetivo: {args.target_url}")
        driver.get(args.target_url)

        print(f"Esperando {args.wait}s a que cargue el contenido dinámico...")
        time.sleep(args.wait)

        driver.save_screenshot(args.output)
        print(f"Screenshot guardada en: {args.output}")

    except NoSuchElementException as e:
        # Guardamos igual una screenshot de diagnóstico para poder ver qué pasó
        debug_path = args.output.replace(".png", "_DEBUG_ERROR.png")
        try:
            driver.save_screenshot(debug_path)
            print(f"No se encontró un elemento esperado. Screenshot de diagnóstico: {debug_path}", file=sys.stderr)
        except Exception:
            pass
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
