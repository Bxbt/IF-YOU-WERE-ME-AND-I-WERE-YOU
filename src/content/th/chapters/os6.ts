/**
 * Storyline 2, Chapter 6 — Choosing Myself. Transcribed from docs/02 (OS6).
 * Open ending (owner decision 2026-11-23): four paths, none right or wrong; both people speak or
 * think on every path and nobody is the villain. All paths meet again at os6_s03.
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';
import { D, E, M, N, S, SAFE, SYS, is } from './lines';

const BALCONY = 'ระเบียงว่างตอนกลางคืน ไฟเมืองเปิดอยู่ คนหนึ่งเลื่อนดูรูปเก่าในโทรศัพท์';
const ROOM = 'ห้องในอพาร์ตเมนต์ตอนค่ำ โคมไฟสีอุ่น สองคนนั่งคุยกัน';
const STREET = 'ถนนเงียบตอนรุ่งสาง แสงแรกของวันส่องมาจากปลายถนน';

export const os6: ChapterContent = {
  id: 'os6',
  titleEn: 'Choosing Myself',
  titleTh: 'ถ้าฉันเลือกตัวเองสักครั้ง',
  estimatedMinutes: [6, 8],
  firstScene: 'os6_s01',
  scenes: [
    {
      id: 'os6_s01',
      background: 'bg_balcony_night',
      ariaLabel: BALCONY,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_balcony_night', rain: 'none', music: 'ambient_night' }),
        N('บางครั้ง การเลือกตัวเอง ไม่ได้แปลว่าไม่เคยรักใคร'),
        N('บางครั้งมันแปลว่า ยอมรับว่าตัวเองเหนื่อยแล้ว'),
        N('{in} เปิดอัลบั้มรูปในโทรศัพท์ เลื่อนย้อนไปถึงวันแรก ๆ'),
        S('อัลบั้ม', 'ทริปทะเลครั้งแรก · วันเกิดปีที่แล้ว · มื้อเช้าที่ไหม้ทั้งจาน'),
        M('in', '(ยังจำได้ทุกวัน และไม่ได้เกลียดวันไหนเลย)'),
        M('in', '(แต่ฉันก็มีสิทธิ์ อยากมีชีวิตที่สงบกว่านี้)'),
        M('in', '(การเลือกตัวเอง ไม่ได้ทำให้ฉันกลายเป็นคนร้ายในเรื่องของใคร)'),
      ],
      next: 'os6_s02',
    },
    {
      id: 'os6_s02',
      background: 'bg_apartment_evening',
      ariaLabel: ROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', rain: 'none', lamp: 'warm', music: 'ambient_home' }),
        N('{out} นั่งรออยู่ในห้อง'),
        D('out', 'ช่วงนี้เหมือนเราห่างกันไปเรื่อย ๆ เลยนะ', 'worried'),
        D('out', 'บอกได้ไหม ว่า{you}ต้องการอะไร', 'sad'),
        M('in', '(…ฉันต้องการอะไรนะ)'),
        {
          type: 'CHOICE',
          id: 'os6_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ฉันอยากให้เราเริ่มใหม่ แต่ต้องเป็นแบบที่ฉันไม่ต้องเจ็บแบบเดิม"',
              setFlags: { os_choose: 'new_rules' },
            },
            {
              id: 'b',
              text: '"ฉันขอเวลาพักสักระยะ เพื่อกลับไปดูแลตัวเอง"',
              setFlags: { os_choose: 'pause' },
            },
            {
              id: 'c',
              text: '"ฉันคิดว่าเราควรเดินคนละทาง"',
              setFlags: { os_choose: 'part' },
            },
            {
              id: 'd',
              text: '"ฉันยังไม่รู้ แต่ฉันจะไม่ลืมตัวเองอีกแล้ว"',
              setFlags: { os_choose: 'not_yet' },
            },
          ],
        },
      ],
      next: [
        { when: is('os_choose', 'new_rules'), to: 'os6_e_new' },
        { when: is('os_choose', 'pause'), to: 'os6_e_pause' },
        { when: is('os_choose', 'part'), to: 'os6_e_part' },
        { to: 'os6_e_open' },
      ],
    },
    {
      id: 'os6_e_new',
      background: 'bg_apartment_evening',
      ariaLabel: ROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', lamp: 'warm' }),
        D('out', 'บอกมาเลยว่า "แบบเดิม" คืออะไร จะฟังให้จบ', 'thinking'),
        N('คืนนั้นสองคนคุยกันนานกว่าทุกครั้ง ไม่ได้มีคำตอบทุกข้อ แต่มีรายการสั้น ๆ ที่เขียนไว้ด้วยกัน'),
        S(
          'โน้ตในโทรศัพท์',
          '1. ถามกันว่าวันนี้เหนื่อยไหม · 2. ขอบคุณเรื่องเล็ก ๆ · 3. โกรธแล้วขอเวลาได้ แต่ต้องกลับมาคุย',
        ),
        M('out', '(ไม่รู้ว่าจะทำได้ดีแค่ไหน แต่อยากลองจริง ๆ)'),
        M('in', '(ครั้งนี้ ฉันเลือกตัวเองด้วย ไม่ใช่แค่เลือกเรา)'),
      ],
      next: 'os6_s03',
    },
    {
      id: 'os6_e_pause',
      background: 'bg_apartment_evening',
      ariaLabel: 'ห้องในอพาร์ตเมนต์ตอนค่ำ กระเป๋าใบเล็กวางอยู่ข้างประตู',
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', lamp: 'warm' }),
        D('out', '…นานแค่ไหน', 'sad'),
        D('in', 'ยังไม่รู้ แต่จะบอกตรง ๆ เมื่อพร้อม'),
        N('{in} จัดกระเป๋าใบเล็ก ไปพักที่บ้านของครอบครัวสักระยะ'),
        M('out', '(กลัวนะ แต่ก็เข้าใจ ถ้ารั้งไว้ตอนนี้ อาจยิ่งห่างกันกว่าเดิม)'),
        M('in', '(ระยะห่างครั้งนี้ ไม่ใช่การหนี แต่คือการได้หายใจ)'),
      ],
      next: 'os6_s03',
    },
    {
      id: 'os6_e_part',
      background: 'bg_apartment_evening',
      ariaLabel: 'ห้องในอพาร์ตเมนต์ตอนค่ำ เงียบไปนาน สองคนนั่งห่างกันเล็กน้อย',
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', lamp: 'warm' }),
        N('ห้องเงียบไปนาน'),
        D('out', '…ขอบคุณที่บอกตรง ๆ นะ', 'sad'),
        M('out', '(เจ็บ แต่ไม่อยากให้ {in} ต้องฝืนอยู่ ทั้งที่เหนื่อยขนาดนี้)'),
        M('in', '(ไม่ได้เกลียด {out} เลย และไม่ได้เสียใจกับวันที่ดี ๆ ด้วย)'),
        N('การจากกันอย่างให้เกียรติ ก็เป็นการดูแลกันได้อีกแบบหนึ่ง'),
      ],
      next: 'os6_s03',
    },
    {
      id: 'os6_e_open',
      background: 'bg_apartment_evening',
      ariaLabel: ROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', lamp: 'warm' }),
        D('out', 'ไม่เป็นไร ไม่ต้องรู้ตอนนี้ก็ได้', 'thinking'),
        M('out', '(อย่างน้อยคืนนี้ {in} ก็พูดออกมา)'),
        M('in', '(ไม่รู้ว่าพรุ่งนี้จะเลือกอะไร แต่รู้แล้วว่าตัวเองก็สำคัญ)'),
      ],
      next: 'os6_s03',
    },
    {
      id: 'os6_s03',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_street_sunrise', rain: 'none', music: 'ending_theme' }),
        N('เช้าวันใหม่'),
        M('in', '(ฉันเคยพยายามเป็นคนที่ดีที่สุดสำหรับใครบางคน)'),
        M('in', '(จนบางครั้งฉันลืมไปว่า ตัวเองก็ต้องการใครสักคนที่ทำให้ฉันรู้สึกว่าฉันมีค่าเหมือนกัน)'),
        SAFE(
          'ถ้าในความสัมพันธ์มีการทำร้าย ข่มขู่ หรือควบคุม การเลือกตัวเองอาจต้องมีคนช่วย — ดูช่องทางขอความช่วยเหลือได้ที่หน้า "เกี่ยวกับ"',
        ),
      ],
      next: 'os6_reflect',
    },
    {
      id: 'os6_reflect',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'narrator',
      lines: [E({ bg: 'bg_street_sunrise', rain: 'none' }), { type: 'REFLECTION' }],
      next: 'os6_end',
    },
    {
      id: 'os6_end',
      background: 'bg_street_sunrise',
      ariaLabel: STREET,
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_street_sunrise', rain: 'none' }),
        N('ทุกเรื่องมีอีกด้านเสมอ'),
        N('การเข้าใจใครสักคน ไม่ได้แปลว่าต้องเห็นด้วยกับทุกอย่างที่เขาทำ'),
        N('แต่คือการยอมให้ความรู้สึกและประสบการณ์ของเขา ได้มีอยู่จริง'),
      ],
      next: null,
    },
  ],
  reflection: [
    {
      id: 'ro6_1',
      self: 'ถ้าคุณเลือกตัวเองสักครั้ง สิ่งแรกที่อยากทำคืออะไร',
      options: [
        { id: 'ro6_1_rest', text: 'พักให้เต็มที่' },
        { id: 'ro6_1_say', text: 'บอกความต้องการของตัวเองตรง ๆ' },
        { id: 'ro6_1_line', text: 'ขีดเส้นในเรื่องที่ไม่โอเค' },
        { id: 'ro6_1_hobby', text: 'กลับไปทำสิ่งที่เคยชอบ' },
        { id: 'ro6_1_help', text: 'ขอความช่วยเหลือจากคนที่ไว้ใจ' },
      ],
      maxSelect: 2,
      freeText: true,
      toNextConversation: true,
    },
    {
      id: 'ro6_2',
      self: '(ไม่บังคับ) ประโยคที่อยากบอกตัวเองในวันนี้',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [SYS('เส้นเรื่อง "อีกด้านของเรื่อง" จบแล้ว'), N('ขอบคุณที่ฟังเรื่องนี้จนจบ')],
  },
};
