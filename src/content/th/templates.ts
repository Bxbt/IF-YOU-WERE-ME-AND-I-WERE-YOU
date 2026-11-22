/**
 * Comparison and report sentences (docs/04 §7.3, §8). Templates only — no LLM (C-6).
 * Never counts, scores or judges (docs/04 §4.2): "different" always says nobody is right or wrong.
 */
export const templates = {
  compare: {
    heading: 'สิ่งที่เราเข้าใจ',
    intro: 'ไม่มีคะแนน ไม่มีใครถูกผิด — แค่ภาพของสิ่งที่เราเห็นตอนนี้',
    soloIntro: (other: string) =>
      `คุณเล่นคนเดียว ทุกอย่างของ ${other} ในหน้านี้คือสิ่งที่คุณคิด ไม่ใช่สิ่งที่ ${other} บอก`,
    similarTitle: 'สิ่งที่เราเข้าใจคล้ายกัน',
    soloSimilarTitle: 'สิ่งที่คุณคิดว่าคุณสองคนคล้ายกัน',
    differentTitle: 'สิ่งที่เราอาจรู้สึกต่างกัน',
    soloDifferentTitle: 'สิ่งที่คุณคิดว่าคุณสองคนต่างกัน',
    differentIntro: 'คุณอาจแสดงความใส่ใจต่างกัน แม้ทั้งสองคนต่างอยากดูแลความสัมพันธ์นี้',
    askTitle: 'สิ่งที่เราควรถามกัน',
    emptyCategory: 'ยังไม่มีเรื่องในหมวดนี้',
    similar: (dim: string, shared: string, other: string) =>
      `เรื่อง${dim} — คุณเลือก ${shared} และคุณคิดว่า ${other} ก็อาจเลือกแบบเดียวกัน`,
    different: (dim: string, mine: string, theirs: string, other: string) =>
      `เรื่อง${dim} — คุณเลือก ${mine} ส่วนที่คุณคิดว่า ${other} เลือกคือ ${theirs} · ความต่างนี้ไม่ได้แปลว่าใครถูก`,
    askReason: {
      unsure: 'ยังไม่แน่ใจ',
      missing: 'ยังไม่ได้ตอบ',
      own_words: 'ตอบด้วยคำพูดของตัวเอง',
      solo_unknown: (other: string) => `ยังไม่รู้คำตอบจริงของ ${other}`,
    },
    emptyTitle: 'ยังไม่มีข้อมูลพอจะเปรียบเทียบ',
    emptyBody: (other: string) =>
      `ตอบคำถามเกี่ยวกับตัวคุณ และสิ่งที่คุณคิดเกี่ยวกับ ${other} หรือเล่นบทที่ 4 แล้วกลับมาดูอีกครั้ง`,
    emptyQuick: 'ตอบฉบับสั้น 12 ข้อ',
    emptyCh4: 'เล่นบทที่ 4',
    allDims: 'ทุกเรื่อง',
    seeQuestion: 'ดูคำถามเต็ม',
    youSaid: 'คุณบอก',
    youThink: (other: string) => `คุณคิดว่า ${other}`,
    addToNext: 'เพิ่มลงคำถามครั้งหน้า',
    added: 'เพิ่มแล้ว',
  },
  report: {
    heading: (name: string) => `สมุดบันทึกของ ${name}`,
    date: (d: string) => `วันที่ ${d}`,
    me: 'ตัวฉัน',
    meNeeds: 'ความต้องการทางอารมณ์',
    meLove: 'วิธีแสดงความรัก',
    meConflict: 'วิธีรับมือความขัดแย้ง',
    meLoved: 'อะไรทำให้รู้สึกถูกรัก',
    meStatements: 'ประโยคที่คุณเขียนในบทที่ 5',
    understanding: (other: string) => `ความเข้าใจของฉันเกี่ยวกับ ${other}`,
    uNeeds: (other: string) => `สิ่งที่ฉันคิดว่า ${other} ต้องการ`,
    uLoved: (other: string) => `สิ่งที่ฉันคิดว่าทำให้ ${other} รู้สึกถูกรัก`,
    uUnsure: 'สิ่งที่ฉันยังไม่เข้าใจ',
    uUnsureEmpty: 'คุณตอบได้ทุกข้อ — แต่อย่าลืมว่าทุกข้อยังเป็นสิ่งที่คุณคิด',
    differences: 'ความต่างของเรา',
    differencesSolo: (other: string) =>
      `ต้องให้ ${other} มาเล่นด้วยก่อน ส่วนนี้ถึงจะมีข้อมูล (การเล่นด้วยกันจะเปิดในเวอร์ชันถัดไป)`,
    next: 'บทสนทนาครั้งหน้า',
    nextQuestions: 'คำถามที่อยากชวนคุย',
    nextCare: 'วิธีดูแลกัน',
    nextThanks: 'สิ่งที่ควรขอบคุณ',
    nextThanksSolo: (other: string) => `จะมีเมื่อ ${other} มาเล่นด้วยและเปิดคำตอบให้เห็น`,
    emptyGroup: 'ยังไม่ได้ตอบ',
    answerNow: 'ตอบ 3 คำถาม',
    answerPerceived: (other: string) => `ตอบสิ่งที่คุณคิดเกี่ยวกับ ${other}`,
    source: {
      self: 'คุณบอก',
      perceived: 'คุณคิด',
      statement: 'คุณเขียน',
      conversation: 'คำถามครั้งหน้า',
    },
    fileFooter: (date: string) => `${date} · สร้างจาก IF YOU WERE ME, AND I WERE YOU`,
  },
} as const;
