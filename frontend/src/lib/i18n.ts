'use client'
import { useEffect, useState } from 'react'

export type Language = 'ru' | 'uz' | 'en'

const STORAGE_KEY = 'nova_lang'

const ru = {
  home: 'Главная', movies: 'Фильмы', series: 'Сериалы', anime: 'Аниме', cartoons: 'Мультфильмы',
  favorites: 'Любимое', new: 'Новинки', newReleases: 'Новинки', searchPlaceholder: 'Искать фильмы...',
  profiles: 'Профили', adminDashboard: 'Админ-панель', signOut: 'Выйти', language: 'Язык',
  welcome: 'Добро пожаловать в NovaStream', addMedia: 'Добавьте медиа, чтобы начать',
  continueWatching: 'Продолжить просмотр', tvSeries: 'Сериалы', topRated: 'Лучшие по рейтингу',
  movie: 'Фильм', documentary: 'Документальный', playNow: 'Смотреть', moreInfo: 'Подробнее',
  featured: 'Рекомендуем', notifications: 'Уведомления', processing: 'Обработка',
  pending: 'Ожидает', error: 'Ошибка',
  readyToWatch: 'Готово к просмотру', noNotifications: 'Уведомлений пока нет',
  favoritesKicker: 'Ваша коллекция', favoritesDescription: 'Любимые фильмы и сериалы всегда под рукой.',
  noFavorites: 'В любимом пока пусто', noFavoritesHint: 'Нажмите на сердце у любого материала, чтобы сохранить его здесь.',
  addedToFavorites: 'Добавлено в любимое', removedFromFavorites: 'Удалено из любимого',
  favoriteUpdateFailed: 'Не удалось обновить любимое',
  allTitles: 'Все материалы', titlesAvailable: 'доступно', filters: 'Фильтры',
  filtersHint: 'Выберите жанр и сортировку.', reset: 'Сбросить', genre: 'Жанр', all: 'Все',
  sort: 'Сортировка', newest: 'Сначала новые', az: 'А–Я', documentaries: 'Документальные',
  previous: 'Назад', next: 'Далее', page: 'Страница', of: 'из',
  searchResults: 'Результаты поиска', showingResults: 'Результаты для', enterSearch: 'Введите запрос',
  noResults: 'Ничего не найдено', tryAnotherSearch: 'Попробуйте другой запрос',
  quality: 'Качество', speed: 'Скорость', normal: 'Обычная', retry: 'Повторить',
  streamError: 'Ошибка потока. Попробуйте ещё раз.', loadStreamError: 'Не удалось загрузить видео.',
  adminTitle: 'Админ-панель', controlPanel: 'Управление NovaStream', overview: 'Обзор',
  mediaLibrary: 'Медиатека', users: 'Пользователи', upload: 'Загрузка', addMediaButton: 'Добавить медиа',
  totalUsers: 'Всего пользователей', totalMedia: 'Всего материалов', readyToStream: 'Готово к просмотру',
  viewsThisWeek: 'Просмотров за неделю', platformActivity: 'Активность платформы',
  searchMedia: 'Поиск по медиатеке...', title: 'Название', type: 'Тип', status: 'Статус',
  added: 'Добавлено', actions: 'Действия', refreshStatuses: 'Обновить статусы',
  uploadTitle: 'Загрузка медиа', description: 'Описание', releaseDate: 'Дата выхода',
  runtime: 'Длительность', rating: 'Рейтинг', poster: 'Постер', backdrop: 'Фоновое изображение',
  tmdbId: 'TMDB ID (необязательно)', uploadAndProcess: 'Загрузить и обработать',
  playbackMode: 'Режим просмотра', standaloneVideo: 'Одиночное видео', episodicVideo: 'Серийник',
  saveChanges: 'Сохранить', cancel: 'Отмена', episodes: 'Серии', season: 'Сезон',
  episode: 'Серия', episodeTitle: 'Название серии', episodeDescription: 'Описание серии',
  videoFile: 'Видеофайл', addEpisode: 'Добавить серию', noEpisodes: 'Серий пока нет',
  openNotifications: 'Открыть уведомления', notificationUpdates: 'Статусы обработки и новые материалы',
  stillProcessing: 'Видео ещё обрабатывается', addedToLibrary: 'Добавлено в медиатеку',
  welcomeBack: 'С возвращением', signInHint: 'Войдите, чтобы продолжить просмотр',
  email: 'Email', password: 'Пароль', signIn: 'Войти', noAccount: 'Нет аккаунта?',
  createAccount: 'Создать', loginSuccess: 'Вход выполнен', invalidCredentials: 'Неверный email или пароль',
  loadMediaError: 'Не удалось загрузить информацию о фильме.', backHome: 'На главную',
  chooseEpisode: 'Выберите серию', chooseEpisodeHint: 'Сначала выберите сезон и серию для просмотра.',
  noEpisodesReady: 'Готовых серий пока нет', episodeProcessing: 'Серия обрабатывается',
  episodeFailed: 'Ошибка обработки серии', queuedForProcessing: 'Серия загружена и добавлена в очередь',
  uploadedFile: 'Загруженный файл',
  episodeFileRequired: 'Выберите видеофайл серии', autoEpisodeTitle: 'Название создастся автоматически',
}

type Translation = { [K in keyof typeof ru]: string }

const uz: Translation = {
  home: 'Bosh sahifa', movies: 'Filmlar', series: 'Seriallar', anime: 'Anime', cartoons: 'Multfilmlar',
  favorites: 'Sevimlilar', new: 'Yangilar', newReleases: 'Yangi qo‘shilganlar', searchPlaceholder: 'Film qidirish...',
  profiles: 'Profillar', adminDashboard: 'Admin paneli', signOut: 'Chiqish', language: 'Til',
  welcome: 'NovaStreamga xush kelibsiz', addMedia: 'Boshlash uchun media qo‘shing',
  continueWatching: 'Ko‘rishda davom etish', tvSeries: 'Seriallar', topRated: 'Yuqori reyting',
  movie: 'Film', documentary: 'Hujjatli', playNow: 'Ko‘rish', moreInfo: 'Batafsil',
  featured: 'Tavsiya etiladi', notifications: 'Bildirishnomalar', processing: 'Qayta ishlanmoqda',
  pending: 'Kutilmoqda', error: 'Xato',
  readyToWatch: 'Ko‘rishga tayyor', noNotifications: 'Bildirishnomalar yo‘q',
  favoritesKicker: 'Sizning to‘plamingiz', favoritesDescription: 'Sevimli film va seriallaringiz bir joyda.',
  noFavorites: 'Sevimlilar hozircha bo‘sh', noFavoritesHint: 'Media yonidagi yurakni bosib shu yerga saqlang.',
  addedToFavorites: 'Sevimlilarga qo‘shildi', removedFromFavorites: 'Sevimlilardan olib tashlandi',
  favoriteUpdateFailed: 'Sevimlilarni yangilab bo‘lmadi',
  allTitles: 'Barcha media', titlesAvailable: 'mavjud', filters: 'Filtrlar',
  filtersHint: 'Janr va saralashni tanlang.', reset: 'Tozalash', genre: 'Janr', all: 'Barchasi',
  sort: 'Saralash', newest: 'Eng yangi', az: 'A–Z', documentaries: 'Hujjatli filmlar',
  previous: 'Oldingi', next: 'Keyingi', page: 'Sahifa', of: 'dan',
  searchResults: 'Qidiruv natijalari', showingResults: 'Natijalar', enterSearch: 'Qidiruv so‘zini kiriting',
  noResults: 'Natija topilmadi', tryAnotherSearch: 'Boshqa so‘zni sinab ko‘ring',
  quality: 'Sifat', speed: 'Tezlik', normal: 'Oddiy', retry: 'Qayta urinish',
  streamError: 'Video oqimida xato. Qayta urinib ko‘ring.', loadStreamError: 'Videoni yuklab bo‘lmadi.',
  adminTitle: 'Admin paneli', controlPanel: 'NovaStream boshqaruvi', overview: 'Umumiy',
  mediaLibrary: 'Media kutubxona', users: 'Foydalanuvchilar', upload: 'Yuklash', addMediaButton: 'Media qo‘shish',
  totalUsers: 'Foydalanuvchilar', totalMedia: 'Jami media', readyToStream: 'Ko‘rishga tayyor',
  viewsThisWeek: 'Haftalik ko‘rishlar', platformActivity: 'Platforma faolligi',
  searchMedia: 'Media qidirish...', title: 'Nomi', type: 'Turi', status: 'Holati',
  added: 'Qo‘shilgan', actions: 'Amallar', refreshStatuses: 'Holatlarni yangilash',
  uploadTitle: 'Media yuklash', description: 'Tavsif', releaseDate: 'Chiqqan sana',
  runtime: 'Davomiyligi', rating: 'Reyting', poster: 'Poster', backdrop: 'Fon rasmi',
  tmdbId: 'TMDB ID (ixtiyoriy)', uploadAndProcess: 'Yuklash va qayta ishlash',
  playbackMode: 'Ko‘rish rejimi', standaloneVideo: 'Bitta video', episodicVideo: 'Qismlarga bo‘lingan',
  saveChanges: 'Saqlash', cancel: 'Bekor qilish', episodes: 'Qismlar', season: 'Fasl',
  episode: 'Qism', episodeTitle: 'Qism nomi', episodeDescription: 'Qism tavsifi',
  videoFile: 'Video fayl', addEpisode: 'Qism qo‘shish', noEpisodes: 'Qismlar hali yo‘q',
  openNotifications: 'Bildirishnomalarni ochish', notificationUpdates: 'Qayta ishlash holati va yangi media',
  stillProcessing: 'Video hali qayta ishlanmoqda', addedToLibrary: 'Kutubxonaga qo‘shildi',
  welcomeBack: 'Xush kelibsiz', signInHint: 'Tomosha qilishni davom ettirish uchun kiring',
  email: 'Email', password: 'Parol', signIn: 'Kirish', noAccount: 'Hisobingiz yo‘qmi?',
  createAccount: 'Yaratish', loginSuccess: 'Kirish bajarildi', invalidCredentials: 'Email yoki parol noto‘g‘ri',
  loadMediaError: 'Media ma’lumotlarini yuklab bo‘lmadi.', backHome: 'Bosh sahifaga',
  chooseEpisode: 'Qismni tanlang', chooseEpisodeHint: 'Tomosha qilish uchun avval fasl va qismni tanlang.',
  noEpisodesReady: 'Tayyor qismlar hali yo‘q', episodeProcessing: 'Qism qayta ishlanmoqda',
  episodeFailed: 'Qismni qayta ishlashda xato', queuedForProcessing: 'Qism yuklandi va navbatga qo‘shildi',
  uploadedFile: 'Yuklangan fayl',
  episodeFileRequired: 'Qism video faylini tanlang', autoEpisodeTitle: 'Nomi avtomatik yaratiladi',
}

const en: Translation = {
  home: 'Home', movies: 'Movies', series: 'Series', anime: 'Anime', cartoons: 'Cartoons',
  favorites: 'Favorites', new: 'New', newReleases: 'New Releases', searchPlaceholder: 'Search titles...',
  profiles: 'Profiles', adminDashboard: 'Admin Dashboard', signOut: 'Sign Out', language: 'Language',
  welcome: 'Welcome to NovaStream', addMedia: 'Add media to get started',
  continueWatching: 'Continue Watching', tvSeries: 'TV Series', topRated: 'Top Rated',
  movie: 'Movie', documentary: 'Documentary', playNow: 'Play Now', moreInfo: 'More Info',
  featured: 'Featured', notifications: 'Notifications', processing: 'Processing',
  pending: 'Pending', error: 'Error',
  readyToWatch: 'Ready to watch', noNotifications: 'No notifications yet',
  favoritesKicker: 'Your collection', favoritesDescription: 'The titles you love most, ready when you are.',
  noFavorites: 'No favorites yet', noFavoritesHint: 'Tap the heart on any title to save it here.',
  addedToFavorites: 'Added to Favorites', removedFromFavorites: 'Removed from Favorites',
  favoriteUpdateFailed: 'Could not update Favorites',
  allTitles: 'All Titles', titlesAvailable: 'titles available', filters: 'Filters',
  filtersHint: 'Choose a genre and sorting.', reset: 'Reset', genre: 'Genre', all: 'All',
  sort: 'Sort', newest: 'Newest', az: 'A-Z', documentaries: 'Documentaries',
  previous: 'Previous', next: 'Next', page: 'Page', of: 'of',
  searchResults: 'Search Results', showingResults: 'Showing results for', enterSearch: 'Enter a search term',
  noResults: 'No results found', tryAnotherSearch: 'Try a different search term',
  quality: 'Quality', speed: 'Speed', normal: 'Normal', retry: 'Retry',
  streamError: 'Stream error. Please try again.', loadStreamError: 'Failed to load stream.',
  adminTitle: 'Admin Dashboard', controlPanel: 'NovaStream Control Panel', overview: 'Overview',
  mediaLibrary: 'Media Library', users: 'Users', upload: 'Upload', addMediaButton: 'Add Media',
  totalUsers: 'Total Users', totalMedia: 'Total Media', readyToStream: 'Ready to Stream',
  viewsThisWeek: 'Views This Week', platformActivity: 'Platform Activity',
  searchMedia: 'Search media...', title: 'Title', type: 'Type', status: 'Status',
  added: 'Added', actions: 'Actions', refreshStatuses: 'Refresh statuses',
  uploadTitle: 'Upload Media', description: 'Description', releaseDate: 'Release date',
  runtime: 'Runtime', rating: 'Rating', poster: 'Poster', backdrop: 'Backdrop',
  tmdbId: 'TMDB ID (optional)', uploadAndProcess: 'Upload & Process',
  playbackMode: 'Playback mode', standaloneVideo: 'Standalone video', episodicVideo: 'Episodic title',
  saveChanges: 'Save Changes', cancel: 'Cancel', episodes: 'Episodes', season: 'Season',
  episode: 'Episode', episodeTitle: 'Episode title', episodeDescription: 'Episode description',
  videoFile: 'Video file', addEpisode: 'Add Episode', noEpisodes: 'No episodes yet',
  openNotifications: 'Open notifications', notificationUpdates: 'Processing updates and fresh releases',
  stillProcessing: 'Still processing video qualities', addedToLibrary: 'Added to the library',
  welcomeBack: 'Welcome back', signInHint: 'Sign in to continue streaming',
  email: 'Email', password: 'Password', signIn: 'Sign In', noAccount: "Don't have an account?",
  createAccount: 'Create one', loginSuccess: 'Welcome back!', invalidCredentials: 'Invalid credentials',
  loadMediaError: 'Could not load this title.', backHome: 'Back home',
  chooseEpisode: 'Choose an episode', chooseEpisodeHint: 'Select a season and episode before watching.',
  noEpisodesReady: 'No episodes are ready yet', episodeProcessing: 'Episode is processing',
  episodeFailed: 'Episode processing failed', queuedForProcessing: 'Episode uploaded and queued',
  uploadedFile: 'Uploaded file',
  episodeFileRequired: 'Choose an episode video file', autoEpisodeTitle: 'The title will be generated automatically',
}

export const translations = { ru, uz, en }

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ru'
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'uz' || saved === 'en' ? saved : 'ru'
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    const onStorage = () => setLanguageState(getInitialLanguage())
    window.addEventListener('storage', onStorage)
    window.addEventListener('nova-language-change', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('nova-language-change', onStorage)
    }
  }, [])

  const setLanguage = (next: Language) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLanguageState(next)
    window.dispatchEvent(new Event('nova-language-change'))
  }

  return { language, setLanguage, t: translations[language] }
}
