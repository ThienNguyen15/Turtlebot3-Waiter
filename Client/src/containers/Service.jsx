import ROS_Config from '../config/ros.config'
import React, { useState } from 'react'
import { Header } from '../components'
import { CmdData, MapandOdom, Rosconnection, ImuData, RealTimeDB } from '../components'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Row, Col } from 'react-bootstrap'
import { Ros2 } from '../assets'

const Service = () => {
    const [ros, setRos] = useState(null)
    const [odom, setOdom] = useState(null)
    const [isJoystickActive, setJoystickActive] = useState(false)

    const [status, setStatus] = useState('N/A')

    return (
        <main className='w-screen min-h-screen flex items-center justify-start flex-col bg-white'>
          <Header isJoystickActive={isJoystickActive} />
          <div style={{marginTop: '120px'}} className='w-full flex flex-col items-start justify-center px-6 md:px-24 2xl:px-96 gap-10 pb-24'>
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', }}
            >
              <h3
                style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', }}
              >
                Connection:&nbsp;
                <span id="status"
                  style={{
                    color: status === 'SUCCESSFUL' ? '#00cc44' : '#ff3333',
                    fontWeight: 'bold',
                    fontSize: '1.8rem',
                  }}
                >
                  {status}
                </span>
              </h3>

              <img 
                src={Ros2} 
                alt="Ros2 Logo"
                style={{
                  height: '29px',
                  objectFit: 'contain',
                  marginLeft: '16px',
                }}
              />
            </div>
            <hr 
                style={{
                    position: 'relative', 
                    top: '-29px',
                    width: '100%', 
                    height: '1px',
                    backgroundColor: 'black',
                    border: 'none',
                    margin: 0,
                }} 
            />
            <Rosconnection rosUrl={ROS_Config.ROS_URL} rosDomainId={ROS_Config.ROS_DOMAIN_ID} setRos={setRos} setStatus={setStatus} />
            {ros &&
            <>
                <Row className="w-100 d-flex justify-content-between align-items-start" style={{ marginTop: '-50px', padding: '0' }}>
                  <Col md={3}>
                  <div>
                    <CmdData ros={ros} setJoystickActive={setJoystickActive} />
                  </div>
                  {/* <div style={{ marginTop: '1.95rem' }}>
                    <ImuData ros={ros} />
                  </div> */}
                  </Col>
                  <Col md={4}>
                    <RealTimeDB ros={ros} odom={odom} />
                  </Col>
                  <Col md={5}>
                    <MapandOdom ros={ros} onOdomUpdate={setOdom} />
                  </Col>
                </Row>
            </>
            }
          </div>
        </main>
      )
    }

export default Service
