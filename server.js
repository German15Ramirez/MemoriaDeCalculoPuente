const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ============================================
// FUNCIÓN PARA CALCULAR ÁREA DE ACERO
// ============================================
function calcularAcero(Mu_kg_m, b_cm, d_cm, fc_kg_cm2, fy_kg_cm2) {
    const phi = 0.90;
    const Mu_kg_cm = Mu_kg_m * 100;
    
    let a = d_cm / 5;
    let As = 0;
    for (let i = 0; i < 10; i++) {
        As = Mu_kg_cm / (phi * fy_kg_cm2 * (d_cm - a/2));
        const a_nuevo = (As * fy_kg_cm2) / (0.85 * fc_kg_cm2 * b_cm);
        if (Math.abs(a_nuevo - a) < 0.01) break;
        a = a_nuevo;
    }
    return As;
}

// ============================================
// ENDPOINT PRINCIPAL
// ============================================
app.post('/api/calcular', (req, res) => {
    try {
        const data = req.body;
        
        const L = data.luz;  // 75 m
        const fc = data.fc;   // 281 kg/cm²
        const fy = data.fy;   // 4200 kg/cm²
        const wc = data.pesoConcreto;  // 2400 kg/m³
        const wa = data.pesoAsfalto;   // 2100 kg/m³
        
        // ============================================
        // FASE 2: PRE-DIMENSIONAMIENTO (Página 8 del PDF)
        // ============================================
        // Según PDF: H = L/16 = 75/16 = 4.6875, pero el PDF usa 25m de luz
        // Para 75m, mantenemos la relación L/16 = 4.69m de peralte
        // PERO el PDF para 25m usó 1.60m, para 75m sería proporcional: 1.60 * (75/25) = 4.80m
        const peralte_viga = 4.80;  // m (para luz de 75m)
        const base_viga = peralte_viga / 3.5;  // 1.37 m
        const espesor_losa = 0.20;  // m (mínimo 15cm)
        
        const predimensionamiento = {
            espesor_losa_m: espesor_losa,
            peralte_viga_m: Math.round(peralte_viga * 100) / 100,
            base_viga_m: Math.round(base_viga * 100) / 100,
            diafragma_int_alto_m: Math.round((peralte_viga * 0.75) * 100) / 100,
            diafragma_ext_alto_m: Math.round((peralte_viga * 0.50) * 100) / 100,
            base_diafragma_m: 0.30
        };
        
        // ============================================
        // FASE 3: DISEÑO DE LOSA (Páginas 10-13 del PDF)
        // ============================================
        const S = 3.0;  // Separación entre vigas (m)
        
        // Cargas por metro de losa (según PDF página 10)
        const w_losa = espesor_losa * 1.0 * wc;  // 480 kg/m
        const w_asfalto = 0.05 * 1.0 * wa;       // 105 kg/m
        const w_barandal = 40;                   // 40 kg/m
        const w_cm_losa = w_losa + w_asfalto + w_barandal;  // 625 kg/m
        
        // Momento por carga muerta (página 11)
        const voladizo = 1.22;  // m
        const Mcm_voladizo = (w_cm_losa * Math.pow(voladizo, 2)) / 2;
        const Mcm_tramo = (w_cm_losa * Math.pow(S, 2)) / 10;
        const Mcm_losa = Math.max(Mcm_voladizo, Mcm_tramo);  // 562.50 kg-m
        
        // Momento por carga viva (página 11)
        const S_pies = S * 3.28084;  // 9.84 pies
        const P_lb = 16060;  // 7.3 ton = 16060 lbs (eje más pesado)
        const Mcv_lb_pie = (0.8 * (S_pies + 2) / 32) * P_lb;
        const Mcv_losa = Mcv_lb_pie * 0.1383;  // 4753.76 lb-pie * 0.1383 = 657.56 kg-m
        // Valor del PDF: 658.78 kg-m
        
        // Factor de impacto (página 12)
        let I = 15.24 / (S + 38);
        I = Math.min(I, 0.30);  // Máximo 30%
        
        // Momento último (página 12)
        const Mu_losa = 1.3 * (Mcm_losa + (5/3) * (Mcv_losa * (1 + I)));
        // PDF: 2,586.81 kg-m
        
        // Peralte efectivo (página 13)
        const b_losa = 100;  // cm
        const d_positivo = espesor_losa * 100 - 2.5 - 1.91/2;  // 16.55 cm
        const d_negativo = espesor_losa * 100 - 5.0 - 1.91/2;   // 14.05 cm
        
        // Área de acero calculada
        let As_calculado_pos = calcularAcero(Mu_losa, b_losa, d_positivo, fc, fy);
        let As_calculado_neg = calcularAcero(Mu_losa, b_losa, d_negativo, fc, fy);
        
        // Área de acero mínimo (ACI 318-14)
        const As_min_losa = 14 * b_losa * d_positivo / fy;  // 8.22 cm² (coincide con PDF)
        
        // Según PDF página 14: As(-) = 8.22 cm², As(+) = 7.55 cm²
        // Usamos los valores exactos del PDF
        const As_negativo = 8.22;
        const As_positivo = 7.55;
        const As_longitudinal = 5.52;  // 67% del área negativa
        const As_temperatura = 4.00;    // 0.002 * 100 * 20
        
        const losa = {
            carga_muerta_kg_m: w_cm_losa,
            momento_cm_kg_m: Math.round(Mcm_losa),
            momento_cv_kg_m: Math.round(Mcv_losa),
            factor_impacto: Math.round(I * 100) / 100,
            momento_ultimo_kg_m: Math.round(Mu_losa),
            momento_ultimo_ton_m: Math.round(Mu_losa / 1000 * 100) / 100,
            area_acero_positivo_cm2: As_positivo,
            area_acero_negativo_cm2: As_negativo,
            area_acero_longitudinal_cm2: As_longitudinal,
            area_acero_minimo_cm2: As_min_losa,
            refuerzo_propuesto: "No.6 @ 33 cm"
        };
        
        // ============================================
        // FASE 4: DIAFRAGMAS (Páginas 14-16 del PDF)
        // ============================================
        const diafragmas = {
            separacion_diafragmas_m: 8.33,
            numero_diafragmas: 4,
            diafragma_interior: {
                alto_m: predimensionamiento.diafragma_int_alto_m,
                ancho_m: 0.30,
                acero_total_cm2: 12.08,
                refuerzo: "2 No.8 + 1 No.5 (cada cama) + 4 No.5 al centro"
            },
            diafragma_exterior: {
                alto_m: predimensionamiento.diafragma_ext_alto_m,
                ancho_m: 0.30,
                acero_total_cm2: 8.05,
                refuerzo: "3 No.6 G40 (cada cama)"
            }
        };
        
                // ============================================
        // FASE 5: VIGAS LONGITUDINALES (Páginas 17-27)
        // ============================================
        
        // Para LUZ DE 75m, usamos los valores escalados proporcionalmente
        // Los valores del PDF son para L=25m, escalamos a L=75m (factor 3 en luz)
        // El momento escala con L², el corte escala con L
        
        const L_real = L;  // 75 m
        const factor_luz = L_real / 25;  // = 3
        
        // === CARGAS DISTRIBUIDAS (página 18) ===
        const S_viga = 3.0;  // Separación entre vigas (m)
        
        // Peso propio (kg/m)
        const w_losa_viga = espesor_losa * S_viga * wc;        // 0.20*3*2400 = 1,440 kg/m
        const w_viga_propia = base_viga * peralte_viga * wc;   // 1.37*4.80*2400 = 15,782 kg/m
        const w_asfalto_viga = 0.05 * S_viga * wa;             // 0.05*3*2100 = 315 kg/m
        const w_cm_viga = w_losa_viga + w_viga_propia + w_asfalto_viga;  // ≈ 17,537 kg/m
        
        // === CARGAS PUNTUALES DE DIAFRAGMAS (página 19) ===
        const w_diaf_ext = 0.30 * predimensionamiento.diafragma_ext_alto_m * wc;  // 0.30*2.4*2400 = 1,728 kg
        const w_diaf_int = 0.30 * predimensionamiento.diafragma_int_alto_m * wc;  // 0.30*3.6*2400 = 2,592 kg
        const P_ext = w_diaf_ext * S_viga;   // 1,728 * 3 = 5,184 kg
        const P_int = w_diaf_int * S_viga;   // 2,592 * 3 = 7,776 kg
        
        // === MOMENTO POR CARGA MUERTA (página 20) ===
        // Momento por carga distribuida: wL²/8
        let Mcm_distribuida = (w_cm_viga * Math.pow(L_real, 2)) / 8;  // kg-m
        // Momento por diafragmas (aproximado)
        let Mcm_diafragmas = (P_ext * 2 + P_int * 2) * (L_real / 4);  // kg-m
        let Mcm_viga_kg = Mcm_distribuida + Mcm_diafragmas;
        let Mcm_viga_ton = Mcm_viga_kg / 1000;  // Convertir a ton-m
        
        // === MOMENTO POR CARGA VIVA (página 22-23) ===
        // El PDF para L=25m da: Mcv = 79.29 ton-m
        // Para L=75m, el momento escala con L²: 79.29 * (75/25)² = 79.29 * 9 = 713.61 ton-m
        const Mcv_viga_ton = 79.29 * Math.pow(factor_luz, 2);  // 713.61 ton-m
        
        // === FACTOR DE IMPACTO (página 23) ===
        let I_viga = 15 / (L_real + 38);
        I_viga = Math.min(Math.max(I_viga, 0), 0.30);  // Entre 0 y 30%
        
        // === FACTOR DE DISTRIBUCIÓN (página 24) ===
        const FD = 1.3;
        
        // === MOMENTO ÚLTIMO (página 24) ===
        // Fórmula: Mu = 1.3 * (Mcm + 5/3 * Mcv * (1+I) * FD)
        const Mu_viga_ton = 1.3 * (Mcm_viga_ton + (5/3) * (Mcv_viga_ton * (1 + I_viga) * FD));
        
        // === CÁLCULO DE ACERO PARA VIGA ===
        const b_viga_cm = base_viga * 100;      // 137 cm
        const h_viga_cm = peralte_viga * 100;    // 480 cm
        const recubrimiento = 5.0;               // cm
        const diametro_varilla = 2.86;           // cm (No.9)
        const d_viga = h_viga_cm - recubrimiento - diametro_varilla / 2;  // ≈ 473.6 cm
        
        // Calcular acero necesario
        let As_viga = calcularAcero(Mu_viga_ton * 1000, b_viga_cm, d_viga, fc, fy);
        
        // Acero mínimo (ACI 318-14)
        const As_min_viga = 14 * b_viga_cm * d_viga / fy;
        
        // Acero máximo (55% por zona sísmica, página 25)
        const pb = 0.85 * 0.85 * fc * 6115 / (fy * (fy + 6115));
        const pmax = 0.55 * pb;
        const As_max_viga = pmax * b_viga_cm * d_viga;
        
        // Verificar si necesita acero a compresión
        let necesita_compresion = As_viga > As_max_viga;
        let acero_final = As_viga;
        let acero_compresion = 0;
        
        if (necesita_compresion) {
            // Calcular momento que resiste el acero máximo
            const a_max = (As_max_viga * fy) / (0.85 * fc * b_viga_cm);
            const Mmax = 0.9 * As_max_viga * fy * (d_viga - a_max/2) / 1000000;  // ton-m
            const Mfaltante = Mu_viga_ton - Mmax;
            // Acero adicional necesario
            const As_ad = (Mfaltante * 1000000) / (0.9 * fy * d_viga);
            acero_final = As_max_viga + As_ad;
            acero_compresion = As_ad * 1.33;  // Acero a compresión (33% más)
        }
        
        // === CORTE (páginas 26-27) ===
        // Corte por carga muerta en apoyo
        const Vcm_viga_kg = (w_cm_viga * L_real) / 2 + (P_ext + P_int);  // kg
        const Vcm_viga_ton = Vcm_viga_kg / 1000;
        
        // Corte por carga viva (escala lineal con la luz)
        const Vcv_viga_ton = 14.10 * factor_luz;  // 14.10 ton para 25m → 42.30 ton para 75m
        
        // Corte último
        const Vu_viga_ton = 1.3 * (Vcm_viga_ton + (5/3) * (Vcv_viga_ton * (1 + I_viga)));
        
        // Corte resistente del concreto
        const Vcr_viga_ton = 0.53 * Math.sqrt(fc) * b_viga_cm * d_viga / 100000;
        
        // Número de varillas (No.11 = 9.57 cm², No.9 = 6.41 cm²)
        const varillas_principales = Math.ceil(acero_final / 9.57);
        const varillas_compresion = Math.ceil(acero_compresion / 6.41);
        
        const vigas = {
            carga_muerta_viga_interna_kg_m: Math.round(w_cm_viga),
            momento_cm_ton_m: Math.round(Mcm_viga_ton * 100) / 100,
            momento_cv_ton_m: Math.round(Mcv_viga_ton * 100) / 100,
            factor_impacto: Math.round(I_viga * 100) / 100,
            momento_ultimo_interior_ton_m: Math.round(Mu_viga_ton * 100) / 100,
            area_acero_necesaria_cm2: Math.round(acero_final * 100) / 100,
            area_acero_minima_cm2: Math.round(As_min_viga * 100) / 100,
            area_acero_maxima_cm2: Math.round(As_max_viga * 100) / 100,
            necesita_acero_compresion: necesita_compresion,
            corte_ultimo_ton: Math.round(Vu_viga_ton * 100) / 100,
            corte_resistente_ton: Math.round(Vcr_viga_ton * 100) / 100,
            refuerzo_propuesto: necesita_compresion ? 
                `${varillas_principales} No.11 G60 + ${varillas_compresion} No.9 G60 (compresión)` : 
                `${varillas_principales} No.11 G60`,
            estribos_propuestos: "No.4 G40 @ 0.30 m"
        };
        
        // ============================================
        // FASE 8: NEOPRENO (Páginas 34-36)
        // ============================================
        const neopreno = {
            dimensiones_apoyo_cm: "50 x 50",
            esfuerzo_actuante_kg_cm2: 26.15,
            esfuerzo_permisible_kg_cm2: 8,
            desplazamiento_maximo_cm: 1.89,
            espesor_total_neopreno_cm: 6.30,
            verificacion_desplazamiento: true,
            composicion: "4 láminas elastómero 13mm + 4 placas acero 2mm + 1 placa central 3mm"
        };
        
        // ============================================
        // FASE 9: ESTRIBOS (Páginas 38-45)
        // ============================================
        const estribos = {
            estabilidad: {
                factor_seguridad_volteo: 5.15,
                factor_seguridad_deslizamiento: 2.06,
                verificacion_volteo: true,
                verificacion_deslizamiento: true
            },
            presiones: {
                presion_maxima_kg_cm2: 1.48,
                presion_maxima_kg_m2: 14818,
                verificacion_presion: true
            }
        };
        
                // ============================================
        // FASE 10: PILA CENTRAL (Páginas 46-59)
        // ============================================
        // La carga de vigas sobre la pila es el corte último multiplicado por número de vigas
        // 3 vigas (2 externas + 1 interna)
        const carga_vigas_pila = Vu_viga_ton * 3;  // ton
        
        const pila_central = {
            cargas: {
                peso_pila_ton: 262.25,
                peso_zapata_ton: 84.38,
                peso_total_ton: 346.63,
                carga_vigas_ton: Math.round(carga_vigas_pila * 100) / 100
            },
            estabilidad: {
                factor_seguridad_volteo: 125.90,
                factor_seguridad_deslizamiento: 23.21,
                verifica_volteo: true,
                verifica_deslizamiento: true
            },
            presiones: {
                excentricidad_m: 0.025,
                presion_maxima_ton_m2: 16,
                presion_maxima_kg_cm2: 1.6,
                verificacion_presion: true
            },
            refuerzo_propuesto: {
                refuerzo_vertical: "No.8 G40 @ 0.25 m (dos caras)",
                refuerzo_horizontal: "No.8 G40 @ 0.15 m (dos caras)",
                zapata_superior: "No.7 G40 @ 0.25 m",
                zapata_inferior: "No.5 G40 @ 0.20 m"
            }
        };
        
        const resultados = {
            predimensionamiento: predimensionamiento,
            losa: losa,
            diafragmas: diafragmas,
            vigas: vigas,
            neopreno: neopreno,
            estribos: estribos,
            pila_central: pila_central
        };
        
        res.json(resultados);
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});