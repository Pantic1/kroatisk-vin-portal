'use client'
import { useEffect, useState } from 'react'
import CartDrawer from './CartDrawer'

export default function CartDrawerMount() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openOnUpdate = () => setOpen(true)
    window.addEventListener('cartUpdated', openOnUpdate)
    return () => window.removeEventListener('cartUpdated', openOnUpdate)
  }, [])

  return <CartDrawer open={open} onClose={() => setOpen(false)} />
}
