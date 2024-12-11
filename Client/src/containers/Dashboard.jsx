import React from 'react'
import { DashboardLeft, DashboardRight } from '../components'

const Dashboard = () => {
  return (
    <div className='w-screen h-screen flex items-center bg-white'>
      <DashboardLeft />
      <DashboardRight />
    </div>
  )
}

export default Dashboard
