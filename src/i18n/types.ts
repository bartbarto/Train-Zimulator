export type Locale = 'en' | 'nl' | 'uwu'

export interface LocaleOption {
  id: Locale
  label: string
}

export const LOCALES: LocaleOption[] = [
  { id: 'en', label: 'English' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'uwu', label: 'uWu ✨' },
]

export type MessageTree = { [key: string]: string | MessageTree }
