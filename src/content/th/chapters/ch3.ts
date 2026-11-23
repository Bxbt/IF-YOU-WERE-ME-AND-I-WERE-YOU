/**
 * Chapter 3 — What I Couldn't Say. Transcribed from docs/02-story-script.md (owner of the script).
 * Uses Ch2 flags (in_need); every scene has a neutral line when an earlier flag is unset (appendix B).
 * Tokens per docs/02 §0.1; every "เธอ" meaning the partner must be written as {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent, Condition } from '../../types';

const PW = { scenario: 'priorWarning', eq: true } as const;
const NO_PW = { scenario: 'priorWarning', eq: false } as const;
const FIRST = (eq: string): Condition => ({ flag: 'out_first_words', eq });
const NEED = (eq: string): Condition => ({ flag: 'in_need', eq });

export const EMO_SET = [
  { id: 'w3e_fear', text: 'กลัว' },
  { id: 'w3e_relief', text: 'โล่งใจ' },
  { id: 'w3e_angry', text: 'โกรธ' },
  { id: 'w3e_hurt', text: 'น้อยใจ' },
  { id: 'w3e_guilty', text: 'รู้สึกผิด' },
  { id: 'w3e_tired', text: 'เหนื่อย' },
  { id: 'w3e_overwhelmed', text: 'ท่วมท้น' },
  { id: 'w3e_embarrassed', text: 'อาย' },
  { id: 'w3e_love', text: 'รัก/ห่วง' },
  { id: 'w3e_unclear', text: 'ไม่รู้สึกอะไรชัดเจน', exclusive: true },
];

export const NEED_SET = [
  { id: 'w3n_hug', text: 'อ้อมกอด' },
  { id: 'w3n_listen', text: 'ให้ฟัง' },
  { id: 'w3n_space', text: 'พื้นที่/เวลา' },
  { id: 'w3n_comfort', text: 'คำปลอบใจ' },
  { id: 'w3n_thanks', text: 'คำขอบคุณ' },
  { id: 'w3n_see_care', text: 'ให้เข้าใจว่าฉันห่วง' },
  { id: 'w3n_see_fear', text: 'ให้ยอมรับว่าฉันกลัว' },
  { id: 'w3n_nothing', text: 'ไม่ต้องการอะไร', exclusive: true },
];

export const ch3: ChapterContent = {
  id: 'ch3',
  titleEn: "What I Couldn't Say",
  titleTh: 'สิ่งที่พูดไม่ออก',
  estimatedMinutes: [10, 12],
  firstScene: 'ch3_s01',
  scenes: [
    {
      id: 'ch3_s01',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง ไฟสีขาวเย็น ประตูกระจกเปิดอยู่ ฝนซาลงแล้ว',
      controller: 'narrator',
      lines: [
        // docs/02: "light: white_cold" → normal light.
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open', music: 'none' } },
        { type: 'NARR', text: '{in} ก้าวเข้ามาทางประตูกระจก ตัวเปียกครึ่งตัว มือยังเย็นเฉียบ' },
        { type: 'NARR', text: '{out} ยืนอยู่ตรงนั้น ห่างไปสามก้าว' },
      ],
      next: 'ch3_c01',
    },
    {
      id: 'ch3_c01',
      background: 'bg_building_entrance',
      ariaLabel: 'สองคนยืนห่างกันสามก้าวในล็อบบี้ชั้นล่าง',
      controller: 'waiter',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        { type: 'NARR', text: 'ช่วงเวลาเงียบ ๆ ที่ยาวกว่าที่ควร' },
        {
          type: 'CHOICE',
          id: 'ch3_c01',
          owner: 'waiter',
          options: [
            {
              id: 'a',
              text: '"โล่งใจมากที่ปลอดภัยนะ"',
              setFlags: { out_first_words: 'relief' },
              tag: 'D01:open',
            },
            {
              id: 'b',
              text: '"กลัวมากเลยรู้ไหม"',
              setFlags: { out_first_words: 'fear' },
              tag: 'D01:open',
            },
            {
              id: 'c',
              text: '"ทำไมไม่ฟังกันเลย"',
              textByCondition: [{ when: NO_PW, text: '"ทำไมไม่ระวังเลย"' }],
              setFlags: { out_first_words: 'blame' },
              tag: 'D03:confront',
            },
            {
              id: 'd',
              text: '"ขอกอดได้ไหม"',
              setFlags: { out_first_words: 'ask_hug' },
              tag: 'D08:physical_consent',
            },
            {
              id: 'e',
              text: 'เดินเข้าไปยืนข้าง ๆ เงียบ ๆ',
              setFlags: { out_first_words: 'silent' },
              tag: 'D08:presence',
            },
          ],
        },
      ],
      next: 'ch3_s02',
    },
    {
      id: 'ch3_s02',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง สองคนยืนเผชิญหน้ากัน',
      controller: 'insider',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        {
          type: 'SAFETY_NOTE',
          text: 'ความกังวลเป็นสิ่งที่เข้าใจได้ — แต่ไม่ได้แปลว่าคำพูดที่ทำให้อีกคนเจ็บเป็นเรื่องที่ไม่เป็นไร ทั้งสองอย่างจริงได้พร้อมกัน',
          when: FIRST('blame'),
        },
        {
          type: 'MONO',
          speaker: 'in',
          expression: 'sad',
          text: '(อยากร้องไห้ขึ้นมาเฉย ๆ)',
          when: FIRST('relief'),
        },
        {
          type: 'MONO',
          speaker: 'in',
          text: 'ฉันก็กลัว… แต่ตอนนี้ต้องปลอบอีกคนก่อนเหรอ',
          when: FIRST('fear'),
        },
        {
          type: 'MONO',
          speaker: 'in',
          text: 'อยากให้มีใครฟังฉันก่อนสักนิด',
          when: { all: [FIRST('fear'), NEED('listen')] },
        },
        {
          type: 'MONO',
          speaker: 'in',
          expression: 'sad',
          text: 'เพิ่งออกมาจากตรงนั้นแท้ ๆ… ทำไมคำแรกเป็นแบบนี้',
          when: FIRST('blame'),
        },
        {
          type: 'MONO',
          speaker: 'out',
          text: 'ไม่ได้อยากพูดแบบนี้เลย มันหลุดออกไปเอง',
          when: FIRST('blame'),
        },
        {
          type: 'MONO',
          speaker: 'in',
          expression: 'relieved',
          text: '(ใช่ ขอแค่นี้แหละ)',
          when: { all: [FIRST('ask_hug'), NEED('hug')] },
        },
        {
          type: 'MONO',
          speaker: 'in',
          text: '(ขอหายใจก่อนได้ไหม)',
          when: { all: [FIRST('ask_hug'), NEED('space')] },
        },
        {
          type: 'MONO',
          speaker: 'in',
          text: '(ยังไม่แน่ใจว่าตอนนี้อยากให้ใครแตะตัว)',
          when: {
            all: [
              FIRST('ask_hug'),
              { any: [NEED('listen'), NEED('reassure'), { flag: 'in_need', unset: true }] },
            ],
          },
        },
        {
          type: 'MONO',
          speaker: 'in',
          expression: 'worried',
          text: 'ไม่พูดอะไรเลย… โกรธอยู่หรือเปล่า',
          when: FIRST('silent'),
        },
        {
          type: 'MONO',
          speaker: 'out',
          text: 'ไม่รู้จะเริ่มยังไง กลัวพูดผิด',
          when: FIRST('silent'),
        },
        // Fallback when ch3_c01 was skipped (appendix B: neutral, never randomised).
        {
          type: 'NARR',
          text: '{in} กับ {out} ยืนมองหน้ากันอยู่ครู่หนึ่ง',
          when: { flag: 'out_first_words', unset: true },
        },
      ],
      next: 'ch3_c02',
    },
    {
      id: 'ch3_c02',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่าง ทางขึ้นบันไดอยู่ไม่ไกล',
      controller: 'insider',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        {
          type: 'CHOICE',
          id: 'ch3_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ขอโทษนะ"',
              setFlags: { in_resp: 'apologize' },
              tag: 'D10:repair_first',
              responseLines: [
                {
                  type: 'SAFETY_NOTE',
                  text: 'การขอโทษเป็นทางเลือก ไม่ใช่สิ่งที่ต้องทำเพื่อให้เรื่องจบ',
                  when: { flag: 'in_resp', eq: 'apologize' },
                },
                { type: 'DLG', speaker: 'out', text: '…ไม่ต้องขอโทษหรอก' },
              ],
            },
            {
              id: 'b',
              text: '"ตอนนี้ยังไม่อยากคุยเรื่องนั้นนะ"',
              setFlags: { in_resp: 'boundary' },
              tag: 'D11:state_limit',
              responseLines: [
                {
                  type: 'SAFETY_NOTE',
                  text: 'การขอเวลาไม่ใช่การปฏิเสธ',
                  when: { flag: 'in_resp', eq: 'boundary' },
                },
                { type: 'DLG', speaker: 'out', text: 'อืม ได้ ไว้ค่อยคุย' },
              ],
            },
            {
              id: 'c',
              text: '"ฉันก็กลัวเหมือนกัน"',
              setFlags: { in_resp: 'share_fear' },
              tag: 'D01:open',
              responseLines: [{ type: 'DLG', speaker: 'out', text: '(นิ่งไปครู่หนึ่ง) …มานั่งก่อนไหม' }],
            },
            {
              id: 'd',
              text: 'เงียบ แล้วเดินนำไปทางบันได',
              setFlags: { in_resp: 'withdraw' },
              tag: 'D07:space',
              responseLines: [{ type: 'NARR', text: '{out} เดินตามหลังไปห่าง ๆ' }],
            },
            {
              id: 'f',
              text: '"ที่พูดแบบนั้น ทำให้เจ็บนะ"',
              setFlags: { in_resp: 'hurt' },
              tag: 'D11:state_limit',
              responseLines: [
                { type: 'DLG', speaker: 'out', expression: 'sad', text: '(นิ่งไป) …ไม่ได้ตั้งใจให้เจ็บ' },
                { type: 'NARR', text: 'ทั้งคู่ยืนเงียบอยู่ครู่หนึ่ง' },
              ],
            },
            {
              id: 'e_yes',
              text: '"ได้"',
              when: FIRST('ask_hug'),
              setFlags: { in_resp: 'hug_yes' },
              tag: 'D05:physical',
              responseLines: [{ type: 'NARR', text: 'สองคนกอดกันกลางล็อบบี้ ยามมองไปทางอื่น' }],
            },
            {
              id: 'e_later',
              text: '"ขอแป๊บนึงก่อนนะ"',
              when: FIRST('ask_hug'),
              setFlags: { in_resp: 'hug_later' },
              tag: 'D07:space',
              responseLines: [
                { type: 'DLG', speaker: 'out', text: 'ได้สิ ไม่เป็นไร' },
                { type: 'NARR', text: '{out} ยืนอยู่ข้าง ๆ โดยไม่แตะตัว' },
              ],
            },
          ],
        },
      ],
      next: 'ch3_s04',
    },
    {
      id: 'ch3_s04',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่างที่เงียบลง',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        { type: 'INTERPRETATION' },
      ],
      next: 'ch3_s05',
    },
    {
      id: 'ch3_s05',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่างที่เงียบลง',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        { type: 'SYS', text: 'ตอนนั้นที่ล็อบบี้…' },
        { type: 'MIRROR', questionId: 'w3_1' },
        { type: 'MIRROR', questionId: 'w3_2' },
      ],
      next: 'ch3_s06',
    },
    {
      id: 'ch3_s06',
      background: 'bg_building_entrance',
      ariaLabel: 'ภาพย้อนกลับไปที่ล็อบบี้ชั้นล่าง ตอนที่สองคนเพิ่งเจอหน้ากัน',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        {
          type: 'CHOICE',
          id: 'ch3_s06_out',
          owner: 'waiter',
          options: [
            { id: 'glad', text: '"ดีใจมากที่ยังอยู่ตรงนี้"', setFlags: { rewrite_out: 'glad' } },
            { id: 'scared', text: '"กลัวจนพูดไม่ถูกเลย"', setFlags: { rewrite_out: 'scared' } },
            { id: 'rest', text: '"นั่งพักก่อนนะ แล้วค่อยคุยกัน"', setFlags: { rewrite_out: 'rest' } },
            { id: 'ask_hug', text: '"ขอกอดได้ไหม"', setFlags: { rewrite_out: 'ask_hug' } },
            { id: 'unchanged', text: 'ไม่เปลี่ยน', setFlags: { rewrite_out: 'unchanged' } },
          ],
          custom: { setFlags: { rewrite_out: 'custom' }, storyItem: 'rewrite_out', maxLength: 140 },
        },
        {
          type: 'CHOICE',
          id: 'ch3_s06_in',
          owner: 'insider',
          options: [
            { id: 'thanks', text: '"ขอบคุณที่รออยู่ตรงนี้"', setFlags: { rewrite_in: 'thanks' } },
            {
              id: 'listen_first',
              text: '"ฉันกลัวมาก ขอให้ฟังก่อนได้ไหม"',
              setFlags: { rewrite_in: 'listen_first' },
            },
            { id: 'need_time', text: '"ขอเวลาแป๊บนึงนะ"', setFlags: { rewrite_in: 'need_time' } },
            { id: 'know_care', text: '"ฉันรู้ว่า{you}ห่วง"', setFlags: { rewrite_in: 'know_care' } },
            { id: 'unchanged', text: 'ไม่เปลี่ยน', setFlags: { rewrite_in: 'unchanged' } },
          ],
          custom: { setFlags: { rewrite_in: 'custom' }, storyItem: 'rewrite_in', maxLength: 140 },
        },
        {
          type: 'NARR',
          text: 'ลองฟังอีกครั้ง…',
          when: {
            any: [
              { flag: 'rewrite_out', set: true },
              { flag: 'rewrite_in', set: true },
            ],
          },
        },
        {
          type: 'DLG',
          speaker: 'out',
          text: '{rewrite_out}',
          when: { flag: 'rewrite_out', set: true },
        },
        {
          type: 'DLG',
          speaker: 'in',
          text: '{rewrite_in}',
          when: { flag: 'rewrite_in', set: true },
        },
        { type: 'NARR', text: 'ไม่มีประโยคไหนถูกที่สุด แค่ลองดูว่ามันรู้สึกต่างไปไหม' },
      ],
      next: 'ch3_reflect',
    },
    {
      id: 'ch3_reflect',
      background: 'bg_building_entrance',
      ariaLabel: 'ล็อบบี้ชั้นล่างที่เงียบลง',
      controller: 'narrator',
      lines: [
        { type: 'ENV', set: { bg: 'bg_building_entrance', light: 'normal', door: 'open' } },
        { type: 'REFLECTION' },
      ],
      next: 'ch3_end',
    },
    {
      id: 'ch3_end',
      background: 'bg_stairwell',
      ariaLabel: 'บันไดหนีไฟที่มีแสงไฟสีอุ่นสลัว ๆ',
      controller: 'narrator',
      lines: [
        // docs/02: "light: dim_warm" → warm lamp.
        { type: 'ENV', set: { bg: 'bg_stairwell', lamp: 'warm', light: 'normal' } },
        {
          type: 'NARR',
          text: 'สองคนเดินขึ้นบันไดไปด้วยกัน ไม่มีใครพูดอะไรมาก',
          when: {
            any: [
              { flag: 'in_resp', eq: 'hug_yes' },
              { flag: 'in_resp', eq: 'share_fear' },
              { flag: 'in_resp', eq: 'apologize' },
              { flag: 'in_resp', eq: 'boundary' },
              { flag: 'in_resp', eq: 'hug_later' },
              { flag: 'in_resp', eq: 'hurt' },
              // ch3_c02 skipped → the neutral line (appendix B).
              { flag: 'in_resp', unset: true },
            ],
          },
        },
        {
          type: 'NARR',
          text: 'สองคนเดินขึ้นบันได ห่างกันหนึ่งขั้น',
          when: { flag: 'in_resp', eq: 'withdraw' },
        },
        { type: 'NARR', text: 'คืนนั้น ข้าวผัดเย็นชืดไปแล้ว' },
        { type: 'NARR', text: 'และทั้งคู่รู้ว่า ยังมีบางอย่างค้างอยู่ในใจ' },
      ],
      next: null,
    },
  ],
  interpretations: [
    {
      id: 'ic_out_relief',
      role: 'waiter',
      when: FIRST('relief'),
      quote: '"โล่งใจมากที่ปลอดภัยนะ"',
      feelings: [
        { id: 'relieved', text: 'โล่งใจ' },
        { id: 'still_shaken', text: 'ยังตกใจอยู่' },
        { id: 'no_words', text: 'ไม่รู้จะพูดอะไรดี' },
      ],
    },
    {
      id: 'ic_out_fear',
      role: 'waiter',
      when: FIRST('fear'),
      quote: '"กลัวมากเลยรู้ไหม"',
      feelings: [
        { id: 'afraid', text: 'กลัว' },
        { id: 'show_matters', text: 'อยากให้รู้ว่าสำคัญแค่ไหน' },
        { id: 'needs_comfort', text: 'ต้องการการปลอบเหมือนกัน' },
      ],
    },
    {
      id: 'ic_out_blame',
      role: 'waiter',
      when: FIRST('blame'),
      quote: '"ทำไมไม่ฟังกันเลย"',
      quoteByCondition: [{ when: NO_PW, text: '"ทำไมไม่ระวังเลย"' }],
      feelings: [
        { id: 'fear_loss', text: 'กลัวจะเสียไป' },
        { id: 'helpless', text: 'รู้สึกช่วยอะไรไม่ได้' },
        { id: 'warning_ignored', text: 'น้อยใจที่คำเตือนไม่ถูกรับฟัง', when: PW },
        { id: 'worn_out', text: 'เหนื่อยจากความกังวล' },
        { id: 'truly_angry', text: 'โกรธจริง ๆ' },
      ],
    },
    {
      id: 'ic_out_ask_hug',
      role: 'waiter',
      when: FIRST('ask_hug'),
      quote: '"ขอกอดได้ไหม"',
      feelings: [
        { id: 'touch_to_know_safe', text: 'อยากสัมผัสเพื่อยืนยันว่าปลอดภัย' },
        { id: 'closeness', text: 'ต้องการความใกล้ชิด' },
        { id: 'to_comfort', text: 'อยากปลอบ' },
      ],
    },
    {
      id: 'ic_out_silent',
      role: 'waiter',
      when: FIRST('silent'),
      quote: '(เดินเข้าไปยืนข้าง ๆ เงียบ ๆ)',
      feelings: [
        { id: 'no_start', text: 'ไม่รู้จะเริ่มอย่างไร' },
        { id: 'fear_wrong_words', text: 'กลัวพูดผิด' },
        { id: 'give_space', text: 'อยากให้พื้นที่' },
        { id: 'holding_in', text: 'กำลังข่มอารมณ์' },
      ],
    },
    {
      id: 'ic_in_apologize',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'apologize' },
      quote: '"ขอโทษนะ"',
      feelings: [
        { id: 'guilty', text: 'รู้สึกผิด' },
        { id: 'ease_mood', text: 'อยากให้บรรยากาศดีขึ้น' },
        { id: 'avoid_fight', text: 'ไม่อยากทะเลาะ' },
        { id: 'too_tired', text: 'เหนื่อยเกินกว่าจะอธิบาย' },
      ],
    },
    {
      id: 'ic_in_boundary',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'boundary' },
      quote: '"ตอนนี้ยังไม่อยากคุยเรื่องนั้นนะ"',
      feelings: [
        { id: 'need_time', text: 'ต้องการเวลา' },
        { id: 'still_scared', text: 'ยังกลัวอยู่' },
        { id: 'not_understood', text: 'รู้สึกไม่ถูกเข้าใจ' },
      ],
    },
    {
      id: 'ic_in_share_fear',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'share_fear' },
      quote: '"ฉันก็กลัวเหมือนกัน"',
      feelings: [
        { id: 'want_comfort', text: 'อยากได้รับการปลอบ' },
        { id: 'heavy_too', text: 'อยากให้รู้ว่าตัวเองก็เจอเรื่องหนัก' },
      ],
    },
    {
      id: 'ic_in_withdraw',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'withdraw' },
      quote: '(เงียบ แล้วเดินนำไปทางบันได)',
      feelings: [
        { id: 'overwhelmed', text: 'ท่วมท้น' },
        { id: 'need_space', text: 'ต้องการพื้นที่' },
        { id: 'sad', text: 'เสียใจ' },
      ],
    },
    {
      id: 'ic_in_hurt',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'hurt' },
      quote: '"ที่พูดแบบนั้น ทำให้เจ็บนะ"',
      feelings: [
        { id: 'words_matter', text: 'อยากให้รู้ว่าคำพูดมีผล' },
        { id: 'still_scared', text: 'ยังกลัวอยู่' },
        { id: 'comfort_first', text: 'อยากได้การปลอบก่อนคำถาม' },
      ],
    },
    {
      id: 'ic_in_hug_yes',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'hug_yes' },
      quote: '"ได้"',
      feelings: [{ id: 'need_warmth', text: 'ต้องการความอบอุ่น' }],
    },
    {
      id: 'ic_in_hug_later',
      role: 'insider',
      when: { flag: 'in_resp', eq: 'hug_later' },
      quote: '"ขอแป๊บนึงก่อนนะ"',
      feelings: [{ id: 'time_before_touch', text: 'ต้องการเวลาก่อนถูกสัมผัส' }],
    },
  ],
  mirrorQuestions: [
    {
      id: 'w3_1',
      context: 'role',
      self: 'ตอนเจอหน้ากัน คุณ (ในบทบาทของคุณในเรื่องนี้) รู้สึกอะไรมากที่สุด',
      perceived: 'คุณคิดว่า {other} รู้สึกอะไรมากที่สุด',
      options: EMO_SET,
      maxSelect: 3,
      freeText: true,
    },
    {
      id: 'w3_2',
      context: 'role',
      self: 'สิ่งที่คุณอยากได้จากอีกคนในตอนนั้นที่สุดคืออะไร',
      perceived: 'คุณคิดว่า {other} อยากได้อะไรจากคุณที่สุด',
      options: NEED_SET,
      maxSelect: 2,
      freeText: true,
    },
  ],
  rewrites: [
    {
      token: 'rewrite_out',
      flag: 'rewrite_out',
      choiceId: 'ch3_s06_out',
      originalChoiceId: 'ch3_c01',
      storyItem: 'rewrite_out',
    },
    {
      token: 'rewrite_in',
      flag: 'rewrite_in',
      choiceId: 'ch3_s06_in',
      originalChoiceId: 'ch3_c02',
      storyItem: 'rewrite_in',
    },
  ],
  reflection: [
    {
      id: 'r3_1',
      self: 'เวลาคุณกังวลมาก ๆ คำพูดของคุณมักออกมาเป็นแบบไหน',
      options: [
        { id: 'r3_1_softer', text: 'นุ่มลง' },
        { id: 'r3_1_harder', text: 'แข็งขึ้น' },
        { id: 'r3_1_quiet', text: 'เงียบ' },
        { id: 'r3_1_more_words', text: 'พูดเยอะขึ้น' },
        { id: 'r3_1_more_questions', text: 'ถามเยอะ' },
      ],
      maxSelect: 1,
      freeText: false,
    },
    {
      id: 'r3_2',
      self: 'ถ้ามีคนพูดแรงใส่ตอนคุณเปราะบาง คุณต้องการอะไรจากเขาหลังจากนั้น',
      options: [
        { id: 'r3_2_explain', text: 'คำอธิบาย' },
        { id: 'r3_2_apology', text: 'คำขอโทษ' },
        { id: 'r3_2_time', text: 'เวลา' },
        { id: 'r3_2_listen_first', text: 'ให้เขาฟังเราก่อน' },
        { id: 'r3_2_move_on', text: 'ทำเหมือนไม่มีอะไร' },
      ],
      maxSelect: 1,
      freeText: true,
    },
    {
      id: 'r3_3',
      self: '(ไม่บังคับ) มีคำพูดไหนที่คุณเคยพูดออกไป ทั้งที่ข้างในหมายถึงอย่างอื่น',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [{ type: 'NARR', text: 'ถ้าเราลองสลับที่กันจริง ๆ ล่ะ' }],
    nextChapter: 'ch4',
  },
};
