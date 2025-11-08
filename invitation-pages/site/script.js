// Simple client-side logic for RSVP form.
(function(){
  const cfgPath = 'config.json';
  let config = { apiEndpoint: '', deadline: '202X-XX-XX', eventDateISO: '' };

  function $(id){ return document.getElementById(id); }

  async function loadConfig(){
    try{
      const res = await fetch(cfgPath);
      if(res.ok) config = await res.json();
    }catch(e){ /* ignore, use defaults */ }
    $('deadline-date').textContent = config.deadline || '未設定';
    // show event date if available
    const eventDateEl = document.getElementById('event-date');
    if(eventDateEl && config.eventDateISO){
      try{
        const d = new Date(config.eventDateISO);
        if(!isNaN(d)) {
          // Format as YYYY.M.D (no leading zeros)
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          const day = d.getDate();
          eventDateEl.textContent = `${year}.${month}.${day}`;
        }
      }catch(e){}
    }
    // initialize countdown
    initCountdown(config.eventDateISO || config.deadline);
  }

  function showMessage(text, isError){
    const el = $('response');
    el.textContent = text;
    el.style.color = isError ? 'crimson' : 'green';
  }

  function collectForm(){
    const form = document.getElementById('rsvp-form');
    const data = new FormData(form);
    const obj = {};
    for(const [k,v] of data.entries()) obj[k] = v;
    // radio attendance may be missing; ensure present
    const att = form.querySelector('input[name="attendance"]:checked');
    obj.attendance = att ? att.value : '';
    return obj;
  }

  function validate(form){
    // rely on HTML5 required + simple email check
    const email = $('email').value.trim();
    if(!email) return 'メールアドレスを入力してください。';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '有効なメールアドレスを入力してください。';
    if(!$('name').value.trim()) return 'お名前を入力してください。';
    if(!$('kana').value.trim()) return 'ふりがなを入力してください。';
    if(!document.querySelector('input[name="attendance"]:checked')) return 'ご出席/ご欠席を選択してください。';
    return '';
  }

  async function submitForm(e){
    e.preventDefault();
    const err = validate();
    if(err){ showMessage(err, true); return; }
    const payload = collectForm();
    $('submit').disabled = true;
    showMessage('送信中…');
    // Must have an API endpoint configured that fronts the Lambda (API Gateway)
    if(!config.apiEndpoint){
      showMessage('送信先が設定されていません。config.json の "apiEndpoint" に API Gateway の URL を設定してください。', true);
      $('submit').disabled = false;
      return;
    }

    try{
      const res = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Attempt to parse JSON response when possible
      let data = null;
      const text = await res.text();
      try{ data = text ? JSON.parse(text) : null; }catch(e){ data = null; }

      if(res.ok){
        const message = (data && data.message) ? data.message : 'ご回答ありがとうございます。送信が完了しました。';
        showMessage(message);
        document.getElementById('rsvp-form').reset();
      }else{
        const errMsg = (data && data.error) ? data.error : (text || res.status);
        showMessage('送信に失敗しました: ' + errMsg, true);
      }
    }catch(err){
      console.error('Submit error:', err);
      showMessage('送信中にエラーが発生しました。ネットワークを確認してください。', true);
    }finally{
      $('submit').disabled = false;
    }
  }

  // --- Countdown utility ---
  let countdownTimer = null;
  function parseDateLike(input){
    // accepts ISO or 'YYYY年MM月DD日' or plain YYYY-MM-DD
    if(!input) return null;
    // try ISO first
    const asISO = new Date(input);
    if(!isNaN(asISO)) return asISO;
    // try extracting numbers
    const m = input.match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);
    if(m){ return new Date(Number(m[1]), Number(m[2])-1, Number(m[3])); }
    return null;
  }

  function initCountdown(dateInput){
    const container = document.getElementById('countdown');
    if(!container) return;
    const target = parseDateLike(dateInput);
    if(!target) { container.style.display = 'none'; return; }

    function tick(){
      const now = new Date();
      let diff = Math.max(0, target - now);
      const days = Math.floor(diff / (1000*60*60*24));
      diff -= days * (1000*60*60*24);
      const hours = Math.floor(diff / (1000*60*60));
      diff -= hours * (1000*60*60);
      const mins = Math.floor(diff / (1000*60));
      diff -= mins * (1000*60);
      const secs = Math.floor(diff / 1000);

      // アニメーション付きで数字を更新する関数
      function updateNumber(id, newValue, prevValue) {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(newValue)) {
          el.classList.add('flip');
          setTimeout(() => {
            el.textContent = String(newValue).padStart(2,'0');
            setTimeout(() => el.classList.remove('flip'), 100);
          }, 150);
        }
      }

      // 前回の値を保存して比較
      if (!tick.prev) tick.prev = {days: -1, hours: -1, mins: -1, secs: -1};
      
      updateNumber('cd-days', days, tick.prev.days);
      updateNumber('cd-hours', String(hours).padStart(2,'0'), tick.prev.hours);
      updateNumber('cd-mins', String(mins).padStart(2,'0'), tick.prev.mins);
      updateNumber('cd-secs', String(secs).padStart(2,'0'), tick.prev.secs);

      tick.prev = {days, hours, mins, secs};

      // 日付が0になったら表示を変更
      if (diff <= 0) {
        document.getElementById('countdown').innerHTML = '<div class="countdown-item special"><span class="num">Happy</span><span class="label">Wedding Day!</span></div>';
      }
    }

    tick();
    if(countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000); // 1秒ごとに更新
  }

  // Add-to-calendar (Google Calendar) helper
  function makeGoogleCalendarLink(){
    // use calendar fields from config if present
    const title = encodeURIComponent((document.querySelector('.couple')?.textContent?.trim() || '') + " Wedding");
    const cal = config.calendar || {};
    // Google Calendar expects dates in YYYYMMDDTHHMMSSZ or YYYYMMDD format for all-day
    function toGCalDatetime(iso){
      if(!iso) return '';
      // ensure UTC 'Z' suffix for simplicity
      const d = new Date(iso);
      if(isNaN(d)) return '';
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth()+1).padStart(2,'0');
      const dd = String(d.getUTCDate()).padStart(2,'0');
      const hh = String(d.getUTCHours()).padStart(2,'0');
      const mi = String(d.getUTCMinutes()).padStart(2,'0');
      const ss = String(d.getUTCSeconds()).padStart(2,'0');
      return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
    }

    const start = toGCalDatetime(cal.start || config.eventDateISO || '');
    const end = toGCalDatetime(cal.end || '');
    if(!start) return '#';
    const dates = end ? `${start}/${end}` : `${start}/${start}`;
    const details = encodeURIComponent(cal.description || 'Invitation');
    const location = encodeURIComponent(cal.location || '');
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    return url;
  }

  // Scroll animation for sections
  function handleScrollAnimation() {
    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      if (sectionTop < windowHeight * 0.85) { // Show when 85% visible
        section.classList.add('is-visible');
      }
    });
  }

  // ヒーローイメージのスライドショー
  function initHeroSlideshow() {
    const heroWrappers = document.querySelectorAll('.hero-img-wrapper');
    // 画像が1枚以下の場合はスライドショーを実行しない
    if (heroWrappers.length <= 1) return;

    let currentImageIndex = 0;
    let isAnimating = false;

    function showNextImage() {
      if (isAnimating) return;
      isAnimating = true;

      const currentWrapper = heroWrappers[currentImageIndex];
      const nextIndex = (currentImageIndex + 1) % heroWrappers.length;
      const nextWrapper = heroWrappers[nextIndex];

      nextWrapper.classList.add('active');
      
      setTimeout(() => {
        currentWrapper.classList.remove('active');
        currentImageIndex = nextIndex;
        isAnimating = false;
      }, 100); // CSSのトランジション時間と同じ
    }

    // 最初の画像を表示
    heroWrappers[0].classList.add('active');
    
    // 4.5秒ごとに画像を切り替え
    setInterval(showNextImage, 8000); // 表示時間(3s) + トランジション時間(1.5s)
  }

  // Photo Slider functionality
  function initPhotoSlider() {
    const slider = document.querySelector('.photo-slider');
    const prevBtn = document.querySelector('.slider-nav.prev');
    const nextBtn = document.querySelector('.slider-nav.next');

    if (!slider || !prevBtn || !nextBtn) return;

    const slideWidth = window.innerWidth < 768 ? 260 : 300; // width + gap
    
    function scrollToNext() {
      slider.scrollBy({ left: slideWidth, behavior: 'smooth' });
    }

    function scrollToPrev() {
      slider.scrollBy({ left: -slideWidth, behavior: 'smooth' });
    }

    nextBtn.addEventListener('click', scrollToNext);
    prevBtn.addEventListener('click', scrollToPrev);

    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') scrollToNext();
      if (e.key === 'ArrowLeft') scrollToPrev();
    });

    if ('ontouchstart' in window) {
      slider.style.webkitOverflowScrolling = 'touch';
    }
  }

  // --- DOMContentLoaded: ページの読み込み完了後に各種機能を初期化 ---
  document.addEventListener('DOMContentLoaded', ()=>{
    loadConfig();
    initHeroSlideshow(); // ヒーロースライドショーを初期化
    initPhotoSlider();  // フォトスライダーを初期化

    const form = document.getElementById('rsvp-form');
    form.addEventListener('submit', submitForm);

    const cal = document.getElementById('calendar-btn');
    if(cal){ cal.addEventListener('click', e=>{ e.preventDefault(); const href = makeGoogleCalendarLink(); if(href!=='#') window.open(href,'_blank'); }); }

    const mapBtn = document.getElementById('map-btn');
    if(mapBtn){ mapBtn.addEventListener('click', ()=>{ location.hash = '#map'; }); }

    // スクロールアニメーションを初期化
    handleScrollAnimation();
    window.addEventListener('scroll', handleScrollAnimation);

    // --- Scroll-triggered GIF reload without white flash ---
    // Strategy: Preload a cache-busted URL off-DOM, then swap src only after it's decoded.
    // This avoids showing a blank/placeholder frame between restarts.
    (function initScrollReplayGif(){
      const el = document.getElementById('message-gif');
      if(!el || !el.dataset.src) return;
      // If this is the very first render and src is empty (or same as page), keep placeholder from HTML.
      function bust(url){ return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(); }

      const observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            if(el.dataset.playing === '1') return; // already started during this visibility window
            el.dataset.playing = '1';
            const nextUrl = bust(el.dataset.src);
            const pre = new Image();
            pre.decoding = 'sync';
            pre.onload = ()=>{
              // Only swap after decode to prevent flash
              el.src = nextUrl;
            };
            pre.src = nextUrl;
          } else {
            el.dataset.playing = '0';
          }
        });
      }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });
      observer.observe(el);
    })();
  });

})();