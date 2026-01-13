const axios = require('axios');

let cachedToken = null;
let tokenExpires = null;

async function getAmadeusToken() {
  if (cachedToken && tokenExpires > Date.now()) {
    return cachedToken;
  }

  const response = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', 
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: "WfxcvQMoGCEDAgBFPDq4iWw2ISWSGDe9",
      client_secret: "G6MSb0bw20FJ8Uqj"
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = response.data.access_token;
  tokenExpires = Date.now() + (response.data.expires_in - 60) * 1000; // trừ 60s cho an toàn
  return cachedToken;
}

async function searchFlights(from, to, date) {
  const token = await getAmadeusToken();

  const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${from}&destinationLocationCode=${to}&departureDate=${date}&adults=1&max=5`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const flights = response.data.data.map(f => {
    const segment = f.itineraries[0].segments[0];
    return {
      airline: segment.operating.carrierCode,
      departure: segment.departure.at.split('T')[1].substring(0,5),
      arrival: segment.arrival.at.split('T')[1].substring(0,5),
      price: f.price.total
    };
  });

  return flights;
}

module.exports = { searchFlights };
