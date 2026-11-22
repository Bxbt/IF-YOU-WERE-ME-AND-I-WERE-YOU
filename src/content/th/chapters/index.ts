/**
 * Chapter registry (docs/10 §6: one chunk per chapter). A chapter without `load` has no content yet
 * and is shown as "coming soon" — never as a playable button (docs/10: no fake features).
 */
import type { ChapterContent, ChapterId } from '../../types';

export interface ChapterMeta {
  id: ChapterId;
  number: number;
  titleEn: string;
  titleTh: string;
  estimatedMinutes: [number, number];
  /** Ch1–Ch3 need a Scenario first (docs/05 G8). */
  needsScenario: boolean;
  load?: () => Promise<ChapterContent>;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'ch1',
    number: 1,
    titleEn: 'The Incident',
    titleTh: 'เหตุการณ์',
    estimatedMinutes: [8, 10],
    needsScenario: true,
    load: () => import('./ch1').then((m) => m.ch1),
  },
  {
    id: 'ch2',
    number: 2,
    titleEn: 'Walk in My Shoes',
    titleTh: 'ลองเดินในรองเท้าของกันและกัน',
    estimatedMinutes: [12, 15],
    needsScenario: true,
  },
  {
    id: 'ch3',
    number: 3,
    titleEn: "What I Couldn't Say",
    titleTh: 'สิ่งที่พูดไม่ออก',
    estimatedMinutes: [10, 12],
    needsScenario: true,
  },
  {
    id: 'ch4',
    number: 4,
    titleEn: 'Switch the Roles',
    titleTh: 'สลับบทบาท',
    estimatedMinutes: [10, 15],
    needsScenario: false,
  },
  {
    id: 'ch5',
    number: 5,
    titleEn: 'Our Safe Place',
    titleTh: 'ที่ปลอดภัยของเรา',
    estimatedMinutes: [8, 10],
    needsScenario: false,
  },
];

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<
  ChapterId,
  ChapterMeta
>;

export const isChapterAvailable = (id: string): boolean => !!CHAPTER_BY_ID[id as ChapterId]?.load;
