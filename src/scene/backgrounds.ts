/**
 * Background registry (docs/09 §8): key → draw function, fallback colour and description.
 * Content lint checks every `bg_*` key used in content exists here (docs/10 §4).
 * Every background is drawn with canvas primitives (audit H-5) — never per-pixel SVG.
 */
import type { BackgroundDraw } from './env';
import { drawStars, drawTitleBase, drawTitleForeground, makeStars } from './draw/title';
import { drawElevatorEmergency, drawElevatorInterior } from './draw/elevator';
import { drawApartmentEvening, drawApartmentKitchen } from './draw/apartment';
import { drawCorridor } from './draw/corridor';
import { drawBuildingExteriorRain } from './draw/exterior';
import { drawLobbyFloor6 } from './draw/lobby';
import { drawLivingRoomMorning, drawLivingRoomNight } from './draw/livingRoom';
import { drawRooftopNight } from './draw/rooftop';

export interface BackgroundDef {
  key: string;
  draw: BackgroundDraw;
  /** Shown instead when drawing throws (docs/06 S6 "Asset โหลดไม่ได้"). */
  fallback: string;
  /** Registry description (docs/09 §8); scenes provide their own, more specific ariaLabel. */
  ariaLabel: string;
  priority: 'P0' | 'P1';
}

const titleStars = makeStars();

const LIST: BackgroundDef[] = [
  {
    key: 'bg_title',
    draw: (c, t) => {
      drawTitleBase(c);
      drawStars(c, titleStars, t);
      drawTitleForeground(c, t);
    },
    fallback: '#171c2f',
    ariaLabel: 'ท้องฟ้ากลางคืนเต็มไปด้วยดาว มีทางเรืองแสงเชื่อมสองคน',
    priority: 'P0',
  },
  {
    key: 'bg_apartment_evening',
    draw: drawApartmentEvening,
    fallback: '#3a3a5e',
    ariaLabel: 'ห้องเล็กในอพาร์ตเมนต์ตอนเย็น ฝนตกนอกหน้าต่าง โคมไฟสีอุ่น',
    priority: 'P0',
  },
  {
    key: 'bg_apartment_kitchen',
    draw: drawApartmentKitchen,
    fallback: '#3a3a5e',
    ariaLabel: 'มุมครัวในห้อง มีกระทะบนเตา ฝนตกนอกหน้าต่าง',
    priority: 'P0',
  },
  {
    key: 'bg_corridor',
    draw: drawCorridor,
    fallback: '#292b45',
    ariaLabel: 'ทางเดินชั้นแปด ไฟนีออน หน้าลิฟต์สองตัว',
    priority: 'P0',
  },
  {
    key: 'bg_elevator_interior',
    draw: drawElevatorInterior,
    fallback: '#2c2e48',
    ariaLabel: 'ในลิฟต์ ไฟเพดานสว่าง',
    priority: 'P0',
  },
  {
    key: 'bg_elevator_emergency',
    draw: drawElevatorEmergency,
    fallback: '#3a2a24',
    ariaLabel: 'ในลิฟต์ ไฟหลักดับ เหลือแสงไฟฉุกเฉินสีส้ม',
    priority: 'P0',
  },
  {
    key: 'bg_lobby_floor6',
    draw: drawLobbyFloor6,
    fallback: '#292b45',
    ariaLabel: 'โถงหน้าลิฟต์ชั้นหก',
    priority: 'P0',
  },
  {
    key: 'bg_living_room_morning',
    draw: drawLivingRoomMorning,
    fallback: '#5a5684',
    ariaLabel: 'ห้องนั่งเล่นตอนเช้า แสงแดดลอดหน้าต่าง',
    priority: 'P0',
  },
  {
    key: 'bg_living_room_night',
    draw: drawLivingRoomNight,
    fallback: '#202440',
    ariaLabel: 'ห้องนั่งเล่นตอนกลางคืน โคมไฟดวงเล็ก',
    priority: 'P0',
  },
  {
    key: 'bg_rooftop_night',
    draw: drawRooftopNight,
    fallback: '#0e1120',
    ariaLabel: 'สวนบนดาดฟ้าตอนกลางคืน ดาวเต็มฟ้า ไฟประดับ',
    priority: 'P0',
  },
  {
    key: 'bg_building_exterior_rain',
    draw: drawBuildingExteriorRain,
    fallback: '#171c2f',
    ariaLabel: 'ตึกอพาร์ตเมนต์ทั้งหลังกลางสายฝนตอนกลางคืน',
    priority: 'P1',
  },
];

export const BACKGROUNDS: Record<string, BackgroundDef> = Object.fromEntries(LIST.map((b) => [b.key, b]));
export const BACKGROUND_KEYS = LIST.map((b) => b.key);
