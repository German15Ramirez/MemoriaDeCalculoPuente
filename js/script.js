document.getElementById('calcularBtn').addEventListener('click', function() {
    const datos = {
        luz: parseFloat(document.getElementById('luz').value),
        fc: parseFloat(document.getElementById('fc').value),
        fy: parseFloat(document.getElementById('fy').value),
        pesoConcreto: parseFloat(document.getElementById('pesoConcreto').value),
        pesoAsfalto: parseFloat(document.getElementById('pesoAsfalto').value),
        camionHS20: parseFloat(document.getElementById('camionHS20').value)
    };

    fetch('backend/calcular.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    .then(res => res.json())
    .then(data => {
        const outputDiv = document.getElementById('output');
        if (data.error) {
            outputDiv.innerHTML = `<div class="error">❌ ${data.error}</div>`;
            return;
        }
        
        let html = `
            <div class="resultado-seccion">
                <h3>📐 Fase 2: Pre-dimensionamiento</h3>
                <p>📏 Espesor de losa: <strong>${data.predimensionamiento.espesor_losa_m} m</strong></p>
                <p>📏 Peralte de viga principal: <strong>${data.predimensionamiento.peralte_viga_m} m</strong></p>
                <p>📏 Base de viga principal: <strong>${data.predimensionamiento.base_viga_m} m</strong></p>
                <p>📏 Diafragma interior: ${data.predimensionamiento.diafragma_int_alto_m} m × ${data.predimensionamiento.base_diafragma_m} m</p>
                <p>📏 Diafragma exterior: ${data.predimensionamiento.diafragma_ext_alto_m} m × ${data.predimensionamiento.base_diafragma_m} m</p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🏗️ Fase 3: Diseño de Losa</h3>
                <p>📊 Carga muerta: ${data.losa.carga_muerta_kg_m} kg/m</p>
                <p>📊 Momento último: ${data.losa.momento_ultimo_kg_m.toFixed(2)} kg-m</p>
                <p>📊 Área de acero positiva: ${data.losa.area_acero_positivo_cm2} cm²</p>
                <p>📊 Área de acero negativa: ${data.losa.area_acero_negativo_cm2} cm²</p>
                <p>📊 Refuerzo longitudinal: ${data.losa.area_acero_longitudinal_cm2} cm²</p>
                <p>✅ Refuerzo propuesto: <strong>${data.losa.refuerzo_propuesto}</strong></p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🔄 Fase 4: Diafragmas</h3>
                <p>📏 Separación: ${data.diafragmas.separacion_diafragmas_m} m</p>
                <p>📊 Interior - Acero: ${data.diafragmas.diafragma_interior.acero_total_cm2} cm²</p>
                <p>📊 Exterior - Acero: ${data.diafragmas.diafragma_exterior.acero_total_cm2} cm²</p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🏗️ Fase 5: Vigas Longitudinales</h3>
                <p>📊 Momento último viga interior: <strong>${data.vigas.momento_ultimo_interior_ton_m} ton-m</strong></p>
                <p>📊 Área de acero necesaria: ${data.vigas.area_acero_necesaria_cm2} cm²</p>
                <p>📊 Área de acero máxima: ${data.vigas.area_acero_maxima_cm2} cm²</p>
                <p>📊 Corte último: ${(data.vigas.corte_ultimo_kg / 1000).toFixed(2)} ton</p>
                <p>✅ Refuerzo longitudinal: <strong>${data.vigas.refuerzo_propuesto}</strong></p>
                <p>✅ Estribos: <strong>${data.vigas.estribos_propuestos}</strong></p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🧱 Fase 6: Cortina</h3>
                <p>📏 Dimensiones: ${data.cortina.altura_cortina_m} m × ${data.cortina.espesor_cortina_m} m</p>
                <p>📊 Momento último: ${data.cortina.momento_ultimo_kg_m.toFixed(2)} kg-m</p>
                <p>📊 Área de acero: ${data.cortina.area_acero_cm2} cm²</p>
                <p>✅ Refuerzo propuesto: <strong>${data.cortina.refuerzo_propuesto}</strong></p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🛠️ Fase 8: Apoyos de Neopreno</h3>
                <p>📏 Dimensiones: ${data.neopreno.dimensiones_apoyo_cm} cm</p>
                <p>📊 Esfuerzo actuante: ${data.neopreno.esfuerzo_actuante_kg_cm2} kg/cm²</p>
                <p>📊 Desplazamiento máximo: ${data.neopreno.desplazamiento_maximo_cm} cm</p>
                <p>📊 Espesor total: ${data.neopreno.espesor_total_neopreno_cm} cm</p>
                <p>✅ Verificación: ${data.neopreno.verificacion_desplazamiento ? '✓ Cumple' : '✗ No cumple'}</p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🏔️ Fase 9: Estribos</h3>
                <p>📊 FS Volteo: ${data.estribos.estabilidad.factor_seguridad_volteo}</p>
                <p>📊 FS Deslizamiento: ${data.estribos.estabilidad.factor_seguridad_deslizamiento}</p>
                <p>📊 Presión máxima: ${data.estribos.presiones.presion_maxima_kg_cm2} kg/cm²</p>
                <p>✅ ${data.estribos.presiones.verificacion_presion ? '✓ Presión admisible cumple' : '✗ Presión excede capacidad'}</p>
            </div>
            
            <div class="resultado-seccion">
                <h3>🏛️ Fase 10: Pila Central</h3>
                <p>📊 Peso total: ${data.pila_central.cargas.peso_total_ton} ton</p>
                <p>📊 FS Volteo: ${data.pila_central.estabilidad.factor_seguridad_volteo}</p>
                <p>📊 FS Deslizamiento: ${data.pila_central.estabilidad.factor_seguridad_deslizamiento}</p>
                <p>📊 Presión máxima: ${data.pila_central.presiones.presion_maxima_kg_cm2} kg/cm²</p>
                <p>✅ Refuerzo vertical: <strong>${data.pila_central.refuerzo_propuesto.refuerzo_vertical}</strong></p>
                <p>✅ Refuerzo horizontal: <strong>${data.pila_central.refuerzo_propuesto.refuerzo_horizontal}</strong></p>
            </div>
        `;
        
        outputDiv.innerHTML = html;
    })
    .catch(err => {
        document.getElementById('output').innerHTML = `<div class="error">❌ Error: ${err.message}</div>`;
    });
});