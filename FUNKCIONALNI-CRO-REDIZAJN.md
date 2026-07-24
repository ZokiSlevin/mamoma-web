# Mamoma interijeri — funkcionalni i CRO redizajn v1

Ova faza nadograđuje prethodni vizualni redizajn funkcionalnim i konverzijskim slojem. Cilj je skratiti put od interesa do kvalitetnog projektnog upita, olakšati snalaženje na stranici i zadržati premium dojam na desktopu i mobitelu.

## 1. Konverzijski tok

- glavni CTA elementi više ne vode preko dodatne informativne sekcije, nego izravno otvaraju projektni upit
- navigacijska poveznica **Kontakt** i dalje vodi na kontaktnu sekciju, pa korisnik može birati između pregleda kontakta i izravnog slanja upita
- početna i sve kategorijske stranice koriste isti obrazac, istu validaciju i isti način slanja
- upit se na kategorijskim stranicama automatski otvara s unaprijed odabranom vrstom projekta
- sadržaj početne stranice organiziran je u tok: hero → povjerenje → brzi odabir → projekti → usluge → proces → prednosti → o nama → vrste prostora → specijalizacije → FAQ → CTA → kontakt

## 2. Upitnik u tri koraka

### Korak 1 — vrsta projekta

Korisnik bira jednu od kategorija:

- kuhinja po mjeri
- dnevni boravak
- ugradbeni ormari
- kupaonski namještaj
- poslovni prostor
- 3D dizajn interijera
- kompletno opremanje prostora
- ostalo / nisam siguran

### Korak 2 — detalji prostora

Obrazac prikuplja:

- grad ili mjesto projekta
- okvirne dimenzije
- okvirni budžet
- željeni rok
- opis projekta i najvažnije želje
- fotografije prostora ili PDF nacrt

Podržano je do **5 datoteka**, najviše **5 MB po datoteci** i **15 MB ukupno**. Prihvaćeni su JPG, PNG, WebP i PDF formati. Odabrane datoteke prikazuju se kao uklonjive oznake, a podržano je i povlačenje datoteka u zonu za upload.

### Korak 3 — kontakt

Prikupljaju se ime i prezime, e-mail, neobavezni telefon te potvrda obrade podataka. Svaki korak ima vlastitu validaciju, jasne poruke pogreške, indikator napretka i tipke za povratak.

Upit se privremeno sprema u `sessionStorage`, pa se uneseni podaci ne gube pri slučajnom zatvaranju panela tijekom iste kartice preglednika. Datoteke se iz sigurnosnih razloga ne spremaju u preglednik.

## 3. Slanje forme i success-state

- obrazac se šalje AJAX-om bez napuštanja stranice
- početna stranica sada ima isto ponašanje kao kategorijske podstranice
- nakon uspješnog slanja prikazuje se zaseban success-state s objašnjenjem sljedećih koraka
- u slučaju pogreške korisnik dobiva jasnu poruku i može ponovno pokušati
- bez JavaScripta ostaje dostupan puni klasični obrazac; nakon slanja korisnik se vraća na izvornu stranicu uz statusnu poruku
- `send-mail.php` prihvaća nova projektna polja, sigurno obrađuje privitke i u e-mail uključuje izvor CTA-a, stranicu, trajanje obrasca te UTM podatke kada postoje
- postojeće SMTP postavke i vjerodajnice nisu mijenjane

## 4. Mobilni CRO sloj

- stari veliki plutajući gumb zamijenjen je kompaktnom donjom trakom
- traka sadrži primarnu akciju **Pošalji upit** i sekundarnu WhatsApp akciju
- pojavljuje se tek nakon početnog dijela stranice
- automatski se skriva uz kontaktnu sekciju, footer, otvoreni mobilni meni, otvoreni upitnik i galerijski lightbox
- poštuje safe-area prostor na uređajima s izrezom zaslona

## 5. Brže snalaženje

- ispod hero sekcije dodan je brzi odabir za kuhinje, ormare, dnevne boravke, kupaonice, poslovne prostore i kompletno opremanje
- aktivna sekcija označava se u navigaciji tijekom skrolanja
- anchor poveznice koriste glatko skrolanje i poštuju visinu fiksnog headera
- mobilni meni podržava zatvaranje tipkom Escape, klikom izvan panela i zadržavanje fokusa unutar otvorenog menija
- dodana je poveznica **Preskoči na glavni sadržaj** za korisnike tipkovnice i čitača zaslona

## 6. Mikrointerakcije i animacije

- CTA i kartice koriste diskretan pomak, promjenu obruba, sjenu i pomicanje strelice
- sadržaj ulazi u prikaz blagim pomakom i stagger efektom
- proces rada dobio je animiranu liniju napretka
- animacije se isključuju ili skraćuju kada korisnik ima uključen `prefers-reduced-motion`
- FAQ radi kao animirani accordion koji zatvara prethodno otvorenu stavku
- fokusna stanja vidljiva su na tipkovničkoj navigaciji

## 7. Galerije i kontekst projekta

- kategorijske galerije koriste optimizirane WebP datoteke u širinama 640, 960 i 1440 px
- slike imaju `srcset`, definirane dimenzije i odgođeno učitavanje gdje je primjereno
- uz svaku kategorijsku galeriju dodan je sažetak projekta: fokus planiranja, prilagodba prostoru i završna izvedba
- lightbox prikazuje broj slike, naslov, prethodnu/sljedeću fotografiju i unaprijed učitava susjedne slike
- podržani su tipke strelica, Escape, swipe na dodirnim uređajima, focus trap i vraćanje fokusa na prethodno otvorenu fotografiju

## 8. CRO i analitički događaji

Događaji se šalju u `window.dataLayer` i istovremeno emitiraju kao `CustomEvent` naziva `mamoma:analytics`. Time su spremni za povezivanje s Google Tag Managerom ili drugom analitikom bez promjene korisničkog sučelja.

Implementirani događaji:

- `cta_click`
- `form_start`
- `form_step_complete`
- `form_submit`
- `generate_lead`
- `form_error`
- `contact_click`
- `quick_path_click`
- `faq_open`
- `gallery_open`

Događaji sadrže samo kontekst potreban za mjerenje toka, primjerice izvor CTA-a, vrstu projekta, broj koraka i postojanje privitaka. Osobni podaci iz forme ne šalju se u `dataLayer`.

## 9. Pristupačnost i robusnost

- quote panel i lightbox imaju semantiku dijaloga, zatvaranje tipkom Escape i kontrolu fokusa
- poruke validacije i status slanja koriste `aria-live`
- CTA elementi i ikone imaju pristupačne oznake
- forma ostaje upotrebljiva bez JavaScripta
- History API je zaštićen fallbackom za restriktivne ugrađene preglednike
- nisu dodane izmišljene recenzije, ocjene ili poslovne brojke

## 10. Tehnička organizacija

Glavni funkcionalni sloj nalazi se u:

- `js/site.js`
- `css/cro-enhancements.css`
- `send-mail.php`
- `.user.ini`

HTML stranice sadrže fallback formu i podatke za unaprijed odabranu vrstu projekta. JavaScript tu formu pretvara u napredni upitnik samo kada je dostupan.

## 11. Provjera

Automatizirano su provjereni:

- desktop početna stranica na 1440 × 1000 px
- mobilna početna stranica na 390 × 844 px
- kategorijska stranica na 1280 × 900 px
- izostanak horizontalnog overflowa
- izravno otvaranje upitnika iz hero CTA-a i mobilne trake
- validacija i prijelazi kroz sva tri koraka
- upload i uklanjanje privitka
- AJAX success-state i `generate_lead` događaj
- zatvaranje upitnika i menija tipkom Escape
- aktiviranje i skrivanje mobilne akcijske trake
- FAQ accordion
- lightbox, brojanje fotografija, tipke, Escape i vraćanje fokusa
- fallback forma bez JavaScripta na desktopu i mobitelu
- PHP i JavaScript sintaksa
- CSS parsiranje, lokalni resursi, hash poveznice i duplicirani HTML ID-jevi
- JSON i klasični redirect odgovori serverske obrade

Namjerno nije poslan stvarni produkcijski e-mail tijekom automatiziranog testa. Nakon postavljanja na hosting potrebno je poslati jedan stvarni testni upit s malim privitkom i potvrditi primitak poruke.

## 12. Postavljanje na hosting

1. Napraviti sigurnosnu kopiju trenutačne produkcijske verzije.
2. U korijensku mapu weba prenijeti sadržaj produkcijskog ZIP-a, uključujući skrivenu datoteku `.user.ini`.
3. Provjeriti da hosting koristi PHP 8 ili noviji te podržava `fileinfo`, OpenSSL i izlazne SMTP veze.
4. Ako hosting ne primjenjuje `.user.ini`, ručno postaviti `upload_max_filesize=5M`, `post_max_size=18M` i `max_file_uploads=5`.
5. Očistiti CDN/server cache i provjeriti učitavaju li se `css/cro-enhancements.css?v=5` i `js/site.js?v=5`.
6. Poslati testni upit na desktopu i mobitelu, uključujući jedan JPG ili PDF privitak.
7. U Google Tag Manageru povezati željene događaje, prvenstveno `generate_lead`, `form_start`, `form_step_complete`, `cta_click` i `contact_click`.

