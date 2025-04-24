import React, { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Avatar, Logo } from '../assets'
import { motion } from 'framer-motion'
import { buttonClick, slideTop } from '../animations'
import { MdLogout, MdFoodBank, MdKeyboardVoice } from '../assets/icons'
import { useDispatch, useSelector } from 'react-redux'
import { getAuth } from 'firebase/auth'
import { app, dbFirestore } from '../config/firebase.config'
import { setUserNull } from '../context/actions/userActions'
import { setCartOn } from '../context/actions/displayCartActions'
import { voiceAudio, confirmVoice } from '../api'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
// import { isActiveStyles, isNotActiveStyles } from '../utils/style'

const Header = ({ isJoystickActive }) => {  
  const user = useSelector(state => state.user)
  const cart = useSelector(state => state.cart)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const firebaseAuth = getAuth(app)

  const [isMenu, setIsMenu] = useState(false)


  const mediaRecorderRef   = useRef(null)
  const audioChunksRef     = useRef([])
  const shouldUploadRef    = useRef(false)
  const timeoutRef         = useRef(null)

  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL]       = useState(null)
  const [voiceId, setVoiceId]         = useState(null)
  const [recordedData, setRecordedData] = useState({
    isOpen: false,
    status: '',
    duration: null,
    original: '',
    processed: ''
  })

  // Out Tab or Blur Window -> Abort
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && isRecording) abortRecording()
    }
    const onWindowBlur = () => {
      if (isRecording) abortRecording()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [isRecording])

  const signOut = () => {
    firebaseAuth.signOut()
      .then(() => { dispatch(setUserNull()); navigate('/login', { replace: true }) })
      .catch(console.error)
  }

  // Abort: Stop and Not Upload
  const abortRecording = () => {
    clearTimeout(timeoutRef.current)
    shouldUploadRef.current = false
    const rec = mediaRecorderRef.current
    if (rec && isRecording) rec.stop()
    setIsRecording(false)
    setRecordedData(prev => ({ ...prev, isOpen: false }))
  }

  // 1️⃣ Start Record
  const handleVoiceRecorded = async () => {
    if (isRecording) return
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    })
    const recorder = new MediaRecorder(stream)
    audioChunksRef.current = []
    shouldUploadRef.current = false

    recorder.ondataavailable = e => audioChunksRef.current.push(e.data)
    recorder.onstop = async () => {
      clearTimeout(timeoutRef.current)
      stream.getTracks().forEach(t => t.stop())
      if (!shouldUploadRef.current) return

      // Preview
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      setAudioURL(URL.createObjectURL(blob))
      setRecordedData(prev => ({ ...prev, status: 'Uploading...' }))

      // Upload
      const result = await voiceAudio(user.user_id, blob)
      if (!result) {
        setRecordedData(prev => ({ ...prev, status: 'Upload failed' }))
        return
      }
      setVoiceId(result.voiceId)
      setRecordedData(prev => ({ ...prev, status: 'Uploaded, processing...' }))

      // Update UI
      const unsub = onSnapshot(
        doc(dbFirestore, 'voice', result.voiceId),
        snap => {
          const d = snap.data()
          if (!d) return
          setRecordedData({
            isOpen:     true,
            status:     d.processed === 'None' ? 'Processing...' : 'Processed',
            duration:   d.duration,
            original:   d.original,
            processed:  d.processed
          })
          if (d.processed !== 'None') unsub()
        }
      )
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
    setRecordedData({
      isOpen:     true,
      status:     'Listening…',
      duration:   null,
      original:   '',
      processed:  ''
    })

    // 3s if "Send" is not Pressed -> Abort
    timeoutRef.current = setTimeout(() => {
      if (isRecording) abortRecording()
    }, 3000)
  }

  // 2️⃣ "Send" is Pressed: Flag ON and Stop Record to Upload
  const handleSend = () => {
    if (!isRecording) return
    clearTimeout(timeoutRef.current)
    shouldUploadRef.current = true
    setIsRecording(false)
    mediaRecorderRef.current.stop()
  }

  // Processed Cases
  const handleConfirm = async yes => {
    if (!voiceId) return
    if (yes)   await confirmVoice(voiceId)
    else       await updateDoc(doc(dbFirestore, 'voice', voiceId), { processed: 'No' })
    setRecordedData(prev => ({ ...prev, isOpen: false }))
  }

  const RecordUI = ({ isOpen, status, duration, original, processed }) => {
    if (!isOpen) return null
    return (
      <div
        className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={abortRecording}
      >
        <div
          className="bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MdKeyboardVoice className="text-red-500"/>
            Voice Recognition
            <button
              onClick={handleSend}
              disabled={!isRecording}
              className="ml-auto px-2 py-1 bg-blue-500 text-white rounded disabled:opacity-50 text-sm"
            >Send</button>
          </h2>
          <div className="space-y-2 text-lg">
            <p><strong>Status:</strong> {status}</p>
            {duration && <p><strong>Duration:</strong> {duration}</p>}
            {original && <p><strong>Original:</strong> {original}</p>}
            {processed && (
              <>
                <p><strong>Processed:</strong> {processed}</p>
                <div className="mt-2 flex items-center space-x-[0.95rem]">
                  <span className="text-base font-medium">Is this right?</span>
                  <button
                    onClick={() => handleConfirm(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleConfirm(false)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                  >
                    No
                  </button>
                </div>
              </>
            )}
            {audioURL && (
              <div className="mt-4">
                <audio src={audioURL} controls className="w-full mt-2"/>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <RecordUI {...recordedData}/>
      <header className='fixed backdrop-blur-md z-50 inset-x-0 top-0 flex items-center justify-between px-12 md:px-20 py-6'>
        <NavLink to={'/'} className='flex items-center justify-center gap-3'>
          <img src={Logo} className='w-12' alt='' />
          <p className='font-semibold text-2xl'>Restaurant</p>
        </NavLink>

        <nav className='flex items-center justify-center gap-8'>
        <motion.div
          {...buttonClick}
          onClick={handleVoiceRecorded}
          className="relative cursor-pointer"
        >
          <MdKeyboardVoice
            className={`text-3xl ${isRecording ? 'text-red-500 animate-pulse' : 'text-textColor'}`}
          />
        </motion.div>

          <ul className='hidden md:flex items-center justify-center gap-8'>
            <NavLink
              to='/'
              onClick={(e) => {
                if (isJoystickActive) {
                  e.preventDefault()
                  return
                }
              }}
              className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link-inactive')}
            >
              Home
            </NavLink>
            <NavLink
              to='/menu'
              onClick={(e) => {
                if (isJoystickActive) {
                  e.preventDefault()
                  return
                }
              }}
              className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link-inactive')}
            >
              Menu
            </NavLink>
            <NavLink
              to='/services'
              onClick={(e) => {
                if (isJoystickActive) {
                  e.preventDefault()
                  return
                }
              }}
              className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link-inactive')}
            >
              Services
            </NavLink>
            {/* <NavLink
              className={({ isActive }) =>
                isActive ? 'nav-link-active' : 'nav-link-inactive'
              }
              to={'/aboutus'}
            >
              About Us
            </NavLink> */}
          </ul>

            <motion.div {...buttonClick}
              onClick={() => dispatch(setCartOn())}
              className='relative cursor-pointer'
            >
              <MdFoodBank className='text-3xl text-textColor' />
              {cart?.length > 0 && (
                <div className='w-6 h-6 rounded-full bg-red-500 flex items-center justify-center absolute -top-3 -right-1'>
                  <p className='text-white text-base font-semibold'>
                    {cart?.length}
                  </p>
                </div>
              )}
            </motion.div>
            
            <div className='nav-avatar'>
              {user ? (
                  <>
                    <div
                    className='relative cursor-pointer'
                    onMouseEnter={() => setIsMenu(true)}
                    >
                    <div className='w-12 h-12 rounded-full shadow-md cursor-pointer overflow-hidden flex items-center justify-center'>
                        <motion.img
                        className='w-full h-full object-cover'
                        src={user?.picture ? user?.picture : Avatar}
                        whileHover={{ scale: 1.15 }}
                        referrerPolicy='no-referrer'
                        />
                    </div>

                    {isMenu && (
                      <motion.div
                      {...slideTop}
                      onMouseLeave={() => setIsMenu(false)}
                      className='px-6 py-4 w-48 bg-lightOverlay backdrop-blur-md rounded-md shadow-md absolute top-12 right-0 flex flex-col gap-4'
                      >
                      {/* Config Access Permission  */}
                      {user?.user_id === process.env.REACT_APP_ADMIN_ID && (
                        <Link
                          className=' hover:text-red-500 text-xl text-textColor'
                          to={'/dashboard/home'}
                        >
                          Dashboard
                        </Link>
                      )}

                      {/* <Link
                        className=' hover:text-red-500 text-xl text-textColor'
                        to={'/profile'}
                      >
                        My Profile
                      </Link> */}
                      <Link
                        className=' hover:text-red-500 text-xl text-textColor'
                        to={'/user-orders'}
                      >
                        Orders
                      </Link>
                      <hr />

                      <motion.div
                          {...buttonClick}
                          onClick={signOut}
                          className='group flex items-center justify-center px-2 py-2 rounded-md shadow-md bg-gray-100 hover:bg-gray-200 gap-3'
                      >
                          <MdLogout className='text-2xl text-textColor group-hover::text-headingColor' />
                          <p className='text-textColor text-xl group-hover:text-headingColor'>
                          Sign Out
                          </p>
                      </motion.div>
                      </motion.div>
                    )}
                    </div>
                  </>
                ) : (
                  <>
                      <NavLink to={'/login'}>
                          <motion.button
                              {...buttonClick}
                              className='px-4 py-2 rounded-md shadow-md bg-lightOverlay border border-danger cursor-pointer'
                          >
                              Login
                          </motion.button>
                      </NavLink>
                  </>
                )}
            </div>
        </nav>
      </header>
    </>
  )
}

export default Header


// const [isRecording, setIsRecording] = useState(false)
// const [recordedData, setProgress] = useState({ isOpen: false, status: '', original: '', cleaned: '', normalized: '', processed: '' })

// const [audioURL, setAudioURL] = useState(null)

// const firebaseAuth = getAuth(app)
// const navigate = useNavigate()
// const dispatch = useDispatch()
// const onConfirm = processedText => console.log('Confirmed:', processedText)

// const signOut = () => {
//   firebaseAuth
//     .signOut()
//     .then(() => {
//       dispatch(setUserNull())
//       navigate('/login', { replace: true })
//     })
//     .catch((err) => console.log(err))
// }

// const handleVoiceRecorded = async () => {
//   const stream = await navigator.mediaDevices.getUserMedia({
//     audio: {
//       echoCancellation: true,
//       noiseSuppression: true,
//       autoGainControl: true
//     }
//   })
//   const voiceRecord = new MediaRecorder(stream)
//   const audioChunks = []

//   voiceRecord.ondataavailable = (e) => audioChunks.push(e.data)

//   let audioRecorded = new AudioContext()
//   let source = audioRecorded.createMediaStreamSource(stream)
//   let analyser = audioRecorded.createAnalyser()
//   source.connect(analyser)

//   let dataArray = new Uint8Array(analyser.fftSize)
//   let silenceStart = null
//   let silenceThreshold = 0.01
//   let maxSilence = 5000

//   const checkSilence = () => {
//     analyser.getByteTimeDomainData(dataArray)
//     let rms = Math.sqrt(dataArray.reduce((sum, val) => sum + Math.pow(val - 128, 2), 0) / dataArray.length) / 128

//     if (rms < silenceThreshold) {
//       if (!silenceStart) silenceStart = Date.now()
//       else if (Date.now() - silenceStart > maxSilence) {
//         voiceRecord.stop()
//         setIsRecording(false)
//         stream.getTracks().forEach(track => track.stop())
//       }
//     } else {
//       silenceStart = null
//     }

//     if (voiceRecord.state === "recording") {
//       requestAnimationFrame(checkSilence)
//     }
//   }

//   voiceRecord.onstop = async () => {
//     const blob = new Blob(audioChunks, { type: 'audio/webm' })
//     const url = URL.createObjectURL(blob)
//     setAudioURL(url)
//     console.log("📦 Blob size:", blob.size, "bytes")

//     const formData = new FormData()
//     formData.append('file', blob, 'audio.webm')

//     setProgress({ isOpen: true, status: 'Processing...', original: '', cleaned: '', normalized: '', processed: '' })

//     try {
//       const res = await axios.post('http://localhost:8080/upload', formData)

//       const processed = res.data.type === 'Order Dishes'
//         ? `Order ${res.data.items
//             .map(([prod, qty]) => `${qty} ${prod}`)
//             .join(' and ')} in table ${res.data.table}`
//         : res.data.type === 'Take Dishes'
//           ? `Go to table ${res.data.table}`
//           : `⚠️ Doesn't match any commands.`      

//       setProgress({
//         isOpen: true,
//         status: 'Success',
//         original: res.data.text,
//         cleaned: res.data.cleaned_text,
//         normalized: res.data.normalized_text,
//         processed
//       })
//     } catch (err) {
//       setProgress({ isOpen: true, status: 'Error', original: '', cleaned: '', normalized: '', processed: '' })
//     }
//   }

//   voiceRecord.start()
//   setIsRecording(true)
//   setProgress({ isOpen: true, status: 'Listening...', original: '', cleaned: '', normalized: '', processed: '' })
//   checkSilence()
// }