// ============================================================
//  서버 API: 사진 업로드용 임시 URL 발급
//  - 브라우저가 사진을 Supabase Storage로 "직접" 올릴 수 있게
//    서버가 2시간짜리 임시 업로드 URL을 만들어 줍니다.
//  - 비밀 키(SUPABASE_SECRET_KEY)는 이 서버에만 있습니다.
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET = 'gallery';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });

  try {
    const { nickname, sessionId } = JSON.parse(event.body || '{}');
    if (!nickname) return resp(400, { error: '이름을 입력해주세요' });

    // 경로: photos/{세션}_{닉네임}/{파일id}_thumb.webp, /{파일id}_full.webp
    // → sessionId가 오면 그대로 재사용해서, 한 사람이 한 번에 올린
    //   사진들은 같은 폴더에 모이게 함 (없으면 새로 발급)
    const safe = (s) => String(s).replace(/[^\w.-]/g, '_').slice(0, 40);
    let base;
    if (sessionId && /^[\w.-]+$/.test(sessionId)) {
      base = `photos/${safe(sessionId)}_${safe(nickname)}`;
    } else {
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      base = `photos/${ts}_${rand}_${safe(nickname)}`;
    }
    const fileId = Math.random().toString(36).slice(2, 8);
    const thumbPath = `${base}/${fileId}_thumb.webp`;
    const fullPath = `${base}/${fileId}_full.webp`;

    const [thumb, full] = await Promise.all([
      supabase.storage.from(BUCKET).createSignedUploadUrl(thumbPath),
      supabase.storage.from(BUCKET).createSignedUploadUrl(fullPath),
    ]);
    if (thumb.error || full.error) {
      return resp(500, { error: '업로드 URL 생성 실패', detail: (thumb.error || full.error).message });
    }

    const thumbPublic = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
    const fullPublic = supabase.storage.from(BUCKET).getPublicUrl(fullPath).data.publicUrl;

    return resp(200, {
      thumb: { signedUrl: thumb.data.signedUrl, publicUrl: thumbPublic },
      full: { signedUrl: full.data.signedUrl, publicUrl: fullPublic },
      basePath: base,
    });
  } catch (e) {
    return resp(500, { error: e.message });
  }
};

function resp(code, body) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
