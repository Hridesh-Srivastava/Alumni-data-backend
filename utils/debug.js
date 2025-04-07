/**
 * Debug utility for authentication issues
 */

// Log authentication attempts
export const logAuthAttempt = (type, data) => {
    const timestamp = new Date().toISOString()
  
    console.log(`[${timestamp}] AUTH ${type.toUpperCase()} ATTEMPT:`)
  
    // Remove sensitive data
    const sanitizedData = { ...data }
    if (sanitizedData.password) {
      sanitizedData.password = "[REDACTED]"
    }
  
    console.log(JSON.stringify(sanitizedData, null, 2))
  }
  
  // Log token verification
  export const logTokenVerification = (token, decoded) => {
    const timestamp = new Date().toISOString()
  
    console.log(`[${timestamp}] TOKEN VERIFICATION:`)
    console.log(`Token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`)
    console.log(`Decoded:`, JSON.stringify(decoded, null, 2))
  }
  
  // Log errors
  export const logError = (context, error) => {
    const timestamp = new Date().toISOString()
  
    console.error(`[${timestamp}] ERROR in ${context}:`)
    console.error(error)
  
    if (error.response) {
      console.error("Response data:", error.response.data)
      console.error("Response status:", error.response.status)
    }
  }
  
  