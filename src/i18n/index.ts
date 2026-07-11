import { en } from './messages/en'
import { nl } from './messages/nl'
import { uwu } from './messages/uwu'
import type { Locale, MessageTree } from './types'

const STORAGE_KEY = 'trainsim.locale.v1'

const catalogs: Record<Locale, MessageTree> = { en, nl, uwu }

function resolve(tree: MessageTree, key: string): string | undefined {
  const parts = key.split('.')
  let node: string | MessageTree | undefined = tree
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

let currentLocale: Locale = loadLocale()

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'nl' || stored === 'uwu') return stored
  } catch {
    /* ignore */
  }
  return 'en'
}

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = locale === 'uwu' ? 'en' : locale
}

export function t(key: string, params?: Record<string, string | number>): string {
  const catalog = catalogs[currentLocale]
  const value = resolve(catalog, key) ?? resolve(en, key)
  if (!value) return key
  return interpolate(value, params)
}

export { en, nl, uwu }
