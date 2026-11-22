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
