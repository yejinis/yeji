// ============================================================
//  서버 API: 참석 의사 전달 (RSVP)
//   POST → RSVP 저장
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      const { name, count, memo } = JSON.parse(event.body || '{}');
      if (!name || typeof name !== 'string' || !name.trim()) {
        return resp(400, { error: '성함을 입력해주세요' });
      }
      const { error } = await supabase.from('rsvp').insert({
        name: name.trim().slice(0, 20),
        guest_count: Math.min(Math.max(parseInt(count, 10) || 1, 1), 10),
        memo: (memo || '').toString().trim().slice(0, 300),
      });
      if (error) throw error;
      return resp(200, { ok: true });
    }

    return resp(405, { error: 'Method not allowed' });
  } catch (e) {
    return resp(500, { error: e.message });
  }
};

function resp(code, body) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
