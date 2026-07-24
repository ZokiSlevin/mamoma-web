# Mamoma interijeri — vizualni redizajn v2

Ova verzija podiže postojeću stranicu na moderniji, premium i urednički usmjeren vizualni sustav, bez izmjena PHP obrade forme i ostale poslovne logike.

## Što je promijenjeno

- uvedena kombinacija tipografije **Cormorant Garamond** za velike naslove i **Manrope** za tekst i korisničko sučelje
- definiran topliji premium sustav boja, razmaka, sjena, obruba i manjih radijusa
- početni hero zamijenjen je jednom reprezentativnom fotografijom uz snažniju hijerarhiju, gradijente i uredniji CTA blok
- izrađen je zaseban portretni hero kadar za početnu stranicu na mobitelu
- dodan je vizualni trust-strip odmah ispod hero sekcije
- sekcija „O nama” pretvorena je u editorial kompoziciju s glavnom fotografijom, detaljem i izdvojenom karticom
- usluge su pretvorene iz tri jednake generičke kartice u asimetričnu, slikom vođenu kompoziciju
- prednosti su redizajnirane u elegantan tamni, numerirani editorial prikaz
- proces rada dobio je čišću vremensku liniju i ujednačen ikonografski sustav
- vrste prostora više nisu niz jednakih kartica, već numerirani sadržajni popis
- specijalizacije i galerija koriste moderni bento raspored i kvalitetnije vizualne kadrove
- CTA, FAQ, kontakt, forma, navigacija i footer vizualno su usklađeni s novim sustavom
- navigacija se na užim laptopima i tabletima prebacuje u puni mobilni panel kako bi svi elementi ostali čitljivi i bez prelamanja
- fotografije specijalizacija i naslovne galerije pretvorene su u optimizirane WebP varijante
- svih pet kategorijskih podstranica dobilo je modernizirani hero, galeriju i sadržajne blokove
- za mobilne hero sekcije kategorija izrađeni su zasebni portretni kadrovi za kuhinje, dnevne boravke, ormare, kupaonice i poslovne prostore
- pravne stranice i pomoćna početna stranica usklađene su s novom tipografijom i komponentama

## Organizacija

Glavni dodatni sloj stilova nalazi se u:

`css/visual-refresh.css`

Nove optimizirane fotografije početne stranice nalaze se u:

`images/refresh/`

Portretni hero kadrovi kategorija nalaze se u pripadajućim mapama pod nazivom `*-hero-v2-mobile.webp`.

## Provjera

Projekt je provjeren u desktop prikazu širine 1440 px i mobilnom prikazu širine 390 px za početnu stranicu, svih pet kategorija, pravne stranice i `indexstart.html`.

Rezultati provjere:

- nema horizontalnog overflowa
- nema nepostojećih lokalnih CSS, slikovnih ili HTML resursa
- nema CSS parser pogrešaka
- nema dupliciranih HTML ID oznaka
- hero slike i sadržaj pravilno se prikazuju u desktop i mobilnim omjerima

## Napomena o opsegu

Ovaj dokument opisuje vizualnu fazu koja je poslužila kao baza. Funkcionalni i CRO sloj naknadno je implementiran i dokumentiran u datoteci `FUNKCIONALNI-CRO-REDIZAJN.md`.
