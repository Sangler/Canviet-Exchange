import React from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CProgress,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilCloudDownload, cilBasket, cilChartPie } from '@coreui/icons'
import { CChartLine, CChartBar } from '@coreui/react-chartjs'

const Dashboard = () => {
  const widgets = [
    {
      title: 'Users',
      value: '26K',
      color: 'primary',
      icon: cilPeople,
      progress: 25,
      period: '(-12.4%)',
      trend: 'down'
    },
    {
      title: 'Income',
      value: '$6,200',
      color: 'info', 
      icon: cilCloudDownload,
      progress: 50,
      period: '(40.9%)',
      trend: 'up'
    },
    {
      title: 'Conversion Rate',
      value: '2.49%',
      color: 'warning',
      icon: cilBasket,
      progress: 75,
      period: '(84.7%)',
      trend: 'up'
    },
    {
      title: 'Sessions',
      value: '44K',
      color: 'success',
      icon: cilChartPie,
      progress: 100,
      period: '(-23.6%)',
      trend: 'down'
    }
  ]

  const users = [
    { 
      name: 'Yiorgos Avraamu', 
      type: 'New', 
      registered: 'Jan 1, 2023', 
      country: '🇺🇸', 
      usage: 50, 
      period: 'Jun 11, 2023 - Jul 10, 2023',
      payment: '$50.00',
      activity: '10 sec ago',
      avatar: 'YA'
    },
    { 
      name: 'Avram Tarasios', 
      type: 'Recurring', 
      registered: 'Jan 1, 2023', 
      country: '🇧🇷', 
      usage: 22, 
      period: 'Jun 11, 2023 - Jul 10, 2023',
      payment: '$22.00',
      activity: '5 minutes ago',
      avatar: 'AT'
    },
    { 
      name: 'Quintin Ed', 
      type: 'New', 
      registered: 'Jan 1, 2023', 
      country: '🇮🇳', 
      usage: 74, 
      period: 'Jun 11, 2023 - Jul 10, 2023',
      payment: '$74.00',
      activity: '1 hour ago',
      avatar: 'QE'
    },
    { 
      name: 'Enéas Kwadwo', 
      type: 'New', 
      registered: 'Jan 1, 2023', 
      country: '🇫🇷', 
      usage: 98, 
      period: 'Jun 11, 2023 - Jul 10, 2023',
      payment: '$98.00',
      activity: 'Last month',
      avatar: 'EK'
    },
  ]

  return (
    <>
      <CRow>
        {widgets.map((widget, index) => (
          <CCol sm={6} lg={3} key={index}>
            <CCard className="mb-4">
              <CCardBody>
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="fs-6 fw-semibold text-medium-emphasis">
                      {widget.title}
                    </div>
                    <div className="fs-4 fw-semibold">{widget.value}</div>
                    <small className={`text-${widget.trend === 'up' ? 'success' : 'danger'}`}>
                      {widget.period}
                    </small>
                  </div>
                  <div className={`bg-${widget.color} text-white p-3 rounded`}>
                    <CIcon icon={widget.icon} size="xl" />
                  </div>
                </div>
                <CProgress 
                  className="mt-3 mb-0" 
                  color={widget.color} 
                  value={widget.progress} 
                />
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Traffic</strong>
              <small className="text-medium-emphasis"> January - July 2023</small>
            </CCardHeader>
            <CCardBody>
              <CChartLine
                style={{ height: '300px' }}
                data={{
                  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                  datasets: [
                    {
                      label: 'Visits',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                      data: [29703, 31200, 28900, 32100, 30500, 33800, 35200],
                    },
                    {
                      label: 'Users',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderColor: 'rgba(16, 185, 129, 1)',
                      pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                      data: [24093, 25400, 23200, 26800, 25100, 28200, 29500],
                    },
                    {
                      label: 'Pageviews',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderColor: 'rgba(245, 158, 11, 1)',
                      pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                      data: [78706, 82100, 75800, 85200, 79300, 89100, 92400],
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                    y: {
                      ticks: {
                        beginAtZero: true,
                        maxTicksLimit: 5,
                        stepSize: Math.ceil(100000 / 5),
                      },
                    },
                  },
                  elements: {
                    line: {
                      tension: 0.4,
                    },
                    point: {
                      radius: 0,
                      hitRadius: 10,
                      hoverRadius: 4,
                      hoverBorderWidth: 3,
                    },
                  },
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Users</strong>
            </CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      <CIcon icon={cilPeople} />
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">User</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">Country</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Usage</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">Payment Method</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Activity</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {users.map((user, index) => (
                    <CTableRow v-for="item in tableItems" key={index}>
                      <CTableDataCell className="text-center">
                        <div className="avatar avatar-md">
                          <span className="avatar-initials">{user.avatar}</span>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div>{user.name}</div>
                        <div className="small text-medium-emphasis text-nowrap">
                          <span className={`badge badge-sm bg-${user.type === 'New' ? 'success' : 'info'} me-1`}>
                            {user.type}
                          </span>
                          Registered: {user.registered}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <span className="text-nowrap">{user.country}</span>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex justify-content-between text-nowrap">
                          <div className="fw-semibold">{user.usage}%</div>
                        </div>
                        <CProgress thin color="success" value={user.usage} className="mt-2" />
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <span className="fw-semibold text-nowrap">{user.payment}</span>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="small text-medium-emphasis text-nowrap">Last login {user.activity}</div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
