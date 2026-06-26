// ============================================================
//  청첩장 프론트엔드 로직
//  - 사진을 브라우저에서 webp(썸네일/모달)로 변환 후 업로드
//  - 방명록 작성/조회/삭제
//  ※ 이 파일에는 비밀 키가 전혀 없습니다. 모두 서버를 거칩니다.
// ============================================================
const API = '/.netlify/functions';

/* ---------- 공통 ---------- */
const $ = (s) => document.querySelector(s);
const toast = (() => {
  const el = document.getElementById('toast');
  return (msg) => { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); };
})();
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtDate(iso){const d=new Date(iso);return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;}

/* ============================================================
   이미지 → webp 변환 (브라우저에서)
   maxSize: 긴 변 기준 최대 픽셀, quality: 0~1
   ============================================================ */
function loadImage(file){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('이미지를 읽을 수 없어요'));
    img.src = URL.createObjectURL(file);
  });
}
async function toWebp(file, maxSize, quality){
  const img = await loadImage(file);
  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > maxSize){
    if (w >= h){ h = Math.round(h * maxSize / w); w = maxSize; }
    else { w = Math.round(w * maxSize / h); h = maxSize; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
  if (!blob) throw new Error('webp 변환 실패 (이 브라우저가 지원 안 할 수 있어요)');
  return blob;
}

/* ============================================================
   사진 업로드 플로우
   ============================================================ */
async function uploadPhoto(file, nickname, contact){
  // 1) 두 가지 버전 생성: 썸네일(가벼움) + 모달(크게)
  const thumbBlob = await toWebp(file, 500, 0.7);
  const fullBlob  = await toWebp(file, 1600, 0.82);

  // 2) 서버에 임시 업로드 URL 요청
  const r = await fetch(`${API}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!r.ok) throw new Error('업로드 URL 요청 실패');
  const { thumb, full, basePath } = await r.json();

  // 3) 그 URL로 사진을 Storage에 직접 PUT
  const put = (signedUrl, blob) => fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp', 'x-upsert': 'true' },
    body: blob,
  });
  const [tRes, fRes] = await Promise.all([put(thumb.signedUrl, thumbBlob), put(full.signedUrl, fullBlob)]);
  if (!tRes.ok || !fRes.ok) throw new Error('사진 업로드 실패');

  // 4) 사진 정보(메타데이터)를 DB에 저장
  const meta = await fetch(`${API}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploader_name: nickname,
      contact,
      thumb_url: thumb.publicUrl,
      full_url: full.publicUrl,
      file_path: basePath,
    }),
  });
  if (!meta.ok) throw new Error('사진 정보 저장 실패');
}

/* ---------- 갤러리 렌더 ---------- */
async function loadGallery(){
  const grid = $('#upload-gallery-grid');
  if (!grid) return; // 내 갤러리(gallery-grid)는 건드리지 않음
  try {
    const r = await fetch(`${API}/photos`);
    const { photos } = await r.json();
    if (!photos || !photos.length){
      grid.innerHTML = '<div class="g-empty">아직 사진이 없어요. 첫 사진을 올려주세요 📸</div>';
      return;
    }
    grid.innerHTML = photos.map(p => `
      <div class="g-item" data-full="${esc(p.full_url)}" data-name="${esc(p.uploader_name)}">
        <img src="${esc(p.thumb_url)}" alt="${esc(p.uploader_name)}님의 사진" loading="lazy">
      </div>`).join('');
    grid.querySelectorAll('.g-item').forEach(c => c.addEventListener('click', () => openModal(c.dataset.full, c.dataset.name)));
  } catch (e) {
    grid.innerHTML = '<div class="g-empty">사진을 불러오지 못했어요 😢</div>';
  }
}

/* ---------- 사진 크게 보기(모달) ---------- */
function openModal(url, name){
  const m = $('#photo-modal');
  $('#modal-img').src = url;
  $('#modal-name').textContent = name ? `📷 ${name}` : '';
  m.classList.add('open');
}
function closeModal(){ $('#photo-modal').classList.remove('open'); $('#modal-img').src=''; }

/* ---------- 방명록 ---------- */
async function loadGuestbook(){
  const list = $('#gb-list');
  try {
    const r = await fetch(`${API}/guestbook`);
    const { entries } = await r.json();
    if (!entries || !entries.length){
      list.innerHTML = '<div class="gb-empty">첫 번째 축하를 남겨주세요 🥳</div>';
      return;
    }
    // 스티커 종류: 일자 테이프, 하트, 별 빈티지 믹스
    const stickers = ['tape','🩷','⭐','tape','🤍','⭐','tape','🩷','⭐','🤍'];
    list.innerHTML = entries.map((e, i) => {
      const color = i % 4;
      const tilt  = i % 5;
      const sticker = stickers[i % stickers.length];
      return `
      <div class="gb-item" data-id="${e.id}" data-color="${color}" data-tilt="${tilt}" data-sticker="${sticker}">
        <button class="gb-del" title="삭제">✕</button>
        <span class="nm">${esc(e.name)}</span>
        <div class="ms">${esc(e.message)}</div>
        <div class="dt">${fmtDate(e.created_at)}</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.gb-del').forEach(b => b.addEventListener('click', (ev) => {
      const id = ev.target.closest('.gb-item').dataset.id;
      askDelete(id);
    }));
  } catch (e) {
    list.innerHTML = '<div class="gb-empty">불러오지 못했어요 😢</div>';
  }
}
async function askDelete(id){
  const pw = prompt('작성하실 때 입력한 비밀번호를 넣어주세요');
  if (pw === null) return;
  const r = await fetch(`${API}/guestbook`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password: pw }),
  });
  if (r.ok){ toast('삭제했어요'); loadGuestbook(); }
  else { const { error } = await r.json().catch(()=>({})); toast(error || '삭제 실패'); }
}

/* ============================================================
   화면 연결
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // (디자인 동작: reveal / Q&A / 계좌 / D-day 는 index.html 안에 있어요)

  // ----- 사진 업로드 -----
  const fileInput = $('#photo-file');
  const upBtn = $('#photo-upload-btn');
  upBtn.addEventListener('click', async () => {
    const name = $('#photo-name').value.trim();
    const contact = $('#photo-contact').value.trim();
    const files = Array.from(fileInput.files);
    if (!name){ toast('이름을 입력해주세요'); return; }
    if (!files.length){ toast('사진을 선택해주세요'); return; }
    upBtn.disabled = true; upBtn.textContent = `올리는 중… (0/${files.length}) ⏳`;
    let success = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadPhoto(files[i], name, contact);
        success++;
        upBtn.textContent = `올리는 중… (${success}/${files.length}) ⏳`;
      } catch (e) {
        toast(`${files[i].name} 실패: ${e.message}`);
      }
    }
    toast(`${success}장 올렸어요! 💕`);
    $('#photo-name').value=''; $('#photo-contact').value=''; fileInput.value='';
    $('#file-label').textContent = '사진 선택';
    upBtn.disabled = false; upBtn.textContent = '사진 올리기 📸';
  });
  fileInput.addEventListener('change', () => {
    const n = fileInput.files.length;
    $('#file-label').textContent = n ? `${n}장 선택됨` : '사진 선택';
  });

  // ----- 방명록 작성 -----
  $('#gb-submit').addEventListener('click', async () => {
    const name = $('#gb-name').value.trim();
    const message = $('#gb-msg').value.trim();
    const password = $('#gb-pw').value.trim();
    if (!name || !message || !password){ toast('이름·메시지·비밀번호를 모두 적어주세요'); return; }
    const r = await fetch(`${API}/guestbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message, password }),
    });
    if (r.ok){
      toast('축하 감사합니다! 💌');
      $('#gb-name').value=''; $('#gb-msg').value=''; $('#gb-pw').value='';
      loadGuestbook();
    } else {
      const { error } = await r.json().catch(()=>({}));
      toast(error || '등록 실패');
    }
  });

  // 모달 닫기
  $('#modal-close').addEventListener('click', closeModal);
  $('#photo-modal').addEventListener('click', (e) => { if (e.target.id === 'photo-modal') closeModal(); });

  // 첫 로드
  loadGallery();
  loadGuestbook();
});

/* ── 갤러리 드래그 스크롤 ── */
(function(){
  const el = document.getElementById('gallery-scroll');
  if (!el) return;
  let isDown = false, startX, scrollL;
  el.addEventListener('mousedown', e => { isDown = true; el.style.cursor='grabbing'; startX = e.pageX - el.offsetLeft; scrollL = el.scrollLeft; });
  el.addEventListener('mouseleave', () => { isDown = false; el.style.cursor='grab'; });
  el.addEventListener('mouseup', () => { isDown = false; el.style.cursor='grab'; });
  el.addEventListener('mousemove', e => { if(!isDown) return; e.preventDefault(); const x = e.pageX - el.offsetLeft; el.scrollLeft = scrollL - (x - startX) * 1.5; });
})();
