import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'
import readline from 'readline'

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: "https://turtlebot3-waiter-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSEAGING_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.measurementId
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

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

function generateTurtlebotState() {
  return {
    battery: Math.floor(Math.random() * 101),
    isFree: true,
    isReachStation: 0,
    position: {
      x: parseFloat((Math.random() * 10 - 5).toFixed(2)),
      y: parseFloat((Math.random() * 10 - 5).toFixed(2)),
      yaw: parseFloat((Math.random() * 360).toFixed(2))
    }
  }
}

function buildAction(command) {
  const parts = command.split(',').map(s => s.trim())
  const idMatch = parts[0].match(/id\s*=\s*(\d+)/i)
  if (!idMatch)
  {
    console.error("Invalid command: missing or invalid id")
    return null
  }

  const id = parseInt(idMatch[1])
  const stationIds = []

  for (let i = 1; i < parts.length; i++)
  {
    const stationMatch = parts[i].match(/Station\s*(\d+)/i)
    if (stationMatch) {
      const stationIndex = parseInt(stationMatch[1])
      if (stationIndex >= 0 && stationIndex < tables.length)
        stationIds.push(stationIndex)
      else
        console.warn(`Invalid station index: ${stationIndex}`)
    }
  }

  let request = { id }

  if (id === 0)
  {
    request.numStation = 1
    request.station0 = tables[0]
  }
  
  else if (id === 1)
  {
    request.numStation = 2
    request.station0 = tables[0]
    request.station1 = tables.find(t => t.id === 10)
  }
  
  else if (id === 2)
  {
    const stations = [tables.find(t => t.id === 10), ...stationIds.map(id => tables.find(t => t.id === id))]
    request.numStation = stations.length
    stations.forEach((station, idx) => {
      request[`station${idx}`] = station
    })
  }

  else
  {
    console.error("Unsupported id. Only id = 0, 1, 2 are supported.")
    return null
  }
  
  const action =
  {
    request: request,
    turtlebot_state: generateTurtlebotState()
  }

  return action
}

function setActionToDatabase(action) {
  const actionsRef = ref(database, 'actions')
  set(actionsRef, action)
    .then(() => {
      console.log('Action pushed successfully to Realtime Database!')
    })
    .catch((error) => {
      console.error('Error pushing action:', error)
    })
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log("Enter an action command (e.g., 'id = 0' or 'id = 1' or 'id = 2, Station 1, Station 2'):")

rl.on('line', (input) => {
  const action = buildAction(input)
  if (action) {
    console.log("Generated Action JSON:")
    console.log(JSON.stringify(action, null, 2))
    setActionToDatabase(action)
  }
  console.log("\nEnter next command:")
})

// node SetRealTimeDB.mjs