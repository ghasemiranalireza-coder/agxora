/**
 * AGXORA Legal Framework & Standardvertrag, Version 1.1.
 * Integrates the V1.0 master (September 2026) with the external-platform
 * authorization framework. This is a working text for implementation.
 * It is not a statement that the product is legally compliant.
 * A qualified German lawyer must review it before public production launch.
 */

export const LEGAL_FRAMEWORK_VERSION_LABEL = "1.1";

export type LegalFrameworkSection = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
};

export const LEGAL_FRAMEWORK_SECTIONS: readonly LegalFrameworkSection[] = [
  {
    id: "notice",
    title: "Hinweis zur Rechtsprüfung",
    paragraphs: [
      "AGXORA UG (haftungsbeschränkt), Deutschland. Dieses Dokument ist die Arbeitsfassung 1.1 des Legal Framework & Standardvertrags. Es führt die Fassung 1.0 vom September 2026 fort und integriert den Abschnitt über externe Plattformen.",
      "Die Fassung ist keine verbindliche Rechtsberatung und keine Aussage, dass AGXORA damit automatisch rechtlich compliant ist. Vor dem öffentlichen Produktionsstart muss der Text durch eine in Deutschland zugelassene Rechtsberatung mit Schwerpunkt IT-/SaaS-Recht, Datenschutzrecht, KI-Recht, Verbraucherrecht und Plattformrecht geprüft und an die tatsächlich eingesetzten Funktionen, Anbieter, Länder und Geschäftsmodelle angepasst werden.",
    ],
  },
  {
    id: "architecture",
    title: "1. Ziel und rechtliche Architektur",
    paragraphs: [
      "AGXORA ist eine AI Business Operating System- / AI-SaaS-Plattform. Sie bietet digitale Business-Tools, Software, Automatisierung und KI-gestützte Funktionen. Das rechtliche Framework besteht aus mehreren miteinander verknüpften Dokumenten und nicht ausschließlich aus einer einzigen AGB.",
      "Zur Dokumentstruktur gehören: Terms of Service / AGB, Datenschutzerklärung, AI Product Terms, Acceptable Use Policy, User Content & Intellectual Property, Social-Media- und Marketing-Einwilligung, Cookie-/Tracking-Informationen, Subscription & Payment Terms, Widerrufs- und Kündigungsinformationen, Impressum, soweit erforderlich ein Auftragsverarbeitungsvertrag sowie Informationen zu Subprozessoren und Drittanbietern. Hinzu kommt das External Platform & Social Media Authorization Framework in Abschnitt 19.",
    ],
  },
  {
    id: "agb",
    title: "2. Terms of Service / AGB",
    paragraphs: [
      "2.1 Geltungsbereich. Die Bedingungen gelten für Website, Plattform, Software, Apps, KI-Funktionen, SaaS-Dienste und weitere AGXORA-Leistungen. Besondere Produkt- oder Tarifbedingungen können ergänzend gelten.",
      "2.2 Konto. Nutzer müssen zutreffende Angaben machen, Zugangsdaten schützen und dürfen Konten nicht missbräuchlich oder unbefugt verwenden. AGXORA kann Konten bei berechtigten Gründen sperren oder kündigen.",
      "2.3 Leistungsumfang. Funktionen können weiterentwickelt, geändert, erweitert oder eingestellt werden, soweit dies rechtlich zulässig und für Betrieb, Sicherheit oder Weiterentwicklung angemessen ist. Gesetzliche Rechte bleiben unberührt.",
      "2.4 Preise und Abonnements. Preis, Leistungsumfang, Laufzeit, Abrechnung und Kündigung müssen vor Vertragsschluss transparent dargestellt werden. Verbraucherrechte und gesetzliche Informationspflichten sind separat umzusetzen.",
      "2.5 Verfügbarkeit. Wartung, Updates, technische Störungen, Sicherheitsmaßnahmen und Ereignisse außerhalb des Einflussbereichs können zu Unterbrechungen führen. Das gilt auch für Schnittstellen unabhängiger Drittplattformen, ohne dass AGXORA damit eigene gesetzliche Pflichten abbedingt.",
      "2.6 Getrennte Zustimmungen. Die Annahme der AGB ist keine Berechtigung zum Zugriff auf externe Konten, keine Einwilligung in KI-Training, keine Freigabe automatischer Veröffentlichung und keine Marketingeinwilligung.",
    ],
  },
  {
    id: "content",
    title: "3. User Content, Eigentum und Nutzungsrechte",
    paragraphs: [
      "3.1 Kunden behalten ihre Rechte an eigenen Inhalten, soweit ihnen diese Rechte zustehen und vorbehaltlich der in diesem Framework beschriebenen, begrenzten Nutzungsrechte.",
      "3.2 AGXORA erhält nur die Rechte, die erforderlich sind, um Inhalte zu hosten, zu speichern, zu verarbeiten, zu synchronisieren, anzuzeigen, zu übermitteln, im Rahmen der ausdrücklich erteilten Plattformberechtigung zu veröffentlichen und die angeforderten KI- und SaaS-Funktionen technisch zu betreiben.",
      "3.3 Diese betriebsnotwendige Lizenz ist keine unbegrenzte Marketinglizenz. Eine öffentliche Nutzung von Kundeninhalten, Bildern, Videos, Namen, Logos oder Testimonials für Werbung von AGXORA erfordert, soweit rechtlich geboten, eine gesonderte Einwilligung.",
      "3.4 Der Kunde muss sicherstellen, dass er die erforderlichen Rechte an Texten, Bildern, Videos, Marken, Logos, Audiodateien und sonstigen Materialien besitzt. Werden Personen erkennbar dargestellt, müssen die für den jeweiligen Zweck erforderlichen Rechte und Einwilligungen vorliegen.",
    ],
  },
  {
    id: "ai",
    title: "4. KI – Input, Output und Training",
    paragraphs: [
      "4.1 Nutzer behalten grundsätzlich ihre Rechte an ihren Eingaben, soweit ihnen diese Rechte zustehen. KI-Ausgaben sind nicht immer einzigartig; ähnliche Ergebnisse können bei anderen Nutzern entstehen.",
      "4.2 KI-Ergebnisse können fehlerhaft, unvollständig oder ungeeignet sein. Nutzer müssen Ergebnisse vor geschäftlich, rechtlich, finanziell oder anderweitig wesentlichen Entscheidungen angemessen prüfen. Das gilt insbesondere vor einer Veröffentlichung auf externen Plattformen.",
      "4.3 Vertrauliche Nutzer- und Kundendaten werden nicht automatisch zum Training generativer KI-Modelle verwendet.",
      "4.4 Ein optionales Programm zur Produktverbesserung oder zum KI-Training muss, falls AGXORA es einführt, transparent, von der normalen AGB-Annahme getrennt, soweit rechtlich erforderlich freiwillig und mit angemessener Information sowie Widerrufs- oder Rücknahmemöglichkeit ausgestaltet werden.",
      "4.5 Für externe KI- und API-Anbieter ist zu dokumentieren, welche Daten zu welchem Zweck, für welche Dauer, in welchem Land oder welcher Region und unter welchen Vertragsbedingungen übermittelt werden.",
      "4.6 Kunden dürfen über KI-Funktionen keine Daten verarbeiten lassen, für deren Verarbeitung ihnen die Berechtigung fehlt. Die Erlaubnis, KI-Inhalte zu erstellen, ist von der Erlaubnis zu trennen, diese Inhalte automatisch zu veröffentlichen.",
    ],
  },
  {
    id: "aup",
    title: "5. Acceptable Use Policy",
    paragraphs: [
      "Verboten sind insbesondere rechtswidrige Nutzung oder rechtswidrige Inhalte, Betrug, Identitätsmissbrauch oder Täuschung, Verletzung von Urheber-, Marken-, Persönlichkeits- oder Datenschutzrechten, Malware, unbefugter Zugriff oder Umgehung von Sicherheitsmechanismen, missbräuchliches Scraping, Spam, Belästigung oder Bedrohung sowie die Nutzung der KI für rechtswidrige oder schädliche Zwecke.",
      "Kunden dürfen kein externes Konto verbinden, zu dessen Verwaltung sie nicht berechtigt sind, und AGXORA nicht einsetzen, um Urheber-, Marken-, Persönlichkeits- oder sonstige Rechte zu verletzen. Für Hochrisiko- oder regulierte Anwendungen sind zusätzliche Einschränkungen vorzusehen.",
    ],
  },
  {
    id: "moderation",
    title: "6. Content Moderation und Durchsetzung",
    paragraphs: [
      "AGXORA soll Inhalte bei konkreten Anhaltspunkten für Rechts- oder Regelverstöße sperren, entfernen oder deren Veröffentlichung einschränken können. Für wiederholte oder schwerwiegende Verstöße sind abgestufte Maßnahmen vorzusehen, insbesondere Verwarnung, Einschränkung, Sperrung und Kündigung.",
      "Gesetzliche Melde-, Transparenz- und Verfahrenspflichten sind abhängig vom konkreten Plattformmodell gesondert zu prüfen.",
    ],
  },
  {
    id: "gdpr",
    title: "7. Datenschutz / DSGVO",
    paragraphs: [
      "Die Datenschutzerklärung wird getrennt von den AGB geführt. Sie beschreibt Verantwortliche, Zwecke, Kategorien personenbezogener Daten, Rechtsgrundlagen, Empfänger, Drittlandtransfers, Speicherdauern, Betroffenenrechte, Cookies und Tracking, Profiling, KI-Verarbeitung und Kontaktmöglichkeiten.",
      "Zu unterscheiden sind die Rechtsgrundlage der Verarbeitung, die vertragliche Verarbeitung zur Erbringung der SaaS-Leistung, eine Einwilligung soweit sie erforderlich ist, die technische OAuth-Autorisierung, die Verarbeitung durch unabhängige Drittplattformen, API-Daten, Analytics, Kundeninhalte, Kontoinformationen und Zugriffstoken.",
      "Für Geschäftskunden ist je nach tatsächlichem Datenfluss zu bestimmen, ob AGXORA Verantwortlicher, Auftragsverarbeiter oder in einer anderen rechtlich relevanten Rolle handelt. Eine pauschale Einordnung aller Verarbeitungen ist nicht zulässig. Soweit AGXORA weisungsgebunden personenbezogene Daten des Kunden verarbeitet, ist ein Vertrag nach Art. 28 DSGVO zu prüfen.",
      "Zugriffstoken werden verschlüsselt gespeichert. Passwörter externer Plattformen werden nicht erhoben und nicht gespeichert. Nach einem Widerruf werden Token gelöscht oder unbrauchbar gemacht, soweit nicht gesetzliche Aufbewahrungspflichten entgegenstehen.",
    ],
  },
  {
    id: "marketing",
    title: "8. Social Media und Marketing – separate Einwilligung",
    paragraphs: [
      "Die Zustimmung zu den AGB ist keine pauschale Einwilligung, Kundeninhalte für Werbung von AGXORA zu veröffentlichen. Das Verbinden eines Instagram-, Facebook- oder sonstigen Kontos bedeutet nicht, dass AGXORA diese Inhalte für eigene Werbung nutzen darf.",
      "Soweit AGXORA Foto-, Video-, Namens-, Logo-, Profil- oder sonstige Kundeninhalte zu eigenen Marketingzwecken verwenden möchte, ist dafür – soweit rechtlich erforderlich – eine gesonderte, freiwillige und widerrufbare Einwilligung mit bestimmtem Zweck einzuholen.",
    ],
  },
  {
    id: "cookies",
    title: "9. Cookies, Tracking und Analytics",
    paragraphs: [
      "Notwendige Technologien sind von optionalen Analyse-, Marketing- und Tracking-Technologien zu unterscheiden. Für zustimmungsbedürftige Technologien ist ein Consent-Management mit dokumentierbarer Auswahl, Widerruf und Nachweis vorzusehen. Die Implementierung muss zu den tatsächlich eingesetzten Tools passen.",
    ],
  },
  {
    id: "third-parties",
    title: "10. Drittanbieter, APIs und Subprozessoren",
    paragraphs: [
      "AGXORA kann für Hosting, Datenbanken, Authentifizierung, Zahlungsabwicklung, E-Mail, Analytics, KI, Speicherung, Monitoring und weitere Funktionen externe Anbieter einsetzen. Vor dem Einsatz sind Datenschutz-, Sicherheits-, Nutzungs- und Datenverarbeitungsbedingungen zu prüfen. Verträge, Auftragsverarbeitung, Subprozessoren und internationale Transfers sind zu dokumentieren.",
      "Externe Plattformen bleiben unabhängige Dienste. AGXORA steuert nicht deren API-Verfügbarkeit, Richtlinienänderungen, Kontosperren, Ausfälle, Ratenlimits, entzogene Berechtigungen oder sonstigen Entscheidungen. AGXORA garantiert deshalb nicht die dauerhafte Verfügbarkeit jeder externen Integration. Diese Regelung schränkt gesetzlich zwingende Pflichten von AGXORA nicht ab.",
    ],
  },
  {
    id: "ip",
    title: "11. Geistiges Eigentum",
    paragraphs: [
      "Rechte an AGXORA-Software, Marke, Logo, Design, Quellcode, Datenbankstruktur, Plattformarchitektur und von AGXORA erstellten Materialien verbleiben bei AGXORA beziehungsweise den jeweiligen Rechteinhabern. Nutzern wird nur das für die vereinbarte Nutzung erforderliche Recht eingeräumt. Open-Source- und Drittanbieterlizenzen sind gesondert zu beachten.",
    ],
  },
  {
    id: "liability",
    title: "12. Haftung und Verantwortlichkeit",
    paragraphs: [
      "AGXORA haftet nach den gesetzlichen Vorschriften. Zwingende Haftung, insbesondere bei Vorsatz, grober Fahrlässigkeit sowie Verletzung von Leben, Körper oder Gesundheit, wird nicht ausgeschlossen.",
      "Der Kunde bleibt verantwortlich für seine Eingaben, für die Rechtmäßigkeit der Inhalte, deren Veröffentlichung er veranlasst, und für die Prüfung wesentlicher KI-Ergebnisse. Er muss die Regeln der jeweiligen Drittplattform einhalten.",
    ],
  },
  {
    id: "termination",
    title: "13. Kündigung, Löschung und Datenaufbewahrung",
    paragraphs: [
      "Regeln für Kündigung, Kontosperrung, Löschung und Export müssen transparent sein. Gesetzliche Aufbewahrungspflichten, Abrechnungsdaten, Nachweise und andere zulässige Speicherungen können nach Kontolöschung fortbestehen. Nach Trennung einer externen Plattform bewahrt AGXORA nur die rechtlich erforderlichen Nachweise der Autorisierung auf.",
    ],
  },
  {
    id: "consumer",
    title: "14. Verbraucherrecht",
    paragraphs: [
      "Wenn AGXORA Leistungen an Verbraucher in Deutschland oder anderen EU-Staaten anbietet, sind insbesondere Informationspflichten, Widerrufsrecht, Regeln für digitale Produkte und Dienstleistungen, Kündigung, Preisangaben und besondere Anforderungen für digitale Inhalte zu prüfen und technisch umzusetzen.",
    ],
  },
  {
    id: "international",
    title: "15. Internationale Nutzer",
    paragraphs: [
      "Bei internationalem Angebot sind anwendbare lokale Verbraucherschutz-, Datenschutz-, Steuer-, KI- und Plattformregeln zu prüfen. Eine pauschale Rechtswahl darf zwingende Verbraucherschutzrechte nicht ausschließen.",
    ],
  },
  {
    id: "implementation",
    title: "16. Rechtliche Umsetzung in der Plattform",
    paragraphs: [
      "Technisch und rechtlich getrennt zu erfassen sind: AGB-Annahme, Datenschutzinformation, Autorisierung externer Plattformen, Autorisierung von KI-Funktionen, Autorisierung automatischer Veröffentlichung und, soweit verwendet, Marketingeinwilligung.",
      "Gespeichert werden mindestens das Rechtsdokument, die Dokumentversion, der Zeitpunkt, die Nutzer- und Kundenkennung, die Art der Autorisierung, die Plattform und die Autorisierungsversion. Bei wesentlichen AGB-Änderungen unterstützt das System eine neue Version und eine erneute Annahme, soweit diese rechtlich erforderlich ist.",
    ],
  },
  {
    id: "golive",
    title: "17. Offene Punkte vor dem Go-Live",
    paragraphs: [
      "Vor Veröffentlichung sind insbesondere festzulegen: konkrete Produkte und Funktionen, Zielgruppen, Länder, Tarife und Zahlungsanbieter, Hosting, KI- und API-Anbieter, Datenflüsse und Speicherfristen, Subprozessoren, Supportzugriff, Moderation, Umgang mit Minderjährigen, Cookies, Social-Media-Nutzung, Export und Löschung, Auftragsverarbeitung, Impressum, Widerruf und Kündigung sowie die konkrete Fassung der AGB und Datenschutzerklärung.",
      "Die endgültige Fassung ist nach Festlegung der technischen Architektur juristisch zu prüfen. Dieses Framework ersetzt diese Prüfung nicht.",
    ],
  },
  {
    id: "next",
    title: "18. Umsetzungsschritt",
    paragraphs: [
      "Version 1.0 war die Grundlage für die spätere rechtliche und technische Umsetzung. Version 1.1 setzt den Autorisierungsrahmen für externe Plattformen in diese Struktur ein. Empfohlene finale Dokumente bleiben AGB, Datenschutzerklärung, AI Terms, Acceptable Use Policy, User-Content- und IP-Regeln, Marketingeinwilligung, Cookie Policy, Zahlungsbedingungen, Widerrufs- und Kündigungsinformationen, Impressum und soweit erforderlich Auftragsverarbeitung sowie Subprozessoren.",
    ],
  },
  {
    id: "external-platforms",
    title: "19. Verbindung externer Plattformen, Social Media und Drittanbieter",
    paragraphs: [
      "19.1 Integrationen. Kunden können, soweit AGXORA die jeweilige Plattform technisch unterstützt, externe Konten verbinden, damit AGXORA im Rahmen der ausdrücklichen Freigabe und der technischen Möglichkeiten der Plattform erlaubte Kontoinformationen und Inhalte lesen, Inhalte erstellen, KI-Inhalte erzeugen, Inhalte planen, veröffentlichen, bearbeiten oder löschen, Analytics lesen, erlaubte Kommentare oder Nachrichten verwalten und sonstige ausdrücklich freigegebene Aktionen ausführen kann. Unterstützt werden können insbesondere Instagram, Facebook, LinkedIn, TikTok, YouTube, X, Google Business Profile, Shopify und spätere Integrationen. Nicht jede Plattform stellt dieselben Berechtigungen bereit.",
      "19.2 Ausdrückliche Autorisierung. AGXORA erhält niemals weitergehenden Zugriff, als der Kunde ausdrücklich freigegeben hat. Die Annahme der AGB berechtigt nicht zum Zugriff auf Social-Media- oder sonstige Drittkonten. Vor der Verbindung zeigt AGXORA die Plattform, das Konto soweit bereits bekannt, die angefragten Berechtigungen, was gelesen, erstellt, veröffentlicht, geändert oder gelöscht werden kann, ob KI-Inhalte beteiligt sind, ob automatische Veröffentlichung aktiviert wird, ob Analytics gelesen werden, und wie die Autorisierung widerrufen werden kann. Der Kunde muss aktiv bestätigen.",
      "19.3 OAuth und API. Soweit verfügbar, verwendet AGXORA die offiziellen OAuth- oder API-Verfahren der Plattform. AGXORA erhebt und speichert das Passwort des externen Kontos nicht. Zugriffstoken werden verschlüsselt gespeichert, auf die freigegebenen Scopes beschränkt, bei Ablauf erneuert oder als abgelaufen gekennzeichnet und bei Widerruf gelöscht oder unbrauchbar gemacht. Eine Umgehung der Plattformsicherheit ist unzulässig.",
      "19.4 Plattformspezifische Berechtigungen. Angezeigt und gespeichert werden nur Berechtigungen, die die jeweilige Plattform und die implementierte Schnittstelle tatsächlich unterstützen. Die von der Plattform erteilten OAuth-Scopes begrenzen, was AGXORA technisch ausführen darf. Entzieht oder ändert eine Plattform eine API-Fähigkeit, versucht AGXORA nicht, diese Beschränkung zu umgehen.",
      "19.5 KI-Inhalte. Der Kunde kann gesondert erlauben, dass AGXORA auf Grundlage seiner Einstellungen und freigegebenen Inhalte Bildunterschriften, Beiträge, Bilder, Videos, Anzeigen, Marketinginhalte, Kampagnen oder Antworten erzeugt. Diese Erlaubnis umfasst nicht die automatische Veröffentlichung.",
      "19.6 Automatische Veröffentlichung. Automatische Veröffentlichung wird nicht stillschweigend aktiviert. Aktiviert der Kunde sie, zeigt AGXORA Plattform, Konto, Inhaltsart, den Einsatz von KI und die Veröffentlichungsregeln und verlangt eine ausdrückliche Bestätigung. Der Kunde kann die automatische Veröffentlichung wieder abschalten.",
      "19.7 Verantwortung des Kunden. Der Kunde sichert zu, dass er das verbundene Konto besitzt oder zu seiner Verwaltung berechtigt ist, dass er AGXORA den Zugriff wirksam einräumen darf, dass die von ihm zur Veröffentlichung bestimmten Inhalte rechtmäßig sind und dass er die Regeln der Drittplattform einhält. Er darf kein Konto ohne Berechtigung verbinden.",
      "19.8 Regeln der Drittplattform. AGXORA beachtet die APIs, OAuth-Scopes, Entwicklerrichtlinien, Ratenlimits, Nutzungsbedingungen, technischen Beschränkungen und Kontoberechtigungen der Plattform.",
      "19.9 Widerruf und Trennung. Der Kunde kann eine Plattform trennen. Danach beendet AGXORA den API-Zugriff, invalidiert oder löscht Token soweit angemessen, stoppt geplante Aktionen, die diese Autorisierung benötigen, aktualisiert den Status und protokolliert den Widerruf. Sichtbare Status sind insbesondere verbunden, getrennt, Autorisierung abgelaufen, Autorisierung widerrufen und Verbindungsfehler.",
      "19.10 Sicherheit und Nachweis. AGXORA verwendet Least-Privilege-Berechtigungen und verhindert die unbefugte Wiederverwendung von Token. Protokolliert werden, wer was für welche Plattform mit welchen Berechtigungen wann autorisiert hat und ob die Autorisierung später widerrufen wurde. Externe Passwörter werden nicht protokolliert. Zugriffe sind auf die Organisation des Kunden beschränkt.",
      "19.11 Verfügbarkeit. Änderungen, Ausfälle, Ratenlimits und Entscheidungen der Drittplattform können Integrationen einschränken. AGXORA schuldet deshalb nicht die ununterbrochene Verfügbarkeit jeder externen Schnittstelle, bleibt aber für eigene gesetzliche Pflichten verantwortlich.",
      "19.12 Datenverarbeitung. Kontoinformationen, Inhalte, Analytics und Token werden nur im Rahmen der freigegebenen Funktion, der AGB, der Datenschutzerklärung und, soweit einschlägig, eines Auftragsverarbeitungsvertrags verarbeitet. Die OAuth-Autorisierung ersetzt nicht die datenschutzrechtliche Prüfung der Rechtsgrundlage.",
    ],
  },
];
