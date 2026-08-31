# 🚀 Guía de Despliegue en Hugging Face Spaces (Docker)

Esta guía te explica paso a paso cómo subir **SonicVault (SpotiMP4)** a una Space gratuita en **Hugging Face** para compartir tu reproductor multimedia y sistema multiagente en línea.

---

## 📋 Requisitos Previos

1. Una cuenta gratuita en [Hugging Face](https://huggingface.co/).
2. Una API Key opcional de Gemini/OpenAI (si deseas la potencia máxima del LLM para el Orquestador Multiagente).

---

## 🛠️ Pasos de Despliegue

### 1. Crear un nuevo Space
1. Inicia sesión en Hugging Face y ve a **[New Space](https://huggingface.co/new-space)**.
2. Ingresa un nombre para tu Space (ejemplo: `sonicvault-app`).
3. En **SDK**, selecciona **Docker** (opción *Blank / Custom Dockerfile*).
4. Elige **Public** o **Private**.
5. Haz clic en **Create Space**.

### 2. Configurar las Variables de Entorno / Secrets
1. En tu nuevo Space, ve a la pestaña **Settings**.
2. Desplázate a la sección **Variables and Secrets**.
3. Añade los siguientes secrets:
   - `GEMINI_API_KEY`: Tu clave de la API de Gemini (opcional pero recomendada).
   - `NODE_ENV`: `production`

### 3. Subir el Código al Repositorio del Space
Puedes conectar tu repositorio de GitHub o subir el código vía `git`:

```bash
git remote add hf https://huggingface.co/spaces/TU_USUARIO/sonicvault-app
git push hf main
```

---

## ⚡ ¿Cómo funciona en la Nube?

- Hugging Face compilará la imagen de Docker automáticamente usando el `Dockerfile` del proyecto.
- La aplicación escuchará en el puerto `7860` predeterminado de Hugging Face.
- El backend procesará descargas con `yt-dlp` y `ffmpeg` preinstalados, brindándote una URL pública compartible.
