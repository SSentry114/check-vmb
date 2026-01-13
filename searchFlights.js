async function searchFlights(from, to, date) {
  // Giả lập dữ liệu (test trước)
  return [
    {
      airline: 'Vietnam Airlines',
      departure: '08:00',
      arrival: '09:30',
      price: 120
    },
    {
      airline: 'Thai Airways',
      departure: '14:00',
      arrival: '15:40',
      price: 135
    }
  ];
}

module.exports = { searchFlights };
