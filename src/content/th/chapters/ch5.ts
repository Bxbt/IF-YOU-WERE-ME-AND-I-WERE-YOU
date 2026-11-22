/**
 * Chapter 5 — Our Safe Place. Transcribed from docs/02-story-script.md (owner of the script).
 * Players answer as themselves ({A}/{B}). The MVP is Solo only, so there is no mutual reveal
 * (ch5_s02 in docs/02): the scene shows only the "what you wrote is yours" line.
 * Statements are written by the player about the partner, so "เธอ" is {you} (A-22).
 * The ending lines (ch5_end) live in `ending`; the last scene only has a short calm line.
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';

export const ch5: ChapterContent = {
  id: 'ch5',
  titleEn: 'Our Safe Place',
  titleTh: 'ที่ปลอดภัยของเรา',
  estimatedMinutes: [8, 10],
  firstScene: 'ch5_s01',
  scenes: [
    {
      id: 'ch5_s01',
      background: 'bg_rooftop_night',
      ariaLabel: 'ดาดฟ้าตึกตอนกลางคืน มีสวนเล็ก ๆ ไฟสายสีอุ่น และดาวเต็มฟ้า',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_rooftop_night', rain: 'none', music: 'ambient_night' } },
        { type: 'NARR', text: 'คืนวันเดียวกัน ดาดฟ้าของตึก' },
        { type: 'NARR', text: 'เมืองข้างล่างยังเปียกฝน แต่ข้างบนนี้ ฟ้าเปิดแล้ว' },
        { type: 'DLG', speaker: 'A', text: 'ที่นี่เงียบดีนะ' },
        { type: 'DLG', speaker: 'B', text: 'อืม เหมือนได้หายใจเต็มปอดครั้งแรกตั้งแต่เมื่อวาน' },
        { type: 'NARR', text: 'ไม่ต้องพูดทุกอย่างให้จบในคืนเดียว' },
        { type: 'NARR', text: 'แค่บอกบางอย่างที่อยากให้อีกคนรู้' },
      ],
      next: 'ch5_statements',
    },
    {
      id: 'ch5_statements',
      background: 'bg_rooftop_night',
      ariaLabel: 'ดาดฟ้าตึกตอนกลางคืน ไฟสายสีอุ่นส่องแสงอยู่รอบสวนเล็ก ๆ',
      controller: 'narrator',
      lines: [{ type: 'ENV', set: { bg: 'bg_rooftop_night', rain: 'none' } }, { type: 'STATEMENTS' }],
      next: 'ch5_s02',
    },
    {
      id: 'ch5_s02',
      background: 'bg_rooftop_night',
      ariaLabel: 'ดาดฟ้าตึกตอนกลางคืน ไฟสายสีอุ่นส่องแสงอยู่รอบสวนเล็ก ๆ',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_rooftop_night', rain: 'none' } },
        { type: 'NARR', text: 'สิ่งที่เขียนไว้ที่นี่ เป็นของคุณ คุณเลือกเองว่าจะให้ใครเห็น' },
      ],
      next: 'ch5_reflect',
    },
    {
      id: 'ch5_reflect',
      background: 'bg_rooftop_night',
      ariaLabel: 'ดาดฟ้าตึกตอนกลางคืน ดาวเต็มฟ้า',
      controller: 'narrator',
      lines: [{ type: 'ENV', set: { bg: 'bg_rooftop_night', rain: 'none' } }, { type: 'REFLECTION' }],
      next: 'ch5_end',
    },
    {
      id: 'ch5_end',
      background: 'bg_rooftop_night',
      ariaLabel: 'มองขึ้นไปจากดาดฟ้า เห็นดาวเต็มฟ้าเหนือเมืองที่ยังเปียกฝน',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_rooftop_night', rain: 'none', music: 'ending_theme' } },
        { type: 'NARR', text: 'ไฟสายดวงเล็ก ๆ ยังส่องแสงอุ่น ๆ อยู่บนดาดฟ้า' },
      ],
      next: null,
    },
  ],
  statements: [
    {
      id: 'cs1',
      stem: 'สิ่งที่ฉันเข้าใจ{you}มากขึ้นตอนนี้คือ…',
      starters: [
        { id: 'cs1_a', text: '…เวลา{you}เงียบ ไม่ได้แปลว่าไม่สนใจ' },
        { id: 'cs1_b', text: '…ความห่วงของ{you}บางทีออกมาเป็นคำพูดแรง ๆ' },
        { id: 'cs1_c', text: '…{you}ต้องการเวลามากกว่าที่ฉันคิด' },
      ],
    },
    {
      id: 'cs2',
      stem: 'สิ่งที่ฉันอยากทำให้ดีขึ้นคือ…',
      starters: [
        { id: 'cs2_a', text: '…ถามก่อนว่า{you}ต้องการอะไร' },
        { id: 'cs2_b', text: '…บอกความรู้สึกตรง ๆ แทนการเก็บไว้' },
        { id: 'cs2_c', text: '…ฟังให้จบก่อนตอบ' },
      ],
    },
    {
      id: 'cs3',
      stem: 'เวลา{you}เจ็บปวด ฉันอยากให้{you}รู้ว่า…',
      starters: [
        { id: 'cs3_a', text: '…ฉันอยู่ตรงนี้' },
        { id: 'cs3_b', text: '…{you}ไม่ต้องเข้มแข็งตลอดเวลา' },
        { id: 'cs3_c', text: '…บอกฉันได้เสมอว่าต้องการอะไร' },
      ],
    },
    {
      id: 'cs4',
      stem: 'สิ่งหนึ่งที่ทำให้ฉันรู้สึกว่าถูกรักคือ…',
      starters: [
        { id: 'cs4_a', text: '…ตอนที่{you}จำเรื่องเล็ก ๆ ได้' },
        { id: 'cs4_b', text: '…ตอนที่{you}ถามว่าวันนี้เป็นยังไงบ้าง' },
        { id: 'cs4_c', text: '…ตอนที่{you}อยู่ข้าง ๆ โดยไม่ต้องพูดอะไร' },
      ],
    },
    {
      id: 'cs5',
      stem: 'สิ่งหนึ่งที่ฉันอยากให้เราจำไว้คือ…',
      starters: [
        { id: 'cs5_a', text: '…เราไม่จำเป็นต้องรู้สึกเหมือนกัน' },
        { id: 'cs5_b', text: '…เราคุยกันได้เสมอ' },
        { id: 'cs5_c', text: '…ทุกครั้งที่ทะเลาะ เรายังอยู่ฝั่งเดียวกัน' },
      ],
    },
  ],
  reflection: [
    {
      id: 'r5_1',
      self: 'หลังจากเล่นมาทั้งหมด คุณรู้สึกอย่างไรตอนนี้',
      options: [
        { id: 'r5_1_warm', text: 'อบอุ่น' },
        { id: 'r5_1_relieved', text: 'โล่ง' },
        { id: 'r5_1_confused', text: 'ยังสับสน' },
        { id: 'r5_1_want_talk', text: 'อยากคุยต่อ' },
        { id: 'r5_1_tired', text: 'เหนื่อย' },
        { id: 'r5_1_neutral', text: 'เฉย ๆ' },
      ],
      maxSelect: 1,
      freeText: false,
    },
    {
      id: 'r5_2',
      self: 'สิ่งหนึ่งที่อยากชวน {other} คุยในครั้งหน้า',
      options: [],
      maxSelect: 1,
      freeText: true,
      toNextConversation: true,
    },
  ],
  // docs/02 ch5_end (A-13): English as written, small Thai translation under the lines that have one.
  // The Thai quote keeps "เธอ": it is a general line, not addressed by a role, so {you} cannot resolve.
  ending: [
    {
      en: "We don't have to feel exactly the same way to understand each other.",
      th: 'เราไม่จำเป็นต้องรู้สึกเหมือนกันทุกอย่าง ถึงจะเข้าใจกันได้',
    },
    {
      en: "We don't have to be perfect to love each other.",
      th: 'เราไม่จำเป็นต้องสมบูรณ์แบบ ถึงจะรักกันได้',
    },
    { en: 'We just have to keep choosing to listen.', th: 'เราแค่ต้องเลือกที่จะฟังกัน ต่อไปเรื่อย ๆ' },
    { en: 'WE ARE NOT THE SAME.', title: true },
    { en: "AND THAT'S OKAY.", th: 'เราไม่เหมือนกัน และนั่นก็ไม่เป็นไร', title: true },
    {
      en: '"I may never feel exactly what you feel, but I will always want to understand."',
      th: 'ฉันอาจไม่มีวันรู้สึกได้เหมือนที่เธอรู้สึก แต่ฉันจะอยากเข้าใจเธอเสมอ',
      title: true,
    },
    { en: 'IF YOU WERE ME, AND I WERE YOU', title: true },
  ],
  transition: { lines: [], ending: true },
};
