import React, { useEffect, useState } from 'react'
import ROSLIB from 'roslib'
import { Joystick } from 'react-joystick-component'
import { Form } from 'react-bootstrap'
import Card from 'react-bootstrap/Card'

const CmdData = ({ ros, setJoystickActive }) => {
  const [cmdVelPublisher, setCmdVelPublisher] = useState(null)
  const [sliderValue, setSliderValue] = useState(0.1)

  useEffect(() => {
    if (!ros) return
    const cmdVel = new ROSLIB.Topic({
      ros: ros,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/Twist',
    })
    setCmdVelPublisher(cmdVel)

    return () => {
      cmdVel.unadvertise()
      setCmdVelPublisher(null)
    }
  }, [ros])

  const sendCommand = (linearVelocityX, angularVelocityZ) => {
    const cmdVel = new ROSLIB.Message({
      linear: {
        x: linearVelocityX,
        y: 0,
        z: 0,
      },
      angular: {
        x: 0,
        y: 0,
        z: angularVelocityZ,
      },
    })
    cmdVelPublisher.publish(cmdVel)
  }


  const handleSliderChange = (event) => {
    setSliderValue(event.target.value)
  }

  const handleJoystickMove = (event) => {
    setJoystickActive(true)
    const linearVelocity = event.y * sliderValue
    const angularVelocity = -event.x * sliderValue
    sendCommand(linearVelocity, angularVelocity)
  }

  const handleJoystickStop = () => {
    setJoystickActive(false)
    sendCommand(0, 0)
  }

  return (
    <>
      <Card className='mb-4' style={{ width: '30rem' }}>
        <Card.Body>
          <Card.Title>Velocity Robot Controller</Card.Title>
          <Card.Subtitle className='mb-2 text-muted'>Publish vel</Card.Subtitle>
          <Card.Text>
          <div className='d-flex flex-column justify-content-center align-items-center' style={{ width: '100%' }}>
            <Form.Group className='mb-3' controlId='slider' style={{ width: '100%' }}>
            <Form.Label className='text-center'>Speed</Form.Label>
            <Form.Control
              type='range'
              min='0'
              max='1'
              step='0.01'
              value={sliderValue}
              onChange={handleSliderChange}
            />
            </Form.Group>

            <Joystick
              size={100}
              baseColor='lightgray'
              stickColor='gray'
              move={handleJoystickMove}
              stop={handleJoystickStop}
            />
          </div>
          </Card.Text>
        </Card.Body>
      </Card>
  </>
  )
}

export default CmdData
