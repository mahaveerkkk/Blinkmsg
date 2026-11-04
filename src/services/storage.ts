import { UserProfile, ChatRoom } from '../types';
import { CryptoService } from './crypto';

const STORAGE_KEY = 'blinkmsg_ghost_identity';
const ROOMS_KEY = 'blinkmsg_active_rooms';

const GHOST_NAMES = [
  'ShadowFalcon', 'CyberPhantom', 'SilentPulse', 'NeonSpecter', 
  'VanishKnight', 'EchoRaven', 'ZeroCipher', 'ObsidianRider',
  'NightVoyager', 'QuantumDrifter', 'NovaStalker', 'CosmicGhost'
];

const VIBE_TAGS = [
  '⚡ Burning secrets', '🕶️ Ghost mode ON', '🌙 Late night talks',
  '☕ Coffee & deep thoughts', '🚀 Tech & future', '🔥 Burn after reading',
  '🎧 Listening to Synthwave', '🤫 Leave no trace'
];

export class StorageService {
  /**
   * Generates or loads the local anonymous ghost identity
   */
  static getOrCreateProfile(): UserProfile {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // storage disabled / fallback
    }

    const randomName = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const handle = `${randomName.toLowerCase()}_${randomSuffix}`;
    const randomVibe = VIBE_TAGS[Math.floor(Math.random() * VIBE_TAGS.length)];

    const profile: UserProfile = {
      id: CryptoService.generateId('usr'),
      handle,
      displayName: randomName,
      avatarId: Math.floor(Math.random() * 8) + 1,
      vibe: randomVibe,
      isAvailable: true,
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      lastActive: Date.now(),
    };

    StorageService.saveProfile(profile);
    return profile;
  }

  static saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  static getRooms(): ChatRoom[] {
    try {
      const data = localStorage.getItem(ROOMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveRooms(rooms: ChatRoom[]): void {
    try {
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    } catch {
      // ignore
    }
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ROOMS_KEY);
      sessionStorage.clear();
    } catch {
      // ignore
    }
  }
}
