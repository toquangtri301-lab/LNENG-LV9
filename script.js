
const levels = ["a1", "a2", "b1", "b2", "c1", "c2"];
const levelNames = { a1: "A1", a2: "A2", b1: "B1", b2: "B2", c1: "C1", c2: "C2" };
const modeNames = { vocabulary: "Phản xạ Từ vựng", communication: "Phản xạ Giao tiếp" };
const topicLabels = {
  all: "Tất cả chủ đề",
  daily: "Đời sống hằng ngày",
  study: "Học tập",
  work: "Công việc",
  travel: "Di chuyển & dịch vụ",
  social: "Xã giao & cảm xúc",
  planning: "Kế hoạch & phối hợp",
  business: "Kinh doanh & khách hàng",
  analysis: "Phân tích & thảo luận"
};

const state = {
  mode: "vocabulary",
  level: "a1",
  view: "practice",
  topic: "all",
  autoAdvance: true,
  currentItem: null,
  countdown: null,
  countdownValue: 5,
  pauseTimer: null,
  autoNextTimer: null,
  runToken: 0,
  queueKey: "",
  queue: [],
  queuePos: 0,
  currentQueueNumber: 0,
  settings: { ...(window.APP_CONFIG?.tts || {}) },
  audioElement: null,
  speechFallbackTimer: null,
  audioUnlocked: false,
  cacheEnabled: true
};

const elements = {
  levelGrid: document.getElementById("levelGrid"),
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
  appTabButtons: Array.from(document.querySelectorAll(".app-tab-btn")),
  practiceTabPanel: document.getElementById("practiceTabPanel"),
  voiceTabPanel: document.getElementById("voiceTabPanel"),
  topicSelect: document.getElementById("topicSelect"),
  activeModeLabel: document.getElementById("activeModeLabel"),
  activeLevelLabel: document.getElementById("activeLevelLabel"),
  activeTopicBadge: document.getElementById("activeTopicBadge"),
  meaningText: document.getElementById("meaningText"),
  meaningPanel: document.getElementById("meaningPanel"),
  countdownWrap: document.getElementById("countdownWrap"),
  countdownNumber: document.getElementById("countdownNumber"),
  answerArea: document.getElementById("answerArea"),
  hanziText: document.getElementById("hanziText"),
  ipaText: document.getElementById("ipaText"),
  progressText: document.getElementById("progressText"),
  totalText: document.getElementById("totalText"),
  statusBar: document.getElementById("statusBar"),
  startBtn: document.getElementById("startBtn"),
  nextBtn: document.getElementById("nextBtn"),
  autoAdvanceBtn: document.getElementById("autoAdvanceBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  repeatBtn: document.getElementById("repeatBtn"),
  ttsProvider: document.getElementById("ttsProvider"),
  proxyUrl: document.getElementById("proxyUrl"),
  voiceId: document.getElementById("voiceId"),
  modelId: document.getElementById("modelId"),
  saveVoiceSettings: document.getElementById("saveVoiceSettings"),
  practiceStage: document.getElementById("practiceStage")
};

function getBaseDataset() {
  return window.PRACTICE_DATA?.[state.mode]?.[state.level] || [];
}

function inferTopic(item, mode = state.mode) {
  const haystack = `${item?.hanzi || ""} ${item?.meaning || ""}`.toLowerCase();

  if (mode === "vocabulary") {
    if (/(book|pen|pencil|notebook|class|school|teacher|student|study|learn|homework|lesson|course|training|skill|exam|paper|desk|classroom)/.test(haystack)) return "study";
    if (/(office|manager|team|meeting|report|project|schedule|customer|client|colleague|proposal|policy|workflow|strategy|product|support|market|business|partner|stakeholder)/.test(haystack)) return "work";
    if (/(airport|station|hotel|travel|trip|ticket|passport|flight|reservation|taxi|bus|train|map|tour|lobby|front desk)/.test(haystack)) return "travel";
    if (/(coffee|tea|milk|juice|rice|bread|noodles|soup|egg|fish|chicken|fruit|apple|banana|orange|restaurant|cafe|menu|water|bottle|plate)/.test(haystack)) return "daily";
    if (/(mother|father|brother|sister|friend|family|people|child|customer|guest|visitor)/.test(haystack)) return "social";
    if (/(happy|sad|busy|free|stress|calm|angry|sorry|afraid|confident|mood|feeling)/.test(haystack)) return "social";
    if (/(price|budget|cost|sale|marketing|brand|value|revenue|profit|negotiation|contract|launch|conversion)/.test(haystack)) return "business";
    if (/(ethical|assumption|framework|analysis|narrative|methodology|premise|ambiguity|precision|trade-off|legitimacy|discourse|conceptual)/.test(haystack)) return "analysis";
    return "daily";
  }

  if (/(airport|station|hotel|travel|trip|ticket|passport|flight|reservation|taxi|bus|train|map|tour|lobby|front desk|restaurant|cafe|menu|check in|driver|waiter|receptionist|supermarket|market)/.test(haystack)) return "travel";
  if (/(class|school|teacher|student|study|learn|lesson|exam|course|classmate|training|practice|homework)/.test(haystack)) return "study";
  if (/(manager|team|meeting|report|project|client|customer|proposal|policy|workflow|strategy|product|support|partner|stakeholder|deadline|performance|launch|marketing|user|public|negotiation|resource|outcome|priority)/.test(haystack)) return "work";
  if (/(plan|schedule|before|after|time|arrange|prepare|organize|next week|this week|deadline|goal|coordinate|prioritize|step|timeline)/.test(haystack)) return "planning";
  if (/(happy|sad|stress|pressure|calm|confident|trust|care|support|sorry|thank|welcome|feel|opinion|agree|disagree|friend|family)/.test(haystack)) return "social";
  if (/(price|budget|cost|sale|marketing|brand|value|revenue|profit|negotiation|contract|conversion|customer satisfaction|retention|delivery speed|operating cost)/.test(haystack)) return "business";
  if (/(assumption|framework|analysis|narrative|methodology|premise|ambiguity|precision|trade-off|legitimacy|discourse|conceptual|evidence|claim|theory|normative|institution|uncertainty|argument|baseline|synthesis|rationale|ethical)/.test(haystack)) return "analysis";
  return "daily";
}

function getAvailableTopics() {
  const counts = new Map();
  getBaseDataset().forEach((item) => {
    const topic = inferTopic(item, state.mode);
    counts.set(topic, (counts.get(topic) || 0) + 1);
  });
  return ["all", ...Object.keys(topicLabels).filter((key) => key !== "all" && counts.get(key))];
}

function getDataset() {
  const base = getBaseDataset();
  if (state.topic === "all") return base;
  const filtered = base.filter((item) => inferTopic(item, state.mode) === state.topic);
  return filtered.length ? filtered : base;
}

function currentQueueKey() { return `${state.mode}:${state.level}:${state.topic}`; }

function persistSettings() {
  const payload = { ...state.settings, autoAdvance: state.autoAdvance, topic: state.topic };
  localStorage.setItem("english-reflex-settings", JSON.stringify(payload));
}

function canUseAudioCache() {
  return state.cacheEnabled && typeof window !== "undefined" && "caches" in window;
}

async function buildAudioCacheKey({ text, voiceId, modelId, languageCode }) {
  const payload = JSON.stringify({
    provider: "proxy",
    proxyUrl: state.settings.proxyUrl || "",
    voiceId: voiceId || "",
    modelId: modelId || "",
    languageCode: languageCode || "en",
    text: text || ""
  });

  if (window.crypto?.subtle && window.TextEncoder) {
    const encoded = new TextEncoder().encode(payload);
    const digest = await window.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  return btoa(unescape(encodeURIComponent(payload))).replace(/[^a-z0-9]/gi, "").slice(0, 80);
}

async function getCachedAudioBlob(cacheKey) {
  if (!canUseAudioCache() || !cacheKey) return null;
  try {
    const cache = await caches.open("english-reflex-audio-v1");
    const request = new Request(`${window.location.origin}/__tts_cache__/${cacheKey}`);
    const response = await cache.match(request);
    if (!response) return null;
    return await response.blob();
  } catch (error) {
    console.warn("Cannot read cached audio", error);
    return null;
  }
}

async function saveAudioBlobToCache(cacheKey, blob) {
  if (!canUseAudioCache() || !cacheKey || !blob) return;
  try {
    const cache = await caches.open("english-reflex-audio-v1");
    const request = new Request(`${window.location.origin}/__tts_cache__/${cacheKey}`);
    const response = new Response(blob, {
      headers: { "Content-Type": blob.type || "audio/mpeg" }
    });
    await cache.put(request, response);
  } catch (error) {
    console.warn("Cannot save cached audio", error);
  }
}

function attachAudioLifecycle(audio, { autoAdvance, runToken }) {
  audio.onended = () => {
    if (runToken !== state.runToken) return;
    if (audio.dataset.round === "1") {
      setStatus("Nghỉ 2 giây trước lần đọc thứ hai.");
      state.pauseTimer = window.setTimeout(() => {
        if (runToken !== state.runToken) return;
        audio.currentTime = 0;
        audio.playbackRate = 0.8;
        audio.dataset.round = "2";
        setStatus("Đang đọc lần 2 với tốc độ 0.8.");
        audio.play().catch((error) => {
          console.warn("Cached audio second pass failed", error);
          if (autoAdvance) queueAutoNext(runToken);
          else setStatus("Hoàn tất lượt nghe. Bạn có thể bấm Câu tiếp theo hoặc Nghe lại.");
        });
      }, 2000);
    } else if (autoAdvance) {
      queueAutoNext(runToken);
    } else {
      setStatus("Hoàn tất lượt nghe. Bạn có thể bấm Câu tiếp theo hoặc Nghe lại.");
    }
  };
}

function createAudioFromBlob(blob, { autoAdvance, runToken }) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.preservesPitch = true;
  audio.dataset.url = url;
  audio.dataset.round = "1";
  audio.playbackRate = 1;
  attachAudioLifecycle(audio, { autoAdvance, runToken });
  state.audioElement = audio;
  return audio;
}

function hydrateSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("english-reflex-settings") || "null");
    if (saved && typeof saved === "object") {
      state.settings = { ...state.settings, ...saved };
      state.autoAdvance = typeof saved.autoAdvance === "boolean" ? saved.autoAdvance : state.autoAdvance;
      state.topic = typeof saved.topic === "string" ? saved.topic : state.topic;
    }
  } catch (error) {
    console.warn("Cannot parse saved settings", error);
  }
}

function fillVoiceSettingsForm() {
  elements.ttsProvider.value = state.settings.provider || "browser";
  elements.proxyUrl.value = state.settings.proxyUrl || "";
  elements.voiceId.value = state.settings.voiceId || "";
  elements.modelId.value = state.settings.modelId || "eleven_multilingual_v2";
}

function updateViewTabs() {
  elements.appTabButtons.forEach((button) => {
    const active = button.dataset.view === state.view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  elements.practiceTabPanel.classList.toggle("active", state.view === "practice");
  elements.voiceTabPanel.classList.toggle("active", state.view === "voice");
}

function shuffleArray(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function updateProgress() {
  const total = getDataset().length;
  const current = total ? Math.min(state.currentQueueNumber, total) : 0;
  const unitLabel = state.mode === "vocabulary" ? "từ" : "câu";
  elements.progressText.textContent = `Tiến độ: ${current} / ${total}`;
  elements.totalText.textContent = `Tổng số ${unitLabel}: ${total}`;
}

function getContentLayoutClasses(item) {
  const classes = [];
  const levelOrder = levels.indexOf(state.level);
  const isHighLevelCommunication = state.mode === "communication" && levelOrder >= 3;
  if (isHighLevelCommunication) classes.push("compact-communication");
  if (!item) return classes;

  const mainLength = (item.hanzi || "").replace(/\s+/g, " ").trim().length;
  const subLength = (item.pinyin || "").replace(/\s+/g, " ").trim().length;
  const meaningLength = getDisplayedMeaning(item).trim().length;

  if (mainLength >= 48 || subLength >= 54 || meaningLength >= 56) classes.push("long-content");
  if (mainLength >= 74 || subLength >= 78 || meaningLength >= 84) classes.push("extra-long-content");
  return classes;
}

function applyContentLayout(item) {
  if (!elements.practiceStage) return;
  elements.practiceStage.classList.remove("compact-communication", "long-content", "extra-long-content");
  getContentLayoutClasses(item).forEach((className) => elements.practiceStage.classList.add(className));
}

function capitalizeSentence(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function naturalizeMeaningText(text) {
  let result = (text || "").trim();

  const replacements = [
    [/\bnói kèm điều kiện cho nhận định thay vì trình bày nó như chân lý phổ quát\b/gi, "nói một nhận định theo cách thận trọng hơn, thay vì coi nó như chân lý chung"],
    [/\bgiải cấu trúc tiền đề trước khi bảo vệ kết luận\b/gi, "gỡ lại giả định ban đầu trước khi bảo vệ kết luận"],
    [/\bgỡ rối tương quan với quan hệ nhân quả\b/gi, "tách sự trùng hợp khỏi quan hệ nguyên nhân - kết quả"],
    [/\bđịnh khung lại bế tắc như một vấn đề của các động lực cạnh tranh\b/gi, "nhìn lại bế tắc như hệ quả của nhiều lợi ích xung đột"],
    [/\bchắt lọc lập luận về dạng dễ bảo vệ nhất\b/gi, "rút gọn lập luận về phần vững nhất"],
    [/\blàm dịu giọng điệu mà không làm yếu lập luận cốt lõi\b/gi, "hạ giọng xuống mà không làm yếu ý chính"],
    [/\bdưới áp lực thể chế\b/gi, "khi chịu áp lực từ tổ chức"],
    [/\bkhi các câu chuyện cạnh tranh được đặt cạnh nhau\b/gi, "khi nhiều góc nhìn trái chiều được đặt cạnh nhau"],
    [/\btrong một diễn ngôn bị chi phối bởi động lực\b/gi, "khi cách bàn luận bị chi phối bởi lợi ích"],
    [/\bkhi các phát hiện tạm thời bị nói quá\b/gi, "khi kết quả tạm thời bị thổi phồng"],
    [/\bkhi các nhượng bộ mang tính biểu tượng bị bóc tách\b/gi, "khi bỏ qua những nhượng bộ mang tính hình thức"],
    [/\btrong điều kiện thông tin bất đối xứng\b/gi, "khi thông tin giữa các bên không cân xứng"],
    [/\bDiễn ngôn\b/g, "Cách bàn luận"],
    [/\bdiễn ngôn\b/g, "cách bàn luận"],
    [/\btính chính đáng của thể chế\b/gi, "tính chính danh của hệ thống"],
    [/\bsự chắc chắn về mặt nhận thức\b/gi, "mức độ chắc chắn của điều mình biết"],
    [/\btính mạch lạc về chuẩn tắc\b/gi, "sự nhất quán về nguyên tắc"],
    [/\blý tính công cộng\b/gi, "cách lập luận vì lợi ích chung"],
    [/\bđộ tin cậy của diễn ngôn\b/gi, "độ tin cậy của cách lập luận"],
    [/\bmột sự tổng hợp có thể bảo vệ được\b/gi, "một cách dung hòa hợp lý"],
    [/\bĐiều nghe có vẻ dứt khoát\b/g, "Điều nghe có vẻ chắc nịch"],
    [/\btrở nên khó hơn\b/gi, "sẽ khó hơn"],
    [/\bvẫn mong manh\b/gi, "vẫn chưa thật vững"]
  ];

  replacements.forEach(([pattern, value]) => {
    result = result.replace(pattern, value);
  });

  result = result.replace(/\s+/g, " ").trim();
  return capitalizeSentence(result);
}

function getDisplayedMeaning(item) {
  if (!item) return "";
  return item.meaning || "";
}

function updateTopicMenu() {
  if (!elements.topicSelect) return;
  const availableTopics = getAvailableTopics();
  if (!availableTopics.includes(state.topic)) state.topic = "all";
  elements.topicSelect.innerHTML = "";
  availableTopics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topicLabels[topic] || topicLabels.all;
    elements.topicSelect.appendChild(option);
  });
  elements.topicSelect.value = state.topic;
  if (elements.activeTopicBadge) elements.activeTopicBadge.textContent = topicLabels[state.topic] || topicLabels.all;
}

function positionCountdown() {
  if (!elements.practiceStage || !elements.meaningPanel || !elements.countdownWrap) return;
  const stageRect = elements.practiceStage.getBoundingClientRect();
  const panelRect = elements.meaningPanel.getBoundingClientRect();
  const wrapRect = elements.countdownWrap.getBoundingClientRect();
  if (!stageRect.height || !panelRect.height || !wrapRect.height) return;
  const isMobile = window.innerWidth <= 720;
  const targetCenter = stageRect.height * (isMobile ? 0.58 : 0.55);
  const minCenter = (panelRect.bottom - stageRect.top) + (wrapRect.height / 2) + (isMobile ? 26 : 18);
  const maxCenter = stageRect.height - (wrapRect.height / 2) - (isMobile ? 92 : 74);
  const finalCenter = Math.min(maxCenter, Math.max(targetCenter, minCenter));
  elements.countdownWrap.style.left = "50%";
  elements.countdownWrap.style.transform = "translate(-50%, -50%)";
  elements.countdownWrap.style.top = `${(finalCenter / stageRect.height) * 100}%`;
}

function resetQueue() {
  const total = getDataset().length;
  state.queueKey = currentQueueKey();
  state.queue = shuffleArray(Array.from({ length: total }, (_, index) => index));
  state.queuePos = 0;
  state.currentQueueNumber = 0;
  updateProgress();
}

function ensureQueue({ restart = false } = {}) {
  if (restart || state.queueKey !== currentQueueKey() || state.queue.length !== getDataset().length) resetQueue();
}

function getNextItem({ restart = false } = {}) {
  const data = getDataset();
  if (!data.length) return null;
  ensureQueue({ restart });
  if (state.queuePos >= state.queue.length) resetQueue();
  const itemIndex = state.queue[state.queuePos];
  const item = data[itemIndex];
  state.currentQueueNumber = state.queuePos + 1;
  state.queuePos += 1;
  updateProgress();
  return item;
}

function initLevels() {
  elements.levelGrid.innerHTML = "";
  levels.forEach((level) => {
    const btn = document.createElement("button");
    btn.className = `level-btn${state.level === level ? " active" : ""}`;
    btn.textContent = levelNames[level];
    btn.addEventListener("click", () => {
      state.level = level;
      handleSelectionChange();
    });
    elements.levelGrid.appendChild(btn);
  });
}

function updateModeLevelUI() {
  elements.activeModeLabel.textContent = modeNames[state.mode];
  elements.activeLevelLabel.textContent = levelNames[state.level];
  updateTopicMenu();
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  Array.from(elements.levelGrid.children).forEach((button, index) => button.classList.toggle("active", levels[index] === state.level));
  elements.autoAdvanceBtn.classList.toggle("active", state.autoAdvance);
  elements.autoAdvanceBtn.textContent = `Tự động chuyển: ${state.autoAdvance ? "Bật" : "Tắt"}`;
  updateProgress();
  updateViewTabs();
}

function clearTimers() {
  if (state.countdown) { clearInterval(state.countdown); state.countdown = null; }
  if (state.pauseTimer) { clearTimeout(state.pauseTimer); state.pauseTimer = null; }
  if (state.autoNextTimer) { clearTimeout(state.autoNextTimer); state.autoNextTimer = null; }
  if (state.speechFallbackTimer) { clearTimeout(state.speechFallbackTimer); state.speechFallbackTimer = null; }
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  if (state.audioElement) {
    state.audioElement.pause();
    if (state.audioElement.dataset.url) URL.revokeObjectURL(state.audioElement.dataset.url);
    state.audioElement.src = "";
    state.audioElement = null;
  }
}

function prepareStage() {
  clearTimers();
  stopSpeech();
  state.runToken += 1;
  state.countdownValue = 5;
  elements.countdownNumber.textContent = String(state.countdownValue);
  elements.answerArea.classList.add("hidden");
  elements.countdownWrap.classList.add("hidden");
  elements.countdownWrap.style.top = "";
}

function setStatus(message) { elements.statusBar.textContent = message; }

function resetViewForSelection() {
  prepareStage();
  state.currentItem = null;
  state.currentQueueNumber = 0;
  updateProgress();
  elements.meaningText.textContent = "Bấm Bắt đầu để luyện phản xạ";
  applyContentLayout(null);
  setStatus(`Đã chọn ${modeNames[state.mode]} - ${levelNames[state.level]} - ${topicLabels[state.topic] || topicLabels.all}`);
}

function handleSelectionChange() {
  updateTopicMenu();
  resetQueue();
  updateModeLevelUI();
  resetViewForSelection();
}

function startPractice({ restart = false } = {}) {
  const item = getNextItem({ restart });
  if (!item) {
    setStatus("Chưa có dữ liệu cho lựa chọn hiện tại.");
    return;
  }
  prepareStage();
  state.currentItem = item;
  elements.meaningText.textContent = getDisplayedMeaning(item);
  elements.hanziText.textContent = item.hanzi;
  elements.ipaText.textContent = item.ipa || "";
  elements.ipaText.classList.toggle("hidden", !item.ipa);
  applyContentLayout(item);
  elements.countdownWrap.classList.remove("hidden");
  requestAnimationFrame(positionCountdown);
  setStatus("Hiện nghĩa tiếng Việt trước. Sau 5 giây sẽ hiện tiếng Anh và IPA, rồi phát 2 lần.");
  const runToken = state.runToken;
  state.countdown = window.setInterval(() => {
    if (runToken !== state.runToken) return;
    state.countdownValue -= 1;
    elements.countdownNumber.textContent = String(state.countdownValue);
    if (state.countdownValue <= 0) {
      clearInterval(state.countdown);
      state.countdown = null;
      revealAnswerAndSpeak(runToken, { autoAdvance: state.autoAdvance });
    }
  }, 1000);
}

function revealAnswerAndSpeak(runToken, { autoAdvance = state.autoAdvance } = {}) {
  if (runToken !== state.runToken) return;
  elements.answerArea.classList.remove("hidden");
  elements.countdownWrap.classList.add("hidden");
  setStatus("Đang đọc lần 1 tốc độ 1.0, nghỉ 2 giây, rồi đọc lần 2 tốc độ 0.8.");
  speakCurrentItem({ autoAdvance, runToken });
}

function queueAutoNext(runToken) {
  if (!state.autoAdvance || runToken !== state.runToken) {
    setStatus("Hoàn tất lượt nghe. Bạn có thể bấm Câu tiếp theo hoặc Nghe lại.");
    return;
  }
  setStatus("Đã đọc đủ 2 lần. Đang tự chuyển sang mục tiếp theo...");
  state.autoNextTimer = window.setTimeout(() => {
    if (runToken === state.runToken) startPractice();
  }, 1400);
}

async function speakCurrentItem({ autoAdvance = state.autoAdvance, runToken = state.runToken } = {}) {
  if (!state.currentItem) return;
  clearTimers();
  try {
    if (state.settings.provider === "proxy" && state.settings.proxyUrl && state.settings.voiceId) {
      await speakWithProxy(state.currentItem.hanzi, { autoAdvance, runToken });
    } else {
      speakWithBrowser(state.currentItem.hanzi, { autoAdvance, runToken });
    }
  } catch (error) {
    console.error(error);
    setStatus("Không phát được giọng ElevenLabs, đã chuyển sang giọng trình duyệt.");
    speakWithBrowser(state.currentItem.hanzi, { autoAdvance, runToken });
  }
}

function chooseEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^en(-|_)/i.test(voice.lang)) || voices.find((voice) => /english/i.test(voice.name)) || null;
}

function isIOSDevice() {
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const touchMac = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || touchMac;
}

function estimateSpeechDurationMs(text, rate = 1) {
  const normalized = String(text || "").trim();
  const words = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
  const fallbackWords = Math.max(1, Math.ceil(normalized.length / 5));
  const totalWords = Math.max(words, fallbackWords);
  const wordsPerMinute = Math.max(90, 150 * rate);
  const duration = (totalWords / wordsPerMinute) * 60 * 1000;
  return Math.max(1800, Math.round(duration + 1200));
}

function setSpeechFallback(callback, timeoutMs) {
  if (state.speechFallbackTimer) clearTimeout(state.speechFallbackTimer);
  state.speechFallbackTimer = window.setTimeout(() => {
    state.speechFallbackTimer = null;
    callback();
  }, timeoutMs);
}

async function unlockAudioForIOS() {
  if (state.audioUnlocked || !isIOSDevice()) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const context = unlockAudioForIOS._context || new AudioContextClass();
      unlockAudioForIOS._context = context;
      if (context.state === "suspended") await context.resume();
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    }
  } catch (error) {
    console.debug("AudioContext unlock skipped", error);
  }

  try {
    if (window.speechSynthesis) {
      const primer = new SpeechSynthesisUtterance(" " );
      primer.volume = 0;
      primer.rate = 1;
      primer.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(primer);
      window.setTimeout(() => window.speechSynthesis.cancel(), 40);
    }
  } catch (error) {
    console.debug("Speech synthesis unlock skipped", error);
  }

  state.audioUnlocked = true;
}

function speakWithBrowser(text, { autoAdvance, runToken }) {
  stopSpeech();
  const voice = chooseEnglishVoice();
  const utterance1 = new SpeechSynthesisUtterance(text);
  utterance1.lang = "en-US";
  utterance1.rate = 1;
  utterance1.pitch = 1;
  if (voice) utterance1.voice = voice;

  const utterance2 = new SpeechSynthesisUtterance(text);
  utterance2.lang = "en-US";
  utterance2.rate = 0.8;
  utterance2.pitch = 1;
  if (voice) utterance2.voice = voice;

  let firstPassHandled = false;
  let secondPassHandled = false;

  const finishSecondPass = () => {
    if (secondPassHandled || runToken !== state.runToken) return;
    secondPassHandled = true;
    if (state.speechFallbackTimer) {
      clearTimeout(state.speechFallbackTimer);
      state.speechFallbackTimer = null;
    }
    if (autoAdvance) queueAutoNext(runToken);
    else setStatus("Hoàn tất lượt nghe. Bạn có thể bấm Câu tiếp theo hoặc Nghe lại.");
  };

  const beginSecondPass = () => {
    if (runToken !== state.runToken) return;
    setStatus("Đang đọc lần 2 với tốc độ 0.8.");
    utterance2.onend = finishSecondPass;
    utterance2.onerror = finishSecondPass;
    setSpeechFallback(finishSecondPass, estimateSpeechDurationMs(text, 0.8) + 900);
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance2);
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch (error) {
      console.warn("Second browser TTS pass failed", error);
      finishSecondPass();
    }
  };

  const finishFirstPass = () => {
    if (firstPassHandled || runToken !== state.runToken) return;
    firstPassHandled = true;
    if (state.speechFallbackTimer) {
      clearTimeout(state.speechFallbackTimer);
      state.speechFallbackTimer = null;
    }
    setStatus("Nghỉ 2 giây trước lần đọc thứ hai.");
    state.pauseTimer = window.setTimeout(beginSecondPass, 2000);
  };

  utterance1.onend = finishFirstPass;
  utterance1.onerror = finishFirstPass;

  setStatus("Đang đọc lần 1 với tốc độ 1.0.");
  setSpeechFallback(finishFirstPass, estimateSpeechDurationMs(text, 1) + 900);
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance1);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  } catch (error) {
    console.warn("First browser TTS pass failed", error);
    finishFirstPass();
  }
}

async function speakWithProxy(text, { autoAdvance, runToken }) {
  stopSpeech();
  const voiceId = state.settings.voiceId;
  const modelId = state.settings.modelId || "eleven_multilingual_v2";
  const languageCode = "en";
  const cacheKey = await buildAudioCacheKey({ text, voiceId, modelId, languageCode });
  let blob = await getCachedAudioBlob(cacheKey);

  if (blob) {
    setStatus("Đang phát âm thanh đã lưu trong máy...");
  } else {
    setStatus("Đang lấy âm thanh từ ElevenLabs...");
    const response = await fetch(state.settings.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId,
        modelId,
        languageCode
      })
    });
    if (!response.ok) throw new Error(`TTS proxy error: ${response.status}`);
    blob = await response.blob();
    await saveAudioBlobToCache(cacheKey, blob);
  }

  const audio = createAudioFromBlob(blob, { autoAdvance, runToken });
  setStatus("Đang đọc lần 1 với tốc độ 1.0.");
  await audio.play();
}

function saveVoiceSettings() {
  state.settings = {
    provider: elements.ttsProvider.value,
    proxyUrl: elements.proxyUrl.value.trim(),
    voiceId: elements.voiceId.value.trim(),
    modelId: elements.modelId.value.trim() || "eleven_multilingual_v2",
    autoAdvance: state.autoAdvance
  };
  persistSettings();
  fillVoiceSettingsForm();
  setStatus("Đã lưu thiết lập giọng đọc ở tab riêng.");
}

function bindEvents() {
  elements.appTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      updateViewTabs();
      fillVoiceSettingsForm();
      setStatus(state.view === "voice" ? "Bạn đang ở tab thiết lập giọng đọc." : `Đã chuyển về tab luyện tập - ${modeNames[state.mode]}.`);
    });
  });
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      handleSelectionChange();
    });
  });
  if (elements.topicSelect) {
    elements.topicSelect.addEventListener("change", () => {
      state.topic = elements.topicSelect.value || "all";
      persistSettings();
      handleSelectionChange();
    });
  }
  elements.startBtn.addEventListener("click", async () => {
    await unlockAudioForIOS();
    startPractice({ restart: true });
  });
  elements.nextBtn.addEventListener("click", async () => {
    await unlockAudioForIOS();
    startPractice();
  });
  elements.shuffleBtn.addEventListener("click", async () => {
    await unlockAudioForIOS();
    resetQueue();
    startPractice();
    setStatus("Đã đổi thứ tự ngẫu nhiên.");
  });
  elements.repeatBtn.addEventListener("click", async () => {
    await unlockAudioForIOS();
    if (!state.currentItem) {
      setStatus("Hãy bắt đầu một lượt luyện trước.");
      return;
    }
    clearTimers();
    elements.answerArea.classList.remove("hidden");
    elements.countdownWrap.classList.add("hidden");
    state.runToken += 1;
    speakCurrentItem({ autoAdvance: false, runToken: state.runToken });
  });
  elements.autoAdvanceBtn.addEventListener("click", () => {
    state.autoAdvance = !state.autoAdvance;
    persistSettings();
    updateModeLevelUI();
    setStatus(state.autoAdvance ? "Đã bật tự động chuyển câu." : "Đã tắt tự động chuyển câu.");
  });
  elements.saveVoiceSettings.addEventListener("click", saveVoiceSettings);
  window.addEventListener("resize", () => {
    if (!elements.countdownWrap.classList.contains("hidden")) requestAnimationFrame(positionCountdown);
  });
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = chooseEnglishVoice;
  }
}

function init() {
  hydrateSettings();
  fillVoiceSettingsForm();
  initLevels();
  updateModeLevelUI();
  bindEvents();
  resetQueue();
  resetViewForSelection();
}

init();
