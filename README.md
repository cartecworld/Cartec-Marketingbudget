# Cartec Marketingbudget

Een eenvoudige webapp om het gezamenlijke marketingbudget te verantwoorden: **€2.000 per maand** (vanaf oktober 2026).

- Uitgaven toevoegen met **factuur** (PDF of foto), **categorie** en optioneel **wat het opleverde**
- Elke maand begint automatisch weer op €0 besteed. Oude maanden blijven bewaard in het **Archief**
- Overzicht per **maand** of **kwartaal**
- **Sla op als PDF**: één 16:9-slide voor de dealer meetup. Er is ook een PNG-versie om in PowerPoint of Keynote te plakken
- Categorieën zelf toevoegen en verwijderen
- Afgeschermd met een login, alleen voor de 4 teamleden

## Hoe het werkt

| Onderdeel | Dienst | Kosten |
|---|---|---|
| Website | GitHub Pages | gratis |
| Login, database en facturen | Supabase (free tier: 500 MB database, 1 GB bestanden) | gratis |

De code staat op GitHub. Daar staan geen gegevens in: uitgaven en facturen staan in Supabase en zijn alleen zichtbaar voor wie inlogt.

Zolang `js/config.js` nog niet is ingevuld, draait de app in **demo-modus**. De gegevens blijven dan alleen in je eigen browser staan. Zo kun je de app eerst uitproberen.

---

## Online zetten (± 20 minuten, eenmalig)

### 1. Supabase-project aanmaken
1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account aan (inloggen met GitHub kan ook).
2. Klik op **New project**. Kies als naam `cartec-marketingbudget` en als regio **Central EU (Frankfurt)**, en verzin een databasewachtwoord (bewaar dat goed).
3. Wacht tot het project klaar is (± 1 minuut).

### 2. Database klaarzetten
1. Ga in Supabase naar **SQL Editor** en klik op **New query**.
2. Plak de volledige inhoud van [`supabase/schema.sql`](supabase/schema.sql) en klik op **Run**.
   Dit maakt de tabellen, de afgeschermde opslag voor facturen en de 6 startcategorieën aan.

### 3. Toegang regelen voor de 4 gebruikers
1. Ga naar **Authentication → Sign In / Providers → Email** (of **Settings**) en zet **Allow new users to sign up** **uit**. Daarmee kan niemand anders een account aanmaken.
2. Ga naar **Authentication → Users → Add user → Create new user**. Vul het e-mailadres en een tijdelijk wachtwoord in en vink **Auto Confirm User** aan. Herhaal dit voor alle 4 de mensen.
   Iedereen kan het wachtwoord daarna zelf wijzigen via *Wachtwoord vergeten?* op het inlogscherm.

### 4. Sleutels in de app zetten
1. Ga naar **Project Settings → API** (of **API Keys**).
2. Kopieer de **Project URL** en de **anon / publishable key** naar `js/config.js`:
   ```js
   SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```
   Deze sleutel mag openbaar zijn. Zonder inlog geeft hij geen toegang tot gegevens (dat regelt de *row level security* uit stap 2). Gebruik **nooit** de `service_role`/`secret` key.

### 5. Op GitHub Pages zetten
1. Maak op GitHub een nieuwe repository aan, bijvoorbeeld `cartec-marketingbudget`.
   Gebruik **Public**: GitHub Pages is alleen gratis voor publieke repo's. Dat is geen probleem, want er staat alleen code in en geen gegevens.
2. Upload alle bestanden uit deze map, inclusief de map `.github`. Dat kan met GitHub Desktop of via *Add file → Upload files*.
3. Ga naar **Settings → Pages**. Kies onder *Build and deployment* de optie **Deploy from a branch**, met branch `main` en map `/ (root)`, en klik op **Save**.
4. Na ± 1 minuut staat de app op `https://<jouw-account>.github.io/cartec-marketingbudget/`.

### 6. Laatste instellingen
1. **Supabase → Authentication → URL Configuration**: zet **Site URL** op de GitHub Pages-link uit stap 5. Daardoor werkt de mail voor *Wachtwoord vergeten* goed.
2. **Keep-alive** (belangrijk): Supabase zet gratis projecten na 7 dagen zonder gebruik op pauze. De meegeleverde GitHub Action voorkomt dat.
   Ga in je GitHub-repo naar **Settings → Secrets and variables → Actions → New repository secret** en maak er twee aan:
   - `SUPABASE_URL`: dezelfde URL als in `config.js`
   - `SUPABASE_ANON_KEY`: dezelfde key als in `config.js`

   Test de workflow via **Actions → Supabase keep-alive → Run workflow**.
   Let op: GitHub schakelt geplande workflows uit als er 60 dagen niets aan de repo verandert. Je krijgt dan een mail en kunt hem met één klik weer aanzetten.

Klaar. Deel de link met de 4 gebruikers.

---

## Gebruik

- **Uitgave toevoegen**: klik op *+ Uitgave*. Vul de omschrijving, het bedrag, de datum en de categorie in en upload de factuur. Bij *Wat leverde het op?* noteer je bijvoorbeeld leads, bereik of nieuwe klanten. Dat kan ook later, door op de uitgave te klikken.
- **Maandelijkse reset**: het overzicht toont altijd de lopende maand. Op de 1e begint de nieuwe maand weer met €2.000. Er wordt niets weggegooid.
- **Dealer meetup**: zet het overzicht op *Kwartaal* en klik op **Sla op als PDF**. Je krijgt één slide met het budget, de besteding per categorie, het verloop per maand en de opbrengsten.
- **Archief**: alle maanden en kwartalen sinds oktober 2026, elk met een PDF-knop.
- **Categorieën**: zelf toevoegen en verwijderen. Een categorie die al gebruikt is, verdwijnt alleen uit de keuzelijst. Oude uitgaven houden hun categorie.

## Aanpassen

- Ander budget of andere startmaand: pas `MONTHLY_BUDGET` en `START_MONTH` aan in `js/config.js`.
- Kleuren en lettertype: staan bovenaan in `css/style.css` (`:root`).
