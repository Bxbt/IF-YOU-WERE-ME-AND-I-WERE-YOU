/**
 * Storyline 2, Chapter 1 — I Want to Be Loved, Too. Transcribed from docs/02 (เส้นเรื่องที่ 2, OS1).
 * {in} = the teller, {out} = their partner. Every "เธอ" meaning the partner is {you} (A-22).
 * Change the script in docs/02 first, then here.
 */
import type { ChapterContent } from '../../types';
import { D, E, M, N, S, SYS, is, unsetOr } from './lines';

const ROOM = 'ห้องเล็กในอพาร์ตเมนต์ตอนค่ำ ฝนตกปรอย ๆ โคมไฟสีอุ่น อีกคนก้มหน้าอยู่กับโน้ตบุ๊ก';
const BEDROOM = 'ห้องนอนแสงสลัว ไฟหัวเตียงดวงเล็ก หยดฝนไหลลงกระจกหน้าต่าง';

export const os1: ChapterContent = {
  id: 'os1',
  titleEn: 'I Want to Be Loved, Too',
  titleTh: 'ฉันก็อยากเป็นคนที่ถูกรักเหมือนกัน',
  estimatedMinutes: [6, 8],
  firstScene: 'os1_s01',
  scenes: [
    {
      id: 'os1_s01',
      background: 'bg_apartment_evening',
      ariaLabel: ROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_apartment_evening', rain: 'light', lamp: 'warm', music: 'ambient_home' }),
        N('เรื่องนี้ คืออีกด้านของคนที่ใคร ๆ ก็มองว่าเข้มแข็ง'),
        N('คืนวันอังคาร สามทุ่มกว่า {in} เพิ่งกลับถึงห้อง'),
        N('ประชุมที่ถูกเลื่อนมาเช้ากว่าเดิม งานที่ต้องแก้ให้เสร็จก่อนเที่ยงคืน และข้าวกลางวันที่กินไม่หมด'),
        S('โทรศัพท์ของ {in}', 'แบตเตอรี่ 9%'),
        M('in', '(ขอนั่งสักห้านาที แล้วค่อยทำต่อ)'),
        D('out', 'กลับมาแล้วเหรอ ข้าวอยู่ในตู้เย็นนะ อุ่นกินได้เลย', 'neutral'),
        N('{out} ยังก้มหน้าอยู่กับจอโน้ตบุ๊ก'),
        M('in', '(ขอบคุณที่เก็บไว้ให้นะ แต่…)'),
        M('in', '(ไม่ได้หิวขนาดนั้น แค่อยากให้ใครสักคนเงยหน้ามามอง)'),
        {
          type: 'CHOICE',
          id: 'os1_c01',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"อืม ขอบคุณนะ"',
              setFlags: { os_greet: 'thanks' },
              responseLines: [D('out', 'อืม ๆ'), M('in', '(เหมือนทุกวัน)')],
            },
            {
              id: 'b',
              text: '"วันนี้เหนื่อยมากเลย"',
              setFlags: { os_greet: 'tired' },
              responseLines: [
                D('out', 'เหรอ… งั้นพักก่อนนะ', 'worried'),
                N('{out} พูดโดยที่สายตายังอยู่บนจอ'),
                M('in', '(ได้ยินแล้ว แต่ยังไม่เหมือนถูกมองเห็น)'),
              ],
            },
            {
              id: 'c',
              text: '"ทำอะไรอยู่ ดูยุ่งจัง"',
              setFlags: { os_greet: 'ask' },
              responseLines: [
                D('out', 'งานด่วนน่ะ หัวหน้าเพิ่งส่งมา ขอโทษนะ', 'worried'),
                M('in', '(อีกคนก็มีวันที่หนักเหมือนกันสินะ)'),
              ],
            },
            {
              id: 'd',
              text: '(ยิ้มให้ แล้วเดินเข้าห้องนอน)',
              setFlags: { os_greet: 'quiet' },
              responseLines: [M('in', '(ไม่เป็นไร ชินแล้ว)'), M('in', '(…ชินแล้วจริง ๆ เหรอ)')],
            },
          ],
        },
      ],
      next: 'os1_s02',
    },
    {
      id: 'os1_s02',
      background: 'bg_apartment_kitchen',
      ariaLabel: 'อีกฟากของห้อง มุมครัวกับโต๊ะทำงานเล็ก ๆ ฝนตกนอกหน้าต่าง',
      controller: 'waiter',
      lines: [
        E({ bg: 'bg_apartment_kitchen', rain: 'light', steam: false }),
        N('อีกฟากของห้อง'),
        M('out', '(ต้องส่งงานนี้ให้ทันคืนนี้ ไม่งั้นพรุ่งนี้โดนอีกรอบ)'),
        M('out', '({in} บอกว่าเหนื่อย… งานเสร็จแล้วค่อยไปถามละกัน)', is('os_greet', 'tired')),
        M('out', '(ดีจังที่ {in} ยังถาม ทั้งที่ตัวเองก็ดูเหนื่อย)', is('os_greet', 'ask')),
        M('out', '({in} เก่งเสมอ จัดการได้ทุกอย่าง คงไม่เป็นไรหรอก)', unsetOr('os_greet', 'thanks', 'quiet')),
        M('out', '(เสร็จงานนี้แล้ว จะไปนั่งด้วย)'),
        N('แต่กว่างานจะเสร็จ ก็เกือบเที่ยงคืน'),
      ],
      next: 'os1_s03',
    },
    {
      id: 'os1_s03',
      background: 'bg_bedroom_night',
      ariaLabel: BEDROOM,
      controller: 'insider',
      lines: [
        E({ bg: 'bg_bedroom_night', rain: 'light', lamp: 'warm' }),
        N('ในห้องนอน ไฟหัวเตียงดวงเล็กยังเปิดอยู่'),
        N('{in} นอนตะแคง มองหยดฝนที่ไหลลงกระจก'),
        M('in', '(ไม่ได้อยากให้ใครชมทุกวัน)'),
        M('in', '(ไม่ได้อยากให้ใครแก้ปัญหาให้ด้วย)'),
        M('in', '(แค่อยากมีใครสักคน ที่รู้ว่าฉันเหนื่อย โดยที่ฉันไม่ต้องขอ)'),
        N('ประตูห้องเปิดเบา ๆ'),
        D('out', 'ยังไม่หลับเหรอ'),
        {
          type: 'CHOICE',
          id: 'os1_c02',
          owner: 'insider',
          options: [
            {
              id: 'a',
              text: '"ยัง" (แล้วหลับตาลง)',
              setFlags: { os_night: 'close' },
              responseLines: [
                M('out', '(คงเหนื่อยมาก ไม่กวนละกัน)'),
                N('{out} ปิดไฟ แล้วนอนลงเงียบ ๆ'),
                E({ lamp: 'off' }),
                M('in', '(ถ้ามีใครถามว่าเหนื่อยไหม คืนนี้คงหลับง่ายกว่านี้)'),
              ],
            },
            {
              id: 'b',
              text: '"รอ{you}อยู่"',
              setFlags: { os_night: 'waited' },
              responseLines: [
                D('out', 'ขอโทษนะ งานมันลากยาว', 'sad'),
                D('out', '…วันนี้เหนื่อยไหม'),
                M('in', '(ประโยคนี้แหละ ที่รอมาทั้งวัน)'),
              ],
            },
            {
              id: 'c',
              text: '"วันนี้ไม่ค่อยไหวเลย"',
              setFlags: { os_night: 'honest' },
              responseLines: [
                D('out', 'เป็นอะไร เล่าให้ฟังได้ไหม', 'worried'),
                M('in', '(ไม่ต้องเล่าทั้งหมดก็ได้ แค่มีคนถามแบบนี้ก็พอแล้ว)'),
              ],
            },
          ],
        },
      ],
      next: 'os1_cards',
    },
    {
      id: 'os1_cards',
      background: 'bg_bedroom_night',
      ariaLabel: BEDROOM,
      controller: 'narrator',
      lines: [E({ bg: 'bg_bedroom_night', rain: 'light' }), { type: 'EMOTION_CARDS' }],
      next: 'os1_reflect',
    },
    {
      id: 'os1_reflect',
      background: 'bg_bedroom_night',
      ariaLabel: BEDROOM,
      controller: 'narrator',
      lines: [E({ bg: 'bg_bedroom_night', rain: 'light' }), { type: 'REFLECTION' }],
      next: 'os1_end',
    },
    {
      id: 'os1_end',
      background: 'bg_bedroom_night',
      ariaLabel: 'ห้องนอนเงียบ ฝนหยุดแล้ว เหลือแค่หยดน้ำบนกระจก',
      controller: 'narrator',
      lines: [
        E({ bg: 'bg_bedroom_night', rain: 'none' }),
        N('บางคนดูเข้มแข็ง เพราะไม่ค่อยมีใครถาม'),
        N('ประโยคสั้น ๆ อย่าง "วันนี้เหนื่อยไหม" อาจเป็นสิ่งที่ใครบางคนรอฟังมาทั้งวัน'),
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
          { id: 'os1_in_tired', text: 'เหนื่อย' },
          { id: 'os1_in_lonely', text: 'เหงา' },
          { id: 'os1_in_unseen', text: 'อยากถูกมองเห็น' },
          { id: 'os1_in_no_burden', text: 'ไม่อยากเป็นภาระ' },
          { id: 'os1_in_understand', text: 'เข้าใจว่าอีกคนก็ยุ่ง' },
          { id: 'os1_in_fine', text: 'ยังโอเคอยู่' },
        ],
      },
      {
        role: 'waiter',
        label: '{out} อาจรู้สึก…',
        cards: [
          { id: 'os1_out_busy', text: 'ยุ่งจนไม่ทันสังเกต' },
          { id: 'os1_out_trust', text: 'คิดว่าอีกคนไหว' },
          { id: 'os1_out_guilty', text: 'รู้สึกผิดทีหลัง' },
          { id: 'os1_out_tired', text: 'เหนื่อยเหมือนกัน' },
          { id: 'os1_out_make_up', text: 'อยากชดเชย' },
        ],
      },
    ],
  },
  reflection: [
    {
      id: 'ro1_1',
      self: 'เวลาคุณเหนื่อย คุณอยากให้คนข้าง ๆ ทำอะไรมากที่สุด',
      options: [
        { id: 'ro1_1_ask', text: 'ถามว่าวันนี้เหนื่อยไหม' },
        { id: 'ro1_1_sit', text: 'นั่งอยู่ด้วยเฉย ๆ' },
        { id: 'ro1_1_help', text: 'ช่วยทำบางอย่างแทน' },
        { id: 'ro1_1_quiet', text: 'ปล่อยให้พักเงียบ ๆ' },
        { id: 'ro1_1_hug', text: 'กอด (หรือถามก่อนว่ากอดได้ไหม)' },
      ],
      maxSelect: 2,
      freeText: true,
      toNextConversation: true,
    },
    {
      id: 'ro1_2',
      self: '(ไม่บังคับ) ครั้งล่าสุดที่คุณรู้สึกว่ามีคนมองเห็นความเหนื่อยของคุณ เขาทำอะไร',
      options: [],
      maxSelect: 1,
      freeText: true,
    },
  ],
  transition: {
    lines: [SYS('บทที่ 1 จบแล้ว'), N('ความรักไม่ได้อยู่แค่ในสิ่งที่ทำให้กัน แต่อยู่ในการรู้ว่ามีคนมองเห็น')],
    nextChapter: 'os2',
  },
};
