import ROS_Config from '../../config/ros.config'
import React, { useEffect, useState } from 'react'
import { Joystick } from 'react-joystick-component'
import { Form } from 'react-bootstrap'
import Card from 'react-bootstrap/Card'
import BatteryGauge from 'react-battery-gauge'
import * as Three from 'three'
import ROSLIB from 'roslib'
window.ROSLIB = ROSLIB

const CmdData = ({ ros, setJoystickActive }) => {
  const [cmdVelPublisher, setCmdVelPublisher] = useState(null)
  const [sliderValue, setSliderValue] = useState(0.1)

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [orientation, setOrientation] = useState(0)
  const [linearVelocity, setLinearVelocity] = useState(0)
  const [angularVelocity, setAngularVelocity] = useState(0)

  useEffect(() => {
    if (!ros) return
    const cmdVel = new ROSLIB.Topic({
      ros: ros,
      name: ROS_Config.CMD_VEL_TOPIC,
      messageType: ROS_Config.CMD_VEL_MSG,
    })
    setCmdVelPublisher(cmdVel)

    return () => {
      cmdVel.unadvertise()
      setCmdVelPublisher(null)
    }
  }, [ros])

  useEffect(() => {
    if (!ros) return

    const poseSubscriber = new ROSLIB.Topic({
      ros: ros,
      name: ROS_Config.AMCL_POSE_TOPIC,
      messageType: ROS_Config.AMCL_POSE_MSG,
    })

    poseSubscriber.subscribe((message) => {
      console.log("Received pose:", message)
      const x = message.pose.pose.position.x
      const y = message.pose.pose.position.y
      console.log("x:", x, "y:", y)
      setPosition({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) })
      const orient = getOrientationFromQuaternion(message.pose.pose.orientation)
      setOrientation(parseFloat(orient.toFixed(2)))
    })

    const velocitySubscriber = new ROSLIB.Topic({
      ros: ros,
      name: ROS_Config.ODOM_TOPIC,
      messageType: ROS_Config.ODOM_MSG,
    })

    velocitySubscriber.subscribe((message) => {
      const linVel = message.twist.twist.linear.x
      const angVel = message.twist.twist.angular.z
      setLinearVelocity(parseFloat(linVel.toFixed(2)))
      setAngularVelocity(parseFloat(angVel.toFixed(2)))
    })

    return () => {
      poseSubscriber.unsubscribe()
      velocitySubscriber.unsubscribe()
    }
  }, [ros])

  const getOrientationFromQuaternion = (q) => {
    const quaternion = new Three.Quaternion(q.x, q.y, q.z, q.w)
    const euler = new Three.Euler().setFromQuaternion(quaternion)
    return euler.z * (180 / Math.PI)
  }

  const sendCommand = (linearVelocityX, angularVelocityZ) => {
    if (!cmdVelPublisher) return
    const cmdVelMsg = new ROSLIB.Message({
      linear: { x: linearVelocityX, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angularVelocityZ },
    })
    cmdVelPublisher.publish(cmdVelMsg)
  }

  const handleSliderChange = (event) => {
    setSliderValue(event.target.value)
  }

  const handleJoystickMove = (event) => {
    setJoystickActive(true)
    const linearVel = event.y * sliderValue
    const angularVel = -event.x * sliderValue
    sendCommand(linearVel, angularVel)
  }

  const handleJoystickStop = () => {
    setJoystickActive(false)
    sendCommand(0, 0)
  }

  const batteryValue = 31;

  const getFillColor = (value) => {
    if (value < 20) return '#ff3333';
    if (value < 40) return '#ffd633';
    return '#228B22';
  };

const fillColor = getFillColor(batteryValue);

  return (
    <Card className="mb-4" style={{ width: "30rem", height: "32rem" }}> {/* height 25 combined with Imu */}
      <Card.Body>
        <Card.Title>Turtlebot3 Controller</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          Publish Velocity
        </Card.Subtitle>
        <Card.Text>
          <div
            className="d-flex flex-column justify-content-center align-items-center"
            style={{ width: "100%", marginTop: "1.4rem" }}
          >
            <Form.Group
              className="mb-3"
              controlId="slider"
              style={{ width: "100%" }}
            >
              <Form.Control
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={sliderValue}
                onChange={handleSliderChange}
                style={{ height: "28px" }}
              />
            </Form.Group>

            <div style={{ marginTop: "1rem" }}>
              <Joystick
                size={110}
                baseColor="#B3D7FF"
                stickColor="#3396FF"
                move={handleJoystickMove}
                stop={handleJoystickStop}
              />
            </div>
          </div>
        </Card.Text>

        <br />

        {/* Robot Information */}
        <Card.Title>Robot State</Card.Title>
        <Card.Text style={{ marginTop: '0.2rem', paddingLeft: '0rem', paddingRight: '0rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

            {/* Left column */}
            <div style={{ flex: 1 }}>
              <p style={{ marginTop: '0.29rem' }}><strong>Position</strong></p>
              <p>X: {position.x}, Y: {position.y}</p>
              <p>Orientation: {orientation}°</p>
              <br />
              <p style={{ marginTop: '0.29rem' }}><strong>Velocity</strong></p>
              <p>Linear Velocity: {linearVelocity}</p>
              <p>Angular Velocity: {angularVelocity}</p>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '10rem' }}>
              <p style={{ marginRight: '0.2rem' }}><strong>Battery</strong></p>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginRight: '-2.8rem' }}>
                <div style={{ transform: 'scaleX(0.69)' }}>
                  <BatteryGauge 
                    value={batteryValue}
                    orientation="vertical"
                    size={150}
                    customization={{
                      batteryBody: { strokeWidth: 1, cornerRadius: 6 },
                      batteryCap: { width: 1, strokeWidth: 1},
                      batteryMeter: { fill: fillColor },
                      valueText: {
                        style: {
                          fontSize: 15,
                          fontWeight: 'bold',
                          fill: '#333'
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </Card.Text>
      </Card.Body>
    </Card>
  )
}

export default CmdData

// const CmdData = ({ ros, setJoystickActive }) => {
//   const [cmdVelPublisher, setCmdVelPublisher] = useState(null)
//   const [sliderValue, setSliderValue] = useState(0.1)

//   useEffect(() => {
//     if (!ros) return
//     const cmdVel = new ROSLIB.Topic({
//       ros: ros,
//       name: '/cmd_vel',
//       messageType: 'geometry_msgs/Twist',
//     })
//     setCmdVelPublisher(cmdVel)

//     return () => {
//       cmdVel.unadvertise()
//       setCmdVelPublisher(null)
//     }
//   }, [ros])

//   const sendCommand = (linearVelocityX, angularVelocityZ) => {
//     const cmdVel = new ROSLIB.Message({
//       linear: {
//         x: linearVelocityX,
//         y: 0,
//         z: 0,
//       },
//       angular: {
//         x: 0,
//         y: 0,
//         z: angularVelocityZ,
//       },
//     })
//     cmdVelPublisher.publish(cmdVel)
//   }


//   const handleSliderChange = (event) => {
//     setSliderValue(event.target.value)
//   }

//   const handleJoystickMove = (event) => {
//     setJoystickActive(true)
//     const linearVelocity = event.y * sliderValue
//     const angularVelocity = -event.x * sliderValue
//     sendCommand(linearVelocity, angularVelocity)
//   }

//   const handleJoystickStop = () => {
//     setJoystickActive(false)
//     sendCommand(0, 0)
//   }

//   return (
//     <>
//       <Card className='mb-4' style={{ width: '30rem', height: '18.5rem' }}>
//         <Card.Body>
//           <Card.Title>Turltebot3 Controller</Card.Title>
//           <Card.Subtitle className='mb-2 text-muted'>Publish Velocity</Card.Subtitle>
//           <Card.Text>
//           <div className='d-flex flex-column justify-content-center align-items-center' style={{ width: '100%', marginTop: '1.4rem' }}>
//             <Form.Group className='mb-3' controlId='slider' style={{ width: '100%' }}>
//             {/* <Form.Label className='text-center'>Speed</Form.Label> */}
//             <Form.Control
//               type='range'
//               min='0'
//               max='1'
//               step='0.01'
//               value={sliderValue}
//               onChange={handleSliderChange}
//               style={{
//                 height: '28px',
//               }}
//             />
//             </Form.Group>

//             <div style={{ marginTop: '1rem' }}>
//               <Joystick
//                 size={110}
//                 baseColor='#B3D7FF'
//                 stickColor='#3396FF'
//                 move={handleJoystickMove}
//                 stop={handleJoystickStop}
//               />
//             </div>
//           </div>
//           </Card.Text>
//         </Card.Body>
//       </Card>
//   </>
//   )
// }

// export default CmdData