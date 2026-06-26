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
const lineTurb = initLineChart('chartTurb', 'Turbidez (NTU)', '#F472B6');

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
        updateGauge(gaugeTurb, tu, 5); 

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

        // Actualizar Alerta
        const badge = document.getElementById("estadoAgua");
        if (data.contamination_type) {
            badge.innerText = data.contamination_type;
            badge.className = "status-badge " + (data.contamination_type.toLowerCase().includes("alerta") ? "alert" : "normal");
        }

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

// --- 4. LÓGICA DE PESTAÑAS ---
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
};

// --- 5. EXPORTAR REPORTE A PDF (ACTUALIZADO AL NUEVO ANCHO GIGANTE) ---
window.exportarPDF = function() {
    const element = document.getElementById('reporte-contenido');
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'block');
    element.classList.add('pdf-export-mode');
    
    const opt = {
        margin:       0.2, 
        filename:     'Reporte_Calidad_Agua_FISI.pdf',
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: "#0F172A", 
            windowWidth: 1400 // CAMBIO: Ahora simula la pantalla gigante de 1400px
        },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('pdf-export-mode');
        document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = ''); 
        document.querySelector('.tab-btn.active').click();
    });
};