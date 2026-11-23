/**
 * Storyline 2, Chapter 2 — I Want to Matter. Transcribed from docs/02 (เส้นเรื่องที่ 2, OS2).
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';
import { D, E, M, N, S, SYS, is } from './lines';

const MORNING = 'ห้องนั่งเล่นตอนเช้า แดดอ่อน ๆ ส่องผ่านหน้าต่าง';
const NIGHT = 'ห้องนั่งเล่นตอนกลางคืน ไฟสลัว ฝนตกเบา ๆ นอกหน้าต่าง';
const BALCONY = 'ระเบียงเล็ก ๆ หลังห้องตอนกลางคืน ไฟเมืองเปิดอยู่เกือบทุกบาน';

export const os2: ChapterContent = {
  id: 'os2',
  titleEn: 'I Want to Matter',
  titleTh: 'ฉันอยากรู้สึกว่าตัวเองมีความหมาย',
  estimatedMinutes: [7, 9],
  firstScene: 'os2_s01',
  scenes: [
    {
      id: 'os2_s01',
      background: 'bg_living_room_morning',
      ariaLabel: MORNING,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_living_room_morning', rain: 'none', music: 'ambient_home' }),
        N('เช้าวันเสาร์ ก่อนที่ใครในห้องจะตื่น'),
        N('{in} จ่ายค่าไฟ นัดช่างล้างแอร์ ซื้อของเข้าตู้เย็น และโทรบอกเจ้าของห้องเรื่องก๊อกน้ำรั่ว'),
        N('ไม่มีใครขอให้ทำ แต่ถ้าไม่ทำ ก็ไม่มีใครทำ'),
        M('in', '(ไม่ได้อยากได้รางวัล แค่อยากให้มีคนรู้ว่าเรื่องพวกนี้ไม่ได้เกิดขึ้นเอง)'),
        D('out', 'ตู้เย็นเต็มเลย ซื้อของมาตอนไหนเนี่ย', 'happy'),
        {
          type: 'CHOICE',
          id: 'os2_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"เมื่อเช้า ตอน{you}ยังหลับ" (ยิ้ม)',
              setFlags: { os_credit: 'soft' },
              responseLines: [D('out', 'ขยันจัง', 'happy'), N('{out} หยิบนมไปเทใส่แก้ว แล้วเปิดโทรศัพท์ต่อ')],
            },
            {
              id: 'b',
              text: '"ก็ซื้อทุกอาทิตย์อยู่แล้ว"',
              setFlags: { os_credit: 'flat' },
              responseLines: [D('out', 'เหรอ ไม่ค่อยได้สังเกตเลย'), M('out', '(จริงด้วย ทุกอาทิตย์เลยนี่)')],
            },
            {
              id: 'c',
              text: '"จ่ายค่าไฟกับนัดช่างแอร์ไว้แล้วด้วยนะ"',
              setFlags: { os_credit: 'list' },
              responseLines: [
                D('out', 'โอ้ ขอบคุณนะ'),
                M('in', '(ได้ยินคำว่าขอบคุณแล้ว ทำไมยังรู้สึกเหมือนต้องขอ)'),
              ],
            },
            {
              id: 'd',
              text: '(ไม่ตอบ ยิ้มเฉย ๆ)',
              setFlags: { os_credit: 'quiet' },
              responseLines: [M('in', '(ถ้าไม่พูด ก็ไม่มีใครรู้ ถ้าพูด ก็เหมือนทวงบุญคุณ)')],
            },
          ],
        },
      ],
      next: 'os2_s02',
    },
    {
      id: 'os2_s02',
      background: 'bg_living_room_night',
      ariaLabel: NIGHT,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_living_room_night', rain: 'light', lamp: 'warm' }),
        N('คืนวันเดียวกัน'),
        S('โทรศัพท์ของ {out}', 'อินเทอร์เน็ตถูกระงับชั่วคราว กรุณาชำระค่าบริการ'),
        D('out', 'เน็ตตัดอีกแล้ว ไม่ได้จ่ายเหรอ ประชุมอยู่นะ', 'angry'),
        M('in', '(ลืมไปรายการเดียว จากทั้งหมดที่ทำวันนี้)'),
        {
          type: 'CHOICE',
          id: 'os2_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ขอโทษ เดี๋ยวจ่ายให้เลย"',
              setFlags: { os_slip: 'sorry' },
              responseLines: [D('out', 'อืม… รีบหน่อยนะ', 'worried'), M('in', '(ขอโทษเร็วจนชิน)')],
            },
            {
              id: 'b',
              text: '"วันนี้จ่ายไปตั้งหลายอย่าง ลืมไปอันเดียวเอง"',
              setFlags: { os_slip: 'explain' },
              responseLines: [
                D('out', 'ก็แค่บอกว่าเน็ตตัด ไม่ได้ว่าอะไรสักหน่อย', 'angry'),
                M('in', '(แต่มันรู้สึกเหมือนถูกว่า)'),
              ],
            },
            {
              id: 'c',
              text: '"แล้วทำไม{you}ไม่จ่ายเองบ้าง"',
              setFlags: { os_slip: 'push' },
              responseLines: [D('out', '…ก็ได้ เดี๋ยวจ่ายเอง', 'sad'), N('ห้องเงียบลงทันที')],
            },
            {
              id: 'd',
              text: '(เงียบ แล้วกดจ่ายในโทรศัพท์)',
              setFlags: { os_slip: 'quiet' },
              responseLines: [
                N('สามนาทีต่อมา เน็ตกลับมา'),
                D('out', 'มาแล้ว ๆ'),
                M('in', '(ไม่มีใครรู้ว่าใครเป็นคนแก้)'),
              ],
            },
          ],
        },
      ],
      next: 'os2_s03',
    },
    {
      id: 'os2_s03',
      background: 'bg_living_room_night',
      ariaLabel: NIGHT,
      controller: 'waiter',
      lines: [
        E({ bg: 'bg_living_room_night', rain: 'light' }),
        M('out', '(ไม่ได้ตั้งใจจะพูดแรง แค่ตกใจ ประชุมนี้สำคัญมาก)'),
        M('out', '(ลืมไปเลยว่าเรื่องบิลทั้งหมด {in} ทำมาตลอด)'),
        M('out', '(คำนั้นเจ็บนะ… แต่ก็อาจจริงอยู่บ้าง)', is('os_slip', 'push')),
        M('out', '(ทำไมต้องรู้สึกเหมือนทะเลาะ ทั้งที่แค่บอกเฉย ๆ)', is('os_slip', 'explain')),
        M('out', '(ถ้าจะขอบคุณตอนนี้ จะดูแปลกไหมนะ)'),
      ],
      next: 'os2_s04',
    },
    {
      id: 'os2_s04',
      background: 'bg_balcony_night',
      ariaLabel: BALCONY,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_balcony_night', rain: 'none', music: 'ambient_night' }),
        N('ระเบียงเล็ก ๆ หลังห้อง ไฟเมืองยังเปิดอยู่เกือบทุกบาน'),
        M('in', '(ฉันต้องพยายามอีกแค่ไหน ถึงจะทำให้คนที่ฉันรักมองเห็นคุณค่าของฉัน)'),
        M('in', '(ไม่ได้อยากชนะทุกเรื่อง ไม่ได้อยากเป็นคนที่ดีพร้อม)'),
        M('in', '(แค่อยากถูกรัก โดยไม่ต้องคอยพิสูจน์ตัวเองตลอดเวลา)'),
        N('ประตูกระจกเลื่อนเปิด'),
        D('out', 'ขอบคุณนะ เรื่องบิล เรื่องตู้เย็น… ทุกเรื่องเลย ไม่เคยพูดสักที', 'sad'),
        {
          type: 'CHOICE',
          id: 'os2_c03',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ขอบคุณที่เห็นนะ"',
              setFlags: { os_seen: 'thanks' },
              responseLines: [D('out', 'ควรเห็นตั้งนานแล้ว')],
            },
            {
              id: 'b',
              text: '"ฉันไม่ได้ต้องการให้{you}เห็นว่าฉันดีพร้อมทุกอย่าง ฉันแค่อยากให้{you}มองเห็นว่าฉันก็พยายามเพื่อเรามากแค่ไหน"',
              setFlags: { os_seen: 'say_need' },
              responseLines: [D('out', '…เข้าใจแล้ว จะพยายามมองให้เห็นนะ', 'thinking')],
            },
            {
              id: 'c',
              text: '"อืม" (ยังพูดอะไรไม่ออก)',
              setFlags: { os_seen: 'not_yet' },
              responseLines: [
                M('in', '(ดีใจนะ แต่ความเหนื่อยไม่ได้หายไปในคำเดียว)'),
                N('{out} นั่งลงข้าง ๆ เงียบ ๆ'),
              ],
            },
          ],
        },
      ],
      next: 'os2_reflect',
    },
    {
      id: 'os2_reflect',
      background: 'bg_balcony_night',
      ariaLabel: BALCONY,
      controller: 'narrator',
      lines: [E({ bg: 'bg_balcony_night', rain: 'none' }), { type: 'REFLECTION' }],
      next: 'os2_end',
    },
    {
      id: 'os2_end',
      background: 'bg_balcony_night',
      ariaLabel: BALCONY,
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_balcony_night', rain: 'none' }),
        N('คำขอบคุณที่ไม่ต้องขอ มีน้ำหนักมากกว่าที่คิด'),
        N('และการถูกมองเห็น บางทีก็สำคัญกว่าการถูกชม'),
      ],
      next: null,
    },
  ],
  reflection: [
    {
      id: 'ro2_1',
      self: 'สิ่งที่คุณทำเพื่อความสัมพันธ์ แต่รู้สึกว่าไม่ค่อยมีใครเห็น',
      options: [
        { id: 'ro2_1_chores', text: 'งานบ้าน' },
        { id: 'ro2_1_money', text: 'เรื่องเงินและบิล' },
        { id: 'ro2_1_feelings', text: 'ดูแลความรู้สึกของอีกฝ่าย' },
        { id: 'ro2_1_silence', text: 'ยอมเงียบเพื่อไม่ให้ทะเลาะ' },
        { id: 'ro2_1_plans', text: 'วางแผนเรื่องต่าง ๆ ล่วงหน้า' },
      ],
      maxSelect: 3,
      freeText: true,
      toNextConversation: true,
    },
    {
      id: 'ro2_2',
      self: 'เวลาคุณทำพลาด คุณอยากให้คนข้าง ๆ ตอบแบบไหน',
      options: [
        { id: 'ro2_2_direct', text: 'บอกตรง ๆ แต่ไม่ตำหนิ' },
        { id: 'ro2_2_fix_first', text: 'ช่วยแก้ก่อน แล้วค่อยคุย' },
        { id: 'ro2_2_its_ok', text: 'บอกว่าไม่เป็นไร' },
        { id: 'ro2_2_ask', text: 'ถามว่าเกิดอะไรขึ้น' },
      ],
      maxSelect: 1,
      freeText: true,
    },
    {
      id: 'ro2_3',
      self: '(ไม่บังคับ) ประโยคที่คุณอยากได้ยินจากคนที่คุณรักตอนนี้',
      options: [],
      maxSelect: 1,
      freeText: true,
      toNextConversation: true,
    },
  ],
  transition: {
    lines: [SYS('บทที่ 2 จบแล้ว'), N('บางเรื่องผ่านมานานแล้ว แต่ยังไม่หายไปไหน')],
    nextChapter: 'os3',
  },
};
