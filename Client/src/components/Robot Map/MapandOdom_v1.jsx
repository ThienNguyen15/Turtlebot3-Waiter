import ROS_Config from '../../config/ros.config'
import { useEffect, useRef } from 'react'
import Card from 'react-bootstrap/Card'
import ROSLIB from 'roslib'
window.ROSLIB = ROSLIB

function quaternionToYaw(orientation) {
  const { x, y, z, w } = orientation
  const yawRad = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
  return yawRad * (180 / Math.PI)
}

const MapandOdom = ({ ros, onOdomUpdate }) => {
  const mapCanvasRef = useRef(null)
  const robotCanvasRef = useRef(null)

  useEffect(() => {
    if (!ros)
      return

    var mapClient = new ROSLIB.Topic({
      ros: ros,
      name: ROS_Config.MAP_TOPIC,
      messageType: ROS_Config.MAP_MSG,
    })

    var odomClient = new ROSLIB.Topic({
      ros: ros,
      // name: ROS_Config.ODOM_TOPIC,
      // messageType: ROS_Config.ODOM_MSG,
      name: ROS_Config.AMCL_POSE_TOPIC,
      messageType: ROS_Config.AMCL_POSE_MSG,
    })

    var mapWidth
    var mapHeight
    var mapResolution
    var mapData
    let originX = 0, originY = 0

    mapClient.subscribe(function(map) {
      mapWidth = map.info.width
      mapHeight = map.info.height
      mapResolution = map.info.resolution
      mapData = map.data

      originX = map.info.origin.position.x
      originY = map.info.origin.position.y

      const mapCanvas = mapCanvasRef.current
      const mapContext = mapCanvas.getContext('2d')
      const scaleFactor = 1
      mapCanvas.width = mapWidth * scaleFactor
      mapCanvas.height = mapHeight * scaleFactor

      for (var i = 0; i < mapWidth * mapHeight; i++) {
          var occupancy = mapData[i]
          var row = Math.floor(i / mapWidth)
          var col = i % mapWidth

          if (occupancy === 100) {
              mapContext.fillStyle = '#000000'
          } else if (occupancy === 0) {
              mapContext.fillStyle = '#ffffff'
          } else {
              var gray = 255 - Math.round(occupancy * 2.55)
              var color = 'rgb(' + gray + ',' + gray + ',' + gray + ')'
              mapContext.fillStyle = color
          }

          mapContext.fillRect(
            col * scaleFactor,
            (mapHeight - row - 1) * scaleFactor,
            scaleFactor,
            scaleFactor
          )
      }
    })
    
    odomClient.subscribe(function(odom) {
      const position = odom.pose.pose.position
      const orientation = odom.pose.pose.orientation
      const yaw = quaternionToYaw(orientation)
      const odomState = { position, yaw }
      if (onOdomUpdate) onOdomUpdate(odomState)
      console.log('Position: ' + position.x + ',' + position.y + ',' + position.z)
      console.log('Orientation: ' + orientation.x + ',' + orientation.y + ',' + orientation.z + ',' + orientation.w)

      const robotCanvas = robotCanvasRef.current
      const robotContext = robotCanvas.getContext('2d')

      robotCanvas.width = mapWidth
      robotCanvas.height = mapHeight
      robotContext.clearRect(0, 0, robotCanvas.width, robotCanvas.height)

      const robotPositionX = (position.x - originX) / mapResolution
      const robotPositionY = mapHeight - 1 - ((position.y - originY) / mapResolution)

      robotContext.beginPath()
      robotContext.fillStyle = '#FF0000'
      robotContext.arc(robotPositionX, robotPositionY, 3, 0, 2 * Math.PI)
      robotContext.fill()
    })

    return () => {
      mapClient.unsubscribe()
      odomClient.unsubscribe()
    }
  }, [ros, onOdomUpdate])
  
  return (
    <>
      <Card className='mb-4' style={{ width: '33rem', height: '32rem', marginLeft: '0.84cm' }}>
        <Card.Body>
            <Card.Title className="text-end">Map and Odometry</Card.Title>
            <Card.Subtitle className='mb-2 text-muted text-end'>Subscribe Map and Odom</Card.Subtitle>
            <Card.Text>
              <div style={{ position: 'relative', width: '100%', height: '26rem' }}>
                <canvas
                  id="map-canvas"
                  ref={mapCanvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></canvas>
                <canvas
                  id="robot-canvas"
                  ref={robotCanvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></canvas>
              </div>
            </Card.Text>
        </Card.Body>
      </Card>
    </>
  )
}

export default MapandOdom



// const MapandOdom = ({ ros, onOdomUpdate }) => {
//   useEffect(() => {
//     if (!ros) return

//     var viewer = new window.ROS2D.Viewer({
//       divID: "nav_div",
//       width: 100,
//       height: 100,
//     })

//     var navClient = new window.NAV2D.OccupancyGridClientNav({
//       ros: ros,
//       rootObject: viewer.scene,
//       viewer: viewer,
//       serverName: "/navigate_to_pose",
//       withOrientation: true,
//       topic: "/map",
//       continuous: true
//     })
//   }, [ros])
  
//   return (
//     <>
//       <Card className='mb-4' style={{ width: '33rem', height: '32rem', marginLeft: '0.84cm' }}>
//         <Card.Body>
//             <Card.Title className="text-end">Map and Odometry</Card.Title>
//             <Card.Subtitle className='mb-2 text-muted text-end'>Subscribe Map and Odom</Card.Subtitle>
//             <Card.Text>
//             <div className='d-flex flex-column justify-content-center align-items-center' style={{ width: '100%' }}>
//               <div 
//                 id="nav_div" 
//                 style={{ display: 'block', width: '80%', height: '1rem' }}
//               >
//               </div>
//             </div>
//             </Card.Text>
//         </Card.Body>
//       </Card>
//     </>
//   )
// }

// export default MapandOdom