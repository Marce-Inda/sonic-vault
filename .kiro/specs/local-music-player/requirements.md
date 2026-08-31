# Requirements Document

## Introduction

Reproductor de música local con estilo visual similar a Spotify pero con tonos magenta/rosa. La aplicación lee archivos MP3 y MP4 desde una carpeta llamada "musica" en el PC del usuario. Las subcarpetas dentro de "musica" representan playlists creadas por el usuario. La aplicación se ejecuta localmente como aplicación web.

## Glossary

- **Reproductor**: La aplicación web local que reproduce archivos de audio y muestra la interfaz de usuario
- **Carpeta_Musica**: La carpeta raíz llamada "musica" en el PC del usuario que contiene los archivos multimedia
- **Playlist**: Una subcarpeta dentro de Carpeta_Musica que agrupa archivos de audio relacionados
- **Pista**: Un archivo individual MP3 o MP4 dentro de una Playlist
- **Cola_Reproduccion**: La lista ordenada de pistas pendientes de reproducción
- **Barra_Progreso**: El control visual que muestra el avance de la pista actual y permite navegar dentro de ella
- **Panel_Lateral**: La sección izquierda de la interfaz que muestra las playlists disponibles
- **Vista_Principal**: La sección central de la interfaz que muestra las pistas de la playlist seleccionada

## Requirements

### Requisito 1: Escaneo de carpeta de música

**Historia de Usuario:** Como usuario, quiero que el reproductor lea automáticamente mi carpeta "musica" y sus subcarpetas, para que pueda ver todas mis playlists y canciones sin configuración manual.

#### Criterios de Aceptación

1. WHEN la aplicación se inicia, THE Reproductor SHALL escanear la Carpeta_Musica y listar todas las subcarpetas de primer nivel como Playlists en el Panel_Lateral en orden alfabético
2. WHEN la aplicación se inicia, THE Reproductor SHALL indexar todos los archivos con extensión .mp3 y .mp4 dentro de cada Playlist, excluyendo subcarpetas anidadas dentro de las Playlists
3. IF la Carpeta_Musica no existe o no es accesible, THEN THE Reproductor SHALL mostrar un mensaje de error indicando que la carpeta "musica" no fue encontrada y no mostrar ninguna Playlist en el Panel_Lateral
4. IF una Playlist no contiene archivos .mp3 ni .mp4, THEN THE Reproductor SHALL mostrar la Playlist en el Panel_Lateral con una indicación de 0 pistas
5. WHEN la aplicación se recarga, THE Reproductor SHALL volver a escanear la Carpeta_Musica y reflejar los archivos .mp3 y .mp4 añadidos o eliminados desde la última carga
6. IF existen archivos .mp3 o .mp4 directamente en la Carpeta_Musica sin estar dentro de una subcarpeta, THEN THE Reproductor SHALL ignorar dichos archivos y no mostrarlos en ninguna Playlist

### Requisito 2: Reproducción de audio

**Historia de Usuario:** Como usuario, quiero reproducir mis archivos de música locales, para que pueda escuchar mis canciones favoritas directamente desde mi PC.

#### Criterios de Aceptación

1. WHEN el usuario selecciona una Pista, THE Reproductor SHALL iniciar la reproducción del archivo de audio correspondiente en un máximo de 2 segundos
2. WHILE una Pista se está reproduciendo, THE Reproductor SHALL mostrar el nombre del archivo, la duración total y el tiempo transcurrido, actualizando el tiempo transcurrido cada 1 segundo
3. WHEN el usuario presiona el botón de pausa, THE Reproductor SHALL pausar la reproducción en la posición actual
4. WHEN el usuario presiona el botón de reproducir estando en pausa, THE Reproductor SHALL reanudar la reproducción desde la posición donde se pausó
5. WHEN una Pista finaliza su reproducción, THE Reproductor SHALL reproducir automáticamente la siguiente Pista en la Cola_Reproduccion en un máximo de 1 segundo
6. IF no hay más pistas en la Cola_Reproduccion, THEN THE Reproductor SHALL detener la reproducción y mostrar el estado detenido
7. IF el archivo de audio seleccionado no se puede reproducir por estar corrupto, no encontrarse en disco o tener un formato no soportado, THEN THE Reproductor SHALL omitir la pista, mostrar un mensaje de error indicando que el archivo no pudo reproducirse, y continuar con la siguiente Pista en la Cola_Reproduccion

### Requisito 3: Controles de reproducción

**Historia de Usuario:** Como usuario, quiero tener controles para avanzar, retroceder y ajustar el volumen, para que pueda navegar fácilmente entre mis canciones.

#### Criterios de Aceptación

1. WHEN el usuario presiona el botón de siguiente, THE Reproductor SHALL saltar a la siguiente Pista en la Cola_Reproduccion y comenzar su reproducción
2. IF el usuario presiona el botón de siguiente y la Pista actual es la última en la Cola_Reproduccion, THEN THE Reproductor SHALL detener la reproducción y permanecer en la última Pista
3. WHEN el usuario presiona el botón de anterior y han transcurrido menos de 3 segundos de la Pista actual, THE Reproductor SHALL volver a la Pista anterior en la Cola_Reproduccion y comenzar su reproducción
4. WHEN el usuario presiona el botón de anterior y han transcurrido 3 segundos o más de la Pista actual, THE Reproductor SHALL reiniciar la Pista actual desde el inicio
5. IF el usuario presiona el botón de anterior y la Pista actual es la primera en la Cola_Reproduccion, THEN THE Reproductor SHALL reiniciar la Pista actual desde el inicio
6. WHEN el usuario arrastra la Barra_Progreso a una nueva posición, THE Reproductor SHALL reposicionar la reproducción al tiempo correspondiente dentro de la duración de la Pista actual
7. WHEN el usuario ajusta el control de volumen, THE Reproductor SHALL cambiar el volumen de reproducción al nivel seleccionado entre 0% y 100% en incrementos de 1%
8. WHEN el usuario presiona el botón de silenciar, THE Reproductor SHALL silenciar el audio estableciendo el volumen a 0% sin detener la reproducción y sin modificar el nivel de volumen previamente configurado
9. WHEN el usuario presiona el botón de silenciar estando el audio silenciado, THE Reproductor SHALL restaurar el volumen al nivel previamente configurado antes de silenciar

### Requisito 4: Gestión de playlists

**Historia de Usuario:** Como usuario, quiero navegar entre mis playlists representadas como subcarpetas, para que pueda organizar y acceder a mi música por categorías.

#### Criterios de Aceptación

1. THE Reproductor SHALL mostrar todas las Playlists en el Panel_Lateral con el nombre de la subcarpeta correspondiente
2. WHEN el usuario selecciona una Playlist en el Panel_Lateral, THE Reproductor SHALL mostrar todas las Pistas de esa Playlist en la Vista_Principal
3. WHEN el usuario selecciona una Playlist y reproduce una Pista, THE Reproductor SHALL establecer la Cola_Reproduccion con todas las pistas de esa Playlist en orden alfabético
4. THE Reproductor SHALL mostrar el número total de pistas junto al nombre de cada Playlist en el Panel_Lateral
5. WHEN el usuario cambia de Playlist mientras una Pista se está reproduciendo, THE Reproductor SHALL continuar la reproducción actual sin interrumpir y solo actualizar la Vista_Principal con las pistas de la nueva Playlist seleccionada

### Requisito 5: Interfaz visual estilo Spotify con tonos magenta

**Historia de Usuario:** Como usuario, quiero una interfaz atractiva similar a Spotify pero con colores magenta/rosa, para que tenga una experiencia visual agradable y moderna.

#### Criterios de Aceptación

1. THE Reproductor SHALL utilizar un esquema de colores con fondo de luminosidad igual o inferior al 20% en escala HSL y acentos en tonos magenta/rosa (rango de tono HSL entre 300° y 340°) como color principal para elementos interactivos y de énfasis
2. THE Reproductor SHALL organizar la interfaz en tres secciones: Panel_Lateral a la izquierda, Vista_Principal en el centro, y barra de reproducción fija en la parte inferior
3. WHILE una Pista se está reproduciendo, THE Reproductor SHALL mostrar en la barra inferior el nombre de la Pista y el artista, junto con los controles de reproducción centrados (botón retroceder, botón reproducir/pausar, botón avanzar, y barra de progreso con tiempo transcurrido y duración total)
4. WHILE una Pista se está reproduciendo, THE Reproductor SHALL resaltar la Pista activa en la Vista_Principal aplicando el color magenta de acento al texto del nombre de la Pista, diferenciándola visualmente de las pistas inactivas
5. THE Reproductor SHALL aplicar una única familia tipográfica sans-serif y un espaciado uniforme basado en múltiplos de 4px u 8px entre todos los elementos de la interfaz
6. IF no hay ninguna Pista en reproducción, THEN THE Reproductor SHALL mostrar la barra inferior con los controles de reproducción en estado deshabilitado y sin información de Pista

### Requisito 6: Metadatos de archivos

**Historia de Usuario:** Como usuario, quiero ver información de mis canciones como título y artista, para que pueda identificar fácilmente mis pistas.

#### Criterios de Aceptación

1. WHEN una Pista es indexada, THE Reproductor SHALL leer los metadatos del archivo (título, artista, álbum, duración) utilizando etiquetas ID3 para archivos .mp3 y etiquetas de metadatos MP4 para archivos .mp4
2. IF un archivo no contiene metadatos o un campo de metadatos está ausente, THEN THE Reproductor SHALL mostrar el nombre del archivo sin extensión como título, "Artista desconocido" como artista, dejar el campo álbum vacío, y obtener la duración directamente del stream de audio
3. WHILE una Pista se está reproduciendo, THE Reproductor SHALL mostrar el título y el artista en la barra de reproducción inferior
4. THE Reproductor SHALL mostrar en la Vista_Principal una lista con título, artista y duración de cada Pista, donde la duración se presenta en formato mm:ss para pistas menores a una hora y hh:mm:ss para pistas de una hora o más
5. IF el título o el artista de una Pista excede 50 caracteres en la Vista_Principal, THEN THE Reproductor SHALL truncar el texto y añadir puntos suspensivos ("…") al final

### Requisito 7: Búsqueda de pistas

**Historia de Usuario:** Como usuario, quiero poder buscar canciones por nombre o artista, para que pueda encontrar rápidamente la música que quiero escuchar.

#### Criterios de Aceptación

1. THE Reproductor SHALL mostrar un campo de búsqueda en la parte superior de la Vista_Principal
2. WHEN el usuario escribe texto en el campo de búsqueda, THE Reproductor SHALL filtrar las pistas en tiempo real con cada carácter ingresado, mostrando solo aquellas cuyo título o artista contenga el texto ingresado
3. WHEN el campo de búsqueda está vacío, THE Reproductor SHALL mostrar todas las pistas de la Playlist seleccionada actualmente
4. THE Reproductor SHALL realizar el filtrado sin distinguir entre mayúsculas y minúsculas
5. IF la búsqueda no produce resultados, THEN THE Reproductor SHALL mostrar un mensaje indicando que no se encontraron pistas que coincidan con la búsqueda
6. WHEN el usuario selecciona una Pista desde los resultados de búsqueda, THE Reproductor SHALL reproducir dicha Pista y establecer la Cola_Reproduccion con los resultados filtrados en el orden mostrado
