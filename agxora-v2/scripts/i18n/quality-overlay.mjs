/**
 * Curated RC-quality overlay for chrome, auth, dashboard, and leftover English.
 * Locale order for zip(): de, fa, zh-CN, zh-TW, ja, nl, fr, es, it, pt, ru, tr, ar, ko, pl, uk, hi, id, vi
 */
export const LOCALE_ORDER = [
  "de", "fa", "zh-CN", "zh-TW", "ja", "nl", "fr", "es", "it", "pt",
  "ru", "tr", "ar", "ko", "pl", "uk", "hi", "id", "vi",
];

export const PARENT = {
  "nl-BE": "nl",
  "fr-BE": "fr",
  "de-BE": "de",
  "pt-BR": "pt",
};

export function zip(values) {
  if (values.length !== LOCALE_ORDER.length) {
    throw new Error(`zip length ${values.length} != ${LOCALE_ORDER.length}`);
  }
  const out = {};
  LOCALE_ORDER.forEach((locale, i) => {
    out[locale] = values[i];
  });
  return out;
}

/** Chrome / auth / dashboard quality repairs (wrong MT + leftovers). */
export const QUALITY = {
  "navigation.menu": zip([
    "Menü", "منو", "菜单", "選單", "メニュー", "Menu", "Menu", "Menú", "Menu", "Menu",
    "Меню", "Menü", "القائمة", "메뉴", "Menu", "Меню", "मेनू", "Menu", "Menu",
  ]),
  "navigation.search": zip([
    "Suche", "جستجو", "搜索", "搜尋", "検索", "Zoeken", "Rechercher", "Buscar", "Cerca", "Pesquisar",
    "Поиск", "Ara", "بحث", "검색", "Szukaj", "Пошук", "खोजें", "Cari", "Tìm kiếm",
  ]),
  "navigation.profile": zip([
    "Profil", "پروفایل", "个人资料", "個人資料", "プロフィール", "Profiel", "Profil", "Perfil", "Profilo", "Perfil",
    "Профиль", "Profil", "الملف الشخصي", "프로필", "Profil", "Профіль", "प्रोफ़ाइल", "Profil", "Hồ sơ",
  ]),
  "navigation.security": zip([
    "Sicherheit", "امنیت", "安全", "安全性", "セキュリティ", "Beveiliging", "Sécurité", "Seguridad", "Sicurezza", "Segurança",
    "Безопасность", "Güvenlik", "الأمان", "보안", "Bezpieczeństwo", "Безпека", "सुरक्षा", "Keamanan", "Bảo mật",
  ]),
  "navigation.currentOrganization": zip([
    "Aktuelle Organisation", "سازمان فعلی", "当前组织", "目前組織", "現在の組織", "Huidige organisatie", "Organisation actuelle", "Organización actual", "Organizzazione attuale", "Organização atual",
    "Текущая организация", "Geçerli kuruluş", "المؤسسة الحالية", "현재 조직", "Bieżąca organizacja", "Поточна організація", "वर्तमान संगठन", "Organisasi saat ini", "Tổ chức hiện tại",
  ]),
  "navigation.noNotifications": zip([
    "Keine Benachrichtigungen", "اعلانی نیست", "暂无通知", "沒有通知", "通知はありません", "Geen meldingen", "Aucune notification", "Sin notificaciones", "Nessuna notifica", "Sem notificações",
    "Нет уведомлений", "Bildirim yok", "لا توجد إشعارات", "알림 없음", "Brak powiadomień", "Немає сповіщень", "कोई सूचना नहीं", "Tidak ada notifikasi", "Không có thông báo",
  ]),
  "navigation.notificationsEmpty": zip([
    "Alles erledigt. Hinweise und Erwähnungen erscheinen hier.",
    "همه چیز به‌روز است. هشدارها و اشاره‌ها اینجا نشان داده می‌شوند.",
    "全部已处理。提醒和提及会显示在这里。",
    "全部已處理。提醒與提及會顯示在這裡。",
    "すべて確認済みです。アラートとメンションはここに表示されます。",
    "Je bent bij. Meldingen en vermeldingen verschijnen hier.",
    "Vous êtes à jour. Les alertes et mentions apparaîtront ici.",
    "Estás al día. Las alertas y menciones aparecerán aquí.",
    "Sei in pari. Avvisi e menzioni appariranno qui.",
    "Está em dia. Alertas e menções aparecerão aqui.",
    "Всё просмотрено. Оповещения и упоминания появятся здесь.",
    "Hepsi tamam. Uyarılar ve bahsetmeler burada görünür.",
    "أنت على اطلاع. ستظهر التنبيهات والإشارات هنا.",
    "모두 확인했습니다. 알림과 멘션이 여기에 표시됩니다.",
    "Wszystko przeczytane. Alerty i wzmianki pojawią się tutaj.",
    "Усе переглянуто. Сповіщення та згадки з’являться тут.",
    "सब देख लिया। अलर्ट और उल्लेख यहाँ दिखेंगे।",
    "Semua sudah dibaca. Peringatan dan sebutan akan muncul di sini.",
    "Bạn đã xem hết. Cảnh báo và đề cập sẽ hiện ở đây.",
  ]),
  "navigation.dashboard": zip([
    "Dashboard", "داشبورد", "仪表盘", "儀表板", "ダッシュボード", "Dashboard", "Tableau de bord", "Panel", "Dashboard", "Painel",
    "Панель", "Kontrol paneli", "لوحة التحكم", "대시보드", "Panel", "Панель", "डैशबोर्ड", "Dasbor", "Bảng điều khiển",
  ]),
  "navigation.aiWorkspace": zip([
    "KI-Arbeitsbereich", "فضای کاری هوش مصنوعی", "AI 工作区", "AI 工作區", "AIワークスペース", "AI-werkruimte", "Espace de travail IA", "Espacio de trabajo de IA", "Spazio di lavoro IA", "Espaço de trabalho de IA",
    "AI-рабочее пространство", "AI çalışma alanı", "مساحة عمل الذكاء الاصطناعي", "AI 작업 공간", "Przestrzeń AI", "Робочий простір ШІ", "AI कार्यक्षेत्र", "Ruang kerja AI", "Không gian làm việc AI",
  ]),
  "common.imprint": zip([
    "Impressum", "شناسه قانونی", "法律信息", "法律資訊", "運営者情報", "Colofon", "Mentions légales", "Aviso legal", "Note legali", "Aviso legal",
    "Выходные данные", "Künye", "بيانات الناشر", "사업자 정보", "Nota prawna", "Вихідні дані", "इम्प्रिंट", "Imprint", "Thông tin pháp lý",
  ]),
  "common.terms": zip([
    "Bedingungen", "شرایط", "条款", "條款", "利用規約", "Voorwaarden", "Conditions", "Términos", "Termini", "Termos",
    "Условия", "Şartlar", "الشروط", "약관", "Regulamin", "Умови", "शर्तें", "Ketentuan", "Điều khoản",
  ]),
  "common.signedIn": zip([
    "Angemeldet", "وارد شده", "已登录", "已登入", "サインイン済み", "Aangemeld", "Connecté", "Sesión iniciada", "Accesso effettuato", "Sessão iniciada",
    "Вы вошли", "Oturum açık", "تم تسجيل الدخول", "로그인됨", "Zalogowano", "Увійшли", "साइन इन हैं", "Sudah masuk", "Đã đăng nhập",
  ]),
  "common.guestSession": zip([
    "Gastsitzung", "نشست مهمان", "访客会话", "訪客工作階段", "ゲストセッション", "Gastsessie", "Session invité", "Sesión de invitado", "Sessione ospite", "Sessão de convidado",
    "Гостевой сеанс", "Misafir oturumu", "جلسة ضيف", "게스트 세션", "Sesja gościa", "Гостьовий сеанс", "अतिथि सत्र", "Sesi tamu", "Phiên khách",
  ]),
  "common.dashboard": zip([
    "Dashboard", "داشبورد", "仪表盘", "儀表板", "ダッシュボード", "Dashboard", "Tableau de bord", "Panel", "Dashboard", "Painel",
    "Панель", "Kontrol paneli", "لوحة التحكم", "대시보드", "Panel", "Панель", "डैशबोर्ड", "Dasbor", "Bảng điều khiển",
  ]),
  "auth.login.rememberMe": zip([
    "Angemeldet bleiben", "مرا به خاطر بسپار", "记住我", "記住我", "ログイン状態を保持", "Onthoud mij", "Se souvenir de moi", "Recordarme", "Ricordami", "Lembrar-me",
    "Запомнить меня", "Beni hatırla", "تذكرني", "로그인 상태 유지", "Zapamiętaj mnie", "Запам’ятати мене", "मुझे याद रखें", "Ingat saya", "Ghi nhớ tôi",
  ]),
  "auth.login.title": zip([
    "Anmelden", "ورود", "登录", "登入", "サインイン", "Aanmelden", "Se connecter", "Iniciar sesión", "Accedi", "Iniciar sessão",
    "Войти", "Giriş yap", "تسجيل الدخول", "로그인", "Zaloguj się", "Увійти", "साइन इन", "Masuk", "Đăng nhập",
  ]),
  "auth.login.submit": zip([
    "Anmelden", "ورود", "登录", "登入", "サインイン", "Aanmelden", "Se connecter", "Iniciar sesión", "Accedi", "Iniciar sessão",
    "Войти", "Giriş yap", "تسجيل الدخول", "로그인", "Zaloguj się", "Увійти", "साइन इन", "Masuk", "Đăng nhập",
  ]),
  "auth.login.loading": zip([
    "Anmelden", "ورود", "登录", "登入", "サインイン", "Aanmelden", "Se connecter", "Iniciar sesión", "Accedi", "Iniciar sessão",
    "Войти", "Giriş yap", "تسجيل الدخول", "로그인", "Zaloguj się", "Увійти", "साइन इन", "Masuk", "Đăng nhập",
  ]),
  "auth.login.subtitle": zip([
    "Willkommen zurück bei AGXORA.", "دوباره به AGXORA خوش آمدید.", "欢迎回到 AGXORA。", "歡迎回到 AGXORA。", "AGXORAへようこそ。", "Welkom terug bij AGXORA.", "Bon retour sur AGXORA.", "Bienvenido de nuevo a AGXORA.", "Bentornato su AGXORA.", "Bem-vindo de volta à AGXORA.",
    "С возвращением в AGXORA.", "AGXORA’ya tekrar hoş geldiniz.", "مرحبًا بعودتك إلى AGXORA.", "AGXORA에 다시 오신 것을 환영합니다.", "Witamy ponownie w AGXORA.", "З поверненням до AGXORA.", "AGXORA में वापस स्वागत है।", "Selamat datang kembali di AGXORA.", "Chào mừng bạn trở lại AGXORA.",
  ]),
  "auth.login.emailPlaceholder": zip([
    "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com",
    "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com",
  ]),
  "auth.register.signIn": zip([
    "Anmelden", "ورود", "登录", "登入", "サインイン", "Aanmelden", "Se connecter", "Iniciar sesión", "Accedi", "Iniciar sessão",
    "Войти", "Giriş yap", "تسجيل الدخول", "로그인", "Zaloguj się", "Увійти", "साइन इन", "Masuk", "Đăng nhập",
  ]),
  "auth.register.emailPlaceholder": zip([
    "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com",
    "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com", "you@company.com",
  ]),
  "auth.register.lastNamePlaceholder": zip([
    "Morgan", "مورگان", "Morgan", "Morgan", "Morgan", "Morgan", "Morgan", "Morgan", "Morgan", "Morgan",
    "Morgan", "Morgan", "مورغان", "Morgan", "Morgan", "Morgan", "मॉर्गन", "Morgan", "Morgan",
  ]),
  "auth.register.strengthWeak": zip([
    "Schwach", "ضعیف", "弱", "弱", "弱い", "Zwak", "Faible", "Débil", "Debole", "Fraca",
    "Слабый", "Zayıf", "ضعيفة", "약함", "Słabe", "Слабкий", "कमज़ोर", "Lemah", "Yếu",
  ]),
  "auth.register.strengthFair": zip([
    "Mittel", "متوسط", "一般", "普通", "普通", "Redelijk", "Moyen", "Aceptable", "Discreta", "Razoável",
    "Средний", "Orta", "متوسطة", "보통", "Średnie", "Середній", "ठीक", "Sedang", "Trung bình",
  ]),
  "auth.register.strengthStrong": zip([
    "Stark", "قوی", "强", "強", "強い", "Sterk", "Fort", "Fuerte", "Forte", "Forte",
    "Надёжный", "Güçlü", "قوية", "강함", "Silne", "Надійний", "मजबूत", "Kuat", "Mạnh",
  ]),
  "auth.register.acceptTerms": zip([
    "Ich akzeptiere die", "می‌پذیرم", "我接受", "我接受", "同意します", "Ik accepteer de", "J’accepte les", "Acepto los", "Accetto i", "Aceito os",
    "Я принимаю", "Kabul ediyorum:", "أوافق على", "다음에 동의합니다", "Akceptuję", "Я приймаю", "मैं स्वीकार करता/करती हूँ", "Saya menyetujui", "Tôi chấp nhận",
  ]),
  "auth.contactSales.title": zip([
    "Vertrieb kontaktieren", "تماس با فروش", "联系销售", "聯絡業務", "営業に問い合わせ", "Contact sales", "Contacter les ventes", "Contactar ventas", "Contatta le vendite", "Contactar vendas",
    "Связаться с отделом продаж", "Satış ile iletişim", "التواصل مع المبيعات", "영업 문의", "Kontakt ze sprzedażą", "Зв’язатися з відділом продажів", "सेल्स से संपर्क करें", "Hubungi penjualan", "Liên hệ bán hàng",
  ]),
  "auth.contactSales.bookDemo": zip([
    "Demo buchen", "رزرو نسخه نمایشی", "预约演示", "預約示範", "デモを予約", "Demo plannen", "Réserver une démo", "Reservar una demo", "Prenota una demo", "Agendar uma demo",
    "Записаться на демо", "Demo rezervasyonu", "حجز عرض توضيحي", "데모 예약", "Umów demo", "Забронювати демо", "डेमो बुक करें", "Jadwalkan demo", "Đặt lịch demo",
  ]),
  "auth.contactSales.message": zip([
    "Nachricht", "پیام", "留言", "留言", "メッセージ", "Bericht", "Message", "Mensaje", "Messaggio", "Mensagem",
    "Сообщение", "Mesaj", "رسالة", "메시지", "Wiadomość", "Повідомлення", "संदेश", "Pesan", "Tin nhắn",
  ]),
  "dashboard.hero.ariaLabel": zip([
    "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE",
    "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE", "AGXORA CORE",
  ]),
  "dashboard.hero.eyebrow": zip([
    "KI-Geschäftsbetriebssystem", "سیستم عامل کسب‌وکار هوش مصنوعی", "AI 商业操作系统", "AI 商業作業系統", "AIビジネスオペレーティングシステム", "AI-bedrijfsbesturingssysteem", "Système d’exploitation métier IA", "Sistema operativo empresarial de IA", "Sistema operativo aziendale IA", "Sistema operacional empresarial de IA",
    "ОС для бизнеса на базе ИИ", "AI iş işletim sistemi", "نظام تشغيل الأعمال بالذكاء الاصطناعي", "AI 비즈니스 운영 체제", "System operacyjny AI dla biznesu", "ОС для бізнесу на базі ШІ", "AI बिज़नेस ऑपरेटिंग सिस्टम", "Sistem operasi bisnis AI", "Hệ điều hành kinh doanh AI",
  ]),
  "dashboard.attention.empty": zip([
    "Alles in Ordnung — derzeit keine dringenden Punkte.",
    "همه چیز مرتب است — مورد فوری وجود ندارد.",
    "一切正常 — 目前没有紧急事项。",
    "一切正常 — 目前沒有緊急事項。",
    "問題ありません。緊急の項目はありません。",
    "Alles in orde — geen urgente items nu.",
    "Tout est en ordre — aucun élément urgent pour le moment.",
    "Todo en orden: no hay asuntos urgentes ahora.",
    "Tutto a posto: nessun elemento urgente al momento.",
    "Tudo certo — nenhum item urgente agora.",
    "Всё в порядке — срочных пунктов нет.",
    "Her şey yolunda — şu an acil öğe yok.",
    "كل شيء على ما يرام — لا توجد عناصر عاجلة الآن.",
    "모두 정상입니다. 지금 긴급 항목이 없습니다.",
    "Wszystko w porządku — brak pilnych pozycji.",
    "Усе гаразд — термінових пунктів зараз немає.",
    "सब ठीक है — अभी कोई जरूरी आइटम नहीं।",
    "Semua baik — tidak ada item mendesak saat ini.",
    "Mọi thứ ổn — không có mục khẩn cấp lúc này.",
  ]),
  "dashboard.overview.title": zip([
    "Was gerade passiert", "چه خبر است", "当前动态", "目前動態", "いま起きていること", "Wat er speelt", "Ce qui se passe", "Qué está pasando", "Cosa sta succedendo", "O que está acontecendo",
    "Что происходит", "Neler oluyor", "ما الذي يحدث", "지금 상황", "Co się dzieje", "Що відбувається", "क्या हो रहा है", "Apa yang terjadi", "Điều gì đang diễn ra",
  ]),
  "dashboard.overview.subtitle": zip([
    "Kennzahlen für {name}", "شمارش فضای کاری برای {name}", "{name} 的工作区计数", "{name} 的工作區計數", "{name}のワークスペース集計", "Werkruimtetellingen voor {name}", "Compteurs de l’espace pour {name}", "Recuentos del espacio para {name}", "Conteggi dello spazio per {name}", "Contagens do espaço para {name}",
    "Показатели пространства для {name}", "{name} için çalışma alanı sayıları", "عدادات مساحة العمل لـ {name}", "{name}의 워크스페이스 수치", "Liczniki przestrzeni dla {name}", "Показники простору для {name}", "{name} के लिए कार्यक्षेत्र गणना", "Hitungan ruang kerja untuk {name}", "Số liệu không gian cho {name}",
  ]),
  "dashboard.overview.online": zip([
    "Online", "آنلاین", "在线", "在線", "オンライン", "Online", "En ligne", "En línea", "Online", "Online",
    "Онлайн", "Çevrimiçi", "متصل", "온라인", "Online", "Онлайн", "ऑनलाइन", "Online", "Trực tuyến",
  ]),
  "dashboard.overview.activeClients.title": zip([
    "Aktive Kunden", "مشتریان فعال", "活跃客户", "活躍客戶", "アクティブな顧客", "Actieve klanten", "Clients actifs", "Clientes activos", "Clienti attivi", "Clientes ativos",
    "Активные клиенты", "Aktif müşteriler", "العملاء النشطون", "활성 고객", "Aktywni klienci", "Активні клієнти", "सक्रिय ग्राहक", "Pelanggan aktif", "Khách hàng đang hoạt động",
  ]),
  "dashboard.overview.revenue.title": zip([
    "Umsatz", "درآمد", "收入", "營收", "売上", "Omzet", "Chiffre d’affaires", "Ingresos", "Ricavi", "Receita",
    "Выручка", "Gelir", "الإيرادات", "매출", "Przychód", "Дохід", "राजस्व", "Pendapatan", "Doanh thu",
  ]),
  "dashboard.overview.revenue.openBilling": zip([
    "Abrechnung öffnen", "باز کردن صورت‌حساب", "打开账单", "開啟帳單", "請求を開く", "Facturatie openen", "Ouvrir la facturation", "Abrir facturación", "Apri fatturazione", "Abrir faturação",
    "Открыть биллинг", "Faturalamayı aç", "فتح الفوترة", "결제 열기", "Otwórz rozliczenia", "Відкрити білінг", "बिलिंग खोलें", "Buka penagihan", "Mở thanh toán",
  ]),
  "dashboard.overview.clientShell.title": zip([
    "Anwendungsshell", "پوسته برنامه", "应用外壳", "應用程式外殼", "アプリケーションシェル", "Applicatieshell", "Coque applicative", "Capa de la aplicación", "Shell applicazione", "Shell da aplicação",
    "Оболочка приложения", "Uygulama kabuğu", "واجهة التطبيق", "앱 셸", "Powłoka aplikacji", "Оболонка застосунку", "ऐप शेल", "Shell aplikasi", "Lớp vỏ ứng dụng",
  ]),
  "dashboard.overview.clientShell.storesReady": zip([
    "Lokale Workspace-Stores bereit", "ذخیره‌های محلی فضای کاری آماده است", "本地工作区存储已就绪", "本機工作區儲存已就緒", "ローカルワークスペースストアの準備完了", "Lokale werkruimte-stores gereed", "Stores locaux de l’espace prêts", "Almacenes locales del espacio listos", "Store locali dello spazio pronti", "Stores locais do espaço prontos",
    "Локальные хранилища пространства готовы", "Yerel çalışma alanı depoları hazır", "مخازن مساحة العمل المحلية جاهزة", "로컬 워크스페이스 스토어 준비됨", "Lokalne magazyny przestrzeni gotowe", "Локальні сховища простору готові", "स्थानीय वर्कस्पेस स्टोर तैयार", "Store workspace lokal siap", "Kho lưu trữ workspace cục bộ sẵn sàng",
  ]),
  "dashboard.attention.tone.info": zip([
    "Info", "اطلاعات", "信息", "資訊", "情報", "Info", "Info", "Info", "Info", "Info",
    "Инфо", "Bilgi", "معلومة", "정보", "Info", "Інфо", "जानकारी", "Info", "Thông tin",
  ]),
  "dashboard.attention.tone.critical": zip([
    "Kritisch", "بحرانی", "严重", "嚴重", "重大", "Kritiek", "Critique", "Crítico", "Critico", "Crítico",
    "Критично", "Kritik", "حرج", "심각", "Krytyczne", "Критично", "गंभीर", "Kritis", "Nghiêm trọng",
  ]),
  "dashboard.quickActions.subtitle": zip([
    "Was sollten Sie als Nächstes tun?", "اکنون چه کاری باید انجام دهید؟", "接下来该做什么？", "接下來該做什麼？", "次に何をしますか？", "Wat moet u nu doen?", "Que devez-vous faire ensuite ?", "¿Qué debería hacer ahora?", "Cosa dovresti fare adesso?", "O que deve fazer a seguir?",
    "Что сделать дальше?", "Sırada ne yapmalısınız?", "ما الذي ينبغي فعله بعد ذلك؟", "다음에 무엇을 할까요?", "Co zrobić dalej?", "Що зробити далі?", "अब क्या करना चाहिए?", "Apa yang harus dilakukan berikutnya?", "Bạn nên làm gì tiếp theo?",
  ]),
  "dashboard.quickActions.addCustomer.description": zip([
    "CRM-Datensatz anlegen", "یک رکورد CRM بسازید", "创建 CRM 记录", "建立 CRM 記錄", "CRMレコードを作成", "Een CRM-record maken", "Créer une fiche CRM", "Crear un registro CRM", "Crea un record CRM", "Criar um registo CRM",
    "Создать запись CRM", "CRM kaydı oluştur", "إنشاء سجل CRM", "CRM 기록 만들기", "Utwórz rekord CRM", "Створити запис CRM", "CRM रिकॉर्ड बनाएं", "Buat catatan CRM", "Tạo bản ghi CRM",
  ]),
  "dashboard.quickActions.finance.label": zip([
    "Finanzen", "مالی", "财务", "財務", "財務", "Financiën", "Finance", "Finanzas", "Finanza", "Finanças",
    "Финансы", "Finans", "المالية", "재무", "Finanse", "Фінанси", "वित्त", "Keuangan", "Tài chính",
  ]),
  "dashboard.activity.todayCount": zip([
    "{count} heute", "{count} امروز", "今日 {count} 条", "今日 {count} 則", "今日 {count} 件", "{count} vandaag", "{count} aujourd’hui", "{count} hoy", "{count} oggi", "{count} hoje",
    "{count} сегодня", "bugün {count}", "{count} اليوم", "오늘 {count}건", "{count} dziś", "{count} сьогодні", "आज {count}", "{count} hari ini", "{count} hôm nay",
  ]),
  "dashboard.activity.localBadge": zip([
    "Lokal", "محلی", "本地", "本機", "ローカル", "Lokaal", "Local", "Local", "Locale", "Local",
    "Локально", "Yerel", "محلي", "로컬", "Lokalne", "Локально", "स्थानीय", "Lokal", "Nội bộ",
  ]),
  "settings.profile.regions.MENA": zip([
    "MENA", "منا", "中东和北非", "中東與北非", "中東・北アフリカ", "MENA", "MENA", "MENA", "MENA", "MENA",
    "Ближний Восток и Северная Африка", "MENA", "الشرق الأوسط وشمال أفريقيا", "중동·북아프리카", "MENA", "Близький Схід і Північна Африка", "MENA", "MENA", "MENA",
  ]),
  "settings.ai.providers.mock": zip([
    "Mock (lokal)", "آزمایشی (محلی)", "模拟（本地）", "模擬（本機）", "モック（ローカル）", "Mock (lokaal)", "Mock (local)", "Simulado (local)", "Mock (locale)", "Mock (local)",
    "Макет (локально)", "Mock (yerel)", "تجريبي (محلي)", "목(로컬)", "Mock (lokalnie)", "Макет (локально)", "मॉक (स्थानीय)", "Mock (lokal)", "Mock (cục bộ)",
  ]),
  "settings.ai.providers.anthropic": zip([
    "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic",
    "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic", "Anthropic",
  ]),
  "settings.ai.topP": zip([
    "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P",
    "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P", "Top P",
  ]),
  "settings.appearance.accentColor": zip([
    "Akzentfarbe", "رنگ تاکید", "强调色", "強調色", "アクセントカラー", "Accentkleur", "Couleur d’accent", "Color de acento", "Colore di accento", "Cor de destaque",
    "Акцентный цвет", "Vurgu rengi", "لون التمييز", "액센트 색", "Kolor akcentu", "Колір акценту", "एक्सेंट रंग", "Warna aksen", "Màu nhấn",
  ]),
  "projects.overview.noDescription": zip([
    "Keine Beschreibung vorhanden.", "توضیحی ثبت نشده است.", "暂无描述。", "尚無說明。", "説明はありません。", "Geen beschrijving.", "Aucune description.", "Sin descripción.", "Nessuna descrizione.", "Sem descrição.",
    "Описание не указано.", "Açıklama yok.", "لا يوجد وصف.", "설명이 없습니다.", "Brak opisu.", "Опису немає.", "कोई विवरण नहीं।", "Tidak ada deskripsi.", "Không có mô tả.",
  ]),
  "projects.dashboard.kpi.completedHint": zip([
    "{percent} % des Portfolios", "{percent}٪ از سبد", "占组合的 {percent}%", "佔組合的 {percent}%", "ポートフォリオの {percent}%", "{percent}% van de portfolio", "{percent} % du portefeuille", "{percent} % de la cartera", "{percent}% del portafoglio", "{percent}% da carteira",
    "{percent}% портфеля", "portföyün %{percent}", "{percent}٪ من المحفظة", "포트폴리오의 {percent}%", "{percent}% portfela", "{percent}% портфеля", "पोर्टफोलियो का {percent}%", "{percent}% dari portofolio", "{percent}% danh mục",
  ]),
  "backend.offline.message": zip([
    "Prüfen Sie die Verbindung und versuchen Sie es erneut, sobald Sie wieder online sind. Zwischengespeicherte Ansichten können weiter funktionieren.",
    "اتصال را بررسی کنید و پس از آنلاین شدن دوباره تلاش کنید. صفحات ذخیره‌شده ممکن است همچنان کار کنند.",
    "请检查连接，恢复后再重试。已缓存的界面可能仍可使用。",
    "請檢查連線，恢復後再重試。快取畫面可能仍可使用。",
    "接続を確認し、オンラインに戻ったら再試行してください。キャッシュされた画面は引き続き使える場合があります。",
    "Controleer uw verbinding en probeer opnieuw wanneer u weer online bent. Gecachte schermen kunnen nog werken.",
    "Vérifiez votre connexion et réessayez une fois de retour en ligne. Les écrans en cache peuvent encore fonctionner.",
    "Comprueba la conexión e inténtalo de nuevo cuando vuelvas a estar en línea. Las pantallas en caché pueden seguir funcionando.",
    "Controlla la connessione e riprova quando torni online. Le schermate in cache potrebbero ancora funzionare.",
    "Verifique a ligação e tente novamente quando estiver online. Ecrãs em cache ainda podem funcionar.",
    "Проверьте соединение и повторите попытку, когда снова будете в сети. Кэшированные экраны могут продолжать работать.",
    "Bağlantınızı kontrol edin ve tekrar çevrimiçi olunca deneyin. Önbelleğe alınan ekranlar hâlâ çalışabilir.",
    "تحقق من الاتصال وأعد المحاولة عند العودة للاتصال. قد تظل الشاشات المخزّنة تعمل.",
    "연결을 확인한 뒤 다시 온라인이 되면 재시도하세요. 캐시된 화면은 계속 작동할 수 있습니다.",
    "Sprawdź połączenie i spróbuj ponownie, gdy wrócisz do sieci. Buforowane ekrany mogą nadal działać.",
    "Перевірте з’єднання й повторіть спробу, коли знову будете онлайн. Кешовані екрани можуть ще працювати.",
    "कनेक्शन जाँचें और ऑनलाइन होने पर फिर कोशिश करें। कैश स्क्रीन अभी भी काम कर सकती हैं।",
    "Periksa koneksi dan coba lagi saat kembali online. Layar cache mungkin masih berfungsi.",
    "Kiểm tra kết nối và thử lại khi bạn trực tuyến. Màn hình đã lưu có thể vẫn hoạt động.",
  ]),
};

/** Delivery-note wording for non-German locales (DE keeps Lieferschein). */
export const DELIVERY = {
  de: { singular: "Lieferschein", plural: "Lieferscheine" },
  fa: { singular: "برگه تحویل", plural: "برگه‌های تحویل" },
  "zh-CN": { singular: "送货单", plural: "送货单" },
  "zh-TW": { singular: "送貨單", plural: "送貨單" },
  ja: { singular: "納品書", plural: "納品書" },
  nl: { singular: "leveringsbon", plural: "leveringsbonnen" },
  fr: { singular: "bon de livraison", plural: "bons de livraison" },
  es: { singular: "albarán", plural: "albaranes" },
  it: { singular: "bolla di consegna", plural: "bolle di consegna" },
  pt: { singular: "guia de remessa", plural: "guias de remessa" },
  ru: { singular: "накладная", plural: "накладные" },
  tr: { singular: "irsaliye", plural: "irsaliyeler" },
  ar: { singular: "إذن تسليم", plural: "أذون التسليم" },
  ko: { singular: "납품서", plural: "납품서" },
  pl: { singular: "list przewozowy", plural: "listy przewozowe" },
  uk: { singular: "накладна", plural: "накладні" },
  hi: { singular: "डिलीवरी नोट", plural: "डिलीवरी नोट" },
  id: { singular: "surat jalan", plural: "surat jalan" },
  vi: { singular: "phiếu giao hàng", plural: "phiếu giao hàng" },
};

/** Persian leftovers that were still English in source files. */
export const FA_LEFTOVERS = {
  "settings.ai.memoryDescription": "اجازه دهید حافظه سازمان پاسخ‌های هوش مصنوعی را در ماژول‌ها هدایت کند.",
  "settings.ai.languages.auto": "مطابق زبان پروفایل",
  "settings.appearance.accentNotice": "ترجیح رنگ تاکید برای این نشست ذخیره می‌شود و هنوز سامانه رنگ قفل‌شده را تغییر نمی‌دهد.",
  "settings.appearance.compactModeDescription": "فاصله‌گذاری جدول‌ها و پنل‌های سازمانی را کاهش دهید.",
  "settings.appearance.animationsDescription": "حرکت بخش‌ها و افکت هاور. تنظیم کاهش حرکت سیستم رعایت می‌شود.",
  "settings.appearance.glassEffectsDescription": "ترجیح شدت شیشه مات کارت‌ها و نوار کناری.",
  "settings.appearance.modes.night.hint": "ظاهر شب سینمایی تأییدشده",
  "settings.notifications.workflowAlertsDescription": "رویدادهای اجرا و تأیید موتور اتوماسیون.",
  "settings.notifications.financeAlerts": "هشدارهای مالی",
  "settings.notifications.documentsAlerts": "هشدارهای اسناد",
  "settings.notifications.deliveryNotice": "آداپتورهای ارسال در زمان راه‌اندازی ارائه می‌شوند. پرسش‌ها:",
  "settings.documents.notice": "تنظیمات اسناد با معماری کانون دانش یکپارچه است.",
  "settings.documents.defaultFolder": "پوشه پیش‌فرض",
  "settings.documents.knowledgeSettings": "تنظیمات دانش",
  "settings.documents.storageOptions.workspace-default": "پیش‌فرض فضای کاری",
  "settings.documents.storageOptions.encrypted-vault": "خزانه رمزنگاری‌شده",
  "settings.automation.workflowDefaults": "پیش‌فرض‌های گردش‌کار",
  "settings.automation.executionLogsDescription": "جزئیات اجرا را در تاریخچه گردش‌کار نگه دارید.",
  "settings.automation.workflowOptions.require-approval": "دروازه‌های تأیید الزامی",
  "settings.integrations.openCenter": "مرکز یکپارچه‌سازی را باز کنید",
  "settings.api.openPortal": "پورتال توسعه‌دهنده را باز کنید",
  "settings.audit.categories.security": "رویدادهای امنیتی",
  "settings.advanced.experimentalFeatures": "ویژگی‌های آزمایشی",
  "settings.advanced.exportUnavailable": "خروجی هنوز در دسترس نیست.",
  "settings.advanced.resetUnavailable": "بازنشانی هنوز در دسترس نیست.",
  "settings.ai.openAgentOs": "Agent OS را باز کنید",
  "team.invite.title": "دعوت با ایمیل",
  "team.invite.failed": "دعوت ناموفق بود",
  "team.invite.signInFirst": "ابتدا وارد شوید و یک سازمان را فعال کنید.",
  "team.invite.noPermission": "مجوز کافی نیست — برای دعوت، مدیر یا راهبر لازم است.",
  "team.roles.admin.description": "مالی، اتوماسیون، تیم و ماژول‌های فضای کاری را مدیریت کنید.",
  "team.members.roleFor": "نقش برای {name}",
  "team.members.updated": "{name} به {role} به‌روز شد",
  "team.pending.title": "دعوت‌های در انتظار",
  "team.pending.emptyDescription": "دعوت‌های جدید تا پذیرش یا انقضا اینجا نمایش داده می‌شوند.",
  "team.history.empty": "دعوت‌های پذیرفته، منقضی و لغوشده اینجا ظاهر می‌شوند.",
  "ui.table.sortAscending": "مرتب‌سازی صعودی",
  "ui.table.sortDescending": "مرتب‌سازی نزولی",
  "ui.states.errorDescription": "درخواست کامل نشد. کمی بعد دوباره تلاش کنید.",
  "ui.empty.billingTitle": "هنوز سابقه صورت‌حساب نیست",
  "ui.empty.billingDescription": "برای صدور فاکتور، تمدید و تاریخچه پرداخت یک طرح را ارتقا دهید.",
  "ui.empty.agentsDescription": "برای شروع اجرای خودمختار، عاملی را از بازار نصب یا فعال کنید.",
  "workspace.page.description": "سطح فضای کاری ایزوله برای ماژول‌ها و هوش مصنوعی.",
  "workspace.idLabel": "شناسه فضای کاری:",
  "workspace.active": "فعال: {name}",
  "workspace.notInSession": "در نشست فعلی نیست",
  "workspace.organization": "سازمان: {name} ({slug})",
  "workspace.searchResults": "نتایج جستجو",
  "customers.table.viewAria": "مشاهده {company}",
  "customers.table.editAria": "ویرایش {company}",
  "customers.table.deleteAria": "حذف {company}",
  "intelligence.filtersUpdated": "فیلترها به‌روز شد",
  "landing.footer.copyright": "© {year} {company}",
  "legal.shell.lastUpdated": "آخرین به‌روزرسانی: {date}",
  "legal.shell.footerCopyright": "© ۲۰۲۶ {company}",
  "automation.workspace.notice.workflowStatus": "گردش‌کار {status}",
  "automation.workspace.notice.retryResult": "تلاش مجدد {status}",
  "projects.tasks.title": "مدیریت کارها",
};
