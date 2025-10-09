import { create } from 'zustand'
import axios from 'axios'

const API_BASE_URL = '/api'

export const useOptimizationStore = create((set, get) => ({
  // State
  stations: [],
  optimizationResult: null,
  scenarios: [],
  kpis: {
    totalCost: 0,
    stationsServed: 0,
    bikesRebalanced: 0,
    fairnessScore: 0,
  },
  loading: false,
  error: null,

  // Actions
  fetchStations: async (date = null) => {
    try {
      set({ loading: true, error: null })
      const params = date ? { date } : {}
      const response = await axios.get(`${API_BASE_URL}/stations`, { params })
      set({ stations: response.data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  runOptimization: async (constraints) => {
    try {
      set({ loading: true, error: null })
      const response = await axios.post(`${API_BASE_URL}/optimize/run`, {
        constraints,
        target_date: new Date().toISOString().split('T')[0]
      })
      set({ optimizationResult: response.data, loading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  runSimulation: async (scenario) => {
    try {
      set({ loading: true, error: null })
      const response = await axios.post(`${API_BASE_URL}/simulate/scenario`, scenario)
      set({ loading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  compareScenarios: async (scenarios) => {
    try {
      set({ loading: true, error: null })
      const response = await axios.post(`${API_BASE_URL}/simulate/compare`, scenarios)
      set({ loading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  fetchKPIs: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/kpis`, {
        params: { start_date: startDate, end_date: endDate }
      })
      set({ kpis: response.data.kpis })
    } catch (error) {
      console.error('Failed to fetch KPIs:', error)
    }
  },

  queryAgent: async (query, context = null) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/agent/query`, {
        query,
        context,
        include_visualization: true
      })
      return response.data
    } catch (error) {
      console.error('Agent query failed:', error)
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
