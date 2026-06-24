'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Role, hasPermission } from '@/lib/auth/permission-service'

interface PermissionGateProps {
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ action, children, fallback = null }: PermissionGateProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkPermission() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.role) {
            setIsAllowed(hasPermission(data.role as Role, action))
            return
          }
        }
        setIsAllowed(false)
      } catch {
        setIsAllowed(false)
      }
    }
    
    checkPermission()
  }, [action])

  if (isAllowed === null) {
    return null // or a loading spinner
  }

  return isAllowed ? <>{children}</> : <>{fallback}</>
}
