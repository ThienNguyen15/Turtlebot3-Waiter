import React, { useState, useEffect, useRef } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { realtimedb } from '../../config/firebase.config.js'
import Card from 'react-bootstrap/Card'

const tables = [
    { description: "Table0", id: 0, name: "Table0", x: 0.00, y: 0.00, yaw: 90.00 },
    { description: "Table1", id: 1, name: "Table1", x: 0.10, y: 0.10, yaw: 90.00 },
    { description: "Table2", id: 2, name: "Table2", x: -0.20, y: -0.20, yaw: 90.00 },
    { description: "Table3", id: 3, name: "Table3", x: 0.30, y: 0.30, yaw: 90.00 },
    { description: "Table4", id: 4, name: "Table4", x: -0.40, y: -0.40, yaw: 90.00 },
    { description: "Table5", id: 5, name: "Table5", x: 0.50, y: 0.50, yaw: 90.00 },
    { description: "Table6", id: 6, name: "Table6", x: -0.60, y: -0.60, yaw: 90.00 },
    { description: "Table7", id: 7, name: "Table7", x: 0.70, y: 0.70, yaw: 90.00 },
    { description: "Table8", id: 8, name: "Table8", x: -0.80, y: -0.80, yaw: 90.00 },
    { description: "Table9", id: 9, name: "Table9", x: 0.90, y: 0.90, yaw: 90.00 },
    { description: "Table10", id: 10, name: "Table10", x: 1.00, y: 1.00, yaw: 90.00 }
  ]
  
const RealTimeDB = ({ ros, odom }) => {
  const [activeTables, setActiveTables] = useState([])
  const userActionRef = useRef(false)

  const toggleTable = (tableId) => {
    userActionRef.current = true
    setActiveTables((prev) => {
      if (prev.includes(tableId)) {
        return prev.filter((id) => id !== tableId)
      } else {
        return [...prev, tableId]
      }
    })
  }

  const generateTurtlebotState = () => {
    if (!odom) {
      return {
        battery: 100,
        isFree: true,
        isReachStation: 0,
        position: { x: 0, y: 0, yaw: 0 }
      }
    }
    return {
      battery: 80,
      isFree: true,
      isReachStation: 0,
      position: {
        x: odom.position.x,
        y: odom.position.y,
        yaw: odom.yaw
      }
    }
  }

  const buildActionFromTables = (tablesList) => {
    let request
    if (tablesList.length === 0) {
      request = {
        id: 0,
        numStation: 1,
        station0: tables[0]
      }
    } else if (tablesList.length === 1 && tablesList[0] === 10 && tables[0].id === 0) {
      request = {
        id: 1,
        numStation: 2,
        station0: tables[0],
        station1: tables.find(t => t.id === 10)
      }
    } else {
      request = {
        id: 2,
        station0: tables.find(t => t.id === 10)
      }
      const rest = tablesList.filter(id => id !== 10)
      request.numStation = 1 + rest.length
      rest.forEach((id, idx) => {
        request[`station${idx + 1}`] = tables.find(t => t.id === id)
      })
    }

    return {
      request,
      turtlebot_state: generateTurtlebotState()
    }
  }

  useEffect(() => {
    if (!userActionRef.current) return
    const action = buildActionFromTables(activeTables)
    const actionsRef = ref(realtimedb, 'actions')
    set(actionsRef, action)
      .then(() => console.log('[Firebase Push] Sent:', action))
      .catch((err) => console.error('[Firebase Push ERROR]', err))
    userActionRef.current = false
  }, [activeTables])

  useEffect(() => {
    const actionsRef = ref(realtimedb, 'actions')
    const unsubscribe = onValue(actionsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data?.request) return
  
      const ids = []
      const num = data.request.numStation || 0
      const id = data.request.id
  
      for (let i = 0; i < num; i++) {
        if (id !== 0 && i === 0) continue
  
        const st = data.request[`station${i}`]
        if (st?.id !== undefined) ids.push(st.id)
      }

      setActiveTables((prev) => {
        const prevSorted = [...prev].sort().join(',')
        const nextSorted = [...ids].sort().join(',')
        if (prevSorted !== nextSorted) {
          console.log('[Firebase Sync] Updating buttons to:', ids)
          return ids
        }
        return prev
      })
    })

    return () => unsubscribe()
  }, [])

  const getButtonStyle = (isActive) => ({
    width: '90px',
    height: '40px',
    padding: '8px 12px',
    borderRadius: '4px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
    backgroundColor: isActive ? '#66B0FF' : '#E6F1FF',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  })

  return (
    <Card style={{ width: '20rem', height: '32rem', marginLeft: '4.016cm' }} className="mb-4">
      <Card.Body>
        <Card.Title style={{ textAlign: 'center' }}>Complete Dishes</Card.Title>
        <Card.Subtitle className="mb-2 text-muted text-center">
          Pub and Sub Selected Tables
        </Card.Subtitle>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto',
            gridGap: '10px',
            marginTop: '16px',
            justifyContent: 'center',
          }}
        >
          <div></div>
          <div>
            <button
              onClick={() => toggleTable(10)}
              style={getButtonStyle(activeTables.includes(10))}
            >
              Kitchen
            </button>
          </div>
          <div></div>

          <div>
            <button onClick={() => toggleTable(1)} style={getButtonStyle(activeTables.includes(1))}>
              Table 1
            </button>
          </div>
          <div></div>
          <div>
            <button onClick={() => toggleTable(2)} style={getButtonStyle(activeTables.includes(2))}>
              Table 2
            </button>
          </div>

          <div>
            <button onClick={() => toggleTable(3)} style={getButtonStyle(activeTables.includes(3))}>
              Table 3
            </button>
          </div>
          <div></div>
          <div>
            <button onClick={() => toggleTable(4)} style={getButtonStyle(activeTables.includes(4))}>
              Table 4
            </button>
          </div>

          <div></div>
          <div>
            <button
              onClick={() => toggleTable(0)}
              style={{
                ...getButtonStyle(activeTables.includes(0)),
                marginTop: '5px',
                justifySelf: 'center',
                width: '69px',
                height: '69px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Center
            </button>
          </div>
          <div></div>

          <div>
            <button onClick={() => toggleTable(5)} style={getButtonStyle(activeTables.includes(5))}>
              Table 5
            </button>
          </div>
          <div></div>
          <div>
            <button onClick={() => toggleTable(6)} style={getButtonStyle(activeTables.includes(6))}>
              Table 6
            </button>
          </div>

          <div>
            <button onClick={() => toggleTable(7)} style={getButtonStyle(activeTables.includes(7))}>
              Table 7
            </button>
          </div>
          <div></div>
          <div>
            <button onClick={() => toggleTable(8)} style={getButtonStyle(activeTables.includes(8))}>
              Table 8
            </button>
          </div>

          <div></div>
          <div>
            <button onClick={() => toggleTable(9)} style={getButtonStyle(activeTables.includes(9))}>
              Table 9
            </button>
          </div>
          <div></div>
        </div>
      </Card.Body>
    </Card>
  )
}  

export default RealTimeDB