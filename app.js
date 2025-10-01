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
const recordList = document.getElementById('record-list');
const addRecordButton = document.getElementById('add-record');
const recordTemplate = document.getElementById('record-template');
const platformSelect = document.getElementById('platform-select');
const platformGuidance = document.getElementById('platform-guidance');
const platformGuidanceTitle = platformGuidance?.querySelector('strong') || null;
const platformGuidanceBody = platformGuidance?.querySelector('p') || null;

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

  setInterval(changeWord, 2000);
});

async function checkSubdomainAvailable(sub) {
  sub = sub.trim().toLowerCase().replace(/\.codz\.me$/, '');
  const preurl = new URL(`https://checkavailabilityofcodzsubdomainbycloudflaredoh.hjun7079.workers.dev/?name=${sub}.codz.me`.trim());
  const url = preurl.toString();
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

const platformGuides = {
  netlify: {
    title: 'Netlify 설정',
    body: '서브도메인은 CNAME 레코드로 your-site.netlify.app 을 가리키고, 루트 도메인은 A 레코드 두 개 (75.2.60.5, 99.83.190.102)를 권장합니다.',
  },
  cloudflare: {
    title: 'Cloudflare Pages / Workers',
    body: 'Pages 프로젝트는 CNAME 레코드로 your-project.pages.dev 에 연결하세요. DNS에서 A 레코드(예:192.0.2.1) 더미 값을 작성하고 Cloudflare Routing에서 서브도메인 → Worker 매핑을 해야 동작하므로 Cloudflare의 상세 안내를 확인하세요.',
  },
  vercel: {
    title: 'Vercel 설정',
    body: '서브도메인은 CNAME 레코드로 cname.vercel-dns.com 을 설정합니다.',
  },
  github: {
    title: 'GitHub Pages 설정',
    body: 'CNAME 레코드로 username.github.io 를 가리키세요. 조직/프로젝트 페이지도 동일한 형식을 사용합니다.',
  },
  other: {
    title: '기타 / 직접 설정',
    body: '사용 중인 서비스에서 커스텀 도메인 안내에 적힌 CNAME 또는 A 레코드 값을 그대로 입력하면 됩니다. 필요한 IP/도메인 값을 다시 확인하세요.',
  },
};

const hidePlatformGuidance = () => {
  if (!platformGuidance) return;
  platformGuidance.hidden = true;
  if (platformGuidanceTitle) platformGuidanceTitle.textContent = '';
  if (platformGuidanceBody) platformGuidanceBody.textContent = '';
};

const showPlatformGuidance = (key) => {
  if (!platformGuidance || !platformGuidanceTitle || !platformGuidanceBody) return;
  const guide = platformGuides[key];
  if (!guide) {
    hidePlatformGuidance();
    return;
  }
  platformGuidanceTitle.textContent = guide.title;
  platformGuidanceBody.textContent = guide.body;
  platformGuidance.hidden = false;
};

const getRecordRows = () => {
  if (!recordList) return [];
  return Array.from(recordList.querySelectorAll('[data-record]'));
};

const syncRecordRemoveButtons = () => {
  const rows = getRecordRows();
  rows.forEach((row) => {
    const removeBtn = row.querySelector('.remove-record');
    if (removeBtn) {
      removeBtn.hidden = rows.length <= 1;
    }
  });
};

const resetRecordGroup = () => {
  const rows = getRecordRows();
  if (!rows.length) return;

  rows.forEach((row, index) => {
    const typeField = row.querySelector('.record-type');
    const targetField = row.querySelector('.record-target');
    if (typeField) typeField.value = '';
    if (targetField) targetField.value = '';
    if (index > 0) {
      row.remove();
    }
  });

  syncRecordRemoveButtons();
};

const resetPlatformHelper = () => {
  if (!platformSelect) return;
  platformSelect.value = '';
  hidePlatformGuidance();
};

const getRecordEntries = () => {
  const rows = getRecordRows();
  return rows
    .map((row) => {
      const typeField = row.querySelector('.record-type');
      const targetField = row.querySelector('.record-target');
      return {
        type: (typeField?.value || '').trim(),
        value: (targetField?.value || '').trim(),
      };
    })
    .filter((entry) => entry.type && entry.value);
};

if (recordList) {
  syncRecordRemoveButtons();
}

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
  resetRecordGroup();
  resetPlatformHelper();
  if (submitRequestButton) {
    submitRequestButton.disabled = true;
  }
  formSubdomain.value = lastCheckedDomain;
  modal.hidden = false;
  backdrop.hidden = false;
  modal.setAttribute('tabindex', '-1');
  modal.focus({ preventScroll: true });
};

const updateSubmitAvailability = () => {
  if (!submitRequestButton) return;
  submitRequestButton.disabled = !(termsCheckbox.checked && emailVerified);
};

const invalidateVerification = () => {
  if (!emailVerified) return;
  emailVerified = false;
  updateSubmitAvailability();
};

if (addRecordButton && recordTemplate && recordList) {
  addRecordButton.addEventListener('click', () => {
    const fragment = recordTemplate.content.cloneNode(true);
    const newRow = fragment.querySelector('[data-record]');
    if (!newRow) return;
    recordList.appendChild(newRow);
    syncRecordRemoveButtons();
    invalidateVerification();
  });
}

if (recordList) {
  recordList.addEventListener('click', (evt) => {
    const removeBtn = evt.target.closest('.remove-record');
    if (!removeBtn) return;
    const row = removeBtn.closest('[data-record]');
    if (!row) return;
    const rows = getRecordRows();
    if (rows.length <= 1) return;
    row.remove();
    syncRecordRemoveButtons();
    invalidateVerification();
  });

  const recordChangeHandler = (evt) => {
    if (!evt.target.closest('[data-record]')) return;
    invalidateVerification();
  };

  recordList.addEventListener('input', recordChangeHandler);
  recordList.addEventListener('change', recordChangeHandler);
}

if (platformSelect) {
  platformSelect.addEventListener('change', (evt) => {
    const key = evt.target.value;
    if (!key) {
      hidePlatformGuidance();
      return;
    }
    showPlatformGuidance(key);
  });
}

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

applicantEmailInput.addEventListener('input', () => {
  const email = applicantEmailInput.value.trim().toLowerCase();
  if (!email || email.endsWith('@dimigo.hs.kr')) {
    applicantEmailInput.setCustomValidity('');
  } else {
    applicantEmailInput.setCustomValidity('디미고 이메일(@dimigo.hs.kr)만 사용할 수 있습니다.');
  }

  invalidateVerification();
});

// verificationButton.addEventListener('click', ...) 내부만 교체
verificationButton.addEventListener('click', async () => {
  const email = applicantEmailInput.value.trim();
  const subdomain = formSubdomain.value.trim();
  const records = getRecordEntries();
  const primaryRecord = records[0] || { type: '', value: '' };
  const recordType = primaryRecord.type;
  const recordValue = primaryRecord.value;
  const previewUrl = document.getElementById('site-url').value.trim();
  const purpose = document.getElementById('usage-purpose').value.trim();
  const audience = document.getElementById('usage-audience').value.trim();
  const period = document.getElementById('usage-period').value;

  emailVerified = false;
  updateSubmitAvailability();

  if (!requestForm.reportValidity()) {
    verificationStatus.textContent = '모든 필수 항목을 입력한 후 다시 시도하세요.';
    verificationStatus.style.color = '#ff7d7d';
    return;
  }

  if (!email.toLowerCase().endsWith('@dimigo.hs.kr')) {
    verificationStatus.textContent = '디미고 이메일(@dimigo.hs.kr)만 사용할 수 있습니다.';
    verificationStatus.style.color = '#ff7d7d';
    applicantEmailInput.focus();
    return;
  }

  if (!subdomain) {
    verificationStatus.textContent = '서브도메인을 먼저 확인해주세요.';
    verificationStatus.style.color = '#ff7d7d';
    return;
  }

  if (!records.length) {
    verificationStatus.textContent = '연결할 레코드를 최소 1개 이상 입력해주세요.';
    verificationStatus.style.color = '#ff7d7d';
    return;
  }

  verificationButton.disabled = true;
  verificationStatus.textContent = '인증 메일을 발송 중입니다...';
  verificationStatus.style.color = '#aaa';

  try {
    const payload = {
      studentId: document.getElementById('applicant-id').value.trim(),
      name: document.getElementById('applicant-name').value.trim(),
      email,
      subdomain,
      recordType,
      recordValue,
      records,
      previewUrl,
      purpose,
      audience,
      period,
    };

    const res = await fetch('https://codz-sub-verify.hjun7079.workers.dev/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      verificationStatus.textContent = '📨 인증 메일을 발송했습니다. 메일의 링크를 눌러 신청을 완료하세요.';
      verificationStatus.style.color = '#7dff7d';
      emailVerified = true;
      updateSubmitAvailability();
    } else {
      verificationStatus.textContent = `오류: ${data.error || '메일 발송 실패'}`;
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
  if (!submitRequestButton) {
    if (formSubmitStatus) {
      formSubmitStatus.textContent = '현재 온라인 신청은 이용할 수 없습니다.';
      formSubmitStatus.style.color = '#ff7d7d';
    }
    return;
  }
  if (submitRequestButton.disabled) return;

  const records = getRecordEntries();
  if (!records.length) {
    formSubmitStatus.textContent = '연결할 레코드를 최소 1개 이상 입력해주세요.';
    formSubmitStatus.style.color = '#ff7d7d';
    return;
  }
  const primaryRecord = records[0];

  const payload = {
    subdomain: formSubdomain.value.trim(),
    email: applicantEmailInput.value.trim(),
    name: document.getElementById('applicant-name').value.trim(),
    studentId: document.getElementById('applicant-id').value.trim(),
    siteUrl: document.getElementById('site-url').value.trim(),
    usagePurpose: document.getElementById('usage-purpose').value.trim(),
    usageAudience: document.getElementById('usage-audience').value.trim(),
    usagePeriod: document.getElementById('usage-period').value.trim(),
    recordType: primaryRecord.type,
    recordValue: primaryRecord.value,
    records,
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
