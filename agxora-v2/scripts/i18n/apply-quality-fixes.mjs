#!/usr/bin/env node
/**
 * Apply RC localization quality fixes to locale JSON (not English).
 * - Strip leaked XLIFF / HTML entities
 * - Replace leftover Lieferschein in non-German locales
 * - Apply curated chrome/auth/dashboard overlay
 * - Fill Persian English leftovers
 * - Seed new English keys into all locales
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  QUALITY,
  FA_LEFTOVERS,
  DELIVERY,
  PARENT,
  zip,
} from "./quality-overlay.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES = path.join(__dirname, "../../app/lib/i18n/messages");

const LOCALES = fs.readdirSync(MESSAGES).filter((name) => {
  const full = path.join(MESSAGES, name);
  return fs.statSync(full).isDirectory() && name !== "en";
});

const NAMESPACES = fs
  .readdirSync(path.join(MESSAGES, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object" || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function loadLocale(locale) {
  const trees = {};
  for (const ns of NAMESPACES) {
    trees[ns] = JSON.parse(
      fs.readFileSync(path.join(MESSAGES, locale, `${ns}.json`), "utf8"),
    );
  }
  return trees;
}

function writeLocale(locale, trees) {
  for (const ns of NAMESPACES) {
    fs.writeFileSync(
      path.join(MESSAGES, locale, `${ns}.json`),
      JSON.stringify(trees[ns], null, 2) + "\n",
    );
  }
}

function cleanString(value) {
  return value
    .replace(/<g id="[^"]*">/g, "")
    .replace(/<\/g>/g, "")
    .replace(/<x id="[^"]*"\s*\/>/g, "")
    .replace(/&#xA0;/gi, "\u00a0")
    .replace(/&#10;/g, "")
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]+$/g, "");
}

function walkClean(node) {
  if (typeof node === "string") return cleanString(node);
  if (Array.isArray(node)) return node.map(walkClean);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walkClean(v);
    return out;
  }
  return node;
}

function replaceLieferschein(node, singular, plural) {
  if (typeof node === "string") {
    return node.replaceAll("Lieferscheine", plural).replaceAll("Lieferschein", singular);
  }
  if (Array.isArray(node)) return node.map((v) => replaceLieferschein(v, singular, plural));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = replaceLieferschein(v, singular, plural);
    }
    return out;
  }
  return node;
}

function applyKeyMap(trees, keyMap) {
  for (const [dotted, value] of Object.entries(keyMap)) {
    const ns = dotted.split(".")[0];
    const rest = dotted.slice(ns.length + 1);
    if (!trees[ns] || typeof value !== "string") continue;
    setPath(trees[ns], rest, value);
  }
}

const INDUSTRY_LABELS = {
  business: zip(["Unternehmen", "کسب‌وکار", "企业", "企業", "ビジネス", "Bedrijf", "Entreprise", "Empresa", "Azienda", "Empresa", "Бизнес", "İş", "أعمال", "비즈니스", "Biznes", "Бізнес", "व्यवसाय", "Bisnis", "Doanh nghiệp"]),
  freelancer: zip(["Freelancer", "فریلنسر", "自由职业者", "自由工作者", "フリーランス", "Freelancer", "Freelance", "Autónomo", "Freelance", "Freelancer", "Фрилансер", "Serbest çalışan", "مستقل", "프리랜서", "Freelancer", "Фрилансер", "फ्रीलांसर", "Freelancer", "Freelancer"]),
  creator: zip(["Creator", "کریتور", "创作者", "創作者", "クリエイター", "Creator", "Créateur", "Creador", "Creator", "Criador", "Криейтор", "İçerik üreticisi", "صانع محتوى", "크리에이터", "Twórca", "Кріейтор", "क्रिएटर", "Kreator", "Nhà sáng tạo"]),
  influencer: zip(["Influencer", "اینفلوئنسر", "达人", "網紅", "インフルエンサー", "Influencer", "Influenceur", "Influencer", "Influencer", "Influencer", "Инфлюенсер", "Influencer", "مؤثر", "인플루언서", "Influencer", "Інфлюенсер", "इन्फ्लुएंसर", "Influencer", "Influencer"]),
  agency: zip(["Agentur", "آژانس", "代理机构", "代理商", "代理店", "Bureau", "Agence", "Agencia", "Agenzia", "Agência", "Агентство", "Ajans", "وكالة", "에이전시", "Agencja", "Агенція", "एजेंसी", "Agensi", "Agency"]),
  retail: zip(["Einzelhandel", "خرده‌فروشی", "零售", "零售", "小売", "Retail", "Commerce", "Retail", "Retail", "Retalho", "Ритейл", "Perakende", "تجزئة", "리테일", "Handel", "Рітейл", "खुदरा", "Ritel", "Bán lẻ"]),
  restaurant: zip(["Restaurant", "رستوران", "餐饮", "餐廳", "レストラン", "Restaurant", "Restaurant", "Restaurante", "Ristorante", "Restaurante", "Ресторан", "Restoran", "مطعم", "레스토랑", "Restauracja", "Ресторан", "रेस्तरां", "Restoran", "Nhà hàng"]),
  hotel: zip(["Hotel", "هتل", "酒店", "飯店", "ホテル", "Hotel", "Hôtel", "Hotel", "Hotel", "Hotel", "Отель", "Otel", "فندق", "호텔", "Hotel", "Готель", "होटल", "Hotel", "Khách sạn"]),
  laundry: zip(["Wäscherei", "خشکشویی", "洗衣", "洗衣", "ランドリー", "Wasserij", "Blanchisserie", "Lavandería", "Lavanderia", "Lavandaria", "Прачечная", "Çamaşırhane", "مغسلة", "세탁", "Pralnia", "Пральня", "लॉन्ड्री", "Laundry", "Giặt ủi"]),
  healthcare: zip(["Gesundheitswesen", "سلامت", "医疗", "醫療", "ヘルスケア", "Zorg", "Santé", "Salud", "Sanità", "Saúde", "Здравоохранение", "Sağlık", "رعاية صحية", "헬스케어", "Ochrona zdrowia", "Охорона здоров’я", "स्वास्थ्य सेवा", "Kesehatan", "Y tế"]),
  law_firm: zip(["Kanzlei", "موسسه حقوقی", "律师事务所", "律師事務所", "法律事務所", "Advocatenkantoor", "Cabinet d’avocats", "Bufete", "Studio legale", "Sociedade de advogados", "Юридическая фирма", "Hukuk bürosu", "مكتب محاماة", "로펌", "Kancelaria", "Юридична фірма", "लॉ फर्म", "Firma hukum", "Công ty luật"]),
  accounting: zip(["Buchhaltung", "حسابداری", "会计", "會計", "会計", "Boekhouding", "Comptabilité", "Contabilidad", "Contabilità", "Contabilidade", "Бухгалтерия", "Muhasebe", "محاسبة", "회계", "Księgowość", "Бухгалтерія", "लेखांकन", "Akuntansi", "Kế toán"]),
  construction: zip(["Bau", "ساخت‌وساز", "建筑", "營建", "建設", "Bouw", "Construction", "Construcción", "Edilizia", "Construção", "Строительство", "İnşaat", "إنشاءات", "건설", "Budownictwo", "Будівництво", "निर्माण", "Konstruksi", "Xây dựng"]),
  real_estate: zip(["Immobilien", "املاک", "房地产", "房地產", "不動産", "Vastgoed", "Immobilier", "Inmobiliaria", "Immobiliare", "Imobiliário", "Недвижимость", "Gayrimenkul", "عقارات", "부동산", "Nieruchomości", "Нерухомість", "रियल एस्टेट", "Properti", "Bất động sản"]),
  education: zip(["Bildung", "آموزش", "教育", "教育", "教育", "Onderwijs", "Éducation", "Educación", "Istruzione", "Educação", "Образование", "Eğitim", "تعليم", "교육", "Edukacja", "Освіта", "शिक्षा", "Pendidikan", "Giáo dục"]),
  manufacturing: zip(["Fertigung", "تولید", "制造", "製造", "製造", "Productie", "Fabrication", "Manufactura", "Manifattura", "Produção", "Производство", "Üretim", "تصنيع", "제조", "Produkcja", "Виробництво", "विनिर्माण", "Manufaktur", "Sản xuất"]),
  logistics: zip(["Logistik", "لجستیک", "物流", "物流", "物流", "Logistiek", "Logistique", "Logística", "Logistica", "Logística", "Логистика", "Lojistik", "خدمات لوجستية", "물류", "Logistyka", "Логістика", "लॉजिस्टिक्स", "Logistik", "Logistics"]),
  ecommerce: zip(["E-Commerce", "تجارت الکترونیک", "电子商务", "電子商務", "Eコマース", "E-commerce", "E-commerce", "Comercio electrónico", "E-commerce", "E-commerce", "Электронная коммерция", "E-ticaret", "تجارة إلكترونية", "이커머스", "E-commerce", "Електронна комерція", "ई-कॉमर्स", "E-commerce", "Thương mại điện tử"]),
};

const INDUSTRY_DESC = {
  business: zip(["Allgemeines B2B-Betriebssystem", "سیستم عامل عمومی B2B", "通用 B2B 操作系统", "通用 B2B 作業系統", "汎用B2Bオペレーティングシステム", "Algemeen B2B-besturingssysteem", "Système d’exploitation B2B général", "Sistema operativo B2B general", "Sistema operativo B2B generale", "Sistema operacional B2B geral", "Универсальная B2B-ОС", "Genel B2B işletim sistemi", "نظام تشغيل B2B عام", "일반 B2B 운영 체제", "Uniwersalny system B2B", "Універсальна B2B-ОС", "सामान्य B2B ऑपरेटिंग सिस्टम", "Sistem operasi B2B umum", "Hệ điều hành B2B chung"]),
  freelancer: zip(["CRM, Rechnungen und Kundenpipeline für Einzelunternehmer", "CRM، فاکتور و قیف مشتری برای کار مستقل", "个人经营者的 CRM、发票和客户管道", "個人工作者的 CRM、發票與客戶管道", "個人事業向けCRM・請求・顧客パイプライン", "CRM, facturen en klantdoorstroom voor zzp’ers", "CRM, factures et pipeline client pour indépendants", "CRM, facturas y pipeline de clientes para autónomos", "CRM, fatture e pipeline clienti per freelance", "CRM, faturas e pipeline de clientes para independentes", "CRM, счета и воронка клиентов для самозанятых", "Serbest çalışanlar için CRM, fatura ve müşteri hattı", "CRM والفواتير ومسار العملاء للمستقلين", "1인 사업자용 CRM, 청구서, 고객 파이프라인", "CRM, faktury i lejek klientów dla freelancerów", "CRM, рахунки й воронка клієнтів для фрилансерів", "सोलो ऑपरेटर के लिए CRM, चालान और ग्राहक पाइपलाइन", "CRM, faktur, dan pipeline pelanggan untuk solo", "CRM, hóa đơn và pipeline khách cho freelancer"]),
  creator: zip(["Creator Studio und Marken-CRM", "استودیو کریتور و CRM برند", "创作者工作室 + 品牌 CRM", "創作者工作室 + 品牌 CRM", "Creator StudioとブランドCRM", "Creator Studio + merk-CRM", "Creator Studio + CRM de marque", "Creator Studio + CRM de marca", "Creator Studio + CRM di brand", "Creator Studio + CRM de marca", "Creator Studio и бренд-CRM", "Creator Studio + marka CRM", "استوديو المنشئين + CRM للعلامة", "크리에이터 스튜디오 + 브랜드 CRM", "Creator Studio + CRM marki", "Creator Studio + CRM бренду", "क्रिएटर स्टूडियो + ब्रांड CRM", "Creator Studio + CRM merek", "Creator Studio + CRM thương hiệu"]),
  influencer: zip(["Sponsoring-CRM und Kampagnen-OS", "CRM اسپانسرشیپ و سیستم کمپین", "赞助 CRM 与活动操作系统", "贊助 CRM 與活動作業系統", "スポンサーCRMとキャンペーンOS", "Sponsor-CRM en campagne-OS", "CRM sponsoring et OS campagnes", "CRM de patrocinios y OS de campañas", "CRM sponsorship e OS campagne", "CRM de patrocínios e SO de campanhas", "CRM спонсорств и ОС кампаний", "Sponsorluk CRM ve kampanya OS", "CRM رعايات ونظام حملات", "스폰서십 CRM 및 캠페인 OS", "CRM sponsoringu i OS kampanii", "CRM спонсорства й ОС кампаній", "स्पॉन्सरशिप CRM और कैंपेन OS", "CRM sponsorship dan OS kampanye", "CRM tài trợ và OS chiến dịch"]),
  agency: zip(["Lieferung und Retainer für mehrere Kunden", "تحویل چندمشتری و قراردادهای نگهداشت", "多客户交付与顾问合同", "多客戶交付與顧問合約", "複数顧客の納品とリテイナー", "Levering en retainers voor meerdere klanten", "Livraison multi-clients et retainers", "Entrega multi-cliente y retainers", "Consegna multi-cliente e retainer", "Entrega multi-cliente e retainers", "Мультиклиентская поставка и ретейнеры", "Çok müşterili teslim ve retainer", "تسليم متعدد العملاء وعقود الاحتفاظ", "다중 고객 납품 및 리테이너", "Wielokliencka realizacja i retainery", "Багатоклієнтська поставка й ретейнери", "मल्टी-कस्टमर डिलीवरी और रिटेनर", "Pengiriman multi-klien dan retainer", "Giao hàng nhiều khách và retainer"]),
  retail: zip(["Filialbestand, POS und Treue", "موجودی فروشگاه، صندوق و وفاداری", "门店库存、POS 与忠诚度", "門市庫存、POS 與忠誠度", "店舗在庫・POS・ロイヤルティ", "Winkelvoorraad, kassa en loyaliteit", "Stock magasin, POS et fidélité", "Inventario, TPV y fidelización", "Inventario, POS e loyalty", "Inventário, POS e fidelização", "Склад магазина, POS и лояльность", "Mağaza stoğu, POS ve sadakat", "مخزون المتجر ونقاط البيع والولاء", "매장 재고, POS, 로열티", "Stan magazynu, POS i lojalność", "Запас магазину, POS і лояльність", "स्टोर इन्वेंटरी, POS और लॉयल्टी", "Inventaris toko, POS, dan loyalitas", "Tồn kho cửa hàng, POS và khách thân thiết"]),
  restaurant: zip(["Reservierungen, Küche und Lieferung", "رزرو، آشپزخانه و ارسال", "预订、后厨与外送", "訂位、廚房與外送", "予約・キッチン・デリバリー", "Reserveringen, keuken en bezorging", "Réservations, cuisine et livraison", "Reservas, cocina y entrega", "Prenotazioni, cucina e consegna", "Reservas, cozinha e entrega", "Брони, кухня и доставка", "Rezervasyon, mutfak ve teslimat", "الحجوزات والمطبخ والتوصيل", "예약, 주방, 배달", "Rezerwacje, kuchnia i dostawa", "Бронювання, кухня й доставка", "आरक्षण, रसोई और डिलीवरी", "Reservasi, dapur, dan pengiriman", "Đặt chỗ, bếp và giao hàng"]),
  hotel: zip(["Zimmer, Gäste und Housekeeping", "اتاق، مهمان و خانه‌داری", "客房、宾客与客房服务", "客房、賓客與房務", "客室・ゲスト・ハウスキーピング", "Kamers, gasten en housekeeping", "Chambres, clients et housekeeping", "Habitaciones, huéspedes y housekeeping", "Camere, ospiti e housekeeping", "Quartos, hóspedes e housekeeping", "Номера, гости и хаускипинг", "Odalar, misafirler ve kat hizmetleri", "الغرف والضيوف والتدبير المنزلي", "객실, 투숙객, 하우스키핑", "Pokoje, goście i housekeeping", "Номери, гості й хаускіпінг", "कमरे, मेहमान और हाउसकीपिंग", "Kamar, tamu, dan housekeeping", "Phòng, khách và buồng phòng"]),
  laundry: zip(["Abholung, Tickets und Routenlogistik", "جمع‌آوری، بلیت و لجستیک مسیر", "取件、工单与路线物流", "取件、工單與路線物流", "集荷・チケット・ルート物流", "Ophaal, tickets en routelogistiek", "Enlèvement, tickets et logistique d’itinéraires", "Recogida, tickets y logística de rutas", "Ritiro, ticket e logistica dei percorsi", "Recolha, tickets e logística de rotas", "Забор, заявки и маршрутная логистика", "Alım, bilet ve güzergâh lojistiği", "الاستلام والتذاكر ولوجستيات المسارات", "픽업, 티켓, 경로 물류", "Odbiór, zgłoszenia i logistyka tras", "Забір, заявки й логістика маршрутів", "पिकअप, टिकट और रूट लॉजिस्टिक्स", "Penjemputan, tiket, dan logistik rute", "Nhận hàng, phiếu và logistics tuyến"]),
  healthcare: zip(["Patienten, Termine, Compliance", "بیماران، نوبت‌ها، انطباق", "患者、预约、合规", "病人、預約、合規", "患者・予約・コンプライアンス", "Patiënten, afspraken, compliance", "Patients, rendez-vous, conformité", "Pacientes, citas, cumplimiento", "Pazienti, appuntamenti, conformità", "Utentes, consultas, conformidade", "Пациенты, приёмы, соответствие", "Hastalar, randevular, uyum", "المرضى والمواعيد والامتثال", "환자, 예약, 컴플라이언스", "Pacjenci, wizyty, zgodność", "Пацієнти, прийоми, відповідність", "मरीज, अपॉइंटमेंट, अनुपालन", "Pasien, janji, kepatuhan", "Bệnh nhân, lịch hẹn, tuân thủ"]),
  law_firm: zip(["Mandate, Abrechnung und Dokumentensafe", "پرونده‌ها، صورتحساب و خزانه اسناد", "案件、账单与文档库", "案件、帳單與文件庫", "案件・請求・文書保管", "Zaken, facturatie en documentkluis", "Dossiers, facturation et coffre documentaire", "Asuntos, facturación y bóveda documental", "Pratiche, fatturazione e archivio documenti", "Processos, faturação e cofre documental", "Дела, биллинг и хранилище документов", "Dosyalar, faturalama ve belge kasası", "القضايا والفوترة وخزنة المستندات", "사건, 청구, 문서 금고", "Sprawy, rozliczenia i sejf dokumentów", "Справи, білінг і сховище документів", "मामले, बिलिंग और दस्तावेज़ वॉल्ट", "Perkara, penagihan, dan brankas dokumen", "Vụ việc, thanh toán và kho tài liệu"]),
  accounting: zip(["Mandantenbücher und DATEV-exporte", "دفتر مشتریان و خروجی آماده DATEV", "客户账簿与 DATEV 导出", "客戶帳簿與 DATEV 匯出", "顧客帳簿とDATEV出力", "Klantdossiers en DATEV-export", "Livres clients et exports DATEV", "Libros de clientes y exportaciones DATEV", "Libri clienti ed export DATEV", "Livros de clientes e exportações DATEV", "Клиентские книги и выгрузки DATEV", "Müşteri defterleri ve DATEV aktarımı", "دفاتر العملاء وتصدير DATEV", "고객 장부 및 DATEV 내보내기", "Księgi klientów i eksport DATEV", "Клієнтські книги й експорт DATEV", "ग्राहक बही और DATEV निर्यात", "Buku klien dan ekspor DATEV", "Sổ khách và xuất DATEV"]),
  construction: zip(["Baustellen, Teams und Fortschrittsabrechnung", "سایت‌ها، گروه‌ها و صورت‌وضعیت پیشرفت", "工地、班组与进度结算", "工地、班組與進度請款", "現場・班・出来高請求", "Locaties, ploegen en voortgangsfacturatie", "Chantiers, équipes et facturation d’avancement", "Obras, cuadrillas y facturación de avance", "Cantieri, squadre e fatturazione avanzamento", "Estaleiros, equipas e faturação de progresso", "Площадки, бригады и прогресс-биллинг", "Şantiyeler, ekipler ve hakediş", "المواقع والفرق والفوترة حسب التقدم", "현장, 팀, 기성 청구", "Place budowy, ekipy i rozliczanie postępu", "Майданчики, бригади й білінг прогресу", "साइट, क्रू और प्रोग्रेस बिलिंग", "Lokasi, kru, dan penagihan progres", "Công trường, tổ đội và thanh toán tiến độ"]),
  real_estate: zip(["Inserate, Besichtigungen und Abschlüsse", "آگهی‌ها، بازدیدها و قراردادها", "房源、看房与成交", "物件、看屋與成交", "物件・内見・成約", "Listings, bezichtigingen en afrondingen", "Annonces, visites et clôtures", "Listados, visitas y cierres", "Annunci, visite e chiusure", "Listagens, visitas e fechos", "Объявления, показы и сделки", "İlanlar, geziler ve kapanışlar", "القوائم والمعاينات والإغلاق", "매물, 방문, 거래 마감", "Oferty, oględziny i zamknięcia", "Оголошення, покази й закриття", "लिस्टिंग, विजिट और क्लोजिंग", "Listing, viewing, dan closing", "Tin đăng, xem nhà và chốt giao dịch"]),
  education: zip(["Studierende, Kurse und Einschreibung", "دانشجویان، دوره‌ها و ثبت‌نام", "学生、课程与招生", "學生、課程與註冊", "学生・コース・入学", "Studenten, cursussen en inschrijving", "Étudiants, cours et inscriptions", "Estudiantes, cursos e inscripción", "Studenti, corsi e iscrizioni", "Estudantes, cursos e inscrição", "Студенты, курсы и зачисление", "Öğrenciler, kurslar ve kayıt", "الطلاب والدورات والتسجيل", "학생, 과정, 등록", "Studenci, kursy i rekrutacja", "Студенти, курси й зарахування", "छात्र, पाठ्यक्रम और नामांकन", "Mahasiswa, kursus, dan pendaftaran", "Học viên, khóa học và ghi danh"]),
  manufacturing: zip(["Stückliste, Fertigung und QS", "BOM، تولید و کنترل کیفیت", "BOM、生产与质检", "BOM、生產與品管", "BOM・生産・品質", "BOM, productie en QC", "Nomenclature, production et CQ", "BOM, producción y QC", "Distinta base, produzione e QC", "BOM, produção e QC", "BOM, производство и ОТК", "BOM, üretim ve kalite", "قائمة المواد والإنتاج والجودة", "BOM, 생산, 품질", "BOM, produkcja i QC", "BOM, виробництво й ВТК", "BOM, उत्पादन और QC", "BOM, produksi, dan QC", "BOM, sản xuất và QC"]),
  logistics: zip(["Flotte, Sendungsverfolgung und Lieferscheine", "ناوگان، ردیابی و برگه‌های تحویل", "车队、追踪与送货单", "車隊、追蹤與送貨單", "車両・追跡・納品書", "Vloot, tracking en leveringsbonnen", "Flotte, suivi et bons de livraison", "Flota, seguimiento y albaranes", "Flotta, tracking e bolle di consegna", "Frota, tracking e guias de remessa", "Автопарк, трекинг и накладные", "Filo, izleme ve irsaliyeler", "الأسطول والتتبع وأذون التسليم", "차량, 추적, 납품서", "Flota, śledzenie i listy przewozowe", "Автопарк, трекінг і накладні", "फ्लीट, ट्रैकिंग और डिलीवरी नोट", "Armada, pelacakan, dan surat jalan", "Đội xe, theo dõi và phiếu giao hàng"]),
  ecommerce: zip(["Katalog, Warenkörbe und Omnichannel-Aufträge", "کاتالوگ، سبد و سفارش‌های چندکاناله", "目录、购物车与全渠道订单", "目錄、購物車與全通路訂單", "カタログ・カート・オムニチャネル受注", "Catalogus, winkelwagens en omnichannel-orders", "Catalogue, paniers et commandes omnicanales", "Catálogo, carritos y pedidos omnicanal", "Catalogo, carrelli e ordini omnicanale", "Catálogo, carrinhos e encomendas omnicanal", "Каталог, корзины и омниканальные заказы", "Katalog, sepetler ve omnichannel siparişler", "الكتالوج والسلال وطلبات القنوات المتعددة", "카탈로그, 장바구니, 옴니채널 주문", "Katalog, koszyki i zamówienia omnichannel", "Каталог, кошики й омніканальні замовлення", "कैटलॉग, कार्ट और ऑमनीचैनल ऑर्डर", "Katalog, keranjang, dan pesanan omnichannel", "Danh mục, giỏ hàng và đơn omnichannel"]),
};

const KEEP_MODULE = new Set(["crm", "pos", "datev", "bom", "qc"]);

const MODULE_LABELS = {
  sales: zip(["Vertrieb", "فروش", "销售", "銷售", "営業", "Verkoop", "Ventes", "Ventas", "Vendite", "Vendas", "Продажи", "Satış", "المبيعات", "영업", "Sprzedaż", "Продажі", "बिक्री", "Penjualan", "Bán hàng"]),
  finance: zip(["Finanzen", "مالی", "财务", "財務", "財務", "Financiën", "Finance", "Finanzas", "Finanza", "Finanças", "Финансы", "Finans", "المالية", "재무", "Finanse", "Фінанси", "वित्त", "Keuangan", "Tài chính"]),
  projects: zip(["Projekte", "پروژه‌ها", "项目", "專案", "プロジェクト", "Projecten", "Projets", "Proyectos", "Progetti", "Projetos", "Проекты", "Projeler", "المشاريع", "프로젝트", "Projekty", "Проєкти", "प्रोजेक्ट", "Proyek", "Dự án"]),
  clients: zip(["Kunden", "مشتریان", "客户", "客戶", "顧客", "Klanten", "Clients", "Clientes", "Clienti", "Clientes", "Клиенты", "Müşteriler", "العملاء", "고객", "Klienci", "Клієнти", "ग्राहक", "Pelanggan", "Khách hàng"]),
  proposals: zip(["Angebote", "پیشنهادها", "方案", "提案", "提案", "Offertes", "Propositions", "Propuestas", "Proposte", "Propostas", "Предложения", "Teklifler", "العروض", "제안서", "Oferty", "Пропозиції", "प्रस्ताव", "Proposal", "Đề xuất"]),
  time_tracking: zip(["Zeiterfassung", "ثبت زمان", "工时跟踪", "工時追蹤", "工数管理", "Tijdregistratie", "Suivi du temps", "Control horario", "Timesheet", "Registo de tempo", "Учёт времени", "Zaman takibi", "تتبع الوقت", "시간 추적", "Ewidencja czasu", "Облік часу", "समय ट्रैकिंग", "Pelacakan waktu", "Chấm công"]),
  invoices: zip(["Rechnungen", "فاکتورها", "发票", "發票", "請求書", "Facturen", "Factures", "Facturas", "Fatture", "Faturas", "Счета", "Faturalar", "الفواتير", "청구서", "Faktury", "Рахунки", "चालान", "Faktur", "Hóa đơn"]),
  creator_studio: zip(["Creator Studio", "استودیو کریتور", "创作者工作室", "創作者工作室", "Creator Studio", "Creator Studio", "Creator Studio", "Creator Studio", "Creator Studio", "Creator Studio", "Creator Studio", "Creator Studio", "استوديو المنشئين", "크리에이터 스튜디오", "Creator Studio", "Creator Studio", "क्रिएटर स्टूडियो", "Creator Studio", "Creator Studio"]),
  brand_deals: zip(["Markenkooperationen", "توافق‌های برند", "品牌合作", "品牌合作", "ブランド案件", "Merkdeals", "Accords de marque", "Acuerdos de marca", "Deal di brand", "Acordos de marca", "Бренд-сделки", "Marka anlaşmaları", "صفقات العلامة", "브랜드 딜", "Umowy marki", "Угоди бренду", "ब्रांड डील", "Kesepakatan merek", "Thỏa thuận thương hiệu"]),
  content_calendar: zip(["Content-Kalender", "تقویم محتوا", "内容日历", "內容日曆", "コンテンツカレンダー", "Contentkalender", "Calendrier éditorial", "Calendario de contenidos", "Calendario contenuti", "Calendário de conteúdos", "Контент-календарь", "İçerik takvimi", "تقويم المحتوى", "콘텐츠 캘린더", "Kalendarz treści", "Календар контенту", "कंटेंट कैलेंडर", "Kalender konten", "Lịch nội dung"]),
  sponsorships: zip(["Sponsorings", "اسپانسرشیپ‌ها", "赞助", "贊助", "スポンサーシップ", "Sponsoring", "Sponsoring", "Patrocinios", "Sponsorship", "Patrocínios", "Спонсорства", "Sponsorluklar", "الرعايات", "스폰서십", "Sponsoringi", "Спонсорства", "स्पॉन्सरशिप", "Sponsorship", "Tài trợ"]),
  audience_insights: zip(["Zielgruppen-Insights", "بینش مخاطب", "受众洞察", "受眾洞察", "オーディエンス分析", "Doelgroepinzichten", "Insights audience", "Insights de audiencia", "Insight audience", "Insights de audiência", "Инсайты аудитории", "Kitle içgörüleri", "رؤى الجمهور", "오디언스 인사이트", "Wnioski o odbiorcach", "Інсайти аудиторії", "ऑडियंस इनसाइट", "Wawasan audiens", "Thấu hiểu khán giả"]),
  campaigns: zip(["Kampagnen", "کمپین‌ها", "活动", "活動", "キャンペーン", "Campagnes", "Campagnes", "Campañas", "Campagne", "Campanhas", "Кампании", "Kampanyalar", "الحملات", "캠페인", "Kampanie", "Кампанії", "अभियान", "Kampanye", "Chiến dịch"]),
  client_portals: zip(["Kundenportale", "پورتال مشتریان", "客户门户", "客戶入口", "顧客ポータル", "Klantportalen", "Portails clients", "Portales de clientes", "Portali clienti", "Portais de clientes", "Клиентские порталы", "Müşteri portalları", "بوابات العملاء", "고객 포털", "Portale klientów", "Клієнтські портали", "ग्राहक पोर्टल", "Portal pelanggan", "Cổng khách hàng"]),
  retainers: zip(["Retainer", "قرارداد نگهداشت", "顾问合同", "顧問合約", "リテイナー", "Retainers", "Retainers", "Retainers", "Retainer", "Retainers", "Ретейнеры", "Retainer", "عقود الاحتفاظ", "리테이너", "Retainery", "Ретейнери", "रिटेनर", "Retainer", "Retainer"]),
  campaign_ops: zip(["Kampagnenbetrieb", "عملیات کمپین", "活动运营", "活動營運", "キャンペーン運用", "Campagne-operaties", "Ops campagnes", "Ops de campañas", "Ops campagne", "Ops de campanhas", "Операции кампаний", "Kampanya operasyonları", "تشغيل الحملات", "캠페인 운영", "Operacje kampanii", "Операції кампаній", "कैंपेन ऑप्स", "Operasi kampanye", "Vận hành chiến dịch"]),
  inventory: zip(["Bestand", "موجودی", "库存", "庫存", "在庫", "Voorraad", "Stocks", "Inventario", "Inventario", "Inventário", "Склад", "Stok", "المخزون", "재고", "Magazyn", "Запаси", "इन्वेंटरी", "Inventaris", "Tồn kho"]),
  loyalty: zip(["Treue", "وفاداری", "忠诚度", "忠誠度", "ロイヤルティ", "Loyaliteit", "Fidélité", "Fidelización", "Loyalty", "Fidelização", "Лояльность", "Sadakat", "الولاء", "로열티", "Lojalność", "Лояльність", "लॉयल्टी", "Loyalitas", "Khách thân thiết"]),
  reservations: zip(["Reservierungen", "رزروها", "预订", "訂位", "予約", "Reserveringen", "Réservations", "Reservas", "Prenotazioni", "Reservas", "Бронирования", "Rezervasyonlar", "الحجوزات", "예약", "Rezerwacje", "Бронювання", "आरक्षण", "Reservasi", "Đặt chỗ"]),
  menu: zip(["Speisekarte", "منو", "菜单", "菜單", "メニュー", "Menu", "Carte", "Carta", "Menu", "Ementa", "Меню", "Menü", "قائمة الطعام", "메뉴", "Menu", "Меню", "मेनू", "Menu", "Thực đơn"]),
  kitchen_display: zip(["Küchenanzeige", "نمایشگر آشپزخانه", "厨房显示", "廚房顯示", "キッチンディスプレイ", "Keukendisplay", "Affichage cuisine", "Pantalla de cocina", "Display cucina", "Ecrã de cozinha", "Кухонный дисплей", "Mutfak ekranı", "شاشة المطبخ", "주방 디스플레이", "Wyświetlacz kuchni", "Кухонний дисплей", "किचन डिस्प्ले", "Tampilan dapur", "Màn hình bếp"]),
  housekeeping: zip(["Housekeeping", "خانه‌داری", "客房服务", "房務", "ハウスキーピング", "Housekeeping", "Housekeeping", "Housekeeping", "Housekeeping", "Housekeeping", "Хаускипинг", "Kat hizmetleri", "التدبير المنزلي", "하우스키핑", "Housekeeping", "Хаускіпінг", "हाउसकीपिंग", "Housekeeping", "Buồng phòng"]),
  guest_crm: zip(["Gäste-CRM", "CRM مهمان", "宾客 CRM", "賓客 CRM", "ゲストCRM", "Gasten-CRM", "CRM invités", "CRM de huéspedes", "CRM ospiti", "CRM de hóspedes", "CRM гостей", "Misafir CRM", "CRM الضيوف", "게스트 CRM", "CRM gości", "CRM гостей", "गेस्ट CRM", "CRM tamu", "CRM khách"]),
  tickets: zip(["Tickets", "بلیت‌ها", "工单", "工單", "チケット", "Tickets", "Tickets", "Tickets", "Ticket", "Tickets", "Заявки", "Biletler", "التذاكر", "티켓", "Zgłoszenia", "Заявки", "टिकट", "Tiket", "Phiếu"]),
  routes: zip(["Routen", "مسیرها", "路线", "路線", "ルート", "Routes", "Itinéraires", "Rutas", "Percorsi", "Rotas", "Маршруты", "Güzergâhlar", "المسارات", "경로", "Trasy", "Маршрути", "रूट", "Rute", "Tuyến"]),
  delivery_notes: zip(["Lieferscheine", "برگه‌های تحویل", "送货单", "送貨單", "納品書", "Leveringsbonnen", "Bons de livraison", "Albaranes", "Bolle di consegna", "Guias de remessa", "Накладные", "İrsaliyeler", "أذون التسليم", "납품서", "Listy przewozowe", "Накладні", "डिलीवरी नोट", "Surat jalan", "Phiếu giao hàng"]),
  patients: zip(["Patienten", "بیماران", "患者", "病人", "患者", "Patiënten", "Patients", "Pacientes", "Pazienti", "Utentes", "Пациенты", "Hastalar", "المرضى", "환자", "Pacjenci", "Пацієнти", "मरीज", "Pasien", "Bệnh nhân"]),
  appointments: zip(["Termine", "نوبت‌ها", "预约", "預約", "予約", "Afspraken", "Rendez-vous", "Citas", "Appuntamenti", "Consultas", "Приёмы", "Randevular", "المواعيد", "예약", "Wizyty", "Прийоми", "अपॉइंटमेंट", "Janji", "Lịch hẹn"]),
  compliance: zip(["Compliance", "انطباق", "合规", "合規", "コンプライアンス", "Compliance", "Conformité", "Cumplimiento", "Conformità", "Conformidade", "Соответствие", "Uyum", "الامتثال", "컴플라이언스", "Zgodność", "Відповідність", "अनुपालन", "Kepatuhan", "Tuân thủ"]),
  matters: zip(["Mandate", "پرونده‌ها", "案件", "案件", "案件", "Zaken", "Dossiers", "Asuntos", "Pratiche", "Processos", "Дела", "Dosyalar", "القضايا", "사건", "Sprawy", "Справи", "मामले", "Perkara", "Vụ việc"]),
  billing: zip(["Abrechnung", "صورتحساب", "账单", "帳單", "請求", "Facturatie", "Facturation", "Facturación", "Fatturazione", "Faturação", "Биллинг", "Faturalama", "الفوترة", "청구", "Rozliczenia", "Білінг", "बिलिंग", "Penagihan", "Thanh toán"]),
  documents: zip(["Dokumente", "اسناد", "文档", "文件", "文書", "Documenten", "Documents", "Documentos", "Documenti", "Documentos", "Документы", "Belgeler", "المستندات", "문서", "Dokumenty", "Документи", "दस्तावेज़", "Dokumen", "Tài liệu"]),
  client_books: zip(["Mandantenbücher", "دفتر مشتریان", "客户账簿", "客戶帳簿", "顧客帳簿", "Klantdossiers", "Livres clients", "Libros de clientes", "Libri clienti", "Livros de clientes", "Клиентские книги", "Müşteri defterleri", "دفاتر العملاء", "고객 장부", "Księgi klientów", "Клієнтські книги", "ग्राहक बही", "Buku klien", "Sổ khách"]),
  tax_deadlines: zip(["Steuerfristen", "مهلت مالیاتی", "报税截止", "報稅截止", "税務期限", "Belastingdeadlines", "Échéances fiscales", "Plazos fiscales", "Scadenze fiscali", "Prazos fiscais", "Налоговые сроки", "Vergi vadeleri", "مواعيد ضريبية", "세무 기한", "Terminy podatkowe", "Податкові дедлайни", "कर समयसीमा", "Tenggat pajak", "Hạn thuế"]),
  sites: zip(["Baustellen", "سایت‌ها", "工地", "工地", "現場", "Locaties", "Chantiers", "Obras", "Cantieri", "Estaleiros", "Площадки", "Şantiyeler", "المواقع", "현장", "Place budowy", "Майданчики", "साइट", "Lokasi", "Công trường"]),
  crews: zip(["Teams", "گروه‌ها", "班组", "班組", "班", "Ploegen", "Équipes", "Cuadrillas", "Squadre", "Equipas", "Бригады", "Ekipler", "الفرق", "팀", "Ekipy", "Бригади", "क्रू", "Kru", "Tổ đội"]),
  progress_billing: zip(["Fortschrittsabrechnung", "صورت‌وضعیت پیشرفت", "进度结算", "進度請款", "出来高請求", "Voortgangsfacturatie", "Facturation d’avancement", "Facturación de avance", "Fatturazione avanzamento", "Faturação de progresso", "Прогресс-биллинг", "Hakediş", "الفوترة حسب التقدم", "기성 청구", "Rozliczanie postępu", "Білінг прогресу", "प्रोग्रेस बिलिंग", "Penagihan progres", "Thanh toán tiến độ"]),
  listings: zip(["Inserate", "آگهی‌ها", "房源", "物件", "物件", "Listings", "Annonces", "Listados", "Annunci", "Listagens", "Объявления", "İlanlar", "القوائم", "매물", "Oferty", "Оголошення", "लिस्टिंग", "Listing", "Tin đăng"]),
  viewings: zip(["Besichtigungen", "بازدیدها", "看房", "看屋", "内見", "Bezichtigingen", "Visites", "Visitas", "Visite", "Visitas", "Показы", "Geziler", "المعاينات", "방문", "Oględziny", "Покази", "विजिटिंग", "Viewing", "Xem nhà"]),
  closings: zip(["Abschlüsse", "قراردادها", "成交", "成交", "成約", "Afrondingen", "Clôtures", "Cierres", "Chiusure", "Fechos", "Сделки", "Kapanışlar", "الإغلاق", "마감", "Zamknięcia", "Закриття", "क्लोजिंग", "Closing", "Chốt giao dịch"]),
  students: zip(["Studierende", "دانشجویان", "学生", "學生", "学生", "Studenten", "Étudiants", "Estudiantes", "Studenti", "Estudantes", "Студенты", "Öğrenciler", "الطلاب", "학생", "Studenci", "Студенти", "छात्र", "Mahasiswa", "Học viên"]),
  courses: zip(["Kurse", "دوره‌ها", "课程", "課程", "コース", "Cursussen", "Cours", "Cursos", "Corsi", "Cursos", "Курсы", "Kurslar", "الدورات", "과정", "Kursy", "Курси", "पाठ्यक्रम", "Kursus", "Khóa học"]),
  enrollment: zip(["Einschreibung", "ثبت‌نام", "招生", "註冊", "入学", "Inschrijving", "Inscription", "Inscripción", "Iscrizione", "Inscrição", "Зачисление", "Kayıt", "التسجيل", "등록", "Rekrutacja", "Зарахування", "नामांकन", "Pendaftaran", "Ghi danh"]),
  production: zip(["Fertigung", "تولید", "生产", "生產", "生産", "Productie", "Production", "Producción", "Produzione", "Produção", "Производство", "Üretim", "الإنتاج", "생산", "Produkcja", "Виробництво", "उत्पादन", "Produksi", "Sản xuất"]),
  fleet: zip(["Flotte", "ناوگان", "车队", "車隊", "車両", "Vloot", "Flotte", "Flota", "Flotta", "Frota", "Автопарк", "Filo", "الأسطول", "차량", "Flota", "Автопарк", "फ्लीट", "Armada", "Đội xe"]),
  tracking: zip(["Sendungsverfolgung", "ردیابی", "追踪", "追蹤", "追跡", "Tracking", "Suivi", "Seguimiento", "Tracking", "Tracking", "Отслеживание", "İzleme", "التتبع", "추적", "Śledzenie", "Відстеження", "ट्रैकिंग", "Pelacakan", "Theo dõi"]),
  catalog: zip(["Katalog", "کاتالوگ", "目录", "目錄", "カタログ", "Catalogus", "Catalogue", "Catálogo", "Catalogo", "Catálogo", "Каталог", "Katalog", "الكتالوج", "카탈로그", "Katalog", "Каталог", "कैटलॉग", "Katalog", "Danh mục"]),
  orders: zip(["Aufträge", "سفارش‌ها", "订单", "訂單", "受注", "Orders", "Commandes", "Pedidos", "Ordini", "Encomendas", "Заказы", "Siparişler", "الطلبات", "주문", "Zamówienia", "Замовлення", "ऑर्डर", "Pesanan", "Đơn hàng"]),
  fulfillment: zip(["Fulfillment", "تکمیل سفارش", "履约", "履約", "フルフィルメント", "Fulfillment", "Exécution", "Cumplimiento", "Fulfillment", "Fulfillment", "Фулфилмент", "Karşılama", "التنفيذ", "풀필먼트", "Realizacja", "Фулфілмент", "फुलफिलमेंट", "Pemenuhan", "Hoàn tất đơn"]),
};

const ACCENTS = {
  cyan: zip(["Cyan", "فیروزه‌ای", "青色", "青色", "シアン", "Cyaan", "Cyan", "Cian", "Ciano", "Ciano", "Голубой", "Camgöbeği", "سماوي", "시안", "Cyjan", "Блакитний", "सियान", "Cyan", "Xanh cyan"]),
  blue: zip(["Blau", "آبی", "蓝色", "藍色", "青", "Blauw", "Bleu", "Azul", "Blu", "Azul", "Синий", "Mavi", "أزرق", "파랑", "Niebieski", "Синій", "नीला", "Biru", "Xanh dương"]),
  emerald: zip(["Smaragd", "زمردی", "翠绿", "翠綠", "エメラルド", "Smaragd", "Émeraude", "Esmeralda", "Smeraldo", "Esmeralda", "Изумрудный", "Zümrüt", "زمردي", "에메랄드", "Szmaragdowy", "Смарагдовий", "एमराल्ड", "Zamrud", "Lục bảo"]),
  violet: zip(["Violett", "بنفش", "紫色", "紫色", "バイオレット", "Violet", "Violet", "Violeta", "Violetto", "Violeta", "Фиолетовый", "Menekşe", "بنفسجي", "바이올렛", "Fioletowy", "Фіолетовий", "वायलेट", "Ungu", "Tím"]),
  amber: zip(["Bernstein", "کهربایی", "琥珀色", "琥珀色", "アンバー", "Amber", "Ambre", "Ámbar", "Ambra", "Âmbar", "Янтарный", "Kehribar", "كهرماني", "앰버", "Bursztynowy", "Бурштиновий", "अंबर", "Amber", "Hổ phách"]),
};

const ASSISTANT_SCORE = {
  healthy: zip(["Gesund", "سالم", "健康", "健康", "健全", "Gezond", "Sain", "Correcto", "Integro", "Saudável", "В норме", "Sağlıklı", "سليم", "양호", "Zdrowy", "Здоровий", "स्वस्थ", "Sehat", "Ổn định"]),
  needsAttention: zip(["Handlungsbedarf", "نیاز به توجه", "需要关注", "需要關注", "要確認", "Aandacht nodig", "À surveiller", "Requiere atención", "Da controllare", "Precisa de atenção", "Требует внимания", "İlgi gerekli", "يحتاج انتباهاً", "주의 필요", "Wymaga uwagi", "Потребує уваги", "ध्यान चाहिए", "Perlu perhatian", "Cần chú ý"]),
  atRisk: zip(["Gefährdet", "در معرض خطر", "存在风险", "存在風險", "リスクあり", "Risico", "À risque", "En riesgo", "A rischio", "Em risco", "Под угрозой", "Risk altında", "معرّض للخطر", "위험", "Zagrożony", "Під ризиком", "जोखिम में", "Berisiko", "Có rủi ro"]),
};

const ASSISTANT_KINDS = {
  missing_approval: zip(["Freigabe", "تأیید", "审批", "核准", "承認", "Goedkeuring", "Approbation", "Aprobación", "Approvazione", "Aprovação", "Согласование", "Onay", "اعتماد", "승인", "Zatwierdzenie", "Затвердження", "अनुमोदन", "Persetujuan", "Phê duyệt"]),
  possible_delay: zip(["Verzögerung", "تأخیر", "延迟", "延遲", "遅延", "Vertraging", "Délai", "Retraso", "Ritardo", "Atraso", "Задержка", "Gecikme", "تأخير", "지연", "Opóźnienie", "Затримка", "विलंब", "Penundaan", "Trễ"]),
  unused_trigger: zip(["Auslöser", "محرک", "触发器", "觸發", "トリガー", "Trigger", "Déclencheur", "Disparador", "Trigger", "Gatilho", "Триггер", "Tetikleyici", "مشغّل", "트리거", "Wyzwalacz", "Тригер", "ट्रिगर", "Pemicu", "Trigger"]),
  duplicate_nodes: zip(["Duplikate", "تکراری", "重复", "重複", "重複", "Duplicaten", "Doublons", "Duplicados", "Duplicati", "Duplicados", "Дубликаты", "Yinelenenler", "مكررات", "중복", "Duplikaty", "Дублікати", "डुप्लिकेट", "Duplikat", "Trùng"]),
  unused_action: zip(["Aktion", "اقدام", "操作", "動作", "アクション", "Actie", "Action", "Acción", "Azione", "Ação", "Действие", "Eylem", "إجراء", "작업", "Akcja", "Дія", "कार्रवाई", "Tindakan", "Hành động"]),
  security: zip(["Sicherheit", "امنیت", "安全", "安全性", "セキュリティ", "Beveiliging", "Sécurité", "Seguridad", "Sicurezza", "Segurança", "Безопасность", "Güvenlik", "الأمان", "보안", "Bezpieczeństwo", "Безпека", "सुरक्षा", "Keamanan", "Bảo mật"]),
  performance: zip(["Leistung", "عملکرد", "性能", "效能", "パフォーマンス", "Prestaties", "Performance", "Rendimiento", "Prestazioni", "Desempenho", "Производительность", "Performans", "الأداء", "성능", "Wydajność", "Продуктивність", "प्रदर्शन", "Performa", "Hiệu năng"]),
};

const ASSISTANT_SUG = {
  "missing_approval.title": zip(["Fehlende Freigabe", "تأیید وجود ندارد", "缺少审批", "缺少核准", "承認がありません", "Ontbrekende goedkeuring", "Approbation manquante", "Falta aprobación", "Approvazione mancante", "Aprovação em falta", "Нет согласования", "Eksik onay", "اعتماد مفقود", "승인 없음", "Brak zatwierdzenia", "Немає затвердження", "अनुमोदन गायब", "Persetujuan hilang", "Thiếu phê duyệt"]),
  "missing_approval.description": zip(["Längere Abläufe profitieren oft von einer Freigabe vor Seiteneffekten.", "جریان‌های طولانی معمولاً قبل از اثر جانبی به دروازه تأیید نیاز دارند.", "较长流程通常应在产生副作用前加入审批关卡。", "較長流程通常應在產生副作用前加入核准關卡。", "長いフローは副作用の前に承認ゲートがあると安全です。", "Langere flows hebben vaak een goedkeuringspoort vóór neveneffecten.", "Les flux longs bénéficient souvent d’une validation avant les effets de bord.", "Los flujos largos suelen beneficiarse de una aprobación antes de efectos secundarios.", "I flussi più lunghi spesso richiedono un gate di approvazione prima degli effetti collaterali.", "Fluxos longos costumam beneficiar de uma aprovação antes de efeitos colaterais.", "Длинным сценариям часто нужна проверка перед побочными эффектами.", "Uzun akışlar yan etkilerden önce onay kapısından yararlanır.", "غالباً ما تستفيد التدفقات الأطول من بوابة اعتماد قبل الآثار الجانبية.", "긴 흐름은 부작용 전에 승인 게이트가 있는 편이 안전합니다.", "Dłuższe przepływy często wymagają bramki zatwierdzenia przed skutkami ubocznymi.", "Довгі потоки часто потребують шлюзу затвердження перед побічними ефектами.", "लंबे फ्लो में साइड इफेक्ट से पहले अनुमोदन गेट मददगार होता है।", "Alur yang lebih panjang sering butuh gerbang persetujuan sebelum efek samping.", "Luồng dài thường nên có cổng phê duyệt trước tác dụng phụ."]),
  "possible_delay.title": zip(["Mögliche Verzögerung", "تأخیر محتمل", "可能需要延迟", "可能需要延遲", "遅延の検討", "Mogelijke vertraging", "Délai possible", "Posible retraso", "Possibile ritardo", "Possível atraso", "Возможна задержка", "Olası gecikme", "تأخير محتمل", "지연 가능", "Możliwe opóźnienie", "Можлива затримка", "संभावित विलंब", "Kemungkinan penundaan", "Có thể cần trễ"]),
  "possible_delay.description": zip(["Erwägen Sie eine Verzögerung vor Erinnerungs-E-Mails, um Lastspitzen zu vermeiden.", "برای جلوگیری از انفجار اعلان، قبل از ایمیل یادآوری تأخیر بگذارید.", "可在提醒邮件前加入延迟，避免突发打扰。", "可在提醒郵件前加入延遲，避免突發打擾。", "リマインドメールの前に遅延を入れ、バーストを避けてください。", "Overweeg een vertraging vóór herinneringsmails om pieken te voorkomen.", "Envisagez un délai avant les e-mails de relance pour éviter les rafales.", "Considere un retraso antes de los recordatorios para evitar ráfagas.", "Valuta un ritardo prima delle e-mail di reminder per evitare burst.", "Considere um atraso antes dos e-mails de lembrete para evitar picos.", "Добавьте паузу перед напоминаниями, чтобы не слать пачками.", "Gürültülü patlamaları önlemek için hatırlatma e-postalarından önce gecikme ekleyin.", "فكّر في تأخير قبل رسائل التذكير لتجنب الاندفاعات.", "알림 메일 전에 지연을 두어 폭주를 피하세요.", "Rozważ opóźnienie przed mailami przypominającymi, by uniknąć serii.", "Додайте паузу перед нагадуваннями, щоб уникнути сплесків.", "रिमाइंडर ईमेल से पहले देरी डालें ताकि शोर न बढ़े।", "Pertimbangkan jeda sebelum email pengingat agar tidak beruntun.", "Cân nhắc độ trễ trước email nhắc để tránh bùng phát."]),
  "unused_trigger.title": zip(["Unbenutzter Auslöser", "محرک استفاده‌نشده", "未使用的触发器", "未使用的觸發", "未使用のトリガー", "Ongebruikte trigger", "Déclencheur inutilisé", "Disparador sin uso", "Trigger inutilizzato", "Gatilho não usado", "Неиспользуемый триггер", "Kullanılmayan tetikleyici", "مشغّل غير مستخدم", "미사용 트리거", "Nieuwżyty wyzwalacz", "Невикористаний тригер", "अप्रयुक्त ट्रिगर", "Pemicu tidak terpakai", "Trigger chưa dùng"]),
  "unused_trigger.description": zip(["Dieser Graph hat keinen Startauslöser — fügen Sie einen vor der Aktivierung hinzu.", "این گراف محرک شروع ندارد — قبل از فعال‌سازی یکی اضافه کنید.", "此图没有起始触发器 — 激活前请添加一个。", "此圖沒有起始觸發 — 啟用前請新增一個。", "開始トリガーがありません。有効化前に追加してください。", "Deze grafiek heeft geen starttrigger — voeg er een toe vóór activering.", "Ce graphe n’a pas de déclencheur de départ — ajoutez-en un avant activation.", "Este grafo no tiene disparador inicial: añade uno antes de activar.", "Questo grafo non ha un trigger di avvio: aggiungine uno prima dell’attivazione.", "Este grafo não tem gatilho inicial — adicione um antes de ativar.", "В графе нет стартового триггера — добавьте его перед активацией.", "Bu grafikte başlangıç tetikleyicisi yok — etkinleştirmeden önce ekleyin.", "لا يوجد مشغّل بدء في هذا المخطط — أضفه قبل التفعيل.", "시작 트리거가 없습니다. 활성화 전에 추가하세요.", "Ten graf nie ma wyzwalacza startu — dodaj go przed aktywacją.", "У цьому графі немає стартового тригера — додайте його перед активацією.", "इस ग्राफ़ में स्टार्ट ट्रिगर नहीं है — सक्रिय करने से पहले जोड़ें।", "Graf ini tidak punya pemicu awal — tambahkan sebelum aktivasi.", "Đồ thị này không có trigger bắt đầu — thêm trước khi kích hoạt."]),
  "duplicate_nodes.title": zip(["Doppelte Knoten", "گره تکراری", "重复节点", "重複節點", "重複ノード", "Dubbele knopen", "Nœuds en double", "Nodos duplicados", "Nodi duplicati", "Nós duplicados", "Повторяющиеся узлы", "Yinelenen düğümler", "عقد مكررة", "중복 노드", "Zduplikowane węzły", "Дубльовані вузли", "डुप्लिकेट नोड", "Node duplikat", "Nút trùng"]),
  "duplicate_nodes.description": zip(["„{label}“ kommt {count}-mal vor — konsolidieren Sie, falls überflüssig.", "«{label}» {count} بار آمده — در صورت تکراری بودن ادغام کنید.", "“{label}” 出现 {count} 次 — 如多余请合并。", "「{label}」出現 {count} 次 — 若多餘請合併。", "「{label}」が{count}回あります。不要なら統合してください。", "“{label}” komt {count} keer voor — consolideer indien overbodig.", "« {label} » apparaît {count} fois — fusionnez si redondant.", "“{label}” aparece {count} veces: consolida si es redundante.", "“{label}” compare {count} volte: consolida se è ridondante.", "“{label}” aparece {count} vezes — consolide se for redundante.", "«{label}» встречается {count} раз — объедините, если лишнее.", "“{label}” {count} kez geçiyor — gereksizse birleştirin.", "يظهر «{label}» {count} مرات — ادمجه إن كان زائدًا.", "“{label}”이(가) {count}번 나타납니다. 중복이면 합치세요.", "„{label}” występuje {count} razy — scal, jeśli zbędne.", "«{label}» трапляється {count} разів — об’єднайте, якщо зайве.", "“{label}” {count} बार आता है — यदि दोहरा हो तो मिलाएं।", "“{label}” muncul {count} kali — gabungkan jika berlebih.", "“{label}” xuất hiện {count} lần — gộp nếu thừa."]),
  "unused_action.title": zip(["Unbenutzte Aktion", "اقدام استفاده‌نشده", "未使用的操作", "未使用的動作", "未使用のアクション", "Ongebruikte actie", "Action inutilisée", "Acción sin uso", "Azione inutilizzata", "Ação não usada", "Неиспользуемое действие", "Kullanılmayan eylem", "إجراء غير مستخدم", "미사용 작업", "Nieuwżyta akcja", "Невикористана дія", "अप्रयुक्त कार्रवाई", "Tindakan tidak terpakai", "Hành động chưa dùng"]),
  "unused_action.description": zip(["{label} ist nicht verbunden — verdrahten oder entfernen.", "{label} متصل نیست — وصل یا حذف کنید.", "{label} 未连接 — 请连线或删除。", "{label} 未連接 — 請連線或刪除。", "{label}は未接続です。配線するか削除してください。", "{label} is niet verbonden — koppel of verwijder.", "{label} n’est pas connecté — reliez-le ou retirez-le.", "{label} no está conectado: conéctalo o elimínalo.", "{label} non è collegato: collegalo o rimuovilo.", "{label} não está ligado — ligue ou remova.", "{label} не подключён — соедините или удалите.", "{label} bağlı değil — bağlayın veya kaldırın.", "{label} غير متصل — وصّله أو احذفه.", "{label}이(가) 연결되지 않았습니다. 연결하거나 제거하세요.", "{label} nie jest połączony — podepnij lub usuń.", "{label} не підключено — з’єднайте або видаліть.", "{label} जुड़ा नहीं है — जोड़ें या हटाएं।", "{label} tidak terhubung — sambungkan atau hapus.", "{label} chưa kết nối — nối hoặc xóa."]),
  "security.title": zip(["Sicherheitsempfehlung", "توصیه امنیتی", "安全建议", "安全性建議", "セキュリティの推奨", "Beveiligingsadvies", "Recommandation de sécurité", "Recomendación de seguridad", "Raccomandazione di sicurezza", "Recomendação de segurança", "Рекомендация по безопасности", "Güvenlik önerisi", "توصية أمنية", "보안 권장", "Zalecenie bezpieczeństwa", "Рекомендація з безпеки", "सुरक्षा सुझाव", "Rekomendasi keamanan", "Khuyến nghị bảo mật"]),
  "security.description": zip(["Nutzen Sie Adapter mit geringsten Rechten für Webhook- und E-Mail-Aktionen.", "برای وب‌هوک و ایمیل از آداپتور با کمترین دسترسی استفاده کنید.", "Webhook 和邮件操作请使用最小权限适配器。", "Webhook 與郵件操作請使用最小權限轉接器。", "Webhookとメール操作には最小権限のアダプターを使ってください。", "Gebruik adapters met minste rechten voor webhook- en e-mailacties.", "Préférez des adaptateurs au moindre privilège pour les webhooks et e-mails.", "Prefiere adaptadores de mínimo privilegio para webhooks y correo.", "Preferisci adapter a privilegio minimo per webhook ed e-mail.", "Prefira adaptadores de menor privilégio para webhooks e e-mail.", "Для вебхуков и почты используйте адаптеры с минимальными правами.", "Webhook ve e-posta eylemleri için en az yetkili bağdaştırıcıları tercih edin.", "فضّل محولات بأقل صلاحيات لإجراءات الويب هوك والبريد.", "웹훅과 이메일 작업에는 최소 권한 어댑터를 쓰세요.", "Do webhooków i e-maili używaj adapterów o najmniejszych uprawnieniach.", "Для вебхуків і пошти обирайте адаптери з найменшими правами.", "वेबहुक और ईमेल क्रियाओं के लिए न्यूनतम अधिकार वाले एडाप्टर चुनें।", "Untuk webhook dan email, pilih adapter dengan hak paling kecil.", "Ưu tiên adapter quyền tối thiểu cho webhook và email."]),
  "performance.title": zip(["Leistungsempfehlung", "توصیه عملکرد", "性能建议", "效能建議", "パフォーマンスの推奨", "Prestatieadvies", "Recommandation de performance", "Recomendación de rendimiento", "Raccomandazione di prestazione", "Recomendação de desempenho", "Рекомендация по производительности", "Performans önerisi", "توصية أداء", "성능 권장", "Zalecenie wydajności", "Рекомендація щодо продуктивності", "प्रदर्शन सुझाव", "Rekomendasi performa", "Khuyến nghị hiệu năng"]),
  "performance.description": zip(["Bündeln Sie KI-Schritte, wo möglich, um die mittlere Laufzeit zu senken.", "گام‌های هوش مصنوعی را در صورت امکان دسته‌بندی کنید تا زمان اجرا کم شود.", "尽可能批量处理 AI 步骤以缩短平均执行时间。", "盡可能批次處理 AI 步驟以縮短平均執行時間。", "可能ならAIステップをまとめて平均実行時間を下げてください。", "Bundel AI-stappen waar mogelijk om de gemiddelde looptijd te verlagen.", "Regroupez les étapes IA si possible pour réduire le temps d’exécution moyen.", "Agrupa pasos de IA cuando sea posible para reducir el tiempo medio.", "Raggruppa i passaggi IA dove possibile per ridurre il tempo medio.", "Agrupe passos de IA sempre que possível para reduzir o tempo médio.", "Объединяйте шаги ИИ, где можно, чтобы сократить среднее время.", "Ortalama süreyi düşürmek için mümkünse AI adımlarını gruplayın.", "جمّع خطوات الذكاء الاصطناعي حيث أمكن لتقليل متوسط زمن التنفيذ.", "가능하면 AI 단계를 묶어 평균 실행 시간을 줄이세요.", "Grupuj kroki AI tam, gdzie to możliwe, by skrócić średni czas.", "Об’єднуйте кроки ШІ, де можна, щоб зменшити середній час.", "संभव हो तो AI चरणों को बैच करें ताकि औसत समय घटे।", "Jika mungkin, gabungkan langkah AI agar waktu rata-rata turun.", "Gom bước AI khi có thể để giảm thời gian trung bình."]),
};

function buildNewKeyMap(locale) {
  const map = {};
  const pick = (locMap) => locMap[locale] ?? locMap[PARENT[locale]] ?? locMap.de;
  for (const [id, locMap] of Object.entries(INDUSTRY_LABELS)) {
    map[`crm.industry.catalog.${id}.label`] = pick(locMap);
  }
  for (const [id, locMap] of Object.entries(INDUSTRY_DESC)) {
    map[`crm.industry.catalog.${id}.description`] = pick(locMap);
  }
  for (const [id, locMap] of Object.entries(MODULE_LABELS)) {
    map[`crm.industry.modules.${id}`] = pick(locMap);
  }
  for (const id of KEEP_MODULE) {
    map[`crm.industry.modules.${id}`] = id === "crm" ? "CRM" : id.toUpperCase();
  }
  map["crm.industry.modules.crm"] = "CRM";
  map["crm.industry.modules.pos"] = "POS";
  map["crm.industry.modules.datev"] = "DATEV";
  map["crm.industry.modules.bom"] = "BOM";
  map["crm.industry.modules.qc"] = "QC";
  for (const [id, locMap] of Object.entries(ACCENTS)) {
    map[`settings.appearance.accents.${id}`] = pick(locMap);
  }
  for (const [id, locMap] of Object.entries(ASSISTANT_SCORE)) {
    map[`automation.assistant.score.${id}`] = pick(locMap);
  }
  for (const [id, locMap] of Object.entries(ASSISTANT_KINDS)) {
    map[`automation.assistant.kinds.${id}`] = pick(locMap);
  }
  for (const [id, locMap] of Object.entries(ASSISTANT_SUG)) {
    map[`automation.assistant.suggestions.${id}`] = pick(locMap);
  }
  map["automation.assistant.noticeDefault"] = pick(zip([
    "Ein-Klick-Optimierung ändert den Graphen noch nicht.",
    "بهینه‌سازی یک‌کلیکی هنوز گراف را تغییر نمی‌دهد.",
    "一键优化尚不会改动流程图。",
    "一鍵最佳化尚不會改動流程圖。",
    "ワンクリック最適化はまだグラフを変更しません。",
    "Een-klik-optimalisatie wijzigt de grafiek nog niet.",
    "L’optimisation en un clic ne modifie pas encore le graphe.",
    "La optimización en un clic aún no cambia el grafo.",
    "L’ottimizzazione in un clic non modifica ancora il grafo.",
    "A otimização num clique ainda não altera o grafo.",
    "Оптимизация в один клик пока не меняет граф.",
    "Tek tıkla optimize henüz grafiği değiştirmez.",
    "التحسين بنقرة واحدة لا يغيّر المخطط بعد.",
    "원클릭 최적화는 아직 그래프를 바꾸지 않습니다.",
    "Optymalizacja jednym kliknięciem nie zmienia jeszcze grafu.",
    "Оптимізація в один клік ще не змінює граф.",
    "एक-क्लिक ऑप्टिमाइज़ अभी ग्राफ़ नहीं बदलता।",
    "Optimasi satu klik belum mengubah graf.",
    "Tối ưu một cú nhấp chưa đổi đồ thị.",
  ]));
  map["automation.assistant.noticeQueued"] = pick(zip([
    "Optimierung vorgemerkt. Eine künftige Engine schreibt Verzögerungen und Freigaben um.",
    "بهینه‌سازی در صف است. موتور بعدی تأخیرها و تأییدها را بازنویسی می‌کند.",
    "已排队优化。后续引擎将改写延迟与审批。",
    "已排入最佳化。後續引擎將改寫延遲與核准。",
    "最適化をキューしました。将来のエンジンが遅延と承認を書き換えます。",
    "Optimalisatie in de wachtrij. Een toekomstige engine herschrijft vertragingen en goedkeuringen.",
    "Optimisation en file. Un futur moteur réécrira délais et validations.",
    "Optimización en cola. Un motor futuro reescribirá retrasos y aprobaciones.",
    "Ottimizzazione in coda. Un motore futuro riscriverà ritardi e approvazioni.",
    "Otimização em fila. Um motor futuro reescreverá atrasos e aprovações.",
    "Оптимизация в очереди. Будущий движок перепишет задержки и согласования.",
    "Optimizasyon kuyrukta. Gelecek motor gecikmeleri ve onayları yeniden yazar.",
    "التحسين في قائمة الانتظار. سيعيد محرك لاحق كتابة التأخيرات والاعتمادات.",
    "최적화가 대기열에 있습니다. 이후 엔진이 지연과 승인을 다시 씁니다.",
    "Optymalizacja w kolejce. Przyszły silnik przepisze opóźnienia i zatwierdzenia.",
    "Оптимізація в черзі. Майбутній рушій перепише затримки й затвердження.",
    "ऑप्टिमाइज़ कतार में है। भविष्य का इंजन देरी और अनुमोदन फिर लिखेगा।",
    "Optimasi mengantri. Mesin nanti akan menulis ulang jeda dan persetujuan.",
    "Tối ưu đã xếp hàng. Engine sau sẽ viết lại độ trễ và phê duyệt.",
  ]));
  map["settings.appearance.accentNotice"] = pick(zip([
    "Die Akzentfarbe wird für diese Sitzung gespeichert und ändert das gesperrte Farbsystem noch nicht.",
    "ترجیح رنگ تاکید برای این نشست ذخیره می‌شود و هنوز سامانه رنگ قفل‌شده را تغییر نمی‌دهد.",
    "强调色偏好会保存在本次会话中，尚不会改动锁定的色彩系统。",
    "強調色偏好會保存在此次工作階段，尚不會改動鎖定的色彩系統。",
    "アクセント設定はこのセッションに保存され、ロックされた配色はまだ変わりません。",
    "Accentvoorkeur wordt voor deze sessie bewaard en wijzigt het vergrendelde kleursysteem nog niet.",
    "La préférence d’accent est enregistrée pour cette session et ne modifie pas encore le système de couleurs verrouillé.",
    "La preferencia de acento se guarda en esta sesión y aún no cambia el sistema de color bloqueado.",
    "La preferenza di accento è salvata per questa sessione e non modifica ancora il sistema colori bloccato.",
    "A preferência de destaque é guardada nesta sessão e ainda não altera o sistema de cores bloqueado.",
    "Предпочтение акцента сохраняется в этой сессии и пока не меняет зафиксированную палитру.",
    "Vurgu rengi bu oturum için saklanır ve kilitli renk sistemini henüz değiştirmez.",
    "يُحفظ تفضيل لون التمييز لهذه الجلسة ولا يغيّر نظام الألوان المقفل بعد.",
    "액센트 설정은 이 세션에 저장되며 잠긴 색 체계는 아직 바꾸지 않습니다.",
    "Preferencja akcentu jest zapisywana w tej sesji i jeszcze nie zmienia zablokowanego systemu kolorów.",
    "Уподобання акценту зберігається в цій сесії й поки не змінює зафіксовану палітру.",
    "एक्सेंट वरीयता इस सत्र में सहेजी जाती है और लॉक रंग प्रणाली अभी नहीं बदलती।",
    "Preferensi aksen disimpan untuk sesi ini dan belum mengubah sistem warna yang dikunci.",
    "Tuỳ chọn màu nhấn được lưu cho phiên này và chưa đổi hệ màu đã khoá.",
  ]));
  map["settings.appearance.compactMode"] = pick(zip([
    "Kompaktmodus", "حالت فشرده", "紧凑模式", "緊湊模式", "コンパクトモード", "Compacte modus", "Mode compact", "Modo compacto", "Modalità compatta", "Modo compacto",
    "Компактный режим", "Kompakt mod", "وضع مدمج", "컴팩트 모드", "Tryb zwarty", "Компактний режим", "कॉम्पैक्ट मोड", "Mode ringkas", "Chế độ gọn",
  ]));
  return map;
}

function ptBrOverrides() {
  return {
    "common.save": "Salvar",
    "common.delete": "Excluir",
    "common.signIn": "Entrar",
    "common.signOut": "Sair",
    "auth.login.title": "Entrar",
    "auth.login.submit": "Entrar",
    "auth.login.loading": "Entrar",
    "auth.register.signIn": "Entrar",
    "navigation.search": "Pesquisar",
  };
}

let applied = 0;
for (const locale of LOCALES) {
  let trees = loadLocale(locale);
  for (const ns of NAMESPACES) trees[ns] = walkClean(trees[ns]);

  if (locale !== "de" && locale !== "de-BE") {
    const parent = PARENT[locale];
    const delivery =
      DELIVERY[locale] ?? DELIVERY[parent] ?? { singular: "delivery note", plural: "delivery notes" };
    for (const ns of NAMESPACES) {
      trees[ns] = replaceLieferschein(trees[ns], delivery.singular, delivery.plural);
    }
  }

  const qualityForLocale = {};
  for (const [key, locMap] of Object.entries(QUALITY)) {
    const value = locMap[locale] ?? locMap[PARENT[locale]];
    if (value) qualityForLocale[key] = value;
  }
  applyKeyMap(trees, qualityForLocale);

  if (locale === "fa") applyKeyMap(trees, FA_LEFTOVERS);
  applyKeyMap(trees, buildNewKeyMap(locale));
  if (locale === "pt-BR") applyKeyMap(trees, ptBrOverrides());

  writeLocale(locale, trees);
  applied += 1;
}

console.log(`Quality overlay applied to ${applied} locales.`);
