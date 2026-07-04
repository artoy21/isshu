const state = {
  poems: [],
  progress: JSON.parse(localStorage.getItem('isshu-progress') || '{}'),
  range: { from: 1, to: 100 },
  quiz: null,
  filter: 'all'
};

const app = document.querySelector('#app');
const dialog = document.querySelector('#poem-dialog');
const save = () => localStorage.setItem('isshu-progress', JSON.stringify(state.progress));
const clone = id => document.querySelector(id).content.cloneNode(true);
const shuffled = array => [...array].sort(() => Math.random() - .5);
const statusOf = no => state.progress[no]?.mastered ? 'mastered' : state.progress[no]?.attempts ? 'learning' : 'new';

function poemLines(text) {
  return text.split(' ').map(line => `<span>${line}</span>`).join('　');
}

function navigate() {
  const page = location.hash.slice(1) || 'home';
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
  if (page === 'learn') renderLearn();
  else if (page === 'quiz') renderQuizSetup();
  else renderHome();
  app.focus({preventScroll:true});
  window.scrollTo(0, 0);
}

function renderHome() {
  app.replaceChildren(clone('#home-template'));
  const today = state.poems[(new Date().getDate() - 1) % 100];
  app.querySelector('.featured-poem').innerHTML = `<div class="poem">${poemLines(today.kami)}<br>${poemLines(today.simo)}</div><div class="author">${today.sakusya}</div>`;
  const values = Object.values(state.progress);
  const mastered = values.filter(p => p.mastered).length;
  const attempts = values.reduce((sum, p) => sum + (p.attempts || 0), 0);
  const correct = values.reduce((sum, p) => sum + (p.correct || 0), 0);
  app.querySelector('.stats').innerHTML = `
    <div class="stat"><b>${mastered}<small>/100</small></b><span>覚えた歌</span></div>
    <div class="stat"><b>${attempts ? Math.round(correct / attempts * 100) : 0}<small>%</small></b><span>正答率</span></div>
    <div class="stat"><b>${attempts}</b><span>これまでの回答</span></div>`;
  app.querySelector('.continue-panel').innerHTML = `<div class="continue-card"><div><p class="eyebrow">次の稽古</p><h3>${mastered ? '苦手な歌を中心に復習' : 'まずは五首に挑戦'}</h3><span>${mastered}首を習得済み。5問、約2分のクイズです。</span></div><a class="button primary" href="#quiz">腕だめしへ <span>→</span></a></div>`;
}

function renderLearn() {
  app.replaceChildren(clone('#learn-template'));
  const input = app.querySelector('#search');
  app.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    app.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
    drawCards(input.value);
  }));
  input.addEventListener('input', () => drawCards(input.value));
  drawCards('');
}

function drawCards(query) {
  const q = query.trim().toLowerCase();
  const poems = state.poems.filter(p => {
    const matches = !q || `${p.no} ${p.kami} ${p.simo} ${p.kami_kana} ${p.simo_kana} ${p.sakusya}`.toLowerCase().includes(q);
    return matches && (state.filter === 'all' || statusOf(p.no) === state.filter);
  });
  app.querySelector('.result-count').textContent = `${poems.length}首`;
  const grid = app.querySelector('.poem-grid');
  grid.innerHTML = poems.map(p => `<button class="poem-card" data-no="${p.no}"><span class="num">第${p.no}首</span><i class="status-dot ${statusOf(p.no)}"></i><h3>${p.kami}<br><span class="lower">${p.simo}</span></h3><span class="author">${p.sakusya}</span></button>`).join('');
  grid.querySelectorAll('.poem-card').forEach(card => card.addEventListener('click', () => openPoem(+card.dataset.no)));
}

function openPoem(no) {
  const p = state.poems[no - 1];
  const mastered = statusOf(no) === 'mastered';
  dialog.querySelector('.dialog-body').innerHTML = `<p class="eyebrow">第${p.no}首</p><div class="full-poem">${p.kami}<br>${p.simo}</div><p class="kana">${p.kami_kana}<br>${p.simo_kana}</p><p><b>${p.sakusya}</b><br><span class="kana">${p.sakusya_kana}</span></p><button class="button ${mastered ? 'secondary' : 'primary'} master-button">${mastered ? '練習中に戻す' : '覚えた歌にする'}</button>`;
  dialog.querySelector('.master-button').addEventListener('click', e => {
    state.progress[no] ||= {};
    state.progress[no].mastered = !mastered;
    save();
    e.target.textContent = state.progress[no].mastered ? '覚えました' : '練習中に戻しました';
    setTimeout(() => { dialog.close(); renderLearn(); }, 450);
  });
  dialog.showModal();
}

dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

function renderQuizSetup() {
  const allowedStarts = Array.from({ length: 10 }, (_, index) => index * 10 + 1);
  const allowedEnds = Array.from({ length: 10 }, (_, index) => (index + 1) * 10);
  let selectedFrom = allowedStarts.includes(state.range.from) ? state.range.from : 1;
  let selectedTo = allowedEnds.includes(state.range.to) ? state.range.to : 100;
  app.replaceChildren(clone('#quiz-template'));
  app.querySelector('.quiz-count').textContent = '出題設定';
  app.querySelector('.score').textContent = '全100首';
  app.querySelector('.progress-track i').style.width = '0';
  app.querySelector('.quiz-content').innerHTML = `<div class="quiz-setup"><p class="eyebrow">稽古する範囲</p><h2>何番から何番まで？</h2><p>開始と終了の歌番号を選んでください。</p><div class="range-picker"><fieldset><legend>開始番号</legend><div class="range-options start-options">${allowedStarts.map(value => `<button type="button" data-value="${value}">${value}</button>`).join('')}</div></fieldset><span class="range-wave">〜</span><fieldset><legend>終了番号</legend><div class="range-options end-options">${allowedEnds.map(value => `<button type="button" data-value="${value}">${value}</button>`).join('')}</div></fieldset></div><p class="range-error" aria-live="polite"></p><button class="button range-start">この範囲で始める <span>→</span></button></div>`;
  const updateRange = () => {
    app.querySelectorAll('.start-options button').forEach(button => button.classList.toggle('selected', +button.dataset.value === selectedFrom));
    app.querySelectorAll('.end-options button').forEach(button => {
      button.classList.toggle('selected', +button.dataset.value === selectedTo);
      button.disabled = +button.dataset.value < selectedFrom;
    });
    const valid = selectedFrom <= selectedTo;
    app.querySelector('.range-start').disabled = !valid;
    app.querySelector('.range-error').textContent = valid ? `第${selectedFrom}首〜第${selectedTo}首（${selectedTo - selectedFrom + 1}首）から出題します` : '終了番号を選び直してください';
  };
  app.querySelectorAll('.start-options button').forEach(button => button.addEventListener('click', () => {
    selectedFrom = +button.dataset.value;
    if (selectedTo < selectedFrom) selectedTo = allowedEnds.find(value => value >= selectedFrom);
    updateRange();
  }));
  app.querySelectorAll('.end-options button').forEach(button => button.addEventListener('click', () => {
    selectedTo = +button.dataset.value;
    updateRange();
  }));
  app.querySelector('.range-start').addEventListener('click', () => {
    if (selectedFrom > selectedTo) return;
    state.range = { from: selectedFrom, to: selectedTo };
    localStorage.setItem('isshu-range', JSON.stringify(state.range));
    startQuiz();
  });
  updateRange();
}

function startQuiz() {
  const inRange = state.poems.filter(poem => poem.no >= state.range.from && poem.no <= state.range.to);
  const weighted = [...inRange].sort((a,b) => {
    const pa = state.progress[a.no] || {}, pb = state.progress[b.no] || {};
    return (pa.correct / (pa.attempts || 1)) - (pb.correct / (pb.attempts || 1)) || Math.random() - .5;
  });
  const selected = weighted.slice(0, Math.min(5, weighted.length));
  const directions = selected.length === 1
    ? [Math.random() < .5 ? 'forward' : 'reverse']
    : shuffled(selected.map((_, index) => index % 2 ? 'forward' : 'reverse'));
  const questions = selected.map((poem, index) => ({ ...poem, direction: directions[index] }));
  state.quiz = { questions, index: 0, score: 0, answered: false };
  app.replaceChildren(clone('#quiz-template'));
  renderQuestion();
}

function renderQuestion() {
  const q = state.quiz;
  if (q.index >= q.questions.length) return renderResult();
  const poem = q.questions[q.index];
  app.querySelector('.quiz-count').textContent = `${q.index + 1} / ${q.questions.length}`;
  app.querySelector('.score').textContent = `${q.score} 正解`;
  app.querySelector('.progress-track i').style.width = `${q.index / q.questions.length * 100}%`;
  if (window.matchMedia('(min-width: 801px)').matches) renderTypingQuestion(poem);
  else renderMobileQuestion(poem);
}

function renderTypingQuestion(poem) {
  const reverse = poem.direction === 'reverse';
  const expected = normalizeKana(reverse ? poem.kami_kana : poem.simo_kana);
  const shown = reverse ? poem.simo : poem.kami;
  const answerName = reverse ? '上の句' : '下の句';
  const shownArea = `<section class="verse-block shown-verse"><div class="question-poem">${shown}</div></section>`;
  const answerArea = `<section class="verse-block answer-verse"><div class="typing-area"><div class="answer-input-row"><span class="answer-status" aria-live="polite"></span><input id="kana-answer" type="text" inputmode="hiragana" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="回答をひらがなで入力"><div class="character-check" aria-hidden="true"></div></div></div></section>`;
  const bottomTools = `<div class="typing-bottom-tools"><div class="typing-actions"><button class="hint-button" type="button">次の一文字を見る</button><button class="full-answer-button" type="button">回答全文を見る</button><span class="hint-character" aria-live="polite"></span></div></div>`;
  app.querySelector('.quiz-content').innerHTML = `<p class="eyebrow">${answerName}をひらがなで入力</p><div class="verse-order ${reverse ? 'reverse-question' : ''}">${reverse ? answerArea + shownArea : shownArea + answerArea}</div>${bottomTools}<div class="full-answer" aria-live="polite"></div><div class="feedback"></div>`;
  const input = app.querySelector('#kana-answer');
  let composing = false;
  const check = () => {
    const hintOutput = app.querySelector('.hint-character');
    hintOutput.textContent = '';
    hintOutput.classList.remove('shown');
    const entered = normalizeKana(input.value);
    const expectedChars = [...expected];
    const chars = [...entered];
    const firstWrong = chars.findIndex((char, index) => char !== expectedChars[index]);
    app.querySelector('.character-check').innerHTML = chars.map((char, index) => `<span class="${char === expectedChars[index] ? 'ok' : 'error'}">${escapeHtml(char)}</span>`).join('');
    const incorrect = firstWrong >= 0 || chars.length > expectedChars.length;
    const indicator = app.querySelector('.answer-status');
    input.classList.toggle('has-error', incorrect);
    indicator.textContent = incorrect ? '×' : '';
    indicator.className = `answer-status${incorrect ? ' incorrect' : ''}`;
    if (entered === expected) {
      indicator.textContent = '○';
      indicator.className = 'answer-status correct';
      input.classList.remove('has-error');
      finishAnswer(true, poem);
    }
  };
  input.addEventListener('compositionstart', () => composing = true);
  input.addEventListener('compositionend', () => { composing = false; check(); });
  input.addEventListener('input', () => { if (!composing) check(); });
  app.querySelector('.hint-button').addEventListener('click', () => {
    const entered = [...normalizeKana(input.value)];
    const expectedChars = [...expected];
    let index = 0;
    while (index < entered.length && entered[index] === expectedChars[index]) index++;
    const hint = expectedChars[index];
    const output = app.querySelector('.hint-character');
    output.textContent = hint ? `次の文字：${hint}` : 'すべて入力できています';
    if (hint) {
      output.classList.remove('shown');
      requestAnimationFrame(() => output.classList.add('shown'));
    }
    input.focus();
  });
  bindFullAnswer(poem);
  input.focus();
}

function renderMobileQuestion(poem) {
  const reverse = poem.direction === 'reverse';
  const targetKey = reverse ? 'kami' : 'simo';
  const correctParts = poem[targetKey].split(' ');
  const pools = correctParts.map((_, part) => shuffled([...new Set(state.poems.filter(p => p.no !== poem.no && p[targetKey].split(' ')[part]).map(p => p[targetKey].split(' ')[part]))]).slice(0, 3));
  const choices = correctParts.map((correct, part) => shuffled([correct, ...pools[part]]));
  const labels = reverse ? ['最初の五音', '中の七音', '最後の五音'] : ['前半の七音', '後半の七音'];
  const shown = reverse ? poem.simo : poem.kami;
  const answerName = reverse ? '上の句' : '下の句';
  const shownArea = `<section class="verse-block shown-verse"><div class="question-poem">${shown}</div></section>`;
  const answerArea = `<section class="verse-block answer-verse"><div class="mobile-parts ${reverse ? 'three-parts' : ''}">${choices.map((group, part) => `<fieldset class="part-choices" data-part="${part}"><legend>${labels[part]}</legend>${group.map(text => `<button class="part-choice" data-value="${escapeHtml(text)}">${text}</button>`).join('')}</fieldset>`).join('')}</div></section>`;
  app.querySelector('.quiz-content').innerHTML = `<p class="eyebrow">${answerName}を句の順に選択</p><div class="verse-order ${reverse ? 'reverse-question' : ''}">${reverse ? answerArea + shownArea : shownArea + answerArea}</div><div class="full-answer" aria-live="polite"></div><div class="full-answer-actions"><button class="full-answer-button" type="button">回答全文を見る</button></div><div class="feedback"></div>`;
  app.querySelectorAll('.part-choice').forEach(button => button.addEventListener('click', () => {
    const group = button.closest('.part-choices');
    group.querySelectorAll('.part-choice').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    if (app.querySelectorAll('.part-choice.selected').length !== correctParts.length) return;
    const selected = [...app.querySelectorAll('.part-choice.selected')];
    const correct = selected.every((button, part) => button.dataset.value === correctParts[part]);
    selected.forEach((button, part) => button.classList.add(button.dataset.value === correctParts[part] ? 'correct' : 'wrong'));
    app.querySelectorAll('.part-choice').forEach(button => {
      button.disabled = true;
      const part = +button.closest('.part-choices').dataset.part;
      if (button.dataset.value === correctParts[part]) button.classList.add('correct');
    });
    finishAnswer(correct, poem);
  }));
  bindFullAnswer(poem);
}

function bindFullAnswer(poem) {
  const button = app.querySelector('.full-answer-button');
  button.addEventListener('click', () => {
    const reverse = poem.direction === 'reverse';
    const text = reverse ? poem.kami : poem.simo;
    const kana = reverse ? poem.kami_kana : poem.simo_kana;
    app.querySelector('.full-answer').innerHTML = `<span>${text}</span><small>${kana}</small>`;
    button.disabled = true;
    const answerInput = app.querySelector('#kana-answer');
    if (answerInput) answerInput.focus();
  });
}

function normalizeKana(value) {
  return value.normalize('NFKC').replace(/[\s　、。]/g, '').replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function finishAnswer(correct, poem) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;
  const record = state.progress[poem.no] ||= { attempts: 0, correct: 0 };
  record.attempts = (record.attempts || 0) + 1;
  if (correct) { record.correct = (record.correct || 0) + 1; state.quiz.score++; }
  if (record.attempts >= 3 && record.correct / record.attempts >= .8) record.mastered = true;
  save();
  const input = app.querySelector('#kana-answer');
  if (input) input.disabled = true;
  const hintButton = app.querySelector('.hint-button');
  if (hintButton) hintButton.disabled = true;
  const fullAnswerButton = app.querySelector('.full-answer-button');
  if (fullAnswerButton) fullAnswerButton.disabled = true;
  const feedback = app.querySelector('.feedback');
  const answer = poem.direction === 'reverse' ? poem.kami_kana : poem.simo_kana;
  feedback.innerHTML = correct
    ? `<span class="correct-author">${poem.sakusya}</span>`
    : `<b>正しい句を確認しましょう</b><span>${answer}<br>${poem.sakusya}</span>`;
  if (correct) {
    const answeredIndex = state.quiz.index;
    setTimeout(() => {
      if (location.hash !== '#quiz' || state.quiz.index !== answeredIndex) return;
      state.quiz.index++;
      state.quiz.answered = false;
      renderQuestion();
    }, 2000);
    return;
  }
  const next = document.createElement('button');
  next.className = 'button primary';
  next.innerHTML = state.quiz.index === state.quiz.questions.length - 1 ? '結果を見る <span>→</span>' : '次の歌へ <span>→</span>';
  next.addEventListener('click', () => { state.quiz.index++; state.quiz.answered = false; renderQuestion(); });
  feedback.append(next);
}

function renderResult() {
  app.querySelector('.progress-track i').style.width = '100%';
  app.querySelector('.quiz-count').textContent = '完了';
  app.querySelector('.score').textContent = `${state.quiz.score} 正解`;
  const messages = ['また歌と出会いましょう','ここから覚えていきましょう','少しずつ身についています','よく思い出せました','あと一首です','見事、全問正解です'];
  app.querySelector('.quiz-content').innerHTML = `<div class="result-screen"><p class="eyebrow">本日の稽古</p><h2>${messages[state.quiz.score]}</h2><div class="result-score">${state.quiz.score}<small>/${state.quiz.questions.length}</small></div><p>第${state.range.from}首〜第${state.range.to}首から出題しました。</p><div class="result-actions"><button class="button primary" id="retry">同じ範囲でもう一度</button><button class="button secondary" id="change-range">範囲を変える</button></div></div>`;
  app.querySelector('#retry').addEventListener('click', startQuiz);
  app.querySelector('#change-range').addEventListener('click', renderQuizSetup);
}

async function init() {
  try {
    const response = await fetch('hyakunin.json');
    if (!response.ok) throw new Error('データを読み込めませんでした');
    state.poems = await response.json();
    navigate();
  } catch (error) {
    app.innerHTML = `<section class="page-heading"><h1>読み込みエラー</h1><p>ローカルではWebサーバー経由で開いてください。</p></section>`;
  }
}

window.addEventListener('hashchange', navigate);
init();
