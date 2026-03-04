if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("Service Worker Registered"));
}

let rakaat = 1;
let sujudCount = 0;
let isDark = false;
let wakeLock = null;
let lastActionTime = 0;
let darkThreshold = 40; // Nilai default, akan diperbarui saat kalibrasi

const video = document.getElementById('webcam');
const canvas = document.getElementById('hidden-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const display = document.getElementById('rakaat-display');
const sujudInfo = document.getElementById('sujud-indicator');
const overlay = document.getElementById('start-overlay');

// Fungsi pembantu untuk mengambil nilai kecerahan saat ini
function getCurrentBrightness() {
    canvas.width = 10;
    canvas.height = 10;
    ctx.drawImage(video, 0, 0, 10, 10);
    const data = ctx.getImageData(0, 0, 10, 10).data;
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        brightness += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    return brightness / (data.length / 4);
}

document.getElementById('btn-start').addEventListener('click', async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) { console.log("WakeLock gagal"); }
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 160, height: 120 } 
        });
        video.srcObject = stream;
        video.play();
        
        overlay.style.display = 'none';
        sujudInfo.innerText = "KALIBRASI CAHAYA...";

        // --- LOGIKA OTOMATIS: KALIBRASI ---
        // Tunggu 2 detik agar kamera menyesuaikan exposure (kecerahan otomatis kamera)
        setTimeout(() => {
            const ambientBrightness = getCurrentBrightness();
            // Set threshold ke 50% dari cahaya ruangan saat ini
            // Jika ruangan sangat terang (siang), threshold akan tinggi.
            // Jika ruangan gelap (malam), threshold akan rendah.
            darkThreshold = ambientBrightness * 0.5; 
            
            console.log("Cahaya Ruangan:", ambientBrightness);
            console.log("Threshold Otomatis:", darkThreshold);
            
            sujudInfo.innerText = `Sujud: 0/2`;
            setInterval(analyzeFrame, 500); 
        }, 5000);

    } catch (err) {
        alert("Aplikasi butuh akses kamera untuk mendeteksi sujud.");
    }
});

function analyzeFrame() {
    const brightness = getCurrentBrightness();
    const currentTime = Date.now();

    if (currentTime - lastActionTime < 1500) return; 

    if (brightness < darkThreshold) { 
        if (!isDark) {
            isDark = true;
            lastActionTime = currentTime;
            console.log("Deteksi: Sujud");
        }
    } else {
        if (isDark) {
            isDark = false;
            lastActionTime = currentTime;
            sujudCount++; 
            
            if (sujudCount === 2) {
                rakaat++;
                sujudCount = 0; 
                playBeep();
            }
            updateUI();
        }
    }
}

function updateUI() {
    display.innerText = rakaat;
    sujudInfo.innerText = `Sujud: ${sujudCount}/2`;
}

function playBeep() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, context.currentTime);
    osc.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.1);
}

// FUNGSI RESET UTAMA
document.getElementById('btn-reset').addEventListener('click', function() {
    console.log("Resetting app...");
    
    // 1. Matikan kamera jika masih jalan
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    
    // 2. Refresh halaman sepenuhnya
    window.location.href = window.location.pathname + '?reload=' + Date.now();
});

function resetApp() {
    // Refresh halaman untuk mengembalikan semua ke kondisi awal
    window.location.reload();
}
