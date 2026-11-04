import { UserProfile, ChatRoom } from '../types';
import { CryptoService } from './crypto';

const STORAGE_KEY = 'blinkmsg_user_v2';
const ROOMS_KEY = 'blinkmsg_active_rooms';
const MY_ROOM_CODE_KEY = 'blinkmsg_my_room_code';

const GHOST_NAMES = [
  'ShadowFalcon', 'CyberPhantom', 'SilentPulse', 'NeonSpecter', 
  'VanishKnight', 'EchoRaven', 'ZeroCipher', 'ObsidianRider'
];

const VIBE_TAGS = [
  '⚡ Burning secrets', '🕶️ Ghost mode ON', '🌙 Late night talks',
  '☕ Coffee & deep thoughts', '🔥 Burn after reading', '🤫 Leave no trace'
];

export class StorageService {
  /**
   * Retrieves profile without generating random one
   */
  static getProfile(): UserProfile | null {
    try {
      // Remove any legacy auto-generated profiles
      localStorage.removeItem('blinkmsg_ghost_identity');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  }

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

  static getMyRoomCode(): string {
    try {
      let code = localStorage.getItem(MY_ROOM_CODE_KEY);
      if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        code = CryptoService.generateRoomCode();
        localStorage.setItem(MY_ROOM_CODE_KEY, code);
      }
      return code;
    } catch {
      return CryptoService.generateRoomCode();
    }
  }

  static refreshMyRoomCode(): string {
    const code = CryptoService.generateRoomCode();
    try {
      localStorage.setItem(MY_ROOM_CODE_KEY, code);
    } catch {
      // ignore
    }
    return code;
  }

  static getRoomsKey(userHandle?: string): string {
    return userHandle ? `blinkmsg_rooms_${userHandle.toLowerCase()}` : ROOMS_KEY;
  }

  static getRooms(userHandle?: string): ChatRoom[] {
    try {
      const key = StorageService.getRoomsKey(userHandle);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveRooms(rooms: ChatRoom[], userHandle?: string): void {
    try {
      const key = StorageService.getRoomsKey(userHandle);
      localStorage.setItem(key, JSON.stringify(rooms));
    } catch {
      // ignore
    }
  }

  static clearAll(userHandle?: string): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MY_ROOM_CODE_KEY);
      localStorage.removeItem(ROOMS_KEY);
      if (userHandle) {
        localStorage.removeItem(StorageService.getRoomsKey(userHandle));
      }
      // Purge any stored room lists across handles
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('blinkmsg_')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch {
      // ignore
    }
  }
}
