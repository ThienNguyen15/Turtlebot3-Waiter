import React, { useEffect } from 'react'
import ROSLIB from 'roslib'

const Rosconnection = ({ rosUrl, rosDomainId, setRos, setStatus }) => {

  useEffect(() => {
    const ros = new ROSLIB.Ros({
      url: rosUrl,
      options: {
        ros_domain_id: rosDomainId
      }
    })

    ros.on('connection', () => {
      setRos(ros)
      // document.getElementById('status').innerHTML = 'SUCCESSFUL'
      setStatus('SUCCESSFUL')
      console.log('Connected to ROSBridge WebSocket server.')
    })
  
    ros.on('error', function(error) {
      console.log('Error connecting to ROSBridge WebSocket server: ', error)
    })
  
    ros.on('close', function() {
      console.log('Connection to ROSBridge WebSocket server closed.')
    })

    return () => {
      ros.close()
    }
  }, [rosUrl, rosDomainId, setRos, setStatus ])

  return (
    <>
    </>
  )
}
export default Rosconnection