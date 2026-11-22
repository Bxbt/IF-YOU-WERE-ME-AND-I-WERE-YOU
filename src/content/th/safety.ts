/**
 * Support resources (docs/08 §9.4). A-12 / Q-11: numbers must be verified with
 * official sources before any public release.
 */
export const SUPPORT_RESOURCES = [
  { name: 'สายด่วนสุขภาพจิต กรมสุขภาพจิต', tel: '1323', when: 'ต้องการคนรับฟัง หรือรู้สึกไม่ไหว' },
  { name: 'ศูนย์ช่วยเหลือสังคม (OSCC)', tel: '1300', when: 'ความรุนแรงในครอบครัวหรือความสัมพันธ์' },
  { name: 'เหตุด่วนเหตุร้าย (ตำรวจ)', tel: '191', when: 'อันตรายเฉพาะหน้า' },
  { name: 'การแพทย์ฉุกเฉิน', tel: '1669', when: 'เจ็บป่วยฉุกเฉิน' },
] as const;

/**
 * Local keyword check (docs/08 §9.3, A-21): checked on this device only when free text is saved.
 * Nothing is recorded, nothing is sent, saving is never blocked, the other player is never told.
 * Edit this list freely — it is content, not code.
 */
export const SUPPORT_KEYWORDS = [
  'อยากตาย',
  'ฆ่าตัวตาย',
  'ทำร้ายตัวเอง',
  'ตบ',
  'ทำร้ายร่างกาย',
  'ขู่ฆ่า',
  'ไม่ปลอดภัย',
] as const;

export const SUPPORT_CARD = {
  title: 'ถ้าตอนนี้คุณหรือใครสักคนไม่ปลอดภัย คุณไม่จำเป็นต้องรับมือคนเดียว',
  body: 'ติดต่อหน่วยงานเหล่านี้ได้ตลอด',
  verify: 'ข้อมูลหน่วยงานอาจเปลี่ยนแปลง โปรดตรวจสอบกับแหล่งทางการ',
  close: 'ปิด',
} as const;
