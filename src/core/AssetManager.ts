import { LoadingManager, Texture, TextureLoader } from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

export type ProgressHandler = (loaded: number, total: number, url: string) => void

/**
 * Asynchronous, cached asset loading for GLTF/GLB models and textures, with
 * aggregate progress reporting via a shared LoadingManager. Models are cached
 * by URL so repeated requests resolve immediately (lazy + deduplicated).
 */
export class AssetManager {
  private readonly manager = new LoadingManager()
  private readonly gltfLoader: GLTFLoader
  private readonly textureLoader: TextureLoader
  private readonly gltfCache = new Map<string, Promise<GLTF>>()
  private readonly textureCache = new Map<string, Promise<Texture>>()

  onProgress: ProgressHandler | null = null

  constructor() {
    this.gltfLoader = new GLTFLoader(this.manager)
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    this.gltfLoader.setDRACOLoader(draco)
    this.textureLoader = new TextureLoader(this.manager)

    this.manager.onProgress = (url, loaded, total) => this.onProgress?.(loaded, total, url)
  }

  loadGLTF(url: string): Promise<GLTF> {
    const cached = this.gltfCache.get(url)
    if (cached) return cached
    const promise = this.gltfLoader.loadAsync(url)
    this.gltfCache.set(url, promise)
    return promise
  }

  loadTexture(url: string): Promise<Texture> {
    const cached = this.textureCache.get(url)
    if (cached) return cached
    const promise = this.textureLoader.loadAsync(url)
    this.textureCache.set(url, promise)
    return promise
  }

  /** Fetch and parse a JSON resource (content specs, scenarios, etc.). */
  async loadJSON<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`)
    return (await response.json()) as T
  }

  dispose(): void {
    this.gltfCache.clear()
    this.textureCache.clear()
  }
}
