import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Avatar, Logo } from '../assets'
import { motion } from 'framer-motion'
import { buttonClick, slideTop } from '../animations'
import { MdLogout, MdFoodBank } from '../assets/icons'
import { useDispatch, useSelector } from 'react-redux'
import { getAuth } from 'firebase/auth'
import { app } from '../config/firebase.config'
import { setUserNull } from '../context/actions/userActions'
import { setCartOn } from '../context/actions/displayCartActions'
// import { isActiveStyles, isNotActiveStyles } from '../utils/style'

const Header = ({ isJoystickActive }) => {  
  const user = useSelector((state) => state.user)
  const cart = useSelector((state) => state.cart)

  const [isMenu, setIsMenu] = useState(false)

  const firebaseAuth = getAuth(app)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const signOut = () => {
    firebaseAuth
      .signOut()
      .then(() => {
        dispatch(setUserNull())
        navigate('/login', { replace: true })
      })
      .catch((err) => console.log(err))
  }

  return (
    <header className='fixed backdrop-blur-md z-50 inset-x-0 top-0 flex items-center justify-between px-12 md:px-20 py-6'>
      <NavLink to={'/'} className='flex items-center justify-center gap-3'>
        <img src={Logo} className='w-12' alt='' />
        <p className='font-semibold text-2xl'>Restaurant</p>
      </NavLink>

      <nav className='flex items-center justify-center gap-8'>
        <ul className='hidden md:flex items-center justify-center gap-8'>
          <NavLink
            to='/'
            onClick={(e) => {
              if (isJoystickActive) {
                e.preventDefault()
                return
              }
            }}
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link-inactive')}
          >
            Home
          </NavLink>
          <NavLink
            to='/menu'
            onClick={(e) => {
              if (isJoystickActive) {
                e.preventDefault()
                return
              }
            }}
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link-inactive')}
          >
            Menu
          </NavLink>
          <NavLink
            to='/services'
            onClick={(e) => {
              if (isJoystickActive) {
                e.preventDefault()
                return
              }
            }}
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link-inactive')}
          >
            Services
          </NavLink>
          {/* <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link-active' : 'nav-link-inactive'
            }
            to={'/aboutus'}
          >
            About Us
          </NavLink> */}
        </ul>

          <motion.div {...buttonClick}
            onClick={() => dispatch(setCartOn())}
            className='relative cursor-pointer'
          >
            <MdFoodBank className='text-3xl text-textColor' />
            {cart?.length > 0 && (
              <div className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center absolute -top-3 -right-1'>
                <p className='text-white text-base font-semibold'>
                  {cart?.length}
                </p>
              </div>
            )}
          </motion.div>
          
          <div className='nav-avatar'>
            {user ? (
                <>
                  <div
                  className='relative cursor-pointer'
                  onMouseEnter={() => setIsMenu(true)}
                  >
                  <div className='w-12 h-12 rounded-full shadow-md cursor-pointer overflow-hidden flex items-center justify-center'>
                      <motion.img
                      className='w-full h-full object-cover'
                      src={user?.picture ? user?.picture : Avatar}
                      whileHover={{ scale: 1.15 }}
                      referrerPolicy='no-referrer'
                      />
                  </div>

                  {isMenu && (
                    <motion.div
                    {...slideTop}
                    onMouseLeave={() => setIsMenu(false)}
                    className='px-6 py-4 w-48 bg-lightOverlay backdrop-blur-md rounded-md shadow-md absolute top-12 right-0 flex flex-col gap-4'
                    >
                    {user?.user_id === process.env.REACT_APP_ADMIN_ID && (
                      <Link
                        className=' hover:text-red-500 text-xl text-textColor'
                        to={'/dashboard/home'}
                      >
                        Dashboard
                      </Link>
                    )}

                    {/* <Link
                      className=' hover:text-red-500 text-xl text-textColor'
                      to={'/profile'}
                    >
                      My Profile
                    </Link> */}
                    <Link
                      className=' hover:text-red-500 text-xl text-textColor'
                      to={'/user-orders'}
                    >
                      Orders
                    </Link>
                    <hr />

                    <motion.div
                        {...buttonClick}
                        onClick={signOut}
                        className='group flex items-center justify-center px-2 py-2 rounded-md shadow-md bg-gray-100 hover:bg-gray-200 gap-3'
                    >
                        <MdLogout className='text-2xl text-textColor group-hover::text-headingColor' />
                        <p className='text-textColor text-xl group-hover:text-headingColor'>
                        Sign Out
                        </p>
                    </motion.div>
                    </motion.div>
                  )}
                  </div>
                </>
              ) : (
                <>
                    <NavLink to={'/login'}>
                        <motion.button
                            {...buttonClick}
                            className='px-4 py-2 rounded-md shadow-md bg-lightOverlay border border-danger cursor-pointer'
                        >
                            Login
                        </motion.button>
                    </NavLink>
                </>
              )}
          </div>
      </nav>
    </header>
  )
}

export default Header
