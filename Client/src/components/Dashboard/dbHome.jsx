import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getAllProducts, getAllOrders } from '../../api'
import { setAllProducts } from '../../context/actions/productActions'
import { setOrders } from '../../context/actions/ordersActions'
import { CChart } from '@coreui/react-chartjs'

const DashboardHome = () => {
  const products = useSelector((state) => state.products)
  const orders = useSelector((state) => state.orders)
  const dispatch = useDispatch()

  const signature = products?.filter((item) => item.product_category === 'Signature')
  const noodles = products?.filter((item) => item.product_category === 'Noodles')
  const rice = products?.filter((item) => item.product_category === 'Rice')
  const chicken = products?.filter((item) => item.product_category === 'Chicken')
  const drinks = products?.filter((item) => item.product_category === 'Drinks')
  const fruits = products?.filter((item) => item.product_category === 'Fruits')
  const desserts = products?.filter((item) => item.product_category === 'Desserts')
  const sides = products?.filter((item) => item.product_category === 'Sides')

  const total_orders = orders?.filter((order) => order.status === 'paid')
  const preparing = orders?.filter((order) => order.progress === 'preparing')
  const finished = orders?.filter((order) => order.progress === 'finished')
  const cancelled = orders?.filter((order) => order.progress === 'cancelled')
  useEffect(() => {
    if (!products) {
      getAllProducts().then((data) => {
        dispatch(setAllProducts(data))
      })
    }

    if (!orders) {
      getAllOrders().then((data) => {
        dispatch(setOrders(data))
      })
    }
  }, [products, orders, dispatch])

  return (
    <div className='flex items-center justify-center flex-col pt-6 w-full h-full'>
      <div className='grid w-full grid-cols-1 md:grid-cols-2 gap-4 h-full'>
        <div className='flex items-center justify-center'>
          <div className='w-340 md:w-508'>
            <CChart
              type='bar'
              data={{
                labels: [
                  'Signature',
                  'Noodles',
                  'Rice',
                  'Chicken',
                  'Drinks',
                  'Fruits',
                  'Desserts',
                  'Sides',
                ],
                datasets: [
                  {
                    label: 'Category wise Count',
                    backgroundColor: '#f87979',
                    data: [
                      signature?.length,
                      noodles?.length,
                      rice?.length,
                      chicken?.length,
                      drinks?.length,
                      fruits?.length,
                      desserts?.length,
                      sides?.length,
                    ],
                  },
                ],
              }}
            />
          </div>
        </div>
        <div className='w-full h-full flex items-center justify-center'>
          <div className='w-275 md:w-460'>
            <CChart
              type='doughnut'
              data={{
                labels: [
                  'Orders',
                  'Preparing',
                  'Finished',
                  'Cancelled',
                ],
                datasets: [
                  {
                    backgroundColor: [
                      '#4CAF50',
                      '#FFB74D',
                      '#64B5F6',
                      '#E57373',
                    ],
                    data: [total_orders?.length, preparing?.length, finished?.length, cancelled?.length],
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHome
