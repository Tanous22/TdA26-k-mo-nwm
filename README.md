# Tým Název - Tour de App 2026

Tento repozitář obsahuje zdrojový kód webové aplikace pro správu vzdělávacích kurzů (LMS), vyvinuté v rámci soutěže Tour de App 2026.

## 👥 Členové týmu

* **Daniel Rulík** – Backend & Frontend (Návrh architektury, implementace serverové i klientské části)
* **Miroslav Švihel** – Tester (Quality Assurance, testování funkčnosti a uživatelského rozhraní)

## 🛠 Použité technologie

Aplikace je rozdělena na frontend a backend, které běží v kontejnerizovaném prostředí.

### Frontend
* **Vue.js 3** (Composition API)
* **TypeScript**
* **Vite** (Build tool)
* **TailwindCSS** (Styling)

### Backend
* **Node.js**
* **Express.js**
* **TypeScript**
* **MySQL** (Native SQL queries via `mysql2`)

### Infrastruktura
* **Docker & Docker Compose**
* **Caddy** (Reverse Proxy)
* **GitHub Actions** (CI/CD)

## 🚀 Spuštění aplikace

### Veřejná instance
Aplikace je nasazena a dostupná na adrese:
[https://k-mo-nwm-89625835656.tourde.app](https://k-mo-nwm-89625835656.tourde.app)

**Doba nasazení:**
* Sestavení (Build): ~1 min 40 s
* Deploy na portál: ~1 min 20 s

### Lokální spuštění
Pro spuštění aplikace na lokálním stroji je vyžadován Docker.

1.  **Klonování repozitáře:**
    ```bash
    git clone <url-repozitare>
    cd <nazev-slozky>
    ```

2.  **Spuštění:**
    V kořenovém adresáři projektu spusťte:
    ```bash
    docker compose up --build
    ```

3.  **Přístup:**
    Aplikace bude dostupná na portu 80 (http://localhost).

---
*Tour de App 2026*