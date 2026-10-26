// Maakt een 16:9-slide (1600×900) van een periode-overzicht en exporteert die als PDF of PNG.
window.Slide = (() => {
  'use strict';
  const W = 1600, H = 900, BG = '#F4F4F1';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, dec = 0) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);

  function html(d) {
    const showMonths = d.months.length > 1;
    const cats = d.cats.slice(0, showMonths ? 5 : 7);
    const maxCat = Math.max(...cats.map((c) => c.amount), 1);
    const results = d.results.slice(0, 3);
    const over = d.remaining < 0;

    const meter = d.cats.map((c) =>
      `<span style="width:${Math.min((c.amount / Math.max(d.budget, d.spent)) * 100, 100)}%;background:${c.color}"></span>`).join('');

    const catRows = cats.length ? cats.map((c) => `
      <div class="sl-cat">
        <i style="background:${c.color}"></i>
        <span class="sl-cat-name">${esc(c.name)}</span>
        <span class="sl-cat-bar"><b style="width:${(c.amount / maxCat) * 100}%;background:${c.color}"></b></span>
        <span class="sl-cat-amt">${money(c.amount)}</span>
        <span class="sl-cat-pct">${Math.round(c.share)}%</span>
      </div>`).join('') : '<p class="sl-empty">Nog geen uitgaven in deze periode.</p>';

    const months = showMonths ? `
      <div class="sl-months">
        ${d.months.map((m) => `
          <div class="sl-month">
            <div class="sl-month-bar"><b style="height:${Math.min((m.spent / m.budget) * 100, 100)}%"></b></div>
            <strong>${money(m.spent)}</strong><span>${esc(m.label)}</span>
          </div>`).join('')}
      </div>` : '';

    const resultCards = results.length ? results.map((e) => `
      <div class="sl-res">
        <div class="sl-res-top"><span><i style="background:${e.color}"></i>${esc(e.category)}</span><span>${money(e.amount)}</span></div>
        <div class="sl-res-title">${esc(e.description)}</div>
        <div class="sl-res-out">${esc(e.result)}</div>
      </div>`).join('')
      : '<p class="sl-empty">Nog geen resultaten vastgelegd. Noteer bij een uitgave wat die opleverde — leads, bereik, nieuwe klanten.</p>';

    return `
    <div class="slide">
      <div class="sl-head">
        <div>
          <div class="sl-brand"><span class="logo-mark"></span>Cartec Marketingbudget</div>
          <h1>${esc(d.title)}</h1>
          <p class="sl-sub">${esc(d.subtitle)} · waar gaat het budget naartoe?</p>
        </div>
        <div class="sl-kpis">
          <div><span>Budget</span><strong>${money(d.budget)}</strong></div>
          <div><span>Besteed</span><strong>${money(d.spent)}</strong></div>
          <div class="${over ? 'neg' : 'pos'}"><span>${over ? 'Overschreden' : 'Resterend'}</span><strong>${money(Math.abs(d.remaining))}</strong></div>
        </div>
      </div>
      <div class="sl-meter-wrap">
        <div class="sl-meter">${meter}</div>
        <span class="sl-meter-label">${d.pct}% benut</span>
      </div>
      <div class="sl-body">
        <div class="sl-col">
          <h2>Per categorie</h2>
          ${catRows}
          ${months}
        </div>
        <div class="sl-col">
          <h2>Wat het oplevert</h2>
          ${resultCards}
        </div>
      </div>
      <div class="sl-foot">
        <span>Budget ${money(d.monthly)} per maand · bijdrage dealers + Cartec HQ</span>
        <span>${d.count} ${d.count === 1 ? 'uitgave' : 'uitgaven'} · gegenereerd op ${esc(d.generated)}</span>
      </div>
    </div>`;
  }

  async function render(d) {
    const stage = document.getElementById('slide-stage');
    stage.innerHTML = html(d);
    await document.fonts.ready;
    try {
      return await html2canvas(stage.firstElementChild, { scale: 2, backgroundColor: BG, logging: false, width: W, height: H, windowWidth: W, windowHeight: H });
    } finally {
      stage.innerHTML = '';
    }
  }

  async function pdf(d, filename) {
    const canvas = await render(d);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], hotfixes: ['px_scaling'], compress: true });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
    doc.setProperties({ title: `Cartec Marketingbudget – ${d.title}` });
    doc.save(`${filename}.pdf`);
  }

  async function png(d, filename) {
    const canvas = await render(d);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return { html, pdf, png };
})();
