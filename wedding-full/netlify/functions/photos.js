// ============================================================
//  서버 API: 갤러리 사진
//   GET  → 갤러리에 보여줄 사진 목록 (삭제 안 된 것만)
//   POST → 업로드 끝난 사진의 정보(메타데이터) 저장
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('photos')
        .select('id, uploader_name, thumb_url, full_url, created_at')
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return resp(200, { photos: data });
    }

    if (event.httpMethod === 'POST') {
      const { uploader_name, contact, thumb_url, full_url, file_path } = JSON.parse(event.body || '{}');
      if (!uploader_name || !thumb_url || !full_url) {
        return resp(400, { error: '필수 정보가 빠졌어요' });
      }
      const { error } = await supabase.from('photos').insert({
        uploader_name,
        contact: contact || null,
        thumb_url,
        full_url,
        file_path: file_path || null,
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
