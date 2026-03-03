if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("Service Worker Registered"));
}

let rakaat = 1;
let sujudCount = 0;
let isDark = false;
let wakeLock = null;

const video = document.getElementById('webcam');
const canvas = document.getElementById('hidden-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const display = document.getElementById('rakaat-display');
const sujudInfo = document.getElementById('sujud-indicator');
const overlay = document.getElementById('start-overlay');

document.getElementById('btn-start').addEventListener('click', async () => {
    // 1. Request Wake Lock (Agar layar tidak mati)
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) { console.log("WakeLock gagal"); }
    }

    // 2. Request Kamera (Sebagai Sensor Cahaya)
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 160, height: 120 } 
        });
        video.srcObject = stream;
        overlay.style.display = 'none'; // Sembunyikan tombol setelah mulai
        
        // Mulai loop deteksi
        setInterval(analyzeFrame, 500); 
    } catch (err) {
        alert("Aplikasi butuh akses kamera untuk mendeteksi sujud di Safari/iOS.");
    }
});

function analyzeFrame() {
    canvas.width = 10;
    canvas.height = 10;
    ctx.drawImage(video, 0, 0, 10, 10);
    const data = ctx.getImageData(0, 0, 10, 10).data;
    
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        brightness += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    brightness /= (data.length / 4);

    // LOGIKA DETEKSI GELAP (SUJUD)
    // Angka 50 adalah threshold. Jika terlalu sensitif, turunkan ke 30.
    if (brightness < 50) { 
        if (!isDark) isDark = true;
    } else {
        if (isDark) {
            isDark = false;
            sujudCount++;
            if (sujudCount === 2) {
                rakaat++;
                sujudCount = 0;
                playBeep(); // Bunyi bip sebagai feedback di iOS
            }
            updateUI();
        }
    }
}

function playBeep() {
    // Karena iOS tidak dukung navigator.vibrate di Safari, kita pakai audio singkat
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, context.currentTime);
    osc.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.1);
}

function updateUI() {
    display.innerText = rakaat;
    sujudInfo.innerText = `Sujud: ${sujudCount}/2`;
}

function resetCounter() {
    rakaat = 1;
    sujudCount = 0;
    updateUI();
}
