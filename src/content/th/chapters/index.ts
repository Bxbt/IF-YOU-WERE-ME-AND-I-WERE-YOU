/**
 * Chapter registry (docs/10 §6: one chunk per chapter). A chapter without `load` has no content yet
 * and is shown as "coming soon" — never as a playable button (docs/10: no fake features).
 */
import type { ChapterContent, ChapterId, StorylineId } from '../../types';

export interface ChapterMeta {
  id: ChapterId;
  number: number;
  titleEn: string;
  titleTh: string;
  estimatedMinutes: [number, number];
  /** Ch1–Ch3 need a Scenario first (docs/05 G8). */
  needsScenario: boolean;
  /** M16: storyline 2 chapters need a teller first (S20). */
  needsTeller?: boolean;
  storyline: StorylineId;
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
    storyline: 'main',
    load: () => import('./ch1').then((m) => m.ch1),
  },
  {
    id: 'ch2',
    number: 2,
    titleEn: 'Walk in My Shoes',
    titleTh: 'ลองเดินในรองเท้าของกันและกัน',
    estimatedMinutes: [12, 15],
    needsScenario: true,
    storyline: 'main',
    load: () => import('./ch2').then((m) => m.ch2),
  },
  {
    id: 'ch3',
    number: 3,
    titleEn: "What I Couldn't Say",
    titleTh: 'สิ่งที่พูดไม่ออก',
    estimatedMinutes: [10, 12],
    needsScenario: true,
    storyline: 'main',
    load: () => import('./ch3').then((m) => m.ch3),
  },
  {
    id: 'ch4',
    number: 4,
    titleEn: 'Switch the Roles',
    titleTh: 'สลับบทบาท',
    estimatedMinutes: [10, 15],
    needsScenario: false,
    storyline: 'main',
    load: () => import('./ch4').then((m) => m.ch4),
  },
  {
    id: 'ch5',
    number: 5,
    titleEn: 'Our Safe Place',
    titleTh: 'ที่ปลอดภัยของเรา',
    estimatedMinutes: [8, 10],
    needsScenario: false,
    storyline: 'main',
    load: () => import('./ch5').then((m) => m.ch5),
  },
  // M16 — storyline 2 "อีกด้านของเรื่อง" (docs/02).
  {
    id: 'os1',
    number: 1,
    titleEn: 'I Want to Be Loved, Too',
    titleTh: 'ฉันก็อยากเป็นคนที่ถูกรักเหมือนกัน',
    estimatedMinutes: [6, 8],
    needsScenario: false,
    needsTeller: true,
    storyline: 'other',
    load: () => import('./os1').then((m) => m.os1),
  },
  {
    id: 'os2',
    number: 2,
    titleEn: 'I Want to Matter',
    titleTh: 'ฉันอยากรู้สึกว่าตัวเองมีความหมาย',
    estimatedMinutes: [7, 9],
    needsScenario: false,
    needsTeller: true,
    storyline: 'other',
    load: () => import('./os2').then((m) => m.os2),
  },
  {
    id: 'os3',
    number: 3,
    titleEn: 'The Trust That Never Fully Healed',
    titleTh: 'ความไว้ใจที่แตกสลาย',
    estimatedMinutes: [7, 9],
    needsScenario: false,
    needsTeller: true,
    storyline: 'other',
    load: () => import('./os3').then((m) => m.os3),
  },
  {
    id: 'os4',
    number: 4,
    titleEn: 'The Things I Never Said',
    titleTh: 'ความเงียบที่มีเรื่องราวมากมาย',
    estimatedMinutes: [7, 9],
    needsScenario: false,
    needsTeller: true,
    storyline: 'other',
    load: () => import('./os4').then((m) => m.os4),
  },
  {
    id: 'os5',
    number: 5,
    titleEn: 'I Just Want Peace',
    titleTh: 'ฉันอยากมีชีวิตที่ไม่ต้องเจ็บปวด',
    estimatedMinutes: [7, 9],
    needsScenario: false,
    needsTeller: true,
    storyline: 'other',
    load: () => import('./os5').then((m) => m.os5),
  },
  {
    id: 'os6',
    number: 6,
    titleEn: 'Choosing Myself',
    titleTh: 'ถ้าฉันเลือกตัวเองสักครั้ง',
    estimatedMinutes: [6, 8],
    needsScenario: false,
    needsTeller: true,
    storyline: 'other',
    load: () => import('./os6').then((m) => m.os6),
  },
];

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<
  ChapterId,
  ChapterMeta
>;

export const chaptersOf = (line: StorylineId) => CHAPTERS.filter((c) => c.storyline === line);

export const isChapterAvailable = (id: string): boolean => !!CHAPTER_BY_ID[id as ChapterId]?.load;
