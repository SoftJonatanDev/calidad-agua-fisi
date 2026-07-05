// js/main.js
import { database, ref, onValue } from './firebase-app.js';

// --- CONFIGURACIÓN GLOBAL DE CHART.JS PARA MODO OSCURO ---
Chart.defaults.color = '#94A3B8';
Chart.defaults.font.family = "'Space Grotesk', sans-serif";

// --- 1. CONFIGURACIÓN DE LOS VELOCÍMETROS ---
const gaugeOptions = {
    responsive: true, 
    maintainAspectRatio: false, 
    cutout: '80%', /* Ligeramente más grueso para verse bien en tamaño grande */
    rotation: 270, 
    circumference: 180,
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    animation: { animateRotate: true, animateScale: false }
};

function initGauge(id, color) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 100], backgroundColor: [color, '#334155'], borderWidth: 0 }] },
        options: gaugeOptions
    });
}

const gaugeTemp = initGauge('gaugeTemp', '#FB923C'); 
const gaugePh = initGauge('gaugePh', '#22D3EE');     
const gaugeTds = initGauge('gaugeTds', '#818CF8');   
const gaugeTurb = initGauge('gaugeTurb', '#F472B6'); 

function updateGauge(chart, value, maxVal) {
    let safeValue = value > maxVal ? maxVal : value;
    chart.data.datasets[0].data = [safeValue, maxVal - safeValue];
    chart.update();
}

// --- 2. CONFIGURACIÓN DE LOS GRÁFICOS DE LÍNEAS INDIVIDUALES ---
const lineOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: { display: false } },
    scales: {
        x: { grid: { color: '#334155' } },
        y: { grid: { color: '#334155' } } 
    }
};
        
function initLineChart(id, label, color) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: label, borderColor: color, backgroundColor: color + '22', data: [], tension: 0.4, fill: true, borderWidth: 2, pointRadius: 3 }] },
        options: { ...lineOptions, plugins: { title: { display: true, text: label, color: '#F8FAFC' } } }
    });
}

const lineTemp = initLineChart('chartTemp', 'Temperatura (°C)', '#FB923C');
const linePh = initLineChart('chartPh', 'pH', '#22D3EE');
const lineTds = initLineChart('chartTds', 'TDS (ppm)', '#818CF8');
const lineTurb = initLineChart('chartTurb', 'Claridad (%)', '#F472B6');

// --- 3. CONEXIÓN EN TIEMPO REAL CON FIREBASE ---
const datosRef = ref(database, 'sensor_data');

onValue(datosRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
        const t = data.temperature_c !== undefined ? data.temperature_c : 0;
        const p = data.ph !== undefined ? data.ph : 0;
        const s = data.tds_ppm !== undefined ? data.tds_ppm : 0;
        const tu = data.turbidity_ntu !== undefined ? data.turbidity_ntu : 0;

        // Actualizar Textos
        document.getElementById("valTemp").innerText = t.toFixed(1);
        document.getElementById("valPh").innerText = p.toFixed(2);
        document.getElementById("valTds").innerText = Math.round(s);
        document.getElementById("valTurb").innerText = tu.toFixed(1);
        
        // Mover Agujas
        updateGauge(gaugeTemp, t, 50); 
        updateGauge(gaugePh, p, 14);
        updateGauge(gaugeTds, s, 500); 
        updateGauge(gaugeTurb, tu, 100); 

        // Actualizar Gráficos Históricos
        const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second:'2-digit' });
        
        lineTemp.data.labels.push(hora); lineTemp.data.datasets[0].data.push(t);
        linePh.data.labels.push(hora);   linePh.data.datasets[0].data.push(p);
        lineTds.data.labels.push(hora);  lineTds.data.datasets[0].data.push(s);
        lineTurb.data.labels.push(hora); lineTurb.data.datasets[0].data.push(tu);

        // Límite de 15 datos
        if (lineTemp.data.labels.length > 15) {
            lineTemp.data.labels.shift(); lineTemp.data.datasets[0].data.shift();
            linePh.data.labels.shift();   linePh.data.datasets[0].data.shift();
            lineTds.data.labels.shift();  lineTds.data.datasets[0].data.shift();
            lineTurb.data.labels.shift(); lineTurb.data.datasets[0].data.shift();
        }

        lineTemp.update(); 
        linePh.update(); 
        lineTds.update(); 
        lineTurb.update();

        // --- 4. ACTUALIZAR 4 ALERTAS INDIVIDUALES CON DIAGNÓSTICO DETALLADO ---
        
        // 1. Alerta de Temperatura
        const badgeTemp = document.getElementById("badgeTemp");
        if (t > 35.0) {
            badgeTemp.innerText = "TEMP: ALTA (Riesgo biológico)";
            badgeTemp.className = "status-badge alert";
        } else {
            badgeTemp.innerText = "TEMP: ÓPTIMA";
            badgeTemp.className = "status-badge normal";
        }

        // 2. Alerta de pH
        const badgePh = document.getElementById("badgePh");
        if (p < 6.5) {
            badgePh.innerText = "pH: ÁCIDO (Riesgo corrosivo)";
            badgePh.className = "status-badge alert";
        } else if (p > 8.5) {
            badgePh.innerText = "pH: ALCALINO (Agua dura)";
            badgePh.className = "status-badge alert";
        } else {
            badgePh.innerText = "pH: NEUTRO (Seguro)";
            badgePh.className = "status-badge normal";
        }

        // 3. Alerta de TDS
        const badgeTds = document.getElementById("badgeTds");
        if (s > 1000) {
            badgeTds.innerText = "TDS: CRÍTICO (No potable)";
            badgeTds.className = "status-badge alert";
        } else if (s > 500) {
            badgeTds.innerText = "TDS: ALTO (Exceso de sales)";
            badgeTds.className = "status-badge alert";
        } else {
            badgeTds.innerText = "TDS: IDEAL (Agua limpia)";
            badgeTds.className = "status-badge normal";
        }

        // 4. Alerta de Claridad
        const badgeTurb = document.getElementById("badgeTurb");
        if (tu < 60.0) {
            badgeTurb.innerText = "CLARIDAD: BAJA (Partículas)";
            badgeTurb.className = "status-badge alert";
        } else {
            badgeTurb.innerText = "CLARIDAD: ALTA (Cristalina)";
            badgeTurb.className = "status-badge normal";
        }

        // --- 5. LÓGICA DEL VEREDICTO GENERAL ---
        let problemasDetectados = []; 

        if (t > 35.0) problemasDetectados.push("Temp Alta");
        if (p < 6.5) problemasDetectados.push("pH Ácido");
        if (p > 8.5) problemasDetectados.push("pH Alcalino");
        if (s > 500) problemasDetectados.push("TDS Alto");
        if (tu < 60.0) problemasDetectados.push("Agua Turbia");

        const badgeGeneral = document.getElementById("estadoGeneral");
        
        if (problemasDetectados.length === 0) {
            badgeGeneral.innerText = "AGUA POTABLE (Parámetros Normales)";
            badgeGeneral.className = "status-badge normal";
        } else {
            badgeGeneral.innerText = "ALERTA: " + problemasDetectados.join(" | ");
            badgeGeneral.className = "status-badge alert";
        }

        // Actualizar estado de conexión
        document.getElementById("conexionTxt").innerText = "Monitoreo En Vivo";
        document.getElementById("conexionTxt").style.color = "#10B981";
        document.getElementById("dotStatus").style.backgroundColor = "#10B981";
        document.getElementById("dotStatus").style.boxShadow = "0 0 8px #10B981";
    }
}, (error) => {
    console.error("Error Firebase:", error);
    document.getElementById("conexionTxt").innerText = "Señal Perdida";
    document.getElementById("conexionTxt").style.color = "#EF4444";
    document.getElementById("dotStatus").style.backgroundColor = "#EF4444";
    document.getElementById("dotStatus").style.boxShadow = "0 0 8px #EF4444";
});

// --- 6. LÓGICA DE PESTAÑAS ---
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
};

// ==========================================================
// 7. EXPORTAR REPORTE A PDF (ACTUALIZACIÓN INMEDIATA)
// ==========================================================
window.exportarPDF = function() {
  const element = document.getElementById('reporte-contenido');
  
  // 1. Mostrar todas las pestañas para la captura
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'block';
  });
  
  // 2. Aplicar clases de compresión seguras
  element.classList.add('pdf-export-mode');

  // 🟢 INYECTAR TÍTULO DINÁMICO SOLO PARA EL PDF
  const titleDiv = document.createElement('div');
  titleDiv.id = "pdf-dynamic-title";
  titleDiv.innerHTML = "<h2 style='text-align: center; color: #F8FAFC; margin-bottom: 25px; font-size: 28px; font-weight: bold;'>Informe de Calidad de Agua</h2>";
  element.insertBefore(titleDiv, element.firstChild);

  // 3. Forzar manualmente a Chart.js a recalcular tamaños
  Object.values(Chart.instances).forEach(chart => {
      chart.resize();
  });

  // 4. Timeout para garantizar el redibujado
  setTimeout(() => {
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: 'Reporte_Calidad_Agua_FISI.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0F172A",
        windowWidth: 1024, // 🟢 Ajustado a 1024px para evitar el corte derecho
        scrollX: 0, 
        scrollY: 0, 
        x: 0, 
        y: 0  
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // 5. Limpieza: devolver el diseño a la normalidad en la web
      element.classList.remove('pdf-export-mode');
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = '';
      });
      
      const activeTabBtn = document.querySelector('.tab-btn.active');
      if (activeTabBtn) {
        activeTabBtn.click();
      }

      // 🟢 REMOVER EL TÍTULO INYECTADO
      const injectedTitle = document.getElementById('pdf-dynamic-title');
      if (injectedTitle) {
          injectedTitle.remove();
      }

      // Devolver los gráficos a su tamaño web original
      Object.values(Chart.instances).forEach(chart => {
          chart.resize();
      });
    });
  }, 1000); 
};
