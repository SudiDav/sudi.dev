// This is a public Web Analytics site token, not a Cloudflare API credential.
// Keep local previews and alternate deployment URLs out of the visit counts.
if (window.location.hostname === 'stream.sudi.dev') {
  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = JSON.stringify({
    token: 'e3d19c231e87434caea14889beb5b419',
  });
  document.body.append(beacon);
}
