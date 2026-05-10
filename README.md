# Memoria de Cálculo Interactiva - Puente Vehicular de Concreto Armado

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## Descripción del Proyecto

Esta aplicación web interactiva permite realizar el **diseño estructural completo** de un puente vehicular de 75 metros de luz en concreto armado, siguiendo las especificaciones de:

- **AASHTO Standard Specifications** (cargas y factores de diseño)
- **ACI 318-14** (diseño de refuerzos y elementos de concreto)

A diferencia de una memoria de cálculo tradicional en PDF, esta herramienta es **interactiva** y permite modificar parámetros para obtener resultados inmediatos.

## Características

- ✅ **Pre-dimensionamiento automático** de losa, vigas y diafragmas
- ✅ **Diseño de losa** con cálculo de armaduras por temperatura y principales
- ✅ **Diseño de vigas longitudinales** (momento, corte, acero longitudinal y estribos)
- ✅ **Diseño de diafragmas** interiores y exteriores
- ✅ **Diseño de apoyos de neopreno** con verificación de desplazamientos
- ✅ **Diseño de estribos** (revisión de volteo, deslizamiento y presiones)
- ✅ **Diseño de pila central** con zapata
- ✅ **Interfaz amigable** tipo hoja de cálculo
- ✅ **Resultados en tiempo real** al modificar parámetros
- ✅ **Desplegable en la nube** (Vercel)

## emo en Vivo

👉 [https://memoria-de-calculo-puente.vercel.app](https://memoria-de-calculo-puente.vercel.app)

## 📋 Datos de Entrada

| Parámetro | Valor por defecto | Unidad |
|-----------|-------------------|--------|
| Luz del puente | 75 | m |
| Resistencia del concreto (f'c) | 281 | kg/cm² |
| Fluencia del acero (fy) | 4200 | kg/cm² |
| Peso volumétrico concreto | 2400 | kg/m³ |
| Peso volumétrico asfalto | 2100 | kg/m³ |
| Carga camión HS20-44 | 36 | ton |

## Resultados que Obtendrás

### Fase 1: Pre-dimensionamiento
- Espesor de losa
- Peralte y base de vigas principales
- Dimensiones de diafragmas

### Fase 2: Diseño de Losa
- Cargas muertas y vivas
- Momentos y factores de impacto
- Áreas de acero necesarias

### Fase 3: Diseño de Vigas
- Momentos últimos por carga muerta y viva
- Área de acero longitudinal
- Corte último y diseño de estribos

### Fase 4: Apoyos de Neopreno
- Esfuerzos actuantes
- Desplazamientos horizontales
- Espesor total del apoyo

### Fase 5: Estribos
- Factores de seguridad (volteo y deslizamiento)
- Presiones máximas y mínimas

### Fase 6: Pila Central
- Cargas transmitidas
- Estabilidad y refuerzo propuesto

## 🛠️ Tecnologías Utilizadas

| Tecnología | Propósito |
|------------|-----------|
| **HTML5 / CSS3** | Interfaz de usuario y estilos |
| **JavaScript** | Lógica del frontend y peticiones a la API |
| **Python 3.12** | Backend y cálculos estructurales |
| **FastAPI** | Framework para la API REST |
| **Vercel** | Despliegue y hosting (Serverless Functions) |

## Ejecutar Localmente

### Requisitos Previos

- Python 3.12 o superior
- pip (gestor de paquetes de Python)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/German15Ramirez/MemoriaDeCalculoPuente.git
cd MemoriaDeCalculoPuente

# 2. Crear entorno virtual (opcional pero recomendado)
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Ejecutar el servidor local
uvicorn api.app:app --reload --port 3000
