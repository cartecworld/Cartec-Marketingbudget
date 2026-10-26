// Gegevenslaag: Supabase (online) of IndexedDB (demo-modus in de browser).
window.Store = (() => {
  'use strict';
  const C = window.CARTEC_CONFIG;
  const BUCKET = 'facturen';
  const DEFAULT_CATS = [
    ['Advertenties', '#5B6CFF'],
    ['Prijsgeld', '#FFB020'],
    ['Samenwerkingen', '#2FBF71'],
    ['Opleidingen/cursussen', '#9B6BFF'],
    ['Offline marketingmateriaal', '#FF6B6B'],
    ['Online marketingmateriaal', '#22B8CF'],
  ];

  const uid = () => crypto.randomUUID();
  const safeName = (n) => n.normalize('NFKD').replace(/[^\w.\-]+/g, '_').slice(-80);
  const num = (e) => ({ ...e, amount: Number(e.amount) });
  const sortExpenses = (a, b) => (b.date.localeCompare(a.date)) || (String(b.created_at).localeCompare(String(a.created_at)));

  // ---------- Supabase ----------
  function supabaseStore() {
    const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    const ok = ({ data, error }) => { if (error) throw error; return data; };

    return {
      mode: 'supabase',
      async init() {},
      async getUser() { const { data } = await sb.auth.getSession(); return data.session?.user ?? null; },
      onAuth(cb) { sb.auth.onAuthStateChange((event, session) => cb(event, session?.user ?? null)); },
      async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
      async signOut() { await sb.auth.signOut(); },
      async resetPassword(email) {
        ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
      },
      async updatePassword(password) { ok(await sb.auth.updateUser({ password })); },

      async listCategories() { return ok(await sb.from('categories').select('*').order('created_at')); },
      async addCategory(name, color) {
        return ok(await sb.from('categories').insert({ name, color }).select().single());
      },
      async deleteCategory(id) {
        const { count, error } = await sb.from('expenses').select('id', { count: 'exact', head: true }).eq('category_id', id);
        if (error) throw error;
        // In gebruik? Dan archiveren zodat oude uitgaven hun categorie houden.
        if (count > 0) ok(await sb.from('categories').update({ active: false }).eq('id', id));
        else ok(await sb.from('categories').delete().eq('id', id));
      },

      async listExpenses() {
        return ok(await sb.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })).map(num);
      },
      async saveExpense(fields, file, existing) {
        const row = { ...fields };
        if (file) {
          const path = `${fields.date.slice(0, 7)}/${uid()}-${safeName(file.name)}`;
          ok(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined }));
          row.invoice_path = path;
          row.invoice_name = file.name;
        }
        const saved = existing
          ? ok(await sb.from('expenses').update(row).eq('id', existing.id).select().single())
          : ok(await sb.from('expenses').insert(row).select().single());
        if (file && existing?.invoice_path) await sb.storage.from(BUCKET).remove([existing.invoice_path]);
        return num(saved);
      },
      async deleteExpense(e) {
        ok(await sb.from('expenses').delete().eq('id', e.id));
        if (e.invoice_path) await sb.storage.from(BUCKET).remove([e.invoice_path]);
      },
      async invoiceUrl(e) {
        return ok(await sb.storage.from(BUCKET).createSignedUrl(e.invoice_path, 3600)).signedUrl;
      },
    };
  }

  // ---------- Demo (IndexedDB) ----------
  function demoStore() {
    let dbp;
    const db = () => dbp ??= new Promise((res, rej) => {
      const r = indexedDB.open('cartec-marketingbudget', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = async (mode, fn) => {
      const d = await db();
      return new Promise((res, rej) => {
        const t = d.transaction('kv', mode);
        const req = fn(t.objectStore('kv'));
        t.oncomplete = () => res(req.result);
        t.onerror = () => rej(t.error);
      });
    };
    const get = (k) => tx('readonly', (s) => s.get(k));
    const set = (k, v) => tx('readwrite', (s) => s.put(v, k));
    const del = (k) => tx('readwrite', (s) => s.delete(k));

    return {
      mode: 'demo',
      async init() {
        if (await get('categories')) return;
        const cats = DEFAULT_CATS.map(([name, color], i) => ({
          id: uid(), name, color, active: true, created_at: new Date(Date.now() + i).toISOString(),
        }));
        const c = (name) => cats.find((x) => x.name === name).id;
        const ym = C.START_MONTH;
        const ex = (d, description, amount, cat, result) => ({
          id: uid(), date: `${ym}-${d}`, description, amount, category_id: c(cat), result,
          invoice_path: null, invoice_name: null, created_at: new Date().toISOString(),
        });
        await set('categories', cats);
        await set('expenses', [
          ex('03', 'Meta-campagne najaarsactie', 640, 'Advertenties', '38 leads, 11 afspraken'),
          ex('09', 'Google Ads – coating', 420, 'Advertenties', '1.240 klikken, 17 offerte-aanvragen'),
          ex('14', 'Winactie Instagram – detailingpakket', 250, 'Prijsgeld', '+620 volgers'),
          ex('21', 'Flyers & roll-up beurs', 310, 'Offline marketingmateriaal', ''),
        ]);
      },
      async getUser() { return { email: 'demo' }; },
      onAuth() {},
      async signIn() {}, async signOut() {}, async resetPassword() {}, async updatePassword() {},

      async listCategories() { return (await get('categories')) || []; },
      async addCategory(name, color) {
        const cats = await this.listCategories();
        const cat = { id: uid(), name, color, active: true, created_at: new Date().toISOString() };
        await set('categories', [...cats, cat]);
        return cat;
      },
      async deleteCategory(id) {
        const used = (await this.listExpenses()).some((e) => e.category_id === id);
        const cats = await this.listCategories();
        await set('categories', used ? cats.map((c) => (c.id === id ? { ...c, active: false } : c)) : cats.filter((c) => c.id !== id));
      },

      async listExpenses() { return ((await get('expenses')) || []).slice().sort(sortExpenses); },
      async saveExpense(fields, file, existing) {
        const list = (await get('expenses')) || [];
        const row = existing ? { ...existing, ...fields } : { id: uid(), created_at: new Date().toISOString(), invoice_path: null, invoice_name: null, ...fields };
        if (file) {
          if (existing?.invoice_path) await del(existing.invoice_path);
          row.invoice_path = `file:${uid()}`;
          row.invoice_name = file.name;
          await set(row.invoice_path, file);
        }
        await set('expenses', existing ? list.map((e) => (e.id === row.id ? row : e)) : [...list, row]);
        return row;
      },
      async deleteExpense(e) {
        await set('expenses', ((await get('expenses')) || []).filter((x) => x.id !== e.id));
        if (e.invoice_path) await del(e.invoice_path);
      },
      async invoiceUrl(e) { return URL.createObjectURL(await get(e.invoice_path)); },
    };
  }

  return (C.SUPABASE_URL && C.SUPABASE_ANON_KEY) ? supabaseStore() : demoStore();
})();
