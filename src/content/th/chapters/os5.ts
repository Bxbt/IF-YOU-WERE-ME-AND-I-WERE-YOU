/**
 * Storyline 2, Chapter 5 — I Just Want Peace. Transcribed from docs/02 (OS5).
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';
import { D, E, M, N, SYS } from './lines';

const MIRROR = 'กระจกในห้องน้ำตอนเช้า ใบหน้าในกระจกดูเหนื่อย แสงอ่อน ๆ ลอดหน้าต่างบานเล็ก';
const MORNING = 'ห้องนั่งเล่นตอนเช้า แดดอุ่น ๆ บนพื้น';
const STREET = 'ถนนเงียบตอนรุ่งสาง พระอาทิตย์กำลังขึ้นที่ปลายถนน มีคนหนึ่งเดินอยู่คนเดียว';

export const os5: ChapterContent = {
  id: 'os5',
  titleEn: 'I Just Want Peace',
  titleTh: 'ฉันอยากมีชีวิตที่ไม่ต้องเจ็บปวด',
  estimatedMinutes: [7, 9],
  firstScene: 'os5_s01',
  scenes: [
    {
      id: 'os5_s01',
      background: 'bg_bathroom_mirror',
      ariaLabel: MIRROR,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_bathroom_mirror', rain: 'none' }),
        N('เช้าวันจันทร์ {in} ยืนอยู่หน้ากระจก'),
        N('ใบหน้าในกระจกดูเหนื่อยกว่าที่จำได้'),
        M('in', '(ความสัมพันธ์ที่ดี ควรรู้สึกแบบไหนนะ)'),
        M(
          'in',
          '(ไม่ต้องคอยลุ้นว่าจะผิดหวังอีกไหม ไม่ต้องคอยปกป้องความรู้สึกตัวเอง ไม่ต้องทะเลาะเพียงเพื่อให้มีคนเข้าใจ)',
        ),
        M('in', '(ถ้าวันนี้ไม่มีอะไรต้องกังวลเลย อยากทำอะไรนะ)'),
        {
          type: 'CHOICE',
          id: 'os5_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: 'กินข้าวเช้าด้วยกัน แบบไม่ต้องรีบ',
              setFlags: { os_wish: 'breakfast' },
              responseLines: [M('in', '(เรื่องง่าย ๆ แค่นี้เอง)')],
            },
            {
              id: 'b',
              text: 'ดูหนังเรื่องโปรดซ้ำอีกรอบ',
              setFlags: { os_wish: 'movie' },
              responseLines: [M('in', '(เรื่องง่าย ๆ แค่นี้เอง)')],
            },
            {
              id: 'c',
              text: 'วางแผนไปเที่ยวสักที่',
              setFlags: { os_wish: 'trip' },
              responseLines: [M('in', '(เรื่องง่าย ๆ แค่นี้เอง)')],
            },
            {
              id: 'd',
              text: 'นอนต่ออีกนิด ไม่ต้องคุยกับใคร',
              setFlags: { os_wish: 'rest' },
              responseLines: [M('in', '(เรื่องง่าย ๆ แค่นี้เอง)')],
            },
          ],
        },
      ],
      next: 'os5_s02',
    },
    {
      id: 'os5_s02',
      background: 'bg_living_room_morning',
      ariaLabel: MORNING,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_living_room_morning', rain: 'none', music: 'ambient_home' }),
        N('ในหัวของ {in} มีภาพของวันธรรมดาวันหนึ่ง'),
        N('{wish_scene}'),
        N('แล้วกลับมาถึงห้อง โดยไม่ต้องกังวลว่าจะเกิดอะไรขึ้นต่อ'),
        D('out', 'วันนี้ว่างไหม ไปกินข้าวข้างนอกกันหน่อย', 'happy'),
        M('in', '(เมื่อก่อน ประโยคนี้ทำให้ใจพองโต)'),
        M('in', '(ตอนนี้ ทำไมแค่จะตอบ ก็รู้สึกเหนื่อยแล้ว)'),
        {
          type: 'CHOICE',
          id: 'os5_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ไปสิ" (แม้จะเหนื่อย)',
              setFlags: { os_go: 'tired_yes' },
              responseLines: [D('out', 'เย้', 'happy'), M('in', '(ขอให้วันนี้เป็นวันที่ดีนะ)')],
            },
            {
              id: 'b',
              text: '"วันนี้ขอพักนะ ไม่เกี่ยวกับ{you}"',
              setFlags: { os_go: 'rest' },
              responseLines: [D('out', 'โอเค พักเถอะ'), M('out', '(หรือเราเป็นคนที่ทำให้เหนื่อย…)')],
            },
            {
              id: 'c',
              text: '"ไปก็ได้ แต่ขอไม่คุยเรื่องหนัก ๆ นะ"',
              setFlags: { os_go: 'light' },
              responseLines: [D('out', 'ได้ วันนี้คุยแต่เรื่องเบา ๆ')],
            },
          ],
        },
      ],
      next: 'os5_s03',
    },
    {
      id: 'os5_s03',
      background: 'bg_apartment_evening',
      ariaLabel: 'ห้องในอพาร์ตเมนต์ตอนค่ำ โคมไฟสีอุ่น อีกคนนั่งคิดอะไรอยู่คนเดียว',
      controller: 'waiter',
      lines: [
        E({ bg: 'bg_apartment_evening', rain: 'none', lamp: 'warm', cast: ['out'] }),
        M('out', '(ช่วงนี้ {in} ยิ้มน้อยลง)'),
        M('out', '(อยากให้ทุกอย่างกลับไปเหมือนเดิม แต่ไม่รู้ว่าต้องเริ่มจากตรงไหน)'),
        M('out', '(บางที การชวนไปกินข้าว ก็เป็นวิธีขอโทษแบบเดียวที่รู้จัก)'),
      ],
      next: 'os5_s04',
    },
    {
      id: 'os5_s04',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_street_sunrise', rain: 'none', music: 'ambient_night' }),
        N('เช้ามืดวันต่อมา {in} ออกมาเดินคนเดียว'),
        N('ถนนยังเงียบ แสงแรกของวันค่อย ๆ ไล่ความมืดออกไป'),
        M('in', '(ไม่ได้อยากได้ชีวิตที่สมบูรณ์แบบ)'),
        M('in', '(แค่อยากมีชีวิตที่ไม่ต้องเจ็บปวด)'),
      ],
      next: 'os5_cards',
    },
    {
      id: 'os5_cards',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'narrator',
      lines: [E({ bg: 'bg_street_sunrise', rain: 'none' }), { type: 'EMOTION_CARDS' }],
      next: 'os5_reflect',
    },
    {
      id: 'os5_reflect',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'narrator',
      lines: [E({ bg: 'bg_street_sunrise', rain: 'none' }), { type: 'REFLECTION' }],
      next: 'os5_end',
    },
    {
      id: 'os5_end',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_street_sunrise', rain: 'none' }),
        N('ความสงบ ไม่ได้แปลว่าไม่มีปัญหาเลย'),
        N('แต่คือการไม่ต้องกลัว ว่าพรุ่งนี้จะเจ็บแบบเดิมอีก'),
      ],
      next: null,
    },
  ],
  fragments: {
    wish_scene: {
      flag: 'os_wish',
      values: {
        breakfast: 'ข้าวต้มสองชาม กับเสียงหัวเราะเรื่องไร้สาระ',
        movie: 'หนังเรื่องเดิมที่ดูมาสิบรอบ กับผ้าห่มผืนเดียว',
        trip: 'แผนที่บนจอโทรศัพท์ กับทริปที่ยังไม่ได้ตั้งชื่อ',
        rest: 'ห้องที่เงียบ แต่ไม่ใช่ความเงียบที่น่ากลัว',
      },
      fallback: 'วันธรรมดาที่ไม่มีอะไรต้องระวัง',
    },
  },
  emotionCards: {
    groups: [
      {
        role: 'insider',
        label: '{in} อาจรู้สึก…',
        cards: [
          { id: 'os5_in_numb', text: 'เหนื่อยจนไม่อยากรู้สึกอะไร' },
          { id: 'os5_in_miss_old', text: 'คิดถึงวันเก่า ๆ' },
          { id: 'os5_in_need_rest', text: 'อยากพัก' },
          { id: 'os5_in_still_love', text: 'ยังรัก' },
          { id: 'os5_in_want_peace', text: 'อยากได้ความสงบ' },
          { id: 'os5_in_confused', text: 'สับสน' },
        ],
      },
      {
        role: 'waiter',
        label: '{out} อาจรู้สึก…',
        cards: [
          { id: 'os5_out_distant', text: 'รู้สึกว่าห่างกัน' },
          { id: 'os5_out_no_way', text: 'อยากแก้แต่ไม่รู้วิธี' },
          { id: 'os5_out_fear_loss', text: 'กลัวเสียไป' },
          { id: 'os5_out_tired', text: 'เหนื่อยเหมือนกัน' },
          { id: 'os5_out_hope', text: 'ยังมีหวัง' },
        ],
      },
    ],
  },
  reflection: [
    {
      id: 'ro5_1',
      self: 'สำหรับคุณ ความสัมพันธ์ที่สงบมีหน้าตาแบบไหน',
      options: [
        { id: 'ro5_1_no_guard', text: 'ไม่ต้องระวังคำพูดตลอดเวลา' },
        { id: 'ro5_1_resolve', text: 'ทะเลาะแล้วคุยกันจบได้' },
        { id: 'ro5_1_trust', text: 'ไว้ใจกันโดยไม่ต้องพิสูจน์' },
        { id: 'ro5_1_ordinary', text: 'มีเวลาธรรมดา ๆ ด้วยกัน' },
        { id: 'ro5_1_space', text: 'มีพื้นที่ส่วนตัว' },
      ],
      maxSelect: 3,
      freeText: true,
      toNextConversation: true,
    },
    {
      id: 'ro5_2',
      self: '(ไม่บังคับ) ช่วงนี้ อะไรทำให้คุณเหนื่อยที่สุดในความสัมพันธ์',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [SYS('บทที่ 5 จบแล้ว'), N('ถ้าเลือกตัวเองสักครั้ง จะเป็นอย่างไร')],
    nextChapter: 'os6',
  },
};
