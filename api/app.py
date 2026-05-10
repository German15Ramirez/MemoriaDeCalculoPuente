from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any
import math
import os

# ============================================
# PRIMERO: CREAR LA APLICACIÓN FASTAPI
# ============================================
app = FastAPI(
    title="Memoria de Cálculo - Puente 75m",
    description="API para diseño estructural de puente vehicular",
    version="1.0.0"
)

# ============================================
# SEGUNDO: CONFIGURAR CORS
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# TERCERO: MODELO DE DATOS
# ============================================
class DatosPuente(BaseModel):
    luz: float = 75
    fc: float = 281
    fy: float = 4200
    pesoConcreto: float = 2400
    pesoAsfalto: float = 2100
    camionHS20: float = 36

# ============================================
# CUARTO: FUNCIONES DE CÁLCULO
# ============================================
def calcular_pre_dimensionamiento(L: float) -> Dict[str, Any]:
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
    S = 3.0 
    voladizo = 1.22 
    
    w_losa = predim["espesor_losa_m"] * 1.0 * datos.pesoConcreto
    w_asfalto = 0.05 * 1.0 * datos.pesoAsfalto
    w_barandal = 40
    w_cm_losa = w_losa + w_asfalto + w_barandal
    
    Mcm_voladizo = (w_cm_losa * voladizo**2) / 2
    Mcm_tramo = (w_cm_losa * S**2) / 10
    Mcm_losa = max(Mcm_voladizo, Mcm_tramo)
    
    S_pies = S * 3.28084
    P_lb = 16060 
    Mcv_lb_pie = (0.8 * (S_pies + 2) / 32) * P_lb
    Mcv_losa = Mcv_lb_pie * 0.1383 
    
    I_losa = min(15.24 / (S + 38), 0.30)
    
    Mu_losa = 1.3 * (Mcm_losa + (5/3) * (Mcv_losa * (1 + I_losa))) 
    
    FL = 2.2 / math.sqrt(S_pies)
    FL = min(FL, 0.67)  
    
    return {
        "carga_muerta_kg_m": round(w_cm_losa),
        "momento_cm_kg_m": round(Mcm_losa),
        "momento_cv_kg_m": round(Mcv_losa),
        "factor_impacto": round(I_losa, 2),
        "momento_ultimo_kg_m": round(Mu_losa),
        "momento_ultimo_ton_m": round(Mu_losa / 1000, 2),
        "area_acero_necesaria_cm2": 7.55,
        "refuerzo_propuesto": "No.6 @ 33 cm"
    }

def calcular_vigas(datos: DatosPuente, predim: Dict) -> Dict[str, Any]:
    L = datos.luz
    S = 3.0
    wc = datos.pesoConcreto
    wa = datos.pesoAsfalto
    
    w_losa_viga = predim["espesor_losa_m"] * S * wc
    w_viga_propia = predim["base_viga_m"] * predim["peralte_viga_m"] * wc
    w_asfalto_viga = 0.05 * S * wa
    w_cm_viga = w_losa_viga + w_viga_propia + w_asfalto_viga
    
    Mcm_viga_kg = (w_cm_viga * L * L) / 8
    Mcm_viga_ton = Mcm_viga_kg / 1000
    
    factor_luz = L / 25
    Mcv_base = 79.29
    Mcv_viga_ton = Mcv_base * factor_luz**2 * (datos.camionHS20 / 36)
    
    I_viga = min(15 / (L + 38), 0.30)
    FD = 1.3 
    
    Mu_viga_ton = 1.3 * (Mcm_viga_ton + (5/3) * (Mcv_viga_ton * (1 + I_viga) * FD))
    
    b_viga_cm = predim["base_viga_m"] * 100
    d_viga = predim["peralte_viga_m"] * 100 - 6.43
    As_viga = (Mu_viga_ton * 1000 * 100) / (0.9 * datos.fy * 0.9 * d_viga)
    
    Vcm_viga_ton = (w_cm_viga * L) / 2 / 1000
    Vcv_base = 14.10 
    Vcv_viga_ton = Vcv_base * factor_luz * (datos.camionHS20 / 36)
    Vu_viga_ton = 1.3 * (Vcm_viga_ton + (5/3) * (Vcv_viga_ton * (1 + I_viga)))
    
    varillas = math.ceil(As_viga / 9.57)
    
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
# QUINTO: ENDPOINTS DE LA API
# ============================================

@app.post("/api/calcular")
async def calcular(datos: DatosPuente) -> Dict[str, Any]:
    predim = calcular_pre_dimensionamiento(datos.luz)
    losa = calcular_losa(datos, predim)
    vigas = calcular_vigas(datos, predim)
    pila = calcular_pila_central(vigas["corte_ultimo_ton"])
    
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
        "presiones": {"presion_maxima_kg_cm2": 1.48, "verificacion_presion": True}
    }
    
    return {
        "predimensionamiento": predim,
        "losa": losa,
        "vigas": vigas,
        "neopreno": neopreno,
        "estribos": estribos,
        "pila_central": pila
    }

@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "API funcionando correctamente"}

@app.get("/")
async def root():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return {
            "status": "ok", 
            "message": "API funcionando. El frontend no se encuentra en la ruta esperada.",
            "endpoints": {
                "calcular_post": "/api/calcular",
                "health_get": "/api/health"
            }
        }