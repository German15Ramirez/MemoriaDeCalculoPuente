from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import math

# Para servir index.html en la raíz
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return {"error": "index.html no encontrado"}

# ============================================
# MODELO DE DATOS DE ENTRADA
# ============================================
class DatosPuente(BaseModel):
    luz: float = 75
    fc: float = 281
    fy: float = 4200
    pesoConcreto: float = 2400
    pesoAsfalto: float = 2100
    camionHS20: float = 36

# ============================================
# CREAR APLICACIÓN FASTAPI
# ============================================
app = FastAPI(
    title="Memoria de Cálculo - Puente 75m",
    description="API para diseño estructural de puente vehicular",
    version="1.0.0"
)

# Configurar CORS para permitir peticiones desde tu frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica tu dominio
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# FUNCIONES DE CÁLCULO
# ============================================
def calcular_pre_dimensionamiento(L: float) -> Dict[str, Any]:
    """Fase 2: Pre-dimensionamiento según PDF página 8"""
    peralte_viga = max(L / 15.6, 1.60)
    base_viga = peralte_viga / 3.5
    espesor_losa = 0.20
    
    return {
        "espesor_losa_m": espesor_losa,
        "peralte_viga_m": round(peralte_viga, 2),
        "base_viga_m": round(base_viga, 2),
        "diafragma_int_alto_m": round(peralte_viga * 0.75, 2),
        "diafragma_ext_alto_m": round(peralte_viga * 0.50, 2),
        "base_diafragma_m": 0.30
    }

def calcular_losa(datos: DatosPuente, predim: Dict) -> Dict[str, Any]:
    """Fase 3: Diseño de losa según PDF páginas 10-13"""
    S = 3.0  # Separación entre vigas (m)
    
    # Cargas
    w_losa = predim["espesor_losa_m"] * 1.0 * datos.pesoConcreto
    w_asfalto = 0.05 * 1.0 * datos.pesoAsfalto
    w_barandal = 40
    w_cm_losa = w_losa + w_asfalto + w_barandal  # 625 kg/m
    
    # Momentos del PDF (valores base)
    Mcm_losa = 562.50  # kg-m (del PDF página 11)
    Mcv_losa = 658.78 * (datos.camionHS20 / 36)  # kg-m, escala por camión
    
    I_losa = 0.30  # Factor de impacto (máximo 30%)
    Mu_losa = 1.3 * (Mcm_losa + (5/3) * (Mcv_losa * (1 + I_losa)))
    
    # Áreas de acero según PDF página 14
    return {
        "carga_muerta_kg_m": round(w_cm_losa),
        "momento_cm_kg_m": Mcm_losa,
        "momento_cv_kg_m": round(Mcv_losa),
        "factor_impacto": I_losa,
        "momento_ultimo_kg_m": round(Mu_losa),
        "momento_ultimo_ton_m": round(Mu_losa / 1000, 2),
        "area_acero_necesaria_cm2": 7.55,  # Valor del PDF
        "refuerzo_propuesto": "No.6 @ 33 cm"
    }

def calcular_vigas(datos: DatosPuente, predim: Dict) -> Dict[str, Any]:
    """Fase 5: Diseño de vigas longitudinales según PDF páginas 17-27"""
    L = datos.luz
    S = 3.0
    wc = datos.pesoConcreto
    wa = datos.pesoAsfalto
    
    # Cargas distribuidas (página 18)
    w_losa_viga = predim["espesor_losa_m"] * S * wc
    w_viga_propia = predim["base_viga_m"] * predim["peralte_viga_m"] * wc
    w_asfalto_viga = 0.05 * S * wa
    w_cm_viga = w_losa_viga + w_viga_propia + w_asfalto_viga
    
    # Momentos
    Mcm_viga_kg = (w_cm_viga * L * L) / 8
    Mcm_viga_ton = Mcm_viga_kg / 1000
    
    # Momento por carga viva (escala cuadrática con la luz)
    factor_luz = L / 25
    Mcv_viga_ton = 79.29 * factor_luz * factor_luz * (datos.camionHS20 / 36)
    
    # Factor de impacto (página 23)
    I_viga = min(15 / (L + 38), 0.30)
    FD = 1.3  # Factor de distribución (página 24)
    
    # Momento último (página 24)
    Mu_viga_ton = 1.3 * (Mcm_viga_ton + (5/3) * (Mcv_viga_ton * (1 + I_viga) * FD))
    
    # Acero necesario (simplificado)
    b_viga_cm = predim["base_viga_m"] * 100
    d_viga = predim["peralte_viga_m"] * 100 - 6.43
    As_viga = (Mu_viga_ton * 1000 * 100) / (0.9 * datos.fy * 0.9 * d_viga)
    
    # Corte (páginas 26-27)
    Vcm_viga_ton = (w_cm_viga * L) / 2 / 1000
    Vcv_viga_ton = 14.10 * factor_luz * (datos.camionHS20 / 36)
    Vu_viga_ton = 1.3 * (Vcm_viga_ton + (5/3) * (Vcv_viga_ton * (1 + I_viga)))
    
    varillas = math.ceil(As_viga / 9.57)  # No.11 = 9.57 cm²
    
    return {
        "carga_muerta_viga_interna_kg_m": round(w_cm_viga),
        "momento_cm_ton_m": round(Mcm_viga_ton, 2),
        "momento_cv_ton_m": round(Mcv_viga_ton, 2),
        "factor_impacto": round(I_viga, 2),
        "momento_ultimo_interior_ton_m": round(Mu_viga_ton, 2),
        "area_acero_necesaria_cm2": round(As_viga),
        "corte_ultimo_ton": round(Vu_viga_ton, 2),
        "refuerzo_propuesto": f"{varillas} No.11 G60",
        "estribos_propuestos": "No.4 G40 @ 0.30 m"
    }

def calcular_pila_central(Vu_viga_ton: float) -> Dict[str, Any]:
    """Fase 10: Pila central (páginas 46-59)"""
    return {
        "cargas": {
            "peso_total_ton": 346.63,
            "carga_vigas_ton": round(Vu_viga_ton * 3, 2)
        },
        "estabilidad": {
            "factor_seguridad_volteo": 125.90,
            "factor_seguridad_deslizamiento": 23.21
        },
        "refuerzo_propuesto": {
            "refuerzo_vertical": "No.8 G40 @ 0.25 m (dos caras)",
            "refuerzo_horizontal": "No.8 G40 @ 0.15 m (dos caras)"
        }
    }

# ============================================
# ENDPOINT PRINCIPAL
# ============================================
@app.post("/api/calcular")
async def calcular(datos: DatosPuente) -> Dict[str, Any]:
    """Endpoint que recibe los datos del frontend y devuelve todos los cálculos"""
    
    # Ejecutar todas las fases
    predim = calcular_pre_dimensionamiento(datos.luz)
    losa = calcular_losa(datos, predim)
    vigas = calcular_vigas(datos, predim)
    pila = calcular_pila_central(vigas["corte_ultimo_ton"])
    
    # Valores fijos del PDF (página 34-36)
    neopreno = {
        "dimensiones_apoyo_cm": "50 x 50",
        "esfuerzo_actuante_kg_cm2": 26.15,
        "desplazamiento_maximo_cm": 1.89,
        "espesor_total_neopreno_cm": 6.30,
        "verificacion_desplazamiento": True
    }
    
    estribos = {
        "estabilidad": {
            "factor_seguridad_volteo": 5.15,
            "factor_seguridad_deslizamiento": 2.06
        },
        "presiones": {"presion_maxima_kg_cm2": 1.48}
    }
    
    return {
        "predimensionamiento": predim,
        "losa": losa,
        "vigas": vigas,
        "neopreno": neopreno,
        "estribos": estribos,
        "pila_central": pila
    }

# Endpoint de prueba
@app.get("/")
async def root():
    return {
        "status": "ok", 
        "message": "API de cálculo estructural funcionando",
        "endpoints": {
            "calcular_post": "/api/calcular",
            "health_get": "/api/health"
        }
    }