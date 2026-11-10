'use strict';

const config = window.CALCULATOR_CONFIG;
const tg = window.Telegram?.WebApp;
const telegram = tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')) ? tg : null;
const byId = (id) => document.getElementById(id);
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const money = (amount) => `${number.format(amount)}\u00a0₽`;
const dayWord = new Intl.PluralRules('ru-RU');
const dayLabels = { one: 'день', few: 'дня', many: 'дней' };
const distance = byId('distance');
const days = byId('days');
const cards = document.querySelectorAll('.price-card');

const costItems = [
  ['fuel', 'Бензин', '#a5cc5b'],
  ['depreciation', 'Потеря стоимости', '#3e6745'],
  ['service', 'ТО и расходники', '#729a52'],
  ['tires', 'Шины и шиномонтаж', '#c3b06d'],
  ['insurance', 'ОСАГО / КАСКО', '#567666'],
  ['wash', 'Мойки', '#b5c29e'],
];

function calculate(kmPerDay, daysPerWeek, scenario) {
  const { car, taxi, deli } = config.tariffs[scenario];
  const tripDays = daysPerWeek * config.weeksPerMonth;
  const kilometers = kmPerDay * tripDays;
  const minutes = kilometers * 60 / config.averageSpeed;
  const trips = tripDays * config.tripsPerDay;
  const costs = {
    fuel: Math.round(kilometers * car.consumption * config.fuelPrice / 100),
    depreciation: Math.round(kilometers * car.depreciationPerKm),
    service: Math.round(kilometers * car.servicePerKm),
    tires: Math.round(kilometers * car.tiresPerKm),
    insurance: Math.round(car.insurance),
    wash: Math.round(car.wash),
  };
  const fixed = deli.fixedPerTrip != null;

  return {
    kilometers,
    costs,
    fixed,
    totals: {
      car: Object.values(costs).reduce((sum, cost) => sum + cost, 0),
      taxi: Math.round(trips * taxi.pickup + kilometers * taxi.perKm + minutes * taxi.perMinute),
      deli: Math.round(fixed ? trips * deli.fixedPerTrip : minutes * deli.perMinute),
    },
  };
}

const costRows = costItems.map(([key, label, color]) => {
  const segment = document.createElement('span');
  segment.style.background = color;
  byId('cost-bar').append(segment);

  const row = document.createElement('div');
  row.className = 'cost-row';
  const term = document.createElement('dt');
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = color;
  term.append(swatch, label);
  const amount = document.createElement('dd');
  row.append(term, amount);
  byId('cost-list').append(row);
  return { key, segment, amount };
});

function updateRange(input, text) {
  const progress = (input.valueAsNumber - Number(input.min)) / (Number(input.max) - Number(input.min));
  input.style.setProperty('--progress', `${progress * 100}%`);
  input.setAttribute('aria-valuetext', text);
  byId(`${input.id}-value`).textContent = text;
}

function showDifference(id, baseline, difference) {
  const line = byId(id);
  if (difference === 0) {
    line.textContent = `Столько же, сколько ${baseline}`;
    return;
  }
  const amount = document.createElement('strong');
  amount.textContent = money(Math.abs(difference));
  const direction = difference > 0 ? 'Дешевле' : 'Дороже';
  line.replaceChildren(`${direction}, чем ${baseline}, на `, amount, ' в месяц');
}

function render() {
  const kmPerDay = distance.valueAsNumber;
  const daysPerWeek = days.valueAsNumber;
  const scenario = document.querySelector('[name="scenario"]:checked').value;
  const { kilometers, totals, costs, fixed } = calculate(kmPerDay, daysPerWeek, scenario);
  const minimum = Math.min(...Object.values(totals));

  updateRange(distance, `${kmPerDay} км`);
  updateRange(days, `${daysPerWeek} ${dayLabels[dayWord.select(daysPerWeek)]}`);
  byId('monthly-km').textContent = `${number.format(kilometers)} км`;
  byId('deli-caption').textContent = fixed ? 'Фикс за поездку' : 'Поминутный тариф';
  byId('breakdown-total').textContent = money(totals.car);

  for (const card of cards) {
    const { option } = card.dataset;
    const cheapest = totals[option] === minimum;
    byId(`${option}-total`).textContent = money(totals[option]);
    card.classList.toggle('cheapest', cheapest);
    card.querySelector('.badge').hidden = !cheapest;
  }

  showDifference('car-savings', 'своё авто', totals.car - totals.deli);
  showDifference('taxi-savings', 'такси', totals.taxi - totals.deli);

  for (const { key, segment, amount } of costRows) {
    segment.style.flexGrow = costs[key];
    segment.hidden = costs[key] === 0;
    amount.textContent = money(costs[key]);
  }
}

function copyWithSelection(text, container) {
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position: fixed; inset: 0 auto auto 0; opacity: 0; pointer-events: none';
  const previousFocus = document.activeElement;
  container.append(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    previousFocus?.focus({ preventScroll: true });
  }
}

async function copyPromo(code, container) {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return copyWithSelection(code, container);
  }
}

const { promoCode, bonusAmount, url, demo } = config.promo;
const promoDialog = byId('promo-dialog');
const promoStatus = byId('promo-copy-status');
const copyAgain = byId('promo-copy-again');
const promoLink = byId('promo-link');
promoLink.href = url;
byId('promo-code').textContent = promoCode;
byId('dialog-promo-code').textContent = promoCode;
byId('demo-note').hidden = !demo;
document.querySelectorAll('[data-bonus]').forEach((element) => {
  element.textContent = number.format(bonusAmount);
});

async function copyAndUpdateStatus() {
  if (copyAgain.getAttribute('aria-disabled') === 'true') return;
  copyAgain.setAttribute('aria-disabled', 'true');
  promoStatus.textContent = 'Копируем промокод…';
  const copied = await copyPromo(promoCode, promoDialog);
  copyAgain.removeAttribute('aria-disabled');
  promoStatus.textContent = copied
    ? 'Промокод скопирован в буфер!'
    : 'Выделите код ниже и скопируйте его вручную.';
  if (copied) telegram?.HapticFeedback?.notificationOccurred('success');
}

byId('promo-trigger').addEventListener('click', () => {
  promoDialog.showModal();
  void copyAndUpdateStatus();
});
copyAgain.addEventListener('click', copyAndUpdateStatus);

promoLink.addEventListener('click', (event) => {
  if (telegram?.isVersionAtLeast?.('6.1')) {
    try {
      if (new URL(promoLink.href).hostname === 't.me') {
        telegram.openTelegramLink(promoLink.href);
      } else {
        telegram.openLink(promoLink.href);
      }
      event.preventDefault();
    } catch {
      // The anchor still opens normally if the SDK rejects the URL.
    }
  }
});

byId('method-text').textContent = `Средний месяц — ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(config.weeksPerMonth)} недели. Время в пути рассчитано при скорости ${config.averageSpeed} км/ч. Число поездок за день — ${config.tripsPerDay}. Бензин для своего авто — ${config.fuelPrice} ₽/л.`;
distance.addEventListener('input', render);
days.addEventListener('input', render);
document.querySelectorAll('[name="scenario"]').forEach((radio) => radio.addEventListener('change', render));
render();
telegram?.ready();
telegram?.expand();
