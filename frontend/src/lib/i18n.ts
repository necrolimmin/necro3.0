'use client'
import { useEffect, useState } from 'react'

export type Language = 'ru' | 'uz' | 'en'

const STORAGE_KEY = 'nova_lang'

export const translations = {
  ru: {
    home: 'Главная',
    movies: 'Фильмы',
    series: 'Сериалы',
    new: 'Новинки',
    searchPlaceholder: 'Искать фильмы...',
    profiles: 'Профили',
    adminDashboard: 'Админ-панель',
    signOut: 'Выйти',
    welcome: 'Добро пожаловать в NovaStream',
    addMedia: 'Добавьте фильм, чтобы начать',
    continueWatching: 'Продолжить просмотр',
    tvSeries: 'Сериалы',
    topRated: 'Лучшие по рейтингу',
    movie: 'Фильм',
    documentary: 'Документальный',
    playNow: 'Смотреть',
    moreInfo: 'Подробнее',
    language: 'Язык',
  },
  uz: {
    home: 'Bosh sahifa',
    movies: 'Filmlar',
    series: 'Seriallar',
    new: 'Yangilar',
    searchPlaceholder: 'Film qidirish...',
    profiles: 'Profillar',
    adminDashboard: 'Admin paneli',
    signOut: 'Chiqish',
    welcome: 'NovaStreamga xush kelibsiz',
    addMedia: 'Boshlash uchun film qo‘shing',
    continueWatching: 'Ko‘rishda davom etish',
    tvSeries: 'Seriallar',
    topRated: 'Yuqori reyting',
    movie: 'Film',
    documentary: 'Hujjatli',
    playNow: 'Ko‘rish',
    moreInfo: 'Batafsil',
    language: 'Til',
  },
  en: {
    home: 'Home',
    movies: 'Movies',
    series: 'Series',
    new: 'New',
    searchPlaceholder: 'Search titles...',
    profiles: 'Profiles',
    adminDashboard: 'Admin Dashboard',
    signOut: 'Sign Out',
    welcome: 'Welcome to NovaStream',
    addMedia: 'Add media to get started',
    continueWatching: 'Continue Watching',
    tvSeries: 'TV Series',
    topRated: 'Top Rated',
    movie: 'Movie',
    documentary: 'Documentary',
    playNow: 'Play Now',
    moreInfo: 'More Info',
    language: 'Language',
  },
}

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
