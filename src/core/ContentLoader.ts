import type { LocomotiveSpec, RouteSpec } from '@/data/types'
import type { AssetManager } from './AssetManager'

export interface ContentManifest {
  locomotives: string[]
  routes: string[]
  defaults: { locomotive: string; route: string }
}

const BASE = `${import.meta.env.BASE_URL}data`

/**
 * Loads data-driven content (manifest, locomotives, routes) as JSON. This is
 * the only place that knows the on-disk layout, so new content folders or a
 * remote content server can be supported by changing this class alone.
 */
export class ContentLoader {
  private readonly assets: AssetManager

  constructor(assets: AssetManager) {
    this.assets = assets
  }

  loadManifest(): Promise<ContentManifest> {
    return this.assets.loadJSON<ContentManifest>(`${BASE}/manifest.json`)
  }

  loadLocomotive(id: string): Promise<LocomotiveSpec> {
    return this.assets.loadJSON<LocomotiveSpec>(`${BASE}/locomotives/${id}.json`)
  }

  loadRoute(id: string): Promise<RouteSpec> {
    return this.assets.loadJSON<RouteSpec>(`${BASE}/routes/${id}.json`)
  }
}
