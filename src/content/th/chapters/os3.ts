/**
 * Storyline 2, Chapter 3 — The Trust That Never Fully Healed. Transcribed from docs/02 (OS3).
 * The past event is never named (docs/02 เส้นเรื่องที่ 2 rules) — players fill it in themselves.
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';
import { D, E, M, N, S, SAFE, SYS, is } from './lines';

const BEDROOM = 'ห้องนอนตอนตีหนึ่ง ไฟดับ มีแต่แสงจากหน้าจอโทรศัพท์ ฝนตกหนักขึ้น';
const MORNING = 'ห้องนั่งเล่นตอนเช้า แดดอ่อน ๆ หลังคืนที่ฝนตก';

export const os3: ChapterContent = {
  id: 'os3',
  titleEn: 'The Trust That Never Fully Healed',
  titleTh: 'ความไว้ใจที่แตกสลาย',
  estimatedMinutes: [7, 9],
  firstScene: 'os3_s01',
  scenes: [
    {
      id: 'os3_s01',
      background: 'bg_bedroom_night',
      ariaLabel: BEDROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_bedroom_night', rain: 'medium', lamp: 'off' }),
        N('ไม่ใช่ทุกความทรงจำของความรักจะสวยงาม'),
        N('บางเรื่องผ่านมานานแล้ว แต่ยังทิ้งรอยไว้'),
        N('ตีหนึ่ง โทรศัพท์ของ {out} บนโต๊ะข้างเตียงสว่างขึ้น'),
        E({ sfx: 'phone_buzz' }),
        S('หน้าจอล็อก', 'ข้อความใหม่ 1 ข้อความ'),
        M('in', '(แค่ข้อความเดียว ทำไมใจถึงเต้นแรงขนาดนี้)'),
        M('in', '(เพราะครั้งก่อน ก็เริ่มจากเรื่องที่ไม่มีใครเล่าให้ฟังเหมือนกัน)'),
        {
          type: 'CHOICE',
          id: 'os3_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: 'ปลุก {out} ขึ้นมาถาม',
              setFlags: { os_buzz: 'wake' },
              responseLines: [
                D('out', 'หืม… ข้อความจากกลุ่มงานน่ะ ดูได้เลย', 'worried'),
                M('in', '(บอกว่าดูได้ แต่ทำไมใจยังไม่สงบ)'),
              ],
            },
            {
              id: 'b',
              text: 'พลิกตัวไปอีกทาง พยายามหลับ',
              setFlags: { os_buzz: 'turn_away' },
              responseLines: [
                M('in', '(ถ้าถาม ก็กลัวถูกมองว่าไม่ไว้ใจ)'),
                M('in', '(ถ้าไม่ถาม ก็ต้องนอนกับคำถามนี้ทั้งคืน)'),
              ],
            },
            {
              id: 'c',
              text: 'เอื้อมมือไปหยิบโทรศัพท์ แล้ววางลงที่เดิม',
              setFlags: { os_buzz: 'almost' },
              responseLines: [M('in', '(ไม่อยากเป็นคนแบบนี้)'), M('in', '(แต่ก็ไม่อยากเจ็บแบบเดิมอีก)')],
            },
            {
              id: 'd',
              text: 'ลุกไปนั่งที่ระเบียงคนเดียว',
              setFlags: { os_buzz: 'balcony' },
              responseLines: [
                E({ bg: 'bg_balcony_night', rain: 'medium' }),
                N('ฝนยังไม่หยุด ไฟเมืองพร่าเลือนอยู่หลังม่านฝน'),
                M('in', '(เวลาผ่านไปแล้ว แต่ความรู้สึกปลอดภัยไม่ได้กลับมาตามเวลา)'),
              ],
            },
          ],
        },
      ],
      next: 'os3_s02',
    },
    {
      id: 'os3_s02',
      background: 'bg_living_room_morning',
      ariaLabel: MORNING,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_living_room_morning', rain: 'none' }),
        N('เช้าวันต่อมา'),
        D('out', 'เมื่อคืนเหมือนไม่ได้นอนเลยนะ'),
        D('out', 'ยังคิดเรื่องข้อความอยู่ใช่ไหม', 'sad', is('os_buzz', 'wake')),
        {
          type: 'CHOICE',
          id: 'os3_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"เรื่องเมื่อก่อน มันยังไม่หายไปไหนเลย"',
              setFlags: { os_past: 'name_it' },
              responseLines: [
                D('out', 'มันจบไปแล้วนะ ตอนนี้ไม่มีอะไรจริง ๆ', 'sad'),
                M('in', '(อยากเชื่อนะ)'),
                M('in', '(แต่ใจมันยังจำได้)'),
              ],
            },
            {
              id: 'b',
              text: '"ไม่มีอะไร นอนไม่หลับเฉย ๆ"',
              setFlags: { os_past: 'hide' },
              responseLines: [
                D('out', 'อืม ถ้ามีอะไรบอกได้นะ'),
                M('in', '(ถ้าบอกได้ง่ายขนาดนั้น คงบอกไปนานแล้ว)'),
              ],
            },
            {
              id: 'c',
              text: '"{you}เข้าใจไหม ว่าการเชื่อใหม่อีกครั้งมันยากแค่ไหน"',
              setFlags: { os_past: 'ask' },
              responseLines: [
                D('out', '…ไม่รู้หรอกว่ายากแค่ไหน แต่ไม่อยากให้{you}ต้องเจ็บอีก', 'worried'),
                M('in', '(ประโยคนี้ช่วยได้นิดหนึ่ง)'),
              ],
            },
          ],
        },
      ],
      next: 'os3_s03',
    },
    {
      id: 'os3_s03',
      background: 'bg_corridor',
      ariaLabel: 'ทางเดินหน้าห้องตอนเช้า มีคนหนึ่งยืนรอลิฟต์อยู่คนเดียว',
      controller: 'waiter',
      lines: [
        E({ bg: 'bg_corridor', rain: 'none', light: 'normal' }),
        N('ทางเดินหน้าห้อง {out} ยืนรอลิฟต์อยู่คนเดียว'),
        M('out', '(เรื่องนั้น เป็นเรื่องที่อยากย้อนกลับไปแก้ที่สุด)'),
        M('out', '(พยายามทำทุกอย่างให้เปิดเผย แต่บางวันก็รู้สึกเหมือนต้องพิสูจน์ตัวเองไม่จบ)'),
        M('out', '(เหนื่อยเหมือนกัน แต่ไม่รู้จะพูดยังไงไม่ให้ฟังเหมือนแก้ตัว)'),
        N('สองคนกลัวคนละอย่าง คนหนึ่งกลัวเจ็บซ้ำ อีกคนกลัวว่าจะไม่มีวันได้ความไว้ใจกลับคืนมา'),
        SAFE(
          'ความไม่ไว้ใจเป็นความรู้สึกที่มีที่มา — แต่ถ้าในความสัมพันธ์มีการบังคับตรวจโทรศัพท์ จำกัดการเจอคน หรือข่มขู่ นั่นไม่ใช่สิ่งที่ใครต้องทนอยู่คนเดียว ดูช่องทางขอความช่วยเหลือได้ที่หน้า "เกี่ยวกับ"',
        ),
      ],
      next: 'os3_cards',
    },
    {
      id: 'os3_cards',
      background: 'bg_living_room_morning',
      ariaLabel: MORNING,
      controller: 'narrator',
      lines: [E({ bg: 'bg_living_room_morning', rain: 'none' }), { type: 'EMOTION_CARDS' }],
      next: 'os3_reflect',
    },
    {
      id: 'os3_reflect',
      background: 'bg_living_room_morning',
      ariaLabel: MORNING,
      controller: 'narrator',
      lines: [E({ bg: 'bg_living_room_morning', rain: 'none' }), { type: 'REFLECTION' }],
      next: 'os3_end',
    },
    {
      id: 'os3_end',
      background: 'bg_living_room_morning',
      ariaLabel: MORNING,
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_living_room_morning', rain: 'none' }),
        N('ความไว้ใจไม่ได้กลับมาเพียงเพราะเวลาผ่านไป'),
        N('แต่อาจค่อย ๆ กลับมา จากเรื่องเล็ก ๆ ที่ทำซ้ำทุกวัน'),
      ],
      next: null,
    },
  ],
  emotionCards: {
    groups: [
      {
        role: 'insider',
        cards: [
          { id: 'os3_in_fear_hurt', text: 'กลัวเจ็บอีก' },
          { id: 'os3_in_want_believe', text: 'อยากเชื่อ' },
          { id: 'os3_in_confused', text: 'สับสน' },
          { id: 'os3_in_on_guard', text: 'เหนื่อยที่ต้องคอยระวัง' },
          { id: 'os3_in_blame_self', text: 'โทษตัวเองที่ยังคิดอยู่' },
          { id: 'os3_in_still_love', text: 'ยังรัก' },
        ],
      },
      {
        role: 'waiter',
        cards: [
          { id: 'os3_out_regret', text: 'เสียใจกับเรื่องเดิม' },
          { id: 'os3_out_prove', text: 'อยากพิสูจน์' },
          { id: 'os3_out_worn', text: 'เหนื่อยที่ต้องพิสูจน์' },
          { id: 'os3_out_fear_loss', text: 'กลัวเสียไป' },
          { id: 'os3_out_lost', text: 'ไม่รู้จะทำยังไง' },
        ],
      },
    ],
  },
  reflection: [
    {
      id: 'ro3_1',
      self: 'อะไรช่วยให้คุณรู้สึกปลอดภัยที่จะเชื่อใจใครสักคนอีกครั้ง',
      options: [
        { id: 'ro3_1_share', text: 'เล่าเรื่องต่าง ๆ ให้ฟังเองโดยไม่ต้องถาม' },
        { id: 'ro3_1_consistent', text: 'ทำตามที่พูดซ้ำ ๆ จนเห็นเอง' },
        { id: 'ro3_1_no_anger', text: 'ไม่โกรธเมื่อฉันถาม' },
        { id: 'ro3_1_time', text: 'ให้เวลาโดยไม่เร่ง' },
        { id: 'ro3_1_talk', text: 'คุยเรื่องเดิมได้โดยไม่ทะเลาะ' },
      ],
      maxSelect: 2,
      freeText: true,
      toNextConversation: true,
    },
    {
      id: 'ro3_2',
      self: '(ไม่บังคับ) มีเรื่องไหนที่ผ่านมานานแล้ว แต่คุณยังรู้สึกถึงมันอยู่บ้าง',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [SYS('บทที่ 3 จบแล้ว'), N('บางเรื่องไม่เคยถูกพูดออกมา แต่ไม่ได้แปลว่ามันไม่มีอยู่')],
    nextChapter: 'os4',
  },
};
