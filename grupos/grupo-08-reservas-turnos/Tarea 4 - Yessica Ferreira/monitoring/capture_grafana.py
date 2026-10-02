from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
from pathlib import Path

GRAFANA_URL = "https://purplespinach239.grafana.net/public-dashboards/ce95c3fa413048d3a79d3c6fc60de958"

BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT = (
    BASE_DIR
    / "resultados"
    / "evidencia"
    / "EVIDENCIA_MONITOREO.png"
)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--window-size=1920,1080")

driver = webdriver.Chrome(options=options)

try:
    print("Abriendo dashboard Grafana...")
    driver.get(GRAFANA_URL)

    print("Esperando que cargue el dashboard...")
    time.sleep(5)

    driver.save_screenshot(str(OUTPUT))

    print("Evidencia Grafana generada:")
    print(OUTPUT)

finally:
    driver.quit()