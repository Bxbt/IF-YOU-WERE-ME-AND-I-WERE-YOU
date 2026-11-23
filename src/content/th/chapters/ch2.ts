/**
 * Chapter 2 — Walk in My Shoes. Transcribed from docs/02-story-script.md (owner of the script).
 * Part A = the insider's view, Part B = the waiter's view, Part C = the shared timeline.
 * Tokens per docs/02 §0.1; every "เธอ" meaning the partner must be written as {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';

const PW = { scenario: 'priorWarning', eq: true } as const;
const NO_PW = { scenario: 'priorWarning', eq: false } as const;
const SKIPPED = '…ช่วงเวลานี้ คุณข้ามไป';

export const ch2: ChapterContent = {
  id: 'ch2',
  titleEn: 'Walk in My Shoes',
  titleTh: 'ลองเดินในรองเท้าของกันและกัน',
  estimatedMinutes: [12, 15],
  firstScene: 'ch2_s00',
  scenes: [
    {
      id: 'ch2_s00',
      background: 'bg_black',
      ariaLabel: 'จอมืดสนิท มีชื่อบทที่ 2 ปรากฏขึ้นกลางจอ',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_black' } },
        { type: 'SYS', text: 'บทที่ 2 · Walk in My Shoes' },
        { type: 'NARR', text: 'สามสิบนาทีเดียวกัน' },
        { type: 'NARR', text: 'แต่มองจากสองที่' },
        { type: 'SYS', text: 'ตอนนี้คุณจะเล่นเป็น: {in} — คนที่ติดฝนอยู่ข้างล่าง' },
      ],
      next: 'ch2_a1',
    },
    // ---------- Part A — มุมมองคนที่ติดฝนอยู่ข้างล่าง ----------
    {
      id: 'ch2_a1',
      handoffBefore: true,
      background: 'bg_convenience_store',
      ariaLabel: 'ในร้านสะดวกซื้อหน้าตึก ฝนเทลงมาด้านนอกกระจก',
      controller: 'insider',
      lines: [
        { type: 'ENV', set: { bg: 'bg_convenience_store', rain: 'heavy', light: 'normal' } },
        { type: 'NARR', text: 'ห้านาทีแรกผ่านไป ฝนยังไม่มีทีท่าจะซา' },
        { type: 'MONO', speaker: 'in', text: 'ไม่เป็นไร เดี๋ยวฝนก็หยุด' },
        { type: 'MONO', speaker: 'in', text: '{out} คงสงสัยแล้วว่าทำไมยังไม่ขึ้นไป' },
        {
          type: 'SYS',
          title: 'โทรศัพท์',
          text: 'แบตเตอรี่ 1% · มีข้อความใหม่จาก {out} 1 ข้อความ (โหลดไม่ขึ้น)',
        },
        {
          type: 'CHOICE',
          id: 'ch2_ca1',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ติดฝนอยู่ร้านข้างล่าง ไม่เป็นไรนะ ไม่ต้องห่วง"',
              setFlags: { in_msg: 'reassure_other' },
              tag: 'D01:downplay',
              responseLines: [{ type: 'SYS', title: 'โทรศัพท์', text: 'กำลังส่ง…' }],
            },
            {
              id: 'b',
              text: '"ติดฝนอยู่ข้างล่าง แบตจะหมดแล้ว ใจไม่ดีเลย"',
              setFlags: { in_msg: 'honest_fear' },
              tag: 'D01:open',
              responseLines: [{ type: 'SYS', title: 'โทรศัพท์', text: 'กำลังส่ง…' }],
            },
            {
              id: 'c',
              text: '"ลงมารับหน่อยได้ไหม"',
              setFlags: { in_msg: 'help' },
              tag: 'D04:seek',
              responseLines: [{ type: 'SYS', title: 'โทรศัพท์', text: 'กำลังส่ง…' }],
            },
            {
              id: 'd',
              text: 'ยังไม่ส่ง เก็บแบตไว้ก่อน',
              setFlags: { in_msg: 'none' },
              tag: 'D07:self_contained',
              responseLines: [{ type: 'MONO', speaker: 'in', text: 'เดี๋ยวค่อยบอกตอนออกไป' }],
            },
          ],
        },
        {
          type: 'SYS',
          title: 'โทรศัพท์',
          text: 'ข้อความค้างที่ "กำลังส่ง…"',
          when: {
            any: [
              { flag: 'in_msg', eq: 'reassure_other' },
              { flag: 'in_msg', eq: 'honest_fear' },
              { flag: 'in_msg', eq: 'help' },
            ],
          },
        },
        { type: 'SYS', title: 'โทรศัพท์', text: 'แบตเตอรี่ 0% · เครื่องดับ' },
      ],
      next: 'ch2_a2',
    },
    {
      id: 'ch2_a2',
      background: 'bg_convenience_store',
      ariaLabel: 'ฟ้าผ่าสว่างวาบนอกกระจก ไฟในร้านกะพริบ',
      controller: 'insider',
      lines: [
        { type: 'ENV', set: { bg: 'bg_convenience_store', rain: 'heavy', light: 'flicker' } },
        { type: 'NARR', text: 'ฟ้าผ่าดังสนั่น ไฟในร้านกะพริบอยู่ครู่หนึ่ง' },
        { type: 'ENV', set: { light: 'normal' } },
        { type: 'MONO', speaker: 'in', expression: 'scared', text: 'ถ้า {out} คิดว่าเราเป็นอะไรไปล่ะ' },
        { type: 'MONO', speaker: 'in', text: 'ไม่มีทางบอกได้เลยว่าเราอยู่ตรงนี้' },
        { type: 'MONO', speaker: 'in', text: '…อย่าคิด อย่าคิด' },
        {
          type: 'CHOICE',
          id: 'ch2_ca2',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: 'นั่งลงที่ม้านั่งหน้ากระจก กอดเข่าตัวเอง',
              setFlags: { in_cope: 'hold_self' },
              tag: 'D09:withdraw',
              responseLines: [{ type: 'MONO', speaker: 'in', text: 'ขอแค่อยู่นิ่ง ๆ' }],
            },
            {
              id: 'b',
              text: 'ชวนพนักงานในร้านคุยไปเรื่อย ๆ',
              setFlags: { in_cope: 'talk' },
              tag: 'D09:connect',
              responseLines: [
                { type: 'DLG', speaker: 'พนักงานร้าน', text: 'นั่งรอในร้านได้เลยครับ ไม่ต้องรีบ' },
              ],
            },
            {
              id: 'c',
              text: 'นึกถึงวันที่เคยติดฝนด้วยกัน',
              setFlags: { in_cope: 'memories' },
              tag: 'D09:comfort_memory',
              responseLines: [{ type: 'NARR', text: 'วันที่ติดฝนที่ป้ายรถเมล์ แล้วหัวเราะกันจนตัวเปียก' }],
            },
            {
              id: 'd',
              text: 'นับลมหายใจ เข้าสี่ ค้างสี่ ออกสี่',
              setFlags: { in_cope: 'breathe' },
              tag: 'D09:self_regulate',
              responseLines: [{ type: 'MONO', speaker: 'in', text: 'หายใจช้าลงหน่อยแล้ว' }],
            },
          ],
        },
      ],
      next: 'ch2_a3',
    },
    {
      id: 'ch2_a3',
      background: 'bg_convenience_store',
      ariaLabel: 'ในร้านสะดวกซื้อ พนักงานยื่นสายชาร์จมาให้',
      controller: 'insider',
      lines: [
        {
          type: 'ENV',
          set: { bg: 'bg_convenience_store', rain: 'medium', light: 'normal' },
        },
        { type: 'NARR', text: 'พนักงานยื่นสายชาร์จมาให้' },
        { type: 'DLG', speaker: 'พนักงานร้าน', text: 'เสียบชาร์จตรงนี้ได้เลยครับ อีกสักพักเครื่องก็ติด' },
        { type: 'MONO', speaker: 'in', text: 'อีกนิดเดียว' },
        { type: 'MONO', speaker: 'in', text: 'พอกลับไปถึงห้อง สิ่งแรกที่อยากได้คือ…' },
        {
          type: 'CHOICE',
          id: 'ch2_ca3',
          owner: 'insider',
          options: [
            { id: 'a', text: 'อ้อมกอด', setFlags: { in_need: 'hug' }, tag: 'D05:physical' },
            {
              id: 'b',
              text: 'ใครสักคนที่ฟังว่าเมื่อกี้มันใจไม่ดีแค่ไหน',
              setFlags: { in_need: 'listen' },
              tag: 'D05:listen',
            },
            {
              id: 'c',
              text: 'ผ้าเช็ดตัวแห้ง ๆ กับความเงียบสักพัก',
              setFlags: { in_need: 'space' },
              tag: 'D07:space',
            },
            {
              id: 'd',
              text: 'ได้ยินใครพูดว่า "ไม่เป็นไรแล้วนะ"',
              setFlags: { in_need: 'reassure' },
              tag: 'D04:verbal',
            },
          ],
        },
        { type: 'ENV', set: { rain: 'light', sfx: 'phone_buzz' } },
        { type: 'NARR', text: 'ฝนเริ่มซาลง หน้าจอโทรศัพท์สว่างขึ้นอีกครั้ง' },
      ],
      next: 'ch2_b1',
    },
    // ---------- Part B — มุมมองคนที่รอ ----------
    {
      id: 'ch2_b1',
      handoffBefore: true,
      background: 'bg_apartment_kitchen',
      ariaLabel: 'ครัวในห้องชั้นแปด ฝนตกหนักนอกหน้าต่าง',
      controller: 'waiter',
      lines: [
        { type: 'ENV', set: { bg: 'bg_apartment_kitchen', rain: 'heavy' } },
        { type: 'SYS', text: 'ตอนนี้คุณจะเล่นเป็น: {out} — คนที่รออยู่ในห้อง' },
        { type: 'SYS', text: 'ย้อนกลับไปที่ T+5 นาที' },
        { type: 'MONO', speaker: 'out', text: 'คงหลบฝนอยู่ในร้านแหละ… มั้ง' },
        { type: 'MONO', speaker: 'out', expression: 'worried', text: 'แต่ถ้าใช่ ทำไมโทรไม่ติด' },
        { type: 'SYS', title: 'โทรศัพท์', text: 'โทรหา {in} — ไม่สามารถติดต่อได้' },
        {
          type: 'CHOICE',
          id: 'ch2_cb1',
          owner: 'waiter',
          options: [
            {
              id: 'a',
              text: 'รีบลงไปดูที่ล็อบบี้',
              setFlags: { out_act: 'go' },
              tag: 'D09:act',
              responseLines: [{ type: 'NARR', text: 'ลงมาถึงล็อบบี้ ข้างนอกมีแต่ม่านฝน' }],
            },
            {
              id: 'b',
              text: 'โทรหายามหน้าตึก',
              setFlags: { out_act: 'call_office' },
              tag: 'D06:solve',
              responseLines: [
                {
                  type: 'DLG',
                  speaker: 'ยามหน้าตึก (โทรศัพท์)',
                  text: 'เห็นเดินไปทางร้านสะดวกซื้อครับ ฝนหนักมาก ยังไม่เห็นกลับเลยครับ',
                },
              ],
            },
            {
              id: 'c',
              text: 'โทรหา {in} ซ้ำอีกหลาย ๆ ครั้ง',
              setFlags: { out_act: 'keep_calling' },
              tag: 'D04:seek',
              responseLines: [{ type: 'SYS', title: 'โทรศัพท์', text: 'ไม่สามารถติดต่อได้ (x3)' }],
            },
            {
              id: 'd',
              text: 'บอกตัวเองให้ใจเย็น รอข่าวอีกนิด',
              setFlags: { out_act: 'wait' },
              tag: 'D09:self_regulate',
              responseLines: [
                { type: 'MONO', speaker: 'out', text: 'ห้านาที… รออีกห้านาที' },
                { type: 'NARR', text: 'แต่นั่งได้ไม่ถึงนาที ก็ลุกลงไปที่ล็อบบี้' },
              ],
            },
          ],
        },
      ],
      next: 'ch2_b2',
    },
    {
      id: 'ch2_b2',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง ประตูกระจกปิดอยู่ ข้างนอกฝนตกหนัก ยามยืนอยู่ข้างประตู',
      controller: 'waiter',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', door: 'closed', rain: 'heavy' } },
        {
          type: 'DLG',
          speaker: 'ยาม',
          text: 'ร้านสะดวกซื้อหน้าตึกโทรมาบอกครับ มีคนชื่อ {in} ติดฝนอยู่ที่นั่น',
        },
        {
          type: 'SYS',
          title: 'โทรศัพท์',
          text: 'ข้อความจาก {in} (ส่งเมื่อ 10 นาทีก่อน): "ติดฝนอยู่ร้านข้างล่าง ไม่เป็นไรนะ ไม่ต้องห่วง"',
          when: { flag: 'in_msg', eq: 'reassure_other' },
        },
        {
          type: 'MONO',
          speaker: 'out',
          text: 'ไม่เป็นไรได้ยังไง…',
          when: { flag: 'in_msg', eq: 'reassure_other' },
        },
        {
          type: 'SYS',
          title: 'โทรศัพท์',
          text: 'ข้อความจาก {in} (ส่งเมื่อ 10 นาทีก่อน): "ติดฝนอยู่ข้างล่าง แบตจะหมดแล้ว ใจไม่ดีเลย"',
          when: { flag: 'in_msg', eq: 'honest_fear' },
        },
        {
          type: 'MONO',
          speaker: 'out',
          expression: 'sad',
          text: 'สิบนาทีแล้ว… ตอนนั้นไม่ได้อยู่ข้าง ๆ เลย',
          when: { flag: 'in_msg', eq: 'honest_fear' },
        },
        {
          type: 'SYS',
          title: 'โทรศัพท์',
          text: 'ข้อความจาก {in} (ส่งเมื่อ 10 นาทีก่อน): "ลงมารับหน่อยได้ไหม"',
          when: { flag: 'in_msg', eq: 'help' },
        },
        {
          type: 'MONO',
          speaker: 'out',
          expression: 'scared',
          text: '(มือเย็นเฉียบ)',
          when: { flag: 'in_msg', eq: 'help' },
        },
        {
          type: 'MONO',
          speaker: 'out',
          text: 'ไม่มีข้อความอะไรเลย ไม่มีอะไรเลย',
          when: { flag: 'in_msg', eq: 'none' },
        },
        // Fallback when Part A was skipped (docs/02 appendix B: neutral, never randomised).
        {
          type: 'MONO',
          speaker: 'out',
          text: '(ก้มมองโทรศัพท์ในมืออีกครั้ง)',
          when: { flag: 'in_msg', unset: true },
        },
        { type: 'MONO', speaker: 'out', text: 'บอกแล้วแท้ ๆ ว่าเอาสายชาร์จไปด้วย…', when: PW },
        { type: 'MONO', speaker: 'out', text: '…ไม่ใช่เวลาจะมาคิดแบบนี้', when: PW },
        { type: 'MONO', speaker: 'out', text: 'ทำไมต้องเป็นวันนี้ ทำไมต้องเป็น {in}', when: NO_PW },
        {
          type: 'CHOICE',
          id: 'ch2_cb2',
          owner: 'waiter',
          options: [
            {
              id: 'a',
              text: 'ขอเบอร์ร้านจากยาม แล้วโทรไปคุยกับ {in}',
              setFlags: { out_feel: 'reach' },
              tag: 'D02:reach_out',
              responseLines: [
                { type: 'DLG', speaker: 'out', text: '{in} ได้ยินไหม รออยู่ที่ล็อบบี้นะ' },
                { type: 'DLG', speaker: 'in', text: '(เสียงแผ่ว) …อืม' },
              ],
            },
            {
              id: 'b',
              text: 'เดินไปเดินมา กำโทรศัพท์แน่น',
              setFlags: { out_feel: 'pace' },
              tag: 'D09:restless',
              responseLines: [{ type: 'NARR', text: 'นับจำนวนก้าวไม่ถ้วน' }],
            },
            {
              id: 'c',
              text: 'พิมพ์ข้อความยาว ๆ แล้วลบทิ้ง',
              setFlags: { out_feel: 'unsent' },
              tag: 'D01:hold_back',
              responseLines: [
                {
                  type: 'SYS',
                  title: 'ข้อความที่ถูกลบ',
                  text: 'ทำไมไม่ฟัง… ไม่สิ ขอแค่กลับมาปลอดภัย',
                },
              ],
            },
            {
              id: 'd',
              text: 'ถามยามซ้ำ ๆ ว่าฝนจะหยุดเมื่อไหร่',
              setFlags: { out_feel: 'control' },
              tag: 'D06:solve',
              responseLines: [{ type: 'DLG', speaker: 'ยาม', text: 'เริ่มซาแล้วครับ อีกไม่นานแล้ว' }],
            },
          ],
        },
      ],
      next: 'ch2_b3',
    },
    {
      id: 'ch2_b3',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง ฝนเริ่มซา ประตูกระจกเปิดแง้ม',
      controller: 'waiter',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', door: 'ajar', rain: 'light' } },
        { type: 'MONO', speaker: 'out', text: 'เดี๋ยวก็จะได้เจอหน้าแล้ว' },
        { type: 'MONO', speaker: 'out', expression: 'thinking', text: 'จะพูดว่าอะไรดี' },
        {
          type: 'CHOICE',
          id: 'ch2_cb3',
          owner: 'waiter',
          options: [
            {
              id: 'a',
              text: 'ว่าเรากลัวมากแค่ไหน',
              setFlags: { out_need: 'express_fear' },
              tag: 'D01:open',
            },
            {
              id: 'b',
              text: 'ว่าเราอยู่ตรงนี้ ไม่ได้ไปไหน',
              setFlags: { out_need: 'presence' },
              tag: 'D08:presence',
            },
            {
              id: 'c',
              text: 'ว่าทำไมไม่ระวังกว่านี้',
              setFlags: { out_need: 'frustration' },
              tag: 'D03:confront',
            },
            {
              id: 'd',
              text: 'ว่าเราขอบคุณมากที่ปลอดภัย',
              setFlags: { out_need: 'relief' },
              tag: 'D12:gratitude',
            },
          ],
        },
      ],
      next: 'ch2_timeline',
    },
    // ---------- Part C — เส้นเวลาคู่ ----------
    {
      id: 'ch2_timeline',
      background: 'bg_convenience_store',
      ariaLabel: 'ภาพแบ่งสองฝั่ง ซ้ายคือร้านสะดวกซื้อหน้าตึก ขวาคือล็อบบี้ชั้นล่าง',
      controller: 'narrator',
      lines: [
        {
          type: 'ENV',
          set: { split: ['bg_convenience_store', 'bg_building_entrance'], rain: 'medium', light: 'normal' },
        },
        {
          type: 'TIMELINE',
          rows: [
            { label: 'T+5', in: '{in_msg_text}', out: '{out_act_text}' },
            { label: 'T+15', in: '{in_cope_text}', out: '{out_feel_text}' },
            { label: 'T+25', in: '{in_need_text}', out: '{out_need_text}' },
          ],
        },
        {
          type: 'NARR',
          text: 'ในนาทีเดียวกัน {in} กำลัง{in_cope_text}',
          when: {
            all: [
              { flag: 'in_cope', set: true },
              { flag: 'out_feel', set: true },
            ],
          },
        },
        {
          type: 'NARR',
          text: 'ส่วน {out} กำลัง{out_feel_text}',
          when: {
            all: [
              { flag: 'in_cope', set: true },
              { flag: 'out_feel', set: true },
            ],
          },
        },
        { type: 'NARR', text: 'ทั้งคู่ต่างพยายามอย่างดีที่สุด ในแบบที่ตัวเองรู้จัก' },
      ],
      next: 'ch2_cards',
    },
    {
      id: 'ch2_cards',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง ประตูกระจกเปิดแง้มอยู่',
      controller: 'narrator',
      lines: [
        {
          type: 'ENV',
          set: { split: null, bg: 'bg_building_entrance', door: 'ajar', light: 'normal', rain: 'light' },
        },
        { type: 'EMOTION_CARDS' },
      ],
      next: 'ch2_reflect',
    },
    {
      id: 'ch2_reflect',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง ประตูกระจกเปิดแง้มอยู่',
      controller: 'narrator',
      lines: [{ type: 'ENV', set: { bg: 'bg_building_entrance', door: 'ajar' } }, { type: 'REFLECTION' }],
      next: 'ch2_end',
    },
    {
      id: 'ch2_end',
      background: 'bg_building_entrance',
      ariaLabel: 'ประตูกระจกหน้าตึกเปิดออก มีคนก้าวเข้ามาตัวเปียก',
      controller: 'narrator',
      lines: [
        {
          type: 'ENV',
          set: { split: null, bg: 'bg_building_entrance', door: 'open', light: 'normal', rain: 'light' },
        },
        { type: 'NARR', text: 'ประตูกระจกเปิดออก' },
        { type: 'NARR', text: '{in} ก้าวเข้ามา ตัวเปียกปอนหลังครึ่งชั่วโมงที่ยาวที่สุดของคืนนี้' },
      ],
      next: null,
    },
  ],
  fragments: {
    in_msg_text: {
      flag: 'in_msg',
      values: {
        reassure_other: 'บอกว่าไม่เป็นไร ทั้งที่กลัว',
        honest_fear: 'บอกตรง ๆ ว่ากลัว',
        help: 'ขอความช่วยเหลือ',
        none: 'เก็บแบตไว้ และยังไม่บอกอะไร',
      },
      fallback: SKIPPED,
    },
    out_act_text: {
      flag: 'out_act',
      values: {
        go: 'รีบลงไปดูที่ล็อบบี้',
        call_office: 'โทรหายามหน้าตึก',
        keep_calling: 'โทรหาซ้ำแล้วซ้ำอีก',
        wait: 'พยายามนั่งรอ แต่ทนได้ไม่ถึงนาที',
      },
      fallback: SKIPPED,
    },
    in_cope_text: {
      flag: 'in_cope',
      values: {
        hold_self: 'นั่งกอดเข่าอยู่บนม้านั่งหน้ากระจก',
        talk: 'ชวนพนักงานในร้านคุย เพื่อให้รู้ว่ายังไม่ได้อยู่คนเดียว',
        memories: 'นึกถึงวันที่เคยติดฝนกับ {out}',
        breathe: 'นับลมหายใจ ทีละสี่จังหวะ',
      },
      fallback: SKIPPED,
    },
    out_feel_text: {
      flag: 'out_feel',
      values: {
        reach: 'โทรไปคุยผ่านเบอร์ของร้าน',
        pace: 'เดินวนอยู่หน้าประตูกระจก',
        unsent: 'พิมพ์ข้อความยาว ๆ แล้วลบทิ้ง',
        control: 'ถามยามครั้งแล้วครั้งเล่าว่าฝนจะหยุดเมื่อไหร่',
      },
      fallback: SKIPPED,
    },
    in_need_text: {
      flag: 'in_need',
      values: {
        hug: 'อ้อมกอด',
        listen: 'คนที่ฟัง',
        space: 'ความเงียบ',
        reassure: 'คำว่าไม่เป็นไรแล้ว',
      },
      fallback: SKIPPED,
    },
    out_need_text: {
      flag: 'out_need',
      values: {
        express_fear: 'บอกว่ากลัวแค่ไหน',
        presence: 'บอกว่าอยู่ตรงนี้',
        frustration: 'ถามว่าทำไมไม่ระวัง',
        relief: 'บอกว่าขอบคุณที่ปลอดภัย',
      },
      fallback: SKIPPED,
    },
  },
  emotionCards: {
    groups: [
      {
        role: 'insider',
        period: 'T+5',
        cards: [
          { id: 'ec2_in_t5_no_worry', text: 'ไม่อยากให้ใครห่วง' },
          { id: 'ec2_in_t5_in_control', text: 'ยังพอคุมได้' },
          { id: 'ec2_in_t5_worried', text: 'เริ่มกังวล' },
        ],
      },
      {
        role: 'waiter',
        period: 'T+5',
        cards: [
          { id: 'ec2_out_t5_hesitant', text: 'ลังเล' },
          { id: 'ec2_out_t5_no_panic', text: 'ไม่อยากตื่นตูม' },
          { id: 'ec2_out_t5_uneasy', text: 'ใจไม่ดี' },
        ],
      },
      {
        role: 'insider',
        period: 'T+15',
        cards: [
          { id: 'ec2_in_t15_fear', text: 'กลัว' },
          { id: 'ec2_in_t15_lonely', text: 'โดดเดี่ยว' },
          { id: 'ec2_in_t15_miss_loved', text: 'คิดถึงคนที่รัก' },
        ],
      },
      {
        role: 'waiter',
        period: 'T+15',
        cards: [
          { id: 'ec2_out_t15_fear_loss', text: 'กลัวจะเสียไป' },
          { id: 'ec2_out_t15_angry_situation', text: 'โกรธสถานการณ์' },
          { id: 'ec2_out_t15_self_blame', text: 'โทษตัวเอง' },
          { id: 'ec2_out_t15_helpless', text: 'ช่วยอะไรไม่ได้' },
        ],
      },
      {
        role: 'insider',
        period: 'T+25',
        cards: [
          { id: 'ec2_in_t25_relieved_shaky', text: 'โล่งแต่ยังสั่น' },
          { id: 'ec2_in_t25_want_comfort', text: 'อยากได้การปลอบ' },
          { id: 'ec2_in_t25_want_quiet', text: 'อยากอยู่เงียบ ๆ' },
        ],
      },
      {
        role: 'waiter',
        period: 'T+25',
        cards: [
          { id: 'ec2_out_t25_relieved', text: 'โล่ง' },
          { id: 'ec2_out_t25_overflow', text: 'ความรู้สึกที่อัดไว้กำลังจะล้นออกมา' },
        ],
      },
    ],
  },
  reflection: [
    {
      id: 'r2_1',
      self: 'ช่วงไหนในบทนี้ที่ทำให้คุณเข้าใจอีกฝั่งมากขึ้น',
      options: [
        { id: 'r2_1_in_t5', text: 'T+5 คนที่ติดฝน' },
        { id: 'r2_1_in_t15', text: 'T+15 คนที่ติดฝน' },
        { id: 'r2_1_in_t25', text: 'T+25 คนที่ติดฝน' },
        { id: 'r2_1_out_t5', text: 'T+5 คนที่รอ' },
        { id: 'r2_1_out_t15', text: 'T+15 คนที่รอ' },
        { id: 'r2_1_out_t25', text: 'T+25 คนที่รอ' },
        { id: 'r2_1_not_yet', text: 'ยังไม่รู้สึกแบบนั้น' },
      ],
      maxSelect: 1,
      freeText: false,
    },
    {
      id: 'r2_2',
      self: 'มีอะไรที่คุณไม่เคยคิดมาก่อนว่าอีกฝั่งอาจกำลังเจอ',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
    {
      id: 'r2_3',
      self: 'ถ้าเป็นคุณจริง ๆ ข้อความแรกที่จะส่งหาคนที่คุณรักตอนติดอยู่คืออะไร',
      options: [
        { id: 'r2_3_reassure_other', text: '"ติดฝนอยู่ร้านข้างล่าง ไม่เป็นไรนะ ไม่ต้องห่วง"' },
        { id: 'r2_3_honest_fear', text: '"ติดฝนอยู่ข้างล่าง แบตจะหมดแล้ว ใจไม่ดีเลย"' },
        { id: 'r2_3_help', text: '"ลงมารับหน่อยได้ไหม"' },
        { id: 'r2_3_none', text: 'ยังไม่ส่ง เก็บแบตไว้ก่อน' },
      ],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [
      { type: 'NARR', text: 'ประตูเปิดแล้ว' },
      { type: 'NARR', text: 'แต่บางอย่างในใจ ยังไม่ได้เปิดออก' },
    ],
    nextChapter: 'ch3',
  },
};
