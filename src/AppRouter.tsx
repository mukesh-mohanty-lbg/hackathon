import { useEffect, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { LoginPage } from '@/pages/LoginPage'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { StaffDashboard } from '@/pages/StaffDashboard'
import { IndividualDashboard } from '@/pages/IndividualDashboard'
import { StaffManagement } from '@/pages/StaffManagement'
import { StaffAvailability } from '@/pages/StaffAvailability'
import { CreateEvent } from '@/pages/CreateEvent'
import { EventsList } from '@/pages/EventsList'
import { EventDetail } from '@/pages/EventDetail'
import { AttendancePage } from '@/pages/AttendancePage'
import { EventHistory } from '@/pages/EventHistory'
import { ProfilePage } from '@/pages/ProfilePage'
import { MyEventList } from '@/pages/MyEventList'
import { StaffAllocation } from '@/pages/StaffAllocation'
import Layout from '@/components/custom/Layout'

type Page =
  | 'dashboard'
  | 'staff'
  | 'staff-availability'
  | 'staff-allocation'
  | 'create-event'
  | 'events'
  | 'my-events'
  | 'event-detail'
  | 'attendance'
  | 'history'
  | 'profile'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  staff: 'Staff Management',
  'staff-availability': 'Staff Reporting',
  'staff-allocation': 'Staff Allocation',
  'create-event': 'Create Event',
  events: 'Events',
  'my-events': 'My Events',
  'event-detail': 'Event Detail',
  attendance: 'Attendance',
  history: 'Event History',
  profile: 'My Profile',
}

const PATH_TO_PAGE: Record<string, Page> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/staff': 'staff',
  '/staff-availability': 'staff-availability',
  '/staff-allocation': 'staff-allocation',
  '/create-event': 'create-event',
  '/events': 'events',
  '/my-events': 'my-events',
  '/event-detail': 'event-detail',
  '/attendance': 'attendance',
  '/history': 'history',
  '/profile': 'profile',
}

const PAGE_TO_PATH: Record<Page, string> = {
  dashboard: '/dashboard',
  staff: '/staff',
  'staff-availability': '/staff-availability',
  'staff-allocation': '/staff-allocation',
  'create-event': '/create-event',
  events: '/events',
  'my-events': '/my-events',
  'event-detail': '/event-detail',
  attendance: '/attendance',
  history: '/history',
  profile: '/profile',
}

const ALL_PAGES: Page[] = [
  'dashboard',
  'staff',
  'staff-availability',
  'staff-allocation',
  'create-event',
  'events',
  'my-events',
  'event-detail',
  'attendance',
  'history',
  'profile',
]

const isPage = (value: string): value is Page => ALL_PAGES.includes(value as Page)

const readRouteState = () => {
  const page = PATH_TO_PAGE[window.location.pathname] ?? 'dashboard'
  const search = new URLSearchParams(window.location.search)
  const params: Record<string, string> = {}
  search.forEach((v, k) => {
    params[k] = v
  })
  return { page, params }
}

const buildUrl = (page: Page, params: Record<string, string> = {}) => {
  const path = PAGE_TO_PATH[page]
  const qs = new URLSearchParams(params).toString()
  return qs ? `${path}?${qs}` : path
}

export function AppRouter() {
  const { currentUser } = useApp()
  const initial = readRouteState()
  const [page, setPage] = useState<Page>(initial.page)
  const [pageParams, setPageParams] = useState<Record<string, string>>(initial.params)

  useEffect(() => {
    const onPopState = () => {
      const next = readRouteState()
      setPage(next.page)
      setPageParams(next.params)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (nextPage: string, params: Record<string, string> = {}) => {
    const safePage: Page = isPage(nextPage) ? nextPage : 'dashboard'
    setPage(safePage)
    setPageParams(params)
    window.history.pushState({}, '', buildUrl(safePage, params))
  }

  if (!currentUser) return <LoginPage />

  const isAdmin = currentUser.role === 'admin'

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return isAdmin
          ? <AdminDashboard onNavigate={navigate} />
          : currentUser.role === 'individual'
            ? <IndividualDashboard onNavigate={navigate} />
            : <StaffDashboard onNavigate={navigate} />
      case 'staff':
        return isAdmin ? <StaffManagement onNavigate={navigate} /> : null
      case 'staff-availability':
        return isAdmin ? <StaffAvailability /> : null
      case 'staff-allocation':
        return isAdmin ? <StaffAllocation onNavigate={navigate} /> : null
      case 'create-event':
        return <CreateEvent onNavigate={navigate} />
      case 'events':
        return <EventsList onNavigate={navigate} />
      case 'my-events':
        return currentUser.role === 'individual' ? <MyEventList onNavigate={navigate} /> : <EventsList onNavigate={navigate} />
      case 'event-detail':
        return pageParams.instanceId ? (
          <EventDetail instanceId={pageParams.instanceId} onNavigate={navigate} />
        ) : (
          <EventsList onNavigate={navigate} />
        )
      case 'attendance':
        return pageParams.instanceId ? (
          <AttendancePage instanceId={pageParams.instanceId} onNavigate={navigate} />
        ) : (
          <EventsList onNavigate={navigate} />
        )
      case 'history':
        return <EventHistory onNavigate={navigate} />
      case 'profile':
        return <ProfilePage />
      default:
        return <AdminDashboard onNavigate={navigate} />
    }
  }

  return (
    <Layout currentPage={page} onNavigate={navigate} pageTitle={PAGE_TITLES[page]}>
      {renderPage()}
    </Layout>
  )
}
