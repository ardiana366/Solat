if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("Service Worker Registered"));
}

let rakaat = 1;
let sujudCount = 0;
let isDark = false;
let wakeLock = null;

const display = document.getElementById('rakaat-display');
const sujudInfo = document.getElementById('sujud-indicator');

// 1. Fungsi Keep Screen On (Wake Lock)
async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock aktif, layar tidak akan mati.');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

// 2. Deteksi Sensor Cahaya
if ('AmbientLightSensor' in window) {
    const sensor = new AmbientLightSensor();
    
    sensor.onreading = () => {
        // Ambang batas 20 lux (bisa disesuaikan tergantung ruangan)
        if (sensor.illuminance < 20) { 
            if (!isDark) {
                isDark = true; // Terdeteksi Sujud (Gelap)
            }
        } else {
            if (isDark) {
                // Bangun dari sujud (Terang kembali)
                isDark = false;
                sujudCount++;
                
                if (sujudCount === 2) {
                    rakaat++;
                    sujudCount = 0;
                }
                updateUI();
            }
        }
    };
    sensor.start();
} else {
    alert("Sensor cahaya tidak didukung di browser ini. Coba gunakan Chrome di Android.");
}

function updateUI() {
    display.innerText = rakaat;
    sujudInfo.innerText = `Sujud: ${sujudCount}/2`;
    // Beri getaran halus setiap rakaat bertambah
    if (sujudCount === 0) navigator.vibrate(200);
}

function resetCounter() {
    rakaat = 1;
    sujudCount = 0;
    updateUI();
}

// Jalankan Wake Lock saat aplikasi dibuka
window.addEventListener('focus', requestWakeLock);
