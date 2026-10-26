(() => {
  'use strict';
  const C = window.CARTEC_CONFIG;
  const Store = window.Store;
  const BUDGET = Number(C.MONTHLY_BUDGET) || 2000;
  const [START_Y, START_M] = C.START_MONTH.split('-').map(Number);
  const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const MON = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const PALETTE = ['#5B6CFF', '#22B8CF', '#2FBF71', '#FFB020', '#FF6B6B', '#9B6BFF', '#F06595', '#0F1115', '#94A3B8', '#A3C93A'];
  const NO_CAT = { id: 'none', name: 'Zonder categorie', color: '#B8BCC6' };

  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toast = document.getElementById('toast');

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, dec = 2) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);
  const pad = (n) => String(n).padStart(2, '0');
  const mkey = (y, m) => `${y}-${pad(m)}`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const sum = (list) => Math.round(list.reduce((t, e) => t + e.amount, 0) * 100) / 100;
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const parseAmount = (v) => {
    let s = String(v).trim().replace(/[€\s]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  };
  const icon = (name) => ({
    prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    pdf: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/></svg>',
    img: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M4 16l4.5-4.5 4 4 2.5-2.5L20 18"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>',
    trend: '<svg viewBox="0 0 24 24"><path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/></svg>',
  }[name]);

  function toast(msg, type = '') {
    $toast.textContent = msg;
    $toast.className = `show ${type}`;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { $toast.className = ''; }, 3200);
  }
  const fail = (err) => { console.error(err); toast(err?.message || 'Er ging iets mis', 'err'); };

  // ---------- periodes ----------
  const now = new Date();
  const NOW_Y = now.getFullYear(), NOW_M = now.getMonth() + 1;
  const afterStart = (y, m) => y > START_Y || (y === START_Y && m >= START_M);

  function currentPeriod(type = 'month') {
    let y = NOW_Y, m = NOW_M;
    if (!afterStart(y, m)) { y = START_Y; m = START_M; }
    return type === 'quarter' ? { type, y, q: Math.ceil(m / 3) } : { type, y, m };
  }
  function periodMonths(p) {
    const list = p.type === 'month' ? [[p.y, p.m]] : [0, 1, 2].map((i) => [p.y, (p.q - 1) * 3 + 1 + i]);
    return list.filter(([y, m]) => afterStart(y, m)).map(([y, m]) => ({ y, m, key: mkey(y, m) }));
  }
  function shiftPeriod(p, dir) {
    if (p.type === 'month') {
      let y = p.y, m = p.m + dir;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      return { ...p, y, m };
    }
    let y = p.y, q = p.q + dir;
    if (q < 1) { q = 4; y--; } if (q > 4) { q = 1; y++; }
    return { ...p, y, q };
  }
  const periodLabel = (p) => (p.type === 'month' ? `${cap(MONTHS[p.m - 1])} ${p.y}` : `Q${p.q} ${p.y}`);
  function periodSub(p) {
    const ms = periodMonths(p);
    if (p.type === 'month') return `1 – ${new Date(p.y, p.m, 0).getDate()} ${MONTHS[p.m - 1]}`;
    return ms.length > 1 ? `${cap(MONTHS[ms[0].m - 1])} t/m ${MONTHS[ms.at(-1).m - 1]} ${p.y}` : `${cap(MONTHS[ms[0].m - 1])} ${p.y}`;
  }
  const periodFile = (p) => `cartec-marketingbudget-${p.type === 'month' ? mkey(p.y, p.m) : `${p.y}-Q${p.q}`}`;
  const isCurrentMonth = (p) => p.type === 'month' && p.y === NOW_Y && p.m === NOW_M;

  // ---------- state ----------
  const S = { user: null, categories: [], expenses: [], tab: 'overview', period: currentPeriod('month') };
  const catById = (id) => S.categories.find((c) => c.id === id) || NO_CAT;
  const activeCats = () => S.categories.filter((c) => c.active !== false);

  function summarize(p) {
    const months = periodMonths(p);
    const keys = new Set(months.map((x) => x.key));
    const list = S.expenses.filter((e) => keys.has(e.date.slice(0, 7)));
    const budget = months.length * BUDGET;
    const spent = sum(list);
    const byCat = new Map();
    for (const e of list) {
      const c = catById(e.category_id);
      const row = byCat.get(c.id) || { ...c, amount: 0, count: 0 };
      row.amount += e.amount; row.count++;
      byCat.set(c.id, row);
    }
    const cats = [...byCat.values()]
      .map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100, share: spent ? (c.amount / spent) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
    return {
      list, budget, spent, cats,
      remaining: Math.round((budget - spent) * 100) / 100,
      pct: budget ? Math.round((spent / budget) * 100) : 0,
      missing: list.filter((e) => !e.invoice_path).length,
      months: months.map((mo) => ({ label: cap(MONTHS[mo.m - 1]), spent: sum(list.filter((e) => e.date.startsWith(mo.key))), budget: BUDGET })),
      results: list.filter((e) => e.result && e.result.trim())
        .sort((a, b) => b.amount - a.amount)
        .map((e) => ({ ...e, category: catById(e.category_id).name, color: catById(e.category_id).color })),
    };
  }

  function slideData(p) {
    const s = summarize(p);
    return {
      ...s, title: periodLabel(p), subtitle: periodSub(p), monthly: BUDGET, count: s.list.length,
      generated: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }

  async function exportSlide(p, kind, btn) {
    if (btn) btn.disabled = true;
    toast(kind === 'pdf' ? 'PDF wordt gemaakt…' : 'Afbeelding wordt gemaakt…');
    try {
      await window.Slide[kind](slideData(p), periodFile(p));
      toast(kind === 'pdf' ? 'PDF opgeslagen' : 'Afbeelding opgeslagen', 'ok');
    } catch (err) { fail(err); } finally { if (btn) btn.disabled = false; }
  }

  async function loadData() {
    [S.categories, S.expenses] = await Promise.all([Store.listCategories(), Store.listExpenses()]);
  }

  // ---------- views ----------
  function render() {
    if (!S.user) { $app.innerHTML = viewLogin(); return; }
    const tabs = [['overview', 'Overzicht'], ['archive', 'Archief'], ['categories', 'Categorieën']];
    const body = { overview: viewOverview, archive: viewArchive, categories: viewCategories }[S.tab]();
    $app.innerHTML = `
      <header class="top">
        <div class="wrap top-in">
          <a class="brand" href="#" data-action="tab" data-tab="overview"><span class="logo-mark"></span><span>Cartec <em>Marketingbudget</em></span></a>
          <nav class="tabs">${tabs.map(([k, l]) => `<button data-action="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>
          <div class="user">
            ${Store.mode === 'demo'
              ? '<span class="badge" title="Gegevens worden alleen in deze browser bewaard. Koppel Supabase om online te werken.">Demo-modus</span>'
              : `<span class="user-mail">${esc(S.user.email)}</span><button class="icon-btn" data-action="logout" title="Uitloggen" aria-label="Uitloggen">${icon('out')}</button>`}
          </div>
        </div>
      </header>
      <main class="wrap">${body}</main>`;
  }

  function viewLogin() {
    return `
      <div class="login">
        <form class="login-card" id="login-form">
          <div class="brand big"><span class="logo-mark"></span><span>Cartec <em>Marketingbudget</em></span></div>
          <p class="muted">Log in om het marketingbudget te bekijken en bij te werken.</p>
          <label>E-mailadres<input type="email" name="email" autocomplete="username" required></label>
          <label>Wachtwoord<input type="password" name="password" autocomplete="current-password" required></label>
          <button class="btn primary wide" type="submit">Inloggen</button>
          <button class="link" type="button" data-action="forgot">Wachtwoord vergeten?</button>
        </form>
      </div>`;
  }

  function viewOverview() {
    const p = S.period;
    const s = summarize(p);
    const canPrev = periodMonths(shiftPeriod(p, -1)).length > 0;
    const over = s.remaining < 0;
    const scale = Math.max(s.budget, s.spent);
    const segs = s.cats.map((c) => `<span style="width:${(c.amount / scale) * 100}%;background:${c.color}" title="${esc(c.name)}: ${money(c.amount)}"></span>`).join('');

    let note = `${s.months.length} ${s.months.length === 1 ? 'maand' : 'maanden'} × ${money(BUDGET, 0)}`;
    if (isCurrentMonth(p)) {
      const daysLeft = new Date(NOW_Y, NOW_M, 0).getDate() - now.getDate() + 1;
      const next = MONTHS[NOW_M % 12];
      note = `Nog ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'} · op 1 ${next} start een nieuwe maand met ${money(BUDGET, 0)}`;
    }

    const catList = s.cats.length ? s.cats.map((c) => `
      <div class="cat-row">
        <div class="cat-row-top"><span class="dot" style="background:${c.color}"></span><span class="cat-name">${esc(c.name)}</span><span class="cat-amt">${money(c.amount)}</span></div>
        <div class="bar"><b style="width:${c.share}%;background:${c.color}"></b></div>
        <div class="cat-row-sub">${Math.round(c.share)}% van besteed · ${c.count} ${c.count === 1 ? 'uitgave' : 'uitgaven'}</div>
      </div>`).join('') : '<p class="empty">Nog geen uitgaven in deze periode.</p>';

    const expList = s.list.length ? s.list.map((e) => {
      const c = catById(e.category_id);
      const [, m, d] = e.date.split('-').map(Number);
      return `
      <div class="exp" role="button" tabindex="0" data-action="edit" data-id="${e.id}">
        <div class="exp-date"><strong>${d}</strong><span>${MON[m - 1]}</span></div>
        <div class="exp-main">
          <div class="exp-title">${esc(e.description)}</div>
          <div class="exp-meta">
            <span class="chip"><i style="background:${c.color}"></i>${esc(c.name)}</span>
            ${e.result ? `<span class="result">${icon('trend')}${esc(e.result)}</span>` : ''}
          </div>
        </div>
        <div class="exp-right">
          <div class="exp-amt">${money(e.amount)}</div>
          ${e.invoice_path
            ? `<button class="inv" data-action="invoice" data-id="${e.id}" title="${esc(e.invoice_name)}">${icon('file')}Factuur</button>`
            : '<span class="inv missing">Geen factuur</span>'}
        </div>
      </div>`;
    }).join('') : `<div class="empty-state"><p>Nog geen uitgaven in ${p.type === 'month' ? 'deze maand' : 'dit kwartaal'}.</p><button class="btn primary" data-action="add">${icon('plus')}Eerste uitgave toevoegen</button></div>`;

    return `
      <section class="toolbar">
        <div class="seg" role="tablist">
          <button data-action="ptype" data-type="month" class="${p.type === 'month' ? 'on' : ''}">Maand</button>
          <button data-action="ptype" data-type="quarter" class="${p.type === 'quarter' ? 'on' : ''}">Kwartaal</button>
        </div>
        <div class="pnav">
          <button class="icon-btn" data-action="shift" data-dir="-1" ${canPrev ? '' : 'disabled'} aria-label="Vorige">${icon('prev')}</button>
          <div class="plabel"><strong>${periodLabel(p)}</strong><span>${periodSub(p)}</span></div>
          <button class="icon-btn" data-action="shift" data-dir="1" aria-label="Volgende">${icon('next')}</button>
        </div>
        <div class="actions">
          <button class="btn ghost" data-action="png" title="Download de slide als afbeelding">${icon('img')}<span>Afbeelding</span></button>
          <button class="btn ghost" data-action="pdf">${icon('pdf')}<span>Sla op als PDF</span></button>
          <button class="btn primary" data-action="add">${icon('plus')}<span>Uitgave</span></button>
        </div>
      </section>

      <section class="card hero">
        <div class="hero-top">
          <div>
            <div class="eyebrow">Besteed</div>
            <div class="big-num">${money(s.spent)}</div>
            <div class="muted">van ${money(s.budget, 0)} budget</div>
          </div>
          <div class="kpis">
            <div><span>${over ? 'Overschreden' : 'Resterend'}</span><strong class="${over ? 'neg' : ''}">${money(Math.abs(s.remaining))}</strong></div>
            <div><span>Benut</span><strong>${s.pct}%</strong></div>
            <div><span>Facturen</span><strong>${s.list.length - s.missing}<small>/${s.list.length}</small></strong></div>
          </div>
        </div>
        <div class="meter ${over ? 'over' : ''}">${segs}</div>
        <div class="meter-foot"><span>${note}</span>${s.missing ? `<span class="warn">${s.missing} ${s.missing === 1 ? 'factuur ontbreekt' : 'facturen ontbreken'}</span>` : ''}</div>
      </section>

      <section class="grid">
        <div class="card">
          <div class="card-head"><h3>Per categorie</h3></div>
          ${catList}
        </div>
        <div class="card">
          <div class="card-head"><h3>Uitgaven</h3><span class="count">${s.list.length}</span></div>
          <div class="exp-list">${expList}</div>
        </div>
      </section>`;
  }

  function viewArchive() {
    const last = S.expenses.reduce((k, e) => (e.date.slice(0, 7) > k ? e.date.slice(0, 7) : k), mkey(NOW_Y, NOW_M));
    const [LY, LM] = last.split('-').map(Number);
    const months = [];
    for (let y = START_Y, m = START_M; y < LY || (y === LY && m <= LM); m === 12 ? (m = 1, y++) : m++) months.push({ type: 'month', y, m });
    months.reverse();
    const quarters = [];
    for (const mo of months) {
      const q = { type: 'quarter', y: mo.y, q: Math.ceil(mo.m / 3) };
      if (!quarters.some((x) => x.y === q.y && x.q === q.q)) quarters.push(q);
    }

    const row = (p) => {
      const s = summarize(p);
      const id = p.type === 'month' ? `m:${p.y}:${p.m}` : `q:${p.y}:${p.q}`;
      return `
        <div class="arch-row">
          <div class="arch-name"><strong>${periodLabel(p)}</strong>${isCurrentMonth(p) ? '<span class="pill">Lopend</span>' : ''}</div>
          <div class="arch-bar"><div class="bar"><b style="width:${Math.min(s.pct, 100)}%" class="${s.pct > 100 ? 'neg' : ''}"></b></div><span>${s.pct}%</span></div>
          <div class="arch-amt">${money(s.spent)} <span class="muted">/ ${money(s.budget, 0)}</span></div>
          <div class="arch-count muted">${s.list.length} ${s.list.length === 1 ? 'uitgave' : 'uitgaven'}</div>
          <div class="arch-act">
            <button class="btn ghost sm" data-action="view" data-p="${id}">Bekijk</button>
            <button class="btn ghost sm" data-action="arch-pdf" data-p="${id}">${icon('pdf')}PDF</button>
          </div>
        </div>`;
    };

    return `
      <section class="page-head">
        <h2>Archief</h2>
        <p class="muted">Elke maand start opnieuw met ${money(BUDGET, 0)}. Alle eerdere maanden en kwartalen blijven hier bewaard en zijn altijd als PDF te downloaden.</p>
      </section>
      <section class="card">
        <div class="card-head"><h3>Kwartalen</h3><span class="muted small">voor de dealer meetup</span></div>
        ${quarters.map(row).join('')}
      </section>
      <section class="card">
        <div class="card-head"><h3>Maanden</h3></div>
        ${months.map(row).join('')}
      </section>`;
  }

  function viewCategories() {
    const counts = new Map();
    for (const e of S.expenses) counts.set(e.category_id, (counts.get(e.category_id) || 0) + 1);
    const used = new Set(activeCats().map((c) => c.color));
    const free = PALETTE.find((c) => !used.has(c)) || PALETTE[0];
    return `
      <section class="page-head">
        <h2>Categorieën</h2>
        <p class="muted">Deel uitgaven in per categorie. Een categorie die al gebruikt is, verdwijnt uit de keuzelijst maar blijft zichtbaar bij oude uitgaven.</p>
      </section>
      <section class="card">
        <form id="cat-form" class="cat-form">
          <input name="name" placeholder="Nieuwe categorie, bijv. Evenementen" required maxlength="40">
          <div class="swatches">${PALETTE.map((c) => `<label class="swatch"><input type="radio" name="color" value="${c}" ${c === free ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>
          <button class="btn primary" type="submit">${icon('plus')}Toevoegen</button>
        </form>
        <div class="cat-list">
          ${activeCats().map((c) => `
            <div class="cat-item">
              <span class="dot lg" style="background:${c.color}"></span>
              <span class="cat-name">${esc(c.name)}</span>
              <span class="muted small">${counts.get(c.id) || 0} ${(counts.get(c.id) || 0) === 1 ? 'uitgave' : 'uitgaven'}</span>
              <button class="icon-btn" data-action="del-cat" data-id="${c.id}" title="Verwijderen" aria-label="Verwijder ${esc(c.name)}">${icon('trash')}</button>
            </div>`).join('') || '<p class="empty">Nog geen categorieën.</p>'}
        </div>
      </section>`;
  }

  // ---------- modals ----------
  function openModal(html, onMount) {
    $modal.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    document.body.classList.add('locked');
    const back = $modal.firstElementChild;
    back.addEventListener('mousedown', (ev) => { if (ev.target === back) closeModal(); });
    onMount?.($modal.querySelector('.modal'));
    $modal.querySelector('input:not([type=hidden]):not([type=radio]), textarea')?.focus();
  }
  function closeModal() { $modal.innerHTML = ''; document.body.classList.remove('locked'); }

  function confirmDialog(title, text, okLabel = 'Verwijderen') {
    return new Promise((resolve) => {
      openModal(`
        <h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>
        <div class="modal-foot"><span></span><div><button class="btn ghost" data-r="0">Annuleren</button><button class="btn danger" data-r="1">${esc(okLabel)}</button></div></div>`,
      (m) => m.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-r]');
        if (b) { closeModal(); resolve(b.dataset.r === '1'); }
      }));
    });
  }

  function openExpense(existing) {
    const e = existing || { date: todayISO(), description: '', amount: '', category_id: activeCats()[0]?.id, result: '' };
    const cats = S.categories.filter((c) => c.active !== false || c.id === e.category_id);
    const amount = existing ? String(e.amount.toFixed(2)).replace('.', ',') : '';
    openModal(`
      <form id="exp-form">
        <h3>${existing ? 'Uitgave bewerken' : 'Uitgave toevoegen'}</h3>
        <label>Omschrijving<input name="description" required maxlength="120" value="${esc(e.description)}" placeholder="Bijv. Meta-campagne najaarsactie"></label>
        <div class="row2">
          <label>Bedrag (€)<input name="amount" required inputmode="decimal" value="${amount}" placeholder="0,00"></label>
          <label>Datum<input name="date" type="date" required value="${e.date}" min="${mkey(START_Y, START_M)}-01"></label>
        </div>
        <fieldset><legend>Categorie</legend>
          <div class="chips">${cats.map((c) => `<label class="chip-opt"><input type="radio" name="category_id" value="${c.id}" ${c.id === e.category_id ? 'checked' : ''} required><span><i style="background:${c.color}"></i>${esc(c.name)}</span></label>`).join('')}</div>
        </fieldset>
        <label class="drop">
          <input type="file" name="file" accept="application/pdf,image/*">
          <span class="drop-in">${icon('file')}<span class="drop-text">${existing?.invoice_name ? `Huidige factuur: <strong>${esc(existing.invoice_name)}</strong> — klik om te vervangen` : 'Factuur uploaden <span class="muted">(PDF of foto)</span>'}</span></span>
        </label>
        <label>Wat leverde het op? <span class="muted">(optioneel, kan later)</span>
          <textarea name="result" rows="2" maxlength="200" placeholder="Bijv. 38 leads, 11 afspraken, 4.200 bereik">${esc(e.result)}</textarea>
        </label>
        <div class="modal-foot">
          ${existing ? `<button type="button" class="btn ghost danger-text" data-action="del-exp">${icon('trash')}Verwijderen</button>` : '<span></span>'}
          <div><button type="button" class="btn ghost" data-action="cancel">Annuleren</button><button type="submit" class="btn primary">Opslaan</button></div>
        </div>
      </form>`,
    (m) => {
      const form = m.querySelector('form');
      const fileInput = form.elements.file;
      fileInput.addEventListener('change', () => {
        const f = fileInput.files[0];
        if (f) m.querySelector('.drop-text').innerHTML = `<strong>${esc(f.name)}</strong> <span class="muted">${(f.size / 1024 / 1024).toFixed(1)} MB</span>`;
        m.querySelector('.drop').classList.toggle('has', !!f);
      });
      m.addEventListener('click', async (ev) => {
        const a = ev.target.closest('[data-action]')?.dataset.action;
        if (a === 'cancel') closeModal();
        if (a === 'del-exp') {
          if (!(await confirmDialog('Uitgave verwijderen?', `"${existing.description}" en de bijbehorende factuur worden definitief verwijderd.`))) return openExpense(existing);
          try { await Store.deleteExpense(existing); await loadData(); render(); toast('Uitgave verwijderd', 'ok'); } catch (err) { fail(err); }
        }
      });
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(form);
        const amt = parseAmount(fd.get('amount'));
        if (!(amt > 0)) { toast('Vul een geldig bedrag in', 'err'); form.elements.amount.focus(); return; }
        const file = fileInput.files[0];
        if (file && file.size > 10 * 1024 * 1024) { toast('Factuur is groter dan 10 MB', 'err'); return; }
        const fields = {
          description: fd.get('description').trim(), amount: amt, date: fd.get('date'),
          category_id: fd.get('category_id'), result: fd.get('result').trim() || null,
        };
        const btn = form.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = 'Opslaan…';
        try {
          await Store.saveExpense(fields, file, existing);
          await loadData();
          closeModal();
          // Spring naar de periode van de uitgave, zodat je hem meteen ziet.
          const [y, m2] = fields.date.split('-').map(Number);
          S.period = S.period.type === 'month' ? { type: 'month', y, m: m2 } : { type: 'quarter', y, q: Math.ceil(m2 / 3) };
          S.tab = 'overview';
          render();
          toast(file || existing?.invoice_path ? 'Uitgave opgeslagen' : 'Opgeslagen — vergeet de factuur niet', 'ok');
        } catch (err) { fail(err); btn.disabled = false; btn.textContent = 'Opslaan'; }
      });
    });
  }

  function openPasswordReset() {
    openModal(`
      <form id="pw-form">
        <h3>Nieuw wachtwoord instellen</h3>
        <label>Nieuw wachtwoord<input type="password" name="pw" minlength="8" required autocomplete="new-password"></label>
        <div class="modal-foot"><span></span><div><button type="submit" class="btn primary">Opslaan</button></div></div>
      </form>`,
    (m) => m.querySelector('form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try { await Store.updatePassword(ev.target.elements.pw.value); closeModal(); toast('Wachtwoord gewijzigd', 'ok'); } catch (err) { fail(err); }
    }));
  }

  // ---------- events ----------
  const parseP = (s) => {
    const [t, y, n] = s.split(':');
    return t === 'm' ? { type: 'month', y: +y, m: +n } : { type: 'quarter', y: +y, q: +n };
  };

  $app.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    if (a === 'tab') { ev.preventDefault(); S.tab = el.dataset.tab; render(); window.scrollTo(0, 0); }
    if (a === 'ptype') {
      const cur = S.period;
      const m = cur.type === 'month' ? cur.m : (cur.q - 1) * 3 + 1;
      S.period = el.dataset.type === 'quarter' ? { type: 'quarter', y: cur.y, q: Math.ceil(m / 3) } : (cur.type === 'month' ? cur : { type: 'month', ...clampMonth(cur.y, m) });
      render();
    }
    if (a === 'shift') { S.period = shiftPeriod(S.period, Number(el.dataset.dir)); render(); }
    if (a === 'add') openExpense();
    if (a === 'edit') openExpense(S.expenses.find((e) => e.id === el.dataset.id));
    if (a === 'invoice') {
      ev.stopPropagation();
      const w = window.open('', '_blank');
      try { w.location = await Store.invoiceUrl(S.expenses.find((e) => e.id === el.dataset.id)); } catch (err) { w?.close(); fail(err); }
    }
    if (a === 'pdf' || a === 'png') exportSlide(S.period, a, el);
    if (a === 'arch-pdf') exportSlide(parseP(el.dataset.p), 'pdf', el);
    if (a === 'view') { S.period = parseP(el.dataset.p); S.tab = 'overview'; render(); window.scrollTo(0, 0); }
    if (a === 'del-cat') {
      const c = catById(el.dataset.id);
      if (!(await confirmDialog(`"${c.name}" verwijderen?`, 'Bestaande uitgaven in deze categorie blijven bewaard en houden hun categorie.'))) return;
      try { await Store.deleteCategory(c.id); await loadData(); render(); toast('Categorie verwijderd', 'ok'); } catch (err) { fail(err); }
    }
    if (a === 'logout') { await Store.signOut(); S.user = null; render(); }
    if (a === 'forgot') {
      const email = $app.querySelector('[name=email]').value.trim();
      if (!email) { toast('Vul eerst je e-mailadres in', 'err'); return; }
      try { await Store.resetPassword(email); toast('Check je mail voor een link om je wachtwoord te herstellen', 'ok'); } catch (err) { fail(err); }
    }
  });

  function clampMonth(y, m) { return afterStart(y, m) ? { y, m } : { y: START_Y, m: START_M }; }

  $app.addEventListener('keydown', (ev) => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.exp[role=button]')) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && $modal.innerHTML) closeModal(); });

  $app.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    if (f.id === 'login-form') {
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Bezig…';
      try {
        await Store.signIn(f.elements.email.value.trim(), f.elements.password.value);
        S.user = await Store.getUser();
        await loadData();
        render();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Inloggen';
        toast(/invalid/i.test(err?.message) ? 'E-mailadres of wachtwoord klopt niet' : (err?.message || 'Inloggen mislukt'), 'err');
      }
    }
    if (f.id === 'cat-form') {
      const name = f.elements.name.value.trim();
      if (!name) return;
      if (activeCats().some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast('Die categorie bestaat al', 'err'); return; }
      try { await Store.addCategory(name, f.elements.color.value); await loadData(); render(); toast('Categorie toegevoegd', 'ok'); } catch (err) { fail(err); }
    }
  });

  // ---------- start ----------
  (async () => {
    try {
      await Store.init();
      Store.onAuth((event, user) => {
        if (event === 'PASSWORD_RECOVERY') openPasswordReset();
        if (event === 'SIGNED_OUT') { S.user = null; render(); }
      });
      S.user = await Store.getUser();
      if (S.user) await loadData();
    } catch (err) { fail(err); }
    render();
  })();
})();
