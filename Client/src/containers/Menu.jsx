import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getAllProducts } from '../api'
import { Cart, FilterSection, Header, Home, HomeSlider } from '../components'
import { setAllProducts } from '../context/actions/productActions'

const Menu = () => {
    const products = useSelector((state) => state.products)
    const isCart = useSelector((state) => state.isCart)
  
    const dispatch = useDispatch()
  
    useEffect(() => {
      if (!products) {
        getAllProducts().then((data) => {
          dispatch(setAllProducts(data))
        })
      }
    }, [])
  
    return (
      <main className='w-screen min-h-screen flex items-center justify-start flex-col bg-white'>
        <Header />
        <div style={{marginTop: '120px'}} className='w-full flex flex-col items-start justify-center px-6 md:px-24 2xl:px-96 gap-12 pb-24'>
          <FilterSection />
        </div>
  
        {isCart && <Cart />}
      </main>
    )
  }

export default Menu
