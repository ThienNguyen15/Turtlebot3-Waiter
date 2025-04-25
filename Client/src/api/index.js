import axios from 'axios'

export const baseURL = process.env.REACT_APP_BASE_URL

export const validateUserJWTToken = async (token) => {
    try {
        const res = await axios.get(`${baseURL}/api/users/jwtVerfication`, {
          headers: { Authorization: "Bearer " + token },
        })
        return res.data.data
      } catch (err) {
        return null
      }
}

// Voice
export const voiceAudio = async (userId, fileBlob) => {
  try {
    const form = new FormData()
    form.append('file', fileBlob, 'voice.webm')

    const res = await axios.post(
      `${baseURL}/api/voices/${userId}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    return res.data
  } catch (err) {
    console.error('voiceAudio error', err)
    return null
  }
}

export const confirmVoice = async (voiceId) => {
  try {
    const res = await axios.post(
      `${baseURL}/api/voices/confirm/${voiceId}`
    )
    return res.data
  } catch (err) {
    console.error('ConfirmVoice error', err)
    return null
  }
}

// Add new product
export const addNewProduct = async (data) => {
  try {
    const res = await axios.post(`${baseURL}/api/products/create`, { ...data })
    return res.data.data
  } catch (err) {
    return null
  }
}

// Get all products
export const getAllProducts = async () => {
  try {
    const res = await axios.get(`${baseURL}/api/products/all`)
    return res.data.data
  } catch (err) {
    return null
  }
}

// Delete product
export const deleteProduct = async (productId) => {
  try {
    const res = await axios.delete(
      `${baseURL}/api/products/delete/${productId}`
    )
    return res.data.data
  } catch (err) {
    return null
  }
}

// Get all users
export const getAllUsers = async () => {
  try {
    const res = await axios.get(`${baseURL}/api/users/all`)
    return res.data.data
  } catch (err) {
    return null
  }
}

// Add new item to cart
export const addNewCartItem = async (user_id, data) => {
  try {
    const res = await axios.post(
      `${baseURL}/api/products/addCartItem/${user_id}`,
      { ...data }
    )
    return res.data.data
  } catch (error) {
    return null
  }
}

export const getAllCartItems = async (user_id) => {
  try {
    const res = await axios.get(
      `${baseURL}/api/products/getAllCartItems/${user_id}`
    )
    return res.data.data
  } catch (error) {
    return null
  }
}

// Cart increment
export const increaseItemQuantity = async (user_id, productId, type) => {
  console.log(user_id, productId, type)
  try {
    const res = await axios.post(
      `${baseURL}/api/products/updateCart/${user_id}`,
      null,
      { params: { productId: productId, type: type } }
    )
    return res.data.data
  } catch (error) {
    return null
  }
}

export const getAllOrders = async () => {
  try {
    const res = await axios.get(`${baseURL}/api/products/orders`)
    return res.data.data
  } catch (error) {
    return null
  }
}

// Update the Orders status
export const updateOrdersStatus = async (order_id, progress) => {
  try {
    const res = await axios.post(
      `${baseURL}/api/products/updateOrders/${order_id}`,
      null,
      { params: { progress: progress } }
    )
    return res.data.data
  } catch (error) {
    return null
  }
}
