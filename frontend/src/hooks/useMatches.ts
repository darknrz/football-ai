import { useState, useEffect, useCallback } from 'react'
import { fetchTodayMatches, syncMatches } from '../services/api'
import type { Match } from '../services/api'

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTodayMatches()
      setMatches(data)
    } catch {
      setError('No se pudieron cargar los partidos')
    } finally {
      setLoading(false)
    }
  }, [])

  const sync = useCallback(async () => {
    try {
      setSyncing(true)
      setError(null)
      await syncMatches()
      await load()
    } catch {
      setError('Error al sincronizar con la API')
    } finally {
      setSyncing(false)
    }
  }, [load])

  useEffect(() => { load() }, [load])

  return { matches, loading, syncing, error, reload: load, sync }
}