const prefixText = document.getElementById('prefix-text');
const checkBtn = document.getElementById('check-button');
const input = document.getElementById('subdomain-input');
const result = document.getElementById('result-message');
const requestBtn = document.getElementById('request-button');
const modal = document.getElementById('request-modal');
const backdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const requestForm = document.getElementById('request-form');
const formSubdomain = document.getElementById('form-subdomain');
const verificationButton = document.getElementById('verification-button');
const verificationStatus = document.getElementById('verification-status');
const submitRequestButton = document.getElementById('submit-request');
const formSubmitStatus = document.getElementById('form-submit-status');
const termsCheckbox = document.getElementById('terms-checkbox');
const applicantEmailInput = document.getElementById('applicant-email');

document.addEventListener('DOMContentLoaded', () => {
  const words = [
    'sub', 'cloud','universe','cactus','banana','lab',
    'train','muffin','mirror','ocean','bubble',
    'studio','turtle','noodle','island','storm','lantern'
  ];

  const roller = document.querySelector('.domain-roller');
  const currentEl = roller.querySelector('.current');
  const nextEl = roller.querySelector('.next');
  const sizeKeeper = roller.querySelector('.size-keeper');

  const syncWidth = (word, { immediate = false } = {}) => {
    const prevWidth = roller.getBoundingClientRect().width;

    sizeKeeper.textContent = word;
    roller.style.width = 'auto';
    const targetWidth = sizeKeeper.getBoundingClientRect().width;
    const targetWidthPx = `${Math.ceil(targetWidth)}px`;

    if (immediate) {
      const originalTransition = roller.style.transition;
      roller.style.transition = 'none';
      roller.style.width = targetWidthPx;
      void roller.offsetWidth;
      roller.style.transition = originalTransition;
      return;
    }

    roller.style.width = `${Math.ceil(prevWidth)}px`;
    void roller.offsetWidth;
    roller.style.width = targetWidthPx;
  };

  // 1️⃣ 애니메이션
  let currentWord = currentEl.textContent.trim();
  syncWidth(currentWord, { immediate: true });
  let isAnimating = false;

  function changeWord() {
    if (isAnimating) return;

    let newWord;
    do {
      newWord = words[Math.floor(Math.random() * words.length)];
    } while (newWord === currentWord);

    nextEl.textContent = newWord;
    syncWidth(newWord);
    roller.classList.add('animating');
    isAnimating = true;

    setTimeout(() => {
      currentEl.style.transition = 'none';
      nextEl.style.transition = 'none';

      currentEl.textContent = newWord;
      currentWord = newWord;

      roller.classList.remove('animating');
      nextEl.textContent = '';

      // force reflow so the browser applies the non-animated reset state
      void currentEl.offsetHeight;

      // re-enable transitions on the next frame so the reset doesn't animate
      requestAnimationFrame(() => {
        currentEl.style.transition = '';
        nextEl.style.transition = '';
      });

      isAnimating = false;
    }, 480);
  }

  setInterval(changeWord, 3000);
});

async function checkSubdomainAvailable(sub) {
  sub = sub.trim().toLowerCase().replace(/\.codz\.me$/, '');
  const url = `https://checkavailabilityofcodzsubdomainbycloudflaredoh.hjun7079.workers.dev/?name=${sub}.codz.me`;

  const res = await fetch(url, {
    headers: { 'accept': 'application/dns-json' }
  });

  // 예약어 차단이나 오류 처리
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (errData.error === 'BANNED_SUBDOMAIN') {
      return 'banned';
    }
    return 'error';
  }

  const data = await res.json();

  if (data.Status === 3) return 'available';   // NXDOMAIN
  if (data.Answer) return 'taken';            // 이미 존재
  return 'error';
}

let lastCheckedDomain = '';
let emailVerified = false;

const closeModal = () => {
  modal.hidden = true;
  backdrop.hidden = true;
};

const openModal = () => {
  if (!lastCheckedDomain) return;

  requestForm.reset();
  formSubmitStatus.textContent = '';
  verificationStatus.textContent = '';
  verificationButton.disabled = false;
  emailVerified = false;
  submitRequestButton.disabled = true;
  formSubdomain.value = lastCheckedDomain;
  modal.hidden = false;
  backdrop.hidden = false;
  modal.setAttribute('tabindex', '-1');
  modal.focus({ preventScroll: true });
};

const updateSubmitAvailability = () => {
  submitRequestButton.disabled = !(termsCheckbox.checked && emailVerified);
};

input.addEventListener('input', () => {
  requestBtn.disabled = true;
  lastCheckedDomain = '';
});

checkBtn.addEventListener('click', async () => {
  const sub = input.value.trim();
  if (!sub) {
    result.textContent = '서브도메인을 입력해주세요.';
    result.style.color = '#ff7d7d';
    return;
  }

  result.textContent = '확인 중...';
  result.style.color = '#aaa';

  try {
    const status = await checkSubdomainAvailable(sub);
    const normalized = sub.trim().toLowerCase().replace(/\.codz\.me$/, '');

    if (status === 'banned') {
      result.textContent = `${sub}.codz.me는 예약된 이름이라 사용할 수 없습니다.`;
      result.style.color = '#ff7d7d';
      requestBtn.disabled = true;
      lastCheckedDomain = '';
    } else if (status === 'available') {
      result.textContent = `${sub}.codz.me는 사용이 가능합니다`;
      result.style.color = '#7dff7d';
      lastCheckedDomain = normalized;
      requestBtn.disabled = false;
    } else if (status === 'taken') {
      result.textContent = `${sub}.codz.me 는 이미 사용 중입니다`;
      result.style.color = '#ff7d7d';
      requestBtn.disabled = true;
      lastCheckedDomain = '';
    } else {
      result.textContent = '확인 중 오류가 발생했습니다.';
      result.style.color = '#ff7d7d';
      requestBtn.disabled = true;
      lastCheckedDomain = '';
    }
  } catch (e) {
    console.error(e);
    result.textContent = '확인 중 오류가 발생했습니다.';
    result.style.color = '#ff7d7d';
    requestBtn.disabled = true;
    lastCheckedDomain = '';
  }
});

requestBtn.addEventListener('click', openModal);

modalClose.addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && !modal.hidden) {
    closeModal();
  }
});

termsCheckbox.addEventListener('change', updateSubmitAvailability);

verificationButton.addEventListener('click', async () => {
  const email = applicantEmailInput.value.trim();
  const subdomain = formSubdomain.value.trim();

  if (!email) {
    verificationStatus.textContent = '이메일을 입력한 후 다시 시도하세요.';
    verificationStatus.style.color = '#ff7d7d';
    return;
  }

  verificationButton.disabled = true;
  verificationStatus.textContent = '인증 메일을 발송 중입니다...';
  verificationStatus.style.color = '#aaa';

  try {
    const url = `https://dry-feather-f1e0.hjun7079.workers.dev/request?email=${encodeURIComponent(email)}&subdomain=${encodeURIComponent(subdomain)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok) {
      const mailApiUrl = 'https://codz-sub-mailer.hjun7079.workers.dev';
      await fetch(mailApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: '[Codz Subdomain] 이메일 인증 링크',
          html: `<p>아래 링크를 클릭해 인증을 완료해주세요:</p>
                <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        }),
      });
      verificationStatus.textContent = '📨 인증 메일을 발송했습니다. 메일의 링크를 눌러 신청을 완료하세요.';
      verificationStatus.style.color = '#7dff7d';
      emailVerified = true;
      updateSubmitAvailability();
    } else {
      verificationStatus.textContent = `오류: ${data.error}`;
      verificationStatus.style.color = '#ff7d7d';
      verificationButton.disabled = false;
    }
  } catch (e) {
    console.error(e);
    verificationStatus.textContent = '메일 발송 중 오류가 발생했습니다.';
    verificationStatus.style.color = '#ff7d7d';
    verificationButton.disabled = false;
  }
});

requestForm.addEventListener('submit', async (evt) => {
  evt.preventDefault();
  if (submitRequestButton.disabled) return;

  const payload = {
    subdomain: formSubdomain.value.trim(),
    email: applicantEmailInput.value.trim(),
    name: document.getElementById('applicant-name').value.trim(),
    studentId: document.getElementById('applicant-id').value.trim(),
    siteUrl: document.getElementById('site-url').value.trim(),
    usagePurpose: document.getElementById('usage-purpose').value.trim(),
    usageAudience: document.getElementById('usage-audience').value.trim(),
    usagePeriod: document.getElementById('usage-period').value.trim(),
  };

  formSubmitStatus.textContent = '제출 중입니다...';
  formSubmitStatus.style.color = '#aaa';

  try {
    const res = await fetch('https://dry-feather-f1e0.hjun7079.workers.dev/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.ok) {
      formSubmitStatus.textContent = '신청이 정상적으로 접수되었습니다.';
      formSubmitStatus.style.color = '#7dff7d';
      setTimeout(closeModal, 1800);
    } else {
      formSubmitStatus.textContent = `오류: ${data.error}`;
      formSubmitStatus.style.color = '#ff7d7d';
    }
  } catch (e) {
    console.error(e);
    formSubmitStatus.textContent = '제출 중 오류가 발생했습니다.';
    formSubmitStatus.style.color = '#ff7d7d';
  }
});