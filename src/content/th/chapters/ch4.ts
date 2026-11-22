/**
 * Chapter 4 — Switch the Roles. Transcribed from docs/02-story-script.md (owner of the script).
 * Players answer as themselves ({A}/{B}), not as insider/waiter. Mirror questions M01–M07 come
 * from questions.ts; the bridge lines of the docs/02 table come right before each MIRROR line.
 *
 * The MVP is Solo only, so the Solo SYS lines play unconditionally, and the reveal-mode choice
 * (`ch4_reveal_mode`, docs/02 ch4_s01) is left out: in Solo the mirror result shows right after
 * each question (docs/06 S7 Solo).
 *
 * {you} only resolves in lines spoken by in/out, so where {A}/{B} address each other the partner
 * is named instead ("ถ้าเป็นเธอ" → "ถ้าเป็น{B}").
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';

export const ch4: ChapterContent = {
  id: 'ch4',
  titleEn: 'Switch the Roles',
  titleTh: 'สลับบทบาท',
  estimatedMinutes: [10, 15],
  firstScene: 'ch4_s01',
  scenes: [
    {
      id: 'ch4_s01',
      background: 'bg_living_room_morning',
      ariaLabel: 'ห้องนั่งเล่นตอนเช้า แดดอ่อน ๆ แก้วกาแฟสองใบวางอยู่บนโต๊ะ',
      controller: 'narrator',
      lines: [
        // docs/02: "light: soft_morning" → normal light.
        { type: 'ENV', set: { bg: 'bg_living_room_morning', rain: 'none', light: 'normal' } },
        { type: 'NARR', text: 'เช้าวันต่อมา ฝนหยุดแล้ว' },
        { type: 'NARR', text: 'แก้วกาแฟสองใบวางอยู่บนโต๊ะ' },
        { type: 'DLG', speaker: 'A', text: 'เมื่อวาน… ถ้าเป็น{B} จะอยากให้ฉันทำอะไร' },
        { type: 'DLG', speaker: 'B', text: 'ไม่รู้สิ แล้วถ้าเป็น{A}ล่ะ' },
        { type: 'DLG', speaker: 'A', text: 'งั้นลองตอบกันดูไหม แบบไม่ต้องมีใครถูกใครผิด' },
        { type: 'SYS', text: 'ในบทนี้ คุณจะตอบคำถามเดียวกันสองครั้ง' },
        { type: 'SYS', text: 'ครั้งแรก — ในฐานะตัวคุณเอง' },
        { type: 'SYS', text: 'ครั้งที่สอง — ลองเดาว่า {other} จะตอบว่าอะไร' },
        { type: 'SYS', text: 'ไม่มีคำตอบไหนถูก และคุณข้ามได้ทุกข้อ' },
        { type: 'SYS', text: 'คุณกำลังเล่นคนเดียว คำตอบที่เดาจะถูกเก็บเป็น "สิ่งที่คุณคิด" เท่านั้น' },
        {
          type: 'SYS',
          text: 'คำตอบจริงของ {other} จะแสดงว่า "ยังไม่รู้" จนกว่า {other} จะมาเล่นด้วย',
        },
      ],
      next: 'ch4_mirrors',
    },
    {
      id: 'ch4_mirrors',
      background: 'bg_living_room_morning',
      ariaLabel: 'ห้องนั่งเล่น สองคนนั่งสลับที่กัน แสงในห้องค่อย ๆ เปลี่ยนจากเช้าเป็นค่ำ',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_living_room_morning', rain: 'none', light: 'normal' } },
        { type: 'NARR', text: 'เริ่มจากเรื่องเมื่อวานก่อน' },
        { type: 'MIRROR', questionId: 'M01' },
        { type: 'NARR', text: 'แล้วในวันธรรมดาล่ะ' },
        { type: 'MIRROR', questionId: 'M02' },
        { type: 'NARR', text: 'ข้อนี้อาจตอบยากหน่อย ข้ามได้นะ' },
        { type: 'MIRROR', questionId: 'M03' },
        // docs/02 bridge "ENV light: afternoon" (M04) and "ENV light: evening" (M06) have no EnvSet key.
        { type: 'MIRROR', questionId: 'M04' },
        { type: 'MIRROR', questionId: 'M05' },
        { type: 'MIRROR', questionId: 'M06' },
        { type: 'ENV', set: { bg: 'bg_living_room_night' } },
        { type: 'MIRROR', questionId: 'M07' },
      ],
      next: 'ch4_reflect',
    },
    {
      id: 'ch4_reflect',
      background: 'bg_living_room_night',
      ariaLabel: 'ห้องนั่งเล่นตอนกลางคืน โคมไฟสีอุ่น',
      controller: 'narrator',
      lines: [{ type: 'ENV', set: { bg: 'bg_living_room_night' } }, { type: 'REFLECTION' }],
      next: 'ch4_end',
    },
    {
      id: 'ch4_end',
      background: 'bg_living_room_night',
      ariaLabel: 'ห้องนั่งเล่นตอนกลางคืน สองคนกลับมานั่งที่เดิม',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_living_room_night' } },
        { type: 'NARR', text: 'สองคนกลับมานั่งที่เดิม' },
        { type: 'NARR', text: 'แต่มองกันด้วยสายตาที่ต่างไปจากเมื่อเช้านิดหนึ่ง' },
      ],
      next: null,
    },
  ],
  reflection: [
    {
      // Solo wording (docs/02 r4_1 "Solo:") — the MVP is Solo only.
      id: 'r4_1',
      self: 'ข้อไหนที่คุณไม่มั่นใจที่สุดว่าเดาถูก',
      options: [
        { id: 'r4_1_m01', text: 'หลังเจอเรื่องน่ากลัว ต้องการอะไร' },
        { id: 'r4_1_m02', text: 'อะไรทำให้รู้สึกว่าถูกรัก' },
        { id: 'r4_1_m03', text: 'อะไรทำให้รู้สึกว่าถูกมองข้าม' },
        { id: 'r4_1_m04', text: 'ตอนโกรธ อยากให้อีกคนเข้าใจอะไร' },
        { id: 'r4_1_m05', text: 'ชอบคลี่คลายความขัดแย้งแบบไหน' },
        { id: 'r4_1_m06', text: 'อะไรทำให้รู้สึกปลอดภัยทางใจ' },
        { id: 'r4_1_m07', text: 'ตอนเปราะบาง ต้องการอะไร' },
        { id: 'r4_1_none', text: 'ไม่มี', exclusive: true },
      ],
      maxSelect: 1,
      freeText: false,
    },
    {
      id: 'r4_2',
      self: 'มีเรื่องไหนที่คุณอยากให้ {other} รู้เกี่ยวกับตัวคุณ แต่ไม่เคยบอก',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
    {
      id: 'r4_3',
      self: 'เลือกคำถามที่อยากชวน {other} คุยในครั้งหน้า',
      options: [
        { id: 'r4_3_m01', text: 'ครั้งหน้าถ้าเราเจอเรื่องน่ากลัว อยากให้อีกคนทำอะไรเป็นอย่างแรก?' },
        { id: 'r4_3_m02', text: 'สัปดาห์นี้มีช่วงไหนที่รู้สึกว่าถูกรักบ้าง?' },
        {
          id: 'r4_3_m03',
          text: 'มีเรื่องไหนที่เราเคยรู้สึกถูกมองข้าม แต่ยังไม่เคยเล่าให้อีกคนฟัง?',
        },
        { id: 'r4_3_m04', text: 'ตอนเราโกรธ ประโยคไหนจากอีกคนที่จะช่วยให้ใจเย็นลง?' },
        { id: 'r4_3_m05', text: "ลองออกแบบ 'วิธีคืนดี' ของเราสองคนด้วยกันไหม?" },
        { id: 'r4_3_m06', text: 'อะไรที่ทำให้เรากล้าพูดเรื่องยาก ๆ กับอีกคน?' },
        { id: 'r4_3_m07', text: 'เวลาที่เราเปราะบาง อยากให้อีกคนรู้อะไรเกี่ยวกับเรา?' },
      ],
      maxSelect: 7,
      freeText: false,
      toNextConversation: true,
    },
  ],
  transition: {
    lines: [{ type: 'NARR', text: 'ยังมีอีกที่หนึ่งที่อยากพาไป' }],
    nextChapter: 'ch5',
  },
};
