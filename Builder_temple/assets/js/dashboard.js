const insights = document.querySelectorAll('[data-insight]');
if (insights.length) {
  const phrases = [
    'Engagement peak on Friday.',
    'Learners finish lessons 18% faster.',
    'Most comments mention "clear visuals".'
  ];
  let index = 0;
  setInterval(() => {
    insights.forEach((el) => {
      el.textContent = phrases[index % phrases.length];
    });
    index += 1;
  }, 3200);
}
