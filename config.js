window.CALCULATOR_CONFIG = {
  weeksPerMonth: 52 / 12,
  tripsPerDay: 2,
  averageSpeed: 28, // км/ч
  fuelPrice: 60, // ₽/л
  promo: {
    promoCode: 'REFPRRQ2',
    bonusAmount: 1000,
    url: 'https://my.delimobil.ru/app',
    demo: false,
  },
  tariffs: {
    economy: {
      car: { consumption: 9, depreciationPerKm: 6, servicePerKm: 2, tiresPerKm: 1, insurance: 2300, wash: 1000 },
      taxi: { pickup: 125, perKm: 18, perMinute: 5 },
      deli: { perMinute: 9, fixedPerTrip: null },
    },
    comfort: {
      car: { consumption: 11, depreciationPerKm: 8, servicePerKm: 2.5, tiresPerKm: 1.5, insurance: 3600, wash: 1400 },
      taxi: { pickup: 180, perKm: 23, perMinute: 7 },
      deli: { perMinute: 13, fixedPerTrip: null },
    },
  },
};
