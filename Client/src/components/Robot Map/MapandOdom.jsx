import ROS_Config from '../../config/ros.config'
import { useEffect, useRef, useState } from 'react'
import Card from 'react-bootstrap/Card'
import { FaKitchenSet, MdTableRestaurant } from '../../assets/icons'
import ROSLIB from 'roslib'
window.ROSLIB = ROSLIB

const tables = [
  { description: "Table1", id: 1, x: -0.431466, y: -0.927929 },
  { description: "Table2", id: 2, x: -0.3588424623012543, y: -1.6562724113464355 },
  { description: "Table3", id: 3, x: -0.2888265550136566, y: -2.382502794265747 },
  { description: "Table4", id: 4, x: 0.551529, y: -1.89651 },
  { description: "Table5", id: 5, x: 0.450258, y: -0.924623 },
  { description: "Kitchen", id: 10, x: -0.743725, y: -0.2899 }
]

function quaternionToYaw(orientation) {
  const { x, y, z, w } = orientation
  const yawRad = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
  return yawRad * (180 / Math.PI)
}

const MapandOdom = ({ ros, onOdomUpdate }) => {
  const mapCanvasRef = useRef(null)
  const robotCanvasRef = useRef(null)
  const [mapMeta, setMapMeta] = useState({ width: 0, height: 0, resolution: 1, originX: 0, originY: 0, originYaw: 0 })

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

    mapClient.subscribe(map => {
      const { width, height, resolution, origin } = map.info
      const originYaw = quaternionToYaw(origin.orientation)
      setMapMeta({ width, height, resolution, originX: origin.position.x, originY: origin.position.y, originYaw })

      const canvas = mapCanvasRef.current
      const ctx = canvas.getContext('2d')
      canvas.width = width
      canvas.height = height
      map.data.forEach((cell, idx) => {
        const row = Math.floor(idx / width)
        const col = idx % width
        if (cell === 100) ctx.fillStyle = '#000'
        else if (cell === 0) ctx.fillStyle = '#fff'
        else { const g = 255 - Math.round(cell * 2.55); ctx.fillStyle = `rgb(${g},${g},${g})` }
        ctx.fillRect(col, height - row - 1, 1, 1)
      })
    })
    
    odomClient.subscribe(odom => {
      const { position, orientation } = odom.pose.pose
      const yawRad = quaternionToYaw(orientation)
      onOdomUpdate?.({ position, yaw: yawRad * 180 / Math.PI })

      const { width, height, resolution, originX, originY, originYaw } = mapMeta
      if (!width) return
      const rect = mapCanvasRef.current.getBoundingClientRect()
      const scaleX = rect.width / width
      const scaleY = rect.height / height

      const robotCanvasCt = robotCanvasRef.current.getContext('2d')
      robotCanvasRef.current.width = rect.width
      robotCanvasRef.current.height = rect.height
      robotCanvasCt.clearRect(0, 0, rect.width, rect.height)
      let dx = position.x - originX
      let dy = position.y - originY

      const cos = Math.cos(-originYaw)
      const sin = Math.sin(-originYaw)
      const rx = dx * cos - dy * sin
      const ry = dx * sin + dy * cos
      const px = (rx / resolution) * scaleX
      const py = ((height - ry / resolution) * scaleY)
      robotCanvasCt.beginPath()
      robotCanvasCt.fillStyle = '#f00'
      robotCanvasCt.arc(px, py, 5, 0, 2 * Math.PI)
      robotCanvasCt.fill()

      tables.forEach(t => {
        let tx = t.x - originX
        let ty = t.y - originY
        const ix = ( (tx * cos - ty * sin) / resolution ) * scaleX
        const iy = ( height - ((tx * sin + ty * cos) / resolution) ) * scaleY
        const sizePixel = ( (t.id === 10 ? 1 : 0.5) / resolution ) * scaleX
        const Icon = t.id === 10 ? FaKitchenSet : MdTableRestaurant
      })
    })

    return () => { mapClient.unsubscribe(); odomClient.unsubscribe() }
  }, [ros, onOdomUpdate, mapMeta])
  
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

                {mapMeta.width > 0 && tables.map(t => {
                  const { width, height, resolution, originX, originY, originYaw } = mapMeta
                  const rect = mapCanvasRef.current.getBoundingClientRect()
                  const scaleX = rect.width / width
                  const scaleY = rect.height / height
                  const cos = Math.cos(-originYaw)
                  const sin = Math.sin(-originYaw)
                  const tx = t.x - originX
                  const ty = t.y - originY
                  const gx = (tx * cos - ty * sin) / resolution
                  const gy = (tx * sin + ty * cos) / resolution
                  const ix = gx * scaleX
                  const iy = (height - gy) * scaleY
                  const color = t.id === 10
                    ? '#ff3333'
                    : '#3396FF'
                  const sizePixel = ((t.id === 10 ? 1 : 0.5) / resolution) * scaleX / 2.6
                  const Icon = t.id === 10 ? FaKitchenSet : MdTableRestaurant
                  return (
                    <Icon
                      key={t.id}
                      size={sizePixel}
                      color={color}
                      style={{
                        position: 'absolute',
                        left: `${ix}px`,
                        top: `${iy}px`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none'
                      }}
                    />
                  )
                })}
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