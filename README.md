# ⚡ SonicVault (SpotiMP4)

> Reproductor de Música Local y Descargador Multiformato con Estética Anime & Spotify Neón.

**SonicVault (SpotiMP4)** es una aplicación web full-stack moderna construida con **React, Vite, TypeScript y Express.js**. Permite reproducir archivos de audio locales (`.mp3`, `.mp4`) organizados en carpetas de playlists, descargar álbumes, playlists o canciones completas desde Spotify y YouTube, y organizarlos de manera interactiva con un tablero estilo **Trello (Kanban)** o vista de lista clásica.

---

## ✨ Características Principales

- 📊 **Vista de Tablero Trello (Kanban)**:
  - Visualización horizontal de playlists en columnas independientes.
  - Tarjetas interactivas por cada canción con diseño glassmorphism y detalles de pista.
  - **Drag & Drop**: Mueve o añade canciones entre playlists arrastrando las tarjetas.
- 📋 **Vista de Lista Tradicional**:
  - Tabla completa con ordenamiento por título, artista y duración.
- ⬇️ **Descargador Integrado (Spotify & YouTube)**:
  - Soporte para enlaces de **álbumes**, **playlists**, **canciones** o búsquedas por texto.
  - Descargas en segundo plano a formatos **MP3** (audio alta calidad) o **MP4** (video).
  - Indicador de progreso en tiempo real e historial modal de descargas.
- 🎨 **Interfaz Neón & Anime**:
  - Paleta de colores magenta/rosa neón (HSL 300°–340°) sobre fondo oscuro elegante.
  - Indicadores animados de reproducción activa e íconos temáticos.
- 🎵 **Motor de Reproducción HTML5**:
  - Barra fija inferior con controles de reproducción (play/pause, anterior, siguiente, aleatorio).
  - Barra de progreso interactiva y control de volumen con opción de silenciar.
- 💻 **Lanzador de Escritorio (Linux)**:
  - Incluye acceso directo `.desktop` ejecutable e ícono de aplicación anime listo para usar con un clic.

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Vanilla CSS** con CSS Custom Properties para el sistema de diseño neón
- **HTML5 Drag & Drop API** y **HTML5 Audio API**

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **`music-metadata`**: Extracción automática de etiquetas ID3/MP4 (título, artista, álbum, duración).
- **`yt-dlp`**: Motor de descargas asíncronas en segundo plano.

### Calidad & Testing
- **Vitest**: Suite de pruebas unitarias (28 archivos de test / 134 pruebas automáticas).
- **Fast-Check**: Property-based testing para invariantes de estado y formateadores.

---

## 📁 Estructura del Proyecto

```text
spotimp4/
├── musica/                  # Carpeta de música local (playlists en subcarpetas)
├── src/
│   ├── client/              # Aplicación React
│   │   ├── components/      # TrelloBoard, PlaylistView, PlayerBar, DownloadBar, etc.
│   │   ├── context/         # PlayerContext (Reducer & estado de reproducción)
│   │   ├── hooks/           # useAudioEngine
│   │   └── styles/          # Variables CSS, tema neón y resets
│   ├── server/              # Servidor Express.js
│   │   ├── controllers/     # StreamController (HTTP Range Requests)
│   │   ├── routes/          # Rutas API de playlists y descargas
│   │   └── services/        # FileScanner, MetadataParser, DownloaderService
│   └── shared/              # Modelos e interfaces TypeScript compartidos
├── launch.sh                # Script de inicio rápido servidor + navegador
├── spotimp4_icon.png        # Icono anime oficial de la aplicación
├── package.json
└── README.md
```

---

## 🚀 Instalación y Uso

### Requisitos previos
- **Node.js** (v18 o superior)
- **yt-dlp** (para la funcionalidad de descargas)
- **ffmpeg** (para conversión de audio/video)

### Pasos de instalación

1. **Clonar el repositorio**:
   ```bash
   git clone git@github.com:Marce-Inda/sonic-vault.git
   cd sonic-vault
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   Abre tu navegador en `http://localhost:5173`.

4. **Ejecutar Pruebas**:
   ```bash
   npm test
   ```

5. **Compilar para Producción**:
   ```bash
   npm run build
   ```

---

## 🖥️ Lanzador de Escritorio en Linux

Puedes ejecutar la aplicación directamente usando el script incluido:
```bash
./launch.sh
```

O utilizar el acceso directo generado en el escritorio (`SpotiMP4.desktop`) para iniciar el servidor y abrir el navegador con un solo doble clic.

---

## 📜 Licencia

Desarrollado para la gestión de música local y uso personal.
