import React, { useEffect, useState } from 'react'
import ROSLIB from 'roslib'
import Card from 'react-bootstrap/Card'

const ImuData = ({ros}) => {
  const [imuData, setImuData] = useState({})

  useEffect(() => {
    if (!ros)
      return

    var imuTopic = new ROSLIB.Topic({
        ros: ros,
        name: 'imu',
        messageType: 'sensor_msgs/Imu'
    })

    // Calculate Euler
    function getEulerAngles(q) {
        const qw = q.w
        const qx = q.x
        const qy = q.y
        const qz = q.z
        const sinr = 2.0 * (qw * qx + qy * qz)
        const cosr = 1.0 - 2.0 * (qx * qx + qy * qy)
        const roll = Math.atan2(sinr, cosr)

        const sinp = 2.0 * (qw * qy - qz * qx)
        let pitch
        if (Math.abs(sinp) >= 1) {
        pitch = Math.PI / 2.0 * Math.sign(sinp)
        } else {
        pitch = Math.asin(sinp)
        }

        const siny = 2.0 * (qw * qz + qx * qy)
        const cosy = 1.0 - 2.0 * (qy * qy + qz * qz)
        const yaw = Math.atan2(siny, cosy)

        return {
        roll: roll,
        pitch: pitch,
        yaw: yaw
        }
    }

    imuTopic.subscribe((message) => {
        const eulerAngles = getEulerAngles(message.orientation)
        // console.log('Received message on ' + listener_imu.name + ': ', eulerAngles)

        const roll = eulerAngles.roll * 180.0 / Math.PI
        const pitch = eulerAngles.pitch * 180.0 / Math.PI
        const yaw = eulerAngles.yaw * 180.0 / Math.PI
        const sec = message.header.stamp.sec

        setImuData((prevState) => {
          const newData = {
            roll: roll.toFixed(2),
            pitch: pitch.toFixed(2),
            yaw: yaw.toFixed(2),
            sec: sec,
          }
          return { ...prevState, ...newData }
        })
    })
  }, [ros])
  
  return (
    <>
      <Card className='mb-4' style={{ width: '30rem' }}>
        <Card.Body>
            <Card.Title>Inertial Measurement Unit Data</Card.Title>
            <Card.Subtitle className='mb-2 text-muted'>Subscribe imu data</Card.Subtitle>
            <Card.Text>
                <p>Roll: {imuData.roll}</p>
                <p>Pitch: {imuData.pitch}</p>
                <p>Yaw: {imuData.yaw}</p>
                <p>Sec: {imuData.sec}</p>
            </Card.Text>
        </Card.Body>
      </Card>
    </>
  )
}

export default ImuData