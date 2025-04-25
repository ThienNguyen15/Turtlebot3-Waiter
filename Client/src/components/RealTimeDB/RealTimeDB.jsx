import React, { useState, useEffect, useRef } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { realtimedb, dbFirestore } from '../../config/firebase.config.js'
import { doc, updateDoc } from 'firebase/firestore'
import Card from 'react-bootstrap/Card'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Row, Col } from 'react-bootstrap'
import { Turtlebot } from '../../assets'

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

// const tables = [
//   { description: "Center", id: 0, name: "Center", x: -0.393977, y: -0.754116, yaw: 17.336042 },
//   { description: "Table1", id: 1, name: "Table1", x: -0.291475, y: -1.501925, yaw: -95.423714 },
//   { description: "Table2", id: 2, name: "Table2", x: 0.525429, y: -1.832006, yaw: 82.580696},
//   { description: "Kitchen", id: 10, name: "Kitchen", x: 0.618463, y: -0.695112, yaw: 110.532781 }
// ]

// const generateTurtlebotState = () => {
//   return {
//     battery: 69,
//     isFree: true,
//     isReachStation: 0,
//     position: { x: 0, y: 0, yaw: 0 }
//   }
// }

/*
  - Case 1: All Tables are not pressed -> Press Table0 (Center)
  - Case 2: Table0 (Center) is pressed -> Only Press Table10 (kitchen), Unpress Table0 (Center)
  - Case 3: Table10 (Kitchen) is pressed -> Unpress Table10 (kitchen), station0: Table 10
  - Case 4: Multiple Tables (Except Table0 and Table10) -> Insert Table 10 to the first, station0: Table 10
*/
const buildActionFromTables = (tablesList) => {
  let request = {}
  // Case 1
  if (tablesList.length === 0)
  {
    request = {
      id: 0,
      numStation: 1,
      station0: tables.find(t => t.id === 0)
    }
  }
  // Case 2
  else if (tablesList.length === 1 && tablesList[0] === 10)
  {
    request = {
      id: 1,
      numStation: 2,
      station0: tables.find(t => t.id === 0),
      station1: tables.find(t => t.id === 10)
    }
  }
  // Case 3
  else if (tablesList.includes(10))
  {
    let list = [...tablesList]
    // Ensure Kitchen will be in the first of list
    if (list[0] !== 10)
      list = [10, ...list.filter(id => id !== 10)]

    request = {
      id: 2,
      station0: tables.find(t => t.id === 10)
    }
    const rest = list.filter(id => id !== 10)
    request.numStation = 1 + rest.length
    rest.forEach((id, idx) => {
      request[`station${idx + 1}`] = tables.find(t => t.id === id)
    })
  }
  // Case 4
  else
  {
    let list = [...tablesList]
    // Insert Kitchen to the first of list
    list = [10, ...list]

    request = {
      id: 2,
      station0: tables.find(t => t.id === 10)
    }

    const rest = list.filter(id => id !== 10)
    request.numStation = 1 + rest.length
    rest.forEach((id, idx) => {
      request[`station${idx + 1}`] = tables.find(t => t.id === id)
    })
  }
  
  console.log("buildActionFromTables -> tablesList:", tablesList, "request:", request)
  return {
    request,
    // turtlebot_state: generateTurtlebotState()
  }
}

const RealTimeDB = ({ ros, odom }) => {
  const [activeTables, setActiveTables] = useState([])
  const [isReachStation, setIsReachStation] = useState(0)
  const userActionRef = useRef(false)
  
  const [orderInfoStations, setOrderInfoStations] = useState([])
  const [orderDisplayText, setOrderDisplayText] = useState("")
  
  /*
    - Case 1: Press Table0 (Center) -> Table10 (Kitchen) is pressed, UnPress
    - Case 2: Press Table10 (Kitchen) -> UnPress Table0 (Center)
    - Case 3: Press Another Tables -> Normal, Hold Table10 (Kitchen) to the first
  */
  const toggleTable = (tableId) => {
    userActionRef.current = true
    setActiveTables((prev) => {
      let newList = [...prev]
  
      // Case 1
      if (tableId === 0)
      {
        if (newList.includes(10))
          return newList
        else
        {
          if (newList.includes(0))
            newList = newList.filter(id => id !== 0)
          else
            newList.push(0)

          return newList
        }
      }
  
      // Case 2
      if (tableId === 10)
      {
        if (newList.includes(10))
          newList = newList.filter(id => id !== 10)
        else
        {
          newList.push(10)
          if (newList.includes(0))
            newList = newList.filter(id => id !== 0)
        }
        return newList
      }

      // Case 3
      if (newList.includes(tableId))
        newList = newList.filter(id => id !== tableId)
      else
        newList.push(tableId)

      if (newList.includes(10))
        newList = [10, ...newList.filter(id => id !== 10)]

      return newList
    })
  }
  
  useEffect(() => {
    if (!userActionRef.current) return
    const action = buildActionFromTables(activeTables)
    const actionsRef = ref(realtimedb, 'actions')
    set(actionsRef, action)
      .then(() => console.log('[Firebase Push] Sent:', action))
      .catch(err => console.error('[Firebase Push ERROR]', err))
    userActionRef.current = false
  }, [activeTables])
  
  // Synchronize if having a new update on RealTime DB
  useEffect(() => {
    const actionsRef = ref(realtimedb, 'actions')
    const unsubscribe = onValue(actionsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data?.request) return
      console.log("[Realtime Sync] from server ->", data.request)
      const ids = []
      const num = data.request.numStation || 0
      const reqId = data.request.id
      for (let i = 0; i < num; i++)
      {
        if (reqId !== 0 && i === 0) continue
        const st = data.request[`station${i}`]
        if (st?.id !== undefined) ids.push(st.id)
      }
      const prevSorted = [...activeTables].sort().join(',')
      const nextSorted = [...ids].sort().join(',')
      if (prevSorted !== nextSorted)
      {
        console.log("[Realtime Sync] Updating activeTables to:", ids)
        setActiveTables(ids)
      }
    })
    return () => unsubscribe()
  }, [])
  
  // Read Some Value Data from RealTime DB
  useEffect(() => {
    const actionsRef = ref(realtimedb, 'actions')
    const unsubscribe = onValue(actionsRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.turtlebot_state && data.turtlebot_state.isReachStation !== undefined)
        setIsReachStation(data.turtlebot_state.isReachStation)
    })
    return () => unsubscribe()
  }, [])
  
  // Query Firestore
  useEffect(() => {
    if (activeTables.length === 0)
    {
      setOrderInfoStations([])
      return
    }
    const ordersRef = collection(dbFirestore, 'orders')
    const tablesArray = activeTables.map(t => t.toString())
    const q = query(
      ordersRef,
      where('is_reach', '==', 0),
      where('table', 'in', tablesArray)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersMap = {}
      snapshot.docs.forEach(doc => {
        const order = doc.data()
        ordersMap[order.table] = order
      })
      const ordersArr = activeTables.map(tableId => ordersMap[tableId.toString()] || null)
      setOrderInfoStations(ordersArr)
    })
    return () => unsubscribe()
  }, [activeTables])
  
  // currentOrder from orderInfoStations based on isReachStation value
  const currentOrder = (activeTables.length > 0 && isReachStation < activeTables.length)
    ? orderInfoStations[isReachStation]
    : null
  
  // Update Firestore, UI for each case
  useEffect(() => {
    if (activeTables.length === 0)
    {
      setOrderDisplayText("No table selected")
      return
    }
  
    const currentTable = activeTables[isReachStation]

    if (isReachStation === 0)
    {
      if (currentTable === 0)
        setOrderDisplayText("Relaxing Time")
      else if (currentTable === 10)
        setOrderDisplayText("Taking new dishes")
      else
        setOrderDisplayText("Order Details Station 1")
    }
    else 
    {
      const prevIndex = isReachStation - 1
      if (prevIndex >= 0 && orderInfoStations[prevIndex] && orderInfoStations[prevIndex].orderId)
      {
        const prevOrder = orderInfoStations[prevIndex]
        const orderDocRef = doc(dbFirestore, 'orders', prevOrder.orderId.toString())
        updateDoc(orderDocRef, { is_reach: 1 })
          .then(() => console.log(`Firestore updated: is_reach set to 1 for table ${activeTables[prevIndex]}`))
          .catch((err) => console.error('Error updating Firestore:', err))
      }
      else
        console.warn("No order found to update for prevIndex:", prevIndex)
  
      if (isReachStation < activeTables.length)
        setOrderDisplayText(`Order Details Station ${isReachStation + 1}`)
      else
        setOrderDisplayText("Food Delivered")
    }
  }, [activeTables, orderInfoStations, isReachStation])
  
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
            gridGap: '5px',
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
                marginTop: '-33px',
                marginBottom: '-44px',
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
  
        <Row style={{ marginTop: '15px' }}>
          <Col xs={4} className="d-flex align-items-center justify-content-center">
            <img
              src={Turtlebot}
              alt="Turtlebot Image"
              style={{
                height: '100px',
                objectFit: 'contain',
                marginTop: '20px',
              }}
            />
          </Col>
          <Col xs={8} className="d-flex flex-column align-items-start justify-content-start" style={{ marginLeft: '-5px' }}>
            <p style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '1rem', margin: '0' }}>
              {orderDisplayText}
            </p>
            {(orderDisplayText.startsWith("Order Details") || orderDisplayText === "Food Delivered") &&
              currentOrder && currentOrder.items && currentOrder.items.length > 0 ? (
              <div
                style={{
                  minHeight: '100px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                }}
              >
                {currentOrder.items.map((item, idx) => (
                  <p key={idx} style={{ fontSize: '0.85rem', margin: '2px 0' }}>
                    {item.product_name} x {item.quantity}
                  </p>
                ))}
              </div>
            ) : (
              <div
                style={{
                  minHeight: '100px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <p style={{ fontSize: '0.85rem', margin: '2px 0' }}>
                  No details available!
                </p>
              </div>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default RealTimeDB
