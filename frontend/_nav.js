import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilNotes,
  cilPencil,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
  cilUser,
  cilCreditCard,
  cilSettings,
  cilHistory
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  // Dashboard now visible only to admin users
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/',
    roles: 'admin',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  // Personal Info page for regular users
  {
    component: CNavItem,
    name: 'Personal Info',
    to: '/personal-info',
    roles: 'user',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Transfer',
  },
  {
    component: CNavItem,
    name: 'Send Money',
    to: '/transfers',
    icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'History Transaction',
    to: '/transfers-history',
    // visible to users only (not admin)
    roles: 'user',
    icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Analytics',
    to: '/analytics',
    roles: "admin",
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Settings & Profile',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Theme',
  },
  {
    component: CNavItem,
    name: 'Colors',
    to: '/colors',
    icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Typography',
    to: '/typography',
    roles: "admin",
    icon: <CIcon icon={cilPencil} customClassName="nav-icon" />,
  },

  // Components section removed per request
]

export default _nav
