export interface LaunchParams {
  skipMenu: boolean
  locomotiveId: string | null
  routeId: string | null
}

/** URL overrides for menu skip and pre-selected content (?skipMenu=1&loco=mr08&route=valley). */
export function parseLaunchParams(): LaunchParams {
  const params = new URLSearchParams(window.location.search)
  const skipMenu = params.get('skipMenu') === '1' || params.get('autostart') === '1'
  return {
    skipMenu,
    locomotiveId: params.get('loco') ?? params.get('locomotive'),
    routeId: params.get('route'),
  }
}
