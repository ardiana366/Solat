if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("Service Worker Registered"));
}

let rakaat = 1;
let sujudCount = 0;
let isDark = false;
let wakeLock = null;
let lastActionTime = 0;

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

    const currentTime = Date.now();
    // Jeda 1.5 detik agar tidak terjadi double-count akibat gerakan tangan/kepala yang cepat
    if (currentTime - lastActionTime < 1500) return; 

    // Ambang batas kegelapan (Sesuaikan jika ruangan terlalu terang/gelap)
    const darkThreshold = 40; 

    if (brightness < darkThreshold) { 
        // KONDISI: SEDANG SUJUD (GELAP)
        if (!isDark) {
            isDark = true;
            lastActionTime = currentTime;
            console.log("Deteksi: Kepala turun (Sujud)");
        }
    } else {
        // KONDISI: BANGUN DARI SUJUD (TERANG)
        if (isDark) {
            isDark = false;
            lastActionTime = currentTime;
            sujudCount++; // Tambah hitungan sujud saat kepala naik
            
            console.log("Deteksi: Kepala naik. Jumlah sujud saat ini: " + sujudCount);

            // LOGIKA UTAMA:
            // Rakaat TIDAK bertambah di sujud ke-1.
            // Rakaat BARU bertambah setelah sujud ke-2 selesai.
            if (sujudCount === 2) {
                rakaat++;
                sujudCount = 0; // Reset hitungan sujud untuk rakaat berikutnya
                playBeep();    // Feedback suara agar user tahu rakaat sudah ganti
            }
            
            updateUI();
        }
    }
}

function updateUI() {
    const display = document.getElementById('rakaat-display');
    const indicator = document.getElementById('sujud-indicator');
    
    display.innerText = rakaat;
    // Menampilkan status sujud agar user bisa memantau
    indicator.innerText = `Sujud: ${sujudCount}/2`;
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
