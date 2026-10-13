async function check() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  const cssMatches = [...html.matchAll(/href="([^"]+\.css)"/g)];
  console.log('CSS links found:', cssMatches.length);
  for (const m of cssMatches) {
    const cssUrl = 'http://localhost:3000' + m[1];
    const cssRes = await fetch(cssUrl);
    const css = await cssRes.text();
    console.log('URL:', m[1], 'SIZE:', css.length, 'bytes');
    console.log('Has flex:', css.includes('.flex'));
    console.log('Has rounded:', css.includes('.rounded'));
    console.log('Has bg-:', css.includes('background-color'));
  }
}
check().catch(console.error);
