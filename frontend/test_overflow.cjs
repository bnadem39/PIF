const http = require('http');

async function test() {
  const res = await fetch('http://localhost:3000/');
  const html = await res.text();
  console.log('Fetched HTML length:', html.length);
}

test();

