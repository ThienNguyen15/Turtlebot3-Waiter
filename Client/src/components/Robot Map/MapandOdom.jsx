import { useEffect, useRef } from 'react'
import ROSLIB from 'roslib'
import Card from 'react-bootstrap/Card'

const MapandOdom = ({ros}) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!ros)
      return

    var mapClient = new ROSLIB.Topic({
      ros: ros,
      name: '/map',
      messageType: 'nav_msgs/OccupancyGrid'
    })

    var odomClient = new ROSLIB.Topic({
      ros: ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry'
    })

    var mapWidth
    var mapHeight
    var mapResolution
    var mapData
    // var mapOriginX
    // var mapOriginY

    mapClient.subscribe(function(map) {
      mapWidth = map.info.width
      mapHeight = map.info.height
      mapResolution = map.info.resolution
      mapData = map.data

      // mapOriginX = map.info.origin.position.x
      // mapOriginY = map.info.origin.position.y

      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      canvas.width = mapWidth
      canvas.height = mapHeight

      for (var i = 0; i < mapWidth * mapHeight; i++) {
          var occupancy = mapData[i]
          var row = Math.floor(i / mapWidth)
          var col = i % mapWidth

          if (occupancy === 100) {
              context.fillStyle = '#000000'
          } else if (occupancy === 0) {
              context.fillStyle = '#ffffff'
          } else {
              var gray = 255 - Math.round(occupancy * 2.55)
              var color = 'rgb(' + gray + ',' + gray + ',' + gray + ')'
              context.fillStyle = color
          }

          context.fillRect(col, mapHeight - row - 1, 1, 1)
      }
    })

    var position
    var orientation
    
    odomClient.subscribe(function(odom) {
      position = odom.pose.pose.position
      orientation = odom.pose.pose.orientation
      console.log('Position: ' + position.x + ',' + position.y + ',' + position.z)
      console.log('Orientation: ' + orientation.x + ',' + orientation.y + ',' + orientation.z + ',' + orientation.w)

      var canvas = document.getElementById('map-canvas')
      var context = canvas.getContext('2d')

      // const canvasX = canvas.width / 2 + (position.x) / mapResolution
      // const canvasY = canvas.height / 2 - (position.y) / mapResolution
      const canvasX = canvas.width / 2 + (position.x) / mapResolution
      const canvasY = canvas.height / 2 - (position.y) / mapResolution
      

      context.beginPath()
      context.fillStyle = '#FF0000'
      context.arc(canvasX , canvasY, 1.45, 0, 2 * Math.PI)
      context.fill()
    })
  })
  
  return (
    <>
      <Card className='mb-4' style={{ width: '33rem' }}>
        <Card.Body>
            <Card.Title>Map and Odometry</Card.Title>
            <Card.Subtitle className='mb-2 text-muted'>Subscribe map and odom</Card.Subtitle>
            <Card.Text>
            <div className='d-flex flex-column justify-content-center align-items-center' style={{ width: '100%' }}>
              <canvas id='map-canvas' ref={canvasRef}></canvas>
            </div>
            </Card.Text>
        </Card.Body>
      </Card>
    </>
  )
}

export default MapandOdom