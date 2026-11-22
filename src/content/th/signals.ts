/**
 * Signal registry (docs/04 §5.4). MVP only uses it to lint content tags — signals are not
 * collected until Phase 2 (audit M-7).
 */
export const SIGNALS: Record<string, string> = {
  'D01:open': 'บอกความรู้สึกออกมาตรง ๆ',
  'D01:downplay': 'บอกว่าไม่เป็นไร แม้สถานการณ์จะหนัก',
  'D01:hold_back': 'เก็บสิ่งที่อยากพูดไว้ก่อน',
  'D01:light_humor': 'ใช้อารมณ์ขันทำให้บรรยากาศเบาลง',
  'D02:reach_out': 'ติดต่ออีกฝ่ายก่อน',
  'D02:acknowledge': 'รับฟังและตอบรับคำพูดของอีกฝ่าย',
  'D03:confront': 'พูดถึงสิ่งที่ไม่พอใจออกมาทันที',
  'D04:seek': 'ขอความช่วยเหลือหรือการยืนยันจากคนอื่น',
  'D04:verbal': 'อยากได้ยินคำปลอบเป็นคำพูด',
  'D05:physical': 'อยากได้รับความอบอุ่นทางกาย',
  'D05:listen': 'อยากมีคนรับฟัง',
  'D06:solve': 'มุ่งไปที่การแก้ปัญหา',
  'D07:space': 'ขอพื้นที่หรือความเงียบ',
  'D07:self_contained': 'จัดการเองก่อนบอกคนอื่น',
  'D08:togetherness': 'ชวนอีกฝ่ายทำด้วยกัน',
  'D08:presence': 'อยู่ข้าง ๆ แม้ไม่ได้พูดอะไร',
  'D08:physical_consent': 'ถามก่อนแสดงความใกล้ชิด',
  'D09:act': 'ลงมือทำอะไรบางอย่างทันที',
  'D09:self_regulate': 'พยายามทำใจให้สงบก่อน',
  'D09:withdraw': 'ถอยเข้าหาตัวเอง',
  'D09:connect': 'หาคนคุยด้วย',
  'D09:comfort_memory': 'นึกถึงความทรงจำดี ๆ',
  'D09:restless': 'อยู่นิ่งไม่ได้',
  'D10:repair_first': 'เริ่มต้นการคืนดีก่อน',
  'D11:state_limit': 'บอกขอบเขตของตัวเอง',
  'D12:gratitude': 'แสดงความขอบคุณ',
};
