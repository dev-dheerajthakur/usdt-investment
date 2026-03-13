[
  {
    url: '/referrals/:userId/investments/summary',
    userId: 'uuid-root',
    levels: [
      { level: 1, total_referrals: 3, total_investment: 75000 },
      { level: 2, total_referrals: 9, total_investment: 210000 },
      { level: 3, total_referrals: 21, total_investment: 430000 },
    ],
    grandTotal: 715000,
  },
  {
    url: '/referrals/:userId/investments/details',
    userId: 'uuid-root',
    levels: [
      {
        level: 1,
        levelTotal: 75000,
        users: [
          { user_id: 'uuid-1', name: 'Alice', total_invested: 40000 },
          { user_id: 'uuid-2', name: 'Bob', total_invested: 35000 },
        ],
      },
      {
        level: 2,
        levelTotal: 210000,
      },
    ],
  },
];
