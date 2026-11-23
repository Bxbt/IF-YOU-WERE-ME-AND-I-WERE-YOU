/**
 * Storyline 2, Chapter 3 — The Trust That Never Fully Healed. Transcribed from docs/02 (OS3).
 * Trust broken by promises to change that end the same way again (owner decision 2026-11-23) —
 * no third person, no checking phones. Both sides have their reasons; nobody is the villain.
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';
import { D, E, M, N, S, SAFE, SYS } from './lines';

const BEDROOM = 'ห้องนอนตอนกลางคืน ไฟหัวเตียงดวงเล็ก ฝนตกปรอย ๆ นอกหน้าต่าง';
const ROOM = 'ห้องในอพาร์ตเมนต์ตอนค่ำ โคมไฟสีอุ่น คนหนึ่งแต่งตัวรอออกไปข้างนอก';

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
        E({ bg: 'bg_bedroom_night', rain: 'light', lamp: 'warm' }),
        N('ไม่ใช่ทุกความทรงจำของความรักจะสวยงาม'),
        N('บางเรื่องไม่ได้แตกในครั้งเดียว แต่ค่อย ๆ ร้าวทีละนิด'),
        N('พรุ่งนี้คือวันที่นัดกันไว้ตั้งแต่เดือนก่อน — มื้อเย็นที่ร้านเดิม ร้านที่เจอกันครั้งแรก'),
        S('ความทรงจำ', '"ขอโทษนะ งานด่วนจริง ๆ ครั้งหน้าไม่มีแบบนี้แล้ว"'),
        S('ความทรงจำ', '"สัญญาเลย ต่อไปจะไม่เอางานมาก่อนเราอีก"'),
        D('out', 'พรุ่งนี้หกโมงเย็นนะ ไปแน่นอน สัญญา'),
        M('in', '(ประโยคนี้… เคยได้ยินมาแล้วกี่ครั้งนะ)'),
        {
          type: 'CHOICE',
          id: 'os3_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"อืม" (แล้วหันไปอีกทาง)',
              setFlags: { os_promise: 'quiet' },
              responseLines: [M('in', '(ไม่อยากหวัง จะได้ไม่ต้องผิดหวัง)')],
            },
            {
              id: 'b',
              text: '"ครั้งที่แล้วก็พูดแบบนี้"',
              setFlags: { os_promise: 'last_time' },
              responseLines: [D('out', '…รู้ ครั้งนี้จะไม่เป็นแบบนั้นแล้ว', 'sad'), M('in', '(อยากเชื่อนะ)')],
            },
            {
              id: 'c',
              text: '"ถ้าไปไม่ได้ บอกตรง ๆ ตั้งแต่ตอนนี้ก็ได้นะ"',
              setFlags: { os_promise: 'say_now' },
              responseLines: [D('out', 'ไปได้ ไม่มีอะไรแน่นอน', 'worried'), M('in', '(ขอให้จริงเถอะ)')],
            },
            {
              id: 'd',
              text: '"ขอบคุณนะ หวังว่าครั้งนี้จะจริง"',
              setFlags: { os_promise: 'hope' },
              responseLines: [
                D('out', 'จริงสิ', 'happy'),
                M('in', '(หวังมาหลายครั้งแล้ว แต่ก็ยังหวังอยู่ดี)'),
              ],
            },
          ],
        },
      ],
      next: 'os3_s02',
    },
    {
      id: 'os3_s02',
      background: 'bg_apartment_evening',
      ariaLabel: ROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', rain: 'none', lamp: 'warm' }),
        N('เย็นวันต่อมา ห้าโมงครึ่ง {in} แต่งตัวเสร็จแล้ว'),
        E({ sfx: 'phone_buzz' }),
        S('ข้อความจาก {out}', 'ขอโทษจริง ๆ หัวหน้าเรียกประชุมด่วน ไปไม่ทันแล้ว เลื่อนเป็นวันเสาร์ได้ไหม'),
        M('in', '(ไม่ได้โกรธที่งานเยอะ)'),
        M('in', '(แต่เหนื่อยที่ต้องเชื่อคำว่า "ครั้งหน้า" ใหม่อีกครั้ง)'),
        N('สี่ทุ่ม ประตูห้องเปิด'),
        D('out', 'ขอโทษนะ ครั้งนี้มันไม่ไหวจริง ๆ', 'sad'),
        {
          type: 'CHOICE',
          id: 'os3_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ไม่เป็นไร"',
              setFlags: { os_after: 'fine' },
              responseLines: [
                D('out', 'ขอบคุณที่เข้าใจนะ'),
                M('in', '(ไม่ได้เข้าใจ แค่เหนื่อยเกินกว่าจะพูด)'),
              ],
            },
            {
              id: 'b',
              text: '"ฉันไม่อยากได้คำสัญญาแล้ว อยากเห็นว่ามันเปลี่ยนจริง"',
              setFlags: { os_after: 'show_me' },
              responseLines: [
                D('out', '…ยุติธรรมแล้ว', 'sad'),
                M('in', '(ไม่ได้อยากให้รู้สึกผิด แค่อยากให้รู้ว่ามันหนักแค่ไหน)'),
              ],
            },
            {
              id: 'c',
              text: '"{you}เข้าใจไหม ว่าการเชื่อใหม่ทุกครั้งมันยากแค่ไหน"',
              setFlags: { os_after: 'ask' },
              responseLines: [
                D('out', '…ไม่เคยคิดว่ามันสะสมขนาดนี้', 'worried'),
                M('in', '(ดีที่อย่างน้อยวันนี้ได้พูด)'),
              ],
            },
            {
              id: 'd',
              text: '"ครั้งหน้าอย่าสัญญา ถ้าไม่แน่ใจว่าทำได้"',
              setFlags: { os_after: 'no_promise' },
              responseLines: [
                D('out', '…ได้ จะบอกตามจริงว่าทำได้แค่ไหน', 'thinking'),
                M('in', '(คำว่า "ไม่แน่ใจ" ยังเจ็บน้อยกว่า "สัญญา" ที่ไม่เป็นจริง)'),
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
      ariaLabel: 'ทางเดินหน้าห้องตอนดึก มีคนหนึ่งยืนอยู่คนเดียว',
      controller: 'waiter',
      lines: [
        E({ bg: 'bg_corridor', rain: 'none', light: 'normal' }),
        N('ทางเดินหน้าห้อง {out} ยืนอยู่คนเดียวก่อนเข้านอน'),
        M('out', '(อยากเป็นคนที่ทำตามที่พูดได้จริง ๆ)'),
        M('out', '(แต่ทุกครั้งที่จะปฏิเสธงาน ก็กลัวว่าจะเป็นคนแรกที่ถูกเลิกจ้าง)'),
        M('out', '(รู้ตัวว่าคำขอโทษของเราเริ่มไม่มีความหมาย และนั่นทำให้ไม่รู้จะเริ่มแก้ตรงไหน)'),
        N('คนหนึ่งเหนื่อยที่ต้องเชื่อใหม่ทุกครั้ง อีกคนเหนื่อยที่ทำตามคำพูดของตัวเองไม่ได้'),
        SAFE(
          'การผิดสัญญาซ้ำ ๆ ทำให้เหนื่อยได้จริง — แต่ถ้ามันมาพร้อมการทำร้าย ข่มขู่ หรือควบคุม นั่นไม่ใช่สิ่งที่ใครต้องทนอยู่คนเดียว ดูช่องทางขอความช่วยเหลือได้ที่หน้า "เกี่ยวกับ"',
        ),
      ],
      next: 'os3_cards',
    },
    {
      id: 'os3_cards',
      background: 'bg_bedroom_night',
      ariaLabel: BEDROOM,
      controller: 'narrator',
      lines: [E({ bg: 'bg_bedroom_night', rain: 'light', lamp: 'warm' }), { type: 'EMOTION_CARDS' }],
      next: 'os3_reflect',
    },
    {
      id: 'os3_reflect',
      background: 'bg_bedroom_night',
      ariaLabel: BEDROOM,
      controller: 'narrator',
      lines: [E({ bg: 'bg_bedroom_night', rain: 'light' }), { type: 'REFLECTION' }],
      next: 'os3_end',
    },
    {
      id: 'os3_end',
      background: 'bg_bedroom_night',
      ariaLabel: 'ห้องนอนมืดลง ไฟหัวเตียงดับแล้ว',
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_bedroom_night', rain: 'none', lamp: 'off' }),
        N('ความไว้ใจไม่ได้กลับมาเพราะคำสัญญาใหม่'),
        N('แต่อาจค่อย ๆ กลับมา จากเรื่องเล็ก ๆ ที่ทำได้จริงซ้ำทุกวัน'),
      ],
      next: null,
    },
  ],
  emotionCards: {
    groups: [
      {
        role: 'insider',
        label: '{in} อาจรู้สึก…',
        cards: [
          { id: 'os3_in_tired_trust', text: 'เหนื่อยที่ต้องเชื่อใหม่' },
          { id: 'os3_in_disappointed', text: 'ผิดหวัง' },
          { id: 'os3_in_no_hope', text: 'ไม่อยากหวังอีก' },
          { id: 'os3_in_understand_work', text: 'เข้าใจเรื่องงาน' },
          { id: 'os3_in_blame_self', text: 'โทษตัวเองที่ยังเชื่อ' },
          { id: 'os3_in_still_love', text: 'ยังรัก' },
        ],
      },
      {
        role: 'waiter',
        label: '{out} อาจรู้สึก…',
        cards: [
          { id: 'os3_out_guilty', text: 'รู้สึกผิด' },
          { id: 'os3_out_pressure', text: 'กดดันจากงาน' },
          { id: 'os3_out_want_change', text: 'อยากเปลี่ยนให้ได้' },
          { id: 'os3_out_fear_loss', text: 'กลัวเสียไป' },
          { id: 'os3_out_lost', text: 'ไม่รู้จะเริ่มตรงไหน' },
        ],
      },
    ],
  },
  reflection: [
    {
      id: 'ro3_1',
      self: 'อะไรช่วยให้คุณรู้สึกปลอดภัยที่จะเชื่อใจใครสักคนอีกครั้ง',
      options: [
        { id: 'ro3_1_consistent', text: 'ทำตามที่พูดซ้ำ ๆ จนเห็นเอง' },
        { id: 'ro3_1_honest_limit', text: 'บอกตรง ๆ ว่าทำไม่ได้ แทนการสัญญา' },
        { id: 'ro3_1_small', text: 'เริ่มจากสัญญาเล็ก ๆ ที่ทำได้จริง' },
        { id: 'ro3_1_time', text: 'ให้เวลาโดยไม่เร่ง' },
        { id: 'ro3_1_talk', text: 'คุยเรื่องเดิมได้โดยไม่ทะเลาะ' },
      ],
      maxSelect: 2,
      freeText: true,
      toNextConversation: true,
    },
    {
      id: 'ro3_2',
      self: '(ไม่บังคับ) มีคำสัญญาไหนที่คุณยังรออยู่ — หรือที่คุณเองยังทำไม่ได้',
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
