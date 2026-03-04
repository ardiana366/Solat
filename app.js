if ('serviceWorker' in navigator) {
  // Tambahkan query string agar browser mendeteksi perubahan file sw.js
  navigator.serviceWorker.register('./sw.js?v=' + Date.now())
    .then(() => console.log("Service Worker Updated"));
}

let rakaat = 1;
let sujudCount = 0;
let isDark = false;
let wakeLock = null;
let lastActionTime = 0;
let darkThreshold = 40; // Nilai default, akan diperbarui saat kalibrasi
let isTasyahudPhase = false;
let targetRakaat = 4;
let jenisShalat = "wajib";

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
    // Simpan pilihan user
    targetRakaat = parseInt(document.getElementById('select-rakaat').value);
    jenisShalat = document.getElementById('select-jenis').value;
    
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
    if (isTasyahudPhase) return;
    
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
                processRakaatTransition()
            }
            updateUI();
        }
    }
}

function processRakaatTransition() {
    sujudCount = 0;
    playBeep();

    // 1. CEK TASYAHUD AKHIR (Jika rakaat saat ini sudah maksimal)
    if (rakaat === targetRakaat) {
        displayTasyahud("TASYAHUD AKHIR", false);
        return;
    }

    // 2. CEK TASYAHUD AWAL (Hanya jika Wajib & Rakaat ke-2 & Target > 2)
    if (jenisShalat === "wajib" && rakaat === 2 && targetRakaat > 2) {
        displayTasyahud("TASYAHUD AWAL", true);
    } else {
        // Shalat Sunnah atau Rakaat biasa
        rakaat++;
        updateUI();
    }
}

function displayTasyahud(text, isAutoNext) {
    isTasyahudPhase = true;
    const display = document.getElementById('rakaat-display');
    
    // Pecah teks menjadi 2 baris: "TASYAHUD" dan "AWAL/AKHIR"
    // Ini membuat teks lebih berbentuk kotak (sesuai layar portrait)
    let formattedText = text.replace(" ", "<br>");
    
    // Ubah ukuran font untuk teks (tidak akan membuat layout meloncat karena CSS flex: 1)
    display.style.fontSize = "12vh"; 
    display.innerHTML = formattedText;

    if (isAutoNext) {
        // Tunggu 15 detik untuk tasyahud awal, lalu masuk rakaat 3
        setTimeout(() => {
            rakaat++;
            // Kembalikan ke ukuran raksasa untuk angka
            display.style.fontSize = "60vh"; 
            isTasyahudPhase = false;
            updateUI();
        }, 15000); 
    } else {
        // Tasyahud akhir tetap di layar
        document.getElementById('sujud-indicator').innerText = "Shalat Selesai";
    }
}

// Pastikan fungsi updateUI menggunakan innerHTML (bukan innerText) 
// agar transisi kembali dari teks ke angka berjalan mulus.
function updateUI() {
    const display = document.getElementById('rakaat-display');
    const indicator = document.getElementById('sujud-indicator');
    
    if (!isTasyahudPhase) {
        display.style.fontSize = "60vh"; // Pastikan font kembali besar
        display.innerHTML = rakaat;      // Gunakan innerHTML
        indicator.innerText = `SUJUD: ${sujudCount}/2`;
    }
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
