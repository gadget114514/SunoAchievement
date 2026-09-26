window.SA = window.SA || {};

SA.i18n = (() => {
  'use strict';

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ru', label: 'Русский' },
  ];

  const LOCALES = { en: 'en-US', ja: 'ja-JP', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU' };

  const DICT = {
    en: {
      app: {
        title: 'Suno Achievement',
        subtitle: 'Turn a Suno profile into an achievement showcase',
      },
      input: {
        placeholder: 'Paste a Suno profile URL or @handle',
        load: 'Load',
        refresh: 'Refresh',
        cached: 'Cached profiles',
      },
      status: {
        loadingCache: 'Loading cached profile…',
        fetching: 'Fetching page {page} — {songs} songs…',
        updated: 'Updated {date}',
        cached: 'Showing cached data',
      },
      error: {
        title: 'Something went wrong',
        invalid: "That doesn't look like a valid Suno profile. Try a URL like suno.com/@handle.",
        notFound: 'No such profile on Suno.',
        network: 'Could not reach Suno. Check your internet connection and try again.',
        rateLimit: 'Suno is rate-limiting requests. Wait a moment and try again.',
        unknown: 'Unexpected error: {message}',
      },
      empty: {
        title: 'No profile loaded yet',
        body: 'Paste a Suno profile link above to pull its songs and unlock achievements.',
      },
      stats: {
        songs: 'Songs',
        plays: 'Plays',
        likes: 'Likes',
        comments: 'Comments',
        runtime: 'Catalog length',
        followers: 'Followers',
      },
      profile: {
        memberSince: 'Since {date}',
        open: 'Open on Suno',
      },
      achievements: {
        title: 'Achievements',
        summary: '{unlocked} of {total} unlocked',
        filterAll: 'All',
        unlocked: 'Unlocked',
        locked: 'Locked',
        songsCount: '{n} songs',
        songsCountOne: '{n} song',
      },
      songs: {
        title: 'Songs',
        search: 'Search titles and tags…',
        sortPlays: 'Most played',
        sortLikes: 'Most liked',
        sortComments: 'Most commented',
        sortDate: 'Newest',
        sortTitle: 'Title',
        empty: 'No songs match your search.',
      },
      actions: {
        export: 'Export JSON',
        import: 'Import JSON',
        snapshot: 'Save snapshot (.jpg)',
      },
      web: {
        import: 'Import JSON',
        importHint: 'Drop a profile JSON here to build achievements. Get one from the desktop app or by running node scripts/scrape.js.',
      },
      toast: {
        exported: 'Exported to {path}',
        imported: 'Imported profile data',
        loaded: 'Profile loaded',
        cancelled: 'Cancelled',
        snapshot: 'Snapshot saved to {path}',
      },
      snapshot: {
        generated: 'Generated {date}',
      },
      footer: {
        source: 'Data from the public Suno profile API. Unofficial and unaffiliated with Suno.',
      },
      categories: {
        catalog: 'Catalog',
        plays: 'Plays',
        likes: 'Likes',
        tiers: 'Song Tiers',
        superlatives: 'Superlatives',
        time: 'Time',
        diversity: 'Diversity',
        community: 'Community',
        gem: 'Hidden Gems',
      },
      badges: {
        catalog_first: { name: 'First Note', desc: 'Publish your first song' },
        catalog_10: { name: 'Getting Started', desc: 'Publish 10 songs' },
        catalog_50: { name: 'Prolific', desc: 'Publish 50 songs' },
        catalog_100: { name: 'Centurion', desc: 'Publish 100 songs' },
        catalog_500: { name: 'Legend', desc: 'Publish 500 songs' },
        plays_1k: { name: 'First Thousand', desc: 'Reach 1,000 total plays' },
        plays_10k: { name: 'Ten Thousand', desc: 'Reach 10,000 total plays' },
        plays_100k: { name: 'Hundred Thousand', desc: 'Reach 100,000 total plays' },
        plays_1m: { name: 'Millionaire', desc: 'Reach 1,000,000 total plays' },
        likes_1: { name: 'First Like', desc: 'Receive your first like' },
        likes_100: { name: 'Appreciated', desc: 'Receive 100 likes' },
        likes_1k: { name: 'Adored', desc: 'Receive 1,000 likes' },
        likes_10k: { name: 'Beloved', desc: 'Receive 10,000 likes' },
        tier_hit: { name: 'Hit', desc: 'Have a song reach 1,000 plays' },
        tier_chart: { name: 'Chart Topper', desc: 'Have a song reach 10,000 plays' },
        tier_viral: { name: 'Viral', desc: 'Have a song reach 100,000 plays' },
        tier_anthem: { name: 'Anthem', desc: 'Have a song reach 1,000,000 plays' },
        top_played: { name: 'Most Played', desc: 'Your most-played song' },
        top_liked: { name: 'Muse', desc: 'Your most-liked song' },
        top_commented: { name: 'Conversation Starter', desc: 'Your most-commented song' },
        time_anniversary: { name: 'Anniversary', desc: 'One year since your first song' },
        time_marathon: { name: 'Marathon Month', desc: 'Publish 30 songs in a single month' },
        time_streak: { name: 'Creator Streak', desc: 'Create songs 7 days in a row' },
        time_early: { name: 'Early Bird', desc: 'Create a song between 5am and 8am' },
        time_night: { name: 'Night Owl', desc: 'Create a song between 11pm and 5am' },
        diversity_genre: { name: 'Genre Hopper', desc: 'Use 8 different tags' },
        diversity_models: { name: 'Model Collector', desc: 'Create with 5 different models' },
        diversity_contest: { name: 'Contestant', desc: 'Enter a Suno contest' },
        social_100: { name: 'Followed', desc: 'Reach 100 followers' },
        social_1k: { name: 'Rising Star', desc: 'Reach 1,000 followers' },
        social_10k: { name: 'Influencer', desc: 'Reach 10,000 followers' },
        gem_hidden: { name: 'Hidden Gem', desc: 'A song with a 5%+ like ratio and 50+ plays' },
      },
    },

    ja: {
      app: {
        title: 'Suno Achievement',
        subtitle: 'Sunoプロフィールを実績ショーケースに',
      },
      input: {
        placeholder: 'SunoプロフィールのURLまたは@ハンドルを貼り付け',
        load: '読み込む',
        refresh: '更新',
        cached: 'キャッシュ済みプロフィール',
      },
      status: {
        loadingCache: 'キャッシュを読み込み中…',
        fetching: 'ページ{page}を取得中 — {songs}曲…',
        updated: '更新: {date}',
        cached: 'キャッシュデータを表示中',
      },
      error: {
        title: '問題が発生しました',
        invalid: '有効なSunoプロフィールではありません。suno.com/@handle のようなURLを入力してください。',
        notFound: 'そのプロフィールはSunoに見つかりません。',
        network: 'Sunoに接続できませんでした。ネットワークを確認して再試行してください。',
        rateLimit: 'リクエストが制限されています。しばらくしてから再試行してください。',
        unknown: '予期しないエラー: {message}',
      },
      empty: {
        title: 'プロフィールが未読み込みです',
        body: '上にSunoプロフィールのリンクを貼り付けると、楽曲を取得して実績を解除できます。',
      },
      stats: {
        songs: '楽曲数',
        plays: '再生回数',
        likes: 'いいね',
        comments: 'コメント',
        runtime: 'カタログ長',
        followers: 'フォロワー',
      },
      profile: {
        memberSince: '{date} から',
        open: 'Sunoで開く',
      },
      achievements: {
        title: '実績',
        summary: '{total}件中{unlocked}件解除',
        filterAll: 'すべて',
        unlocked: '解除済み',
        locked: '未解除',
        songsCount: '{n}曲',
        songsCountOne: '{n}曲',
      },
      songs: {
        title: '楽曲',
        search: 'タイトルとタグを検索…',
        sortPlays: '再生数順',
        sortLikes: 'いいね順',
        sortComments: 'コメント順',
        sortDate: '新しい順',
        sortTitle: 'タイトル順',
        empty: '検索に一致する曲がありません。',
      },
      actions: {
        export: 'JSONエクスポート',
        import: 'JSONインポート',
        snapshot: 'スナップショット保存 (.jpg)',
      },
      web: {
        import: 'JSONを読み込む',
        importHint: 'プロフィールJSONをここにドロップすると実績を表示します。JSONはデスクトップ版アプリか node scripts/scrape.js で作成できます。',
      },
      toast: {
        exported: '{path} にエクスポートしました',
        imported: 'プロフィールデータをインポートしました',
        loaded: 'プロフィールを読み込みました',
        cancelled: 'キャンセルしました',
        snapshot: 'スナップショットを {path} に保存しました',
      },
      snapshot: {
        generated: '作成日 {date}',
      },
      footer: {
        source: 'データはSunoの公開プロフィールAPIから取得しています。非公式であり、Sunoとは無関係です。',
      },
      categories: {
        catalog: 'カタログ',
        plays: '再生',
        likes: 'いいね',
        tiers: '楽曲ティア',
        superlatives: 'ベスト楽曲',
        time: '時間',
        diversity: '多様性',
        community: 'コミュニティ',
        gem: '隠れた名曲',
      },
      badges: {
        catalog_first: { name: 'ファーストノート', desc: '最初の曲を公開する' },
        catalog_10: { name: 'はじまり', desc: '10曲を公開する' },
        catalog_50: { name: '多作家', desc: '50曲を公開する' },
        catalog_100: { name: 'センチュリオン', desc: '100曲を公開する' },
        catalog_500: { name: 'レジェンド', desc: '500曲を公開する' },
        plays_1k: { name: '最初の1000回', desc: '累計1,000回再生を達成' },
        plays_10k: { name: '1万回', desc: '累計10,000回再生を達成' },
        plays_100k: { name: '10万回', desc: '累計100,000回再生を達成' },
        plays_1m: { name: 'ミリオネア', desc: '累計1,000,000回再生を達成' },
        likes_1: { name: '最初のいいね', desc: '初めていいねを受け取る' },
        likes_100: { name: '感謝', desc: '100いいねを受け取る' },
        likes_1k: { name: '愛され', desc: '1,000いいねを受け取る' },
        likes_10k: { name: '敬愛', desc: '10,000いいねを受け取る' },
        tier_hit: { name: 'ヒット', desc: '1,000回再生の曲を持つ' },
        tier_chart: { name: 'チャート上位', desc: '10,000回再生の曲を持つ' },
        tier_viral: { name: 'バイラル', desc: '100,000回再生の曲を持つ' },
        tier_anthem: { name: 'アンセム', desc: '1,000,000回再生の曲を持つ' },
        top_played: { name: '最多再生', desc: '最も再生された曲' },
        top_liked: { name: 'ミューズ', desc: '最もいいねされた曲' },
        top_commented: { name: '話題の的', desc: '最もコメントされた曲' },
        time_anniversary: { name: 'アニバーサリー', desc: '初投稿から1年' },
        time_marathon: { name: 'マラソン月間', desc: '1か月で30曲を公開' },
        time_streak: { name: '連続クリエイター', desc: '7日連続で曲を作成' },
        time_early: { name: '早起き', desc: '午前5時〜8時に曲を作成' },
        time_night: { name: '夜ふかし', desc: '午後11時〜午前5時に曲を作成' },
        diversity_genre: { name: 'ジャンルホッパー', desc: '8種類のタグを使う' },
        diversity_models: { name: 'モデルコレクター', desc: '5種類のモデルで作成' },
        diversity_contest: { name: 'コンテスタント', desc: 'Sunoコンテストに参加' },
        social_100: { name: 'フォローされ始め', desc: 'フォロワー100人' },
        social_1k: { name: '新星', desc: 'フォロワー1,000人' },
        social_10k: { name: 'インフルエンサー', desc: 'フォロワー10,000人' },
        gem_hidden: { name: '隠れた名曲', desc: 'いいね率5%以上かつ50回以上再生の曲' },
      },
    },

    es: {
      app: {
        title: 'Suno Achievement',
        subtitle: 'Convierte un perfil de Suno en una vitrina de logros',
      },
      input: {
        placeholder: 'Pega una URL de perfil de Suno o @usuario',
        load: 'Cargar',
        refresh: 'Actualizar',
        cached: 'Perfiles en caché',
      },
      status: {
        loadingCache: 'Cargando perfil en caché…',
        fetching: 'Obteniendo página {page} — {songs} canciones…',
        updated: 'Actualizado {date}',
        cached: 'Mostrando datos en caché',
      },
      error: {
        title: 'Algo salió mal',
        invalid: 'No parece un perfil válido de Suno. Prueba con una URL como suno.com/@handle.',
        notFound: 'Ese perfil no existe en Suno.',
        network: 'No se pudo conectar con Suno. Revisa tu conexión e inténtalo de nuevo.',
        rateLimit: 'Suno está limitando las solicitudes. Espera un momento e inténtalo de nuevo.',
        unknown: 'Error inesperado: {message}',
      },
      empty: {
        title: 'Aún no hay perfil cargado',
        body: 'Pega arriba un enlace de perfil de Suno para obtener sus canciones y desbloquear logros.',
      },
      stats: {
        songs: 'Canciones',
        plays: 'Reproducciones',
        likes: 'Me gusta',
        comments: 'Comentarios',
        runtime: 'Duración del catálogo',
        followers: 'Seguidores',
      },
      profile: {
        memberSince: 'Desde {date}',
        open: 'Abrir en Suno',
      },
      achievements: {
        title: 'Logros',
        summary: '{unlocked} de {total} desbloqueados',
        filterAll: 'Todos',
        unlocked: 'Desbloqueado',
        locked: 'Bloqueado',
        songsCount: '{n} canciones',
        songsCountOne: '{n} canción',
      },
      songs: {
        title: 'Canciones',
        search: 'Buscar títulos y etiquetas…',
        sortPlays: 'Más reproducidas',
        sortLikes: 'Más gustadas',
        sortComments: 'Más comentadas',
        sortDate: 'Recientes',
        sortTitle: 'Título',
        empty: 'Ninguna canción coincide con tu búsqueda.',
      },
      actions: {
        export: 'Exportar JSON',
        import: 'Importar JSON',
        snapshot: 'Guardar captura (.jpg)',
      },
      web: {
        import: 'Importar JSON',
        importHint: 'Suelta aquí un JSON de perfil para generar los logros. Consíguelo con la app de escritorio o con node scripts/scrape.js.',
      },
      toast: {
        exported: 'Exportado a {path}',
        imported: 'Datos del perfil importados',
        loaded: 'Perfil cargado',
        cancelled: 'Cancelado',
        snapshot: 'Captura guardada en {path}',
      },
      snapshot: {
        generated: 'Generado el {date}',
      },
      footer: {
        source: 'Datos de la API pública de perfiles de Suno. No oficial y sin afiliación con Suno.',
      },
      categories: {
        catalog: 'Catálogo',
        plays: 'Reproducciones',
        likes: 'Me gusta',
        tiers: 'Niveles de canción',
        superlatives: 'Superlativos',
        time: 'Tiempo',
        diversity: 'Diversidad',
        community: 'Comunidad',
        gem: 'Joyas ocultas',
      },
      badges: {
        catalog_first: { name: 'Primera Nota', desc: 'Publica tu primera canción' },
        catalog_10: { name: 'Comenzando', desc: 'Publica 10 canciones' },
        catalog_50: { name: 'Prolífico', desc: 'Publica 50 canciones' },
        catalog_100: { name: 'Centurión', desc: 'Publica 100 canciones' },
        catalog_500: { name: 'Leyenda', desc: 'Publica 500 canciones' },
        plays_1k: { name: 'Primer Millar', desc: 'Alcanza 1.000 reproducciones' },
        plays_10k: { name: 'Diez Mil', desc: 'Alcanza 10.000 reproducciones' },
        plays_100k: { name: 'Cien Mil', desc: 'Alcanza 100.000 reproducciones' },
        plays_1m: { name: 'Millonario', desc: 'Alcanza 1.000.000 de reproducciones' },
        likes_1: { name: 'Primer Me Gusta', desc: 'Recibe tu primer me gusta' },
        likes_100: { name: 'Apreciado', desc: 'Recibe 100 me gusta' },
        likes_1k: { name: 'Adorado', desc: 'Recibe 1.000 me gusta' },
        likes_10k: { name: 'Amado', desc: 'Recibe 10.000 me gusta' },
        tier_hit: { name: 'Éxito', desc: 'Ten una canción con 1.000 reproducciones' },
        tier_chart: { name: 'Número Uno', desc: 'Ten una canción con 10.000 reproducciones' },
        tier_viral: { name: 'Viral', desc: 'Ten una canción con 100.000 reproducciones' },
        tier_anthem: { name: 'Himno', desc: 'Ten una canción con 1.000.000 de reproducciones' },
        top_played: { name: 'Más Reproducida', desc: 'Tu canción más reproducida' },
        top_liked: { name: 'Musa', desc: 'Tu canción con más me gusta' },
        top_commented: { name: 'Conversación', desc: 'Tu canción más comentada' },
        time_anniversary: { name: 'Aniversario', desc: 'Un año desde tu primera canción' },
        time_marathon: { name: 'Mes Maratón', desc: 'Publica 30 canciones en un mes' },
        time_streak: { name: 'Racha Creativa', desc: 'Crea canciones 7 días seguidos' },
        time_early: { name: 'Madrugador', desc: 'Crea una canción entre las 5 y las 8' },
        time_night: { name: 'Noctámbulo', desc: 'Crea una canción entre las 23 y las 5' },
        diversity_genre: { name: 'Saltagéneros', desc: 'Usa 8 etiquetas diferentes' },
        diversity_models: { name: 'Coleccionista', desc: 'Crea con 5 modelos diferentes' },
        diversity_contest: { name: 'Concursante', desc: 'Participa en un concurso de Suno' },
        social_100: { name: 'Seguido', desc: 'Alcanza 100 seguidores' },
        social_1k: { name: 'Estrella Emergente', desc: 'Alcanza 1.000 seguidores' },
        social_10k: { name: 'Influencer', desc: 'Alcanza 10.000 seguidores' },
        gem_hidden: { name: 'Joya Oculta', desc: 'Una canción con +5% de me gusta y 50+ reproducciones' },
      },
    },

    fr: {
      app: {
        title: 'Suno Achievement',
        subtitle: 'Transformez un profil Suno en vitrine de succès',
      },
      input: {
        placeholder: 'Collez une URL de profil Suno ou @pseudo',
        load: 'Charger',
        refresh: 'Actualiser',
        cached: 'Profils en cache',
      },
      status: {
        loadingCache: 'Chargement du profil en cache…',
        fetching: 'Récupération de la page {page} — {songs} titres…',
        updated: 'Mis à jour {date}',
        cached: 'Affichage des données en cache',
      },
      error: {
        title: 'Une erreur est survenue',
        invalid: "Ce n'est pas un profil Suno valide. Essayez une URL comme suno.com/@handle.",
        notFound: "Ce profil n'existe pas sur Suno.",
        network: 'Impossible de joindre Suno. Vérifiez votre connexion et réessayez.',
        rateLimit: 'Suno limite les requêtes. Patientez un instant et réessayez.',
        unknown: 'Erreur inattendue : {message}',
      },
      empty: {
        title: 'Aucun profil chargé',
        body: 'Collez un lien de profil Suno ci-dessus pour récupérer ses titres et débloquer des succès.',
      },
      stats: {
        songs: 'Titres',
        plays: 'Écoutes',
        likes: "J'aime",
        comments: 'Commentaires',
        runtime: 'Durée du catalogue',
        followers: 'Abonnés',
      },
      profile: {
        memberSince: 'Depuis {date}',
        open: 'Ouvrir sur Suno',
      },
      achievements: {
        title: 'Succès',
        summary: '{unlocked} sur {total} débloqués',
        filterAll: 'Tous',
        unlocked: 'Débloqué',
        locked: 'Verrouillé',
        songsCount: '{n} titres',
        songsCountOne: '{n} titre',
      },
      songs: {
        title: 'Titres',
        search: 'Rechercher titres et tags…',
        sortPlays: 'Plus écoutées',
        sortLikes: 'Plus aimées',
        sortComments: 'Plus commentées',
        sortDate: 'Récentes',
        sortTitle: 'Titre',
        empty: 'Aucun titre ne correspond à votre recherche.',
      },
      actions: {
        export: 'Exporter JSON',
        import: 'Importer JSON',
        snapshot: 'Enregistrer la capture (.jpg)',
      },
      web: {
        import: 'Importer JSON',
        importHint: "Déposez ici un JSON de profil pour afficher les succès. Obtenez-le avec l'application de bureau ou via node scripts/scrape.js.",
      },
      toast: {
        exported: 'Exporté vers {path}',
        imported: 'Données du profil importées',
        loaded: 'Profil chargé',
        cancelled: 'Annulé',
        snapshot: 'Capture enregistrée dans {path}',
      },
      snapshot: {
        generated: 'Généré le {date}',
      },
      footer: {
        source: "Données issues de l'API publique des profils Suno. Non officiel, sans affiliation avec Suno.",
      },
      categories: {
        catalog: 'Catalogue',
        plays: 'Écoutes',
        likes: "J'aime",
        tiers: 'Niveaux de titre',
        superlatives: 'Superlatifs',
        time: 'Temps',
        diversity: 'Diversité',
        community: 'Communauté',
        gem: 'Pépites',
      },
      badges: {
        catalog_first: { name: 'Première Note', desc: 'Publiez votre premier titre' },
        catalog_10: { name: 'Débuts', desc: 'Publiez 10 titres' },
        catalog_50: { name: 'Prolifique', desc: 'Publiez 50 titres' },
        catalog_100: { name: 'Centurion', desc: 'Publiez 100 titres' },
        catalog_500: { name: 'Légende', desc: 'Publiez 500 titres' },
        plays_1k: { name: 'Premier Millier', desc: 'Atteignez 1 000 écoutes' },
        plays_10k: { name: 'Dix Mille', desc: 'Atteignez 10 000 écoutes' },
        plays_100k: { name: 'Cent Mille', desc: 'Atteignez 100 000 écoutes' },
        plays_1m: { name: 'Millionnaire', desc: "Atteignez 1 000 000 d'écoutes" },
        likes_1: { name: "Premier J'aime", desc: "Recevez votre premier j'aime" },
        likes_100: { name: 'Apprécié', desc: "Recevez 100 j'aime" },
        likes_1k: { name: 'Adoré', desc: "Recevez 1 000 j'aime" },
        likes_10k: { name: 'Chéri', desc: "Recevez 10 000 j'aime" },
        tier_hit: { name: 'Tube', desc: 'Un titre atteint 1 000 écoutes' },
        tier_chart: { name: 'Sommet', desc: 'Un titre atteint 10 000 écoutes' },
        tier_viral: { name: 'Viral', desc: 'Un titre atteint 100 000 écoutes' },
        tier_anthem: { name: 'Hymne', desc: "Un titre atteint 1 000 000 d'écoutes" },
        top_played: { name: 'La Plus Écoutée', desc: 'Votre titre le plus écouté' },
        top_liked: { name: 'Muse', desc: 'Votre titre le plus aimé' },
        top_commented: { name: 'Discussion', desc: 'Votre titre le plus commenté' },
        time_anniversary: { name: 'Anniversaire', desc: 'Un an depuis votre premier titre' },
        time_marathon: { name: 'Mois Marathon', desc: 'Publiez 30 titres en un mois' },
        time_streak: { name: 'Série Créative', desc: "Créez 7 jours d'affilée" },
        time_early: { name: 'Lève-tôt', desc: 'Créez un titre entre 5h et 8h' },
        time_night: { name: 'Noctambule', desc: 'Créez un titre entre 23h et 5h' },
        diversity_genre: { name: 'Explorateur', desc: 'Utilisez 8 tags différents' },
        diversity_models: { name: 'Collectionneur', desc: 'Créez avec 5 modèles différents' },
        diversity_contest: { name: 'Candidat', desc: 'Participez à un concours Suno' },
        social_100: { name: 'Suivi', desc: 'Atteignez 100 abonnés' },
        social_1k: { name: 'Étoile Montante', desc: 'Atteignez 1 000 abonnés' },
        social_10k: { name: 'Influenceur', desc: 'Atteignez 10 000 abonnés' },
        gem_hidden: { name: 'Pépite', desc: "Un titre avec +5% de j'aime et 50+ écoutes" },
      },
    },

    ru: {
      app: {
        title: 'Suno Achievement',
        subtitle: 'Превратите профиль Suno в витрину достижений',
      },
      input: {
        placeholder: 'Вставьте ссылку на профиль Suno или @ник',
        load: 'Загрузить',
        refresh: 'Обновить',
        cached: 'Кэшированные профили',
      },
      status: {
        loadingCache: 'Загрузка профиля из кэша…',
        fetching: 'Получение страницы {page} — песен: {songs}…',
        updated: 'Обновлено {date}',
        cached: 'Показаны кэшированные данные',
      },
      error: {
        title: 'Что-то пошло не так',
        invalid: 'Это не похоже на профиль Suno. Попробуйте ссылку вида suno.com/@handle.',
        notFound: 'Такой профиль на Suno не найден.',
        network: 'Не удалось подключиться к Suno. Проверьте соединение и повторите.',
        rateLimit: 'Suno ограничивает запросы. Подождите немного и повторите.',
        unknown: 'Неожиданная ошибка: {message}',
      },
      empty: {
        title: 'Профиль ещё не загружен',
        body: 'Вставьте ссылку на профиль Suno выше, чтобы получить песни и открыть достижения.',
      },
      stats: {
        songs: 'Песни',
        plays: 'Прослушивания',
        likes: 'Лайки',
        comments: 'Комментарии',
        runtime: 'Длительность каталога',
        followers: 'Подписчики',
      },
      profile: {
        memberSince: 'С {date}',
        open: 'Открыть на Suno',
      },
      achievements: {
        title: 'Достижения',
        summary: 'Открыто {unlocked} из {total}',
        filterAll: 'Все',
        unlocked: 'Открыто',
        locked: 'Закрыто',
        songsCount: 'Песен: {n}',
        songsCountOne: 'Песня: {n}',
      },
      songs: {
        title: 'Песни',
        search: 'Поиск по названию и тегам…',
        sortPlays: 'По прослушиваниям',
        sortLikes: 'По лайкам',
        sortComments: 'По комментариям',
        sortDate: 'Новые',
        sortTitle: 'По названию',
        empty: 'Ничего не найдено.',
      },
      actions: {
        export: 'Экспорт JSON',
        import: 'Импорт JSON',
        snapshot: 'Сохранить снимок (.jpg)',
      },
      web: {
        import: 'Импорт JSON',
        importHint: 'Перетащите сюда JSON профиля, чтобы построить достижения. Его можно получить в настольном приложении или командой node scripts/scrape.js.',
      },
      toast: {
        exported: 'Экспортировано в {path}',
        imported: 'Данные профиля импортированы',
        loaded: 'Профиль загружен',
        cancelled: 'Отменено',
        snapshot: 'Снимок сохранён в {path}',
      },
      snapshot: {
        generated: 'Создано {date}',
      },
      footer: {
        source: 'Данные из публичного API профилей Suno. Неофициально и не связано с Suno.',
      },
      categories: {
        catalog: 'Каталог',
        plays: 'Прослушивания',
        likes: 'Лайки',
        tiers: 'Уровни песен',
        superlatives: 'Лучшие песни',
        time: 'Время',
        diversity: 'Разнообразие',
        community: 'Сообщество',
        gem: 'Скрытые жемчужины',
      },
      badges: {
        catalog_first: { name: 'Первая нота', desc: 'Опубликуйте первую песню' },
        catalog_10: { name: 'Начало', desc: 'Опубликуйте 10 песен' },
        catalog_50: { name: 'Плодовитый', desc: 'Опубликуйте 50 песен' },
        catalog_100: { name: 'Центурион', desc: 'Опубликуйте 100 песен' },
        catalog_500: { name: 'Легенда', desc: 'Опубликуйте 500 песен' },
        plays_1k: { name: 'Первая тысяча', desc: 'Наберите 1 000 прослушиваний' },
        plays_10k: { name: 'Десять тысяч', desc: 'Наберите 10 000 прослушиваний' },
        plays_100k: { name: 'Сто тысяч', desc: 'Наберите 100 000 прослушиваний' },
        plays_1m: { name: 'Миллионер', desc: 'Наберите 1 000 000 прослушиваний' },
        likes_1: { name: 'Первый лайк', desc: 'Получите первый лайк' },
        likes_100: { name: 'Признание', desc: 'Получите 100 лайков' },
        likes_1k: { name: 'Обожание', desc: 'Получите 1 000 лайков' },
        likes_10k: { name: 'Любовь публики', desc: 'Получите 10 000 лайков' },
        tier_hit: { name: 'Хит', desc: 'Песня с 1 000 прослушиваний' },
        tier_chart: { name: 'Лидер чартов', desc: 'Песня с 10 000 прослушиваний' },
        tier_viral: { name: 'Виральная', desc: 'Песня со 100 000 прослушиваний' },
        tier_anthem: { name: 'Гимн', desc: 'Песня с 1 000 000 прослушиваний' },
        top_played: { name: 'Самая слушаемая', desc: 'Ваша самая прослушиваемая песня' },
        top_liked: { name: 'Муза', desc: 'Ваша самая любимая песня' },
        top_commented: { name: 'Заводила', desc: 'Ваша самая комментируемая песня' },
        time_anniversary: { name: 'Годовщина', desc: 'Год с первой песни' },
        time_marathon: { name: 'Марафонский месяц', desc: '30 песен за один месяц' },
        time_streak: { name: 'Творческая серия', desc: 'Создавайте песни 7 дней подряд' },
        time_early: { name: 'Ранняя пташка', desc: 'Создайте песню с 5 до 8 утра' },
        time_night: { name: 'Полуночник', desc: 'Создайте песню с 23 до 5' },
        diversity_genre: { name: 'Жанровый путешественник', desc: 'Используйте 8 разных тегов' },
        diversity_models: { name: 'Коллекционер моделей', desc: 'Создавайте с 5 разными моделями' },
        diversity_contest: { name: 'Участник конкурса', desc: 'Примите участие в конкурсе Suno' },
        social_100: { name: 'Первый успех', desc: '100 подписчиков' },
        social_1k: { name: 'Восходящая звезда', desc: '1 000 подписчиков' },
        social_10k: { name: 'Инфлюенсер', desc: '10 000 подписчиков' },
        gem_hidden: { name: 'Скрытая жемчужина', desc: 'Песня с долей лайков от 5% и 50+ прослушиваний' },
      },
    },
  };

  let current = 'en';

  function detect() {
    const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (const candidate of candidates) {
      const code = String(candidate).slice(0, 2).toLowerCase();
      if (DICT[code]) return code;
    }
    return 'en';
  }

  function lookup(dict, key) {
    return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dict);
  }

  function t(key, vars) {
    let value = lookup(DICT[current], key);
    if (value === undefined) value = lookup(DICT.en, key);
    if (value === undefined) return key;
    if (vars) {
      value = String(value).replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
    }
    return value;
  }

  function tPlural(key, n, vars) {
    return t(n === 1 ? `${key}One` : key, { ...(vars || {}), n });
  }

  function set(code) {
    if (DICT[code]) current = code;
    return current;
  }

  function lang() {
    return current;
  }

  function locale() {
    return LOCALES[current] || 'en-US';
  }

  return { languages: LANGUAGES, t, tPlural, set, lang, locale, detect };
})();
