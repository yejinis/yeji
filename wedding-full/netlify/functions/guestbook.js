// ============================================================
//  서버 API: 방명록
//   GET    → 방명록 목록 (삭제 안 된 것만)
//   POST   → 글 작성 (비밀번호는 암호화해서 저장)
//   DELETE → 본인 비밀번호가 맞으면 삭제(soft delete)
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

exports.handler = async (event) => {
  try {
    // ---- 목록 ----
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('guestbook')
        .select('id, name, message, created_at')
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return resp(200, { entries: data });
    }

    // ---- 작성 ----
    if (event.httpMethod === 'POST') {
      const { name, message, password } = JSON.parse(event.body || '{}');
      if (!name || !message || !password) {
        return resp(400, { error: '이름, 메시지, 비밀번호를 모두 입력해주세요' });
      }
      // 비밀번호는 원문을 저장하지 않고 암호화(해시)해서 저장
      const password_hash = await bcrypt.hash(String(password), 10);
      const { error } = await supabase.from('guestbook').insert({ name, message, password_hash });
      if (error) throw error;
      return resp(200, { ok: true });
    }

    // ---- 삭제 (비밀번호 확인) ----
    if (event.httpMethod === 'DELETE') {
      const { id, password } = JSON.parse(event.body || '{}');
      if (!id || !password) return resp(400, { error: '비밀번호를 입력해주세요' });

      const { data, error } = await supabase
        .from('guestbook')
        .select('password_hash')
        .eq('id', id)
        .eq('deleted', false)
        .single();
      if (error || !data) return resp(404, { error: '글을 찾을 수 없어요' });

      const ok = await bcrypt.compare(String(password), data.password_hash);
      if (!ok) return resp(403, { error: '비밀번호가 일치하지 않아요' });

      const { error: delErr } = await supabase
        .from('guestbook')
        .update({ deleted: true })
        .eq('id', id);
      if (delErr) throw delErr;
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
