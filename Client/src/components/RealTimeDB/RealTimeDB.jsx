import React, { useState, useEffect, useRef } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { realtimedb, dbFirestore } from '../../config/firebase.config.js'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import Card from 'react-bootstrap/Card'
import { Modal, Button, Row, Col } from 'react-bootstrap'
import { Turtlebot } from '../../assets'
import { GiConfirmed } from '../../assets/icons'

const tables = [
  { description: "Table1", id: 1, name: "Table1", x: -0.431466, y: -0.927929, yaw: -64.7273 },
  { description: "Table2", id: 2, name: "Table2", x: -0.3588424623012543, y: -1.6562724113464355, yaw: -82.872 },
  { description: "Table3", id: 3, name: "Table3", x: -0.2888265550136566, y: -2.382502794265747, yaw: -58.5126 },
  { description: "Table4", id: 4, name: "Table4", x: 0.551529, y: -1.89651, yaw: 90.9495 },
  { description: "Table5", id: 5, name: "Table5", x: 0.450258, y: -0.924623, yaw: 101.275 },
  { description: "Kitchen", id: 10, name: "Table10", x: -0.743725, y: -0.2899, yaw: -78.5854 }
]

const RealTimeDB = ({ ros, odom }) => {
  const [activeTables, setActiveTables] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const userActionRef = useRef(false)

  const [isReachStation, setIsReachStation] = useState(0)
  const [orderInfoStations, setOrderInfoStations] = useState([])
  const [orderDisplayText, setOrderDisplayText] = useState("")

  const generateTurtlebotState = () => ({
    battery: odom ? 80 : 100,
    isFree: true,
    isReachStation: 0,
    position: odom ? { x: odom.position.x, y: odom.position.y, yaw: odom.yaw } : { x: 0, y: 0, yaw: 0 }
  })

  const buildActionFromTables = (tablesList) => {
    let request
    if (tablesList.length === 0) {
      request = { id: 0 }
    } else if (tablesList.length === 1 && tablesList[0] === 10) {
      request = { id: 1, numStation: 1, station0: tables.find(t => t.id === 10) }
    } else {
      const rest = tablesList.filter(id => id !== 10)
      request = { id: 2, numStation: rest.length }
      rest.forEach((id, idx) => {
        request[`station${idx}`] = tables.find(t => t.id === id)
      })
    }
    return { request, turtlebot_state: generateTurtlebotState() }
  }

  const handleSendClick = () => { setConfirmAction('send'); setShowConfirm(true) }
  const handleCancelClick = () => { setConfirmAction('cancel'); setShowConfirm(true) }
  const handleConfirm = () => {
    setShowConfirm(false)
    const action = buildActionFromTables(activeTables)
    const dbRef = ref(realtimedb, 'request')
    if (confirmAction === 'send') {
      set(dbRef, action)
        .then(() => setActiveTables([]))
        .catch(err => console.error(err))
    } else {
      set(dbRef, { id: 0 })
        .then(() => setActiveTables([]))
        .catch(err => console.error(err))
    }
  }

  useEffect(() => {
    const reqRef = ref(realtimedb, 'request')
    const off = onValue(reqRef, snap => {
      const data = snap.val() || {}
      if (!data.request) return
      const ids = []
      const num = data.request.numStation || 0
      for (let i = 0; i < num; i++) {
        const st = data.request[`station${i}`]
        if (st?.id !== undefined) ids.push(st.id)
      }
      setActiveTables(ids)
      if (data.turtlebot_state?.isReachStation !== undefined)
        setIsReachStation(data.turtlebot_state.isReachStation)
    })
    return () => off()
  }, [])

  useEffect(() => {
    if (!activeTables.length) return setOrderInfoStations([])
    const ordersRef = collection(dbFirestore, 'orders')
    const q = query(
      ordersRef,
      where('is_reach', '==', 0),
      where('table', 'in', activeTables.map(id => id.toString()))
    )
    const unsub = onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => map[d.data().table] = { ...d.data(), orderId: d.id })
      setOrderInfoStations(activeTables.map(id => map[id.toString()] || null))
    })
    return () => unsub()
  }, [activeTables])

  useEffect(() => {
    if (!activeTables.length) return setOrderDisplayText("No table selected")
    const idx = isReachStation
    const tableId = activeTables[idx]
    if (tableId === 10) {
      setOrderDisplayText("Taking new dishes")
    } else {
      if (idx > 0) {
        const prevOrder = orderInfoStations[idx - 1]
        if (prevOrder?.orderId) {
          updateDoc(doc(dbFirestore, 'orders', prevOrder.orderId.toString()), { is_reach: 1 })
            .catch(console.error)
        }
      }
      setOrderDisplayText(`Order Details Station ${idx + 1}`)
    }
  }, [activeTables, orderInfoStations, isReachStation])

  const currentDesc = tables.find(t => t.id === activeTables[isReachStation])?.description || ''

  const toggleTable = (tableId) => {
    userActionRef.current = true
    setActiveTables(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    )
  }

  const getButtonStyle = () => ({
    width: '90px', height: '40px', padding: '8px 12px', borderRadius: '4px', border: 'none',
    fontWeight: 'bold', fontSize: '16px', backgroundColor: '#E6F1FF',
    cursor: 'pointer', transition: 'background-color 0.3s'
  })

  const getSendStyle = () => ({
    width: '90px', height: '40px', padding: '8px 12px', borderRadius: '4px', border: 'none',
    fontWeight: 'bold', fontSize: '16px', backgroundColor: '#00cc44',
    cursor: 'pointer', transition: 'background-color 0.3s',
    color: '#ffffff',
  })

  const getCancelStyle = () => ({
    width: '90px', height: '40px', padding: '8px 12px', borderRadius: '4px', border: 'none',
    fontWeight: 'bold', fontSize: '16px', backgroundColor: '#ff3333',
    cursor: 'pointer', transition: 'background-color 0.3s',
    color: '#ffffff',
  })

  return (
    <>
      <Card style={{ width: '20rem', height: '32rem', marginLeft: '4.016cm' }} className="mb-4">
        <Card.Body>
          <Card.Title className="text-center">Complete Dishes</Card.Title>
          <Card.Subtitle className="mb-2 text-muted text-center">Pub and Sub Selected Tables</Card.Subtitle>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            <div>
              <button onClick={() => toggleTable(10)} style={getButtonStyle(activeTables.includes(10))}>
                Kitchen
              </button>
            </div>
            <div style={{ display: 'flex', gap: '30px' }}>
              <button onClick={() => toggleTable(1)} style={getButtonStyle(activeTables.includes(1))}>Table1</button>
              <button onClick={() => toggleTable(2)} style={getButtonStyle(activeTables.includes(2))}>Table2</button>
            </div>
            <div style={{ display: 'flex', gap: '30px' }}>
              <button onClick={() => toggleTable(3)} style={getButtonStyle(activeTables.includes(3))}>Table3</button>
              <button onClick={() => toggleTable(4)} style={getButtonStyle(activeTables.includes(4))}>Table4</button>
            </div>
            <div>
              <button onClick={() => toggleTable(5)} style={getButtonStyle(activeTables.includes(5))}>
                Table5
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSendClick} style={getSendStyle(false)}>Send</button>
              <button onClick={handleCancelClick} style={getCancelStyle(false)}>Cancel</button>
            </div>
          </div>

          <Row style={{ marginTop: '40px' }} className="align-items-start">
            <Col xs={4} className="d-flex flex-column justify-content-center align-items-center">
              <img src={Turtlebot} alt="Turtlebot" style={{ height: '100px', objectFit: 'contain' }} />
              {currentDesc && <p style={{ fontStyle: 'italic', marginTop: '1px', textAlign: 'center', width: '100%' }}>{currentDesc}</p>}
            </Col>
            <Col xs={8}>
              <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>{orderDisplayText}</p>
              <div style={{ marginTop: '5px', maxHeight: '100px', overflowY: 'auto' }}>
                {(orderDisplayText.startsWith('Order Details') || orderDisplayText === 'Food Delivered') && orderInfoStations[isReachStation]?.items?.length
                  ? orderInfoStations[isReachStation].items.map((item, i) => <p key={i}>{item.product_name} x {item.quantity}</p>)
                  : <p>No details available!</p>
                }
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-md p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <GiConfirmed color="#ffd633"/>
                User Confirmation</h2>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >&times;</button>
            </div>
            {/* Body */}
            <p className="mb-6 text-xl">
              {confirmAction === 'send'
                ? 'Do you want to send the selected requests?'
                : 'Do you want to cancel the selected requests?'}
            </p>
            {/* Footer */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleConfirm}
                className={
                  `px-3 py-2 rounded-lg transition text-base ` +
                  (confirmAction === 'send'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white')
                }
              >
                {confirmAction === 'send' ? 'Send' : 'Cancel'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition text-base"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RealTimeDB
