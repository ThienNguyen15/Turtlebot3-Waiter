import React, { useEffect } from 'react'
import { DataTable } from '../../components'
import { useDispatch, useSelector } from 'react-redux'
import { getAllUsers } from '../../api'
import { Avatar } from '../../assets'
import { setAllUserDetails } from '../../context/actions/allUsersActions'

const DashboardUsers = () => {
  const allUsers = useSelector((state) => state.allUsers)
  const dispatch = useDispatch()

  const uniqueUsers = allUsers ? allUsers.filter((user, index, self) => index === self.findIndex((u) => u.email === user.email)) : []

  useEffect(() => {
    if (!allUsers) {
      getAllUsers().then((data) => {
        dispatch(setAllUserDetails(data))
      })
    }
  }, [])

  return (
    <div className='flex items-center justify-self-center gap-4 pt-6 w-full'>
      <DataTable
        columns={[
          {
            title: 'Image',
            field: 'photoURL',
            render: (rowData) => (
              <img
                src={rowData.photoURL ? rowData.photoURL : Avatar}
                className='w-32 h-16 object-contain rounded-md'
              />
            ),
            headerStyle: {
              position: 'relative',
              right: '38px',
              textAlign: 'center',
            },
            cellStyle: {
              position: 'relative',
              left: '5px',
            },
          },
          {
            title: 'Name',
            field: 'displayName',
          },
          {
            title: 'Email',
            field: 'email',
          },
          {
            title: 'Verified',
            field: 'emailVerified',
            render: (rowData) => (
              <p
                className={`px-2 py-1 w-32 text-center text-white rounded-md ${
                  rowData.emailVerified ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              >
                {rowData.emailVerified ? 'Verified' : 'Not Verified'}
              </p>
            ),
            align:'center',
            cellStyle: {
              position: 'relative',
              left: '48px',
            },
          },
        ]}
        data={uniqueUsers || []}
        title='List of Users'
      />
    </div>
  )
}

export default DashboardUsers
