"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'

interface ServiceStatus {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  responseTime?: number
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  responseTime: number
  services: {
    openai: ServiceStatus
    database: ServiceStatus
    stripe: ServiceStatus
  }
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  degraded: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  unhealthy: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
}

export default function ApiHealthStatus({ className = "" }: { className?: string }) {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/health', {
        cache: 'no-store'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setHealthData(data)
        setLastCheck(new Date())
      } else {
        throw new Error(data.error || 'Health check failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
      console.error('Health check error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getOverallStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'All systems operational'
      case 'degraded': return 'Some systems have issues'
      case 'unhealthy': return 'System issues detected'
      default: return 'Unknown status'
    }
  }

  if (loading && !healthData) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
          <span className="text-gray-700">Checking system status...</span>
        </div>
      </div>
    )
  }

  if (error && !healthData) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">Health check failed: {error}</span>
          </div>
          <button
            onClick={fetchHealthData}
            className="text-red-600 hover:text-red-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    )
  }

  if (!healthData) return null

  const overallConfig = statusConfig[healthData.status]
  const OverallIcon = overallConfig.icon

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
    >
      {/* Overall Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${overallConfig.bgColor} ${overallConfig.borderColor} border`}>
            <OverallIcon className={`w-5 h-5 ${overallConfig.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">System Status</h3>
            <p className={`text-sm ${overallConfig.color}`}>
              {getOverallStatusText(healthData.status)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right text-sm text-gray-500">
            <div>Response: {healthData.responseTime}ms</div>
            {lastCheck && (
              <div>Updated: {lastCheck.toLocaleTimeString()}</div>
            )}
          </div>
          <button
            onClick={fetchHealthData}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Service Details */}
      <div className="space-y-3">
        {Object.entries(healthData.services).map(([serviceName, service]) => {
          const config = statusConfig[service.status]
          const ServiceIcon = config.icon
          
          return (
            <motion.div
              key={serviceName}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-center gap-3">
                <ServiceIcon className={`w-4 h-4 ${config.color}`} />
                <div>
                  <span className="font-medium text-gray-900 capitalize">
                    {serviceName === 'openai' ? 'OpenAI' : serviceName}
                  </span>
                  <p className="text-sm text-gray-600">{service.message}</p>
                </div>
              </div>
              
              {service.responseTime && (
                <div className="text-sm text-gray-500">
                  {service.responseTime}ms
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{healthData.summary.healthy} Healthy</span>
          </div>
          {healthData.summary.degraded > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{healthData.summary.degraded} Degraded</span>
            </div>
          )}
          {healthData.summary.unhealthy > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{healthData.summary.unhealthy} Unhealthy</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}