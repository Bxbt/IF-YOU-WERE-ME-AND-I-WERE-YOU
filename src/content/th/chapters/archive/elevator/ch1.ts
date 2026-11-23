/**
 * Chapter 1 — The Incident. Transcribed from docs/02-story-script.md (owner of the script).
 * Tokens per docs/02 §0.1; every "เธอ" meaning the partner must be written as {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../../../types';

const PW = { scenario: 'priorWarning', eq: true } as const;
const NO_PW = { scenario: 'priorWarning', eq: false } as const;

export const ch1: ChapterContent = {
  id: 'ch1',
  titleEn: 'The Incident',
  titleTh: 'เหตุการณ์',
  estimatedMinutes: [8, 10],
  firstScene: 'ch1_s01',
  scenes: [
    {
      id: 'ch1_s01',
      background: 'bg_apartment_evening',
      ariaLabel: 'ห้องเล็กในอพาร์ตเมนต์ตอนเย็น ฝนตกปรอย ๆ นอกหน้าต่าง โคมไฟสีอุ่น',
      controller: 'insider',
      lines: [
        {
          type: 'ENV',
          set: { bg: 'bg_apartment_evening', rain: 'light', lamp: 'warm', music: 'ambient_home' },
        },
        { type: 'NARR', text: 'เย็นวันพฤหัสบดี ฝนตกปรอย ๆ มาตั้งแต่บ่าย' },
        { type: 'NARR', text: 'ห้องเล็ก ๆ บนชั้นแปด มีกลิ่นข้าวผัดลอยมาจากครัว และเสียงละครที่เปิดทิ้งไว้' },
        { type: 'SYS', title: 'โทรศัพท์ของ {in}', text: 'พัสดุของคุณถึงล็อบบี้แล้ว — นิติบุคคลอาคาร' },
        {
          type: 'DLG',
          speaker: 'in',
          expression: 'happy',
          text: '(ยิ้ม) พัสดุมาแล้ว เดี๋ยวลงไปเอาแป๊บนึง{in.end}',
        },
        {
          type: 'DLG',
          speaker: 'out',
          expression: 'worried',
          text: '(เงยหน้าจากกระทะ) ลิฟต์ตัวขวาเมื่อวานมีเสียงแปลก ๆ นะ ใช้ตัวซ้ายหรือเดินบันไดดีไหม',
          when: PW,
        },
        { type: 'DLG', speaker: 'out', text: 'เอาร่มไปด้วยนะ เผื่อต้องออกไปรับหน้าตึก', when: NO_PW },
        {
          type: 'CHOICE',
          id: 'ch1_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ไม่เป็นไรหรอก แป๊บเดียวเอง"',
              textByCondition: [{ when: NO_PW, text: '"ไม่เป็นไร แป๊บเดียวเอง"' }],
              setFlags: { in_reply: 'quick' },
              responseLines: [
                { type: 'DLG', speaker: 'out', text: 'อืม... โอเค รีบขึ้นมานะ ข้าวใกล้เสร็จแล้ว' },
                { type: 'MONO', speaker: 'out', text: '(ก็คงไม่เป็นไรมั้ง)' },
              ],
            },
            {
              id: 'b',
              text: '"จริงเหรอ งั้นเดี๋ยวดูก่อนนะ"',
              textByCondition: [{ when: NO_PW, text: '"โอเค ขอบคุณนะ"' }],
              setFlags: { in_reply: 'consider' },
              tag: 'D02:acknowledge',
              responseLines: [{ type: 'DLG', speaker: 'out', text: 'อืม แค่บอกไว้เฉย ๆ' }],
            },
            {
              id: 'c',
              text: '"ชั้นแปดเลยนะ ขาไม่ไหวแล้ววันนี้" (หัวเราะ)',
              textByCondition: [{ when: NO_PW, text: '"ขี้เกียจถือร่มอะ" (หัวเราะ)' }],
              setFlags: { in_reply: 'tired' },
              tag: 'D01:light_humor',
              responseLines: [
                { type: 'DLG', speaker: 'out', expression: 'happy', text: '(หัวเราะ) เข้าใจ ๆ รีบไปรีบมานะ' },
              ],
            },
            {
              id: 'd',
              text: '"ลงไปด้วยกันไหม"',
              setFlags: { in_reply: 'invite' },
              tag: 'D08:togetherness',
              responseLines: [
                {
                  type: 'DLG',
                  speaker: 'out',
                  expression: 'happy',
                  text: 'ไปเถอะ เดี๋ยวข้าวไหม้ รอตรงนี้นะ',
                },
              ],
            },
          ],
        },
      ],
      next: 'ch1_s02',
    },
    {
      id: 'ch1_s02',
      background: 'bg_corridor',
      ariaLabel: 'ทางเดินชั้นแปด ไฟนีออนกะพริบเบา ๆ ลิฟต์ซ้ายมีป้ายงดใช้',
      controller: 'insider',
      lines: [
        { type: 'ENV', set: { bg: 'bg_corridor', rain: 'light', light: 'flicker' } },
        { type: 'NARR', text: 'ทางเดินชั้นแปดเงียบ มีแต่เสียงไฟนีออนดังหึ่ง ๆ' },
        { type: 'SYS', title: 'ป้ายหน้าลิฟต์ซ้าย', text: 'งดใช้ชั่วคราว อยู่ระหว่างซ่อมบำรุง' },
        { type: 'MONO', speaker: 'in', text: '(เหลือตัวเดียวสินะ)', when: PW },
        { type: 'MONO', speaker: 'in', text: 'วันนี้เหนื่อยจัง อยากรีบกลับไปนอนดูละครต่อ' },
        {
          type: 'ENV',
          set: { bg: 'bg_elevator_interior', light: 'normal', rain: 'none', sfx: 'door_close' },
        },
        { type: 'SYS', title: 'จอลิฟต์', text: '8 … 7 …' },
        { type: 'ENV', set: { sfx: 'elevator_jolt', shake: 'small', light: 'flicker' } },
        { type: 'SYS', title: 'จอลิฟต์', text: '— —' },
        { type: 'MONO', speaker: 'in', text: '…เดี๋ยวนะ' },
        { type: 'MONO', speaker: 'in', expression: 'worried', text: 'ทำไมมันไม่ขยับ' },
        {
          type: 'CHOICE',
          id: 'ch1_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: 'กดปุ่มฉุกเฉินทันที',
              setFlags: { in_first: 'alarm' },
              tag: 'D09:act',
              responseLines: [{ type: 'SYS', title: 'ลิฟต์', text: 'เสียงกริ่งดังยาว' }],
            },
            {
              id: 'b',
              text: 'หยิบโทรศัพท์ขึ้นมาดู',
              setFlags: { in_first: 'phone' },
              tag: 'D02:reach_out',
              responseLines: [{ type: 'SYS', title: 'โทรศัพท์', text: 'สัญญาณ 1 ขีด · แบตเตอรี่ 18%' }],
            },
            {
              id: 'c',
              text: 'ยืนนิ่ง หายใจลึก ๆ',
              setFlags: { in_first: 'breathe' },
              tag: 'D09:self_regulate',
              responseLines: [{ type: 'MONO', speaker: 'in', text: 'ใจเย็น ๆ ไม่เป็นไร' }],
            },
            {
              id: 'd',
              text: 'เคาะประตูแล้วตะโกนเรียก',
              setFlags: { in_first: 'call_out' },
              tag: 'D09:act',
              responseLines: [{ type: 'NARR', text: 'เสียงสะท้อนในกล่องเหล็ก ไม่มีใครตอบ' }],
            },
          ],
        },
        { type: 'SYS', title: 'โทรศัพท์', text: 'สัญญาณ ▂ (1 ขีด) · แบตเตอรี่ 18%' },
        { type: 'ENV', set: { bg: 'bg_elevator_emergency', light: 'emergency', haze: 1 } },
        { type: 'NARR', text: 'ไฟหลักดับ เหลือแต่แสงไฟฉุกเฉินสีส้มจาง ๆ' },
      ],
      next: 'ch1_s03',
    },
    {
      id: 'ch1_s03',
      background: 'bg_apartment_kitchen',
      ariaLabel: 'มุมครัวในห้อง กระทะบนเตามีไอน้ำ ฝนตกหนักขึ้นนอกหน้าต่าง',
      controller: 'waiter',
      lines: [
        {
          type: 'ENV',
          set: { bg: 'bg_apartment_kitchen', rain: 'medium', steam: true, light: 'normal', haze: 0 },
        },
        { type: 'NARR', text: 'สิบนาทีผ่านไป' },
        { type: 'MONO', speaker: 'out', text: 'ทำไมยังไม่ขึ้นมา… คิวรับพัสดุยาวมั้ง' },
        {
          type: 'SYS',
          title: 'แชต',
          text: 'ข้อความล่าสุดที่ส่งหา {in}: "ซื้อน้ำแข็งขึ้นมาด้วยได้ไหม" — ยังไม่ได้อ่าน',
        },
        {
          type: 'CHOICE',
          id: 'ch1_c03',
          owner: 'waiter',
          options: [
            {
              id: 'a',
              text: 'โทรหา',
              setFlags: { out_first: 'call' },
              tag: 'D02:reach_out',
              responseLines: [
                { type: 'SYS', title: 'โทรศัพท์', text: 'เลขหมายที่ท่านเรียก ไม่สามารถติดต่อได้ในขณะนี้' },
              ],
            },
            {
              id: 'b',
              text: 'ส่งข้อความ "ถึงไหนแล้ว"',
              setFlags: { out_first: 'text' },
              tag: 'D02:reach_out',
              responseLines: [{ type: 'SYS', title: 'แชต', text: 'ส่งแล้ว · ยังไม่อ่าน' }],
            },
            {
              id: 'c',
              text: 'รออีกหน่อย คงไม่มีอะไร',
              setFlags: { out_first: 'wait' },
              tag: 'D09:self_regulate',
              responseLines: [{ type: 'MONO', speaker: 'out', text: 'อย่าคิดมาก' }],
            },
            {
              id: 'd',
              text: 'ปิดเตา แล้วจะลงไปดู',
              setFlags: { out_first: 'go_check' },
              tag: 'D09:act',
              responseLines: [
                { type: 'ENV', set: { steam: false } },
                { type: 'NARR', text: 'หยิบกุญแจ แต่ยังไม่ทันออกจากห้อง…' },
              ],
            },
          ],
        },
        {
          type: 'SYS',
          title: 'ไลน์กลุ่มอาคาร',
          text: 'แจ้งเตือน: ลิฟต์ตัวขวาขัดข้องระหว่างชั้น 6–7 มีผู้ติดอยู่ 1 ท่าน ช่างกำลังเดินทางมา ขออภัยในความไม่สะดวก',
        },
        { type: 'MONO', speaker: 'out', expression: 'worried', text: '…ตัวขวา' },
        { type: 'MONO', speaker: 'out', text: 'อาจไม่ใช่ {in} ก็ได้' },
      ],
      next: 'ch1_s04',
    },
    {
      id: 'ch1_s04',
      background: 'bg_elevator_emergency',
      ariaLabel: 'ภาพแบ่งสองฝั่ง ซ้ายคือในลิฟต์ที่มีแต่ไฟฉุกเฉินสีส้ม ขวาคือครัวในห้อง ฝนตกหนัก',
      controller: 'narrator',
      lines: [
        {
          type: 'ENV',
          set: {
            split: ['bg_elevator_emergency', 'bg_apartment_kitchen'],
            rain: 'heavy',
            light: 'emergency',
            haze: 1,
          },
        },
        {
          type: 'DLG',
          speaker: 'ยาม (อินเตอร์คอม)',
          text: 'ได้ยินไหมครับ ใจเย็น ๆ นะครับ ช่างกำลังมา น่าจะยี่สิบถึงสามสิบนาทีครับ',
        },
        { type: 'MONO', speaker: 'in', text: 'สามสิบนาที…' },
        { type: 'MONO', speaker: 'out', text: 'ถ้าเป็น {in} จริง ๆ ล่ะ' },
        { type: 'NARR', text: 'ตอนนี้ระยะห่างระหว่างสองคน คือสองชั้น กับประตูเหล็กหนึ่งบาน' },
      ],
      next: 'ch1_cards',
    },
    {
      id: 'ch1_cards',
      background: 'bg_building_exterior_rain',
      ariaLabel: 'ตึกอพาร์ตเมนต์กลางสายฝนตอนกลางคืน',
      controller: 'narrator',
      lines: [
        {
          type: 'ENV',
          set: { split: null, bg: 'bg_building_exterior_rain', rain: 'medium', haze: 0, light: 'normal' },
        },
        { type: 'EMOTION_CARDS' },
      ],
      next: 'ch1_reflect',
    },
    {
      id: 'ch1_reflect',
      background: 'bg_building_exterior_rain',
      ariaLabel: 'ตึกอพาร์ตเมนต์กลางสายฝนตอนกลางคืน',
      controller: 'narrator',
      lines: [{ type: 'REFLECTION' }],
      next: 'ch1_end',
    },
    {
      id: 'ch1_end',
      background: 'bg_building_exterior_rain',
      ariaLabel: 'มองจากไกล ๆ เห็นตึกทั้งหลังกลางสายฝน',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { split: null, bg: 'bg_building_exterior_rain', rain: 'heavy' } },
        { type: 'NARR', text: 'บางครั้ง สิ่งที่แยกเราออกจากกัน ไม่ใช่ระยะทาง' },
        { type: 'NARR', text: 'แต่คือการที่เราไม่รู้ว่า อีกฝ่ายกำลังเจออะไรอยู่' },
      ],
      next: null,
    },
  ],
  emotionCards: {
    groups: [
      {
        role: 'insider',
        cards: [
          { id: 'ec_in_shock', text: 'ตกใจ' },
          { id: 'ec_in_fear', text: 'กลัว' },
          { id: 'ec_in_helpless', text: 'รู้สึกช่วยตัวเองไม่ได้' },
          { id: 'ec_in_cramped', text: 'อึดอัด' },
          { id: 'ec_in_annoyed', text: 'รำคาญ' },
          { id: 'ec_in_embarrassed', text: 'อาย' },
          { id: 'ec_in_calm', text: 'ยังสงบอยู่' },
        ],
      },
      {
        role: 'waiter',
        cards: [
          { id: 'ec_out_wonder', text: 'สงสัย' },
          { id: 'ec_out_worry', text: 'กังวล' },
          { id: 'ec_out_worst', text: 'คิดไปถึงเรื่องแย่ที่สุด' },
          { id: 'ec_out_frustrated', text: 'หงุดหงิด' },
          { id: 'ec_out_helpless', text: 'รู้สึกช่วยอะไรไม่ได้' },
          { id: 'ec_out_unsure', text: 'ยังไม่แน่ใจว่าเกิดอะไรขึ้น' },
        ],
      },
    ],
  },
  reflection: [
    {
      id: 'r1_1',
      self: 'ถ้าคุณคือคนในลิฟต์ วินาทีแรกที่ลิฟต์หยุด คุณคิดว่าตัวเองจะรู้สึกอะไรมากที่สุด',
      options: [
        { id: 'r1_1_shock', text: 'ตกใจ' },
        { id: 'r1_1_fear', text: 'กลัว' },
        { id: 'r1_1_helpless', text: 'รู้สึกช่วยตัวเองไม่ได้' },
        { id: 'r1_1_cramped', text: 'อึดอัด' },
        { id: 'r1_1_annoyed', text: 'รำคาญ' },
        { id: 'r1_1_embarrassed', text: 'อาย' },
        { id: 'r1_1_calm', text: 'ยังสงบอยู่' },
      ],
      maxSelect: 2,
      freeText: false,
    },
    {
      id: 'r1_2',
      self: 'ถ้าคุณคือคนที่รอ ความคิดแรกที่ผุดขึ้นมาในหัวคืออะไร',
      options: [
        { id: 'r1_2_nothing', text: 'คงไม่มีอะไร' },
        { id: 'r1_2_something', text: 'ต้องมีอะไรเกิดขึ้นแน่' },
        { id: 'r1_2_go_now', text: 'ต้องไปดูเดี๋ยวนี้' },
        { id: 'r1_2_want_news', text: 'อยากให้มีใครบอกอะไรสักอย่าง' },
      ],
      maxSelect: 1,
      freeText: true,
    },
    {
      id: 'r1_3',
      self: '(ไม่บังคับ) ครั้งล่าสุดที่คุณต้องรอใครสักคน โดยไม่รู้ว่าเขาเป็นอย่างไร คุณทำอะไรกับความรู้สึกนั้น',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [
      { type: 'SYS', text: 'บทที่ 1 จบแล้ว' },
      { type: 'NARR', text: 'สามสิบนาทีนี้ ยาวไม่เท่ากันสำหรับสองคน' },
      { type: 'NARR', text: 'ลองเดินในรองเท้าของกันและกันดูไหม' },
    ],
    nextChapter: 'ch2',
  },
};
