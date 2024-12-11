import React from 'react'
import { DataTable } from '../../components'
import { useDispatch, useSelector } from 'react-redux'
import { PiCurrencyCircleDollar } from '../../assets/icons'
import { deleteProduct, getAllProducts } from '../../api'
import { alertNULL, alertSuccess } from '../../context/actions/alertActions'
import { setAllProducts } from '../../context/actions/productActions'

const DashboardItems = () => {
  const products = useSelector((state) => state.products)
  const dispatch = useDispatch()
  return (
    <div className='flex items-center justify-self-center gap-4 pt-6 w-full'>
      <DataTable
        columns={[
          {
            title: 'Image',
            field: 'imageURL',
            render: (rowData) => (
              <img
                src={rowData.imageURL}
                className='w-32 h-16 object-contain rounded-md'
              />
            ),
            align: 'center',
            cellStyle: {
              position: 'relative',
              left: '29px',
            },
          },
          {
            title: 'Name',
            field: 'product_name',
          },
          {
            title: 'Category',
            field: 'product_category',
          },
          {
            title: 'Price',
            field: 'product_price',
            render: (rowData) => (
              <p className='text-xl font-semibold text-textColor flex items-center justify-center '>
                <PiCurrencyCircleDollar className='text-red-400' />
                {parseFloat(rowData.product_price).toFixed(2)}
              </p>
            ),
            align: 'center',
            cellStyle: {
              position: 'relative',
              right: '14px',
            },
          },
        ]}
        data={products || []}
        title='List of Dishes'
        actions={[
          {
            icon: 'edit',
            tooltip: 'Edit Data',
            onClick: (event, rowData) => {
              alert('Do you want to edit dish with the id: ' + rowData.productId + ' ?')
            },
            // Edit price name
          },
          {
            icon: 'delete',
            tooltip: 'Delete Data',
            onClick: (event, rowData) => {
              if (
                window.confirm('Do you want to perform this aciton ?')
              ) {
                deleteProduct(rowData.productId).then((res) => {
                  dispatch(alertSuccess('Product Deleted '))
                  setInterval(() => {
                    dispatch(alertNULL())
                  }, 3000)
                  getAllProducts().then((data) => {
                    dispatch(setAllProducts(data))
                  })
                })
              }
            },
          },
        ]}
      />
    </div>
  )
}

export default DashboardItems
