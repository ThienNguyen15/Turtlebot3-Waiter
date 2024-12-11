import React, { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import '../assets/css/Swiper.css'
import 'swiper/css/bundle'
import { useSelector } from 'react-redux'
import { SliderCard } from '../components'

const Slider = () => {
  const products = useSelector((state) => state.products)
  const [fruits, setFruits] = useState(null)
  useEffect(() => {
    setFruits(products?.filter((data) => data.product_category === 'Fruits'))
    console.log(fruits)
  }, [products])

  return (
    <div className='w-full pt-16'>
      <Swiper
        slidesPerView={3}
        centeredSlides={false}
        spaceBetween={26}
        grabCursor={true}
        className='mySwiper'
      >
        {fruits &&
          fruits.map((data, i) => (
            <SwiperSlide key={i}>
              <SliderCard key={i} data={data} index={i} />
            </SwiperSlide>
          ))}
      </Swiper>
    </div>
  )
}

export default Slider
