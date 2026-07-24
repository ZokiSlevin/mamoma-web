(function () {
    'use strict';

    document.documentElement.classList.add('js');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const body = document.body;
    const pagePath = window.location.pathname.split('/').pop() || 'index.html';

    const projectByPage = {
        'kuhinje-po-mjeri.html': 'kuhinja',
        'dnevni-boravci.html': 'dnevni-boravak',
        'ugradbeni-ormari.html': 'ormari',
        'kupaonice.html': 'kupaonice',
        'poslovni-prostori.html': 'poslovni-prostor'
    };

    const projectOptions = [
        {
            value: 'kuhinja',
            label: 'Kuhinja po mjeri',
            helper: 'Planiranje, izrada i montaža',
            icon: '<path d="M4 5h16v14H4zM4 11h16M9 5v6M15 11v8"></path>'
        },
        {
            value: 'ormari',
            label: 'Ugradbeni ormari',
            helper: 'Pohrana prilagođena prostoru',
            icon: '<path d="M5 3h14v18H5zM12 3v18M9 12h.01M15 12h.01"></path>'
        },
        {
            value: 'dnevni-boravak',
            label: 'Dnevni boravak',
            helper: 'TV stijene, komode i police',
            icon: '<path d="M4 8h16v9H4zM8 17v3M16 17v3M7 12h10"></path>'
        },
        {
            value: 'kupaonice',
            label: 'Kupaonski namještaj',
            helper: 'Ormarići, plohe i pohrana',
            icon: '<path d="M5 5h14v14H5zM8 9h8M8 13h5M15.5 15.5h.01"></path>'
        },
        {
            value: 'poslovni-prostor',
            label: 'Poslovni prostor',
            helper: 'Uredi, recepcije i saloni',
            icon: '<path d="M4 20V7h16v13M8 7V4h8v3M8 11h2M14 11h2M8 15h2M14 15h2"></path>'
        },
        {
            value: 'opremanje',
            label: 'Kompletno opremanje',
            helper: 'Usklađeno rješenje cijelog prostora',
            icon: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5-8-4.5"></path>'
        },
        {
            value: '3d-dizajn',
            label: '3D dizajn interijera',
            helper: 'Jasan prikaz prije izvedbe',
            icon: '<path d="M4 17 12 3l8 14-8 4-8-4Zm8-14v18M4 17l8-4 8 4"></path>'
        },
        {
            value: 'ostalo',
            label: 'Drugi projekt',
            helper: 'Opišite što želite izraditi',
            icon: '<circle cx="12" cy="12" r="9"></circle><path d="M8 12h8M12 8v8"></path>'
        }
    ];

    const defaultProject = body.dataset.projectType || projectByPage[pagePath] || '';

    function track(eventName, parameters) {
        const detail = Object.assign({
            event: eventName,
            page_path: window.location.pathname,
            page_title: document.title
        }, parameters || {});

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(detail);
        document.dispatchEvent(new CustomEvent('mamoma:analytics', { detail: detail }));
    }

    function getFocusable(container) {
        if (!container) return [];

        return Array.from(container.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(function (element) {
            return !element.hidden && element.offsetParent !== null;
        });
    }

    function trapFocus(event, container) {
        if (event.key !== 'Tab') return;

        const focusable = getFocusable(container);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function debounceFrame(callback) {
        let scheduled = false;

        return function () {
            if (scheduled) return;
            scheduled = true;

            window.requestAnimationFrame(function () {
                callback();
                scheduled = false;
            });
        };
    }

    function showToast(message, duration) {
        const existing = document.querySelector('.site-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'site-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = message;
        document.body.appendChild(toast);

        window.requestAnimationFrame(function () {
            toast.classList.add('is-visible');
        });

        window.setTimeout(function () {
            toast.classList.remove('is-visible');
            window.setTimeout(function () {
                toast.remove();
            }, 280);
        }, duration || 5200);
    }

    function initNoScriptReturnStatus() {
        const url = new URL(window.location.href);
        const status = url.searchParams.get('upit');

        if (status === 'uspjeh') {
            showToast('Hvala! Vaš upit je uspješno poslan. Javit ćemo vam se s informacijama o sljedećem koraku.', 7000);
        } else if (status === 'greska') {
            showToast('Upit trenutno nije poslan. Pokušajte ponovno ili nas kontaktirajte telefonom.', 7000);
        } else {
            return;
        }

        url.searchParams.delete('upit');
        try {
            window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        } catch (error) {
            // Neki ugrađeni preglednici ograničavaju History API. Status je već prikazan korisniku.
        }
    }

    function initHeaderAndNavigation() {
        const header = document.querySelector('.site-header');
        const menuToggle = document.querySelector('.menu-toggle');
        const mainNav = document.querySelector('.main-nav');

        if (!header || !menuToggle || !mainNav) return;

        if (!mainNav.id) mainNav.id = 'main-navigation';
        menuToggle.setAttribute('aria-controls', mainNav.id);

        let menuWasOpenedBy = null;

        function updateHeader() {
            if (window.scrollY > 60 || mainNav.classList.contains('is-open')) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }

        function openMenu() {
            menuWasOpenedBy = document.activeElement;
            mainNav.classList.add('is-open');
            menuToggle.classList.add('is-active');
            menuToggle.setAttribute('aria-expanded', 'true');
            menuToggle.setAttribute('aria-label', 'Zatvori navigacijski meni');
            body.classList.add('menu-open');
            header.classList.add('scrolled');

            const focusable = getFocusable(mainNav);
            if (focusable.length) focusable[0].focus();
        }

        function closeMenu(restoreFocus) {
            if (!mainNav.classList.contains('is-open')) return;

            mainNav.classList.remove('is-open');
            menuToggle.classList.remove('is-active');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', 'Otvori navigacijski meni');
            body.classList.remove('menu-open');
            updateHeader();

            if (restoreFocus && menuWasOpenedBy && typeof menuWasOpenedBy.focus === 'function') {
                menuWasOpenedBy.focus();
            }
        }

        menuToggle.addEventListener('click', function () {
            if (mainNav.classList.contains('is-open')) {
                closeMenu(true);
            } else {
                openMenu();
            }
        });

        mainNav.addEventListener('click', function (event) {
            if (event.target.closest('a')) closeMenu(false);
        });

        document.addEventListener('pointerdown', function (event) {
            if (!mainNav.classList.contains('is-open')) return;
            if (mainNav.contains(event.target) || menuToggle.contains(event.target)) return;
            closeMenu(false);
        });

        document.addEventListener('keydown', function (event) {
            if (!mainNav.classList.contains('is-open')) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu(true);
                return;
            }

            trapFocus(event, mainNav);
        });

        const onScroll = debounceFrame(updateHeader);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 1100) closeMenu(false);
            updateHeader();
        });

        updateHeader();
    }

    function initActiveNavigation() {
        if (!('IntersectionObserver' in window)) return;

        const links = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'))
            .filter(function (link) {
                return !link.matches('[data-quote-open], .header-cta, .mobile-menu-cta');
            });

        const entries = links.map(function (link) {
            const selector = link.getAttribute('href');
            const section = selector && selector.length > 1 ? document.querySelector(selector) : null;
            return section ? { link: link, section: section } : null;
        }).filter(Boolean);

        if (!entries.length) return;

        function setActive(activeLink) {
            entries.forEach(function (entry) {
                const active = entry.link === activeLink;
                entry.link.classList.toggle('is-active', active);

                if (active) {
                    entry.link.setAttribute('aria-current', 'location');
                } else {
                    entry.link.removeAttribute('aria-current');
                }
            });
        }

        const observer = new IntersectionObserver(function (observedEntries) {
            const visible = observedEntries
                .filter(function (entry) { return entry.isIntersecting; })
                .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });

            if (!visible.length) return;

            const match = entries.find(function (entry) {
                return entry.section === visible[0].target;
            });

            if (match) setActive(match.link);
        }, {
            rootMargin: '-30% 0px -58% 0px',
            threshold: [0.01, 0.15, 0.35]
        });

        entries.forEach(function (entry) {
            observer.observe(entry.section);
        });
    }

    function initSmoothAnchors() {
        document.addEventListener('click', function (event) {
            const link = event.target.closest('a[href^="#"]');
            if (!link || link.matches('[data-quote-open]')) return;

            const hash = link.getAttribute('href');
            if (!hash || hash === '#') return;

            const target = document.querySelector(hash);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'start'
            });

            if (window.history && window.history.replaceState) {
                try {
                    window.history.replaceState(null, '', hash);
                } catch (error) {
                    // Skrolanje i dalje radi u preglednicima koji ograničavaju History API.
                }
            }
        });
    }

    function createEntryCard(projectType) {
        const card = document.createElement('div');
        card.className = 'quote-entry-card';
        card.innerHTML = [
            '<p class="quote-entry-card__eyebrow">Brzi upit</p>',
            '<h3>Do konkretnog sljedećeg koraka u 3 kratke cjeline.</h3>',
            '<p>Odaberite vrstu projekta, dodajte osnovne informacije i ostavite kontakt. Fotografije i nacrte možete priložiti odmah.</p>',
            '<ol class="quote-entry-card__steps">',
            '<li><span>1</span> Vrsta projekta</li>',
            '<li><span>2</span> Prostor, rok i prilozi</li>',
            '<li><span>3</span> Kontakt za povratnu informaciju</li>',
            '</ol>',
            '<button type="button" class="btn-primary" data-quote-open data-source="contact-card"' + (projectType ? ' data-project-type="' + projectType + '"' : '') + '>Pokrenite upit</button>',
            '<p class="quote-entry-card__meta">Slanje upita je neobvezujuće. Obavezna polja jasno su označena.</p>'
        ].join('');
        return card;
    }

    function transformLegacyContactForms() {
        let formAction = 'send-mail.php';
        let discoveredDefault = defaultProject;

        document.querySelectorAll('.contact-form').forEach(function (form) {
            if (form.getAttribute('action')) formAction = form.getAttribute('action');

            const selected = form.querySelector('[name="project-type"] option:checked');
            const formDefault = form.dataset.projectDefault || (selected && selected.value) || discoveredDefault;
            if (formDefault) discoveredDefault = formDefault;

            form.replaceWith(createEntryCard(formDefault));
        });

        return {
            action: formAction,
            project: discoveredDefault
        };
    }

    function projectChoiceMarkup() {
        return projectOptions.map(function (project) {
            return [
                '<label class="project-choice">',
                '<input type="radio" name="project-type" value="' + project.value + '" required>',
                '<span class="project-choice__icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + project.icon + '</svg></span>',
                '<span class="project-choice__copy"><strong>' + project.label + '</strong><small>' + project.helper + '</small></span>',
                '</label>'
            ].join('');
        }).join('');
    }

    function createQuotePanel(action, initialProject) {
        const panel = document.createElement('div');
        panel.className = 'quote-panel';
        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = [
            '<button type="button" class="quote-panel__backdrop" aria-label="Zatvori upitnik"></button>',
            '<section class="quote-panel__drawer" role="dialog" aria-modal="true" aria-labelledby="quote-panel-title">',
            '<header class="quote-panel__header">',
            '<div class="quote-panel__brand"><img src="images/mamoma-symbol.png" alt=""><span>MAMOMA INTERIJERI<small>Upit za projekt</small></span></div>',
            '<button type="button" class="quote-panel__close" aria-label="Zatvori upitnik"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"></path></svg></button>',
            '</header>',
            '<div class="quote-panel__scroll">',
            '<div class="quote-wizard-view">',
            '<div class="quote-intro">',
            '<p class="quote-intro__eyebrow">Neobvezujući upit</p>',
            '<h2 id="quote-panel-title">Recite nam što planirate.</h2>',
            '<p>Upit je podijeljen u tri kratka koraka. Za kvalitetniji prvi odgovor možete odmah dodati fotografije ili nacrt.</p>',
            '</div>',
            '<div class="quote-progress" aria-label="Napredak upitnika">',
            '<div class="quote-progress__meta"><span class="quote-progress__step">Korak 1 od 3</span><span class="quote-progress__percent">33%</span></div>',
            '<div class="quote-progress__track"><div class="quote-progress__bar"></div></div>',
            '<div class="quote-progress__labels"><span class="is-current">Projekt</span><span>Detalji</span><span>Kontakt</span></div>',
            '</div>',
            '<form class="quote-form" action="' + action + '" method="post" enctype="multipart/form-data" novalidate>',
            '<input type="hidden" name="source-page" value="' + window.location.pathname + '">',
            '<input type="hidden" name="source-cta" value="direct">',
            '<input type="hidden" name="form-started-at" value="' + Date.now() + '">',
            '<input type="hidden" name="landing-page" value="">',
            '<input type="hidden" name="referrer" value="">',
            '<input type="hidden" name="utm-source" value="">',
            '<input type="hidden" name="utm-medium" value="">',
            '<input type="hidden" name="utm-campaign" value="">',
            '<div style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden" aria-hidden="true"><label>Web stranica<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>',
            '<section class="quote-step is-active" data-step="1">',
            '<div class="quote-step__heading"><h3>Što uređujete?</h3><p>Odaberite opciju koja je najbliža vašem projektu.</p></div>',
            '<div class="project-choice-grid" role="radiogroup" aria-label="Vrsta projekta">' + projectChoiceMarkup() + '</div>',
            '<p class="quote-field__error" data-error-for="project-type" aria-live="polite"></p>',
            '<div class="quote-step-actions"><button type="button" class="quote-step-button quote-step-button--next" data-next>Dalje <span aria-hidden="true">→</span></button></div>',
            '</section>',
            '<section class="quote-step" data-step="2" hidden>',
            '<div class="quote-step__heading"><h3>Osnovni detalji prostora</h3><p>Dovoljno je ono što trenutačno znate. Polja označena kao neobavezna možete preskočiti.</p></div>',
            '<div class="quote-form-grid">',
            '<div class="quote-field"><label for="quote-location">Grad ili mjesto *</label><input id="quote-location" name="location" type="text" autocomplete="address-level2" placeholder="npr. Zagreb, Sesvete" required><p class="quote-field__error" data-error-for="location" aria-live="polite"></p></div>',
            '<div class="quote-field"><label for="quote-dimensions">Okvirne dimenzije <small>(neobavezno)</small></label><input id="quote-dimensions" name="dimensions" type="text" placeholder="npr. zid 320 × 260 cm"></div>',
            '<div class="quote-field"><label for="quote-budget">Okvirni budžet <small>(neobavezno)</small></label><select id="quote-budget" name="budget"><option value="">Još nisam odredio/la</option><option value="do-3000">do 3.000 €</option><option value="3000-6000">3.000 – 6.000 €</option><option value="6000-10000">6.000 – 10.000 €</option><option value="10000-20000">10.000 – 20.000 €</option><option value="20000-plus">više od 20.000 €</option></select></div>',
            '<div class="quote-field"><label for="quote-timeline">Željeni rok <small>(neobavezno)</small></label><select id="quote-timeline" name="timeframe"><option value="">Fleksibilan / dogovor</option><option value="1-3-mjeseca">u 1 – 3 mjeseca</option><option value="3-6-mjeseci">u 3 – 6 mjeseci</option><option value="6-plus-mjeseci">za više od 6 mjeseci</option><option value="istrazujem">Tek istražujem mogućnosti</option></select></div>',
            '<div class="quote-field quote-field--wide"><label for="quote-message">Opišite projekt i najvažnije želje *</label><textarea id="quote-message" name="message" placeholder="Što želite izraditi, što vam je važno i postoji li poseban izazov u prostoru?" required></textarea><p class="quote-field__error" data-error-for="message" aria-live="polite"></p></div>',
            '<div class="quote-field quote-field--wide"><label for="quote-files">Fotografije ili nacrt <small>(neobavezno)</small></label><label class="file-drop" for="quote-files"><input id="quote-files" name="attachments[]" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" multiple><span class="file-drop__content"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v5h14v-5"></path></svg><strong>Dodajte datoteke</strong><small>Do 5 datoteka; JPG, PNG, WEBP ili PDF. Najviše 5 MB po datoteci i 15 MB ukupno.</small></span></label><div class="file-list" aria-live="polite"></div><p class="quote-field__error" data-error-for="project-files" aria-live="polite"></p></div>',
            '</div>',
            '<div class="quote-step-actions"><button type="button" class="quote-step-button quote-step-button--back" data-back><span aria-hidden="true">←</span> Natrag</button><button type="button" class="quote-step-button quote-step-button--next" data-next>Dalje <span aria-hidden="true">→</span></button></div>',
            '</section>',
            '<section class="quote-step" data-step="3" hidden>',
            '<div class="quote-step__heading"><h3>Kako vam se možemo javiti?</h3><p>Poslat ćemo povratnu informaciju ili prijedlog sljedećeg koraka.</p></div>',
            '<div class="quote-form-grid">',
            '<div class="quote-field"><label for="quote-name">Ime i prezime *</label><input id="quote-name" name="name" type="text" autocomplete="name" placeholder="Vaše ime" required><p class="quote-field__error" data-error-for="name" aria-live="polite"></p></div>',
            '<div class="quote-field"><label for="quote-email">E-mail adresa *</label><input id="quote-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="vasa@email.hr" required><p class="quote-field__error" data-error-for="email" aria-live="polite"></p></div>',
            '<div class="quote-field quote-field--wide"><label for="quote-phone">Telefon <small>(neobavezno)</small></label><input id="quote-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="npr. +385 98 123 4567"></div>',
            '<label class="quote-consent quote-field--wide"><input type="checkbox" name="privacy-consent" value="1" required><span>Slažem se da Mamoma interijeri obradi podatke iz ovog upita radi odgovora na moj zahtjev. Više informacija nalazi se u <a href="privatnost.html" target="_blank" rel="noopener">Pravilima privatnosti</a>.</span></label>',
            '<p class="quote-field__error quote-field--wide" data-error-for="privacy-consent" aria-live="polite"></p>',
            '</div>',
            '<p class="quote-fee-note">Kod većih projekata detaljna razrada ponude može se naplatiti od 50,00 €. Ako se odlučite za izradu namještaja kod Mamoma interijera, taj se iznos uračunava u konačnu cijenu.</p>',
            '<div class="quote-step-actions"><button type="button" class="quote-step-button quote-step-button--back" data-back><span aria-hidden="true">←</span> Natrag</button><button type="submit" class="quote-step-button quote-step-button--submit">Pošalji upit <span aria-hidden="true">↗</span></button></div>',
            '<p class="quote-form-status" role="status" aria-live="polite"></p>',
            '</section>',
            '</form>',
            '</div>',
            '<div class="quote-success" hidden>',
            '<span class="quote-success__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span>',
            '<p class="quote-intro__eyebrow">Upit je zaprimljen</p>',
            '<h2>Hvala — imamo dobar početak.</h2>',
            '<p>Vaše informacije su poslane. Pregledat ćemo ih i javiti se s konkretnim prijedlogom sljedećeg koraka.</p>',
            '<div class="quote-success__next"><strong>Što slijedi</strong><ol><li>Pregled projekta i priloga</li><li>Povratna informacija ili dodatna pitanja</li><li>Dogovor izmjere i daljnje razrade prema potrebi</li></ol></div>',
            '<div class="quote-success__actions"><button type="button" class="btn-primary" data-close-success>Zatvori</button><a class="btn-outline" href="tel:+385989438084" data-track-contact="phone-success">Nazovite nas</a></div>',
            '</div>',
            '</div>',
            '</section>'
        ].join('');

        document.body.appendChild(panel);

        const drawer = panel.querySelector('.quote-panel__drawer');
        const backdrop = panel.querySelector('.quote-panel__backdrop');
        const closeButton = panel.querySelector('.quote-panel__close');
        const scrollArea = panel.querySelector('.quote-panel__scroll');
        const wizardView = panel.querySelector('.quote-wizard-view');
        const successView = panel.querySelector('.quote-success');
        const form = panel.querySelector('.quote-form');
        const steps = Array.from(panel.querySelectorAll('.quote-step'));
        const progressBar = panel.querySelector('.quote-progress__bar');
        const progressStep = panel.querySelector('.quote-progress__step');
        const progressPercent = panel.querySelector('.quote-progress__percent');
        const progressLabels = Array.from(panel.querySelectorAll('.quote-progress__labels span'));
        const sourceCtaField = form.querySelector('[name="source-cta"]');
        const startedAtField = form.querySelector('[name="form-started-at"]');
        const statusMessage = form.querySelector('.quote-form-status');
        const fileInput = form.querySelector('#quote-files');
        const fileDrop = form.querySelector('.file-drop');
        const fileList = form.querySelector('.file-list');
        const fileError = form.querySelector('[data-error-for="project-files"]');
        const submitButton = form.querySelector('[type="submit"]');
        const draftKey = 'mamoma-quote-draft-v3';
        const currentUrl = new URL(window.location.href);
        const hiddenContext = {
            'landing-page': currentUrl.href,
            'referrer': document.referrer || '',
            'utm-source': currentUrl.searchParams.get('utm_source') || '',
            'utm-medium': currentUrl.searchParams.get('utm_medium') || '',
            'utm-campaign': currentUrl.searchParams.get('utm_campaign') || ''
        };

        Object.keys(hiddenContext).forEach(function (name) {
            const input = form.querySelector('[name="' + name + '"]');
            if (input) input.value = hiddenContext[name];
        });

        let currentStep = 1;
        let previousFocus = null;
        let closeTimer = null;
        let selectedFiles = [];
        let submittedSuccessfully = false;
        let openedOnce = false;

        const maxFiles = 5;
        const maxFileSize = 5 * 1024 * 1024;
        const maxTotalSize = 15 * 1024 * 1024;
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

        function selectProject(projectType) {
            if (!projectType) return;
            const radio = form.querySelector('input[name="project-type"][value="' + CSS.escape(projectType) + '"]');
            if (radio) radio.checked = true;
        }

        function updateProgress() {
            const percentage = Math.round((currentStep / 3) * 100);
            progressBar.style.width = percentage + '%';
            progressStep.textContent = 'Korak ' + currentStep + ' od 3';
            progressPercent.textContent = percentage + '%';

            progressLabels.forEach(function (label, index) {
                label.classList.toggle('is-current', index === currentStep - 1);
            });
        }

        function showStep(stepNumber, options) {
            currentStep = Math.min(3, Math.max(1, stepNumber));

            steps.forEach(function (step) {
                const active = Number(step.dataset.step) === currentStep;
                step.hidden = !active;
                step.classList.toggle('is-active', active);
            });

            updateProgress();
            scrollArea.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });

            if (!options || options.focus !== false) {
                window.setTimeout(function () {
                    const activeStep = steps[currentStep - 1];
                    const focusable = getFocusable(activeStep);
                    if (focusable.length) focusable[0].focus();
                }, reducedMotion ? 0 : 220);
            }
        }

        function clearFieldError(field) {
            if (!field) return;
            field.removeAttribute('aria-invalid');

            const key = field.name === 'attachments[]' ? 'project-files' : field.name;
            const message = form.querySelector('[data-error-for="' + CSS.escape(key) + '"]');
            if (message) message.textContent = '';
        }

        function setFieldError(field, message) {
            if (field) field.setAttribute('aria-invalid', 'true');

            const name = field ? (field.name === 'attachments[]' ? 'project-files' : field.name) : '';
            const target = form.querySelector('[data-error-for="' + CSS.escape(name) + '"]');
            if (target) target.textContent = message;
        }

        function errorMessageFor(field) {
            if (field.name === 'project-type') return 'Odaberite vrstu projekta.';
            if (field.name === 'location') return 'Upišite grad ili mjesto projekta.';
            if (field.name === 'message') return 'Ukratko opišite projekt i najvažnije želje.';
            if (field.name === 'name') return 'Upišite ime i prezime.';
            if (field.name === 'email') {
                return field.validity.typeMismatch ? 'Upišite ispravnu e-mail adresu.' : 'Upišite e-mail adresu.';
            }
            if (field.name === 'privacy-consent') return 'Za slanje upita potrebna je potvrda obrade podataka.';
            return 'Provjerite ovo polje.';
        }

        function validateStep(stepNumber) {
            const step = steps[stepNumber - 1];
            const requiredFields = Array.from(step.querySelectorAll('[required]'));
            let firstInvalid = null;

            requiredFields.forEach(function (field) {
                clearFieldError(field);

                if (!field.checkValidity()) {
                    if (!firstInvalid) firstInvalid = field;
                    setFieldError(field, errorMessageFor(field));
                }
            });

            if (firstInvalid) {
                firstInvalid.focus();
                return false;
            }

            return true;
        }

        function saveDraft() {
            const draft = {};
            const data = new FormData(form);

            data.forEach(function (value, key) {
                if (value instanceof File || key === 'website' || key === 'form-started-at') return;
                draft[key] = value;
            });

            try {
                window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
            } catch (error) {
                // Spremanje nacrta nije presudno za slanje forme.
            }
        }

        function restoreDraft() {
            let draft = null;

            try {
                draft = JSON.parse(window.sessionStorage.getItem(draftKey) || 'null');
            } catch (error) {
                draft = null;
            }

            if (!draft) return;

            Object.keys(draft).forEach(function (name) {
                const field = form.elements[name];
                if (!field) return;

                if (field instanceof RadioNodeList) {
                    Array.from(field).forEach(function (radio) {
                        radio.checked = radio.value === draft[name];
                    });
                } else if (field.type === 'checkbox') {
                    field.checked = draft[name] === field.value;
                } else {
                    field.value = draft[name];
                }
            });
        }

        function formatFileSize(bytes) {
            if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        function extensionOf(fileName) {
            const parts = fileName.toLowerCase().split('.');
            return parts.length > 1 ? parts.pop() : '';
        }

        function validateFiles(files) {
            if (files.length > maxFiles) {
                return 'Možete dodati najviše ' + maxFiles + ' datoteka.';
            }

            const totalSize = files.reduce(function (sum, file) { return sum + file.size; }, 0);
            if (totalSize > maxTotalSize) {
                return 'Ukupna veličina priloga ne smije biti veća od 15 MB.';
            }

            const invalidType = files.find(function (file) {
                return allowedExtensions.indexOf(extensionOf(file.name)) === -1;
            });
            if (invalidType) {
                return 'Datoteka „' + invalidType.name + '” nije podržana.';
            }

            const oversized = files.find(function (file) { return file.size > maxFileSize; });
            if (oversized) {
                return 'Datoteka „' + oversized.name + '” veća je od 5 MB.';
            }

            return '';
        }

        function syncFileInput() {
            if (typeof DataTransfer === 'undefined') return;

            const transfer = new DataTransfer();
            selectedFiles.forEach(function (file) { transfer.items.add(file); });
            fileInput.files = transfer.files;
        }

        function renderFiles() {
            fileList.innerHTML = '';
            fileError.textContent = '';

            selectedFiles.forEach(function (file, index) {
                const chip = document.createElement('div');
                chip.className = 'file-chip';
                chip.innerHTML = '<span title="' + file.name.replace(/"/g, '&quot;') + '">' + file.name + ' · ' + formatFileSize(file.size) + '</span><button type="button" aria-label="Ukloni datoteku ' + file.name.replace(/"/g, '&quot;') + '">Ukloni</button>';
                chip.querySelector('button').addEventListener('click', function () {
                    selectedFiles.splice(index, 1);
                    syncFileInput();
                    renderFiles();
                });
                fileList.appendChild(chip);
            });
        }

        function addFiles(fileCollection) {
            const incoming = Array.from(fileCollection || []);
            const merged = selectedFiles.concat(incoming).filter(function (file, index, all) {
                return all.findIndex(function (candidate) {
                    return candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified;
                }) === index;
            });

            const validationError = validateFiles(merged);
            if (validationError) {
                fileError.textContent = validationError;
                fileInput.value = '';
                return;
            }

            selectedFiles = merged;
            syncFileInput();
            renderFiles();
        }

        function resetWizard() {
            form.reset();
            selectedFiles = [];
            renderFiles();
            submittedSuccessfully = false;
            statusMessage.textContent = '';
            wizardView.hidden = false;
            successView.hidden = true;
            startedAtField.value = String(Date.now());
            selectProject(initialProject || defaultProject);
            showStep(1, { focus: false });

            try {
                window.sessionStorage.removeItem(draftKey);
            } catch (error) {
                // Nije potrebno prijaviti pogrešku korisniku.
            }
        }

        function open(options) {
            const settings = options || {};
            previousFocus = document.activeElement;
            sourceCtaField.value = settings.source || 'direct';

            if (submittedSuccessfully) resetWizard();

            if (settings.projectType) {
                selectProject(settings.projectType);
                saveDraft();
            }

            panel.hidden = false;
            panel.setAttribute('aria-hidden', 'false');
            body.classList.add('quote-open');

            window.requestAnimationFrame(function () {
                panel.classList.add('is-open');
            });

            if (!openedOnce) {
                openedOnce = true;
                track('form_start', {
                    form_name: 'quote_wizard',
                    source: sourceCtaField.value,
                    project_type: form.querySelector('[name="project-type"]:checked')?.value || ''
                });
            }

            window.setTimeout(function () {
                const checked = form.querySelector('[name="project-type"]:checked');
                (checked || closeButton).focus();
            }, reducedMotion ? 0 : 260);

            document.dispatchEvent(new CustomEvent('mamoma:quote-open'));
        }

        function close(restoreFocus) {
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            body.classList.remove('quote-open');

            window.clearTimeout(closeTimer);
            closeTimer = window.setTimeout(function () {
                panel.hidden = true;

                if (submittedSuccessfully) resetWizard();
            }, reducedMotion ? 0 : 480);

            if (restoreFocus !== false && previousFocus && typeof previousFocus.focus === 'function') {
                previousFocus.focus();
            }

            document.dispatchEvent(new CustomEvent('mamoma:quote-close'));
        }

        function showSuccess(message) {
            submittedSuccessfully = true;
            wizardView.hidden = true;
            successView.hidden = false;

            const leadText = successView.querySelector(':scope > p:not(.quote-intro__eyebrow)');
            if (leadText && message) leadText.textContent = message;

            scrollArea.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });

            window.setTimeout(function () {
                const closeSuccess = successView.querySelector('[data-close-success]');
                if (closeSuccess) closeSuccess.focus();
            }, reducedMotion ? 0 : 220);
        }

        panel.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') {
                trapFocus(event, drawer);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || panel.hidden || !panel.classList.contains('is-open')) return;

            event.preventDefault();
            close(true);
        });

        backdrop.addEventListener('click', function () { close(true); });
        closeButton.addEventListener('click', function () { close(true); });
        successView.querySelector('[data-close-success]').addEventListener('click', function () { close(true); });

        form.addEventListener('input', function (event) {
            clearFieldError(event.target);
            saveDraft();
        });

        form.addEventListener('change', function (event) {
            clearFieldError(event.target);
            saveDraft();
        });

        panel.querySelectorAll('[data-next]').forEach(function (button) {
            button.addEventListener('click', function () {
                if (!validateStep(currentStep)) return;

                track('form_step_complete', {
                    form_name: 'quote_wizard',
                    step_number: currentStep,
                    project_type: form.querySelector('[name="project-type"]:checked')?.value || ''
                });

                showStep(currentStep + 1);
            });
        });

        panel.querySelectorAll('[data-back]').forEach(function (button) {
            button.addEventListener('click', function () {
                showStep(currentStep - 1);
            });
        });

        fileInput.addEventListener('change', function () {
            addFiles(fileInput.files);
        });

        ['dragenter', 'dragover'].forEach(function (eventName) {
            fileDrop.addEventListener(eventName, function (event) {
                event.preventDefault();
                fileDrop.classList.add('is-dragging');
            });
        });

        ['dragleave', 'drop'].forEach(function (eventName) {
            fileDrop.addEventListener(eventName, function (event) {
                event.preventDefault();
                fileDrop.classList.remove('is-dragging');
            });
        });

        fileDrop.addEventListener('drop', function (event) {
            addFiles(event.dataTransfer.files);
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            if (!validateStep(1)) {
                showStep(1);
                return;
            }
            if (!validateStep(2)) {
                showStep(2);
                return;
            }
            if (!validateStep(3)) {
                showStep(3);
                return;
            }

            statusMessage.textContent = '';
            submitButton.disabled = true;
            const originalText = submitButton.innerHTML;
            submitButton.textContent = 'Slanje...';

            const formData = new FormData(form);
            selectedFiles.forEach(function (file) {
                if (!Array.from(fileInput.files).includes(file)) {
                    formData.append('attachments[]', file, file.name);
                }
            });

            track('form_submit', {
                form_name: 'quote_wizard',
                project_type: formData.get('project-type') || '',
                has_files: selectedFiles.length > 0,
                file_count: selectedFiles.length,
                source: sourceCtaField.value
            });

            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(function (response) {
                    const contentType = response.headers.get('content-type') || '';
                    if (!contentType.includes('application/json')) {
                        throw new Error('Poslužitelj nije vratio JSON odgovor.');
                    }
                    return response.json().then(function (data) {
                        if (!response.ok && typeof data.success === 'undefined') {
                            throw new Error(data.message || 'Slanje nije uspjelo.');
                        }
                        return data;
                    });
                })
                .then(function (data) {
                    if (!data.success) {
                        throw new Error(data.message || 'Upit trenutno nije poslan.');
                    }

                    try {
                        window.sessionStorage.removeItem(draftKey);
                    } catch (error) {
                        // Nije potrebno prijaviti pogrešku korisniku.
                    }

                    showSuccess(data.message || 'Vaše informacije su poslane. Pregledat ćemo ih i javiti se s konkretnim prijedlogom sljedećeg koraka.');

                    track('generate_lead', {
                        form_name: 'quote_wizard',
                        project_type: formData.get('project-type') || '',
                        source: sourceCtaField.value
                    });
                })
                .catch(function (error) {
                    statusMessage.textContent = error.message || 'Nažalost, upit trenutno nije poslan. Pokušajte ponovno ili nas kontaktirajte telefonom.';
                    track('form_error', {
                        form_name: 'quote_wizard',
                        error_message: statusMessage.textContent
                    });
                })
                .finally(function () {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalText;
                });
        });

        restoreDraft();
        selectProject(initialProject || defaultProject);
        updateProgress();

        return {
            open: open,
            close: close,
            panel: panel
        };
    }

    function initQuoteExperience() {
        const legacy = transformLegacyContactForms();
        const quotePanel = createQuotePanel(legacy.action, legacy.project);

        document.addEventListener('click', function (event) {
            const trigger = event.target.closest('[data-quote-open]');
            if (!trigger) return;

            event.preventDefault();

            const source = trigger.dataset.source || trigger.textContent.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 60) || 'cta';
            const projectType = trigger.dataset.projectType || defaultProject;

            track('cta_click', {
                cta_source: source,
                cta_text: trigger.textContent.trim(),
                project_type: projectType || ''
            });

            quotePanel.open({ source: source, projectType: projectType });
        });

        return quotePanel;
    }

    function initMobileActionBar() {
        document.querySelectorAll('.mobile-floating-call').forEach(function (element) {
            element.remove();
        });

        const bar = document.createElement('div');
        bar.className = 'mobile-action-bar';
        bar.setAttribute('aria-label', 'Brze kontakt akcije');
        bar.innerHTML = [
            '<button type="button" class="mobile-action-bar__quote" data-quote-open data-source="mobile-sticky"' + (defaultProject ? ' data-project-type="' + defaultProject + '"' : '') + '>',
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H8l-4 4V5Z"></path><path d="M8 9h8M8 13h5"></path></svg>',
            'Pošalji upit',
            '</button>',
            '<a class="mobile-action-bar__whatsapp" href="https://wa.me/385989438084?text=Pozdrav%2C%20zanima%20me%20ponuda%20za%20namje%C5%A1taj%20po%20mjeri." target="_blank" rel="noopener noreferrer" aria-label="Pošaljite WhatsApp upit" data-track-contact="whatsapp-sticky">',
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.5Z"></path><path d="M8.5 8.5c.4 2.7 2.3 4.6 5 5"></path></svg>',
            '</a>'
        ].join('');
        document.body.appendChild(bar);
        body.classList.add('has-mobile-action-bar');

        let contactVisible = false;
        let footerVisible = false;

        function update() {
            const enoughScroll = window.scrollY > 320;
            const blocked = body.classList.contains('menu-open') || body.classList.contains('quote-open') || body.classList.contains('lightbox-open') || contactVisible || footerVisible;
            bar.classList.toggle('is-visible', enoughScroll && !blocked);
            bar.classList.toggle('is-hidden', blocked);
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.target.matches('.contact')) contactVisible = entry.isIntersecting;
                    if (entry.target.matches('.site-footer')) footerVisible = entry.isIntersecting;
                });
                update();
            }, { threshold: 0.04 });

            const contact = document.querySelector('.contact');
            const footer = document.querySelector('.site-footer');
            if (contact) observer.observe(contact);
            if (footer) observer.observe(footer);
        }

        const onScroll = debounceFrame(update);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', update);
        document.addEventListener('mamoma:quote-open', update);
        document.addEventListener('mamoma:quote-close', update);

        const classObserver = new MutationObserver(update);
        classObserver.observe(body, { attributes: true, attributeFilter: ['class'] });

        update();
    }

    function initTracking() {
        document.addEventListener('click', function (event) {
            const contactLink = event.target.closest('a[href^="tel:"], a[href*="wa.me"], [data-track-contact]');
            if (contactLink) {
                const channel = contactLink.href && contactLink.href.indexOf('wa.me') !== -1 ? 'whatsapp' : 'phone';
                track('contact_click', {
                    channel: channel,
                    placement: contactLink.dataset.trackContact || 'page'
                });
            }

            const quickPath = event.target.closest('.quick-path');
            if (quickPath) {
                track('quick_path_click', {
                    label: quickPath.textContent.trim(),
                    destination: quickPath.getAttribute('href') || 'quote-panel'
                });
            }
        });
    }

    function initScrollReveals() {
        const selector = [
            '.section-heading',
            '.about-text',
            '.about-visual',
            '.service-card',
            '.feature-card',
            '.process-step',
            '.space-card',
            '.specialization-card',
            '.gallery-link',
            '.faq-item',
            '.contact-info',
            '.quote-entry-card',
            '.subpage-main-text',
            '.subpage-side-card',
            '.project-gallery-item',
            '.mini-cta-container',
            '.quick-path'
        ].join(',');

        const elements = Array.from(document.querySelectorAll(selector));

        elements.forEach(function (element, index) {
            element.classList.add('reveal-on-scroll');
            element.style.setProperty('--reveal-delay', ((index % 5) * 70) + 'ms');
        });

        const processGrid = document.querySelector('.process-grid');

        if (reducedMotion || !('IntersectionObserver' in window)) {
            elements.forEach(function (element) { element.classList.add('is-revealed'); });
            if (processGrid) processGrid.classList.add('is-in-view');
            return;
        }

        const observer = new IntersectionObserver(function (entries, revealObserver) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-revealed');
                revealObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -7% 0px'
        });

        elements.forEach(function (element) { observer.observe(element); });

        if (processGrid) {
            const processObserver = new IntersectionObserver(function (entries, timelineObserver) {
                if (entries[0].isIntersecting) {
                    processGrid.classList.add('is-in-view');
                    timelineObserver.disconnect();
                }
            }, { threshold: 0.2 });
            processObserver.observe(processGrid);
        }
    }

    function initFaq() {
        const items = Array.from(document.querySelectorAll('.faq-item'));
        if (!items.length) return;

        function setExpanded(item, expanded) {
            const summary = item.querySelector('summary');
            if (summary) summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }

        function closeItem(item, animate) {
            if (!item.open) return;

            const answer = item.querySelector('.faq-answer');
            if (!answer || !animate || reducedMotion || typeof answer.animate !== 'function') {
                item.open = false;
                answer.style.height = '0px';
                setExpanded(item, false);
                return;
            }

            const animation = answer.animate([
                { height: answer.scrollHeight + 'px', opacity: 1 },
                { height: '0px', opacity: 0.35 }
            ], {
                duration: 280,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            });

            animation.onfinish = function () {
                item.open = false;
                answer.style.height = '0px';
                setExpanded(item, false);
            };
        }

        function openItem(item) {
            const answer = item.querySelector('.faq-answer');
            items.forEach(function (other) {
                if (other !== item) closeItem(other, true);
            });

            item.open = true;
            setExpanded(item, true);

            if (!answer) return;

            if (reducedMotion || typeof answer.animate !== 'function') {
                answer.style.height = 'auto';
                return;
            }

            const targetHeight = answer.scrollHeight;
            answer.style.height = targetHeight + 'px';
            const animation = answer.animate([
                { height: '0px', opacity: 0.35 },
                { height: targetHeight + 'px', opacity: 1 }
            ], {
                duration: 340,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });

            animation.onfinish = function () {
                answer.style.height = 'auto';
            };
        }

        items.forEach(function (item) {
            const summary = item.querySelector('summary');
            if (!summary) return;

            const answer = document.createElement('div');
            answer.className = 'faq-answer';
            const inner = document.createElement('div');
            inner.className = 'faq-answer-inner';

            Array.from(item.children).forEach(function (child) {
                if (child !== summary) inner.appendChild(child);
            });

            answer.appendChild(inner);
            item.appendChild(answer);
            answer.style.height = item.open ? 'auto' : '0px';
            setExpanded(item, item.open);

            summary.addEventListener('click', function (event) {
                event.preventDefault();

                if (item.open) {
                    closeItem(item, true);
                } else {
                    openItem(item);
                    track('faq_open', { question: summary.textContent.trim() });
                }
            });
        });
    }

    function initGalleryLightbox() {
        const items = Array.from(document.querySelectorAll('.project-gallery-item'));
        const lightbox = document.querySelector('.gallery-lightbox');
        if (!items.length || !lightbox) return;

        const image = lightbox.querySelector('.gallery-lightbox-image');
        const caption = lightbox.querySelector('.gallery-lightbox-caption');
        const closeButton = lightbox.querySelector('.gallery-lightbox-close');
        const previousButton = lightbox.querySelector('.gallery-lightbox-prev');
        const nextButton = lightbox.querySelector('.gallery-lightbox-next');
        const content = lightbox.querySelector('.gallery-lightbox-content');

        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Galerija projekta');
        lightbox.setAttribute('tabindex', '-1');

        let counter = lightbox.querySelector('.gallery-lightbox-counter, .gallery-lightbox-count');
        if (!counter) {
            counter = document.createElement('p');
            counter.setAttribute('aria-live', 'polite');
            content.appendChild(counter);
        }
        counter.classList.add('gallery-lightbox-counter');

        const gallery = items.map(function (item, index) {
            const itemImage = item.querySelector('img');
            item.dataset.galleryLabel = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
            return {
                src: item.dataset.full || itemImage.dataset.full || itemImage.getAttribute('src'),
                alt: itemImage.alt || 'Fotografija projekta'
            };
        });

        let currentIndex = 0;
        let previousFocus = null;
        let touchStartX = 0;
        let touchStartY = 0;

        function preloadAdjacent() {
            [-1, 1].forEach(function (offset) {
                const index = (currentIndex + offset + gallery.length) % gallery.length;
                const preload = new Image();
                preload.src = gallery[index].src;
            });
        }

        function updateImage(initial) {
            const current = gallery[currentIndex];
            if (!initial) lightbox.classList.add('is-changing');

            const setSource = function () {
                image.src = current.src;
                image.alt = current.alt;
                caption.textContent = current.alt;
                counter.textContent = String(currentIndex + 1).padStart(2, '0') + ' / ' + String(gallery.length).padStart(2, '0');

                const decoded = typeof image.decode === 'function' ? image.decode().catch(function () {}) : Promise.resolve();
                decoded.finally(function () {
                    lightbox.classList.remove('is-changing');
                });
                preloadAdjacent();
            };

            if (initial || reducedMotion) {
                setSource();
            } else {
                window.setTimeout(setSource, 100);
            }
        }

        function open(index) {
            previousFocus = document.activeElement;
            currentIndex = index;
            updateImage(true);
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            body.classList.add('lightbox-open');
            closeButton.focus();
            track('gallery_open', { image_index: index + 1, image_alt: gallery[index].alt });
        }

        function close() {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            body.classList.remove('lightbox-open');
            image.removeAttribute('src');

            if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        }

        function showPrevious() {
            currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
            updateImage(false);
        }

        function showNext() {
            currentIndex = (currentIndex + 1) % gallery.length;
            updateImage(false);
        }

        items.forEach(function (item, index) {
            item.addEventListener('click', function () { open(index); });
        });

        closeButton.addEventListener('click', close);
        previousButton.addEventListener('click', showPrevious);
        nextButton.addEventListener('click', showNext);

        lightbox.addEventListener('click', function (event) {
            if (event.target === lightbox) close();
        });

        lightbox.addEventListener('keydown', function (event) {
            if (!lightbox.classList.contains('is-open')) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                close();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                showPrevious();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                showNext();
            } else {
                trapFocus(event, lightbox);
            }
        });

        lightbox.addEventListener('touchstart', function (event) {
            if (!lightbox.classList.contains('is-open')) return;
            touchStartX = event.changedTouches[0].clientX;
            touchStartY = event.changedTouches[0].clientY;
        }, { passive: true });

        lightbox.addEventListener('touchend', function (event) {
            if (!lightbox.classList.contains('is-open')) return;

            const distanceX = event.changedTouches[0].clientX - touchStartX;
            const distanceY = event.changedTouches[0].clientY - touchStartY;

            if (Math.abs(distanceX) < 50 || Math.abs(distanceY) > Math.abs(distanceX)) return;
            if (distanceX < 0) showNext(); else showPrevious();
        }, { passive: true });
    }

    function initImageHints() {
        document.querySelectorAll('img[loading="lazy"]').forEach(function (image) {
            if (!image.hasAttribute('decoding')) image.setAttribute('decoding', 'async');
        });
    }

    initNoScriptReturnStatus();
    initHeaderAndNavigation();
    initActiveNavigation();
    initSmoothAnchors();
    initQuoteExperience();
    initMobileActionBar();
    initTracking();
    initScrollReveals();
    initFaq();
    initGalleryLightbox();
    initImageHints();
}());
