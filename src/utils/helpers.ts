export function formatIndonesianDate(dateInput: Date | string = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatIndonesianDateTime(dateInput: Date | string = new Date()): {
  dateFormatted: string;
  timeFormatted: string;
  fullFormatted: string;
} {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const timeFormatted = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' WIB';

  return {
    dateFormatted,
    timeFormatted,
    fullFormatted: `${dateFormatted}, ${timeFormatted}`,
  };
}

export function generateTransactionNumber(type: 'IN' | 'OUT'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digits
  const prefix = type === 'OUT' ? 'REQ-GA' : 'TRX-IN';
  return `${prefix}-${year}${month}${day}-${randomSuffix}`;
}

export function generateItemCode(categoryPrefix: string = 'ATK'): string {
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `GA-${categoryPrefix.toUpperCase()}-${randomNum}`;
}

export function detectCategoryFromName(name: string): string {
  const lower = name.toLowerCase();

  // ATK (Alat Tulis Kantor)
  if (
    lower.includes('kertas') ||
    lower.includes('hvs') ||
    lower.includes('pulpen') ||
    lower.includes('pen ') ||
    lower.includes('pensil') ||
    lower.includes('spidol') ||
    lower.includes('buku') ||
    lower.includes('binder') ||
    lower.includes('map') ||
    lower.includes('ordner') ||
    lower.includes('staples') ||
    lower.includes('klip') ||
    lower.includes('cutter') ||
    lower.includes('gunting') ||
    lower.includes('penggaris') ||
    lower.includes('amplop') ||
    lower.includes('tipe-x') ||
    lower.includes('koreksi') ||
    lower.includes('tinta') ||
    lower.includes('memo') ||
    lower.includes('post-it')
  ) {
    return 'ATK (Alat Tulis Kantor)';
  }

  // Kebersihan & Sanitasi
  if (
    lower.includes('sapu') ||
    lower.includes('pel') ||
    lower.includes('sabun') ||
    lower.includes('deterjen') ||
    lower.includes('wipol') ||
    lower.includes('soklin') ||
    lower.includes('kanebo') ||
    lower.includes('lap') ||
    lower.includes('ember') ||
    lower.includes('sikat') ||
    lower.includes('pengharum') ||
    lower.includes('stella') ||
    lower.includes('bayfresh') ||
    lower.includes('tisu') ||
    lower.includes('tissue') ||
    lower.includes('sampah') ||
    lower.includes('plastik sampah') ||
    lower.includes('pembersih')
  ) {
    return 'Kebersihan & Sanitasi';
  }

  // K3 & Perlengkapan Medis
  if (
    lower.includes('p3k') ||
    lower.includes('obat') ||
    lower.includes('betadine') ||
    lower.includes('paracetamol') ||
    lower.includes('perban') ||
    lower.includes('plester') ||
    lower.includes('masker') ||
    lower.includes('helm') ||
    lower.includes('safety') ||
    lower.includes('sarung tangan') ||
    lower.includes('earplug') ||
    lower.includes('rompi') ||
    lower.includes('kacamata safety') ||
    lower.includes('antiseptik')
  ) {
    return 'K3 & Perlengkapan Medis';
  }

  // Pantry & Konsumsi
  if (
    lower.includes('kopi') ||
    lower.includes('teh') ||
    lower.includes('gula') ||
    lower.includes('aqua') ||
    lower.includes('air') ||
    lower.includes('mineral') ||
    lower.includes('club') ||
    lower.includes('creamer') ||
    lower.includes('snack') ||
    lower.includes('galon') ||
    lower.includes('dispenser') ||
    lower.includes('cangkir') ||
    lower.includes('gelas') ||
    lower.includes('sendok')
  ) {
    return 'Pantry & Konsumsi';
  }

  // Elektronik & Komputer
  if (
    lower.includes('mouse') ||
    lower.includes('keyboard') ||
    lower.includes('monitor') ||
    lower.includes('printer') ||
    lower.includes('kabel') ||
    lower.includes('charger') ||
    lower.includes('adapter') ||
    lower.includes('flashdisk') ||
    lower.includes('harddisk') ||
    lower.includes('toner') ||
    lower.includes('catridge') ||
    lower.includes('baterai') ||
    lower.includes('stop kontak') ||
    lower.includes('lampu') ||
    lower.includes('hdmi') ||
    lower.includes('lan')
  ) {
    return 'Elektronik & Komputer';
  }

  // Gudang Kayu / Logistik & Pengemasan
  if (
    lower.includes('kayu') ||
    lower.includes('triplek') ||
    lower.includes('papan') ||
    lower.includes('balok') ||
    lower.includes('usuk') ||
    lower.includes('reng') ||
    lower.includes('kaso') ||
    lower.includes('plywood') ||
    lower.includes('mdf') ||
    lower.includes('pallet') ||
    lower.includes('kardus') ||
    lower.includes('lakban') ||
    lower.includes('bubble') ||
    lower.includes('karung')
  ) {
    return 'Logistik & Pengemasan';
  }

  // Alat & Perlengkapan Olahraga
  if (
    lower.includes('bola') ||
    lower.includes('raket') ||
    lower.includes('badminton') ||
    lower.includes('futsal') ||
    lower.includes('sepak bola') ||
    lower.includes('pingpong') ||
    lower.includes('tenis') ||
    lower.includes('matras') ||
    lower.includes('peluit') ||
    lower.includes('jersey') ||
    lower.includes('olahraga') ||
    lower.includes('olah raga') ||
    lower.includes('sport') ||
    lower.includes('gawang') ||
    lower.includes('ring basket') ||
    lower.includes('voli') ||
    lower.includes('volly')
  ) {
    return 'Alat & Perlengkapan Olahraga';
  }

  // Alat & Kelengkapan Elektrik
  if (
    lower.includes('mcb') ||
    lower.includes('saklar') ||
    lower.includes('steker') ||
    lower.includes('fitting') ||
    lower.includes('trafo') ||
    lower.includes('kontaktor') ||
    lower.includes('panel listrik') ||
    lower.includes('genset') ||
    lower.includes('isolasi listrik') ||
    lower.includes('multitester') ||
    lower.includes('tang ampere') ||
    lower.includes('sekring') ||
    lower.includes('fuse') ||
    lower.includes('electric') ||
    lower.includes('elektrik') ||
    lower.includes('terminal listrik') ||
    lower.includes('kabel listrik') ||
    lower.includes('stop kontak listrik')
  ) {
    return 'Alat & Kelengkapan Elektrik';
  }

  // Material Bangunan
  if (
    lower.includes('semen') ||
    lower.includes('pasir') ||
    lower.includes('bata') ||
    lower.includes('hebel') ||
    lower.includes('keramik') ||
    lower.includes('cat tembok') ||
    lower.includes('cat dinding') ||
    lower.includes('kuas rol') ||
    lower.includes('tinner') ||
    lower.includes('thinner') ||
    lower.includes('plamir') ||
    lower.includes('talang') ||
    lower.includes('seng') ||
    lower.includes('atap') ||
    lower.includes('besi beton') ||
    lower.includes('kawat bendrat') ||
    lower.includes('baut roofing') ||
    lower.includes('genteng') ||
    lower.includes('silikon kaca') ||
    lower.includes('sealant') ||
    lower.includes('bangunan')
  ) {
    return 'Material Bangunan';
  }

  // Maintenance & Perkakas
  if (
    lower.includes('obeng') ||
    lower.includes('tang') ||
    lower.includes('palu') ||
    lower.includes('bor') ||
    lower.includes('gergaji') ||
    lower.includes('meteran') ||
    lower.includes('lem') ||
    lower.includes('kawat') ||
    lower.includes('paku') ||
    lower.includes('baut') ||
    lower.includes('sekrup') ||
    lower.includes('kuas') ||
    lower.includes('cat') ||
    lower.includes('amplas') ||
    lower.includes('pipa') ||
    lower.includes('gembok') ||
    lower.includes('kunci')
  ) {
    return 'Maintenance & Perkakas';
  }

  return 'ATK (Alat Tulis Kantor)';
}

export function generateCategorySKU(
  category: string,
  existingItems: { code: string; name: string }[] = [],
  targetItemName?: string
): string {
  // If targetItemName is provided and exact matching item already exists in database, reuse its SKU code
  if (targetItemName && targetItemName.trim()) {
    const cleanName = targetItemName.trim().toLowerCase();
    const existing = existingItems.find(
      (it) => it.name.trim().toLowerCase() === cleanName
    );
    if (existing && existing.code) {
      return existing.code;
    }
  }

  let prefix = 'GA-GEN-';
  const cat = category || '';

  if (cat.includes('ATK') || cat.includes('Tulis')) {
    prefix = 'GA-ATK-';
  } else if (cat.includes('Kebersihan') || cat.includes('Sanitasi')) {
    prefix = 'GA-KBR-';
  } else if (cat.includes('K3') || cat.includes('Medis')) {
    prefix = 'GA-K3-';
  } else if (cat.includes('Pantry') || cat.includes('Konsumsi')) {
    prefix = 'GA-PNT-';
  } else if (cat.includes('Elektronik') || cat.includes('Komputer')) {
    prefix = 'GA-ELK-';
  } else if (cat.includes('Maintenance') || cat.includes('Perkakas')) {
    prefix = 'GA-MNT-';
  } else if (cat.includes('Logistik') || cat.includes('Pengemasan')) {
    prefix = 'GA-LOG-';
  } else if (cat.includes('Aset') || cat.includes('Peralatan')) {
    prefix = 'GA-AST-';
  } else if (cat.includes('Olahraga') || cat.includes('Olah Raga')) {
    prefix = 'GA-OLR-';
  } else if (cat.includes('Elektrik') || cat.includes('Electric')) {
    prefix = 'GA-ELC-';
  } else if (cat.includes('Bangunan')) {
    prefix = 'GA-BGN-';
  }

  // Find all existing items matching this prefix
  let maxSeq = 0;
  existingItems.forEach((it) => {
    if (it.code && it.code.startsWith(prefix)) {
      const numPart = it.code.replace(prefix, '').replace(/[^0-9]/g, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

// Audio synthesizer beep for successful barcode scan
export function playScanBeep(isSuccess: boolean = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // 2-tone pleasant high chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else {
      // Low alert buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

import { NotificationSound } from '../types';

export const NOTIFICATION_SOUND_OPTIONS: { id: NotificationSound; name: string; description: string; icon: string }[] = [
  { id: 'chime_modern', name: 'Melodi Modern (Standar)', description: 'Chime 3-nada ceria C-E-G yang elegan', icon: 'Bell' },
  { id: 'marimba_bell', name: 'Marimba Kayu Akustik', description: 'Ketukan marimba hangat dan beresonansi lembut', icon: 'Sparkles' },
  { id: 'futuristic_ding', name: 'Sci-Fi Crystal Ping', description: 'Ping kristal futuristik berteknologi tinggi', icon: 'Zap' },
  { id: 'subtle_pop', name: 'Subtle Pop Bubble', description: 'Suara gelembung ganda halus dan tidak bising', icon: 'Volume2' },
  { id: 'urgent_alert', name: 'Alert Urgent Dua Nada', description: 'Pemberitahuan penting dengan nada tegas', icon: 'AlertCircle' },
  { id: 'elevator_ding', name: 'Ding-Dong Harmoni', description: 'Dua nada bel klasik yang ramah di telinga', icon: 'Music' },
  { id: 'crystal_shine', name: 'Kilau Kristal (Sparkle)', description: 'Arpeggio 4 nada jernih dan berkelas', icon: 'Star' },
  { id: 'radar_ping', name: 'Sonar Radar Ping', description: 'Denyut sonar akustik bernada tinggi', icon: 'Radio' },
  { id: 'retro_arcade', name: 'Retro 8-Bit Victory', description: 'Melodi klasik game arcade bertempo ceria', icon: 'Gamepad2' },
  { id: 'zen_bowl', name: 'Genta Zen & Tibetan Bowl', description: 'Getaran mangkuk genta yang menenangkan', icon: 'Heart' },
  { id: 'harpa_celeste', name: 'Petikan Harpa Surgawi', description: 'Glissando 5 petikan dawai harpa berkilau', icon: 'Sparkle' },
  { id: 'cash_register', name: 'Cha-Ching Koin Emas', description: 'Denting lonceng koin kasir yang renyah', icon: 'Coins' },
  { id: 'whistle_bright', name: 'Siulan Ceria Dua Nada', description: 'Siulan harmonis cerah bersemangat', icon: 'Smile' },
  { id: 'cyber_synth', name: 'Cyberpunk Synth Wave', description: 'Gelombang synthesizer futuristik sci-fi', icon: 'Cpu' },
  { id: 'kalimba_dream', name: 'Melodi Kalimba Afrika', description: 'Denting piano jempol kayu yang syahdu', icon: 'Sun' },
  { id: 'magic_sparkle', name: 'Debu Ajaib (Magic Chime)', description: 'Efek taburan bintang ajaib melingkar', icon: 'Wand2' },
];

export const STORAGE_KEY_NOTIF_SOUND = 'ga_warehouse_notif_sound_v1';

// Melodic notification chime for incoming transactions & real-time updates with multiple unique sound profiles
export function playNotificationChime(soundType?: NotificationSound) {
  try {
    const activeSound: NotificationSound = soundType || 
      (typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_NOTIF_SOUND) as NotificationSound) : null) || 
      'chime_modern';

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (
      freq: number, 
      start: number, 
      duration: number, 
      type: OscillatorType = 'triangle', 
      volume: number = 0.25
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (activeSound) {
      case 'marimba_bell':
        // Soft acoustic marimba mallet tones
        playTone(659.25, now, 0.28, 'sine', 0.35); // E5
        playTone(783.99, now + 0.08, 0.32, 'sine', 0.35); // G5
        playTone(1046.50, now + 0.16, 0.45, 'sine', 0.4); // C6
        break;

      case 'futuristic_ding':
        // Dual sine crystal futuristic chime with high shimmer
        playTone(1760.00, now, 0.35, 'sine', 0.2); // A6
        playTone(2637.02, now + 0.04, 0.4, 'sine', 0.18); // E7
        playTone(3520.00, now + 0.08, 0.5, 'triangle', 0.15); // A7
        break;

      case 'subtle_pop':
        // Soft bubble pops with slight frequency sweep
        playTone(480, now, 0.09, 'sine', 0.3);
        playTone(720, now + 0.08, 0.14, 'sine', 0.35);
        break;

      case 'urgent_alert':
        // Urgent dual alert pulses
        playTone(880.00, now, 0.12, 'sawtooth', 0.18); // A5
        playTone(1174.66, now + 0.14, 0.22, 'sawtooth', 0.2); // D6
        break;

      case 'elevator_ding':
        // Classic pleasant Ding-Dong (High to Low)
        playTone(783.99, now, 0.45, 'sine', 0.35); // G5 (Ding)
        playTone(523.25, now + 0.25, 0.65, 'sine', 0.35); // C5 (Dong)
        break;

      case 'crystal_shine':
        // Crystal 4-note sparkle arpeggio
        playTone(1046.50, now, 0.2, 'sine', 0.22); // C6
        playTone(1318.51, now + 0.06, 0.24, 'sine', 0.24); // E6
        playTone(1567.98, now + 0.12, 0.28, 'sine', 0.26); // G6
        playTone(2093.00, now + 0.18, 0.45, 'triangle', 0.3); // C7
        break;

      case 'radar_ping':
        // High frequency sonar pulse
        playTone(1350, now, 0.55, 'sine', 0.35);
        playTone(2700, now, 0.25, 'sine', 0.12);
        break;

      case 'retro_arcade':
        // 8-bit retro arcade coin/power-up (B4 -> E5 -> G#5 -> B5)
        playTone(493.88, now, 0.08, 'square', 0.18); // B4
        playTone(659.25, now + 0.07, 0.08, 'square', 0.2); // E5
        playTone(830.61, now + 0.14, 0.1, 'square', 0.22); // G#5
        playTone(987.77, now + 0.21, 0.35, 'square', 0.24); // B5
        break;

      case 'zen_bowl':
        // Deep calming singing bowl with harmonics and long resonance
        playTone(329.63, now, 1.2, 'sine', 0.4); // E4 fundamental
        playTone(659.25, now + 0.02, 0.9, 'sine', 0.2); // E5 harmonic
        playTone(987.77, now + 0.04, 0.7, 'triangle', 0.12); // B5 overtone
        break;

      case 'harpa_celeste':
        // Celestial harp arpeggio (C5 -> E5 -> G5 -> C6 -> E6)
        playTone(523.25, now, 0.35, 'sine', 0.25);
        playTone(659.25, now + 0.05, 0.35, 'sine', 0.25);
        playTone(783.99, now + 0.10, 0.4, 'sine', 0.28);
        playTone(1046.50, now + 0.15, 0.45, 'sine', 0.3);
        playTone(1318.51, now + 0.20, 0.6, 'triangle', 0.32);
        break;

      case 'cash_register':
        // Metallic "Cha-Ching" (dual coin ping + spring ring)
        playTone(1864.66, now, 0.12, 'square', 0.15); // A#6
        playTone(2093.00, now + 0.06, 0.15, 'triangle', 0.25); // C7
        playTone(2793.83, now + 0.12, 0.45, 'sine', 0.35); // F7
        playTone(3322.44, now + 0.14, 0.5, 'triangle', 0.2); // G#7
        break;

      case 'whistle_bright':
        // Cheerful two-tone melodic human whistle
        playTone(1318.51, now, 0.16, 'sine', 0.3); // E6
        playTone(1760.00, now + 0.14, 0.38, 'sine', 0.35); // A6
        break;

      case 'cyber_synth':
        // Cyberpunk synth wave glide & pulse
        playTone(440.00, now, 0.18, 'sawtooth', 0.15);
        playTone(880.00, now + 0.06, 0.22, 'sawtooth', 0.18);
        playTone(1320.00, now + 0.12, 0.38, 'triangle', 0.22);
        break;

      case 'kalimba_dream':
        // Warm African kalimba thumb piano
        playTone(587.33, now, 0.4, 'sine', 0.35); // D5
        playTone(739.99, now + 0.09, 0.45, 'sine', 0.35); // F#5
        playTone(880.00, now + 0.18, 0.6, 'triangle', 0.38); // A5
        break;

      case 'magic_sparkle':
        // Fairy dust magic sparkle cascade (6 fast shimmering notes)
        playTone(1174.66, now, 0.2, 'sine', 0.2);
        playTone(1396.91, now + 0.04, 0.22, 'sine', 0.22);
        playTone(1760.00, now + 0.08, 0.25, 'sine', 0.25);
        playTone(2093.00, now + 0.12, 0.28, 'triangle', 0.28);
        playTone(2637.02, now + 0.16, 0.32, 'triangle', 0.3);
        playTone(3135.96, now + 0.20, 0.5, 'sine', 0.35);
        break;

      case 'chime_modern':
      default:
        // 3-note pleasant ascending bell chime (C6 -> E6 -> G6)
        playTone(1046.50, now, 0.25, 'triangle', 0.25);
        playTone(1318.51, now + 0.1, 0.3, 'triangle', 0.25);
        playTone(1567.98, now + 0.2, 0.45, 'triangle', 0.3);
        break;
    }
  } catch (e) {
    console.warn('Audio notification chime error', e);
  }
}

// Request and trigger native browser desktop notification if supported
export function triggerBrowserNotification(title: string, body: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/favicon.ico',
            });
          }
        });
      }
    }
  } catch (e) {
    console.warn('Desktop notification error', e);
  }
}

export function formatRupiah(amount?: number): string {
  if (amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
