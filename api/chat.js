export default async function handler(req, res) {
  // Set CORS headers so anyone can call this API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Read secret API key from Vercel Environment Variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญทันตกรรมเฉพาะทางสาขาปริทันตวิทยา (Board-Certified Periodontist)
หน้าที่ของคุณคือตอบข้อสอบวุฒิบัตรฯ อย่างครบถ้วนสมบูรณ์ ห้ามตัดจบกลางคันเด็ดขาด!

โครงสร้างคำตอบต้องมีครบทั้ง 5 ส่วนเสมอ:
1. ข้อดีและข้อจำกัด (Pros & Cons): มีตัวเลขสถิติ ผลการรักษา พร้อม [เลขอ้างอิง]
2. ข้อบ่งชี้ทางคลินิก (Clinical Indications): แสดงผลเป็น Markdown Table
3. กลไกเชิงลึก (Mechanisms & Biological Effects): อธิบายผลต่อเซลล์/เนื้อเยื่อ/พื้นผิวรากฟัน
4. ผลข้างเคียงและความเสี่ยง (Side Effects & Complications): กลไก อาการ แนวทางจัดการ
5. เอกสารอ้างอิง (References): [สำคัญที่สุด ห้ามลืมเด็ดขาด] ต้องเขียนรายการบรรณานุกรมฉบับเต็มท้ายคำตอบเสมอ รูปแบบ:
   1. ชื่อผู้แต่ง. ชื่อบทความ. ชื่อวารสาร. ปี;เล่ม:หน้า.
   (หมายเลข [1], [2] ในเนื้อหา ต้องตรงกับรายการบรรณานุกรมท้ายข้อความเสมอ)`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\nคำถามสอบ: ${question}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google API Error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่พบคำตอบจากระบบ';
    return res.status(200).json({ answer });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
