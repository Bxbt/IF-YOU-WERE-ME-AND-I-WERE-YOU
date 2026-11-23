/**
 * Storyline 2, Chapter 4 — The Things I Never Said. Transcribed from docs/02 (OS4).
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent, Condition } from '../../types';
import { D, E, M, N, S, SYS, is } from './lines';

const EVENING = 'ห้องในอพาร์ตเมนต์ตอนค่ำ โคมไฟสีอุ่น ความทรงจำเก่า ๆ ลอยขึ้นมาทีละเรื่อง';
const NIGHT = 'ห้องนั่งเล่นตอนดึก ฝนตกหนัก ไฟสลัว';

const ALWAYS: Condition = {
  any: [
    { flag: 'os_burst', set: true },
    { flag: 'os_burst', unset: true },
  ],
};

export const os4: ChapterContent = {
  id: 'os4',
  titleEn: 'The Things I Never Said',
  titleTh: 'ความเงียบที่มีเรื่องราวมากมาย',
  estimatedMinutes: [7, 9],
  firstScene: 'os4_s01',
  scenes: [
    {
      id: 'os4_s01',
      background: 'bg_apartment_evening',
      ariaLabel: EVENING,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', rain: 'light', lamp: 'warm', music: 'ambient_home' }),
        N('มีหลายเรื่องที่ {in} ไม่เคยพูด ตอนที่มันเกิดขึ้น'),
        S('ความทรงจำ', 'วันเกิดที่ถูกลืม — {in} บอกว่า "ไม่เป็นไร"'),
        S('ความทรงจำ', 'คืนที่รอกินข้าวด้วยกันจนกับข้าวเย็นชืด — {in} บอกว่า "ไม่หิวแล้ว"'),
        S('ความทรงจำ', 'ครั้งที่ถูกพูดแรง ๆ ต่อหน้าเพื่อน — {in} หัวเราะกลบ'),
        M('in', '(ไม่ใช่ไม่รู้สึก แค่ไม่อยากทะเลาะ)'),
        M('in', '(บางเรื่องก็ไม่รู้จะอธิบายยังไง และบางเรื่อง เก็บไว้นานจนมันกลายเป็นความโกรธไปแล้ว)'),
      ],
      next: 'os4_s02',
    },
    {
      id: 'os4_s02',
      background: 'bg_living_room_night',
      ariaLabel: NIGHT,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_living_room_night', rain: 'heavy', lamp: 'warm' }),
        N('คืนวันศุกร์ {out} กลับช้ากว่าที่บอกไว้สองชั่วโมง โดยไม่มีข้อความสักข้อ'),
        D('out', 'โทษที ๆ เพื่อนชวนไปต่อ ลืมบอก', 'happy'),
        D('out', 'กินข้าวยัง'),
        N('คำถามธรรมดาที่สุด แต่คืนนี้ มันเหมือนหยดน้ำหยดสุดท้าย'),
        {
          type: 'CHOICE',
          id: 'os4_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"{you}ไม่เคยฟังฉันเลย ไม่เคย"',
              setFlags: { os_burst: 'all' },
              responseLines: [
                D('out', 'อะไรนะ แค่กลับช้าครั้งเดียวเอง', 'scared'),
                D('in', 'ไม่ใช่ครั้งเดียว', 'angry'),
                N('แล้วทุกเรื่องที่ไม่เคยพูด ก็หลั่งไหลออกมาพร้อมกัน'),
              ],
            },
            {
              id: 'b',
              text: '"ทำไมไม่บอก แค่ข้อความเดียวเอง"',
              setFlags: { os_burst: 'this_one' },
              responseLines: [
                D('out', 'ขอโทษ แบตหมดด้วย…', 'sad'),
                M('in', '(ไม่ใช่แค่เรื่องข้อความ แต่ถ้าพูดตอนนี้ คงไม่จบแค่เรื่องนี้)'),
              ],
            },
            {
              id: 'c',
              text: '"…ไม่เป็นไร" (แล้วเดินเข้าห้อง)',
              setFlags: { os_burst: 'swallow' },
              responseLines: [M('in', '(ไม่เป็นไรอีกแล้ว… ครั้งที่เท่าไหร่)'), N('ประตูห้องนอนปิดลงเบา ๆ')],
            },
            {
              id: 'd',
              text: '"ขอเวลาสักพัก ตอนนี้ยังพูดดี ๆ ไม่ได้"',
              setFlags: { os_burst: 'pause' },
              responseLines: [
                D('out', '…โอเค รอนะ', 'worried'),
                M('in', '(ขอบคุณที่ไม่ตามมา แต่ก็กลัวว่าถ้าเงียบอีก จะไม่ได้พูดอีกเลย)'),
              ],
            },
          ],
        },
      ],
      next: 'os4_s03',
    },
    {
      id: 'os4_s03',
      background: 'bg_living_room_night',
      ariaLabel: NIGHT,
      controller: 'waiter',
      lines: [
        E({ bg: 'bg_living_room_night', rain: 'heavy' }),
        M('out', '(ไม่รู้เลยว่ามีเรื่องค้างอยู่มากขนาดนี้)'),
        M(
          'out',
          '(คำว่า "ไม่เคย" มันเจ็บ… แต่ถ้า {in} ถึงขั้นพูดแบบนี้ คงเก็บไว้นานมากแล้ว)',
          is('os_burst', 'all'),
        ),
        M('out', '(ทุกครั้งที่ได้ยินว่า "ไม่เป็นไร" ก็เชื่อมาตลอด)', is('os_burst', 'swallow')),
        M('out', '(ทำไมไม่บอกตั้งแต่ตอนนั้น)'),
        M('out', '(หรือว่า… เคยบอกแล้ว แต่ไม่ได้ฟังจริง ๆ)'),
        {
          type: 'CHOICE',
          id: 'os4_c02',
          owner: 'waiter',
          options: [
            {
              id: 'a',
              text: 'เคาะประตู แล้วถามว่า "ขอฟังได้ไหม"',
              setFlags: { os_reach: 'listen' },
              responseLines: [D('in', '…ไม่รู้จะเริ่มตรงไหน', 'sad'), D('out', 'เริ่มตรงไหนก็ได้ จะฟังจนจบ')],
            },
            {
              id: 'b',
              text: 'พูดผ่านประตูว่า "ขอโทษนะ" แล้วรอ',
              setFlags: { os_reach: 'sorry' },
              responseLines: [
                N('เงียบไปนาน'),
                D('in', 'ขอโทษเรื่องอะไร'),
                M('out', '(…นั่นสิ ต้องรู้ก่อนว่าขอโทษเรื่องอะไร)'),
              ],
            },
            {
              id: 'c',
              text: 'ปล่อยให้อยู่คนเดียวก่อน',
              setFlags: { os_reach: 'space' },
              responseLines: [N('ไฟใต้ประตูห้องนอนยังเปิดอยู่จนดึก'), M('out', '(พรุ่งนี้ต้องถามให้ได้)')],
            },
            {
              id: 'd',
              text: '"ทำไมไม่เคยบอกกันเลย"',
              setFlags: { os_reach: 'why' },
              responseLines: [D('in', 'เคยบอก แต่{you}ไม่ได้ยิน', 'angry'), M('out', '(…)')],
            },
          ],
        },
      ],
      next: 'os4_interp',
    },
    {
      id: 'os4_interp',
      background: 'bg_living_room_night',
      ariaLabel: NIGHT,
      controller: 'narrator',
      lines: [E({ bg: 'bg_living_room_night', rain: 'light' }), { type: 'INTERPRETATION' }],
      next: 'os4_reflect',
    },
    {
      id: 'os4_reflect',
      background: 'bg_living_room_night',
      ariaLabel: NIGHT,
      controller: 'narrator',
      lines: [E({ bg: 'bg_living_room_night', rain: 'light' }), { type: 'REFLECTION' }],
      next: 'os4_end',
    },
    {
      id: 'os4_end',
      background: 'bg_living_room_night',
      ariaLabel: 'ห้องนั่งเล่นตอนดึก ฝนซาลงแล้ว',
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_living_room_night', rain: 'light' }),
        N('ความเงียบไม่ได้แปลว่าไม่มีอะไร'),
        N('บางครั้ง มันคือเรื่องราวมากมายที่ยังรอคนฟัง'),
      ],
      next: null,
    },
  ],
  interpretations: [
    {
      id: 'ic_os4_in',
      role: 'insider',
      when: ALWAYS,
      quote: '"…"',
      quoteByCondition: [
        { when: is('os_burst', 'all'), text: '"{you}ไม่เคยฟังฉันเลย"' },
        { when: is('os_burst', 'this_one'), text: '"ทำไมไม่บอก แค่ข้อความเดียวเอง"' },
        { when: is('os_burst', 'swallow'), text: '"…ไม่เป็นไร"' },
        { when: is('os_burst', 'pause'), text: '"ขอเวลาสักพัก"' },
      ],
      feelings: [
        { id: 'not_heard', text: 'อาจรู้สึกว่าไม่ถูกได้ยินมานาน' },
        { id: 'always_understanding', text: 'อาจเหนื่อยที่ต้องเป็นฝ่ายเข้าใจทุกครั้ง' },
        { id: 'fear_fight', text: 'อาจกลัวว่าพูดแล้วจะทะเลาะ' },
        { id: 'want_asked', text: 'อาจอยากให้ {out} ถามต่ออีกนิด' },
        { id: 'piled_up', text: 'อาจไม่ได้โกรธแค่เรื่องคืนนี้ แต่เป็นเรื่องที่สะสมมา' },
      ],
    },
  ],
  reflection: [
    {
      id: 'ro4_1',
      self: 'เวลาไม่พอใจ คุณมักทำแบบไหน',
      options: [
        { id: 'ro4_1_now', text: 'พูดทันที' },
        { id: 'ro4_1_cool', text: 'รอให้ใจเย็นก่อนค่อยพูด' },
        { id: 'ro4_1_keep', text: 'เก็บไว้ไม่พูด' },
        { id: 'ro4_1_hint', text: 'พูดอ้อม ๆ' },
      ],
      maxSelect: 2,
      freeText: false,
    },
    {
      id: 'ro4_2',
      self: 'อะไรทำให้บางเรื่องพูดยาก',
      options: [
        { id: 'ro4_2_fight', text: 'กลัวทะเลาะ' },
        { id: 'ro4_2_words', text: 'ไม่รู้จะอธิบายยังไง' },
        { id: 'ro4_2_unheard', text: 'เคยพูดแล้วไม่มีใครฟัง' },
        { id: 'ro4_2_small', text: 'คิดว่าเป็นเรื่องเล็ก' },
        { id: 'ro4_2_burden', text: 'ไม่อยากเป็นภาระ' },
      ],
      maxSelect: 3,
      freeText: true,
    },
    {
      id: 'ro4_3',
      self: '(ไม่บังคับ) เรื่องหนึ่งที่คุณยังไม่เคยพูด แต่อยากให้มีคนฟัง',
      options: [],
      maxSelect: 1,
      freeText: true,
      toNextConversation: true,
    },
  ],
  transition: {
    lines: [SYS('บทที่ 4 จบแล้ว'), N('ถ้าความสัมพันธ์ที่ดีมีหน้าตา มันควรรู้สึกแบบไหนนะ')],
    nextChapter: 'os5',
  },
};
