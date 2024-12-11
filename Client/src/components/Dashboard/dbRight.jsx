import React from 'react'
import { Route, Routes } from 'react-router-dom'
import {
  DashboardHeader,
  DashboardHome,
  DashboardItems,
  DashboardNewItem,
  DashboardOrders,
  DashboardUsers,
} from '../../components'

const DashboardRight = () => {
  return (
    <div className='flex flex-col py-8 px-12 flex-1 h-full'>
      <DashboardHeader />
      <div className='flex flex-col flex-1 overflow-y-scroll scrollbar-none'>
        <Routes>
          <Route path='/home' element={<DashboardHome />} />
          <Route path='/orders' element={<DashboardOrders />} />
          <Route path='/items' element={<DashboardItems />} />
          <Route path='/newItem' element={<DashboardNewItem />} />
          <Route path='/users' element={<DashboardUsers />} />
        </Routes>
      </div>
    </div>
  )
}

export default DashboardRight
